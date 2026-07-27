/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Trip } from '../types';

interface Props {
  vehicleNo: string;
  trips: Trip[];
}

function buildCalendar(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VehicleCalendarTab({ vehicleNo, trips }: Props) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected]   = useState<string | null>(null);

  const vehicleTrips = useMemo(() =>
    trips.filter(t => t.vehicle_no === vehicleNo),
    [trips, vehicleNo]);

  const bookedDates = useMemo(() => {
    const map: { [date: string]: Trip[] } = {};
    for (const t of vehicleTrips) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [vehicleTrips]);

  const weeks = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelected(null);
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const selectedTrips = selected ? (bookedDates[selected] || []) : [];
  const monthTotal = Object.entries(bookedDates)
    .filter(([date]) => date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`))
    .reduce((s, [, t]) => s + (t as Trip[]).length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <button onClick={prevMonth} className="btn btn-secondary btn-icon btn-sm">
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t1)' }}>{monthLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {monthTotal} trip{monthTotal !== 1 ? 's' : ''} this month · {vehicleNo}
          </div>
        </div>
        <button onClick={nextMonth} className="btn btn-secondary btn-icon btn-sm">
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, paddingLeft: 4 }}>
        {[
          { color: 'var(--red-dim)', border: 'var(--red-border)', text: 'var(--red-light)', label: 'Booked' },
          { color: 'var(--green-dim)', border: 'var(--green-border)', text: 'var(--green-light)', label: 'Available' },
          { color: 'var(--gold-dim)', border: 'var(--gold-glow)', text: 'var(--gold)', label: 'Today' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, border: `1px solid ${l.border}` }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ padding: '10px 4px', minHeight: 46 }} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTrips = bookedDates[dateStr] || [];
              const isBooked = dayTrips.length > 0;
              const isToday  = dateStr === todayStr;
              const isSelected = selected === dateStr;
              return (
                <div
                  key={di}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  style={{
                    padding: '8px 4px',
                    minHeight: 46,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'var(--gold-dim)'
                      : isBooked
                        ? 'var(--red-dim)'
                        : 'transparent',
                    border: isSelected ? '1px solid var(--gold)' : '1px solid transparent',
                    borderRadius: 8,
                    margin: 2,
                    transition: 'background 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: isToday ? 'var(--gold)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: isToday ? 800 : 500,
                    fontSize: 13,
                    color: isToday ? '#2a1a02' : isBooked ? 'var(--red-light)' : 'var(--t2)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {day}
                  </div>
                  {isBooked && (
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-light)', lineHeight: 1 }}>
                      {dayTrips.length}×
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="card animate-fade-up">
          <div className="card-header">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>
              {new Date(selected + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedTrips.length > 0
                ? <span className="badge badge-red">{selectedTrips.length} trip{selectedTrips.length > 1 ? 's' : ''}</span>
                : <span className="badge badge-emerald">Free</span>
              }
              <button onClick={() => setSelected(null)} className="btn btn-secondary btn-icon btn-sm">
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>
          {selectedTrips.length === 0 ? (
            <div className="card-body" style={{ padding: '14px 18px', color: 'var(--green-light)', fontSize: 13 }}>
              No trips booked — vehicle is available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selectedTrips.map((t, i) => (
                <div key={t.id} style={{ padding: '12px 18px', borderBottom: i < selectedTrips.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red-light)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{t.location}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {t.time || 'No time'} · {t.emp_count} pax
                      {t.driver_id && <span style={{ marginLeft: 8 }}>· Driver assigned</span>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 7,
                    background: 'var(--surface-2)', color: 'var(--t2)',
                  }}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
