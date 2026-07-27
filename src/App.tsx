/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Car, FileText, Settings, Menu, Database, Activity, Sun, Moon, LayoutDashboard, Users, Briefcase, BarChart3, Wrench } from 'lucide-react';
import { Vehicle, Rate, Trip, Adjustment, Driver, DriverPayout, Client, Invoice, Payment, MaintenanceLog, TripStatus, InvoiceStatus, AppNotification } from './types';
import { getSeedData } from './seedData';
import NotificationBell from './components/NotificationBell';
import DiagnosticConsole from './components/DiagnosticConsole';
import DashboardScreen from './components/DashboardScreen';
import TripEntryScreen from './components/TripEntryScreen';
import FleetScreen from './components/FleetScreen';
import RateManagerScreen from './components/RateManagerScreen';
import BillViewScreen from './components/BillViewScreen';
import DriverScreen from './components/DriverScreen';
import ClientScreen from './components/ClientScreen';
import ReportsScreen from './components/ReportsScreen';

const LS = 'kavya_tours_';
type Tab = 'dashboard' | 'trips' | 'fleet' | 'rates' | 'billing' | 'drivers' | 'clients' | 'reports';

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(LS + key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  localStorage.setItem(LS + key, JSON.stringify(value));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem(LS + 'theme') as 'dark' | 'light') || 'dark');

  // Core state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [driverPayouts, setDriverPayouts] = useState<DriverPayout[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Theme
  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    lsSet('theme', theme);
  }, [theme]);

  // Boot: load from localStorage or seed
  useEffect(() => {
    const sv = localStorage.getItem(LS + 'vehicles');
    const sr = localStorage.getItem(LS + 'rates');
    if (sv && sr) {
      setVehicles(JSON.parse(sv));
      setRates(JSON.parse(sr));
      const st = localStorage.getItem(LS + 'trips');
      // Migrate trips: ensure status field exists
      const rawTrips: Trip[] = st ? JSON.parse(st) : [];
      setTrips(rawTrips.map(t => ({ ...t, status: t.status || 'Completed' })));
      setAdjustments(lsGet('adjustments', []));
      setDrivers(lsGet('drivers', []));
      setClients(lsGet('clients', []));
      setInvoices(lsGet('invoices', []));
      setPayments(lsGet('payments', []));
      setMaintenanceLogs(lsGet('maintenance_logs', []));
      setDriverPayouts(lsGet('driver_payouts', []));
    } else {
      doResetToSeed();
    }
  }, []);

  function doResetToSeed() {
    const seed = getSeedData();
    setVehicles(seed.vehicles);
    setRates(seed.rates);
    setTrips(seed.trips);
    setAdjustments(seed.adjustments);
    setDrivers(seed.drivers);
    setClients(seed.clients);
    setInvoices([]);
    setPayments([]);
    setMaintenanceLogs([]);
    setDriverPayouts([]);
  }

  // Persist all state
  useEffect(() => { if (vehicles.length > 0) lsSet('vehicles', vehicles); }, [vehicles]);
  useEffect(() => { if (rates.length > 0) lsSet('rates', rates); }, [rates]);
  useEffect(() => { lsSet('trips', trips); }, [trips]);
  useEffect(() => { lsSet('adjustments', adjustments); }, [adjustments]);
  useEffect(() => { lsSet('drivers', drivers); }, [drivers]);
  useEffect(() => { lsSet('clients', clients); }, [clients]);
  useEffect(() => { lsSet('invoices', invoices); }, [invoices]);
  useEffect(() => { lsSet('payments', payments); }, [payments]);
  useEffect(() => { lsSet('maintenance_logs', maintenanceLogs); }, [maintenanceLogs]);
  useEffect(() => { lsSet('driver_payouts', driverPayouts); }, [driverPayouts]);

  // ── Notification System ──
  function generateNotifications(): AppNotification[] {
    const today = new Date().toISOString().slice(0, 10);
    const alerts: AppNotification[] = [];
    // Vehicle doc expiry (<=30 days)
    for (const v of vehicles) {
      const checks: [string, string | undefined, string][] = [
        ['ins', v.insurance_expiry, 'Insurance'], ['permit', v.permit_expiry, 'Permit'], ['puc', v.puc_expiry, 'PUC'],
      ];
      for (const [key, exp, label] of checks) {
        if (!exp) continue;
        const d = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
        if (d <= 30) alerts.push({
          id: `expiry-${v.vehicle_no}-${key}`, type: 'doc_expiry',
          message: `${v.vehicle_no} ${label} ${d <= 0 ? 'EXPIRED' : `expires in ${d} day${d > 1 ? 's' : ''}`}`,
          target_tab: 'fleet', read: false, created_at: today, days_left: d,
        });
      }
    }
    // Driver license expiry (<=30 days)
    for (const d of drivers) {
      const days = Math.ceil((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
      if (days <= 30) alerts.push({
        id: `license-${d.id}`, type: 'license_expiry',
        message: `${d.name}'s license ${days <= 0 ? 'EXPIRED' : `expires in ${days} day${days > 1 ? 's' : ''}`}`,
        target_tab: 'drivers', read: false, created_at: today, days_left: days,
      });
    }
    // Overdue invoices
    for (const inv of invoices) {
      if (inv.status === 'Overdue') alerts.push({
        id: `overdue-${inv.id}`, type: 'invoice_overdue',
        message: `Invoice ${inv.invoice_no} is overdue (₹${Math.round(inv.amount).toLocaleString('en-IN')})`,
        target_tab: 'billing', read: false, created_at: today,
      });
    }
    // Completed trips that might need billing (trips with status Completed but no corresponding invoice)
    const completedWithoutBill = trips.filter(t =>
      t.status === 'Completed' &&
      !invoices.some(inv => inv.month === t.date.slice(0, 7) && (inv.client_id === t.client_id || !t.client_id))
    );
    if (completedWithoutBill.length > 0) {
      alerts.push({
        id: `trip-complete-batch`, type: 'trip_complete',
        message: `${completedWithoutBill.length} completed trip${completedWithoutBill.length > 1 ? 's' : ''} may need billing`,
        target_tab: 'billing', read: false, created_at: today,
      });
    }
    // Preserve read state from previous
    const prevReadIds = new Set(
      (lsGet<AppNotification[]>('notifications', []))
        .filter(n => n.read)
        .map(n => n.id)
    );
    return alerts.map(a => ({ ...a, read: prevReadIds.has(a.id) }));
  }

  // Regenerate on every relevant state change (mimics "on app load")
  useEffect(() => {
    if (vehicles.length === 0) return;
    const notifs = generateNotifications();
    setNotifications(notifs);
    lsSet('notifications', notifs);
  }, [vehicles, drivers, invoices, trips]);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      lsSet('notifications', updated);
      return updated;
    });
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      lsSet('notifications', updated);
      return updated;
    });
  };

  // ── Trip handlers ──
  const handleAddTrip = (d: Omit<Trip, 'id'>) =>
    setTrips(p => [{ ...d, id: `trip-${uid()}` }, ...p]);
  const handleDeleteTrip = (id: string) =>
    setTrips(p => p.filter(t => t.id !== id));
  const handleUpdateTripStatus = (id: string, status: TripStatus) =>
    setTrips(p => p.map(t => t.id === id ? { ...t, status } : t));

  // ── Vehicle handlers ──
  const handleAddVehicle = (v: Vehicle) => {
    if (vehicles.some(x => x.vehicle_no === v.vehicle_no)) { alert(`Vehicle ${v.vehicle_no} already registered!`); return; }
    setVehicles(p => [...p, v]);
  };
  const handleUpdateVehicle = (v: Vehicle) =>
    setVehicles(p => p.map(x => x.vehicle_no === v.vehicle_no ? v : x));
  const handleDeleteVehicle = (no: string) => {
    setVehicles(p => p.filter(v => v.vehicle_no !== no));
    setRates(p => p.filter(r => r.vehicle_no !== no));
    setTrips(p => p.filter(t => t.vehicle_no !== no));
    setAdjustments(p => p.filter(a => a.vehicle_no !== no));
    setMaintenanceLogs(p => p.filter(m => m.vehicle_no !== no));
  };

  // ── Rate handlers ──
  const handleAddRate = (r: Rate) =>
    setRates(p => {
      const f = p.filter(x => !(x.vehicle_no === r.vehicle_no && x.location.toLowerCase() === r.location.toLowerCase() && x.trip_type === r.trip_type && x.client_id === r.client_id));
      return [...f, r];
    });
  const handleUpdateRate = (no: string, loc: string, val: number) =>
    setRates(p => p.map(r => r.vehicle_no === no && r.location.toLowerCase() === loc.toLowerCase() ? { ...r, rate: val } : r));
  const handleDeleteRate = (no: string, loc: string) =>
    setRates(p => p.filter(r => !(r.vehicle_no === no && r.location.toLowerCase() === loc.toLowerCase())));

  // ── Adjustment handler ──
  const handleUpdateAdjustment = (d: Omit<Adjustment, 'id'>) =>
    setAdjustments(p => {
      const i = p.findIndex(a => a.vehicle_no === d.vehicle_no && a.month === d.month);
      if (i >= 0) { const u = [...p]; u[i] = { ...u[i], ...d }; return u; }
      return [...p, { ...d, id: `adj-${uid()}` }];
    });

  // ── Maintenance log handlers ──
  const handleAddMaintenanceLog = (log: Omit<MaintenanceLog, 'id'>) =>
    setMaintenanceLogs(p => [...p, { ...log, id: `maint-${uid()}` }]);
  const handleDeleteMaintenanceLog = (id: string) =>
    setMaintenanceLogs(p => p.filter(m => m.id !== id));

  // ── Driver handlers ──
  const handleAddDriver = (d: Omit<Driver, 'id'>) =>
    setDrivers(p => [...p, { ...d, id: `drv-${uid()}` }]);
  const handleUpdateDriver = (d: Driver) =>
    setDrivers(p => p.map(x => x.id === d.id ? d : x));
  const handleDeleteDriver = (id: string) =>
    setDrivers(p => p.filter(d => d.id !== id));
  const handleUpsertDriverPayout = (payload: Omit<DriverPayout, 'id'>) =>
    setDriverPayouts(p => {
      const i = p.findIndex(x => x.driver_id === payload.driver_id && x.month === payload.month);
      if (i >= 0) { const u = [...p]; u[i] = { ...u[i], ...payload }; return u; }
      return [...p, { ...payload, id: `dpay-${uid()}` }];
    });

  // ── Client handlers ──
  const handleAddClient = (c: Omit<Client, 'id'>) =>
    setClients(p => [...p, { ...c, id: `cli-${uid()}` }]);
  const handleUpdateClient = (c: Client) =>
    setClients(p => p.map(x => x.id === c.id ? c : x));
  const handleDeleteClient = (id: string) =>
    setClients(p => p.filter(c => c.id !== id));

  // ── Invoice handlers ──
  const handleAddInvoice = (inv: Omit<Invoice, 'id'>) =>
    setInvoices(p => [...p, { ...inv, id: `inv-${uid()}` }]);
  const handleUpdateInvoiceStatus = (id: string, status: InvoiceStatus) =>
    setInvoices(p => p.map(i => i.id === id ? { ...i, status } : i));

  // ── Payment handler ──
  const handleAddPayment = (pay: Omit<Payment, 'id'>) => {
    setPayments(p => [...p, { ...pay, id: `pay-${uid()}` }]);
    // Auto-update invoice status
    const inv = invoices.find(i => i.id === pay.invoice_id);
    if (inv) {
      const totalPaid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0) + pay.amount;
      const totalDue = inv.amount * (1 + (inv.is_interstate ? inv.igst_pct : inv.cgst_pct + inv.sgst_pct) / 100);
      if (totalPaid >= totalDue) handleUpdateInvoiceStatus(inv.id, 'Paid');
      else if (totalPaid > 0) handleUpdateInvoiceStatus(inv.id, 'Partially Paid');
    }
  };

  // ── Badge counts ──
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }, []);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayTrips  = useMemo(() => trips.filter(t => t.date === today).length, [trips, today]);
  const monthTrips  = useMemo(() => trips.filter(t => t.date.startsWith(currentMonth)).length, [trips, currentMonth]);

  const expiryAlertCount = useMemo(() => {
    let n = 0;
    for (const v of vehicles) {
      for (const d of [v.insurance_expiry, v.permit_expiry, v.puc_expiry]) {
        const days = daysUntil(d);
        if (days !== null && days <= 30) n++;
      }
    }
    for (const d of drivers) {
      const days = daysUntil(d.license_expiry);
      if (days !== null && days <= 30) n++;
    }
    return n;
  }, [vehicles, drivers]);

  const pendingInvoiceCount = useMemo(() =>
    invoices.filter(i => i.status !== 'Paid').length, [invoices]);

  const fleetAlertCount = useMemo(() => {
    let n = 0;
    for (const v of vehicles) {
      const urgent = [v.insurance_expiry, v.permit_expiry, v.puc_expiry].some(d => { const days = daysUntil(d); return days !== null && days <= 30; });
      if (urgent) n++;
    }
    return n;
  }, [vehicles]);

  type NavItem = { id: Tab; label: string; sub: string; icon: React.ReactNode; badge: number | string };
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard',    sub: 'Overview & alerts',    icon: <LayoutDashboard className="sidebar-nav-icon" />, badge: expiryAlertCount || '' },
    { id: 'trips',     label: 'Trip Entry',   sub: 'Log daily fleet runs', icon: <Calendar className="sidebar-nav-icon" />,        badge: monthTrips },
    { id: 'fleet',     label: 'Fleet',        sub: 'Vehicles & maintenance',icon: <Car className="sidebar-nav-icon" />,            badge: fleetAlertCount || vehicles.length },
    { id: 'rates',     label: 'Rate Manager', sub: 'Rates & adjustments',  icon: <Settings className="sidebar-nav-icon" />,        badge: rates.length },
    { id: 'billing',   label: 'Bill View',    sub: 'Invoices & payments',  icon: <FileText className="sidebar-nav-icon" />,        badge: pendingInvoiceCount || '→' },
    { id: 'drivers',   label: 'Drivers',      sub: 'Driver payouts',       icon: <Users className="sidebar-nav-icon" />,           badge: drivers.length },
    { id: 'clients',   label: 'Clients',      sub: 'CRM & outstanding',    icon: <Briefcase className="sidebar-nav-icon" />,       badge: clients.length },
    { id: 'reports',   label: 'Reports',      sub: 'GST, P&L, CSV export', icon: <BarChart3 className="sidebar-nav-icon" />,       badge: '' },
  ];

  const pageMeta: Record<Tab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard',    subtitle: 'Fleet overview & key alerts' },
    trips:     { title: 'Trip Entry',   subtitle: 'Log daily fleet operations' },
    fleet:     { title: 'Fleet',        subtitle: 'Vehicles, maintenance & P&L' },
    rates:     { title: 'Rate Manager', subtitle: 'Configure billing rates & adjustments' },
    billing:   { title: 'Bill View',    subtitle: 'Generate invoices & record payments' },
    drivers:   { title: 'Drivers',      subtitle: 'Driver registry & payout ledger' },
    clients:   { title: 'Clients',      subtitle: 'Client CRM & outstanding balances' },
    reports:   { title: 'Reports',      subtitle: 'GST summary, P&L reports & CSV export' },
  };

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSidebarOpen(false); };

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-overlay animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="sidebar-logo-mark">K</div>
              <div>
                <div className="sidebar-brand-name">Kavya Tours</div>
                <div className="sidebar-brand-sub">Billing Ledger</div>
              </div>
            </div>
            <div
              className="sidebar-brand-pill"
              onDoubleClick={() => setShowDiagnostics(v => !v)}
              style={{ cursor: 'pointer' }}
              title="Double-click to toggle developer diagnostics"
            >
              <span className="sidebar-brand-pill-dot" />
              Live · v3.1
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              {item.icon}
              <div className="sidebar-nav-label">
                <span className="sidebar-nav-label-main" style={{ fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
                <span className="sidebar-nav-label-sub">{item.sub}</span>
              </div>
              {item.badge !== '' && <span className="sidebar-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stat-box">
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Activity style={{ width: 9, height: 9, color: 'var(--green)', opacity: 0.9 }} />
              Fleet Pulse
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { label: 'Today', value: todayTrips,      color: 'var(--t1)' },
                { label: 'Month', value: monthTrips,      color: 'var(--gold)' },
                { label: 'Fleet', value: vehicles.length, color: 'var(--green-light)' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingRight: i < 2 ? 10 : 0, paddingLeft: i > 0 ? 10 : 0 }}>
                  <div style={{ fontSize: 8, color: 'var(--t4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.06em' }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.8px', lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 9, color: 'rgba(240,165,0,0.16)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            © 2026 KAVYA TOURS & TRAVELS
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <div className="main-canvas">
        <header className="topbar no-print">
          <div className="layout-row-center">
            <button onClick={() => setSidebarOpen(v => !v)} style={{ display: 'none' }} className="mobile-menu-btn">
              <Menu style={{ width: 18, height: 18 }} />
            </button>
            <div>
              <h1 className="topbar-title font-display">{pageMeta[activeTab].title}</h1>
              <p className="topbar-sub">{pageMeta[activeTab].subtitle}</p>
            </div>
          </div>
          <div className="layout-row-center">
            <NotificationBell
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onNavigate={(tab) => setActiveTab(tab as Tab)}
            />
            <button onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} className="theme-toggle-btn" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
            <div className="topbar-date-chip">
              <div className="topbar-dot animate-live" />
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        <main className="page-content">
          {showDiagnostics && (
            <div className="animate-fade-up no-print" style={{ marginBottom: 22 }}>
              <DiagnosticConsole vehicles={vehicles} rates={rates} trips={trips} adjustments={adjustments} onResetToSeed={doResetToSeed} />
            </div>
          )}

          <div className="animate-fade-up" key={activeTab}>
            {activeTab === 'dashboard' && (
              <DashboardScreen
                trips={trips} vehicles={vehicles} drivers={drivers} clients={clients}
                invoices={invoices} payments={payments} rates={rates} adjustments={adjustments}
                maintenanceLogs={maintenanceLogs}
              />
            )}
            {activeTab === 'trips' && (
              <TripEntryScreen
                vehicles={vehicles} rates={rates} trips={trips} drivers={drivers} clients={clients}
                onAddTrip={handleAddTrip} onDeleteTrip={handleDeleteTrip}
                onUpdateTripStatus={handleUpdateTripStatus}
              />
            )}
            {activeTab === 'fleet' && (
              <FleetScreen
                vehicles={vehicles} maintenanceLogs={maintenanceLogs} rates={rates}
                trips={trips} adjustments={adjustments}
                onAddVehicle={handleAddVehicle} onUpdateVehicle={handleUpdateVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                onAddMaintenanceLog={handleAddMaintenanceLog}
                onDeleteMaintenanceLog={handleDeleteMaintenanceLog}
              />
            )}
            {activeTab === 'rates' && (
              <RateManagerScreen
                vehicles={vehicles} rates={rates} adjustments={adjustments} clients={clients}
                onAddRate={handleAddRate} onUpdateRate={handleUpdateRate} onDeleteRate={handleDeleteRate}
                onUpdateAdjustment={handleUpdateAdjustment}
              />
            )}
            {activeTab === 'billing' && (
              <BillViewScreen
                vehicles={vehicles} rates={rates} trips={trips} adjustments={adjustments}
                clients={clients} invoices={invoices} payments={payments}
                onAddInvoice={handleAddInvoice} onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                onAddPayment={handleAddPayment}
              />
            )}
            {activeTab === 'drivers' && (
              <DriverScreen
                drivers={drivers} driverPayouts={driverPayouts} trips={trips} vehicles={vehicles}
                onAddDriver={handleAddDriver} onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver} onUpsertDriverPayout={handleUpsertDriverPayout}
              />
            )}
            {activeTab === 'clients' && (
              <ClientScreen
                clients={clients} trips={trips} invoices={invoices} payments={payments}
                onAddClient={handleAddClient} onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsScreen
                vehicles={vehicles} trips={trips} rates={rates} adjustments={adjustments}
                invoices={invoices} payments={payments} maintenanceLogs={maintenanceLogs}
                drivers={drivers} driverPayouts={driverPayouts} clients={clients}
              />
            )}
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .mobile-menu-btn { display: flex !important; } }
      `}</style>
    </div>
  );
}
