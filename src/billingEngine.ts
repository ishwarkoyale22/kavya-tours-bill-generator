/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Vehicle,
  Rate,
  Trip,
  Adjustment,
  GrandBillingSummary,
  VehicleBillingSummary,
  LocationBilling,
} from './types';

/**
 * Find the best applicable rate for a vehicle+location on a specific trip date.
 * Priority: date-valid seasonal rate → permanent rate (no validity dates) → 0
 */
function findBestRate(rates: Rate[], vehicleNo: string, location: string, tripDate: string): number {
  const matches = rates.filter(
    r => r.vehicle_no === vehicleNo && r.location.toLowerCase() === location.toLowerCase()
  );
  if (matches.length === 0) return 0;

  // Prefer a rate whose validity window covers the trip date
  const seasonal = matches.find(r => {
    if (!r.valid_from && !r.valid_to) return false;
    const fromOk = !r.valid_from || tripDate >= r.valid_from;
    const toOk   = !r.valid_to   || tripDate <= r.valid_to;
    return fromOk && toOk;
  });
  if (seasonal) return seasonal.rate;

  // Fall back to permanent rate (no validity dates)
  const permanent = matches.find(r => !r.valid_from && !r.valid_to);
  return permanent ? permanent.rate : 0;
}

/**
 * Pure function to calculate billing summary for a specific month (YYYY-MM).
 */
export function calculateBill(
  targetMonth: string,
  vehicles: Vehicle[],
  rates: Rate[],
  trips: Trip[],
  adjustments: Adjustment[]
): GrandBillingSummary {
  const monthTrips = trips.filter(trip => trip.date.startsWith(targetMonth));
  const monthAdjustments = adjustments.filter(adj => adj.month === targetMonth);

  const vehicleSummaries: VehicleBillingSummary[] = [];

  let totalTrips   = 0;
  let totalBill    = 0;
  let totalAdvance = 0;
  let totalToll    = 0;
  let totalFine    = 0;
  let totalPayable = 0;

  for (const vehicle of vehicles) {
    const vehicleNo    = vehicle.vehicle_no;
    const vehicleTrips = monthTrips.filter(t => t.vehicle_no === vehicleNo);

    // Group trips by location (store the actual trip objects for per-trip rate lookup)
    const locationGroups: { [location: string]: Trip[] } = {};
    for (const trip of vehicleTrips) {
      if (!locationGroups[trip.location]) locationGroups[trip.location] = [];
      locationGroups[trip.location].push(trip);
    }

    const locationsBilling: LocationBilling[] = [];
    let subtotalBill = 0;

    for (const [location, locTrips] of Object.entries(locationGroups)) {
      // Compute per-trip bill amounts (supports seasonal/validity-date rates)
      let locationBillAmt = 0;
      for (const trip of locTrips) {
        locationBillAmt += findBestRate(rates, vehicleNo, location, trip.date);
      }

      // Effective display rate = total / count (avg; equals single rate when no seasonal pricing)
      const effectiveRate = locTrips.length > 0 ? Math.round(locationBillAmt / locTrips.length) : 0;

      locationsBilling.push({
        location,
        trip_count: locTrips.length,
        rate: effectiveRate,
        bill_amt: locationBillAmt,
      });

      subtotalBill += locationBillAmt;
      totalTrips   += locTrips.length;
    }

    const vehicleAdjs = monthAdjustments.filter(a => a.vehicle_no === vehicleNo);
    const advance = vehicleAdjs.reduce((sum, a) => sum + (Number(a.advance) || 0), 0);
    const fine    = vehicleAdjs.reduce((sum, a) => sum + (Number(a.fine)    || 0), 0);
    const toll    = vehicleAdjs.reduce((sum, a) => sum + (Number(a.toll)    || 0), 0);
    const payable = subtotalBill - advance + toll - fine;

    vehicleSummaries.push({
      vehicle_no:   vehicleNo,
      vehicle_type: vehicle.type,
      vendor_name:  vehicle.vendor_name,
      phone:        vehicle.phone,
      locations:    locationsBilling,
      subtotal_bill: subtotalBill,
      fine, toll, advance, payable,
    });

    totalBill    += subtotalBill;
    totalAdvance += advance;
    totalToll    += toll;
    totalFine    += fine;
    totalPayable += payable;
  }

  return {
    month: targetMonth,
    vehicles: vehicleSummaries,
    total_trips:   totalTrips,
    total_bill:    totalBill,
    total_advance: totalAdvance,
    total_toll:    totalToll,
    total_fine:    totalFine,
    total_payable: totalPayable,
  };
}
