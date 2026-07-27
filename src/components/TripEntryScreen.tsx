/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Car, MapPin, Users, Plus, Trash2, Check, Clock, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import { Vehicle, Rate, Trip, Driver, Client, TripStatus, TripType } from '../types';

interface Props {
  vehicles: Vehicle[];
  rates: Rate[];
  trips: Trip[];
  drivers: Driver[];
  clients: Client[];
  onAddTrip: (trip: Omit<Trip, 'id'>) => void;
  onDeleteTrip: (id: string) => void;
  onUpdateTripStatus: (id: string, status: TripStatus) => void;
}

const STATUS_ORDER: TripStatus[] = ['Requested', 'Confirmed', 'Ongoing', 'Completed', 'Billed', 'Paid'];
const STATUS_STYLE: Record<TripStatus, { bg: string; text: string }> = {
  Requested: { bg: 'rgba(100,116,139,0.2)',   text: '#94a3b8' },
  Confirmed: { bg: 'var(--blue-dim)',          text: 'var(--blue)' },
  Ongoing:   { bg: 'var(--amber-dim)',         text: 'var(--amber)' },
  Completed: { bg: 'var(--green-dim)',         text: 'var(--green-light)' },
  Billed:    { bg: 'rgba(139,92,246,0.15)',    text: '#a78bfa' },
  Paid:      { bg: 'rgba(16,185,129,0.18)',    text: '#34d399' },
};

const TRIP_TYPES: TripType[] = ['Local', 'Outstation', 'Airport', 'Rental'];

function nextStatus(s: TripStatus): TripStatus {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)];
}

export default function TripEntryScreen({ vehicles, rates, trips, drivers, clients, onAddTrip, onDeleteTrip, onUpdateTripStatus }: Props) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [time, setTime] = useState('');
  const [vehicleNo, setVehicleNo] = useState(() => vehicles[0]?.vehicle_no || '');
  const [location, setLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [empCount, setEmpCount] = useState(4);
  const [customLocationActive, setCustomLocationActive] = useState(false);
  const [tripType, setTripType] = useState<TripType>('Local');
  const [km, setKm] = useState('');
  const [driverId, setDriverId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [conflictWarn, setConflictWarn] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }, []);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayTrips  = useMemo(() => trips.filter(t => t.date === today).length, [trips, today]);
  const monthTrips  = useMemo(() => trips.filter(t => t.date.startsWith(currentMonth)).length, [trips, currentMonth]);
  const dateTrips   = useMemo(() => trips.filter(t => t.date === date).length, [trips, date]);

  const vehicleLocations = useMemo(() => rates.filter(r => r.vehicle_no === vehicleNo).map(r => r.location), [rates, vehicleNo]);
  const selectedVehicle  = useMemo(() => vehicles.find(v => v.vehicle_no === vehicleNo), [vehicles, vehicleNo]);

  const assignableDrivers = useMemo(() => {
    return drivers.filter(d => !d.assigned_vehicle || d.assigned_vehicle === vehicleNo);
  }, [drivers, vehicleNo]);

  const checkConflict = (vno: string, d: string, t: string): string | null => {
    const existing = trips.filter(trip => trip.vehicle_no === vno && trip.date === d);
    if (existing.length === 0) return null;
    if (t) {
      const conflict = existing.find(trip => trip.time === t);
      if (conflict) return `Vehicle ${vno} already has a trip at ${t} on ${d}.`;
    } else {
      return `Vehicle ${vno} already has ${existing.length} trip(s) on ${d}.`;
    }
    return null;
  };

  const handleVehicleChange = (vno: string) => {
    setVehicleNo(vno);
    setLocation('');
    setDriverId('');
    setConflictWarn(checkConflict(vno, date, time));
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setConflictWarn(checkConflict(vehicleNo, d, time));
  };

  const handleTimeChange = (t: string) => {
    setTime(t);
    setConflictWarn(checkConflict(vehicleNo, date, t));
  };

  const handleClientChange = (cid: string) => {
    setClientId(cid);
    const c = clients.find(x => x.id === cid);
    setClientName(c ? c.name : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo || !location.trim()) return;
    const selectedClient = clients.find(c => c.id === clientId);
    onAddTrip({
      date,
      time: time.trim() || null,
      vehicle_no: vehicleNo,
      location: location.trim(),
      drop_location: dropLocation.trim() || undefined,
      emp_count: Number(empCount) || 1,
      status: 'Requested',
      trip_type: tripType,
      km: km ? Number(km) : undefined,
      driver_id: driverId || undefined,
      client_id: clientId || undefined,
      client_name: selectedClient?.name || clientName.trim() || undefined,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
    setLocation(''); setTime(''); setDropLocation(''); setKm('');
    setEmpCount(4); setCustomLocationActive(false); setConflictWarn(null);
  };

  const enteredTripsForDate = useMemo(() =>
    trips.filter(t => t.date === date).sort((a, b) => b.id.localeCompare(a.id)),
    [trips, date]);

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

      {/* Conflict Warning */}
      {conflictWarn && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: 'var(--amber-dim)', border: '1px solid var(--amber-border)',
          borderRadius: 12, fontSize: 12.5, color: 'var(--amber)',
        }}>
          <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
          <strong>Conflict Warning:</strong>&nbsp;{conflictWarn}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: "Today's Trips",  value: todayTrips,      sub: 'logged today' },
          { cls: 'emerald', label: 'This Month',      value: monthTrips,      sub: 'trips this month' },
          { cls: 'sky',     label: 'Selected Date',   value: dateTrips,       sub: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
          { cls: 'amber',   label: 'Fleet Active',    value: vehicles.length, sub: 'registered vehicles' },
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
            <div className="layout-row-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 13px' }}>
              <Car style={{ width: 12, height: 12, color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--t1)' }}>{selectedVehicle.vehicle_no}</span>
              <span className={`badge ${vehicleTypeColors[selectedVehicle.type] || 'badge-slate'}`}>{selectedVehicle.type}</span>
            </div>
          )}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Date, Time, Trip Type */}
            <div className="grid-3-columns">
              <div>
                <label className="form-label layout-row-center" style={{ gap: 5 }}>
                  <Calendar style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Date
                </label>
                <input type="date" value={date} onChange={e => handleDateChange(e.target.value)} required className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="form-label layout-row-center" style={{ gap: 5 }}>
                  <Clock style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Time
                  <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--t4)', marginLeft: 3, letterSpacing: 0, fontSize: 9 }}>(optional)</span>
                </label>
                <input type="time" value={time} onChange={e => handleTimeChange(e.target.value)} className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="form-label">Trip Type</label>
                <select value={tripType} onChange={e => setTripType(e.target.value as TripType)} className="form-select">
                  {TRIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Vehicle & Driver */}
            <div className="grid-2-columns">
              <div>
                <label className="form-label layout-row-center" style={{ gap: 5 }}>
                  <Car style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Vehicle
                </label>
                <select value={vehicleNo} onChange={e => handleVehicleChange(e.target.value)} required className="form-select">
                  <option value="" disabled>Select Vehicle</option>
                  {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type}) — {v.vendor_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Driver</label>
                <select value={driverId} onChange={e => setDriverId(e.target.value)} className="form-select">
                  <option value="">— Unassigned —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.assigned_vehicle ? `(${d.assigned_vehicle})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client */}
            <div className="grid-2-columns">
              <div>
                <label className="form-label">Client</label>
                <select value={clientId} onChange={e => handleClientChange(e.target.value)} className="form-select">
                  <option value="">— No client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">KM <span style={{ fontWeight: 400, color: 'var(--t4)', fontSize: 9 }}>(optional)</span></label>
                <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="e.g. 45" min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
            </div>

            {/* Pickup Location */}
            <div>
              <div className="layout-row-between" style={{ marginBottom: 8 }}>
                <label className="form-label layout-row-center" style={{ gap: 5, margin: 0 }}>
                  <MapPin style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Pickup Location
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
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Type pickup location (e.g. Thane, Vashi)" required className="form-input" />
              )}
            </div>

            {/* Drop Location */}
            <div>
              <label className="form-label layout-row-center" style={{ gap: 5 }}>
                <MapPin style={{ width: 10, height: 10, color: 'var(--red-light)' }} /> Drop Location
                <span style={{ fontWeight: 400, color: 'var(--t4)', fontSize: 9 }}>(optional)</span>
              </label>
              <input type="text" value={dropLocation} onChange={e => setDropLocation(e.target.value)} placeholder="Type drop location" className="form-input" />
            </div>

            {/* Employee Count */}
            <div>
              <label className="form-label layout-row-center" style={{ gap: 5 }}>
                <Users style={{ width: 10, height: 10, color: 'var(--gold)' }} /> Employee Count / Capacity
              </label>
              <div className="layout-row-center" style={{ gap: 10 }}>
                <button type="button" onClick={() => adjustEmpCount(-1)} className="stepper-btn">−</button>
                <input type="number" value={empCount} onChange={e => setEmpCount(Math.max(1, Number(e.target.value) || 1))} required min="1" className="stepper-input" />
                <button type="button" onClick={() => adjustEmpCount(1)} className="stepper-btn">+</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                {[4, 5, 6, 10, 12].map(num => (
                  <button key={num} type="button" onClick={() => setEmpCount(num)} className={`preset-pill ${empCount === num ? 'active' : ''}`}>{num}</button>
                ))}
              </div>
            </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto', paddingRight: 2 }}>
              {enteredTripsForDate.map(trip => {
                const vehicle = vehicles.find(v => v.vehicle_no === trip.vehicle_no);
                const driver  = drivers.find(d => d.id === trip.driver_id);
                const st = trip.status || 'Requested';
                const sc = STATUS_STYLE[st];
                const nxt = nextStatus(st);
                const canAdvance = st !== 'Paid';
                return (
                  <div key={trip.id} className="trip-item" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div className="trip-vehicle-icon"><Car style={{ width: 16, height: 16 }} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{trip.vehicle_no}</span>
                          <span className={`badge ${vehicleTypeColors[vehicle?.type || ''] || 'badge-slate'}`}>{vehicle?.type || 'Vehicle'}</span>
                          {trip.trip_type && <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{trip.trip_type}</span>}
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
                          {trip.drop_location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--t3)' }}>
                              <ChevronRight style={{ width: 10, height: 10 }} />
                              <MapPin style={{ width: 11, height: 11, color: 'var(--red-light)' }} /> {trip.drop_location}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                          {driver && <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>👤 {driver.name}</span>}
                          {trip.client_name && <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>🏢 {trip.client_name}</span>}
                          {trip.km && <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{trip.km} km</span>}
                          <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                            <Users style={{ width: 10, height: 10, display: 'inline', marginRight: 3 }} />{trip.emp_count} pax
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => onUpdateTripStatus(trip.id, nxt)}
                          disabled={!canAdvance}
                          title={canAdvance ? `Advance to ${nxt}` : 'Fully paid'}
                          style={{
                            padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700,
                            background: sc.bg, color: sc.text, border: `1px solid ${sc.text}33`,
                            cursor: canAdvance ? 'pointer' : 'default',
                            whiteSpace: 'nowrap', transition: 'opacity 0.15s',
                          }}
                        >
                          {st}
                        </button>
                        {canAdvance && (
                          <span style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            → {nxt}
                          </span>
                        )}
                        <button onClick={() => onDeleteTrip(trip.id)} className="btn btn-danger btn-icon" title="Delete">
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
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
