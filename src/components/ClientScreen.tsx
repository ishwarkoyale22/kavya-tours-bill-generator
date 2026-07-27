/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Briefcase, Plus, Trash2, Mail, Phone, MapPin, Star, Link2, AlertTriangle } from 'lucide-react';
import { Client, Trip, Invoice, Payment } from '../types';

type CreditState = 'none' | 'ok' | 'near' | 'exceeded';

function creditState(outstanding: number, limit?: number): CreditState {
  if (!limit || limit <= 0) return 'none';
  if (outstanding > limit) return 'exceeded';
  if (outstanding > limit * 0.8) return 'near';
  return 'ok';
}

function CreditBadge({ state }: { state: CreditState }) {
  if (state === 'none' || state === 'ok') return null;
  const exceeded = state === 'exceeded';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 8, fontSize: 9.5, fontWeight: 700,
      background: exceeded ? 'var(--red-dim)' : 'var(--amber-dim)',
      color: exceeded ? 'var(--red-light)' : 'var(--amber)',
      border: `1px solid ${exceeded ? 'var(--red-border)' : 'var(--amber-border)'}`,
    }}>
      <AlertTriangle style={{ width: 8, height: 8 }} />
      {exceeded ? 'Credit Exceeded' : 'Near Limit'}
    </span>
  );
}

interface Props {
  clients: Client[];
  trips: Trip[];
  invoices: Invoice[];
  payments: Payment[];
  onAddClient: (c: Omit<Client, 'id'>) => void;
  onUpdateClient: (c: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientScreen({ clients, trips, invoices, payments, onAddClient, onUpdateClient, onDeleteClient }: Props) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddClient({ name: name.trim(), company: company.trim() || undefined, phone: phone.trim() || 'N/A', email: email.trim() || undefined, gstin: gstin.trim() || undefined, address: address.trim() || undefined, credit_limit: Number(creditLimit) || undefined });
    setName(''); setCompany(''); setPhone(''); setEmail(''); setGstin(''); setAddress(''); setCreditLimit('');
  };

  const handleCopyPortalLink = (clientId: string) => {
    const url = `${window.location.origin}/client/${clientId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(clientId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSaveEdit = (id: string) => {
    const original = clients.find(c => c.id === id);
    if (!original) return;
    onUpdateClient({ ...original, ...editForm });
    setEditingId(null); setEditForm({});
  };

  // Compute per-client stats
  const clientStats = useMemo(() => {
    return clients.map(c => {
      const cTrips = trips.filter(t => t.client_id === c.id || t.client_name === c.name);
      const cInvoices = invoices.filter(i => i.client_id === c.id || i.client_name === c.name);
      const totalBilled = cInvoices.reduce((s, inv) => s + inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100), 0);
      const totalPaid = cInvoices.reduce((s, inv) => {
        const paid = payments.filter(p => p.invoice_id === inv.id).reduce((ss, p) => ss + p.amount, 0);
        return s + paid;
      }, 0);
      const outstanding = Math.max(0, totalBilled - totalPaid);

      // Repeat client: trips in 3+ distinct months
      const months = new Set(cTrips.map(t => t.date.slice(0, 7)));
      const isRepeat = months.size >= 3;

      return { client: c, tripCount: cTrips.length, outstanding, isRepeat, totalBilled, credit: creditState(outstanding, c.credit_limit) };
    });
  }, [clients, trips, invoices, payments]);

  const selectedStats = useMemo(() =>
    selectedClient ? clientStats.find(s => s.client.id === selectedClient) : null,
    [selectedClient, clientStats]);

  const selectedTrips = useMemo(() =>
    selectedClient ? trips.filter(t => t.client_id === selectedClient || t.client_name === clients.find(c => c.id === selectedClient)?.name).sort((a, b) => b.date.localeCompare(a.date)) : [],
    [selectedClient, trips, clients]);

  const selectedInvoices = useMemo(() =>
    selectedClient ? invoices.filter(i => i.client_id === selectedClient || i.client_name === clients.find(c => c.id === selectedClient)?.name) : [],
    [selectedClient, invoices, clients]);

  const totalOutstanding = useMemo(() => clientStats.reduce((s, cs) => s + cs.outstanding, 0), [clientStats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI */}
      <div className="kpi-grid">
        {[
          { cls: 'indigo',  label: 'Total Clients',    value: clients.length,                                sub: 'registered' },
          { cls: 'amber',   label: 'Outstanding',       value: `₹${Math.round(totalOutstanding).toLocaleString('en-IN')}`, sub: 'unpaid balance' },
          { cls: 'emerald', label: 'Repeat Clients',   value: clientStats.filter(s => s.isRepeat).length,  sub: '3+ months active' },
          { cls: 'sky',     label: 'Total Invoiced',   value: `₹${Math.round(clientStats.reduce((s,c) => s+c.totalBilled,0)).toLocaleString('en-IN')}`, sub: 'all time' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1fr 1.3fr' : '1fr', gap: 18 }}>
        {/* Left: Add + list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Add form */}
          <div className="card card-accent-top">
            <div className="card-header">
              <div className="layout-row-center" style={{ gap: 8 }}>
                <Briefcase style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Add Client</span>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Client Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Infosys Ltd" required className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Company</label>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Full company name" className="form-input" />
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">Phone</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 80001 00001" className="form-input" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="transport@company.com" className="form-input" />
                  </div>
                </div>
                <div className="grid-2-columns">
                  <div>
                    <label className="form-label">GSTIN</label>
                    <input type="text" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="27AABCI1234A1ZK" className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }} />
                  </div>
                  <div>
                    <label className="form-label">Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="City, State" className="form-input" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Credit Limit (₹) <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 9 }}>(optional — alerts at 80% and 100%)</span></label>
                  <input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="e.g. 500000" min="0" className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                </div>
                <button type="submit" className="btn btn-primary btn-full"><Plus style={{ width: 14, height: 14 }} /> Add Client</button>
              </form>
            </div>
          </div>

          {/* Client list */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Client Directory</span>
              <span className="badge badge-indigo">{clients.length}</span>
            </div>
            {clients.length === 0 ? (
              <div className="card-body"><div className="empty-state">
                <div className="empty-state-icon"><Briefcase style={{ width: 20, height: 20 }} /></div>
                <div className="empty-state-title">No clients yet</div>
              </div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {clientStats.map((cs, idx) => {
                  const c = cs.client;
                  const isSelected = selectedClient === c.id;
                  const isEditing = editingId === c.id;
                  return (
                    <div key={c.id} onClick={() => !isEditing && setSelectedClient(isSelected ? null : c.id)}
                      style={{
                        padding: '14px 18px', cursor: isEditing ? 'default' : 'pointer',
                        background: isSelected ? 'var(--surface-active)' : 'transparent',
                        borderBottom: idx < clients.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.15s',
                      }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onClick={e => e.stopPropagation()}>
                          <div className="grid-2-columns">
                            <div><label className="form-label">Name</label><input type="text" value={editForm.name ?? c.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="form-input" /></div>
                            <div><label className="form-label">Company</label><input type="text" value={editForm.company ?? c.company ?? ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} className="form-input" /></div>
                          </div>
                          <div className="grid-2-columns">
                            <div><label className="form-label">Phone</label><input type="text" value={editForm.phone ?? c.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="form-input" /></div>
                            <div><label className="form-label">GSTIN</label><input type="text" value={editForm.gstin ?? c.gstin ?? ''} onChange={e => setEditForm(f => ({ ...f, gstin: e.target.value }))} className="form-input" style={{ fontFamily: 'var(--font-mono)' }} /></div>
                          </div>
                          <div>
                            <label className="form-label">Credit Limit (₹)</label>
                            <input type="number" min="0" value={editForm.credit_limit ?? c.credit_limit ?? ''} onChange={e => setEditForm(f => ({ ...f, credit_limit: Number(e.target.value) || undefined }))} placeholder="No limit set" className="form-input" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleSaveEdit(c.id)} className="btn btn-primary btn-sm">Save</button>
                            <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary btn-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t1)' }}>{c.name}</span>
                              {cs.isRepeat && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 8, background: 'rgba(240,165,0,0.15)', color: 'var(--gold)', fontSize: 9.5, fontWeight: 700, border: '1px solid rgba(240,165,0,0.3)' }}>
                                  <Star style={{ width: 8, height: 8 }} /> Repeat
                                </span>
                              )}
                              <CreditBadge state={cs.credit} />
                            </div>
                            {c.company && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{c.company}</div>}
                            <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{cs.tripCount} trips</span>
                              {cs.outstanding > 0 && <span style={{ fontSize: 11.5, color: 'var(--red-light)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{Math.round(cs.outstanding).toLocaleString('en-IN')} due</span>}
                              {c.credit_limit ? <span style={{ fontSize: 11.5, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>limit ₹{c.credit_limit.toLocaleString('en-IN')}</span> : null}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingId(c.id); setEditForm({}); }} className="btn btn-secondary btn-sm btn-icon">✏️</button>
                            <button onClick={() => { if (confirm(`Delete client ${c.name}?`)) { onDeleteClient(c.id); if (selectedClient === c.id) setSelectedClient(null); } }} className="btn btn-danger btn-icon"><Trash2 style={{ width: 12, height: 12 }} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Client detail */}
        {selectedClient && selectedStats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-body">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--t1)', marginBottom: 4 }}>
                  {selectedStats.client.name}
                  {selectedStats.isRepeat && <span style={{ marginLeft: 10, fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(240,165,0,0.15)', color: 'var(--gold)', fontFamily: 'var(--font-sans)' }}>⭐ Repeat Client</span>}
                </div>
                {selectedStats.client.company && <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>{selectedStats.client.company}</div>}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <CreditBadge state={selectedStats.credit} />
                  <button onClick={() => handleCopyPortalLink(selectedStats.client.id)} className="btn btn-secondary btn-sm" style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 8 }}>
                    <Link2 style={{ width: 10, height: 10 }} /> {copiedId === selectedStats.client.id ? 'Copied!' : 'Copy Portal Link'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Trips', value: selectedStats.tripCount, color: 'var(--t1)' },
                    { label: 'Invoiced', value: `₹${Math.round(selectedStats.totalBilled).toLocaleString('en-IN')}`, color: 'var(--green-light)' },
                    { label: 'Outstanding', value: `₹${Math.round(selectedStats.outstanding).toLocaleString('en-IN')}`, color: selectedStats.outstanding > 0 ? 'var(--red-light)' : 'var(--green-light)' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
                      <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: s.color, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {selectedStats.client.phone !== 'N/A' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                      <Phone style={{ width: 11, height: 11 }} />{selectedStats.client.phone}
                    </div>
                  )}
                  {selectedStats.client.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t3)' }}>
                      <Mail style={{ width: 11, height: 11 }} />{selectedStats.client.email}
                    </div>
                  )}
                  {selectedStats.client.gstin && (
                    <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>GSTIN: {selectedStats.client.gstin}</div>
                  )}
                  {selectedStats.client.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t3)' }}>
                      <MapPin style={{ width: 11, height: 11 }} />{selectedStats.client.address}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trip history */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Trip History</span>
                <span className="badge badge-indigo">{selectedTrips.length}</span>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {selectedTrips.length === 0 ? (
                  <div className="card-body"><div style={{ color: 'var(--t3)', fontSize: 12.5, textAlign: 'center', padding: '20px 0' }}>No trips logged for this client.</div></div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Vehicle</th><th>Pickup</th><th>Status</th></tr></thead>
                    <tbody>
                      {selectedTrips.slice(0, 20).map(t => (
                        <tr key={t.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{t.date}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{t.vehicle_no}</td>
                          <td style={{ fontSize: 12.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.location}</td>
                          <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--t2)' }}>{t.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Invoice history */}
            {selectedInvoices.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Invoice History</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Invoice No.</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {selectedInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{inv.invoice_no}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t2)' }}>{inv.date}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{(inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100)).toLocaleString('en-IN')}</td>
                          <td>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                              background: inv.status === 'Paid' ? 'var(--green-dim)' : inv.status === 'Overdue' ? 'var(--red-dim)' : 'var(--amber-dim)',
                              color: inv.status === 'Paid' ? 'var(--green-light)' : inv.status === 'Overdue' ? 'var(--red-light)' : 'var(--amber)',
                            }}>{inv.status}</span>
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
      </div>
    </div>
  );
}
