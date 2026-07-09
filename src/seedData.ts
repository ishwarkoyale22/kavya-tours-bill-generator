/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, Rate, Trip, Adjustment } from './types';
import { calculateBill } from './billingEngine';

export function getSeedData() {
  const vehicles: Vehicle[] = [
    {
      vehicle_no: "MH01-7703",
      type: "Sumo",
      vendor_name: "Ramesh Patel Logistics & Transport Services",
      phone: "+91 98765 43210",
    },
    {
      vehicle_no: "MH02-1234",
      type: "Eeco",
      vendor_name: "Suresh Kumar Fleet Logistics Group",
      phone: "+91 98123 45678",
    },
    {
      vehicle_no: "MH03-5678",
      type: "TT",
      vendor_name: "Dilip Singh Corporate Travel Agency",
      phone: "+91 97654 32109",
    },
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

  // Generate 40 trips for MH01-7703 in Thane Corporate Junction (Zone 1)
  for (let i = 0; i < 40; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push({
      id: `trip-mh01-thane-${i + 1}`,
      date: `2026-04-${day}`,
      time: "08:15",
      vehicle_no: "MH01-7703",
      location: "Thane Corporate Junction (Zone 1)",
      emp_count: 5,
    });
  }

  // Generate 30 trips for MH01-7703 in Vashi Sector-17 Logistics Hub
  for (let i = 0; i < 30; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push({
      id: `trip-mh01-vashi-${i + 1}`,
      date: `2026-04-${day}`,
      time: "17:30",
      vehicle_no: "MH01-7703",
      location: "Vashi Sector-17 Logistics Hub",
      emp_count: 4,
    });
  }

  // Generate 50 trips for MH02-1234 in Andheri West Business Park
  for (let i = 0; i < 50; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push({
      id: `trip-mh02-andheri-${i + 1}`,
      date: `2026-04-${day}`,
      time: "07:45",
      vehicle_no: "MH02-1234",
      location: "Andheri West Business Park",
      emp_count: 6,
    });
  }

  // Generate 40 trips for MH02-1234 in Bandra Kurla Complex (BKC)
  for (let i = 0; i < 40; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push({
      id: `trip-mh02-bandra-${i + 1}`,
      date: `2026-04-${day}`,
      time: "20:00",
      vehicle_no: "MH02-1234",
      location: "Bandra Kurla Complex (BKC)",
      emp_count: 4,
    });
  }

  // Generate 30 trips for MH03-5678 in Panvel Industrial Area Terminal
  for (let i = 0; i < 30; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push({
      id: `trip-mh03-panvel-${i + 1}`,
      date: `2026-04-${day}`,
      time: "09:00",
      vehicle_no: "MH03-5678",
      location: "Panvel Industrial Area Terminal",
      emp_count: 12,
    });
  }

  // Generate 10 trips for MH03-5678 in Belapur CBD Executive Center
  for (let i = 0; i < 10; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    trips.push({
      id: `trip-mh03-belapur-${i + 1}`,
      date: `2026-04-${day}`,
      time: "18:15",
      vehicle_no: "MH03-5678",
      location: "Belapur CBD Executive Center",
      emp_count: 10,
    });
  }

  const adjustments: Adjustment[] = [
    {
      id: "adj-1",
      month: "2026-04",
      vehicle_no: "MH01-7703",
      location: null,
      fine: 1000,
      toll: 500,
      advance: 15000,
    },
    {
      id: "adj-2",
      month: "2026-04",
      vehicle_no: "MH02-1234",
      location: null,
      fine: 500,
      toll: 1000,
      advance: 12000,
    },
    {
      id: "adj-3",
      month: "2026-04",
      vehicle_no: "MH03-5678",
      location: null,
      fine: 500,
      toll: 500,
      advance: 13000,
    },
  ];

  return { vehicles, rates, trips, adjustments };
}

/**
 * Self-verification utility that prints to console and returns validation outcome
 */
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

  return {
    success: matchesBill && matchesPayable,
    total_bill: summary.total_bill,
    total_payable: summary.total_payable,
  };
}
