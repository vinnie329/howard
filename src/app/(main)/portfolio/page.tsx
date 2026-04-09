'use client';

import { useState, useEffect } from 'react';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { getPortfolioRebalanceHistory } from '@/lib/data';
import type { PortfolioSnapshot, PortfolioPosition, PortfolioPerformance } from '@/types';
import type { PortfolioRebalance } from '@/lib/data';

interface LiveKpis {
  nav: number;
  total_return_pct: number;
  spy_cumulative_pct: number;
  daily_return_pct: number;
}

interface PortfolioData {
  snapshot: PortfolioSnapshot | null;
  positions: PortfolioPosition[];
  performance: PortfolioPerformance[];
  liveKpis: LiveKpis | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(n: number | null): string {
  if (n === null || n === undefined) return 'N/A';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function RiskBadge({ posture }: { posture: string }) {
  const color = posture === 'aggressive' ? '#ef4444' : posture === 'defensive' ? '#22c55e' : '#eab308';
  return (
    <span className="mono" style={{
      fontSize: 9, padding: '2px 6px', borderRadius: 3,
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color, letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      {posture}
    </span>
  );
}

function ConvictionBadge({ conviction, confidence }: { conviction: string; confidence: number }) {
  const color = confidence >= 70 ? '#22c55e' : confidence >= 40 ? '#eab308' : '#ef4444';
  const label = conviction === 'high' ? 'HIGH' : conviction === 'medium' ? 'MED' : 'LOW';
  return (
    <span style={{
      fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 3,
      background: `color-mix(in srgb, ${color} 15%, transparent)`, color, letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  );
}

function DirectionArrow({ direction }: { direction: string }) {
  const color = direction === 'long' ? '#22c55e' : '#ef4444';
  const arrow = direction === 'long' ? '\u2191' : '\u2193';
  return <span style={{ color, fontSize: 16, fontWeight: 600 }}>{arrow}</span>;
}

function tradingViewUrl(ticker: string): string {
  const map: Record<string, string> = {
    'BZ=F': 'NYMEX:BZ1!', 'CL=F': 'NYMEX:CL1!', 'GC=F': 'COMEX:GC1!',
    'SI=F': 'COMEX:SI1!', 'HG=F': 'COMEX:HG1!', 'NG=F': 'NYMEX:NG1!',
    'BTC-USD': 'COINBASE:BTCUSD', 'ETH-USD': 'COINBASE:ETHUSD',
    '^GSPC': 'SP:SPX', '^IXIC': 'NASDAQ:IXIC', '^TNX': 'TVC:US10Y',
    'DX-Y.NYB': 'TVC:DXY',
  };
  const symbol = map[ticker] || ticker;
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}

const GRID_COLS = '28px 72px 1fr 64px 88px 88px 76px 56px';

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData>({ snapshot: null, positions: [], performance: [], liveKpis: null });
  const [rebalances, setRebalances] = useState<PortfolioRebalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/portfolio').then((res) => res.json()),
      getPortfolioRebalanceHistory(),
    ])
      .then(([d, rb]) => {
        setData(d as PortfolioData);
        setRebalances(rb);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { snapshot, positions, liveKpis } = data;
  const nav = liveKpis?.nav ?? 10000000;
  const totalReturn = liveKpis?.total_return_pct ?? 0;
  const spyReturn = liveKpis?.spy_cumulative_pct ?? 0;
  const alpha = totalReturn - spyReturn;
  const dailyReturn = liveKpis?.daily_return_pct ?? 0;

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Model Portfolio</span>
      </div>

      <div className="page-two-col" style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* Center column — Portfolio */}
        <div className="page-two-col-main" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
        {/* ── Section 1: Header ── */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Model Portfolio</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            AI-generated portfolio derived from Howard&apos;s intelligence network. $10M starting capital. Rebalanced weekly.
          </p>

          {!loading && snapshot && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                <RiskBadge posture={snapshot.risk_posture} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {snapshot.total_positions} positions
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {snapshot.cash_allocation}% cash
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Rebalanced {formatDate(snapshot.generated_at)}
                </span>
              </div>
              <div style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-panel)',
                fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)',
              }}>
                {snapshot.thesis_summary}
              </div>
            </>
          )}
        </div>

        {loading ? (
          <SkeletonRows count={6} />
        ) : !snapshot ? (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
            No portfolio yet. Run the pipeline to generate: <code>npx tsx scripts/generate-portfolio.ts --rebalance</code>
          </div>
        ) : (
          <>
            {/* ── Section 2: Core KPIs ── */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--space-3)',
              }}>
                {[
                  { label: 'NAV', value: formatCurrency(nav) },
                  { label: 'Total Return', value: formatPct(totalReturn), color: totalReturn >= 0 ? '#22c55e' : '#ef4444' },
                  { label: 'vs SPY', value: formatPct(alpha), color: alpha >= 0 ? '#22c55e' : '#ef4444' },
                  { label: 'Daily', value: formatPct(dailyReturn), color: dailyReturn >= 0 ? '#22c55e' : '#ef4444' },
                ].map((s) => (
                  <div key={s.label} style={{
                    padding: 'var(--space-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-panel)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── Section 3: Positions Table ── */}
            <div className="table-scroll"><div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {/* Table header */}
              <div className="mono" style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                gap: 'var(--space-2)',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.03em',
              }}>
                <span />
                <span>TICKER</span>
                <span>NAME</span>
                <span style={{ textAlign: 'right' }}>ALLOC</span>
                <span style={{ textAlign: 'right' }}>ENTRY</span>
                <span style={{ textAlign: 'right' }}>CURRENT</span>
                <span style={{ textAlign: 'right' }}>P&L</span>
                <span style={{ textAlign: 'right' }}>CONV</span>
              </div>

              {/* Position rows */}
              <div className="stagger-in">
                {positions.map((pos) => {
                  const pnl = pos.entry_price && pos.current_price
                    ? ((pos.current_price - pos.entry_price) / pos.entry_price * (pos.direction === 'long' ? 1 : -1)) * 100
                    : null;
                  const expanded = expandedId === pos.id;

                  return (
                    <div
                      key={pos.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s ease' }}
                      onClick={() => setExpandedId(expanded ? null : pos.id)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLS,
                        alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        gap: 'var(--space-2)',
                      }}>
                        <DirectionArrow direction={pos.direction} />
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {pos.ticker}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pos.asset_name}
                        </span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right' }}>
                          {pos.allocation_pct}%
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          ${pos.entry_price?.toFixed(2) || 'N/A'}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          ${pos.current_price?.toFixed(2) || 'N/A'}
                        </span>
                        <span className="mono" style={{
                          fontSize: 12, fontWeight: 500, textAlign: 'right',
                          color: pnl === null ? 'var(--text-tertiary)' : pnl >= 0 ? '#22c55e' : '#ef4444',
                        }}>
                          {pnl !== null ? formatPct(pnl) : 'N/A'}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <ConvictionBadge conviction={pos.conviction} confidence={pos.confidence} />
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expanded && (
                        <div style={{
                          padding: 'var(--space-3) var(--space-4) var(--space-4)',
                          borderTop: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                        }}>
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            {pos.thesis}
                          </div>

                          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', fontSize: 11 }}>
                            {pos.key_drivers.length > 0 && (
                              <div>
                                <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>Key Drivers</div>
                                {pos.key_drivers.map((d, i) => (
                                  <div key={i} style={{ color: 'var(--text-secondary)' }}>{d}</div>
                                ))}
                              </div>
                            )}
                            {pos.supporting_sources.length > 0 && (
                              <div>
                                <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>Sources</div>
                                {pos.supporting_sources.map((s, i) => (
                                  <div key={i} style={{ color: 'var(--text-secondary)' }}>{s}</div>
                                ))}
                              </div>
                            )}
                            <div>
                              <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>Details</div>
                              <div style={{ color: 'var(--text-secondary)' }}>Horizon: {pos.time_horizon}</div>
                              <div style={{ color: 'var(--text-secondary)' }}>Confidence: {pos.confidence}%</div>
                              {pos.target_price != null && (
                                <div style={{ color: pos.direction === 'long' ? '#22c55e' : '#ef4444' }}>
                                  Target: ${pos.target_price.toFixed(2)}
                                </div>
                              )}
                              {pos.stop_loss_condition && (
                                <div style={{ color: '#ef4444' }}>Stop: {pos.stop_loss_condition}</div>
                              )}
                              <a
                                href={tradingViewUrl(pos.ticker)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}
                              >
                                TradingView &rarr;
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Cash row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  gap: 'var(--space-2)',
                  opacity: 0.5,
                }}>
                  <span style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>$</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>CASH</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Cash reserve</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                    {snapshot.cash_allocation}%
                  </span>
                </div>
              </div>
            </div></div>

            <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
              AI-generated model portfolio. Not financial advice.
            </div>
          </>
        )}
        </div>

        {/* Right column — Rebalance History */}
        <div className="page-two-col-aside" style={{
          width: 340,
          minWidth: 340,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          borderLeft: '1px solid var(--border)',
          marginLeft: 'auto',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>
            Rebalance History
          </div>

          {loading ? (
            <SkeletonRows count={4} />
          ) : rebalances.length === 0 ? (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              No rebalances yet.
            </div>
          ) : (
            <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {rebalances.map((rb) => (
                <a
                  key={rb.date}
                  href={`/portfolio/rebalances/${rb.date}`}
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {new Date(rb.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {rb.risk_posture && (
                      <span className="mono" style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 2,
                        background: 'var(--bg-surface)', color: 'var(--text-tertiary)',
                        border: '1px solid var(--border)',
                      }}>
                        {rb.risk_posture}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {rb.added.map((a) => (
                      <div key={'a' + a.ticker} className="mono" style={{ fontSize: 10, color: '#22c55e' }}>
                        + {a.direction === 'short' ? 'Short' : 'Long'} {a.ticker} ({a.allocation}%)
                      </div>
                    ))}
                    {rb.removed.map((r) => (
                      <div key={'r' + r.ticker} className="mono" style={{ fontSize: 10, color: '#ef4444' }}>
                        − {r.direction === 'short' ? 'Short' : 'Long'} {r.ticker}
                        {r.pnl_pct !== null && (
                          <span style={{ color: r.pnl_pct >= 0 ? '#22c55e' : '#ef4444', marginLeft: 4 }}>
                            ({r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    ))}
                    {rb.resized.map((r) => (
                      <div key={'s' + r.ticker} className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                        ~ {r.ticker} {r.from}% → {r.to}%
                      </div>
                    ))}
                  </div>

                  {rb.drivers.length > 0 && (
                    <div style={{
                      marginTop: 'var(--space-2)',
                      paddingTop: 'var(--space-2)',
                      borderTop: '1px solid var(--border)',
                    }}>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 3 }}>
                        Driven by
                      </div>
                      {rb.drivers.map((d, i) => (
                        <div key={i} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 2 }}>
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
