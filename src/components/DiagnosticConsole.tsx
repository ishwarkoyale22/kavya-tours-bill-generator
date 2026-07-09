/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Vehicle, Rate, Trip, Adjustment } from '../types';
import { verifySeedData } from '../seedData';

interface DiagnosticConsoleProps {
  vehicles: Vehicle[];
  rates: Rate[];
  trips: Trip[];
  adjustments: Adjustment[];
  onResetToSeed: () => void;
}

export default function DiagnosticConsole({
  vehicles,
  rates,
  trips,
  adjustments,
  onResetToSeed,
}: DiagnosticConsoleProps) {
  const [verification, setVerification] = useState<{
    success: boolean;
    total_bill: number;
    total_payable: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const result = verifySeedData();
    setVerification(result);
  }, [vehicles, rates, trips, adjustments]);

  const handleReset = () => {
    setIsLoading(true);
    setTimeout(() => {
      onResetToSeed();
      setIsLoading(false);
    }, 500);
  };

  const aprilTrips = trips.filter(t => t.date.startsWith('2026-04'));

  return (
    <div id="diagnostic-console" className="diagnostic-panel">
      {/* Header */}
      <div className="diagnostic-panel-header">
        <div className="layout-row-center" style={{ gap: 10 }}>
          <Database style={{ width: 15, height: 15, color: 'var(--green)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Audit & Diagnostic Console
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 99,
            background: verification?.success ? 'var(--green-dim)' : 'var(--amber-dim)',
            border: `1px solid ${verification?.success ? 'var(--green-border)' : 'var(--amber-border)'}`,
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: verification?.success ? 'var(--green-light)' : 'var(--amber)',
            letterSpacing: '0.04em'
          }}>
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: verification?.success ? 'var(--green)' : 'var(--amber)',
                display: 'inline-block'
              }}
              className="animate-live"
            />
            {verification?.success ? 'VERIFIED OK' : 'DATA DIVERGED'}
          </span>
        </div>
        <div className="layout-row-center" style={{ gap: 10 }}>
          <button
            onClick={handleReset}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px',
              background: 'rgba(249,115,22,0.12)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: '#f97316',
              cursor: isLoading ? 'wait' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} className={isLoading ? 'animate-spin' : ''} />
            Reset to April 2026 Seed
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 8px',
              cursor: 'pointer', color: 'var(--t3)',
            }}
          >
            {expanded
              ? <ChevronUp style={{ width: 14, height: 14 }} />
              : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Dataset counts */}
          <div style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px'
          }}>
            <div style={{ fontSize: 9.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
              Ledger Datasets
            </div>
            <div className="grid-2-columns" style={{ gap: 8 }}>
              {[
                { label: 'Vehicles',   value: vehicles.length },
                { label: 'Rates',      value: rates.length },
                { label: 'All Trips',  value: trips.length },
                { label: 'April 2026', value: aprilTrips.length },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* April 2026 Audit */}
          <div style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px'
          }}>
            <div style={{ fontSize: 9.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
              April 2026 Target Audit
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>Gross Bill <span style={{ opacity: 0.5 }}>(Target: ₹2,64,600)</span></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
                  ₹{(verification?.total_bill || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>Net Payable <span style={{ opacity: 0.5 }}>(Target: ₹2,24,600)</span></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-light)', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
                  ₹{(verification?.total_payable || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={{
            background: verification?.success ? 'var(--green-dim)' : 'var(--amber-dim)',
            border: `1px solid ${verification?.success ? 'var(--green-border)' : 'var(--amber-border)'}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            gap: 10, textAlign: 'center',
          }}>
            {verification?.success ? (
              <>
                <CheckCircle2 style={{ width: 32, height: 32, color: 'var(--green)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-light)', fontFamily: 'var(--font-display)' }}>Audit Match</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>100% matching target register</div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle style={{ width: 32, height: 32, color: 'var(--amber)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>Data Diverged</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Reset seed to restore baseline</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
