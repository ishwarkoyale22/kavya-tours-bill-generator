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
 * Pure function to calculate billing summary for a specific month (YYYY-MM).
 */
export function calculateBill(
  targetMonth: string, // "YYYY-MM"
  vehicles: Vehicle[],
  rates: Rate[],
  trips: Trip[],
  adjustments: Adjustment[]
): GrandBillingSummary {
  // Filter trips for the target month (trip.date starts with targetMonth, e.g. "2026-04-12" starts with "2026-04")
  const monthTrips = trips.filter((trip) => trip.date.startsWith(targetMonth));

  // Filter adjustments for the target month
  const monthAdjustments = adjustments.filter((adj) => adj.month === targetMonth);

  const vehicleSummaries: VehicleBillingSummary[] = [];

  // Initialize grand totals
  let totalTrips = 0;
  let totalBill = 0;
  let totalAdvance = 0;
  let totalToll = 0;
  let totalFine = 0;
  let totalPayable = 0;

  // Process each vehicle
  for (const vehicle of vehicles) {
    const vehicleNo = vehicle.vehicle_no;

    // Filter trips for this vehicle
    const vehicleTrips = monthTrips.filter((t) => t.vehicle_no === vehicleNo);

    // Group vehicle trips by location
    const locationGroups: { [location: string]: number } = {};
    for (const trip of vehicleTrips) {
      locationGroups[trip.location] = (locationGroups[trip.location] || 0) + 1;
    }

    // Build location billing list
    const locationsBilling: LocationBilling[] = [];
    let subtotalBill = 0;

    for (const [location, count] of Object.entries(locationGroups)) {
      // Find rate for this vehicle and location
      const rateObj = rates.find(
        (r) => r.vehicle_no === vehicleNo && r.location.toLowerCase() === location.toLowerCase()
      );
      const rate = rateObj ? rateObj.rate : 0;
      const billAmt = count * rate;

      locationsBilling.push({
        location,
        trip_count: count,
        rate,
        bill_amt: billAmt,
      });

      subtotalBill += billAmt;
      totalTrips += count;
    }

    // Calculate vehicle adjustments
    const vehicleAdjs = monthAdjustments.filter((a) => a.vehicle_no === vehicleNo);
    const advance = vehicleAdjs.reduce((sum, a) => sum + (Number(a.advance) || 0), 0);
    const fine = vehicleAdjs.reduce((sum, a) => sum + (Number(a.fine) || 0), 0);
    const toll = vehicleAdjs.reduce((sum, a) => sum + (Number(a.toll) || 0), 0);

    // Calculate vehicle payable
    const payable = subtotalBill - advance + toll - fine;

    vehicleSummaries.push({
      vehicle_no: vehicleNo,
      vehicle_type: vehicle.type,
      vendor_name: vehicle.vendor_name,
      phone: vehicle.phone,
      locations: locationsBilling,
      subtotal_bill: subtotalBill,
      fine,
      toll,
      advance,
      payable,
    });

    // Add to grand totals
    totalBill += subtotalBill;
    totalAdvance += advance;
    totalToll += toll;
    totalFine += fine;
    totalPayable += payable;
  }

  return {
    month: targetMonth,
    vehicles: vehicleSummaries,
    total_trips: totalTrips,
    total_bill: totalBill,
    total_advance: totalAdvance,
    total_toll: totalToll,
    total_fine: totalFine,
    total_payable: totalPayable,
  };
}
