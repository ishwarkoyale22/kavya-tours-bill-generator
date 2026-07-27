/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vehicle {
  vehicle_no: string;
  type: string;
  vendor_name: string;
  phone: string;
  rc_number?: string;
  insurance_expiry?: string;
  permit_expiry?: string;
  puc_expiry?: string;
}

export interface MaintenanceLog {
  id: string;
  vehicle_no: string;
  service_date: string;
  odometer: number;
  description: string;
  next_service_due: string;
  cost: number;
}

export type DriverAvailability = 'Available' | 'On Trip' | 'Off Duty' | 'On Leave';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license_no: string;
  license_expiry: string;
  assigned_vehicle?: string;
  availability?: DriverAvailability;
}

export interface DriverPayout {
  id: string;
  driver_id: string;
  month: string;
  bata: number;
  advance: number;
  note?: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  credit_limit?: number;
}

export type TripStatus = 'Requested' | 'Confirmed' | 'Ongoing' | 'Completed' | 'Billed' | 'Paid';
export type TripType = 'Local' | 'Outstation' | 'Airport' | 'Rental';

export interface Trip {
  id: string;
  date: string;
  time: string | null;
  vehicle_no: string;
  location: string;
  drop_location?: string;
  client_name?: string;
  client_id?: string;
  trip_type?: TripType;
  km?: number;
  driver_id?: string;
  status: TripStatus;
  emp_count: number;
}

export interface Rate {
  vehicle_no: string;
  location: string;
  trip_type?: string;
  rate: number;
  night_charge_pct?: number;
  toll_flat?: number;
  festival_surge_pct?: number;
  waiting_charge_per_hr?: number;
  client_id?: string;
  valid_from?: string;
  valid_to?: string;
}

export interface Adjustment {
  id: string;
  month: string;
  vehicle_no: string;
  location: string | null;
  fine: number;
  toll: number;
  advance: number;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string;
  invoice_no: string;
  trip_ids: string[];
  month?: string;
  client_id?: string;
  client_name: string;
  vehicle_no: string;
  amount: number;
  cgst_pct: number;
  sgst_pct: number;
  igst_pct: number;
  is_interstate: boolean;
  status: InvoiceStatus;
  date: string;
  due_date?: string;
  note?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  mode: 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque';
  date: string;
  reference?: string;
}

// Notification system
export type NotificationType = 'doc_expiry' | 'license_expiry' | 'invoice_overdue' | 'trip_complete';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  target_tab: string;
  read: boolean;
  created_at: string;
  days_left?: number;
}

// Billing engine output
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
