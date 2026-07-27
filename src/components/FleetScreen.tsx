/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Car, Plus, Trash2, AlertTriangle, CheckCircle2, Wrench, TrendingUp, Phone, CalendarDays } from 'lucide-react';
import { Vehicle, MaintenanceLog, Rate, Trip, Adjustment } from '../types';
import { calculateBill } from '../billingEngine';
import VehicleCalendarTab from './VehicleCalendarTab';

interface Props {
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
  rates: Rate[];
  trips: Trip[];
  adjustments: Adjustment[];
  onAddVehicle: (v: Vehicle) => void;
  onUpdateVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (no: string) => void;
  onAddMaintenanceLog: (log: Omit<MaintenanceLog, 'id'>) => void;
  onDeleteMaintenanceLog: (id: string) => void;
}

type SubTab = 'vehicles' | 'availability' | 'maintenance' | 'pl';

const TYPE_COLORS: Record<string, string> = { Sumo: 'badge-indigo', Eeco: 'badge-emerald', TT: 'badge-amber', Indica: 'badge-sky' };
const VEHICLE_TYPES = ['Sumo', 'Eeco', 'TT', 'Indica'];

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ dateStr, label }: { dateStr?: string; label: string }) {
  const d = daysUntil(dateStr);
  if (d === null) return <span style={{ color: 'var(--t4)', fontSize: 11 }}>—</span>;
  const urgent = d <= 30;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9.5, color: 'var(--t4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 7,
        fontFamily: 'var(--font-mono)',
        background: d <= 0 ? 'var(--red-dim)' : urgent ? 'var(--amber-dim)' : 'var(--green-dim)',
        color: d <= 0 ? 'var(--red-light)' : urgent ? 'var(--amber)' : 'var(--green-light)',
        border: `1px solid ${d <= 0 ? 'var(--red-border)' : urgent ? 'var(--amber-border)' : 'var(--green-border)'}`,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {urgent && <AlertTriangle style={{ width: 9, height: 9 }} />}
        {d <= 0 ? 'EXPIRED' : dateStr}
      </span>
    </div>
  );
}

export default function FleetScreen({ vehicles, maintenanceLogs, rates, trips, adjustments, onAddVehicle, onUpdateVehicle, onDeleteVehicle, onAddMaintenanceLog, onDeleteMaintenanceLog }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('vehicles');
  const [editingVeh, setEditingVeh] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});
  const [calVehicle, setCalVehicle] = useState(() => vehicles[0]?.vehicle_no || '');

  // Add vehicle form
  const [newVehNo, setNewVehNo] = useState('');
  const [newVehType, setNewVehType] = useState('Sumo');
  const [newVendor, setNewVendor] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRc, setNewRc] = useState('');
  const [newInsurance, setNewInsurance] = useState('');
  const [newPermit, setNewPermit] = useState('');
  const [newPuc, setNewPuc] = useState('');

  // Maintenance form
  const [mVehicle, setMVehicle] = useState(() => vehicles[0]?.vehicle_no || '');
  const [mDate, setMDate] = useState('');
  const [mOdo, setMOdo] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mNextDue, setMNextDue] = useState('');
  const [mCost, setMCost] = useState('');

  const alertCount = useMemo(() => {
    let count = 0;
    for (const v of vehicles) {
      for (const d of [v.insurance_expiry, v.permit_expiry, v.puc_expiry]) {
        const days = daysUntil(d);
        if (days !== null && days <= 30) count++;
      }
    }
    return count;
  }, [vehicles]);

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehNo.trim() || !newVendor.trim()) return;
    onAddVehicle({
      vehicle_no: newVehNo.trim().toUpperCase(), type: newVehType,
      vendor_name: newVendor.trim(), phone: newPhone.trim() || 'N/A',
      rc_number: newRc.trim() || undefined,
      insurance_expiry: newInsurance || undefined,
      permit_expiry: newPermit || undefined,
      puc_expiry: newPuc || undefined,
    });
    setNewVehNo(''); setNewVendor(''); setNewPhone('');
    setNewRc(''); setNewInsurance(''); setNewPermit(''); setNewPuc('');
  };

  const handleSaveEdit = (vehicle_no: string) => {
    const original = vehicles.find(v => v.vehicle_no === vehicle_no);
    if (!original) return;
    onUpdateVehicle({ ...original, ...editForm });
    setEditingVeh(null);
    setEditForm({});
  };

  const handleAddMaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mVehicle || !mDate || !mDesc) return;
    onAddMaintenanceLog({ vehicle_no: mVehicle, service_date: mDate, odometer: Number(mOdo) || 0, description: mDesc, next_service_due: mNextDue, cost: Number(mCost) || 0 });
    setMDate(''); setMOdo(''); setMDesc(''); setMNextDue(''); setMCost('');
  };

  // P&L computation per vehicle
  const plData = useMemo(() => {
    return vehicles.map(v => {
      // Revenue: compute all months this vehicle has trips
      const vTrips = trips.filter(t => t.vehicle_no === v.vehicle_no);
      const months = [...new Set(vTrips.map(t => t.date.slice(0, 7)))];
      let totalRevenue = 0;
      for (const month of months) {
        const summary = calculateBill(month, [v], rates.filter(r => r.vehicle_no === v.vehicle_no), vTrips, adjustments.filter(a => a.vehicle_no === v.vehicle_no));
        totalRevenue += summary.total_bill;
      }
      // Expenses: maintenance costs
      const totalExpenses = maintenanceLogs.filter(m => m.vehicle_no === v.vehicle_no).reduce((s, m) => s + m.cost, 0);
      return { vehicle_no: v.vehicle_no, type: v.type, vendor_name: v.vendor_name, totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses, tripCount: vTrips.length };
    });
  }, [vehicles, trips, rates, adjustments, maintenanceLogs]);

  const vMaintLogs = useMemo(() =>
    [...maintenanceLogs].sort((a, b) => b.service_date.localeCompare(a.service_date)),
    [maintenanceLogs]);

  const subtabs: { id: SubTab; label: string; badge?: number }[] = [
    { id: 'vehicles',     label: 'Fleet Vehicles', badge: alertCount > 0 ? alertCount : undefined },
    { id: 'availability', label: 'Availability' },
    { id: 'maintenance',  label: 'Maintenance Log' },
    { id: 'pl',           label: 'P&L per Vehicle' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: 'Total Vehicles', value: vehicles.length,     sub: 'fleet units' },
          { cls: 'amber',   label: 'Doc Alerts',      value: alertCount,          sub: 'expiring in 30d' },
          { cls: 'emerald', label: 'Maint Records',   value: maintenanceLogs.length, sub: 'service logs' },
          { cls: 'sky',     label: 'Rate Configs',    value: rates.length,        sub: 'location rates' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="pill-tabs">
        {subtabs.map(t => (
          <button key={t.id} className={`pill-tab ${subTab === t.id ? 'active' : ''}`} onClick={() => setSubTab(t.id)}>
            {t.id === 'vehicles' && <Car style={{ width: 13, height: 13 }} />}
            {t.id === 'availability' && <CalendarDays style={{ width: 13, height: 13 }} />}
            {t.id === 'maintenance' && <Wrench style={{ width: 13, height: 13 }} />}
            {t.id === 'pl' && <TrendingUp style={{ width: 13, height: 13 }} />}
            {t.label}
            {t.badge !== undefined && <span className="badge badge-red" style={{ fontSize: 9.5, padding: '2px 6px', marginLeft: 2 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── VEHICLES ── */}
      {subTab === 'vehicles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Add form */}
          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <Car style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Register New Vehicle</span>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Vehicle No.</label>
                    <input type="text" value={newVehNo} onChange={e => setNewVehNo(e.target.value)} placeholder="e.g. MH01-7703" required className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="form-label">Vehicle Type</label>
                    <select value={newVehType} onChange={e => setNewVehType(e.target.value)} required className="form-select">
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t === 'TT' ? 'Tempo Traveller (TT)' : t === 'Eeco' ? 'Eeco (Maruti)' : t === 'Sumo' ? 'Sumo (TATA)' : 'Indica (TATA)'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Vendor / Owner Name</label>
                    <input type="text" value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder="e.g. Ramesh Patel" required className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91 98765 43210" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">RC Number</label>
                    <input type="text" value={newRc} onChange={e => setNewRc(e.target.value)} placeholder="e.g. MH01CQ7703" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div>
                    <label className="form-label">Insurance Expiry</label>
                    <input type="date" value={newInsurance} onChange={e => setNewInsurance(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Permit Expiry</label>
                    <input type="date" value={newPermit} onChange={e => setNewPermit(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="form-label">PUC Expiry</label>
                    <input type="date" value={newPuc} onChange={e => setNewPuc(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 2 }}>
                  <Plus style={{ width: 14, height: 14 }} /> Register Vehicle
                </button>
              </form>
            </div>
          </div>

          {/* Fleet list */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Registered Fleet</span>
              <span className="badge badge-emerald">{vehicles.length} Vehicles</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {vehicles.length === 0 ? (
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-state-icon"><Car style={{ width: 20, height: 20 }} /></div>
                    <div className="empty-state-title">No vehicles registered</div>
                  </div>
                </div>
              ) : vehicles.map((v, idx) => {
                const isEditing = editingVeh === v.vehicle_no;
                const hasAlert = [v.insurance_expiry, v.permit_expiry, v.puc_expiry].some(d => { const days = daysUntil(d); return days !== null && days <= 30; });
                return (
                  <div key={v.vehicle_no} style={{ borderBottom: idx < vehicles.length - 1 ? '1px solid var(--border)' : 'none', padding: '16px 20px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="grid-2-columns">
                          <div>
                            <label className="form-label">Vendor Name</label>
                            <input type="text" value={editForm.vendor_name ?? v.vendor_name} onChange={e => setEditForm(f => ({ ...f, vendor_name: e.target.value }))} className="form-input" />
                          </div>
                          <div>
                            <label className="form-label">Phone</label>
                            <input type="text" value={editForm.phone ?? v.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="form-input" />
                          </div>
                        </div>
                        <div className="grid-2-columns">
                          <div>
                            <label className="form-label">RC Number</label>
                            <input type="text" value={editForm.rc_number ?? v.rc_number ?? ''} onChange={e => setEditForm(f => ({ ...f, rc_number: e.target.value }))} className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                          </div>
                          <div>
                            <label className="form-label">Insurance Expiry</label>
                            <input type="date" value={editForm.insurance_expiry ?? v.insurance_expiry ?? ''} onChange={e => setEditForm(f => ({ ...f, insurance_expiry: e.target.value }))} className="form-input" style={{ colorScheme: 'dark' }} />
                          </div>
                        </div>
                        <div className="grid-2-columns">
                          <div>
                            <label className="form-label">Permit Expiry</label>
                            <input type="date" value={editForm.permit_expiry ?? v.permit_expiry ?? ''} onChange={e => setEditForm(f => ({ ...f, permit_expiry: e.target.value }))} className="form-input" style={{ colorScheme: 'dark' }} />
                          </div>
                          <div>
                            <label className="form-label">PUC Expiry</label>
                            <input type="date" value={editForm.puc_expiry ?? v.puc_expiry ?? ''} onChange={e => setEditForm(f => ({ ...f, puc_expiry: e.target.value }))} className="form-input" style={{ colorScheme: 'dark' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleSaveEdit(v.vehicle_no)} className="btn btn-primary btn-sm"><CheckCircle2 style={{ width: 12, height: 12 }} /> Save</button>
                          <button onClick={() => { setEditingVeh(null); setEditForm({}); }} className="btn btn-secondary btn-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>{v.vehicle_no}</span>
                              <span className={`badge ${TYPE_COLORS[v.type] || 'badge-slate'}`}>{v.type}</span>
                              {hasAlert && <span className="badge badge-red" style={{ fontSize: 9.5 }}><AlertTriangle style={{ width: 9, height: 9, display: 'inline' }} /> Doc Alert</span>}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500, marginTop: 3 }}>{v.vendor_name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                              <Phone style={{ width: 10, height: 10 }} />{v.phone}
                              {v.rc_number && <span style={{ marginLeft: 8, color: 'var(--t4)' }}>RC: {v.rc_number}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditingVeh(v.vehicle_no); setEditForm({}); }} className="btn btn-secondary btn-sm btn-icon" title="Edit">✏️</button>
                            <button onClick={() => { if (confirm(`Delete ${v.vehicle_no}? All its rates and trips will also be deleted!`)) onDeleteVehicle(v.vehicle_no); }} className="btn btn-danger btn-icon" title="Delete"><Trash2 style={{ width: 13, height: 13 }} /></button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                          <ExpiryBadge dateStr={v.insurance_expiry} label="Insurance" />
                          <ExpiryBadge dateStr={v.permit_expiry} label="Permit" />
                          <ExpiryBadge dateStr={v.puc_expiry} label="PUC" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── AVAILABILITY CALENDAR ── */}
      {subTab === 'availability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {vehicles.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state">
                <div className="empty-state-icon"><CalendarDays style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">Register a vehicle to view its availability</div>
              </div>
            </div></div>
          ) : (
            <>
              <div className="card">
                <div className="card-body layout-row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Vehicle Availability Calendar</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>Red dates are booked · click any date to see its trips</div>
                  </div>
                  <div className="layout-row-center" style={{ gap: 10 }}>
                    <label className="form-label" style={{ margin: 0 }}>Vehicle</label>
                    <select value={calVehicle} onChange={e => setCalVehicle(e.target.value)} className="form-select" style={{ width: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type})</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <VehicleCalendarTab vehicleNo={calVehicle || vehicles[0].vehicle_no} trips={trips} />
            </>
          )}
        </div>
      )}

      {/* ── MAINTENANCE ── */}
      {subTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <Wrench style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Log Service / Maintenance</span>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddMaint} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Vehicle</label>
                    <select value={mVehicle} onChange={e => setMVehicle(e.target.value)} required className="form-select">
                      {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Service Date</label>
                    <input type="date" value={mDate} onChange={e => setMDate(e.target.value)} required className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div className="grid-3-columns">
                  <div>
                    <label className="form-label">Odometer (km)</label>
                    <input type="number" value={mOdo} onChange={e => setMOdo(e.target.value)} placeholder="e.g. 52400" min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div>
                    <label className="form-label">Cost (₹)</label>
                    <input type="number" value={mCost} onChange={e => setMCost(e.target.value)} placeholder="e.g. 3500" min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div>
                    <label className="form-label">Next Service Due</label>
                    <input type="date" value={mNextDue} onChange={e => setMNextDue(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input type="text" value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="e.g. Oil change, brake pads, tyre rotation" required className="form-input" />
                </div>
                <button type="submit" className="btn btn-primary btn-full">
                  <Plus style={{ width: 14, height: 14 }} /> Add Maintenance Record
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Service History</span>
              <span className="badge badge-indigo">{maintenanceLogs.length} Records</span>
            </div>
            {maintenanceLogs.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Wrench style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No maintenance records yet</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Vehicle</th><th>Date</th><th>Description</th>
                    <th style={{ textAlign: 'right' }}>Odometer</th>
                    <th style={{ textAlign: 'right' }}>Cost</th>
                    <th>Next Due</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {vMaintLogs.map(log => (
                      <tr key={log.id}>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5 }}>{log.vehicle_no}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>{log.service_date}</td>
                        <td style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{log.description}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t2)' }}>{log.odometer.toLocaleString('en-IN')} km</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-light)' }}>₹{log.cost.toLocaleString('en-IN')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t3)' }}>{log.next_service_due || '—'}</td>
                        <td>
                          <button onClick={() => onDeleteMaintenanceLog(log.id)} className="btn btn-danger btn-icon" title="Delete"><Trash2 style={{ width: 12, height: 12 }} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── P&L ── */}
      {subTab === 'pl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {plData.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state">
                <div className="empty-state-icon"><TrendingUp style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No vehicles to show</div>
              </div>
            </div></div>
          ) : plData.map(p => (
            <div key={p.vehicle_no} className="card">
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>{p.vehicle_no}</span>
                    <span className={`badge ${TYPE_COLORS[p.type] || 'badge-slate'}`}>{p.type}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 3 }}>{p.vendor_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontWeight: 700 }}>Trips</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--t1)', marginTop: 4 }}>{p.tripCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontWeight: 700 }}>Revenue</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--green-light)', marginTop: 4 }}>₹{p.totalRevenue.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontWeight: 700 }}>Expenses</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--red-light)', marginTop: 4 }}>₹{p.totalExpenses.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.55)', fontWeight: 700 }}>Net P&L</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: p.profit >= 0 ? 'var(--gold)' : 'var(--red-light)', marginTop: 4 }}>
                    {p.profit >= 0 ? '+' : ''}₹{p.profit.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width 0.4s',
                    width: p.totalRevenue > 0 ? `${Math.min(100, (p.totalExpenses / p.totalRevenue) * 100)}%` : '0%',
                    background: 'linear-gradient(90deg, var(--green) 0%, var(--red) 100%)',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
