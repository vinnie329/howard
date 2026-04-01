'use client';

import { useState, useEffect } from 'react';

interface COTRecord {
  ticker: string;
  commodity: string;
  report_date: string;
  commercial_net: number;
  noncommercial_net: number;
  spec_net_pct: number;
  net_change_wow: number | null;
  crowded: boolean;
}

interface COTData {
  records: COTRecord[];
  updated_at: string | null;
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function NetBar({ pct }: { pct: number }) {
  const maxPct = 40;
  const width = Math.min(Math.abs(pct) / maxPct * 100, 100);
  const isLong = pct > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 140 }}>
      {/* Negative side */}
      <div style={{ width: 60, display: 'flex', justifyContent: 'flex-end' }}>
        {!isLong && (
          <div style={{
            height: 8,
            width: `${width}%`,
            background: '#ef4444',
            borderRadius: 2,
            minWidth: 2,
          }} />
        )}
      </div>
      {/* Center line */}
      <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
      {/* Positive side */}
      <div style={{ width: 60 }}>
        {isLong && (
          <div style={{
            height: 8,
            width: `${width}%`,
            background: '#22c55e',
            borderRadius: 2,
            minWidth: 2,
          }} />
        )}
      </div>
    </div>
  );
}

export default function COTPage() {
  const [data, setData] = useState<COTData>({ records: [], updated_at: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cot')
      .then((res) => res.json())
      .then((d: COTData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>COT Positioning</span>
      </div>

      <div style={{ flex: 1, margin: 32, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 800 }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>CFTC Commitments of Traders</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Commercial vs speculative positioning in futures markets. Crowded spec trades often precede reversals. Updated weekly from CFTC reports.
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : data.records.length === 0 ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
              No COT data yet. Run the pipeline to fetch: <code>npx tsx scripts/pipeline.ts --pos-data</code>
            </div>
          ) : (
            <>
              {/* Table */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Contract', 'Spec Net', 'Spec % of OI', '', 'Comm Net', 'WoW'].map((h) => (
                        <th key={h} style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: h === 'Contract' ? 'left' : 'right',
                          borderBottom: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          fontWeight: 500,
                        }}>
                          <span className="mono" style={{ fontSize: 10 }}>{h}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((rec, idx) => (
                      <tr key={rec.ticker}>
                        <td style={{
                          padding: 'var(--space-3) var(--space-4)',
                          borderBottom: idx < data.records.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                              {rec.commodity}
                            </span>
                            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                              {rec.ticker}
                            </span>
                            {rec.crowded && (
                              <span className="mono" style={{
                                fontSize: 9,
                                padding: '1px 5px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                fontWeight: 600,
                              }}>
                                CROWDED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="mono" style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'right',
                          borderBottom: idx < data.records.length - 1 ? '1px solid var(--border)' : 'none',
                          color: rec.noncommercial_net > 0 ? '#22c55e' : '#ef4444',
                          fontWeight: 500,
                        }}>
                          {formatNum(rec.noncommercial_net)}
                        </td>
                        <td className="mono" style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'right',
                          borderBottom: idx < data.records.length - 1 ? '1px solid var(--border)' : 'none',
                          color: Math.abs(rec.spec_net_pct) > 20 ? '#ef4444' : 'var(--text-secondary)',
                          fontWeight: Math.abs(rec.spec_net_pct) > 20 ? 600 : 400,
                        }}>
                          {rec.spec_net_pct > 0 ? '+' : ''}{rec.spec_net_pct.toFixed(1)}%
                        </td>
                        <td style={{
                          padding: 'var(--space-2)',
                          borderBottom: idx < data.records.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <NetBar pct={rec.spec_net_pct} />
                        </td>
                        <td className="mono" style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'right',
                          borderBottom: idx < data.records.length - 1 ? '1px solid var(--border)' : 'none',
                          color: 'var(--text-tertiary)',
                        }}>
                          {formatNum(rec.commercial_net)}
                        </td>
                        <td className="mono" style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'right',
                          borderBottom: idx < data.records.length - 1 ? '1px solid var(--border)' : 'none',
                          color: rec.net_change_wow === null
                            ? 'var(--text-tertiary)'
                            : rec.net_change_wow > 0 ? '#22c55e' : '#ef4444',
                        }}>
                          {rec.net_change_wow === null ? '—' : `${rec.net_change_wow > 0 ? '+' : ''}${formatNum(rec.net_change_wow)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                {data.updated_at
                  ? `Last updated ${new Date(data.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · `
                  : ''}
                Source: CFTC Commitments of Traders. Spec % of OI &gt;20% = crowded.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
