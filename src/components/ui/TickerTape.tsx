'use client';

import { useState, useEffect } from 'react';

interface Ticker {
  symbol: string;
  price: string;
  change: number;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function TickerItem({ t }: { t: Ticker }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-tertiary)',
        letterSpacing: '0.02em',
      }}>
        {t.symbol}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-secondary)',
      }}>
        {t.price}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: t.change >= 0 ? '#22C55E' : '#EF4444',
      }}>
        {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
      </span>
    </div>
  );
}

export default function TickerTape() {
  const [tickers, setTickers] = useState<Ticker[]>([]);

  useEffect(() => {
    const load = () => {
      fetch('/api/watchlist')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTickers(data.map((q: { symbol: string; price: number; changePercent: number }) => ({
              symbol: q.symbol,
              price: formatPrice(q.price),
              change: q.changePercent,
            })));
          }
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (tickers.length === 0) {
    return (
      <div style={{
        height: 32,
        minHeight: 32,
        maxWidth: 1728,
        width: '100%',
        margin: '0 auto',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        borderLeft: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
      }} />
    );
  }

  // Repeat enough to fill and loop seamlessly
  const repeated = [...tickers, ...tickers, ...tickers, ...tickers];

  return (
    <div style={{
      height: 32,
      minHeight: 32,
      maxWidth: 1728,
      width: '100%',
      margin: '0 auto',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      borderLeft: '1px solid var(--border)',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        height: '100%',
        width: 'max-content',
        animation: 'ticker-scroll 60s linear infinite',
      }}>
        {repeated.map((t, i) => (
          <TickerItem key={`${t.symbol}-${i}`} t={t} />
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
      `}</style>
    </div>
  );
}
