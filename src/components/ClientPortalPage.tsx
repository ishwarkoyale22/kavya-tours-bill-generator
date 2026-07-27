/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, MapPin, FileText, Car } from 'lucide-react';
import { Client, Trip, Invoice, Payment, InvoiceStatus } from '../types';

const LS = 'kavya_tours_';
function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(LS + key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; color: string }> = {
  Draft:           { bg: '#3a3020', color: '#b4a068' },
  Sent:            { bg: '#1a2a3a', color: '#60a5fa' },
  'Partially Paid':{ bg: '#2a2010', color: '#f59e0b' },
  Paid:            { bg: '#0d2a1a', color: '#34d399' },
  Overdue:         { bg: '#2a1010', color: '#f87171' },
};

export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>();

  const clients  = lsGet<Client[]>('clients', []);
  const allTrips = lsGet<Trip[]>('trips', []);
  const invoices = lsGet<Invoice[]>('invoices', []);
  const payments = lsGet<Payment[]>('payments', []);

  const client = useMemo(() => clients.find(c => c.id === id), [clients, id]);

  const clientTrips = useMemo(() =>
    allTrips
      .filter(t => t.client_id === id || (client && t.client_name === client.name))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [allTrips, id, client]);

  const clientInvoices = useMemo(() =>
    invoices.filter(i => i.client_id === id || (client && i.client_name === client.name))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [invoices, id, client]);

  const outstanding = useMemo(() => {
    return clientInvoices
      .filter(i => i.status !== 'Paid')
      .reduce((sum, inv) => {
        const paid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
        const total = inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100);
        return sum + Math.max(0, total - paid);
      }, 0);
  }, [clientInvoices, payments]);

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e1a14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#e2c97a' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Client not found</div>
          <div style={{ fontSize: 14, color: '#8a7c66' }}>The portal link may be invalid or the client has been removed.</div>
        </div>
      </div>
    );
  }

  const upiLink = `upi://pay?pa=kavyatours@okaxis&pn=KavyaTours&am=${Math.round(outstanding)}&cu=INR&tn=Invoice+Payment+${client.name}`;

  return (
    <div style={{ minHeight: '100vh', background: '#0d1a10', fontFamily: 'Inter, system-ui, sans-serif', color: '#f0e8d4' }}>

      {/* Header / Letterhead */}
      <div style={{ background: 'linear-gradient(135deg, #0f2a21 0%, #0a1d16 100%)', borderBottom: '1px solid rgba(226,161,29,0.2)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(150deg, #f6c65a, #e0980f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 26, color: '#2a1a02',
            }}>K</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0e8d4', letterSpacing: '-0.2px' }}>Kavya Tours & Travels</div>
              <div style={{ fontSize: 11, color: '#e2a11d', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 3 }}>Client Portal</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{client.name}</div>
              {client.company && <div style={{ fontSize: 14, color: '#b4a068', marginBottom: 8 }}>{client.company}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {client.phone !== 'N/A' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8a9a88', fontFamily: 'monospace' }}>
                    <Phone style={{ width: 12, height: 12 }} />{client.phone}
                  </div>
                )}
                {client.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8a9a88' }}>
                    <Mail style={{ width: 12, height: 12 }} />{client.email}
                  </div>
                )}
                {client.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8a9a88' }}>
                    <MapPin style={{ width: 12, height: 12 }} />{client.address}
                  </div>
                )}
              </div>
            </div>

            {/* Outstanding balance */}
            <div style={{
              background: outstanding > 0 ? 'rgba(224,90,77,0.15)' : 'rgba(58,168,115,0.12)',
              border: `1px solid ${outstanding > 0 ? 'rgba(224,90,77,0.35)' : 'rgba(58,168,115,0.3)'}`,
              borderRadius: 14, padding: '16px 22px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#8a9a88', fontFamily: 'monospace', marginBottom: 6 }}>Outstanding Balance</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: outstanding > 0 ? '#f0857a' : '#63c898', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
                ₹{Math.round(outstanding).toLocaleString('en-IN')}
              </div>
              {outstanding > 0 && (
                <a href={upiLink} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                  padding: '8px 18px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(180deg, #f2b843, #cf8f10)', color: '#2a1a02',
                }}>
                  💳 Pay via UPI
                </a>
              )}
              {outstanding === 0 && (
                <div style={{ fontSize: 11, color: '#63c898', marginTop: 6 }}>All invoices cleared ✓</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>

        {/* Invoice history */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0e8d4', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 16, height: 16, color: '#e2a11d' }} />
            Invoices ({clientInvoices.length})
          </div>
          {clientInvoices.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#5c4e3b', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>No invoices yet.</div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
              {clientInvoices.map((inv, idx) => {
                const total = inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100);
                const paid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
                const st = STATUS_STYLE[inv.status];
                return (
                  <div key={inv.id} style={{ padding: '14px 18px', borderBottom: idx < clientInvoices.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13.5, color: '#f0e8d4' }}>{inv.invoice_no}</div>
                      <div style={{ fontSize: 11.5, color: '#5c4e3b', fontFamily: 'monospace', marginTop: 2 }}>{inv.date}{inv.due_date ? ` · Due: ${inv.due_date}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#f0e8d4' }}>₹{Math.round(total).toLocaleString('en-IN')}</div>
                        {paid > 0 && <div style={{ fontSize: 10.5, color: '#63c898', fontFamily: 'monospace' }}>Paid: ₹{Math.round(paid).toLocaleString('en-IN')}</div>}
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{inv.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trip history */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0e8d4', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Car style={{ width: 16, height: 16, color: '#e2a11d' }} />
            Trip History ({clientTrips.length})
          </div>
          {clientTrips.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#5c4e3b', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>No trips logged for this client yet.</div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
              {clientTrips.slice(0, 30).map((t, idx) => (
                <div key={t.id} style={{ padding: '12px 18px', borderBottom: idx < Math.min(clientTrips.length, 30) - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e2a11d', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f0e8d4' }}>{t.location}</div>
                      <div style={{ fontSize: 11, color: '#5c4e3b', fontFamily: 'monospace', marginTop: 1 }}>{t.date} · {t.vehicle_no} · {t.emp_count} pax</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#8a9a88' }}>{t.status}</span>
                </div>
              ))}
              {clientTrips.length > 30 && (
                <div style={{ padding: '10px 18px', textAlign: 'center', fontSize: 11.5, color: '#5c4e3b' }}>
                  +{clientTrips.length - 30} more trips not shown
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.07)', color: '#3a2c18', fontSize: 11.5 }}>
          <div style={{ color: '#5c4e3b', marginBottom: 4 }}>Kavya Tours & Travels · Fleet Billing System</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10 }}>This is a read-only client portal. For queries, contact your account manager.</div>
        </div>
      </div>
    </div>
  );
}
