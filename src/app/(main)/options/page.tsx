'use client';

import { useState, useEffect } from 'react';
import Sparkline from '@/components/ui/Sparkline';

interface OptionsCurrent {
  date: string;
  vix: number | null;
  vix9d: number | null;
  vix3m: number | null;
  vix_term_spread: number | null;
  skew: number | null;
  equity_pc_ratio: number | null;
  index_pc_ratio: number | null;
  total_pc_ratio: number | null;
}

interface HistoryPoint {
  date: string;
  vix: number | null;
  vix3m: number | null;
  skew: number | null;
  total_pc_ratio: number | null;
}

interface OptionsData {
  current: OptionsCurrent | null;
  history: HistoryPoint[];
  updated_at: string | null;
}

function MetricCard({ label, value, suffix, detail, color, sparkData, sparkPositive }: {
  label: string;
  value: string | null;
  suffix?: string;
  detail?: string;
  color?: string;
  sparkData?: number[];
  sparkPositive?: boolean;
}) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-panel)',
      flex: 1,
      minWidth: 200,
    }}>
      <div className="mono" style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-tertiary)',
        marginBottom: 'var(--space-2)',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <span className="mono" style={{
            fontSize: 28,
            fontWeight: 600,
            color: color || 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {value ?? 'N/A'}
          </span>
          {suffix && (
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>
              {suffix}
            </span>
          )}
          {detail && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
              {detail}
            </div>
          )}
        </div>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} positive={sparkPositive ?? true} width={80} height={32} />
        )}
      </div>
    </div>
  );
}

function vixColor(vix: number): string {
  if (vix > 40) return '#ef4444';
  if (vix > 30) return '#f97316';
  if (vix > 20) return '#eab308';
  return '#22c55e';
}

function skewReading(skew: number): { text: string; color: string } {
  if (skew > 140) return { text: 'Heavy tail hedging — crash risk priced', color: '#ef4444' };
  if (skew > 130) return { text: 'Elevated tail hedging', color: '#f97316' };
  if (skew < 110) return { text: 'Low tail concern — possible complacency', color: '#eab308' };
  return { text: 'Normal range', color: 'var(--text-tertiary)' };
}

function pcReading(ratio: number): { text: string; color: string } {
  if (ratio > 1.2) return { text: 'Heavy put buying — bearish sentiment', color: '#ef4444' };
  if (ratio > 1.0) return { text: 'Elevated put demand', color: '#f97316' };
  if (ratio < 0.7) return { text: 'Low put demand — complacent', color: '#eab308' };
  return { text: 'Normal range', color: 'var(--text-tertiary)' };
}

export default function OptionsPage() {
  const [data, setData] = useState<OptionsData>({ current: null, history: [], updated_at: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/options-sentiment')
      .then((res) => res.json())
      .then((d: OptionsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const c = data.current;
  const vixHistory = data.history.map(h => h.vix).filter((v): v is number => v !== null);
  const skewHistory = data.history.map(h => h.skew).filter((v): v is number => v !== null);
  const pcHistory = data.history.map(h => h.total_pc_ratio).filter((v): v is number => v !== null);

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Options Sentiment</span>
      </div>

      <div style={{ flex: 1, margin: 32, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 700 }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Options Sentiment</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            VIX term structure, CBOE SKEW (institutional tail-risk hedging), and aggregate put/call ratios. Not individual flow — aggregate market sentiment.
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : !c ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
              No options data yet. Run the pipeline to fetch: <code>npx tsx scripts/pipeline.ts --pos-data</code>
            </div>
          ) : (
            <>
              {/* VIX Term Structure */}
              <div className="mono" style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-tertiary)',
                marginBottom: 'var(--space-3)',
              }}>
                VIX Term Structure
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                <MetricCard
                  label="VIX (30d)"
                  value={c.vix?.toFixed(2) ?? null}
                  color={c.vix ? vixColor(c.vix) : undefined}
                  sparkData={vixHistory}
                  sparkPositive={false}
                />
                <MetricCard
                  label="VIX9D"
                  value={c.vix9d?.toFixed(2) ?? null}
                />
                <MetricCard
                  label="VIX3M"
                  value={c.vix3m?.toFixed(2) ?? null}
                />
              </div>

              {/* Term spread interpretation */}
              {c.vix_term_spread !== null && (
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-panel)',
                  marginBottom: 'var(--space-6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}>
                  <span className="mono" style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: c.vix_term_spread > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${c.vix_term_spread > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: c.vix_term_spread > 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {c.vix_term_spread > 0 ? 'CONTANGO' : 'BACKWARDATION'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Term spread (VIX3M - VIX): <span className="mono">{c.vix_term_spread > 0 ? '+' : ''}{c.vix_term_spread.toFixed(2)}</span>
                    {' '} — {c.vix_term_spread > 0
                      ? 'Normal structure, near-term calm'
                      : 'Inverted — near-term fear exceeds longer-term, historically precedes selloffs'}
                  </span>
                </div>
              )}

              {/* SKEW */}
              <div className="mono" style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-tertiary)',
                marginBottom: 'var(--space-3)',
              }}>
                CBOE SKEW Index
              </div>

              <div style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-panel)',
                marginBottom: 'var(--space-6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <span className="mono" style={{
                      fontSize: 28,
                      fontWeight: 600,
                      color: c.skew ? skewReading(c.skew).color : 'var(--text-primary)',
                      lineHeight: 1,
                    }}>
                      {c.skew?.toFixed(1) ?? 'N/A'}
                    </span>
                    {c.skew && (
                      <div style={{ fontSize: 12, color: skewReading(c.skew).color, marginTop: 'var(--space-1)' }}>
                        {skewReading(c.skew).text}
                      </div>
                    )}
                  </div>
                  {skewHistory.length >= 2 && (
                    <Sparkline data={skewHistory} positive={true} width={120} height={40} />
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                  Measures how much institutions pay for OTM put protection. &gt;130 = elevated hedging, &gt;140 = crash protection buying.
                </div>
              </div>

              {/* Put/Call Ratios */}
              <div className="mono" style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-tertiary)',
                marginBottom: 'var(--space-3)',
              }}>
                Put/Call Ratios
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                <MetricCard
                  label="Total P/C"
                  value={c.total_pc_ratio?.toFixed(2) ?? null}
                  detail={c.total_pc_ratio ? pcReading(c.total_pc_ratio).text : undefined}
                  color={c.total_pc_ratio ? pcReading(c.total_pc_ratio).color : undefined}
                  sparkData={pcHistory}
                  sparkPositive={false}
                />
                <MetricCard
                  label="Equity P/C"
                  value={c.equity_pc_ratio?.toFixed(2) ?? null}
                />
                <MetricCard
                  label="Index P/C"
                  value={c.index_pc_ratio?.toFixed(2) ?? null}
                />
              </div>

              <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                {data.updated_at
                  ? `Last updated ${new Date(data.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · `
                  : ''}
                VIX/SKEW from Yahoo Finance. P/C ratios from CBOE. Updated every pipeline run.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
