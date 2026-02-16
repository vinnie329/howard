'use client';

import { useState, useEffect } from 'react';
import { SkeletonCards } from '@/components/ui/Skeleton';
import WatchlistPanel from '@/components/ui/WatchlistPanel';

interface Signal {
  type: string;
  severity: 'high' | 'medium' | 'low';
  headline: string;
  detail: string;
  assets: string[];
  color: string;
}

const SEVERITY_CONFIG = {
  high:   { label: 'HIGH',   color: '#ef4444', width: 100 },
  medium: { label: 'MEDIUM', color: '#eab308', width: 60 },
  low:    { label: 'LOW',    color: 'var(--text-tertiary)', width: 30 },
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSignals = (refresh = false) => {
    const url = refresh ? '/api/technicals/signals?refresh=true' : '/api/technicals/signals';
    if (refresh) setRefreshing(true);
    else setLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then((data: Signal[]) => {
        if (Array.isArray(data)) setSignals(data);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { fetchSignals(); }, []);

  const typeBreakdown = new Map<string, number>();
  for (const s of signals) {
    typeBreakdown.set(s.type, (typeBreakdown.get(s.type) ?? 0) + 1);
  }

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Signals</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main content */}
        <div style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <h1>Signals</h1>
          {!loading && (
            <button
              onClick={() => fetchSignals(true)}
              disabled={refreshing}
              className="mono"
              style={{
                fontSize: 10,
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                background: refreshing ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid var(--border)',
                color: refreshing ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                cursor: refreshing ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!refreshing) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {refreshing ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', maxWidth: 640, lineHeight: 1.5 }}>
          AI-generated analysis cross-referencing all source intelligence, predictions, and live technical positions. Looking for non-obvious patterns, contradictions, and connections across the entire database.
        </p>

        {/* Summary chips */}
        {!loading && signals.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            marginBottom: 'var(--space-6)',
          }}>
            {Array.from(typeBreakdown.entries()).map(([type, count]) => (
              <div key={type} className="mono" style={{
                fontSize: 10,
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}>
                {type} <span style={{ color: 'var(--text-primary)' }}>{count}</span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <SkeletonCards count={4} />
        ) : signals.length === 0 ? (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
            No signals detected.
          </div>
        ) : (
          <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {signals.map((signal, i) => {
              const sev = SEVERITY_CONFIG[signal.severity] ?? SEVERITY_CONFIG.low;
              return (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: 'var(--bg-panel)',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {/* Card header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      {/* Color indicator */}
                      <div style={{
                        width: 3,
                        height: 16,
                        borderRadius: 2,
                        background: signal.color,
                        flexShrink: 0,
                      }} />
                      <span className="mono" style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        color: signal.color,
                      }}>
                        {signal.type}
                      </span>
                    </div>

                    {/* Severity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{
                        width: 40,
                        height: 3,
                        background: 'var(--bg-body)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${sev.width}%`,
                          height: '100%',
                          background: sev.color,
                          borderRadius: 2,
                        }} />
                      </div>
                      <span className="mono" style={{
                        fontSize: 9,
                        color: sev.color,
                        letterSpacing: '0.05em',
                      }}>
                        {sev.label}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: 'var(--space-4)' }}>
                    <div style={{
                      fontSize: 15,
                      lineHeight: 1.5,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      marginBottom: 'var(--space-3)',
                    }}>
                      {signal.headline}
                    </div>
                    <div style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                    }}>
                      {signal.detail}
                    </div>

                    {/* Asset chips */}
                    {signal.assets.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: 'var(--space-1)',
                        flexWrap: 'wrap',
                        marginTop: 'var(--space-3)',
                        paddingTop: 'var(--space-3)',
                        borderTop: '1px solid var(--border)',
                      }}>
                        {signal.assets.map((asset) => (
                          <span key={asset} className="mono" style={{
                            fontSize: 10,
                            padding: '2px var(--space-2)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                          }}>
                            {asset}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

          <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
            Signals generated by Claude analyzing all source data against live technicals. Cached for 1 hour.
          </div>
        </div>

        {/* Watchlist sidebar */}
        <div style={{
          width: 320,
          minWidth: 320,
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="panel-header">Watchlist</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <WatchlistPanel />
          </div>
        </div>
      </div>
    </>
  );
}
