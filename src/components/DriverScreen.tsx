/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, Plus, Trash2, AlertTriangle, Phone, Car, CreditCard } from 'lucide-react';
import { Driver, DriverPayout, Trip, Vehicle, DriverAvailability } from '../types';

const AVAILABILITY_OPTIONS: DriverAvailability[] = ['Available', 'On Trip', 'Off Duty', 'On Leave'];

const AVAILABILITY_STYLE: Record<DriverAvailability, { bg: string; color: string; border: string }> = {
  'Available': { bg: 'var(--green-dim)', color: 'var(--green-light)', border: 'var(--green-border)' },
  'On Trip':   { bg: 'var(--amber-dim)', color: 'var(--amber)',       border: 'var(--amber-border)' },
  'Off Duty':  { bg: 'var(--surface-2)', color: 'var(--t3)',          border: 'var(--border-2)'     },
  'On Leave':  { bg: 'var(--red-dim)',   color: 'var(--red-light)',   border: 'var(--red-border)'   },
};

interface Props {
  drivers: Driver[];
  driverPayouts: DriverPayout[];
  trips: Trip[];
  vehicles: Vehicle[];
  onAddDriver: (d: Omit<Driver, 'id'>) => void;
  onUpdateDriver: (d: Driver) => void;
  onDeleteDriver: (id: string) => void;
  onUpsertDriverPayout: (p: Omit<DriverPayout, 'id'>) => void;
}

type SubTab = 'drivers' | 'payouts';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function DriverScreen({ drivers, driverPayouts, trips, vehicles, onAddDriver, onUpdateDriver, onDeleteDriver, onUpsertDriverPayout }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('drivers');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licNo, setLicNo] = useState('');
  const [licExp, setLicExp] = useState('');
  const [assignVeh, setAssignVeh] = useState('');
  const [payoutMonth, setPayoutMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payoutDriverId, setPayoutDriverId] = useState(() => '');
  const [bata, setBata] = useState('');
  const [advance, setAdvance] = useState('');
  const [payNote, setPayNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});

  const expiryAlerts = useMemo(() =>
    drivers.filter(d => daysUntil(d.license_expiry) <= 30),
    [drivers]);

  // A driver on an Ongoing trip is always shown as "On Trip", regardless of stored status
  const onTripIds = useMemo(() =>
    new Set(trips.filter(t => t.status === 'Ongoing' && t.driver_id).map(t => t.driver_id!)),
    [trips]);

  const effectiveAvailability = (d: Driver): DriverAvailability =>
    onTripIds.has(d.id) ? 'On Trip' : (d.availability || 'Available');

  const availableCount = useMemo(() =>
    drivers.filter(d => effectiveAvailability(d) === 'Available').length,
    [drivers, onTripIds]);

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !licNo.trim() || !licExp) return;
    onAddDriver({ name: name.trim(), phone: phone.trim() || 'N/A', license_no: licNo.trim(), license_expiry: licExp, assigned_vehicle: assignVeh || undefined, availability: 'Available' });
    setName(''); setPhone(''); setLicNo(''); setLicExp(''); setAssignVeh('');
  };

  const handleSaveEdit = (id: string) => {
    const original = drivers.find(d => d.id === id);
    if (!original) return;
    onUpdateDriver({ ...original, ...editForm });
    setEditingId(null); setEditForm({});
  };

  const handleAddPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutDriverId || !payoutMonth) return;
    const autoTrips = trips.filter(t => t.driver_id === payoutDriverId && t.date.startsWith(payoutMonth)).length;
    onUpsertDriverPayout({
      driver_id: payoutDriverId, month: payoutMonth,
      bata: Number(bata) || 0, advance: Number(advance) || 0, note: payNote.trim() || undefined,
    });
    setBata(''); setAdvance(''); setPayNote('');
  };

  // Compute monthly payout summary per driver
  const payoutSummaries = useMemo(() => {
    return drivers.map(d => {
      const monthTrips = trips.filter(t => t.driver_id === d.id && t.date.startsWith(payoutMonth)).length;
      const existing = driverPayouts.find(p => p.driver_id === d.id && p.month === payoutMonth);
      const bataAmt = existing?.bata || 0;
      const advAmt = existing?.advance || 0;
      const net = bataAmt - advAmt;
      return { driver: d, monthTrips, bata: bataAmt, advance: advAmt, net, note: existing?.note };
    });
  }, [drivers, trips, driverPayouts, payoutMonth]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: 'Total Drivers',   value: drivers.length,        sub: 'registered' },
          { cls: 'amber',   label: 'Licence Alerts',  value: expiryAlerts.length,   sub: 'expiring in 30d' },
          { cls: 'emerald', label: 'Available Now',   value: availableCount,        sub: 'ready to drive' },
          { cls: 'sky',     label: 'Payout Records',  value: driverPayouts.length,  sub: 'all months' },
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
        {([['drivers', 'Driver Registry', <User style={{ width: 13, height: 13 }} />], ['payouts', 'Payout Ledger', <CreditCard style={{ width: 13, height: 13 }} />]] as const).map(([id, label, icon]) => (
          <button key={id} className={`pill-tab ${subTab === id ? 'active' : ''}`} onClick={() => setSubTab(id)}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── DRIVERS ── */}
      {subTab === 'drivers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {expiryAlerts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 12, fontSize: 12.5, color: 'var(--red-light)' }}>
              <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
              {expiryAlerts.map(d => d.name).join(', ')} — license expiring within 30 days!
            </div>
          )}

          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <User style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Register New Driver</span>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddDriver} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Yadav" required className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 90001 11111" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">License Number</label>
                    <input type="text" value={licNo} onChange={e => setLicNo(e.target.value)} placeholder="e.g. MH01-2021-0012345" required className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }} />
                  </div>
                  <div>
                    <label className="form-label">License Expiry</label>
                    <input type="date" value={licExp} onChange={e => setLicExp(e.target.value)} required className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Assigned Vehicle</label>
                  <select value={assignVeh} onChange={e => setAssignVeh(e.target.value)} className="form-select">
                    <option value="">— Unassigned —</option>
                    {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type})</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-full"><Plus style={{ width: 14, height: 14 }} /> Register Driver</button>
              </form>
            </div>
          </div>

          {/* Driver list */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Registered Drivers</span>
              <span className="badge badge-emerald">{drivers.length} Drivers</span>
            </div>
            {drivers.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><User style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No drivers registered</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Name</th><th>Availability</th><th>Phone</th><th>License</th><th>Expiry</th><th>Vehicle</th><th>Trips</th><th></th>
                  </tr></thead>
                  <tbody>
                    {drivers.map(d => {
                      const days = daysUntil(d.license_expiry);
                      const urgent = days <= 30;
                      const dTrips = trips.filter(t => t.driver_id === d.id).length;
                      const isEditing = editingId === d.id;
                      return (
                        <tr key={d.id}>
                          <td>
                            {isEditing ? (
                              <input type="text" value={editForm.name ?? d.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="inline-edit-input" autoFocus />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>{d.name}</span>
                            )}
                          </td>
                          <td>
                            {(() => {
                              const locked = onTripIds.has(d.id);
                              const current = effectiveAvailability(d);
                              if (locked) {
                                const st = AVAILABILITY_STYLE['On Trip'];
                                return (
                                  <span title="Auto-set: driver has an ongoing trip" style={{
                                    padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                    background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                                    whiteSpace: 'nowrap',
                                  }}>On Trip</span>
                                );
                              }
                              return (
                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                  {AVAILABILITY_OPTIONS.filter(o => o !== 'On Trip').map(opt => {
                                    const active = current === opt;
                                    const st = AVAILABILITY_STYLE[opt];
                                    return (
                                      <button
                                        key={opt}
                                        onClick={() => onUpdateDriver({ ...d, availability: opt })}
                                        title={`Set ${d.name} to ${opt}`}
                                        style={{
                                          padding: '3px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700,
                                          cursor: 'pointer', whiteSpace: 'nowrap',
                                          fontFamily: 'var(--font-sans)',
                                          background: active ? st.bg : 'transparent',
                                          color: active ? st.color : 'var(--t4)',
                                          border: `1px solid ${active ? st.border : 'var(--border)'}`,
                                          transition: 'all 0.15s',
                                        }}
                                      >{opt}</button>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>
                            {isEditing ? <input type="text" value={editForm.phone ?? d.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="inline-edit-input" /> : d.phone}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>{d.license_no}</td>
                          <td>
                            <span style={{
                              padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              background: days <= 0 ? 'var(--red-dim)' : urgent ? 'var(--amber-dim)' : 'var(--green-dim)',
                              color: days <= 0 ? 'var(--red-light)' : urgent ? 'var(--amber)' : 'var(--green-light)',
                            }}>
                              {days <= 0 ? 'EXPIRED' : d.license_expiry}
                            </span>
                          </td>
                          <td>
                            {isEditing ? (
                              <select value={editForm.assigned_vehicle ?? d.assigned_vehicle ?? ''} onChange={e => setEditForm(f => ({ ...f, assigned_vehicle: e.target.value || undefined }))} className="form-select" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                                <option value="">— None —</option>
                                {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no}</option>)}
                              </select>
                            ) : d.assigned_vehicle ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>
                                <Car style={{ width: 10, height: 10 }} />{d.assigned_vehicle}
                              </span>
                            ) : <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{dTrips}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleSaveEdit(d.id)} className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 8 }}>Save</button>
                                  <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary btn-sm">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(d.id); setEditForm({}); }} className="btn btn-secondary btn-sm btn-icon">✏️</button>
                                  <button onClick={() => { if (confirm(`Delete driver ${d.name}?`)) onDeleteDriver(d.id); }} className="btn btn-danger btn-icon"><Trash2 style={{ width: 12, height: 12 }} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAYOUTS ── */}
      {subTab === 'payouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-body layout-row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Monthly Driver Payout Ledger</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>Bata/salary and advance deductions per driver per month</div>
              </div>
              <div className="layout-row-center" style={{ gap: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Month</label>
                <input type="month" value={payoutMonth} onChange={e => setPayoutMonth(e.target.value)} className="form-input" style={{ width: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)', colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          <div className="card card-accent-top">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Add / Update Payout Entry</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddPayout} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Driver</label>
                  <select value={payoutDriverId} onChange={e => setPayoutDriverId(e.target.value)} required className="form-select">
                    <option value="">Select driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Bata / Salary (₹)</label>
                    <input type="number" value={bata} onChange={e => setBata(e.target.value)} placeholder="0" min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div>
                    <label className="form-label">Advance Deducted (₹)</label>
                    <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="0" min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Note (optional)</label>
                  <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. Festival bonus included" className="form-input" />
                </div>
                <button type="submit" className="btn btn-primary btn-full"><Plus style={{ width: 14, height: 14 }} /> Save Payout Entry</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>
                Payout Sheet — {new Date(payoutMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            {drivers.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><User style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No drivers registered</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Driver</th>
                    <th style={{ textAlign: 'center' }}>Trips</th>
                    <th style={{ textAlign: 'right' }}>Bata (₹)</th>
                    <th style={{ textAlign: 'right' }}>Advance (₹)</th>
                    <th style={{ textAlign: 'right' }}>Net Payout</th>
                    <th>Note</th>
                  </tr></thead>
                  <tbody>
                    {payoutSummaries.map(s => (
                      <tr key={s.driver.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{s.driver.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            {s.driver.assigned_vehicle || '—'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>{s.monthTrips}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-light)' }}>₹{s.bata.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-light)' }}>₹{s.advance.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: s.net >= 0 ? 'var(--gold)' : 'var(--red-light)' }}>
                            {s.net >= 0 ? '' : '−'}₹{Math.abs(s.net).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--t3)' }}>{s.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
