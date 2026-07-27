/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Coins, ShieldAlert, HelpCircle, BarChart3, Check } from 'lucide-react';
import { Vehicle, Rate, Adjustment, Client } from '../types';

interface Props {
  vehicles: Vehicle[];
  rates: Rate[];
  adjustments: Adjustment[];
  clients: Client[];
  onAddRate: (rate: Rate) => void;
  onUpdateRate: (vehicleNo: string, location: string, rateValue: number) => void;
  onDeleteRate: (vehicleNo: string, location: string) => void;
  onUpdateAdjustment: (adjustment: Omit<Adjustment, 'id'>) => void;
}

type SubTab = 'rates' | 'surcharges' | 'adjustments';

const TRIP_TYPES = ['', 'Local', 'Outstation', 'Airport', 'Rental'];

export default function RateManagerScreen({
  vehicles, rates, adjustments, clients,
  onAddRate, onUpdateRate, onDeleteRate, onUpdateAdjustment,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>('rates');
  const [rateVehNo, setRateVehNo] = useState(() => vehicles[0]?.vehicle_no || '');
  const [rateLocation, setRateLocation] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [rateTripType, setRateTripType] = useState('');
  const [rateClientId, setRateClientId] = useState('');
  const [rateValidFrom, setRateValidFrom] = useState('');
  const [rateValidTo, setRateValidTo] = useState('');
  const [adjMonth, setAdjMonth] = useState('2026-04');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number>(0);

  // Surcharge editing
  const [editingSurchargeKey, setEditingSurchargeKey] = useState<string | null>(null);
  const [surchargeForm, setSurchargeForm] = useState<Partial<Rate>>({});

  const [filterVeh, setFilterVeh] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const handleAddRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateVehNo || !rateLocation.trim() || !rateValue) return;
    onAddRate({
      vehicle_no: rateVehNo, location: rateLocation.trim(), rate: Number(rateValue) || 0,
      trip_type: rateTripType || undefined,
      client_id: rateClientId || undefined,
      valid_from: rateValidFrom || undefined,
      valid_to: rateValidTo || undefined,
    });
    setRateLocation(''); setRateValue(''); setRateTripType(''); setRateClientId('');
    setRateValidFrom(''); setRateValidTo('');
  };

  const todayStr = new Date().toISOString().slice(0, 10);

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

  const uniqueLocations = useMemo(() => new Set(rates.map(r => r.location)).size, [rates]);
  const avgRate = useMemo(() => rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r.rate, 0) / rates.length) : 0, [rates]);

  const filteredRates = useMemo(() => {
    return rates.filter(r => {
      if (filterVeh && r.vehicle_no !== filterVeh) return false;
      if (filterType && r.trip_type !== filterType) return false;
      if (filterClient && r.client_id !== filterClient) return false;
      return true;
    });
  }, [rates, filterVeh, filterType, filterClient]);

  const handleSaveSurcharge = (key: string) => {
    const rate = rates.find(r => `${r.vehicle_no}::${r.location}` === key);
    if (!rate) return;
    onAddRate({ ...rate, ...surchargeForm });
    setEditingSurchargeKey(null); setSurchargeForm({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: 'Vehicles',        value: vehicles.length,                          sub: 'fleet units' },
          { cls: 'emerald', label: 'Rate Configs',     value: rates.length,                             sub: 'vehicle-location pairs' },
          { cls: 'sky',     label: 'Locations',        value: uniqueLocations,                          sub: 'unique destinations' },
          { cls: 'amber',   label: 'Average Rate',     value: `₹${avgRate.toLocaleString('en-IN')}`,   sub: 'per trip avg' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="pill-tabs no-print">
        {([['rates', 'Location Rates', <Coins style={{ width: 13, height: 13 }} />], ['surcharges', 'Surcharges', <BarChart3 style={{ width: 13, height: 13 }} />], ['adjustments', 'Month Adjustments', <ShieldAlert style={{ width: 13, height: 13 }} />]] as const).map(([id, label, icon]) => (
          <button key={id} className={`pill-tab ${subTab === id ? 'active' : ''}`} onClick={() => setSubTab(id)}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── RATES ── */}
      {subTab === 'rates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <BarChart3 style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Configure Location Rate</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>Set per-trip rates for vehicle-location pairs</div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddRate}>
                <div className="grid-2-columns" style={{ marginBottom: 12 }}>
                  <div>
                    <label className="form-label">Vehicle</label>
                    <select value={rateVehNo} onChange={e => setRateVehNo(e.target.value)} required className="form-select">
                      <option value="" disabled>Select vehicle</option>
                      {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no} ({v.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Trip Type</label>
                    <select value={rateTripType} onChange={e => setRateTripType(e.target.value)} className="form-select">
                      <option value="">All types</option>
                      {['Local', 'Outstation', 'Airport', 'Rental'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2-columns" style={{ marginBottom: 12 }}>
                  <div>
                    <label className="form-label">Valid From <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 9 }}>(optional — seasonal pricing)</span></label>
                    <input type="date" value={rateValidFrom} onChange={e => setRateValidFrom(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="form-label">Valid To <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 9 }}>(leave blank = permanent)</span></label>
                    <input type="date" value={rateValidTo} onChange={e => setRateValidTo(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div className="grid-3-columns">
                  <div>
                    <label className="form-label">Location</label>
                    <input type="text" value={rateLocation} onChange={e => setRateLocation(e.target.value)} placeholder="e.g. Thane, Vashi" required className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Client Contract <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 9 }}>(optional)</span></label>
                    <select value={rateClientId} onChange={e => setRateClientId(e.target.value)} className="form-select">
                      <option value="">— Standard rate —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="layout-row-center" style={{ alignItems: 'flex-end', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Rate (₹/trip)</label>
                      <input type="number" value={rateValue} onChange={e => setRateValue(e.target.value)} placeholder="e.g. 1500" required min="0" className="form-input" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: 44, flexShrink: 0 }}>
                      <Plus style={{ width: 14, height: 14 }} />Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select value={filterVeh} onChange={e => setFilterVeh(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 160, padding: '8px 12px', fontSize: 12 }}>
              <option value="">All Vehicles</option>
              {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 130, padding: '8px 12px', fontSize: 12 }}>
              <option value="">All Types</option>
              {['Local', 'Outstation', 'Airport', 'Rental'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="form-select" style={{ width: 'auto', minWidth: 150, padding: '8px 12px', fontSize: 12 }}>
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Active Location Rates</span>
              <span className="badge badge-indigo">{filteredRates.length} Rates</span>
            </div>
            {filteredRates.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Coins style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No rates configured</div>
                <div className="empty-state-sub">Add a rate above to begin linking trips to pricing.</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Vehicle</th><th>Location</th><th>Type</th><th>Client</th><th>Validity</th>
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredRates.map(rate => {
                      const key = `${rate.vehicle_no}-${rate.location}`;
                      const isEditing = editingKey === key;
                      const vehicle = vehicles.find(v => v.vehicle_no === rate.vehicle_no);
                      const client = clients.find(c => c.id === rate.client_id);
                      const typeColors: Record<string, string> = { Sumo: 'badge-indigo', Eeco: 'badge-emerald', TT: 'badge-amber', Indica: 'badge-sky' };
                      return (
                        <tr key={`${rate.vehicle_no}-${rate.location}-${rate.trip_type}-${rate.client_id}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{rate.vehicle_no}</span>
                              <span className={`badge ${typeColors[vehicle?.type || ''] || 'badge-slate'}`}>{vehicle?.type || '—'}</span>
                            </div>
                          </td>
                          <td><span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{rate.location}</span></td>
                          <td>{rate.trip_type ? <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{rate.trip_type}</span> : <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>}</td>
                          <td><span style={{ fontSize: 12, color: 'var(--t3)' }}>{client?.name || '—'}</span></td>
                          <td>
                            {!rate.valid_from && !rate.valid_to ? (
                              <span style={{ color: 'var(--t4)', fontSize: 11.5 }}>Permanent</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  <span className="badge badge-amber" style={{ fontSize: 9 }}>Seasonal</span>
                                  {rate.valid_to && rate.valid_to < todayStr && (
                                    <span className="badge badge-red" style={{ fontSize: 9 }}>Expired</span>
                                  )}
                                </div>
                                <span style={{ fontSize: 10.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                                  {rate.valid_from || '…'} → {rate.valid_to || '…'}
                                </span>
                              </div>
                            )}
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
                                <button onClick={() => { setEditingKey(key); setEditingValue(rate.rate); }} className="btn btn-secondary btn-sm btn-icon" title="Edit"><Edit2 style={{ width: 12, height: 12 }} /></button>
                              )}
                              <button onClick={() => onDeleteRate(rate.vehicle_no, rate.location)} className="btn btn-danger btn-icon" title="Delete"><Trash2 style={{ width: 13, height: 13 }} /></button>
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

      {/* ── SURCHARGES ── */}
      {subTab === 'surcharges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="info-banner">
            <BarChart3 style={{ width: 17, height: 17, color: '#93c5fd', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--t1)', marginBottom: 4 }}>Surcharge Configuration</div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.7 }}>
                Set per-rate surcharges applied on top of the base rate. These are informational and reflected in invoice calculations.
              </div>
              <code style={{ display: 'block', marginTop: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold-pale)', width: 'fit-content' }}>
                Final = Base + Night% + Festival% + Toll(flat) + Waiting×Hrs
              </code>
            </div>
          </div>

          {rates.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state">
                <div className="empty-state-icon"><Coins style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No rates configured yet</div>
                <div className="empty-state-sub">Add location rates first, then configure surcharges here.</div>
              </div>
            </div></div>
          ) : (
            <div className="card">
              <div className="card-header">
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Rate Surcharge Editor</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Vehicle / Location</th>
                    <th style={{ textAlign: 'right' }}>Night%</th>
                    <th style={{ textAlign: 'right' }}>Toll (₹)</th>
                    <th style={{ textAlign: 'right' }}>Festival%</th>
                    <th style={{ textAlign: 'right' }}>Waiting ₹/hr</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {rates.map(rate => {
                      const key = `${rate.vehicle_no}::${rate.location}`;
                      const isEditing = editingSurchargeKey === key;
                      return (
                        <tr key={key}>
                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--t1)' }}>{rate.vehicle_no}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 2 }}>{rate.location}</div>
                          </td>
                          {isEditing ? (
                            <>
                              {(['night_charge_pct', 'toll_flat', 'festival_surge_pct', 'waiting_charge_per_hr'] as const).map(field => (
                                <td key={field} style={{ textAlign: 'right' }}>
                                  <input type="number" value={(surchargeForm[field] ?? rate[field] ?? 0) as number}
                                    onChange={e => setSurchargeForm(f => ({ ...f, [field]: Number(e.target.value) || 0 }))}
                                    className="inline-edit-input" style={{ width: 70 }} />
                                </td>
                              ))}
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => handleSaveSurcharge(key)} className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 8 }}><Check style={{ width: 12, height: 12 }} /> Save</button>
                                  <button onClick={() => { setEditingSurchargeKey(null); setSurchargeForm({}); }} className="btn btn-secondary btn-sm">Cancel</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: rate.night_charge_pct ? 'var(--amber)' : 'var(--t4)' }}>{rate.night_charge_pct ? `${rate.night_charge_pct}%` : '—'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: rate.toll_flat ? 'var(--t1)' : 'var(--t4)' }}>{rate.toll_flat ? `₹${rate.toll_flat}` : '—'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: rate.festival_surge_pct ? 'var(--gold)' : 'var(--t4)' }}>{rate.festival_surge_pct ? `${rate.festival_surge_pct}%` : '—'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: rate.waiting_charge_per_hr ? 'var(--t1)' : 'var(--t4)' }}>{rate.waiting_charge_per_hr ? `₹${rate.waiting_charge_per_hr}` : '—'}</td>
                              <td>
                                <button onClick={() => { setEditingSurchargeKey(key); setSurchargeForm({}); }} className="btn btn-secondary btn-sm btn-icon" title="Edit surcharges"><Edit2 style={{ width: 12, height: 12 }} /></button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                <label className="form-label" style={{ margin: 0 }}>Target Month</label>
                <input type="month" value={adjMonth} onChange={e => setAdjMonth(e.target.value || '2026-04')} className="form-input" style={{ width: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)', colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>
                Adjustment Sheet — {new Date(adjMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <div className="layout-row-center" style={{ gap: 6 }}>
                <span className="badge badge-amber" style={{ fontSize: 9.5 }}>Advance = Deduct</span>
                <span className="badge badge-emerald" style={{ fontSize: 9.5 }}>Toll = Add</span>
                <span className="badge badge-red" style={{ fontSize: 9.5 }}>Fine = Deduct</span>
              </div>
            </div>
            {vehicles.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><ShieldAlert style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No vehicles registered</div>
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
