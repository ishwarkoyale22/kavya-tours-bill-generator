/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Coins, Car, MapPin, Check, ShieldAlert, Phone, HelpCircle, BarChart3 } from 'lucide-react';
import { Vehicle, Rate, Adjustment } from '../types';

interface RateManagerScreenProps {
  vehicles: Vehicle[];
  rates: Rate[];
  adjustments: Adjustment[];
  onAddVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleNo: string) => void;
  onAddRate: (rate: Rate) => void;
  onUpdateRate: (vehicleNo: string, location: string, rateValue: number) => void;
  onDeleteRate: (vehicleNo: string, location: string) => void;
  onUpdateAdjustment: (adjustment: Omit<Adjustment, 'id'>) => void;
}

export default function RateManagerScreen({
  vehicles, rates, adjustments,
  onAddVehicle, onDeleteVehicle, onAddRate, onUpdateRate, onDeleteRate, onUpdateAdjustment,
}: RateManagerScreenProps) {
  const [subTab, setSubTab] = useState<'rates' | 'vehicles' | 'adjustments'>('rates');
  const [newVehNo, setNewVehNo] = useState('');
  const [newVehType, setNewVehType] = useState('Sumo');
  const [newVendor, setNewVendor] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [rateVehNo, setRateVehNo] = useState(() => vehicles[0]?.vehicle_no || '');
  const [rateLocation, setRateLocation] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [adjMonth, setAdjMonth] = useState('2026-04');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number>(0);

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehNo.trim() || !newVendor.trim()) return;
    onAddVehicle({ vehicle_no: newVehNo.trim().toUpperCase(), type: newVehType, vendor_name: newVendor.trim(), phone: newPhone.trim() || 'N/A' });
    setNewVehNo(''); setNewVendor(''); setNewPhone('');
  };

  const handleAddRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateVehNo || !rateLocation.trim() || !rateValue) return;
    onAddRate({ vehicle_no: rateVehNo, location: rateLocation.trim(), rate: Number(rateValue) || 0 });
    setRateLocation(''); setRateValue('');
  };

  const monthlyAdjustmentsMap = useMemo(() => {
    const map: { [k: string]: { fine: number; toll: number; advance: number } } = {};
    for (const v of vehicles) map[v.vehicle_no] = { fine: 0, toll: 0, advance: 0 };
    for (const adj of adjustments) { if (adj.month === adjMonth) map[adj.vehicle_no] = { fine: adj.fine, toll: adj.toll, advance: adj.advance }; }
    return map;
  }, [vehicles, adjustments, adjMonth]);

  const handleAdjChange = (vehNo: string, field: 'fine' | 'toll' | 'advance', value: number) => {
    const c = monthlyAdjustmentsMap[vehNo] || { fine: 0, toll: 0, advance: 0 };
    onUpdateAdjustment({ month: adjMonth, vehicle_no: vehNo, location: null, fine: field === 'fine' ? value : c.fine, toll: field === 'toll' ? value : c.toll, advance: field === 'advance' ? value : c.advance });
  };

  const typeColors: Record<string, string> = { Sumo: 'badge-indigo', Eeco: 'badge-emerald', TT: 'badge-amber', Indica: 'badge-sky' };
  const uniqueLocations = useMemo(() => new Set(rates.map(r => r.location)).size, [rates]);
  const avgRate = useMemo(() => rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r.rate, 0) / rates.length) : 0, [rates]);

  const cardTitle = (title: string, icon: React.ReactNode) => (
    <div className="layout-row-center" style={{ gap: 8 }}>
      {icon}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', letterSpacing: '-0.2px' }}>{title}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: 'Vehicles',          value: vehicles.length,                        sub: 'fleet units' },
          { cls: 'emerald', label: 'Rate Configs',       value: rates.length,                           sub: 'vehicle-location pairs' },
          { cls: 'sky',     label: 'Locations',          value: uniqueLocations,                        sub: 'unique destinations' },
          { cls: 'amber',   label: 'Average Rate',       value: `₹${avgRate.toLocaleString('en-IN')}`, sub: 'per trip avg' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub-Tab Nav */}
      <div className="pill-tabs no-print">
        {[
          { id: 'rates'       as const, label: 'Location Rates',    icon: <Coins style={{ width: 14, height: 14 }} /> },
          { id: 'vehicles'    as const, label: 'Fleet Vehicles',    icon: <Car style={{ width: 14, height: 14 }} /> },
          { id: 'adjustments' as const, label: 'Month Adjustments', icon: <ShieldAlert style={{ width: 14, height: 14 }} /> },
        ].map(tab => (
          <button key={tab.id} className={`pill-tab ${subTab === tab.id ? 'active' : ''}`} onClick={() => setSubTab(tab.id)}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── RATES ── */}
      {subTab === 'rates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-accent-top">
            <div className="card-header">
              {cardTitle('Configure Location Rate', <BarChart3 style={{ width: 15, height: 15, color: 'var(--gold)' }} />)}
              <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>Set per-trip rates for vehicle-location pairs</div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddRate}>
                <div className="grid-3-columns">
                  <div>
                    <label className="form-label">Vehicle</label>
                    <select id="rate-vehicle" value={rateVehNo} onChange={e => setRateVehNo(e.target.value)} required className="form-select">
                      <option value="" disabled>Select vehicle</option>
                      {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Location</label>
                    <input id="rate-loc" type="text" value={rateLocation} onChange={e => setRateLocation(e.target.value)} placeholder="e.g. Thane, Vashi" required className="form-input" />
                  </div>
                  <div className="layout-row-center" style={{ alignItems: 'flex-end', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Rate (₹/trip)</label>
                      <input id="rate-val" type="number" value={rateValue} onChange={e => setRateValue(e.target.value)} placeholder="e.g. 1500" required min="0" className="form-input" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: 44, flexShrink: 0 }}>
                      <Plus style={{ width: 14, height: 14 }} />Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Active Location Rates</div>
              <span className="badge badge-indigo">{rates.length} Rates</span>
            </div>
            {rates.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Coins style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No rates configured</div>
                <div className="empty-state-sub">Add a rate above to begin linking trips to pricing.</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Vehicle</th><th>Location</th>
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {rates.map(rate => {
                      const isEditing = editingKey === `${rate.vehicle_no}-${rate.location}`;
                      const vehicle = vehicles.find(v => v.vehicle_no === rate.vehicle_no);
                      return (
                        <tr key={`${rate.vehicle_no}-${rate.location}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{rate.vehicle_no}</span>
                              <span className={`badge ${typeColors[vehicle?.type || ''] || 'badge-slate'}`}>{vehicle?.type || '—'}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t2)', fontWeight: 500, fontSize: 13 }}>
                              <MapPin style={{ width: 11, height: 11, color: 'var(--gold)', flexShrink: 0 }} />{rate.location}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <input type="number" value={editingValue} onChange={e => setEditingValue(Number(e.target.value) || 0)} className="inline-edit-input" autoFocus />
                            ) : (
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14.5, color: 'var(--t1)' }}>₹{rate.rate.toLocaleString('en-IN')}</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              {isEditing ? (
                                <button onClick={() => { onUpdateRate(rate.vehicle_no, rate.location, Number(editingValue) || 0); setEditingKey(null); }}
                                  className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 8 }}>
                                  <Check style={{ width: 12, height: 12 }} /> Save
                                </button>
                              ) : (
                                <button onClick={() => { setEditingKey(`${rate.vehicle_no}-${rate.location}`); setEditingValue(rate.rate); }}
                                  className="btn btn-secondary btn-sm btn-icon" title="Edit">
                                  <Edit2 style={{ width: 12, height: 12 }} />
                                </button>
                              )}
                              <button onClick={() => onDeleteRate(rate.vehicle_no, rate.location)} className="btn btn-danger btn-icon" title="Delete">
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
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

      {/* ── VEHICLES ── */}
      {subTab === 'vehicles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-accent-top">
            <div className="card-header">
              {cardTitle('Register New Vehicle', <Car style={{ width: 15, height: 15, color: 'var(--gold)' }} />)}
              <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>Add a vehicle to the fleet registry</div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Vehicle No.</label>
                    <input id="veh-no" type="text" value={newVehNo} onChange={e => setNewVehNo(e.target.value)} placeholder="e.g. MH01-7703" required className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="form-label">Vehicle Type</label>
                    <select id="veh-type" value={newVehType} onChange={e => setNewVehType(e.target.value)} required className="form-select">
                      <option value="Sumo">Sumo (TATA)</option>
                      <option value="Eeco">Eeco (Maruti)</option>
                      <option value="TT">Tempo Traveller (TT)</option>
                      <option value="Indica">Indica (TATA)</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Vendor / Owner Name</label>
                    <input id="vendor" type="text" value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder="e.g. Ramesh Patel" required className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input id="phone" type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="e.g. +91 98765 43210" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 2 }}>
                  <Plus style={{ width: 14, height: 14 }} /> Register Vehicle
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Registered Fleet</div>
              <span className="badge badge-emerald">{vehicles.length} Vehicles</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Vehicle No.</th><th>Type</th><th>Vendor Name</th><th>Contact</th><th style={{ textAlign: 'right' }}>Remove</th>
                </tr></thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.vehicle_no}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{v.vehicle_no}</span></td>
                      <td><span className={`badge ${typeColors[v.type] || 'badge-slate'}`}>{v.type}</span></td>
                      <td style={{ fontWeight: 500, color: 'var(--t2)', fontSize: 13 }}>{v.vendor_name}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t3)' }}>
                          <Phone style={{ width: 10, height: 10 }} />{v.phone}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => { if (confirm(`Delete vehicle ${v.vehicle_no}? This will also delete all its rates and trips!`)) onDeleteVehicle(v.vehicle_no); }}
                          className="btn btn-danger btn-icon" title="Delete">
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ADJUSTMENTS ── */}
      {subTab === 'adjustments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-body layout-row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div className="layout-row-center" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', gap: 8 }}>
                  <ShieldAlert style={{ width: 16, height: 16, color: 'var(--gold)' }} /> Month-End Adjustments
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Set advance payments, toll receipts, and fine deductions per vehicle.</div>
              </div>
              <div className="layout-row-center" style={{ gap: 10 }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Target Month</label>
                <input id="adj-month-select" type="month" value={adjMonth} onChange={e => setAdjMonth(e.target.value || '2026-04')} className="form-input" style={{ width: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)', colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>
                Adjustment Sheet — {new Date(adjMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </div>
              <div className="layout-row-center" style={{ gap: 6 }}>
                <span className="badge badge-amber" style={{ fontSize: 9.5 }}>Advance = Deduct</span>
                <span className="badge badge-emerald" style={{ fontSize: 9.5 }}>Toll = Add</span>
                <span className="badge badge-red" style={{ fontSize: 9.5 }}>Fine = Deduct</span>
              </div>
            </div>
            {vehicles.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Car style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No vehicles registered</div>
                <div className="empty-state-sub">Register a vehicle first to configure adjustments.</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Vehicle</th>
                    <th style={{ textAlign: 'right' }}><span style={{ color: '#fbbf24' }}>Advance Paid (₹)</span></th>
                    <th style={{ textAlign: 'right' }}><span style={{ color: 'var(--green-light)' }}>Toll Added (₹)</span></th>
                    <th style={{ textAlign: 'right' }}><span style={{ color: 'var(--red-light)' }}>Fine Deducted (₹)</span></th>
                    <th style={{ textAlign: 'right' }}>Net Factor</th>
                  </tr></thead>
                  <tbody>
                    {vehicles.map(v => {
                      const adj = monthlyAdjustmentsMap[v.vehicle_no] || { fine: 0, toll: 0, advance: 0 };
                      const net = adj.toll - adj.advance - adj.fine;
                      return (
                        <tr key={v.vehicle_no}>
                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{v.vehicle_no}</div>
                            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{v.vendor_name}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input type="number" value={adj.advance === 0 ? '' : adj.advance} onChange={e => handleAdjChange(v.vehicle_no, 'advance', Math.max(0, Number(e.target.value) || 0))}
                              placeholder="0" className="form-input adj-input-advance" style={{ width: 110, textAlign: 'right', fontFamily: 'var(--font-mono)', display: 'inline-block' }} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input type="number" value={adj.toll === 0 ? '' : adj.toll} onChange={e => handleAdjChange(v.vehicle_no, 'toll', Math.max(0, Number(e.target.value) || 0))}
                              placeholder="0" className="form-input adj-input-toll" style={{ width: 110, textAlign: 'right', fontFamily: 'var(--font-mono)', display: 'inline-block' }} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input type="number" value={adj.fine === 0 ? '' : adj.fine} onChange={e => handleAdjChange(v.vehicle_no, 'fine', Math.max(0, Number(e.target.value) || 0))}
                              placeholder="0" className="form-input adj-input-fine" style={{ width: 110, textAlign: 'right', fontFamily: 'var(--font-mono)', display: 'inline-block' }} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14.5, color: net >= 0 ? 'var(--green-light)' : 'var(--red-light)' }}>
                              {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Formula banner */}
          <div className="info-banner">
            <HelpCircle style={{ width: 17, height: 17, color: '#93c5fd', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--t1)', marginBottom: 6 }}>Invoice Adjustment Formula</div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.7 }}>Advances and fines are deducted from the gross trip bill; toll receipts are reimbursed to the vendor.</div>
              <code style={{ display: 'block', marginTop: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold-pale)', width: 'fit-content' }}>
                Net Vendor Payout = Gross Trip Bill − Advance + Toll − Fine
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
