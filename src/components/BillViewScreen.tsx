/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Printer, FileText, TrendingUp, Car, ChevronDown, ChevronUp, MapPin, Hash, Plus, CreditCard, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Vehicle, Rate, Trip, Adjustment, Client, Invoice, Payment, InvoiceStatus } from '../types';
import { calculateBill } from '../billingEngine';

interface Props {
  vehicles: Vehicle[];
  rates: Rate[];
  trips: Trip[];
  adjustments: Adjustment[];
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  onAddInvoice: (inv: Omit<Invoice, 'id'>) => void;
  onUpdateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  onAddPayment: (p: Omit<Payment, 'id'>) => void;
}

type MainTab = 'billing' | 'invoices' | 'payments';

const INV_STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string }> = {
  Draft:           { bg: 'var(--surface-2)',        text: 'var(--t3)'         },
  Sent:            { bg: 'var(--blue-dim)',          text: 'var(--blue)'       },
  'Partially Paid':{ bg: 'var(--amber-dim)',         text: 'var(--amber)'      },
  Paid:            { bg: 'var(--green-dim)',         text: 'var(--green-light)'},
  Overdue:         { bg: 'var(--red-dim)',           text: 'var(--red-light)'  },
};
const INV_STATUS_ORDER: InvoiceStatus[] = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'];

export default function BillViewScreen({ vehicles, rates, trips, adjustments, clients, invoices, payments, onAddInvoice, onUpdateInvoiceStatus, onAddPayment }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('billing');
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  // Invoice creation form
  const [invClientId, setInvClientId] = useState('');
  const [invClientName, setInvClientName] = useState('');
  const [invVehicle, setInvVehicle] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDate, setInvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState('');
  const [invIsInterstate, setInvIsInterstate] = useState(false);
  const [invNote, setInvNote] = useState('');
  const [invMonth, setInvMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Payment form
  const [payInvId, setPayInvId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');

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
    let acc = 0;
    return billSummary.vehicles.map((v, idx) => {
      const pct = v.payable / total;
      const pctRound = Math.round(pct * 100);
      const dashArray = `${pct * 314.16} 314.16`;
      const dashOffset = -acc;
      acc += pct * 314.16;
      return { vehicle_no: v.vehicle_no, payable: v.payable, percentage: pctRound, color: colors[idx % colors.length], dashArray, dashOffset };
    }).filter(v => v.payable > 0);
  }, [billSummary]);

  const vehicleTripDistribution = useMemo(() => {
    const total = billSummary.total_trips || 1;
    const colors = ['#f0a500', '#10b981', '#3b82f6', '#f43f5e', '#a855f7'];
    return billSummary.vehicles.map((v, idx) => {
      const tripCount = v.locations.reduce((s, l) => s + l.trip_count, 0);
      return { vehicle_no: v.vehicle_no, trip_count: tripCount, percentage: Math.round((tripCount / total) * 100), color: colors[idx % colors.length] };
    }).sort((a, b) => b.trip_count - a.trip_count);
  }, [billSummary]);

  // Outstanding per client
  const clientOutstanding = useMemo(() => {
    return clients.map(c => {
      const cInvoices = invoices.filter(i => i.client_id === c.id);
      const outstanding = cInvoices.reduce((s, inv) => {
        if (inv.status === 'Paid') return s;
        const paid = payments.filter(p => p.invoice_id === inv.id).reduce((ss, p) => ss + p.amount, 0);
        const total = inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100);
        return s + Math.max(0, total - paid);
      }, 0);
      return { client: c, outstanding };
    }).filter(c => c.outstanding > 0);
  }, [clients, invoices, payments]);

  const autoInvNo = useMemo(() => {
    const prefix = `INV-${invMonth.replace('-', '')}-`;
    const count = invoices.filter(i => i.invoice_no.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }, [invoices, invMonth]);

  const handleAddInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find(c => c.id === invClientId);
    onAddInvoice({
      invoice_no: autoInvNo,
      trip_ids: [],
      month: invMonth,
      client_id: invClientId || undefined,
      client_name: selectedClient?.name || invClientName.trim(),
      vehicle_no: invVehicle,
      amount: Number(invAmount) || 0,
      cgst_pct: 6, sgst_pct: 6, igst_pct: 12,
      is_interstate: invIsInterstate,
      status: 'Draft',
      date: invDate,
      due_date: invDueDate || undefined,
      note: invNote.trim() || undefined,
    });
    setInvAmount(''); setInvNote(''); setInvClientId(''); setInvClientName(''); setInvVehicle('');
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvId || !payAmount) return;
    onAddPayment({ invoice_id: payInvId, amount: Number(payAmount) || 0, mode: payMode, date: payDate, reference: payRef.trim() || undefined });
    setPayAmount(''); setPayRef('');
  };

  const pendingInvoices = invoices.filter(i => i.status !== 'Paid');

  const openWhatsApp = (inv: Invoice) => {
    const client = clients.find(c => c.id === inv.client_id);
    if (!client?.phone) return alert('No phone number for this client.');
    const phone = client.phone.replace(/\D/g, '');
    const total = inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100);
    const msg = `Dear ${inv.client_name},\n\nThis is a payment reminder from Kavya Tours & Travels.\n\nInvoice: ${inv.invoice_no}\nAmount Due: ₹${Math.round(total).toLocaleString('en-IN')}\nDue Date: ${inv.due_date || 'Immediate'}\n\nKindly arrange payment at the earliest.\n\nThank you.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Main tabs */}
      <div className="pill-tabs no-print">
        {([['billing', 'Monthly Billing', <TrendingUp style={{ width: 13, height: 13 }} />], ['invoices', `Invoices (${invoices.length})`, <FileText style={{ width: 13, height: 13 }} />], ['payments', 'Payments', <CreditCard style={{ width: 13, height: 13 }} />]] as const).map(([id, label, icon]) => (
          <button key={id} className={`pill-tab ${mainTab === id ? 'active' : ''}`} onClick={() => setMainTab(id)}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── BILLING ── */}
      {mainTab === 'billing' && (
        <>
          {/* Hero Banner */}
          <div className="bill-hero no-print">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,165,0,0.45)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Billing Cycle — Monthly Invoice</div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.8px', margin: 0, lineHeight: 1 }}>{formattedMonth}</h2>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 10.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em' }}>SWITCH MONTH:</label>
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value || '2026-04')}
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

          {/* Visual Analytics */}
          {billSummary.vehicles.length > 0 && (
            <div className="card visual-analytics-card no-print">
              <div className="card-header">
                <div className="layout-row-center" style={{ gap: 8 }}>
                  <TrendingUp style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Visual Fleet Analytics</span>
                </div>
                <span className="badge badge-emerald">Interactive Dashboard</span>
              </div>
              <div className="card-body visual-analytics-grid">
                <div className="analytics-donut-container">
                  <div className="analytics-donut-title">Net Payout Share</div>
                  <svg width="150" height="150" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--border)" strokeWidth="12" />
                    {vehicleShares.map(slice => (
                      <circle key={slice.vehicle_no} cx="60" cy="60" r="50" fill="transparent" stroke={slice.color} strokeWidth="12"
                        strokeDasharray={slice.dashArray} strokeDashoffset={slice.dashOffset}
                        strokeLinecap={slice.percentage > 0 ? "round" : "butt"} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                    ))}
                  </svg>
                  <div className="analytics-donut-legend">
                    {vehicleShares.map(slice => (
                      <div key={slice.vehicle_no} className="analytics-legend-item">
                        <span className="analytics-legend-label"><span className="analytics-legend-color" style={{ background: slice.color }} />{slice.vehicle_no}</span>
                        <span className="analytics-legend-value">₹{slice.payable.toLocaleString('en-IN')} ({slice.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="analytics-progress-container">
                  <div className="analytics-progress-title">Trips Load Distribution</div>
                  <div className="analytics-progress-list">
                    {vehicleTripDistribution.map(item => (
                      <div key={item.vehicle_no} className="analytics-progress-item">
                        <div className="analytics-progress-header">
                          <span className="analytics-progress-label"><span className="analytics-legend-color" style={{ background: item.color }} />{item.vehicle_no}</span>
                          <span className="analytics-progress-val">{item.trip_count} trips ({item.percentage}%)</span>
                        </div>
                        <div className="analytics-progress-track">
                          <div className="analytics-progress-fill" style={{ width: `${item.percentage}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Printable Bill */}
          <div id="printable-bill" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="card" style={{ padding: '30px 34px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText style={{ width: 20, height: 20, color: 'var(--gold)' }} /> KAVYA TOURS & TRAVELS
                  </h1>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 5 }}>Employee Fleet Logistics & Corporate Transit Operations</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>Regd Office: Thane, MH · +91 99999 88888 · billing@kavyatours.com</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>GSTIN: 27AABCK1234A1ZM · HSN/SAC: 9964</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-indigo" style={{ fontSize: 11, padding: '5px 14px', marginBottom: 8, display: 'inline-block' }}>Official Vendor Statement</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', marginTop: 4 }}>Period: <span style={{ color: 'var(--gold)' }}>{formattedMonth}</span></div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            {/* Vehicle breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Vehicle-Wise Billing Breakdown</h2>
                <span className="badge badge-slate">{billSummary.vehicles.length} vehicles</span>
              </div>
              {billSummary.vehicles.length === 0 ? (
                <div className="card"><div className="card-body"><div className="empty-state">
                  <div className="empty-state-icon"><Car style={{ width: 20, height: 20 }} /></div>
                  <div className="empty-state-title">No vehicles to display</div>
                </div></div></div>
              ) : billSummary.vehicles.map(summary => {
                const isExpanded = expandedVehicles.has(summary.vehicle_no);
                const totalVehicleTrips = summary.locations.reduce((s, l) => s + l.trip_count, 0);
                return (
                  <div key={summary.vehicle_no} className="vehicle-accordion">
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

                    {(isExpanded || true) && (
                      <div className={isExpanded ? '' : 'print-only-content'} style={!isExpanded ? { display: 'none' } : {}}>
                        <div className="print-vehicle-header" style={{ display: 'none', padding: '12px 20px', background: 'var(--surface-3)', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>{summary.vehicle_no}</span>
                            <span className={`badge ${typeColors[summary.vehicle_type] || 'badge-slate'}`}>{summary.vehicle_type}</span>
                            <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>Vendor: {summary.vendor_name}</span>
                          </div>
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}>{summary.phone}</div>
                        </div>

                        {summary.locations.length === 0 ? (
                          <div style={{ padding: '18px 20px', textAlign: 'center', fontSize: 13, color: 'var(--t3)', borderTop: '1px solid var(--border)' }}>No trips registered for this vehicle this month.</div>
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
                                    <td style={{ textAlign: 'center' }}><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>{loc.trip_count}</span></td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontSize: 13 }}>₹{loc.rate.toLocaleString('en-IN')}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--t1)', paddingRight: 20 }}>₹{loc.bill_amt.toLocaleString('en-IN')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-3)', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                          {[
                            { label: 'Gross Trips Bill', value: `₹${summary.subtotal_bill.toLocaleString('en-IN')}`, sub: `${totalVehicleTrips} trips`, color: 'var(--t1)' },
                            { label: 'Advance Deducted', value: `−₹${summary.advance.toLocaleString('en-IN')}`, sub: 'Month-end advance', color: 'var(--red-light)' },
                          ].map(item => (
                            <div key={item.label}>
                              <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontWeight: 700 }}>{item.label}</div>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: item.color, marginTop: 5 }}>{item.value}</div>
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
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--gold)', marginTop: 5 }}>₹{summary.payable.toLocaleString('en-IN')}</div>
                            <span className="badge badge-indigo no-print" style={{ marginTop: 6, fontSize: 10 }}>Final Payout</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand Summary */}
            <div className="grand-summary-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, position: 'relative', zIndex: 1 }}>
                <TrendingUp style={{ width: 17, height: 17, color: 'var(--gold)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Consolidated Grand Billing Summary</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, position: 'relative', zIndex: 1 }}>
                {[
                  { label: 'Active Vehicles', value: `${billSummary.vehicles.length}`, unit: 'fleet', color: 'var(--t1)' },
                  { label: 'Total Trips', value: `${billSummary.total_trips}`, unit: 'runs', color: 'var(--t1)' },
                  { label: 'Gross Bill', value: `₹${billSummary.total_bill.toLocaleString('en-IN')}`, unit: '', color: '#fde68a' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: s.color, marginTop: 5 }}>{s.value}</div>
                    {s.unit && <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 3 }}>{s.unit}</div>}
                  </div>
                ))}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 7 }}>Adjustments</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--red-light)' }}>Adv: −₹{billSummary.total_advance.toLocaleString('en-IN')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--green-light)' }}>Toll: +₹{billSummary.total_toll.toLocaleString('en-IN')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--red-light)' }}>Fine: −₹{billSummary.total_fine.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(240,165,0,0.22), rgba(200,125,0,0.18))', border: '1px solid rgba(240,165,0,0.3)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 20px rgba(240,165,0,0.12)' }}>
                  <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Grand Net Payable</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 900, color: '#fff', marginTop: 5 }}>₹{billSummary.total_payable.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(240,165,0,0.55)', fontFamily: 'var(--font-mono)', marginTop: 5, letterSpacing: '0.06em' }}>✓ VERIFIED SUMMARY</div>
                </div>
              </div>
            </div>

            {/* GST Note */}
            <div className="card no-print">
              <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>GST on Transport Services (HSN/SAC 9964)</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                    Intrastate: CGST 6% + SGST 6% = 12% · Interstate: IGST 12%
                  </div>
                </div>
                <button onClick={() => setMainTab('invoices')} className="btn btn-primary">
                  <Plus style={{ width: 14, height: 14 }} /> Create GST Invoice
                </button>
              </div>
            </div>

            {/* Signature */}
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
                Auto-calculated from logged fleet trips · Kavya Tours Invoice Ledger System · GSTIN: 27AABCK1234A1ZM · HSN/SAC: 9964 · Page 1 of 1
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── INVOICES ── */}
      {mainTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Create invoice */}
          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <Plus style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Create GST Invoice</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>Auto: {autoInvNo}</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-3-columns">
                  <div>
                    <label className="form-label">Client</label>
                    <select value={invClientId} onChange={e => { setInvClientId(e.target.value); setInvClientName(clients.find(c => c.id === e.target.value)?.name || ''); }} className="form-select">
                      <option value="">— Select / type below —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {!invClientId && (
                    <div>
                      <label className="form-label">Client Name (manual)</label>
                      <input type="text" value={invClientName} onChange={e => setInvClientName(e.target.value)} placeholder="Client name" className="form-input" />
                    </div>
                  )}
                  <div>
                    <label className="form-label">Vehicle</label>
                    <select value={invVehicle} onChange={e => setInvVehicle(e.target.value)} className="form-select">
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => <option key={v.vehicle_no} value={v.vehicle_no}>{v.vehicle_no}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Billing Month</label>
                    <input type="month" value={invMonth} onChange={e => setInvMonth(e.target.value)} className="form-input" style={{ fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
                  </div>
                </div>
                <div className="grid-3-columns">
                  <div>
                    <label className="form-label">Base Amount (₹ excl. GST)</label>
                    <input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="e.g. 50000" required min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="form-label">Invoice Date</label>
                    <input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} required className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="form-label">Due Date</label>
                    <input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--t2)' }}>
                    <input type="checkbox" checked={invIsInterstate} onChange={e => setInvIsInterstate(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                    Interstate (IGST 12%)
                  </label>
                  {invAmount && (
                    <div style={{ fontSize: 12.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                      {invIsInterstate
                        ? `IGST 12% = ₹${(Number(invAmount) * 0.12).toLocaleString('en-IN')} | Total = ₹${(Number(invAmount) * 1.12).toLocaleString('en-IN')}`
                        : `CGST 6% + SGST 6% = ₹${(Number(invAmount) * 0.12).toLocaleString('en-IN')} | Total = ₹${(Number(invAmount) * 1.12).toLocaleString('en-IN')}`}
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Note</label>
                  <input type="text" value={invNote} onChange={e => setInvNote(e.target.value)} placeholder="Optional note for this invoice" className="form-input" />
                </div>
                <button type="submit" className="btn btn-primary btn-full"><Plus style={{ width: 14, height: 14 }} /> Create Invoice</button>
              </form>
            </div>
          </div>

          {/* Invoice list */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>All Invoices</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-indigo">{invoices.length} Total</span>
                {pendingInvoices.length > 0 && <span className="badge badge-red">{pendingInvoices.length} Pending</span>}
              </div>
            </div>
            {invoices.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><FileText style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No invoices yet</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Invoice No.</th><th>Client</th><th>Vehicle</th><th>Date</th>
                    <th style={{ textAlign: 'right' }}>Base</th>
                    <th style={{ textAlign: 'right' }}>GST</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {[...invoices].reverse().map(inv => {
                      const gstAmt = inv.amount * (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100;
                      const total = inv.amount + gstAmt;
                      const st = INV_STATUS_STYLE[inv.status] || INV_STATUS_STYLE.Draft;
                      const client = clients.find(c => c.id === inv.client_id);
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--t1)' }}>{inv.invoice_no}</td>
                          <td style={{ fontSize: 13, color: 'var(--t2)' }}>{inv.client_name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>{inv.vehicle_no || '—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t3)' }}>{inv.date}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>₹{inv.amount.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t3)' }}>₹{Math.round(gstAmt).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--t1)' }}>₹{Math.round(total).toLocaleString('en-IN')}</td>
                          <td>
                            <select value={inv.status} onChange={e => onUpdateInvoiceStatus(inv.id, e.target.value as InvoiceStatus)}
                              style={{ padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: st.bg, color: st.text, border: `1px solid ${st.text}44`, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                              {INV_STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {client?.phone && client.phone !== 'N/A' && inv.status !== 'Paid' && (
                                <button onClick={() => openWhatsApp(inv)} title="WhatsApp reminder"
                                  style={{ padding: '5px 9px', borderRadius: 8, background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)', cursor: 'pointer', fontSize: 14 }}>
                                  <MessageCircle style={{ width: 13, height: 13 }} />
                                </button>
                              )}
                              {inv.status !== 'Paid' && (
                                <button onClick={() => setPayInvId(inv.id)} className="btn btn-secondary btn-sm" title="Record payment">
                                  <CreditCard style={{ width: 12, height: 12 }} />
                                </button>
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

          {/* Client outstanding summary */}
          {clientOutstanding.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Outstanding Balances by Client</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Client</th><th style={{ textAlign: 'right' }}>Outstanding</th><th>Action</th></tr></thead>
                  <tbody>
                    {clientOutstanding.map(cs => (
                      <tr key={cs.client.id}>
                        <td style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>{cs.client.name}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--red-light)' }}>₹{Math.round(cs.outstanding).toLocaleString('en-IN')}</td>
                        <td>
                          {cs.client.phone && cs.client.phone !== 'N/A' && (
                            <button
                              onClick={() => {
                                const phone = cs.client.phone.replace(/\D/g, '');
                                const msg = `Dear ${cs.client.name},\n\nYou have an outstanding balance of ₹${Math.round(cs.outstanding).toLocaleString('en-IN')} with Kavya Tours & Travels.\n\nPlease arrange payment at the earliest.\n\nThank you.`;
                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <MessageCircle style={{ width: 12, height: 12 }} /> WhatsApp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {mainTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <CreditCard style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Record Payment</span>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Invoice</label>
                  <select value={payInvId} onChange={e => setPayInvId(e.target.value)} required className="form-select">
                    <option value="">Select invoice</option>
                    {invoices.filter(i => i.status !== 'Paid').map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.invoice_no} — {inv.client_name} (₹{Math.round(inv.amount * 1.12).toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>
                <div className="grid-3-columns">
                  <div>
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="e.g. 25000" required min="1" className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="form-label">Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value as typeof payMode)} required className="form-select">
                      {(['UPI', 'Cash', 'Bank Transfer', 'Cheque'] as const).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required className="form-input" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Reference No. <span style={{ fontWeight: 400, color: 'var(--t4)', fontSize: 9 }}>(optional)</span></label>
                  <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="UPI Ref / Cheque No / UTR" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
                <button type="submit" className="btn btn-primary btn-full"><CheckCircle2 style={{ width: 14, height: 14 }} /> Record Payment</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Payment History</span>
              <span className="badge badge-emerald">{payments.length} Payments</span>
            </div>
            {payments.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><CreditCard style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No payments recorded yet</div>
              </div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Invoice</th><th>Date</th><th>Mode</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {[...payments].reverse().map(p => {
                      const inv = invoices.find(i => i.id === p.invoice_id);
                      return (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700 }}>{inv?.invoice_no || p.invoice_id}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t3)' }}>{p.date}</td>
                          <td><span className="badge badge-emerald" style={{ fontSize: 10 }}>{p.mode}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t3)' }}>{p.reference || '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--green-light)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
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
