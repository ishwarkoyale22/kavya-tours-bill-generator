-- Supabase Schema & Migrations for Kavya Tours Auto Vendor Bill Generator

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'vehicles' table
CREATE TABLE vehicles (
    vehicle_no TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- Sumo / Eeco / TT / Indica
    vendor_name TEXT NOT NULL,
    phone TEXT NOT NULL
);

-- 3. Create 'rates' table
CREATE TABLE rates (
    vehicle_no TEXT NOT NULL REFERENCES vehicles(vehicle_no) ON DELETE CASCADE,
    location TEXT NOT NULL,
    rate NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY (vehicle_no, location),
    CONSTRAINT unique_vehicle_location UNIQUE (vehicle_no, location)
);

-- 4. Create 'trips' table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME,
    vehicle_no TEXT NOT NULL REFERENCES vehicles(vehicle_no) ON DELETE CASCADE,
    location TEXT NOT NULL,
    emp_count INTEGER NOT NULL DEFAULT 0
);

-- 5. Create 'adjustments' table
CREATE TABLE adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month TEXT NOT NULL, -- e.g. "2026-04"
    vehicle_no TEXT NOT NULL REFERENCES vehicles(vehicle_no) ON DELETE CASCADE,
    location TEXT, -- nullable, specifies if adjustment is location-specific
    fine NUMERIC NOT NULL DEFAULT 0,
    toll NUMERIC NOT NULL DEFAULT 0,
    advance NUMERIC NOT NULL DEFAULT 0
);

-- 6. Insert Indexes for speed
CREATE INDEX idx_trips_vehicle_no ON trips(vehicle_no);
CREATE INDEX idx_trips_date ON trips(date);
CREATE INDEX idx_rates_vehicle_no ON rates(vehicle_no);
CREATE INDEX idx_adjustments_vehicle_no ON adjustments(vehicle_no);
CREATE INDEX idx_adjustments_month ON adjustments(month);
