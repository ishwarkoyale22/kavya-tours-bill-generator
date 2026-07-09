/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Car, MapPin, Users, Plus, Trash2, Check, Clock, Zap } from 'lucide-react';
import { Vehicle, Rate, Trip } from '../types';

interface TripEntryScreenProps {
  vehicles: Vehicle[];
  rates: Rate[];
  trips: Trip[];
  onAddTrip: (trip: Omit<Trip, 'id'>) => void;
  onDeleteTrip: (id: string) => void;
}

export default function TripEntryScreen({ vehicles, rates, trips, onAddTrip, onDeleteTrip }: TripEntryScreenProps) {
  const [date, setDate] = useState(() => {
    const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [time, setTime] = useState('');
  const [vehicleNo, setVehicleNo] = useState(() => vehicles[0]?.vehicle_no || '');
  const [location, setLocation] = useState('');
  const [empCount, setEmpCount] = useState(4);
  const [customLocationActive, setCustomLocationActive] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const today = useMemo(() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; }, []);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayTrips  = useMemo(() => trips.filter(t => t.date === today).length, [trips, today]);
  const monthTrips  = useMemo(() => trips.filter(t => t.date.startsWith(currentMonth)).length, [trips, currentMonth]);
  const dateTrips   = useMemo(() => trips.filter(t => t.date === date).length, [trips, date]);

  const vehicleLocations = useMemo(() => rates.filter(r => r.vehicle_no === vehicleNo).map(r => r.location), [rates, vehicleNo]);
  const selectedVehicle  = useMemo(() => vehicles.find(v => v.vehicle_no === vehicleNo), [vehicles, vehicleNo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo || !location.trim()) return;
    onAddTrip({ date, time: time.trim() || null, vehicle_no: vehicleNo, location: location.trim(), emp_count: Number(empCount) || 1 });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
    setLocation(''); setTime(''); setEmpCount(4); setCustomLocationActive(false);
  };

  const enteredTripsForDate = useMemo(() => trips.filter(t => t.date === date).sort((a, b) => b.id.localeCompare(a.id)), [trips, date]);
  const adjustEmpCount = (v: number) => setEmpCount(p => Math.max(1, p + v));

  const vehicleTypeColors: Record<string, string> = {
    Sumo: 'badge-indigo', Eeco: 'badge-emerald', TT: 'badge-amber', Indica: 'badge-sky',
  };

  const formattedDate = useMemo(() =>
    new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }), [date]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        <div className="toast-icon-wrap">
          <Check style={{ width: 13, height: 13, color: 'var(--green-light)', strokeWidth: 2.5 }} />
        </div>
        Trip registered — fields cleared for next entry.
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo', label: "Today's Trips",  value: todayTrips,       sub: 'logged today' },
          { cls: 'emerald', label: 'This Month',     value: monthTrips,       sub: 'trips this month' },
          { cls: 'sky',     label: 'Selected Date',  value: dateTrips,        sub: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
          { cls: 'amber',   label: 'Fleet Active',   value: vehicles.length,  sub: 'registered vehicles' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Entry Form */}
      <div className="card card-accent-top">
        <div className="card-header">
          <div>
            <div className="layout-row-center" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', letterSpacing: '-0.2px' }}>
              <Zap style={{ width: 15, height: 15, color: 'var(--gold)' }} />
              New Trip Entry
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Rapid-entry for fleet operations</div>
          </div>
          {selectedVehicle && (
            <div className="layout-row-center" style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '6px 13px',
            }}>
              <Car style={{ width: 12, height: 12, color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--t1)' }}>{selectedVehicle.vehicle_no}</span>
              <span className={`badge ${vehicleTypeColors[selectedVehicle.type] || 'badge-slate'}`}>{selectedVehicle.type}</span>
            </div>
          )}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Date & Time */}
            <div className="grid-2-columns">
              <div>
                <label className="form-label layout-row-center" style={{ gap: 5 }}>
                  <Calendar style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Date
                </label>
                <input id="trip-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="form-label layout-row-center" style={{ gap: 5 }}>
                  <Clock style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Time
                  <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--t4)', marginLeft: 3, letterSpacing: 0, fontSize: 9 }}>(optional)</span>
                </label>
                <input id="trip-time" type="time" value={time} onChange={e => setTime(e.target.value)} className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, colorScheme: 'dark' }} />
              </div>
            </div>

            {/* Vehicle */}
            <div>
              <label className="form-label layout-row-center" style={{ gap: 5 }}>
                <Car style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Vehicle
              </label>
              <select id="trip-vehicle" value={vehicleNo} onChange={e => { setVehicleNo(e.target.value); setLocation(''); }} required className="form-select">
                <option value="" disabled>Select Vehicle</option>
                {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type}) — {v.vendor_name}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <div className="layout-row-between" style={{ marginBottom: 8 }}>
                <label className="form-label layout-row-center" style={{ gap: 5, margin: 0 }}>
                  <MapPin style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Location
                </label>
                {vehicleLocations.length > 0 && (
                  <button type="button" onClick={() => { setCustomLocationActive(!customLocationActive); setLocation(''); }}
                    style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.1px' }}>
                    {customLocationActive ? '← From rates' : 'Custom →'}
                  </button>
                )}
              </div>
              {!customLocationActive && vehicleLocations.length > 0 ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                    {vehicleLocations.map(loc => (
                      <button key={loc} type="button" onClick={() => setLocation(loc)}
                        className={`loc-pill ${location.toLowerCase() === loc.toLowerCase() ? 'active' : ''}`}>
                        <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
                        {loc}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" value={location} required />
                </div>
              ) : (
                <input id="trip-location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Type location (e.g. Thane, Vashi)" required className="form-input" />
              )}
            </div>

            {/* Employee Count */}
            <div>
              <label className="form-label layout-row-center" style={{ gap: 5 }}>
                <Users style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Employee Count / Capacity
              </label>
              <div className="layout-row-center" style={{ gap: 10 }}>
                <button type="button" onClick={() => adjustEmpCount(-1)} className="stepper-btn">−</button>
                <input id="trip-emp-count" type="number" value={empCount} onChange={e => setEmpCount(Math.max(1, Number(e.target.value) || 1))} required min="1" className="stepper-input" />
                <button type="button" onClick={() => adjustEmpCount(1)} className="stepper-btn">+</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                {[4, 5, 6, 10, 12].map(num => (
                  <button key={num} type="button" onClick={() => setEmpCount(num)} className={`preset-pill ${empCount === num ? 'active' : ''}`}>{num}</button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: 4 }}>
              <Plus style={{ width: 16, height: 16, strokeWidth: 2.5 }} />
              Add Trip to Registry
            </button>
          </form>
        </div>
      </div>

      {/* Trips for Date */}
      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)', letterSpacing: '-0.2px' }}>Trips Logged</div>
            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 2 }}>{formattedDate}</div>
          </div>
          <span className="badge badge-indigo" style={{ fontSize: 11, padding: '4px 12px' }}>
            {enteredTripsForDate.length} {enteredTripsForDate.length === 1 ? 'Trip' : 'Trips'}
          </span>
        </div>

        <div className="card-body">
          {enteredTripsForDate.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar style={{ width: 20, height: 20 }} /></div>
              <div className="empty-state-title">No trips logged yet</div>
              <div className="empty-state-sub">Use the form above to log trips. They'll appear here instantly.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
              {enteredTripsForDate.map(trip => {
                const vehicle = vehicles.find(v => v.vehicle_no === trip.vehicle_no);
                return (
                  <div key={trip.id} className="trip-item">
                    <div className="trip-vehicle-icon"><Car style={{ width: 16, height: 16 }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{trip.vehicle_no}</span>
                        <span className={`badge ${vehicleTypeColors[vehicle?.type || ''] || 'badge-slate'}`}>{vehicle?.type || 'Vehicle'}</span>
                        {trip.time && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                            <Clock style={{ width: 10, height: 10 }} /> {trip.time}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>
                          <MapPin style={{ width: 11, height: 11, color: 'var(--gold)' }} /> {trip.location}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                          <Users style={{ width: 10, height: 10 }} /> {trip.emp_count} pax
                        </span>
                      </div>
                    </div>
                    <button onClick={() => onDeleteTrip(trip.id)} className="btn btn-danger btn-icon" title="Delete">
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
