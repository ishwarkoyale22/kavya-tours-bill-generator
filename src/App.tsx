/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Car, FileText, Settings, Menu, Database, Activity, Sun, Moon } from 'lucide-react';
import { Vehicle, Rate, Trip, Adjustment } from './types';
import { getSeedData } from './seedData';
import DiagnosticConsole from './components/DiagnosticConsole';
import TripEntryScreen from './components/TripEntryScreen';
import RateManagerScreen from './components/RateManagerScreen';
import BillViewScreen from './components/BillViewScreen';

const LOCAL_STORAGE_KEY_PREFIX = 'kavya_tours_';
type Tab = 'trips' | 'rates' | 'billing';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('trips');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('kavya_tours_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.add('theme-dark');
    }
    localStorage.setItem('kavya_tours_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    try {
      const sv = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}vehicles`);
      const sr = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}rates`);
      const st = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}trips`);
      const sa = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}adjustments`);
      if (sv && sr) {
        setVehicles(JSON.parse(sv));
        setRates(JSON.parse(sr));
        setTrips(st ? JSON.parse(st) : []);
        setAdjustments(sa ? JSON.parse(sa) : []);
      } else { handleResetToSeed(); }
    } catch { handleResetToSeed(); }
  }, []);

  useEffect(() => { if (vehicles.length > 0) localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}vehicles`, JSON.stringify(vehicles)); }, [vehicles]);
  useEffect(() => { if (rates.length > 0) localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}rates`, JSON.stringify(rates)); }, [rates]);
  useEffect(() => { localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}trips`, JSON.stringify(trips)); }, [trips]);
  useEffect(() => { localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}adjustments`, JSON.stringify(adjustments)); }, [adjustments]);

  const handleResetToSeed = () => {
    const seed = getSeedData();
    setVehicles(seed.vehicles); setRates(seed.rates);
    setTrips(seed.trips); setAdjustments(seed.adjustments);
  };

  const handleAddTrip = (d: Omit<Trip, 'id'>) => setTrips(p => [{ ...d, id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` }, ...p]);
  const handleDeleteTrip = (id: string) => setTrips(p => p.filter(t => t.id !== id));
  const handleAddVehicle = (v: Vehicle) => {
    if (vehicles.some(x => x.vehicle_no === v.vehicle_no)) { alert(`Vehicle ${v.vehicle_no} already registered!`); return; }
    setVehicles(p => [...p, v]);
  };
  const handleDeleteVehicle = (no: string) => {
    setVehicles(p => p.filter(v => v.vehicle_no !== no));
    setRates(p => p.filter(r => r.vehicle_no !== no));
    setTrips(p => p.filter(t => t.vehicle_no !== no));
    setAdjustments(p => p.filter(a => a.vehicle_no !== no));
  };
  const handleAddRate = (r: Rate) => setRates(p => {
    const f = p.filter(x => !(x.vehicle_no === r.vehicle_no && x.location.toLowerCase() === r.location.toLowerCase()));
    return [...f, r];
  });
  const handleUpdateRate = (no: string, loc: string, val: number) =>
    setRates(p => p.map(r => r.vehicle_no === no && r.location.toLowerCase() === loc.toLowerCase() ? { ...r, rate: val } : r));
  const handleDeleteRate = (no: string, loc: string) =>
    setRates(p => p.filter(r => !(r.vehicle_no === no && r.location.toLowerCase() === loc.toLowerCase())));
  const handleUpdateAdjustment = (d: Omit<Adjustment, 'id'>) => setAdjustments(p => {
    const i = p.findIndex(a => a.vehicle_no === d.vehicle_no && a.month === d.month);
    if (i >= 0) { const u = [...p]; u[i] = { ...u[i], ...d }; return u; }
    return [...p, { ...d, id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` }];
  });

  const pageMeta: Record<Tab, { title: string; subtitle: string }> = {
    trips:   { title: 'Trip Entry',   subtitle: 'Log daily fleet operations' },
    rates:   { title: 'Rate Manager', subtitle: 'Configure vehicles & billing rates' },
    billing: { title: 'Bill View',    subtitle: 'Generate & print monthly invoices' },
  };

  const today = (() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; })();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayTrips = trips.filter(t => t.date === today).length;
  const monthTrips = trips.filter(t => t.date.startsWith(currentMonth)).length;

  const navItems: { id: Tab; label: string; sub: string; icon: React.ReactNode; badge: number | string }[] = [
    { id: 'trips'  , label: 'Trip Entry',   sub: 'Log daily fleet runs',    icon: <Calendar className="sidebar-nav-icon" />, badge: monthTrips   },
    { id: 'rates'  , label: 'Rate Manager', sub: 'Rates, vehicles & adj.',  icon: <Settings className="sidebar-nav-icon" />, badge: vehicles.length },
    { id: 'billing', label: 'Bill View',    sub: 'Generate monthly invoice', icon: <FileText className="sidebar-nav-icon" />, badge: '→'           },
  ];

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setSidebarOpen(false); };


  return (
    <div className="app-shell">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

        {/* Brand Header — Textured Panel */}
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
              Live · v2.0
            </div>
          </div>
        </div>

        {/* Nav */}
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
              <span className="sidebar-nav-badge">{item.badge}</span>
            </button>
          ))}
        </nav>

        {/* Footer — Fleet Pulse */}
        <div className="sidebar-footer">
          <div className="sidebar-stat-box">
            <div style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(240,165,0,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Activity style={{ width: 9, height: 9, color: 'var(--green)', opacity: 0.9 }} />
              Fleet Pulse
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { label: 'Today',  value: todayTrips,      color: 'var(--t1)' },
                { label: 'Month',  value: monthTrips,      color: 'var(--gold)' },
                { label: 'Fleet',  value: vehicles.length,  color: 'var(--green-light)' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: 1,
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  paddingRight: i < 2 ? 10 : 0,
                  paddingLeft: i > 0 ? 10 : 0,
                }}>
                  <div style={{ fontSize: 8, color: 'var(--t4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.06em' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.8px', lineHeight: 1 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            marginTop: 10, textAlign: 'center',
            fontSize: 9, color: 'rgba(240,165,0,0.16)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          }}>
            © 2026 KAVYA TOURS & TRAVELS
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <div className="main-canvas">

        {/* Topbar */}
        <header className="topbar no-print">
          <div className="layout-row-center">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{ display: 'none' }}
              className="mobile-menu-btn"
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>
            <div>
              <h1 className="topbar-title font-display">{pageMeta[activeTab].title}</h1>
              <p className="topbar-sub">{pageMeta[activeTab].subtitle}</p>
            </div>
          </div>

          <div className="layout-row-center">
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
            <div className="topbar-date-chip">
              <div className="topbar-dot animate-live" />
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {showDiagnostics && (
            <div className="animate-fade-up no-print" style={{ marginBottom: 22 }}>
              <DiagnosticConsole vehicles={vehicles} rates={rates} trips={trips} adjustments={adjustments} onResetToSeed={handleResetToSeed} />
            </div>
          )}
          <div className="animate-fade-up" key={activeTab}>
            {activeTab === 'trips'   && <TripEntryScreen vehicles={vehicles} rates={rates} trips={trips} onAddTrip={handleAddTrip} onDeleteTrip={handleDeleteTrip} />}
            {activeTab === 'rates'   && <RateManagerScreen vehicles={vehicles} rates={rates} adjustments={adjustments} onAddVehicle={handleAddVehicle} onDeleteVehicle={handleDeleteVehicle} onAddRate={handleAddRate} onUpdateRate={handleUpdateRate} onDeleteRate={handleDeleteRate} onUpdateAdjustment={handleUpdateAdjustment} />}
            {activeTab === 'billing' && <BillViewScreen vehicles={vehicles} rates={rates} trips={trips} adjustments={adjustments} />}
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .mobile-menu-btn { display: flex !important; } }
      `}</style>
    </div>
  );
}
