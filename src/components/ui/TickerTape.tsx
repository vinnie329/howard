'use client';

interface Ticker {
  symbol: string;
  price: string;
  change: number;
}

const tickers: Ticker[] = [
  { symbol: 'BTC', price: '97,842', change: -1.23 },
  { symbol: 'ETH', price: '3,412', change: -2.07 },
  { symbol: 'SPY', price: '512.38', change: 0.34 },
  { symbol: 'QQQ', price: '441.15', change: -0.58 },
  { symbol: 'DXY', price: '104.21', change: 0.12 },
  { symbol: 'TLT', price: '92.67', change: -0.41 },
  { symbol: 'GLD', price: '198.54', change: 1.15 },
  { symbol: 'OIL', price: '76.32', change: -0.89 },
];

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
  // Repeat enough times to fill the viewport so there's no gap
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
        animation: 'ticker-scroll 30s linear infinite',
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
