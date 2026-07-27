/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { TrendingUp, Car, Clock, AlertTriangle, CheckCircle2, DollarSign, Users, FileText, Calendar } from 'lucide-react';
import { Trip, Vehicle, Driver, Client, Invoice, Payment, Rate, Adjustment, MaintenanceLog, TripStatus, DriverAvailability } from '../types';
import { calculateBill } from '../billingEngine';

interface Props {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  rates: Rate[];
  adjustments: Adjustment[];
  maintenanceLogs: MaintenanceLog[];
}

const STATUS_COLOR: Record<TripStatus, { bg: string; text: string; label: string }> = {
  Requested:  { bg: 'var(--surface-2)',   text: 'var(--t3)',         label: 'Requested'  },
  Confirmed:  { bg: 'var(--blue-dim)',     text: 'var(--blue)',       label: 'Confirmed'  },
  Ongoing:    { bg: 'var(--amber-dim)',    text: 'var(--amber)',      label: 'Ongoing'    },
  Completed:  { bg: 'var(--green-dim)',    text: 'var(--green-light)',label: 'Completed'  },
  Billed:     { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa',        label: 'Billed'     },
  Paid:       { bg: 'rgba(16,185,129,0.18)', text: '#34d399',        label: 'Paid'       },
};

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function DashboardScreen({ trips, vehicles, drivers, clients, invoices, payments, rates, adjustments, maintenanceLogs }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }, []);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const todayTrips   = useMemo(() => trips.filter(t => t.date === today).length, [trips, today]);
  const onRoad       = useMemo(() => trips.filter(t => t.status === 'Ongoing').length, [trips]);
  const monthTrips   = useMemo(() => trips.filter(t => t.date.startsWith(currentMonth)), [trips, currentMonth]);
  const recentTrips  = useMemo(() => [...trips].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 10), [trips]);

  // Pending payment amount (invoices not paid)
  const pendingPayment = useMemo(() => {
    return invoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => {
      const paid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100) - paid);
    }, 0);
  }, [invoices, payments]);

  // Monthly revenue (current month gross bill)
  const monthRevenue = useMemo(() => {
    const summary = calculateBill(currentMonth, vehicles, rates, monthTrips, adjustments);
    return summary.total_bill;
  }, [currentMonth, vehicles, rates, monthTrips, adjustments]);

  // Last 6 months revenue
  const last6Months = useMemo(() => {
    const result: { label: string; month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const summary = calculateBill(month, vehicles, rates, trips, adjustments);
      result.push({ label, month, revenue: summary.total_bill });
    }
    return result;
  }, [vehicles, rates, trips, adjustments]);

  const maxRevenue = useMemo(() => Math.max(...last6Months.map(m => m.revenue), 1), [last6Months]);

  // Document expiry alerts (within 30 days)
  const expiryAlerts = useMemo(() => {
    const alerts: { label: string; entity: string; days: number; type: 'vehicle' | 'driver' }[] = [];
    for (const v of vehicles) {
      const checks: [string, string | undefined][] = [
        ['Insurance', v.insurance_expiry], ['Permit', v.permit_expiry], ['PUC', v.puc_expiry],
      ];
      for (const [label, exp] of checks) {
        const d = daysUntil(exp);
        if (d !== null && d <= 30) alerts.push({ label, entity: v.vehicle_no, days: d, type: 'vehicle' });
      }
    }
    for (const drv of drivers) {
      const d = daysUntil(drv.license_expiry);
      if (d !== null && d <= 30) alerts.push({ label: 'License', entity: drv.name, days: d, type: 'driver' });
    }
    return alerts.sort((a, b) => a.days - b.days);
  }, [vehicles, drivers]);

  // Pending invoices (Overdue + Sent)
  const pendingInvoices = useMemo(() => invoices.filter(i => i.status === 'Overdue' || i.status === 'Sent' || i.status === 'Partially Paid'), [invoices]);

  // Drivers available: not "On Trip" (either stored or inferred from ongoing trips)
  const driversAvailable = useMemo(() => {
    const onTripIds = new Set(trips.filter(t => t.status === 'Ongoing' && t.driver_id).map(t => t.driver_id!));
    return drivers.filter(d => {
      if (onTripIds.has(d.id)) return false;
      const availability: DriverAvailability = d.availability || 'Available';
      return availability === 'Available';
    }).length;
  }, [drivers, trips]);

  const kpiCards = [
    { label: "Today's Trips",     value: todayTrips,                                        color: 'var(--gold)',        icon: <Calendar style={{ width: 18, height: 18 }} />,     cls: 'indigo' },
    { label: 'Vehicles On Road',  value: onRoad,                                             color: 'var(--amber)',       icon: <Car style={{ width: 18, height: 18 }} />,          cls: 'amber'  },
    { label: 'Pending Payments',  value: `₹${Math.round(pendingPayment).toLocaleString('en-IN')}`, color: 'var(--red-light)', icon: <DollarSign style={{ width: 18, height: 18 }} />, cls: 'red'    },
    { label: 'Monthly Revenue',   value: `₹${monthRevenue.toLocaleString('en-IN')}`,         color: 'var(--green-light)', icon: <TrendingUp style={{ width: 18, height: 18 }} />,   cls: 'emerald'},
    { label: 'Drivers Available', value: driversAvailable,                                   color: 'var(--sky)',         icon: <Users style={{ width: 18, height: 18 }} />,        cls: 'sky'    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* KPI cards */}
      <div className="kpi-grid">
        {kpiCards.map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="kpi-label">{k.label}</div>
              <div style={{ color: k.color, opacity: 0.7 }}>{k.icon}</div>
            </div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18 }}>

        {/* Revenue Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div className="layout-row-center" style={{ gap: 8 }}>
              <TrendingUp style={{ width: 15, height: 15, color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Revenue — Last 6 Months</span>
            </div>
            <span className="badge badge-emerald">Gross Bill</span>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, paddingBottom: 28, position: 'relative' }}>
              {/* Y-axis guide lines */}
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <div key={pct} style={{
                  position: 'absolute', left: 0, right: 0,
                  bottom: 28 + (pct * 102),
                  borderTop: '1px dashed var(--border)', zIndex: 0
                }} />
              ))}
              {last6Months.map((m, i) => {
                const barH = maxRevenue > 0 ? Math.max(4, (m.revenue / maxRevenue) * 102) : 4;
                const isCurrent = m.month === currentMonth;
                return (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--t4)', textAlign: 'center', marginBottom: 2, minHeight: 14 }}>
                      {m.revenue > 0 ? `₹${Math.round(m.revenue/1000)}k` : ''}
                    </div>
                    <div style={{
                      width: '100%', height: barH,
                      background: isCurrent
                        ? 'linear-gradient(180deg, var(--gold-light) 0%, var(--gold) 100%)'
                        : 'linear-gradient(180deg, var(--green) 0%, rgba(58,168,115,0.5) 100%)',
                      borderRadius: '4px 4px 2px 2px',
                      transition: 'height 0.4s var(--ease-out)',
                      boxShadow: isCurrent ? '0 0 8px rgba(226,161,29,0.3)' : 'none',
                      alignSelf: 'flex-end',
                    }} />
                    <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: isCurrent ? 'var(--gold)' : 'var(--t3)', fontWeight: isCurrent ? 700 : 400, position: 'absolute', bottom: 0 }}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="layout-row-center" style={{ gap: 8 }}>
              <AlertTriangle style={{ width: 15, height: 15, color: 'var(--red-light)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Expiry Alerts</span>
            </div>
            {expiryAlerts.length > 0 && (
              <span className="badge badge-red">{expiryAlerts.length}</span>
            )}
          </div>
          <div className="card-body" style={{ padding: '8px 14px', maxHeight: 180, overflowY: 'auto' }}>
            {expiryAlerts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--green-light)', fontSize: 12.5 }}>
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                All documents valid for 30+ days
              </div>
            ) : (
              expiryAlerts.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0', borderBottom: i < expiryAlerts.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' }}>{a.entity}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{a.label} expiry</div>
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    background: a.days <= 0 ? 'var(--red-dim)' : a.days <= 7 ? 'rgba(239,68,68,0.15)' : 'var(--amber-dim)',
                    color: a.days <= 0 ? 'var(--red-light)' : a.days <= 7 ? '#f87171' : 'var(--amber)',
                    border: `1px solid ${a.days <= 7 ? 'var(--red-border)' : 'var(--amber-border)'}`,
                  }}>
                    {a.days <= 0 ? 'EXPIRED' : `${a.days}d`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18 }}>
        {/* Recent Trips */}
        <div className="card">
          <div className="card-header">
            <div className="layout-row-center" style={{ gap: 8 }}>
              <Clock style={{ width: 15, height: 15, color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Recent Trips</span>
            </div>
            <span className="badge badge-indigo">Last 10</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {recentTrips.length === 0 ? (
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon"><Calendar style={{ width: 20, height: 20 }} /></div>
                  <div className="empty-state-title">No trips yet</div>
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr>
                  <th>Date</th><th>Vehicle</th><th>Pickup</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {recentTrips.map(t => {
                    const sc = STATUS_COLOR[t.status] || STATUS_COLOR.Requested;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>{t.date}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--t1)' }}>{t.vehicle_no}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--t2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.location}</td>
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, background: sc.bg, color: sc.text }}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="card">
          <div className="card-header">
            <div className="layout-row-center" style={{ gap: 8 }}>
              <FileText style={{ width: 15, height: 15, color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>Pending Invoices</span>
            </div>
            {pendingInvoices.length > 0 && <span className="badge badge-red">{pendingInvoices.length}</span>}
          </div>
          <div className="card-body" style={{ padding: '8px 14px', maxHeight: 240, overflowY: 'auto' }}>
            {pendingInvoices.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--green-light)', fontSize: 12.5 }}>
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                No pending invoices
              </div>
            ) : (
              pendingInvoices.map((inv, i) => {
                const paid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
                const total = inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100);
                const outstanding = Math.max(0, total - paid);
                return (
                  <div key={inv.id} style={{
                    padding: '10px 0', borderBottom: i < pendingInvoices.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{inv.invoice_no}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{inv.client_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red-light)', fontFamily: 'var(--font-display)' }}>₹{Math.round(outstanding).toLocaleString('en-IN')}</div>
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          background: inv.status === 'Overdue' ? 'var(--red-dim)' : 'var(--amber-dim)',
                          color: inv.status === 'Overdue' ? 'var(--red-light)' : 'var(--amber)',
                        }}>{inv.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 20 }}>
          {[
            { icon: <Car style={{ width: 16, height: 16 }} />, label: 'Vehicles', value: vehicles.length, color: 'var(--gold)' },
            { icon: <Users style={{ width: 16, height: 16 }} />, label: 'Drivers', value: drivers.length, color: 'var(--blue)' },
            { icon: <Users style={{ width: 16, height: 16 }} />, label: 'Clients', value: clients.length, color: 'var(--green-light)' },
            { icon: <FileText style={{ width: 16, height: 16 }} />, label: 'Invoices', value: invoices.length, color: '#a78bfa' },
            { icon: <TrendingUp style={{ width: 16, height: 16 }} />, label: 'Total Trips', value: trips.length, color: 'var(--amber)' },
            { icon: <AlertTriangle style={{ width: 16, height: 16 }} />, label: 'Alerts', value: expiryAlerts.length, color: expiryAlerts.length > 0 ? 'var(--red-light)' : 'var(--green-light)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
