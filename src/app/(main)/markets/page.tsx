'use client';

import { useState, useEffect } from 'react';
import Sparkline from '@/components/ui/Sparkline';
import type { MarketWithSnapshot } from '@/types';

interface MarketsData {
  watched: MarketWithSnapshot[];
  discoveries: MarketWithSnapshot[];
}

function probColor(price: number): string {
  if (price >= 0.7) return '#22c55e';
  if (price <= 0.3) return '#ef4444';
  return '#eab308';
}

function formatProb(price: number): string {
  return `${Math.round(price * 100)}%`;
}

function formatChange(change: number): string {
  const pp = Math.round(change * 100);
  if (pp === 0) return '—';
  return `${pp > 0 ? '+' : ''}${pp}pp`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}k`;
  return `$${vol.toFixed(0)}`;
}

function groupByCategory(markets: MarketWithSnapshot[]): Map<string, MarketWithSnapshot[]> {
  const map = new Map<string, MarketWithSnapshot[]>();
  for (const m of markets) {
    const cat = m.category || 'other';
    const arr = map.get(cat) || [];
    arr.push(m);
    map.set(cat, arr);
  }
  return map;
}

const CATEGORY_LABELS: Record<string, string> = {
  rates: 'Fed / Rates',
  macro: 'Macro / Economics',
  crypto: 'Crypto',
  geopolitics: 'Geopolitics',
  politics: 'Politics',
  other: 'Other',
};

export default function MarketsPage() {
  const [data, setData] = useState<MarketsData>({ watched: [], discoveries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/markets')
      .then((res) => res.json())
      .then((d: MarketsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByCategory(data.watched);

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Markets</span>
      </div>

      <div style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 700, paddingBottom: 32 }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Prediction Markets</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Live probability tracking from Kalshi and Polymarket. Crowd-sourced intelligence on macro events, rates, crypto, and geopolitics.
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : data.watched.length === 0 && data.discoveries.length === 0 ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
              No prediction market data yet. Markets are fetched during the pipeline run (5am/5pm UTC).
            </div>
          ) : (
            <>
              {/* Watched markets by category */}
              {Array.from(grouped.entries()).map(([cat, markets]) => (
                <div key={cat} style={{ marginBottom: 'var(--space-6)' }}>
                  <div className="mono" style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: 'var(--space-3)',
                  }}>
                    {CATEGORY_LABELS[cat] || cat}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {markets.map((m) => (
                      <MarketRow key={m.id} market={m} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Discoveries */}
              {data.discoveries.length > 0 && (
                <div style={{ marginTop: 'var(--space-8)' }}>
                  <div className="mono" style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    Emerging Markets
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                    High-volume markets not yet on the watchlist.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {data.discoveries.map((m) => (
                      <MarketRow key={m.id} market={m} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mono" style={{ marginTop: 'var(--space-4)', marginBottom: 32, fontSize: 10, color: 'var(--text-tertiary)' }}>
            Data from Kalshi and Polymarket public APIs. Updated every pipeline run.
          </div>
        </div>
      </div>
    </>
  );
}

function MarketRow({ market }: { market: MarketWithSnapshot }) {
  const changeColor = market.price_change_24h > 0.02
    ? '#22c55e'
    : market.price_change_24h < -0.02
      ? '#ef4444'
      : 'var(--text-tertiary)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-panel)',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {market.title}
        </div>
      </div>

      {/* Sparkline */}
      {market.trend.length >= 2 && (
        <div style={{ flexShrink: 0 }}>
          <Sparkline
            data={market.trend}
            positive={market.price_change_24h >= 0}
            width={48}
            height={20}
          />
        </div>
      )}

      {/* Probability */}
      <div className="mono" style={{
        fontSize: 14,
        fontWeight: 600,
        color: probColor(market.current_price),
        minWidth: 40,
        textAlign: 'right',
      }}>
        {formatProb(market.current_price)}
      </div>

      {/* Change */}
      <div className="mono" style={{
        fontSize: 10,
        color: changeColor,
        minWidth: 36,
        textAlign: 'right',
      }}>
        {formatChange(market.price_change_24h)}
      </div>

      {/* Volume */}
      <div className="mono" style={{
        fontSize: 10,
        color: 'var(--text-tertiary)',
        minWidth: 48,
        textAlign: 'right',
      }}>
        {formatVolume(market.volume_24h)}
      </div>

      {/* Source badge */}
      <div className="mono" style={{
        fontSize: 9,
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-tertiary)',
        flexShrink: 0,
      }}>
        {market.source === 'kalshi' ? 'K' : 'P'}
      </div>
    </div>
  );
}
