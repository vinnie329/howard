'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Table, { type TableColumn } from '@/components/ui/Table';
import { SkeletonRows } from '@/components/ui/Skeleton';

interface EquitiesRow {
  ticker: string;
  name: string;
  hasHouseView: boolean;
  houseDirection: 'long' | 'short' | null;
  houseConviction: 'high' | 'medium' | 'low' | null;
  houseConfidence: number | null;
  inPortfolio: boolean;
  portfolioDirection: 'long' | 'short' | null;
  portfolioAlloc: number | null;
  sourceMentions: number;
  sourcePredictions: number;
}

interface TechnicalsRow {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number | null;
  change24h: number | null;
  changeYtd: number | null;
  devFromMa200d: number | null;
  devFromMa200w: number | null;
}

// Display ticker may be normalized (e.g., GC=F → GC) for the technicals symbol
function normalizeForTechnicals(ticker: string): string {
  return ticker.replace('=F', '').replace('-Y.NYB', '').replace('^', '');
}

interface MergedRow extends EquitiesRow {
  currentPrice: number | null;
  change24h: number | null;
  changeYtd: number | null;
}

function formatCurrency(n: number | null): string {
  if (n === null) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number | null, plus = true): string {
  if (n === null || n === undefined) return '—';
  const sign = n >= 0 ? (plus ? '+' : '') : '';
  return `${sign}${n.toFixed(2)}%`;
}

function pctColor(n: number | null): string {
  if (n === null) return 'var(--text-tertiary)';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return 'var(--text-tertiary)';
}

function ConvictionBadge({ conviction, confidence }: { conviction: 'high' | 'medium' | 'low'; confidence: number | null }) {
  const color = conviction === 'high' ? '#22c55e' : conviction === 'medium' ? '#eab308' : '#ef4444';
  const label = conviction.toUpperCase();
  return (
    <span style={{
      fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 3,
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color, letterSpacing: '0.05em',
    }}>
      {label}{confidence !== null ? ` ${confidence}` : ''}
    </span>
  );
}

function DirectionArrow({ direction }: { direction: 'long' | 'short' | null }) {
  if (!direction) return <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>—</span>;
  const color = direction === 'long' ? '#22c55e' : '#ef4444';
  const arrow = direction === 'long' ? '↑' : '↓';
  return <span style={{ color, fontSize: 14, fontWeight: 600 }}>{arrow}</span>;
}

export default function EquitiesPage() {
  const router = useRouter();
  const [equities, setEquities] = useState<EquitiesRow[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/assets').then((r) => r.json()),
      fetch('/api/technicals').then((r) => r.json()),
    ]).then(([eq, tech]) => {
      setEquities(eq);
      setTechnicals(tech);
    }).finally(() => setLoading(false));
  }, []);

  const merged = useMemo<MergedRow[]>(() => {
    const techByDisplay = new Map<string, TechnicalsRow>();
    for (const t of technicals) techByDisplay.set(t.symbol, t);
    return equities.map((e) => {
      const t = techByDisplay.get(normalizeForTechnicals(e.ticker)) || techByDisplay.get(e.ticker);
      return {
        ...e,
        currentPrice: t?.currentPrice ?? null,
        change24h: t?.change24h ?? null,
        changeYtd: t?.changeYtd ?? null,
      };
    });
  }, [equities, technicals]);

  const columns: TableColumn<MergedRow>[] = [
    {
      key: 'ticker',
      label: 'TICKER',
      width: '90px',
      sortValue: (r) => r.ticker,
      render: (r) => <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{r.ticker}</span>,
    },
    {
      key: 'name',
      label: 'NAME',
      width: '1fr',
      // Sort by house-view confidence first (so a sort on this column groups by view), then by name.
      sortValue: (r) => r.hasHouseView ? -(r.houseConfidence ?? 0) : 999,
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto' }}>
            {r.name}
          </span>
          {r.hasHouseView && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <DirectionArrow direction={r.houseDirection} />
              <ConvictionBadge conviction={r.houseConviction!} confidence={r.houseConfidence} />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'PRICE',
      width: '90px',
      align: 'right',
      sortValue: (r) => r.currentPrice,
      render: (r) => <span className="mono" style={{ fontSize: 12 }}>{formatCurrency(r.currentPrice)}</span>,
    },
    {
      key: 'change24h',
      label: '24H',
      width: '70px',
      align: 'right',
      sortValue: (r) => r.change24h,
      render: (r) => {
        if (r.change24h === null) return <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>;
        const pct = r.change24h * 100;
        return <span className="mono" style={{ fontSize: 11, color: pctColor(pct) }}>{formatPct(pct, true)}</span>;
      },
    },
    {
      key: 'changeYtd',
      label: 'YTD',
      width: '70px',
      align: 'right',
      sortValue: (r) => r.changeYtd,
      render: (r) => {
        if (r.changeYtd === null) return <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>;
        const pct = r.changeYtd * 100;
        return <span className="mono" style={{ fontSize: 11, color: pctColor(pct) }}>{formatPct(pct, true)}</span>;
      },
    },
    {
      key: 'portfolio',
      label: 'PORTFOLIO',
      width: '90px',
      align: 'right',
      sortValue: (r) => r.inPortfolio ? (r.portfolioAlloc ?? 0) : -1,
      render: (r) => r.inPortfolio ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <DirectionArrow direction={r.portfolioDirection} />
          <span className="mono" style={{ fontSize: 11 }}>{r.portfolioAlloc?.toFixed(1)}%</span>
        </div>
      ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>,
    },
    {
      key: 'mentions',
      label: 'MENTIONS',
      width: '70px',
      align: 'right',
      sortValue: (r) => r.sourceMentions,
      render: (r) => <span className="mono" style={{ fontSize: 11, color: r.sourceMentions > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{r.sourceMentions || '—'}</span>,
    },
    {
      key: 'preds',
      label: 'PREDS',
      width: '60px',
      align: 'right',
      sortValue: (r) => r.sourcePredictions,
      render: (r) => <span className="mono" style={{ fontSize: 11, color: r.sourcePredictions > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{r.sourcePredictions || '—'}</span>,
    },
  ];

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Assets</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Assets</h1>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
          The tracked assets universe — every ticker with technical coverage. Click a row for the full profile.
        </p>

        {loading ? (
          <SkeletonRows count={10} />
        ) : (
          <Table
            columns={columns}
            rows={merged}
            rowKey={(r) => r.ticker}
            onRowClick={(r) => router.push(`/assets/${encodeURIComponent(r.ticker)}`)}
            initialSort={{ key: 'mentions', dir: 'desc' }}
            emptyMessage="No assets tracked yet."
          />
        )}

        <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
          {merged.length} ticker{merged.length !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  );
}
