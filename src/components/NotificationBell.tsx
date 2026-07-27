/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, FileText, CheckCircle2, Car, X, Check } from 'lucide-react';
import { AppNotification, NotificationType } from '../types';

interface Props {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (tab: string) => void;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  doc_expiry:      { icon: <Car style={{ width: 13, height: 13 }} />,           color: 'var(--amber)',      bg: 'var(--amber-dim)',  border: 'var(--amber-border)' },
  license_expiry:  { icon: <AlertTriangle style={{ width: 13, height: 13 }} />, color: 'var(--red-light)', bg: 'var(--red-dim)',    border: 'var(--red-border)'   },
  invoice_overdue: { icon: <FileText style={{ width: 13, height: 13 }} />,      color: 'var(--red-light)', bg: 'var(--red-dim)',    border: 'var(--red-border)'   },
  trip_complete:   { icon: <CheckCircle2 style={{ width: 13, height: 13 }} />,  color: 'var(--green-light)', bg: 'var(--green-dim)', border: 'var(--green-border)' },
};

const TAB_LABELS: Record<string, string> = {
  fleet: 'Fleet', drivers: 'Drivers', billing: 'Bill View', trips: 'Trips',
};

export default function NotificationBell({ notifications, onMarkRead, onMarkAllRead, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="theme-toggle-btn"
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell style={{ width: 17, height: 17 }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, padding: '0 4px',
            background: 'var(--red)',
            color: '#fff', fontSize: 9, fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid var(--bg)',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 360, maxHeight: 480,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-2)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 999,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scale-in 0.2s var(--ease-spring) both',
        }} className="animate-scale-in">
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell style={{ width: 14, height: 14, color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ padding: '1px 7px', borderRadius: 99, background: 'var(--red-dim)', color: 'var(--red-light)', fontSize: 10, fontWeight: 700, border: '1px solid var(--red-border)' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} className="btn btn-secondary btn-sm" style={{ fontSize: 10.5, padding: '4px 9px', borderRadius: 8 }}>
                  <Check style={{ width: 10, height: 10 }} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn btn-secondary btn-icon" style={{ padding: 5, borderRadius: 8 }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
                <CheckCircle2 style={{ width: 28, height: 28, margin: '0 auto 10px', color: 'var(--green)' }} />
                <div style={{ fontWeight: 600 }}>All clear!</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>No alerts at the moment.</div>
              </div>
            ) : (
              notifications.map((notif, idx) => {
                const cfg = TYPE_CONFIG[notif.type];
                return (
                  <div
                    key={notif.id}
                    onClick={() => onMarkRead(notif.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                      background: notif.read ? 'transparent' : 'rgba(226,161,29,0.04)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: notif.read ? 'var(--t2)' : 'var(--t1)', fontWeight: notif.read ? 400 : 600, lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <button
                          onClick={e => { e.stopPropagation(); onMarkRead(notif.id); onNavigate(notif.target_tab); setOpen(false); }}
                          style={{
                            fontSize: 10.5, padding: '3px 8px', borderRadius: 7,
                            background: 'var(--surface)', border: '1px solid var(--border-2)',
                            color: 'var(--t2)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            fontWeight: 600,
                          }}
                        >
                          View →
                        </button>
                        {!notif.read && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-3)', fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
            Refreshed on every app load · kavya_tours_notifications
          </div>
        </div>
      )}
    </div>
  );
}
