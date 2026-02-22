'use client';

import { useState, useEffect, useMemo } from 'react';
import DeviationGauge from '@/components/ui/DeviationGauge';
import { SkeletonRows } from '@/components/ui/Skeleton';

interface TechnicalData {
  symbol: string;
  name: string;
  tvSymbol: string;
  currentPrice: number;
  ma200d: number | null;
  devFromMa200d: number | null;
  historicalMaxDev200d: number | null;
  historicalMinDev200d: number | null;
  ma200w: number | null;
  devFromMa200w: number | null;
  historicalMaxDev200w: number | null;
  historicalMinDev200w: number | null;
}

type SortKey = 'name' | 'price' | 'dev200d' | 'dev200w';
type SortDir = 'asc' | 'desc';

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function formatDev(dev: number | null): string {
  if (dev === null) return '—';
  const sign = dev >= 0 ? '+' : '';
  return `${sign}${dev.toFixed(1)}%`;
}

function devColor(dev: number | null): string {
  if (dev === null) return 'var(--text-tertiary)';
  if (dev > 0) return 'var(--green)';
  if (dev < 0) return '#ef4444';
  return 'var(--text-secondary)';
}

export default function TechnicalsPage() {
  const [data, setData] = useState<TechnicalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('dev200d');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    fetch('/api/technicals')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...data];
    const dir = sortDir === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'price':
          return dir * (a.currentPrice - b.currentPrice);
        case 'dev200d':
          return dir * ((a.devFromMa200d ?? 0) - (b.devFromMa200d ?? 0));
        case 'dev200w':
          return dir * ((a.devFromMa200w ?? 0) - (b.devFromMa200w ?? 0));
        default:
          return 0;
      }
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const above200d = data.filter((d) => d.devFromMa200d !== null && d.devFromMa200d > 0).length;
  const above200w = data.filter((d) => d.devFromMa200w !== null && d.devFromMa200w > 0).length;

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'desc' ? ' \u2193' : ' \u2191';
  };

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Technicals</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-3)' }}>Moving Average Deviation</h1>

        {/* Summary row */}
        <div className="mono" style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-4)',
        }}>
          <span>
            <span style={{ color: 'var(--green)' }}>{above200d}</span>/{data.length} above 200d MA
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>|</span>
          <span>
            <span style={{ color: 'var(--green)' }}>{above200w}</span>/{data.length} above 200w MA
          </span>
        </div>

        {loading ? (
          <SkeletonRows count={8} />
        ) : data.length === 0 ? (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
            No data available.
          </div>
        ) : (
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 0.8fr 1fr 1fr',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
            }}>
              <HeaderCell label="Asset" sortKey="name" currentKey={sortKey} indicator={sortIndicator('name')} onClick={() => handleSort('name')} />
              <HeaderCell label="Price" sortKey="price" currentKey={sortKey} indicator={sortIndicator('price')} onClick={() => handleSort('price')} />
              <div style={{ display: 'flex', gap: 'var(--space-3)', paddingLeft: 'var(--space-3)', borderLeft: '1px solid var(--border)' }}>
                <HeaderCell label="200d Dev" sortKey="dev200d" currentKey={sortKey} indicator={sortIndicator('dev200d')} onClick={() => handleSort('dev200d')} />
                <span className="label" style={{ fontSize: 10 }}>Range</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', paddingLeft: 'var(--space-3)', borderLeft: '1px solid var(--border)' }}>
                <HeaderCell label="200w Dev" sortKey="dev200w" currentKey={sortKey} indicator={sortIndicator('dev200w')} onClick={() => handleSort('dev200w')} />
                <span className="label" style={{ fontSize: 10 }}>Range</span>
              </div>
            </div>

            {/* Rows */}
            <div className="stagger-in">{sorted.map((item) => (
              <a
                key={item.symbol}
                href={`https://www.tradingview.com/chart/?symbol=${item.tvSymbol}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 0.8fr 1fr 1fr',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Asset */}
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)' }}>
                    {item.symbol}
                  </span>
                </div>

                {/* Price */}
                <span className="mono" style={{ fontSize: 12 }}>
                  {formatPrice(item.currentPrice)}
                </span>

                {/* 200d group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingLeft: 'var(--space-3)', borderLeft: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 12, color: devColor(item.devFromMa200d), minWidth: 52 }}>
                    {formatDev(item.devFromMa200d)}
                  </span>
                  {item.devFromMa200d !== null && item.historicalMaxDev200d !== null && item.historicalMinDev200d !== null ? (
                    <DeviationGauge
                      current={item.devFromMa200d}
                      histMin={item.historicalMinDev200d}
                      histMax={item.historicalMaxDev200d}
                    />
                  ) : (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>—</span>
                  )}
                </div>

                {/* 200w group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingLeft: 'var(--space-3)', borderLeft: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 12, color: devColor(item.devFromMa200w), minWidth: 52 }}>
                    {formatDev(item.devFromMa200w)}
                  </span>
                  {item.devFromMa200w !== null && item.historicalMaxDev200w !== null && item.historicalMinDev200w !== null ? (
                    <DeviationGauge
                      current={item.devFromMa200w}
                      histMin={item.historicalMinDev200w}
                      histMax={item.historicalMaxDev200w}
                    />
                  ) : (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>—</span>
                  )}
                </div>
              </a>
            ))}</div>
          </div>
        )}

        <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
          MA data cached for 1 hour. Click any row to open on TradingView.
        </div>
      </div>
    </>
  );
}

function HeaderCell({
  label,
  sortKey,
  currentKey,
  indicator,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  indicator: string;
  onClick: () => void;
}) {
  return (
    <span
      className="label"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontSize: 10,
        userSelect: 'none',
        color: currentKey === sortKey ? 'var(--text-primary)' : undefined,
      }}
    >
      {label}{indicator}
    </span>
  );
}
