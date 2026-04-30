'use client';

import { useState, useEffect } from 'react';
import type { DailyUpdate } from '@/types';

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: '#eab308',
  mixed: '#a78bfa',
  cautious: '#eab308',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: 'var(--text-tertiary)',
};

const ACTION_COLORS: Record<string, string> = {
  new: '#22c55e',
  increased: '#22c55e',
  decreased: '#ef4444',
  exited: '#ef4444',
};

// Map display names → Yahoo Finance tickers for price lookups
const ASSET_TICKERS: Record<string, string> = {
  'Gold': 'GC=F', 'Silver': 'SI=F', 'Oil': 'CL=F', 'Copper': 'HG=F',
  'Bitcoin': 'BTC-USD', 'BTC': 'BTC-USD', 'Ethereum': 'ETH-USD', 'ETH': 'ETH-USD',
  'S&P 500': '^GSPC', 'S&P': '^GSPC', 'Nasdaq': '^IXIC', 'Dow': '^DJI',
  'VIX': '^VIX', 'DXY': 'DX-Y.NYB', 'USD': 'DX-Y.NYB',
  'US Treasuries': '^TNX', 'US Treasury': '^TNX', 'Treasuries': '^TNX',
  '10Y': '^TNX', '10-year': '^TNX',
};

// Assets to highlight but without price data (no color)
const NON_PRICED_ASSETS = new Set(['Fed', 'Federal Reserve', 'ECB', 'BOJ']);

function highlightAssets(
  text: string,
  extraAssets: string[],
  priceChanges: Record<string, number>,
): React.ReactNode[] {
  const allTerms = new Set<string>(Object.keys(ASSET_TICKERS));
  NON_PRICED_ASSETS.forEach((a) => allTerms.add(a));
  for (const a of extraAssets) {
    if (a && a.length >= 2) allTerms.add(a);
  }

  const sorted = Array.from(allTerms).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return [text];

  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(?<![a-zA-Z])(${escaped.join('|')})(?![a-zA-Z])`, 'g');

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const term = match[1];
    const ticker = ASSET_TICKERS[term];
    const change = ticker ? priceChanges[ticker] : undefined;
    // For treasuries (^TNX = yield), up yield = red for bonds
    const isYield = ticker === '^TNX';
    let pillColor = 'var(--text-secondary)';
    let borderColor = 'var(--border)';
    let bgColor = 'var(--bg-surface)';
    if (change !== undefined) {
      const effectiveChange = isYield ? -change : change;
      if (effectiveChange > 0.1) {
        pillColor = '#22c55e';
        borderColor = '#22c55e30';
        bgColor = '#22c55e10';
      } else if (effectiveChange < -0.1) {
        pillColor = '#ef4444';
        borderColor = '#ef444430';
        bgColor = '#ef444410';
      }
    }

    result.push(
      <span key={match.index} className="mono" style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: pillColor,
        whiteSpace: 'nowrap',
      }}>
        {term}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result.length > 0 ? result : [text];
}


export default function DailyUpdatePage() {
  const [update, setUpdate] = useState<DailyUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/daily-update')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => setUpdate(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch live price changes for asset pills
    const tickers = Array.from(new Set(Object.values(ASSET_TICKERS))).join(',');
    fetch(`/api/quotes?tickers=${tickers}`)
      .then((res) => res.json())
      .then((data) => setPriceChanges(data))
      .catch(() => {});
  }, []);

  const s = update?.sections;

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Daily Update</span>
      </div>

      <div style={{ flex: 1, margin: 32, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 700 }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Daily Update</h1>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : !update ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
              No daily update available yet. Updates are generated at 5am and 5pm UTC.
            </div>
          ) : (
            <>
              {/* Date */}
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
                {update.date} — Generated {new Date(update.generated_at).toLocaleTimeString()}
              </div>

              {/* Summary */}
              {(() => {
                // Collect asset names from sections for highlighting
                const extraAssets: string[] = [];
                if (s?.technical_moves) {
                  for (const t of s.technical_moves) {
                    if (t.ticker) extraAssets.push(t.ticker);
                    if (t.name) extraAssets.push(t.name);
                  }
                }
                if (s?.holdings_changes) {
                  for (const h of s.holdings_changes) {
                    if (h.ticker) extraAssets.push(h.ticker);
                  }
                }
                const paragraphs = update.summary.split('\n').filter(Boolean);
                return (
                  <div style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-panel)',
                    marginBottom: 'var(--space-6)',
                  }}>
                    {paragraphs.map((p, i) => (
                      <p key={i} style={{
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: 'var(--text-primary)',
                        marginBottom: i < paragraphs.length - 1 ? 'var(--space-3)' : 0,
                      }}>
                        {highlightAssets(p, extraAssets, priceChanges)}
                      </p>
                    ))}
                  </div>
                );
              })()}

              {/* Buildout watchlist buy-zone hits — surfaced near the top */}
              {s?.buildout_alerts && s.buildout_alerts.length > 0 && (
                <Section title="Buildout Watchlist — Buy-Zone Hits" count={s.buildout_alerts.length}>
                  {s.buildout_alerts.map((a, i) => {
                    const depColor = a.agi_dependency === 'core' ? '#ef4444'
                      : a.agi_dependency === 'optional' ? '#eab308'
                      : '#22c55e';
                    return (
                      <div key={i} style={{
                        padding: 'var(--space-3) var(--space-4)',
                        border: `1px solid ${a.in_zone ? '#22c55e' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-panel)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{a.ticker}</span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{a.name}</span>
                          <span className="mono" style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                            {a.category.replace(/_/g, ' ')}
                          </span>
                          <span className="mono" style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: `color-mix(in srgb, ${depColor} 15%, transparent)`, color: depColor, letterSpacing: '0.05em' }}>
                            {a.agi_dependency.toUpperCase()}
                          </span>
                          {a.in_zone && (
                            <span className="mono" style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: 'color-mix(in srgb, #22c55e 15%, transparent)', color: '#22c55e', letterSpacing: '0.05em' }}>
                              IN BUY ZONE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                          {a.headline}
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          ${a.current_price.toFixed(2)} · buy ≤ ${a.buy_zone_max.toFixed(0)}
                        </div>
                        {a.significance && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>
                            {a.significance}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Section>
              )}

              {/* Tracked-Fund SEC Filings — surfaced at the very top */}
              {s?.insider_filings && s.insider_filings.length > 0 && (
                <Section title="Tracked-Fund SEC Filings" count={s.insider_filings.length}>
                  {s.insider_filings.map((f, i) => (
                    <div key={i} style={{
                      padding: 'var(--space-3) var(--space-4)',
                      border: '1px solid var(--accent)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-panel)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                          {f.form_type}
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {f.fund}{f.manager ? ` · ${f.manager}` : ''}
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {f.filing_date}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                        {f.headline}
                      </div>
                      {(f.issuer || f.ownership) && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                          {f.issuer}{f.ownership ? ` — ${f.ownership}` : ''}{f.cost_basis_usd ? ` · cost $${(f.cost_basis_usd / 1e6).toFixed(1)}M` : ''}
                        </div>
                      )}
                      {f.significance && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {f.significance}
                        </div>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* New Content */}
              {s?.new_content && s.new_content.highlights.length > 0 && (
                <Section title="New Content" count={s.new_content.count}>
                  {s.new_content.highlights.map((item, i) => (
                    <div key={i} style={{
                      padding: 'var(--space-3) var(--space-4)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-panel)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.source}</span>
                        <Badge label={item.sentiment} color={SENTIMENT_COLORS[item.sentiment] || 'var(--text-tertiary)'} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {item.summary}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Technical Moves */}
              {s?.technical_moves && s.technical_moves.length > 0 && (
                <Section title="Technical Moves">
                  {s.technical_moves.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 48 }}>
                        {item.ticker}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.change}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.significance}</div>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Market Moves */}
              {s?.market_moves && s.market_moves.length > 0 && (
                <Section title="Prediction Market Moves">
                  {s.market_moves.map((item, i) => {
                    const changeColor = item.change > 0 ? '#22c55e' : '#ef4444';
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-2) 0',
                      }}>
                        <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</div>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {Math.round(item.previous_price * 100)}%
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>→</span>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: changeColor }}>
                          {Math.round(item.current_price * 100)}%
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: changeColor }}>
                          {item.change > 0 ? '+' : ''}{item.change}pp
                        </span>
                      </div>
                    );
                  })}
                </Section>
              )}

              {/* Signals */}
              {s?.signal_changes && s.signal_changes.length > 0 && (
                <Section title="Signals">
                  {s.signal_changes.map((item, i) => (
                    <div key={i} style={{
                      padding: 'var(--space-3) var(--space-4)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-panel)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: SEVERITY_COLORS[item.severity] || 'var(--text-tertiary)',
                          flexShrink: 0,
                        }} />
                        <span className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
                          {item.type}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                        {item.headline}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Outlook Changes */}
              {s?.outlook_changes && s.outlook_changes.length > 0 && (
                <Section title="Outlook Changes">
                  {s.outlook_changes.map((item, i) => (
                    <div key={i} style={{ padding: 'var(--space-2) 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                          {item.time_horizon}
                        </span>
                        <Badge label={item.previous_sentiment} color={SENTIMENT_COLORS[item.previous_sentiment] || 'var(--text-tertiary)'} />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>→</span>
                        <Badge label={item.new_sentiment} color={SENTIMENT_COLORS[item.new_sentiment] || 'var(--text-tertiary)'} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {item.reasoning}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* FedWatch Changes */}
              {s?.fedwatch_changes && s.fedwatch_changes.meetings?.length > 0 && (
                <Section title="Fed Watch — Rate Expectations">
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-panel)',
                  }}>
                    {s.fedwatch_changes.summary && (
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                        {s.fedwatch_changes.summary}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                      {s.fedwatch_changes.meetings.map((m: { date: string; most_likely_range: string; probability: number; change_vs_prior?: string }, i: number) => (
                        <div key={i} style={{
                          padding: 'var(--space-2) var(--space-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface)',
                          minWidth: 90,
                        }}>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            {new Date(m.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                          </div>
                          <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
                            {m.most_likely_range}
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            {Math.round(m.probability * 100)}%
                            {(() => {
                              const c = m.change_vs_prior;
                              if (!c || c === '0pp' || c === '+0.0pp') return null;
                              const isChange = /^[+-]/.test(c) && !c.startsWith('+0') && !c.startsWith('-0');
                              if (isChange) {
                                return (
                                  <span style={{ color: c.startsWith('+') ? '#22c55e' : '#ef4444', marginLeft: 4 }}>
                                    {c}
                                  </span>
                                );
                              }
                              return <span style={{ marginLeft: 4 }}>(no change)</span>;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              )}

              {/* Holdings Changes */}
              {s?.holdings_changes && s.holdings_changes.length > 0 && (
                <Section title="13F Holdings Changes">
                  {s.holdings_changes.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', minWidth: 80 }}>
                        {item.fund}
                      </span>
                      <Badge label={item.action} color={ACTION_COLORS[item.action] || 'var(--text-tertiary)'} />
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.ticker}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.detail}</span>
                    </div>
                  ))}
                </Section>
              )}

              <div className="mono" style={{ marginTop: 'var(--space-4)', marginBottom: 32, fontSize: 10, color: 'var(--text-tertiary)' }}>
                Generated by Claude synthesizing all Howard intelligence. Updated every pipeline run.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)',
      }}>
        <div className="mono" style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}>
          {title}
        </div>
        {count != null && (
          <span className="mono" style={{
            fontSize: 9,
            padding: '1px 6px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="mono" style={{
      fontSize: 9,
      padding: '1px 6px',
      borderRadius: 'var(--radius-sm)',
      background: `${color}15`,
      border: `1px solid ${color}30`,
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  );
}
