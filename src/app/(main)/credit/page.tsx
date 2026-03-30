'use client';

import { useState, useEffect } from 'react';
import Sparkline from '@/components/ui/Sparkline';

interface SpreadSeries {
  series: string;
  label: string;
  latest_value: number;
  latest_date: string;
  change_30d: number;
  history: Array<{ date: string; value: number }>;
  stress: 'normal' | 'elevated' | 'high';
}

interface CreditData {
  series: SpreadSeries[];
  updated_at: string | null;
}

const SERIES_INFO: Record<string, { description: string; unit: string; fredUrl: string }> = {
  'BAMLH0A0HYM2': { description: 'High Yield option-adjusted spread over Treasuries. Primary risk sentiment indicator.', unit: 'bps', fredUrl: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2' },
  'BAMLC0A0CM': { description: 'Investment Grade corporate spread. Widens before equity selloffs.', unit: 'bps', fredUrl: 'https://fred.stlouisfed.org/series/BAMLC0A0CM' },
  'TEDRATE': { description: '3-month LIBOR minus 3-month T-Bill. Measures interbank funding stress.', unit: '%', fredUrl: 'https://fred.stlouisfed.org/series/TEDRATE' },
  'SOFR': { description: 'Secured Overnight Financing Rate. Fed funding conditions.', unit: '%', fredUrl: 'https://fred.stlouisfed.org/series/SOFR' },
};

function stressBadge(stress: string) {
  if (stress === 'normal') return null;
  const color = stress === 'high' ? '#ef4444' : '#f97316';
  const label = stress === 'high' ? 'STRESS' : 'ELEVATED';
  return (
    <span className="mono" style={{
      fontSize: 9,
      padding: '1px 5px',
      borderRadius: 'var(--radius-sm)',
      background: `${color}18`,
      border: `1px solid ${color}40`,
      color,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

export default function CreditPage() {
  const [data, setData] = useState<CreditData>({ series: [], updated_at: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credit-spreads')
      .then((res) => res.json())
      .then((d: CreditData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Credit Markets</span>
      </div>

      <div style={{ flex: 1, margin: 32, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 700 }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Credit Markets</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            HY/IG spreads, TED spread, and SOFR — leading risk sentiment indicators that move before equities. Sourced from FRED.
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : data.series.length === 0 ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
              No credit spread data yet. Run the pipeline to fetch: <code>npx tsx scripts/pipeline.ts --pos-data</code>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {data.series.map((s) => {
                  const info = SERIES_INFO[s.series] || { description: '', unit: '' };
                  const changePositive = s.change_30d > 0;
                  // For spreads, widening (positive change) is bearish
                  const changeColor = s.series.startsWith('BAML') || s.series === 'TEDRATE'
                    ? (changePositive ? '#ef4444' : '#22c55e')
                    : 'var(--text-tertiary)';

                  return (
                    <div key={s.series} style={{
                      padding: 'var(--space-4)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-panel)',
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                            {s.label}
                          </span>
                          {stressBadge(s.stress)}
                        </div>
                        <a
                          href={info.fredUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{ fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                        >
                          {s.series} ↗
                        </a>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                        {info.description}
                      </div>

                      {/* Value + sparkline */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                          <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {s.latest_value.toFixed(2)}
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>{info.unit}</span>
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: changeColor, marginTop: 'var(--space-1)' }}>
                            {s.change_30d > 0 ? '+' : ''}{s.change_30d.toFixed(2)} (30d)
                          </div>
                        </div>

                        {s.history.length >= 2 && (
                          <Sparkline
                            data={s.history.map((h) => h.value)}
                            positive={!changePositive}
                            width={120}
                            height={40}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                {data.updated_at
                  ? `Data through ${data.updated_at} · `
                  : ''}
                Source: FRED (Federal Reserve Economic Data). Updated every pipeline run.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
