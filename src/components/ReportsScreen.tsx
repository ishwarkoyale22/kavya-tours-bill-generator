/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Download, Printer, BarChart3, Car, FileText, Users } from 'lucide-react';
import { Vehicle, Trip, Rate, Adjustment, Invoice, Payment, MaintenanceLog, Driver, DriverPayout, Client } from '../types';
import { calculateBill } from '../billingEngine';

interface Props {
  vehicles: Vehicle[];
  trips: Trip[];
  rates: Rate[];
  adjustments: Adjustment[];
  invoices: Invoice[];
  payments: Payment[];
  maintenanceLogs: MaintenanceLog[];
  drivers: Driver[];
  driverPayouts: DriverPayout[];
  clients: Client[];
}

type ReportTab = 'gst' | 'vehicle' | 'driver' | 'export';

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: string[][]): string {
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function getQuarter(month: string): string {
  const m = parseInt(month.split('-')[1]);
  const q = Math.ceil(m / 3);
  return `Q${q} ${month.split('-')[0]}`;
}

export default function ReportsScreen({ vehicles, trips, rates, adjustments, invoices, payments, maintenanceLogs, drivers, driverPayouts, clients }: Props) {
  const [tab, setTab] = useState<ReportTab>('gst');
  const [gstYear, setGstYear] = useState(() => new Date().getFullYear().toString());

  // GST Quarterly Summary
  const gstQuarterly = useMemo(() => {
    const byQuarter: Record<string, { quarter: string; invoices: Invoice[]; base: number; gst: number; total: number }> = {};
    for (const inv of invoices) {
      const q = getQuarter(inv.date.slice(0, 7));
      if (!byQuarter[q]) byQuarter[q] = { quarter: q, invoices: [], base: 0, gst: 0, total: 0 };
      const gstRate = inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct;
      const gst = inv.amount * gstRate / 100;
      byQuarter[q].invoices.push(inv);
      byQuarter[q].base += inv.amount;
      byQuarter[q].gst += gst;
      byQuarter[q].total += inv.amount + gst;
    }
    return Object.values(byQuarter).sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [invoices]);

  // Vehicle P&L
  const vehiclePL = useMemo(() => {
    return vehicles.map(v => {
      const vTrips = trips.filter(t => t.vehicle_no === v.vehicle_no);
      const months = [...new Set(vTrips.map(t => t.date.slice(0, 7)))];
      let revenue = 0;
      for (const month of months) {
        const s = calculateBill(month, [v], rates.filter(r => r.vehicle_no === v.vehicle_no), vTrips, adjustments.filter(a => a.vehicle_no === v.vehicle_no));
        revenue += s.total_bill;
      }
      const expenses = maintenanceLogs.filter(m => m.vehicle_no === v.vehicle_no).reduce((s, m) => s + m.cost, 0);
      return { vehicle_no: v.vehicle_no, type: v.type, tripCount: vTrips.length, revenue, expenses, profit: revenue - expenses };
    });
  }, [vehicles, trips, rates, adjustments, maintenanceLogs]);

  // Driver Payout Summary
  const driverSummary = useMemo(() => {
    return drivers.map(d => {
      const dTrips = trips.filter(t => t.driver_id === d.id).length;
      const totalBata = driverPayouts.filter(p => p.driver_id === d.id).reduce((s, p) => s + p.bata, 0);
      const totalAdv = driverPayouts.filter(p => p.driver_id === d.id).reduce((s, p) => s + p.advance, 0);
      return { driver: d, trips: dTrips, totalBata, totalAdv, net: totalBata - totalAdv };
    });
  }, [drivers, trips, driverPayouts]);

  const totalGSTCollected = useMemo(() => gstQuarterly.reduce((s, q) => s + q.gst, 0), [gstQuarterly]);

  const exportTripsCSV = () => {
    const rows = [['ID', 'Date', 'Time', 'Vehicle', 'Pickup', 'Drop', 'Client', 'Trip Type', 'KM', 'Status', 'Emp Count']];
    for (const t of trips) {
      rows.push([t.id, t.date, t.time || '', t.vehicle_no, t.location, t.drop_location || '', t.client_name || '', t.trip_type || '', String(t.km || ''), t.status, String(t.emp_count)]);
    }
    downloadCSV(toCSV(rows), 'kavya_tours_trips.csv');
  };

  const exportInvoicesCSV = () => {
    const rows = [['Invoice No', 'Date', 'Client', 'Vehicle', 'Base Amount', 'GST Amount', 'Total', 'Status', 'Interstate']];
    for (const inv of invoices) {
      const gst = inv.amount * (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100;
      rows.push([inv.invoice_no, inv.date, inv.client_name, inv.vehicle_no, String(inv.amount), String(Math.round(gst)), String(Math.round(inv.amount + gst)), inv.status, inv.is_interstate ? 'Yes' : 'No']);
    }
    downloadCSV(toCSV(rows), 'kavya_tours_invoices.csv');
  };

  const exportDriverPayoutsCSV = () => {
    const rows = [['Driver', 'Month', 'Bata', 'Advance', 'Net', 'Note']];
    for (const p of driverPayouts) {
      const d = drivers.find(x => x.id === p.driver_id);
      rows.push([d?.name || p.driver_id, p.month, String(p.bata), String(p.advance), String(p.bata - p.advance), p.note || '']);
    }
    downloadCSV(toCSV(rows), 'kavya_tours_driver_payouts.csv');
  };

  const exportVehiclePLCSV = () => {
    const rows = [['Vehicle No', 'Type', 'Trips', 'Revenue', 'Expenses', 'Net P&L']];
    for (const v of vehiclePL) {
      rows.push([v.vehicle_no, v.type, String(v.tripCount), String(v.revenue), String(v.expenses), String(v.profit)]);
    }
    downloadCSV(toCSV(rows), 'kavya_tours_vehicle_pl.csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: 'Total Invoices',     value: invoices.length,                                 sub: 'all time' },
          { cls: 'emerald', label: 'GST Collected',      value: `₹${Math.round(totalGSTCollected).toLocaleString('en-IN')}`, sub: 'all time' },
          { cls: 'amber',   label: 'Total Revenue',      value: `₹${vehiclePL.reduce((s,v) => s+v.revenue,0).toLocaleString('en-IN')}`, sub: 'gross billing' },
          { cls: 'sky',     label: 'Total Expenses',     value: `₹${vehiclePL.reduce((s,v) => s+v.expenses,0).toLocaleString('en-IN')}`, sub: 'maintenance' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="pill-tabs">
        {([['gst', 'GST Summary', <FileText style={{ width: 13, height: 13 }} />], ['vehicle', 'Vehicle P&L', <Car style={{ width: 13, height: 13 }} />], ['driver', 'Driver Payouts', <Users style={{ width: 13, height: 13 }} />], ['export', 'CSV Export', <Download style={{ width: 13, height: 13 }} />]] as const).map(([id, label, icon]) => (
          <button key={id} className={`pill-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── GST ── */}
      {tab === 'gst' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <BarChart3 style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>GST Quarterly Summary</span>
              </div>
              <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                <Printer style={{ width: 12, height: 12 }} /> Print
              </button>
            </div>
            {gstQuarterly.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><FileText style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No invoices to report</div>
                <div className="empty-state-sub">Create GST invoices from the Billing screen to generate reports.</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Quarter</th>
                    <th style={{ textAlign: 'center' }}>Invoices</th>
                    <th style={{ textAlign: 'right' }}>Base Amount</th>
                    <th style={{ textAlign: 'right' }}>GST Amount</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr></thead>
                  <tbody>
                    {gstQuarterly.map(q => (
                      <tr key={q.quarter}>
                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--t1)' }}>{q.quarter}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{q.invoices.length}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--t1)' }}>₹{Math.round(q.base).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)' }}>₹{Math.round(q.gst).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--gold)' }}>₹{Math.round(q.total).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-3)' }}>
                      <td style={{ fontWeight: 700, color: 'var(--t1)' }}>Total</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--t1)' }}>{invoices.length}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--t1)' }}>₹{Math.round(gstQuarterly.reduce((s,q) => s+q.base,0)).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--amber)' }}>₹{Math.round(totalGSTCollected).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--gold)' }}>₹{Math.round(gstQuarterly.reduce((s,q) => s+q.total,0)).toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Invoice detail by status */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Invoice Status Breakdown</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(['Draft','Sent','Partially Paid','Paid','Overdue'] as const).map(status => {
                const count = invoices.filter(i => i.status === status).length;
                const colors: Record<string, string> = { Draft: 'badge-slate', Sent: 'badge-indigo', 'Partially Paid': 'badge-amber', Paid: 'badge-emerald', Overdue: 'badge-red' };
                return (
                  <div key={status} style={{ padding: '12px 18px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', minWidth: 110 }}>
                    <div className={`badge ${colors[status]}`} style={{ marginBottom: 8, fontSize: 10.5 }}>{status}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--t1)' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VEHICLE P&L ── */}
      {tab === 'vehicle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Vehicle Revenue vs Expense Report</span>
              <button onClick={exportVehiclePLCSV} className="btn btn-secondary btn-sm"><Download style={{ width: 12, height: 12 }} /> Export CSV</button>
            </div>
            {vehiclePL.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Car style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No vehicle data</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Vehicle</th>
                    <th style={{ textAlign: 'center' }}>Trips</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Maintenance</th>
                    <th style={{ textAlign: 'right' }}>Net P&L</th>
                    <th>Margin</th>
                  </tr></thead>
                  <tbody>
                    {vehiclePL.map(v => {
                      const margin = v.revenue > 0 ? ((v.profit / v.revenue) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={v.vehicle_no}>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{v.vehicle_no}</span>
                            <span className="badge badge-slate" style={{ marginLeft: 6, fontSize: 9.5 }}>{v.type}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--t1)' }}>{v.tripCount}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-light)' }}>₹{v.revenue.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-light)' }}>₹{v.expenses.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: v.profit >= 0 ? 'var(--gold)' : 'var(--red-light)' }}>
                            {v.profit >= 0 ? '+' : ''}₹{v.profit.toLocaleString('en-IN')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ height: '100%', width: `${Math.min(100, Number(margin))}%`, background: Number(margin) > 50 ? 'var(--green)' : Number(margin) > 20 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t2)', minWidth: 40 }}>{margin}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-3)' }}>
                      <td style={{ fontWeight: 700, color: 'var(--t1)' }}>Total</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--t1)' }}>{vehiclePL.reduce((s,v) => s+v.tripCount, 0)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--green-light)' }}>₹{vehiclePL.reduce((s,v) => s+v.revenue, 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--red-light)' }}>₹{vehiclePL.reduce((s,v) => s+v.expenses, 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 19, color: 'var(--gold)' }}>
                        ₹{vehiclePL.reduce((s,v) => s+v.profit, 0).toLocaleString('en-IN')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DRIVER PAYOUTS ── */}
      {tab === 'driver' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Driver Payout Summary (All Time)</span>
              <button onClick={exportDriverPayoutsCSV} className="btn btn-secondary btn-sm"><Download style={{ width: 12, height: 12 }} /> Export CSV</button>
            </div>
            {driverSummary.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Users style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No drivers registered</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Driver</th><th style={{ textAlign: 'center' }}>Total Trips</th>
                    <th style={{ textAlign: 'right' }}>Total Bata</th>
                    <th style={{ textAlign: 'right' }}>Total Advance</th>
                    <th style={{ textAlign: 'right' }}>Net Payout</th>
                  </tr></thead>
                  <tbody>
                    {driverSummary.map(s => (
                      <tr key={s.driver.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{s.driver.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{s.driver.assigned_vehicle || '—'}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>{s.trips}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-light)' }}>₹{s.totalBata.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-light)' }}>₹{s.totalAdv.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: s.net >= 0 ? 'var(--gold)' : 'var(--red-light)' }}>
                          ₹{Math.abs(s.net).toLocaleString('en-IN')}
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

      {/* ── EXPORT ── */}
      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>CSV Data Export</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'All Trips', desc: `${trips.length} records — date, vehicle, pickup, drop, status, client, KM`, fn: exportTripsCSV, icon: '🚗' },
                { label: 'Invoices', desc: `${invoices.length} records — invoice no, client, amount, GST, status`, fn: exportInvoicesCSV, icon: '📄' },
                { label: 'Driver Payouts', desc: `${driverPayouts.length} records — driver, month, bata, advance, net`, fn: exportDriverPayoutsCSV, icon: '👤' },
                { label: 'Vehicle P&L', desc: `${vehicles.length} records — revenue, expenses, net profit per vehicle`, fn: exportVehiclePLCSV, icon: '📊' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', flexWrap: 'wrap', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                  <button onClick={item.fn} className="btn btn-primary">
                    <Download style={{ width: 14, height: 14 }} /> Download CSV
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="info-banner">
            <Download style={{ width: 17, height: 17, color: '#93c5fd', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--t1)', marginBottom: 4 }}>CSV Export Notes</div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.7 }}>
                All exports are UTF-8 encoded CSV files. Open in Excel or Google Sheets. Data reflects current localStorage state.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
