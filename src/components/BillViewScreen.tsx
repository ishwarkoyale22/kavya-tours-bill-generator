/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Printer, FileText, CheckCircle2, TrendingUp, AlertCircle, Car, ChevronDown, ChevronUp, MapPin, Hash } from 'lucide-react';
import { Vehicle, Rate, Trip, Adjustment } from '../types';
import { calculateBill } from '../billingEngine';

interface BillViewScreenProps {
  vehicles: Vehicle[];
  rates: Rate[];
  trips: Trip[];
  adjustments: Adjustment[];
}

export default function BillViewScreen({ vehicles, rates, trips, adjustments }: BillViewScreenProps) {
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  const billSummary = useMemo(() => calculateBill(selectedMonth, vehicles, rates, trips, adjustments), [selectedMonth, vehicles, rates, trips, adjustments]);
  const isApril2026Correct = useMemo(() => selectedMonth === '2026-04' && billSummary.total_bill === 264600 && billSummary.total_payable === 224600, [selectedMonth, billSummary]);

  const formattedMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const toggleVehicle = (no: string) => setExpandedVehicles(prev => { const n = new Set(prev); n.has(no) ? n.delete(no) : n.add(no); return n; });
  const expandAll   = () => setExpandedVehicles(new Set(billSummary.vehicles.map(v => v.vehicle_no)));
  const collapseAll = () => setExpandedVehicles(new Set());

  const typeColors: Record<string, string> = { Sumo: 'badge-indigo', Eeco: 'badge-emerald', TT: 'badge-amber', Indica: 'badge-sky' };

  const vehicleShares = useMemo(() => {
    const total = billSummary.total_payable || 1;
    const colors = ['#f0a500', '#10b981', '#3b82f6', '#f43f5e', '#a855f7'];
    let accumulatedPercentage = 0;
    
    const shares = billSummary.vehicles.map((v, idx) => {
      const payable = v.payable;
      const pct = payable / total;
      const percentage = Math.round(pct * 100);
      
      const dashArray = `${pct * 314.16} 314.16`;
      const dashOffset = -accumulatedPercentage;
      accumulatedPercentage += pct * 314.16;
      
      return {
        vehicle_no: v.vehicle_no,
        payable,
        percentage,
        color: colors[idx % colors.length],
        dashArray,
        dashOffset,
      };
    }).filter(v => v.payable > 0);
    
    return shares;
  }, [billSummary]);

  const vehicleTripDistribution = useMemo(() => {
    const totalTrips = billSummary.total_trips || 1;
    const colors = ['#f0a500', '#10b981', '#3b82f6', '#f43f5e', '#a855f7'];
    return billSummary.vehicles.map((v, idx) => {
      const tripCount = v.locations.reduce((sum, loc) => sum + loc.trip_count, 0);
      return {
        vehicle_no: v.vehicle_no,
        trip_count: tripCount,
        percentage: Math.round((tripCount / totalTrips) * 100),
        color: colors[idx % colors.length],
      };
    }).sort((a, b) => b.trip_count - a.trip_count);
  }, [billSummary]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero Banner ── */}
      <div className="bill-hero no-print">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,165,0,0.45)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                Billing Cycle — Monthly Invoice
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.8px', margin: 0, lineHeight: 1 }}>
                {formattedMonth}
              </h2>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 10.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em' }}>SWITCH MONTH:</label>
                <input id="bill-month-select" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value || '2026-04')}
                  style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, outline: 'none', cursor: 'pointer', colorScheme: 'dark' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <button onClick={() => window.print()} className="btn no-print-button"
                style={{ background: 'rgba(240,165,0,0.13)', border: '1px solid rgba(240,165,0,0.28)', color: 'var(--gold-light)', borderRadius: 12, padding: '11px 22px', fontSize: 13.5, fontWeight: 700, backdropFilter: 'blur(8px)', letterSpacing: '-0.1px' }}>
                <Printer style={{ width: 14, height: 14 }} /> Print Bill Statement
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Expand All ↓', expandAll], ['Collapse All ↑', collapseAll]].map(([label, fn], i) => (
                  <React.Fragment key={String(label)}>
                    {i > 0 && <span style={{ color: 'var(--t4)' }}>·</span>}
                    <button onClick={fn as () => void} style={{ fontSize: 11, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'color 0.15s' }}>{label}</button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Hero KPI Row */}
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Vehicles',    value: billSummary.vehicles.length,    unit: 'fleet',    color: 'var(--gold-light)' },
              { label: 'Total Trips', value: billSummary.total_trips,        unit: 'runs',     color: 'var(--green-light)' },
              { label: 'Gross Bill',  value: `₹${billSummary.total_bill.toLocaleString('en-IN')}`,    unit: '', color: '#fde68a' },
              { label: 'Net Payable', value: `₹${billSummary.total_payable.toLocaleString('en-IN')}`, unit: '', color: 'var(--t1)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '15px 18px' }}>
                <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: s.color, marginTop: 6, letterSpacing: '-0.6px' }}>{s.value}</div>
                {s.unit && <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 3 }}>{s.unit}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ── Visual Analytics Section ── */}
      {billSummary.vehicles.length > 0 && (
        <div className="card visual-analytics-card no-print">
          <div className="card-header">
            <div className="layout-row-center" style={{ gap: 8 }}>
              <TrendingUp style={{ width: 15, height: 15, color: 'var(--gold)' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)', letterSpacing: '-0.2px' }}>
                Visual Fleet Analytics
              </div>
            </div>
            <span className="badge badge-emerald">Interactive Dashboard</span>
          </div>
          <div className="card-body visual-analytics-grid">
            {/* Donut Chart */}
            <div className="analytics-donut-container">
              <div className="analytics-donut-title">Net Payout Share</div>
              
              <svg width="150" height="150" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--border)" strokeWidth="12" />
                {vehicleShares.map((slice) => (
                  <circle
                    key={slice.vehicle_no}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="12"
                    strokeDasharray={slice.dashArray}
                    strokeDashoffset={slice.dashOffset}
                    strokeLinecap={slice.percentage > 0 ? "round" : "butt"}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                ))}
              </svg>
              
              <div className="analytics-donut-legend">
                {vehicleShares.map((slice) => (
                  <div key={slice.vehicle_no} className="analytics-legend-item">
                    <span className="analytics-legend-label">
                      <span className="analytics-legend-color" style={{ background: slice.color }} />
                      {slice.vehicle_no}
                    </span>
                    <span className="analytics-legend-value">
                      ₹{slice.payable.toLocaleString('en-IN')} ({slice.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Trip Progress list */}
            <div className="analytics-progress-container">
              <div className="analytics-progress-title">Trips Load Distribution</div>
              <div className="analytics-progress-list">
                {vehicleTripDistribution.map(item => (
                  <div key={item.vehicle_no} className="analytics-progress-item">
                    <div className="analytics-progress-header">
                      <span className="analytics-progress-label">
                        <span className="analytics-legend-color" style={{ background: item.color }} />
                        {item.vehicle_no}
                      </span>
                      <span className="analytics-progress-val">
                        {item.trip_count} trips ({item.percentage}%)
                      </span>
                    </div>
                    <div className="analytics-progress-track">
                      <div
                        className="analytics-progress-fill"
                        style={{ width: `${item.percentage}%`, background: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Bill ── */}
      <div id="printable-bill" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Letterhead */}
        <div className="card" style={{ padding: '30px 34px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText style={{ width: 20, height: 20, color: 'var(--gold)' }} /> KAVYA TOURS & TRAVELS
              </h1>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 5 }}>Employee Fleet Logistics & Corporate Transit Operations</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>Regd Office: Thane, MH · +91 99999 88888 · billing@kavyatours.com</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-indigo" style={{ fontSize: 11, padding: '5px 14px', marginBottom: 8, display: 'inline-block' }}>Official Vendor Statement</span>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', marginTop: 4 }}>Period: <span style={{ color: 'var(--gold)' }}>{formattedMonth}</span></div>
              <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0, letterSpacing: '-0.2px' }}>Vehicle-Wise Billing Breakdown</h2>
            <span className="badge badge-slate">{billSummary.vehicles.length} vehicles</span>
          </div>

          {billSummary.vehicles.length === 0 ? (
            <div className="card"><div className="card-body"><div className="empty-state">
              <div className="empty-state-icon"><Car style={{ width: 20, height: 20 }} /></div>
              <div className="empty-state-title">No vehicles to display</div>
              <div className="empty-state-sub">No active vehicles for this billing cycle.</div>
            </div></div></div>
          ) : (
            billSummary.vehicles.map(summary => {
              const isExpanded = expandedVehicles.has(summary.vehicle_no);
              const totalVehicleTrips = summary.locations.reduce((s, l) => s + l.trip_count, 0);

              return (
                <div key={summary.vehicle_no} className="vehicle-accordion">
                  {/* Accordion Header */}
                  <div className="vehicle-accordion-header no-print" onClick={() => toggleVehicle(summary.vehicle_no)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'var(--gold-dim)', border: '1px solid rgba(240,165,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-light)' }}>
                        <Car style={{ width: 17, height: 17 }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5, color: 'var(--t1)' }}>{summary.vehicle_no}</span>
                          <span className={`badge ${typeColors[summary.vehicle_type] || 'badge-slate'}`}>{summary.vehicle_type}</span>
                          <span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{summary.vendor_name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                          {summary.phone} · {totalVehicleTrips} trips · {summary.locations.length} routes
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Net Payable</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-0.6px' }}>₹{summary.payable.toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {(isExpanded || true) && (
                    <div className={isExpanded ? '' : 'print-only-content'} style={!isExpanded ? { display: 'none' } : {}}>
                      {/* Print-always vehicle header */}
                      <div className="print-vehicle-header" style={{ display: 'none', padding: '12px 20px', background: 'var(--surface-3)', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>{summary.vehicle_no}</span>
                          <span className={`badge ${typeColors[summary.vehicle_type] || 'badge-slate'}`}>{summary.vehicle_type}</span>
                          <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>Vendor: {summary.vendor_name}</span>
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}>{summary.phone}</div>
                      </div>

                      {/* Locations Table */}
                      {summary.locations.length === 0 ? (
                        <div style={{ padding: '18px 20px', textAlign: 'center', fontSize: 13, color: 'var(--t3)', borderTop: '1px solid var(--border)' }}>
                          No trips registered for this vehicle in this billing month.
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid var(--border)', overflowX: 'auto' }}>
                          <table className="data-table">
                            <thead><tr>
                              <th style={{ paddingLeft: 20 }}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin style={{ width: 10, height: 10 }} />Location Group</span></th>
                              <th style={{ textAlign: 'center' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Hash style={{ width: 10, height: 10 }} />Trips</span></th>
                              <th style={{ textAlign: 'right' }}>Rate</th>
                              <th style={{ textAlign: 'right', paddingRight: 20 }}>Raw Bill</th>
                            </tr></thead>
                            <tbody>
                              {summary.locations.map(loc => (
                                <tr key={loc.location}>
                                  <td style={{ paddingLeft: 20 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: 'var(--t1)', fontSize: 13 }}>
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, display: 'inline-block', boxShadow: '0 0 5px rgba(240,165,0,0.5)' }} />
                                      {loc.location}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>{loc.trip_count}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontSize: 13 }}>₹{loc.rate.toLocaleString('en-IN')}</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--t1)', paddingRight: 20 }}>₹{loc.bill_amt.toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Subtotals */}
                      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-3)', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        {[
                          { label: 'Gross Trips Bill',   value: `₹${summary.subtotal_bill.toLocaleString('en-IN')}`, sub: `${totalVehicleTrips} trips`, color: 'var(--t1)' },
                          { label: 'Advance Deducted',   value: `−₹${summary.advance.toLocaleString('en-IN')}`,      sub: 'Month-end advance',         color: 'var(--red-light)' },
                        ].map(item => (
                          <div key={item.label}>
                            <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontWeight: 700 }}>{item.label}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: item.color, marginTop: 5, letterSpacing: '-0.4px' }}>{item.value}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 3 }}>{item.sub}</div>
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontWeight: 700 }}>Toll & Fines</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 5 }}>
                            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-light)' }}>Toll: +₹{summary.toll.toLocaleString('en-IN')}</span>
                            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-light)' }}>Fine: −₹{summary.fine.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div style={{ borderLeft: '1.5px solid rgba(240,165,0,0.2)', paddingLeft: 16 }}>
                          <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.55)', fontWeight: 700 }}>Net Payable</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--gold)', marginTop: 5, letterSpacing: '-0.6px' }}>₹{summary.payable.toLocaleString('en-IN')}</div>
                          <span className="badge badge-indigo no-print" style={{ marginTop: 6, fontSize: 10 }}>Final Payout</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Grand Summary */}
        <div className="grand-summary-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, position: 'relative', zIndex: 1 }}>
            <TrendingUp style={{ width: 17, height: 17, color: 'var(--gold)' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, color: 'var(--t1)', margin: 0, letterSpacing: '-0.2px' }}>Consolidated Grand Billing Summary</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, position: 'relative', zIndex: 1 }}>
            {[
              { label: 'Active Vehicles', value: `${billSummary.vehicles.length}`, unit: 'fleet',     color: 'var(--t1)' },
              { label: 'Total Trips',     value: `${billSummary.total_trips}`,      unit: 'runs',      color: 'var(--t1)' },
              { label: 'Gross Bill',      value: `₹${billSummary.total_bill.toLocaleString('en-IN')}`, unit: '', color: '#fde68a' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: s.color, marginTop: 5, letterSpacing: '-0.5px' }}>{s.value}</div>
                {s.unit && <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 3 }}>{s.unit}</div>}
              </div>
            ))}
            {/* Adjustments */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 7 }}>Adjustments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--red-light)' }}>Adv: −₹{billSummary.total_advance.toLocaleString('en-IN')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--green-light)' }}>Toll: +₹{billSummary.total_toll.toLocaleString('en-IN')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--red-light)' }}>Fine: −₹{billSummary.total_fine.toLocaleString('en-IN')}</span>
              </div>
            </div>
            {/* Grand Total */}
            <div style={{ background: 'linear-gradient(135deg, rgba(240,165,0,0.22), rgba(200,125,0,0.18))', border: '1px solid rgba(240,165,0,0.3)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 20px rgba(240,165,0,0.12)' }}>
              <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Grand Net Payable</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 900, color: '#fff', marginTop: 5, letterSpacing: '-0.8px' }}>₹{billSummary.total_payable.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 9.5, color: 'rgba(240,165,0,0.55)', fontFamily: 'var(--font-mono)', marginTop: 5, letterSpacing: '0.06em' }}>✓ VERIFIED SUMMARY</div>
            </div>
          </div>
        </div>

        {/* Signature Block */}
        <div className="card" style={{ padding: '28px 34px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, textAlign: 'center' }}>
            {[['Authorized Signature', 'For Kavya Tours & Travels'], ['Verified Auditor Sign', 'Client Transport Desk']].map(([title, sub]) => (
              <div key={title}>
                <div style={{ height: 52, borderBottom: '1.5px solid var(--border-2)', marginBottom: 12 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)', marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)', letterSpacing: '0.02em' }}>
            Auto-calculated from logged fleet trips · Kavya Tours Invoice Ledger System · Page 1 of 1
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .vehicle-accordion > div:last-child { display: block !important; }
          .print-vehicle-header { display: flex !important; }
          .print-only-content { display: block !important; }
          .bill-hero { display: none !important; }
          .grand-summary-card { background: white !important; color: black !important; border: 2px solid #333 !important; }
          .grand-summary-card * { color: black !important; }
        }
      `}</style>
    </div>
  );
}
