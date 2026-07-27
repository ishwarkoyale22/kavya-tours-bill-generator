/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, Rate, Trip, Adjustment, Driver, Client } from './types';
import { calculateBill } from './billingEngine';

export function getSeedData() {
  const vehicles: Vehicle[] = [
    { vehicle_no: "MH01-7703", type: "Sumo", vendor_name: "Ramesh Patel Logistics & Transport Services", phone: "+91 98765 43210", rc_number: "MH01CQ7703", insurance_expiry: "2027-03-15", permit_expiry: "2026-10-20", puc_expiry: "2026-09-12" },
    { vehicle_no: "MH02-1234", type: "Eeco", vendor_name: "Suresh Kumar Fleet Logistics Group", phone: "+91 98123 45678", rc_number: "MH02AK1234", insurance_expiry: "2026-08-10", permit_expiry: "2026-12-01", puc_expiry: "2026-07-30" },
    { vehicle_no: "MH03-5678", type: "TT", vendor_name: "Dilip Singh Corporate Travel Agency", phone: "+91 97654 32109", rc_number: "MH03BZ5678", insurance_expiry: "2026-11-25", permit_expiry: "2027-02-14", puc_expiry: "2026-08-05" },
  ];

  const rates: Rate[] = [
    { vehicle_no: "MH01-7703", location: "Thane Corporate Junction (Zone 1)", rate: 1500 },
    { vehicle_no: "MH01-7703", location: "Vashi Sector-17 Logistics Hub", rate: 1200 },
    { vehicle_no: "MH02-1234", location: "Andheri West Business Park", rate: 1100 },
    { vehicle_no: "MH02-1234", location: "Bandra Kurla Complex (BKC)", rate: 900 },
    { vehicle_no: "MH03-5678", location: "Panvel Industrial Area Terminal", rate: 2000 },
    { vehicle_no: "MH03-5678", location: "Belapur CBD Executive Center", rate: 1760 },
  ];

  const trips: Trip[] = [];

  const mk = (id: string, date: string, time: string, vehicle_no: string, location: string, emp_count: number): Trip => ({
    id, date, time, vehicle_no, location, emp_count, status: 'Completed',
  });

  for (let i = 0; i < 40; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push(mk(`trip-mh01-thane-${i+1}`, `2026-04-${day}`, "08:15", "MH01-7703", "Thane Corporate Junction (Zone 1)", 5));
  }
  for (let i = 0; i < 30; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push(mk(`trip-mh01-vashi-${i+1}`, `2026-04-${day}`, "17:30", "MH01-7703", "Vashi Sector-17 Logistics Hub", 4));
  }
  for (let i = 0; i < 50; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push(mk(`trip-mh02-andheri-${i+1}`, `2026-04-${day}`, "07:45", "MH02-1234", "Andheri West Business Park", 6));
  }
  for (let i = 0; i < 40; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push(mk(`trip-mh02-bandra-${i+1}`, `2026-04-${day}`, "20:00", "MH02-1234", "Bandra Kurla Complex (BKC)", 4));
  }
  for (let i = 0; i < 30; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push(mk(`trip-mh03-panvel-${i+1}`, `2026-04-${day}`, "09:00", "MH03-5678", "Panvel Industrial Area Terminal", 12));
  }
  for (let i = 0; i < 10; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push(mk(`trip-mh03-belapur-${i+1}`, `2026-04-${day}`, "18:15", "MH03-5678", "Belapur CBD Executive Center", 10));
  }

  const adjustments: Adjustment[] = [
    { id: "adj-1", month: "2026-04", vehicle_no: "MH01-7703", location: null, fine: 1000, toll: 500, advance: 15000 },
    { id: "adj-2", month: "2026-04", vehicle_no: "MH02-1234", location: null, fine: 500, toll: 1000, advance: 12000 },
    { id: "adj-3", month: "2026-04", vehicle_no: "MH03-5678", location: null, fine: 500, toll: 500, advance: 13000 },
  ];

  const drivers: Driver[] = [
    { id: "drv-1", name: "Ramesh Yadav", phone: "+91 90001 11111", license_no: "MH01-2021-0012345", license_expiry: "2027-06-30", assigned_vehicle: "MH01-7703", availability: "Available" },
    { id: "drv-2", name: "Suresh Jadhav", phone: "+91 90002 22222", license_no: "MH02-2019-0056789", license_expiry: "2026-09-15", assigned_vehicle: "MH02-1234", availability: "Available" },
  ];

  const clients: Client[] = [
    { id: "cli-1", name: "Infosys Ltd", company: "Infosys Technologies", phone: "+91 80001 00001", email: "transport@infosys.com", gstin: "27AABCI1234A1ZK", address: "Pune, Maharashtra", credit_limit: 500000 },
    { id: "cli-2", name: "TCS Corp", company: "Tata Consultancy Services", phone: "+91 80002 00002", email: "fleet@tcs.com", gstin: "27AAACT1234B1ZL", address: "Mumbai, Maharashtra", credit_limit: 300000 },
  ];

  return { vehicles, rates, trips, adjustments, drivers, clients };
}

export function verifySeedData(): { success: boolean; total_bill: number; total_payable: number } {
  const { vehicles, rates, trips, adjustments } = getSeedData();
  const summary = calculateBill("2026-04", vehicles, rates, trips, adjustments);
  const expectedBill = 264600;
  const expectedPayable = 224600;
  const matchesBill = summary.total_bill === expectedBill;
  const matchesPayable = summary.total_payable === expectedPayable;
  console.log("=== KAVYA TOURS SEED DATA VERIFICATION ===");
  console.log(`Month: ${summary.month}`);
  console.log(`Total Trips: ${summary.total_trips}`);
  console.log(`Total Bill:  ₹${summary.total_bill.toLocaleString('en-IN')} (Expected: ₹${expectedBill.toLocaleString('en-IN')}) -> ${matchesBill ? 'PASS' : 'FAIL'}`);
  console.log(`Total Pay:   ₹${summary.total_payable.toLocaleString('en-IN')} (Expected: ₹${expectedPayable.toLocaleString('en-IN')}) -> ${matchesPayable ? 'PASS' : 'FAIL'}`);
  console.log("==========================================");
  return { success: matchesBill && matchesPayable, total_bill: summary.total_bill, total_payable: summary.total_payable };
}
