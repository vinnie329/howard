'use client';

import { useState, useEffect } from 'react';
import Sparkline from './Sparkline';
import { SkeletonRows } from './Skeleton';

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  tvSymbol: string;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function WatchlistPanel() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/watchlist')
      .then((res) => res.json())
      .then((data) => {
        setQuotes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch('/api/watchlist')
        .then((res) => res.json())
        .then((data) => setQuotes(data))
        .catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <SkeletonRows count={5} />;
  }

  if (quotes.length === 0) {
    return (
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: 'var(--space-2) 0' }}>
        Unable to load quotes.
      </div>
    );
  }

  return (
    <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {quotes.map((q) => {
        const isPositive = q.changePercent >= 0;
        const changeColor = isPositive ? '#22c55e' : '#ef4444';
        const arrow = isPositive ? '\u25B2' : '\u25BC';

        const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(q.tvSymbol)}`;

        return (
          <a
            key={q.symbol}
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {/* Symbol + name */}
            <div style={{ minWidth: 0, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span style={{ color: changeColor, fontSize: 7, lineHeight: 1 }}>{arrow}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {q.symbol}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {q.name}
              </div>
            </div>

            {/* Sparkline */}
            {q.sparkline.length > 1 && (
              <Sparkline data={q.sparkline} positive={isPositive} width={56} height={24} />
            )}

            {/* Price + change */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                {formatPrice(q.price)}
              </div>
              <div className="mono" style={{ fontSize: 10, color: changeColor, marginTop: 1 }}>
                {isPositive ? '+' : ''}{q.changePercent.toFixed(2)}%
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
