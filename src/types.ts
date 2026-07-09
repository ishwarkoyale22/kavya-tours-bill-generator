/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vehicle {
  vehicle_no: string; // e.g., "MH01-7703"
  type: string;       // Sumo / Eeco / TT / Indica
  vendor_name: string;
  phone: string;
}

export interface Rate {
  vehicle_no: string;
  location: string;
  rate: number;
}

export interface Trip {
  id: string;
  date: string;       // YYYY-MM-DD
  time: string | null; // HH:MM (optional)
  vehicle_no: string;
  location: string;
  emp_count: number;
}

export interface Adjustment {
  id: string;
  month: string;      // YYYY-MM (e.g. "2026-04")
  vehicle_no: string;
  location: string | null;
  fine: number;
  toll: number;
  advance: number;
}

// Billing engine output structures
export interface LocationBilling {
  location: string;
  trip_count: number;
  rate: number;
  bill_amt: number;
}

export interface VehicleBillingSummary {
  vehicle_no: string;
  vehicle_type: string;
  vendor_name: string;
  phone: string;
  locations: LocationBilling[];
  subtotal_bill: number;
  fine: number;
  toll: number;
  advance: number;
  payable: number;
}

export interface GrandBillingSummary {
  month: string;
  vehicles: VehicleBillingSummary[];
  total_trips: number;
  total_bill: number;
  total_advance: number;
  total_toll: number;
  total_fine: number;
  total_payable: number;
}
