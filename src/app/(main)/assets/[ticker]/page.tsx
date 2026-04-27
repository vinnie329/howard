'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton, SkeletonLines } from '@/components/ui/Skeleton';
import SourcePill from '@/components/ui/SourcePill';
import Tag from '@/components/ui/Tag';

// Map a Howard ticker to its TradingView symbol for direct chart linking.
function tradingViewUrl(ticker: string): string {
  const map: Record<string, string> = {
    'BZ=F': 'NYMEX:BZ1!', 'CL=F': 'NYMEX:CL1!', 'GC=F': 'COMEX:GC1!',
    'SI=F': 'COMEX:SI1!', 'HG=F': 'COMEX:HG1!', 'NG=F': 'NYMEX:NG1!',
    'BTC-USD': 'COINBASE:BTCUSD', 'ETH-USD': 'COINBASE:ETHUSD',
    'ZEC-USD': 'BINANCE:ZECUSDT',
    '^GSPC': 'SP:SPX', '^IXIC': 'NASDAQ:IXIC', '^DJI': 'DJ:DJI', '^TNX': 'TVC:US10Y',
    'DX-Y.NYB': 'TVC:DXY',
  };
  const symbol = map[ticker] || ticker;
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}

interface Fundamentals {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  businessSummary: string | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  beta: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  returnYtd: number | null;
  return1y: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
}

interface HousePrediction {
  id: string;
  claim: string;
  direction: 'long' | 'short';
  conviction: 'high' | 'medium' | 'low';
  confidence: number;
  target_condition: string;
  reference_value: number | null;
  deadline: string;
  thesis: string;
  themes: string[];
  key_drivers: string[];
}

interface PortfolioPosition {
  ticker: string;
  direction: 'long' | 'short';
  allocation_pct: number;
  entry_price: number | null;
  current_price: number | null;
  thesis: string;
  time_horizon: string;
}

interface SourcePrediction {
  id: string;
  claim: string;
  sentiment: string;
  time_horizon: string;
  confidence: number;
  specificity: string;
  themes: string[];
  date_made: string;
  sources: { name: string; slug: string; weighted_score: number; domains: string[] } | null;
}

interface SourceMention {
  id: string;
  content_id: string;
  summary: string;
  sentiment_overall: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  themes: string[];
  assets_mentioned: string[];
  key_quotes: string[];
  created_at: string;
  content: {
    id: string;
    title: string;
    published_at: string;
    sources: { name: string; slug: string; weighted_score: number } | null;
  } | null;
}

interface Profile {
  ticker: string;
  name: string;
  fundamentals: Fundamentals;
  housePredictions: HousePrediction[];
  portfolioPosition: PortfolioPosition | null;
  portfolioGeneratedAt: string | null;
  sourcePredictions: SourcePrediction[];
  sourceMentions: SourceMention[];
  peers: string[];
}

function fmtBigNum(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(decimals)}%`;
}

function fmtMultiple(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(1) + 'x';
}

function fmtCurrency(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctColor(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'var(--text-tertiary)';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return 'var(--text-tertiary)';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: 'var(--space-3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-panel)',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function TickerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const ticker = decodeURIComponent(params.ticker as string);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((p) => setProfile(p))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <>
        <div className="top-bar"><span style={{ fontSize: 12 }}>Assets</span></div>
        <div style={{ padding: 'var(--space-6)', maxWidth: 800, margin: '0 auto', width: '100%' }}>
          <Skeleton height={28} width="40%" />
          <div style={{ height: 'var(--space-4)' }} />
          <SkeletonLines count={6} />
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <div className="top-bar"><span style={{ fontSize: 12 }}>Assets</span></div>
        <div style={{ padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>Not found.</div>
      </>
    );
  }

  const { fundamentals: f, housePredictions, portfolioPosition: pos, sourcePredictions, sourceMentions, peers } = profile;

  // Pick the highest-confidence active house prediction for the inline header chip.
  const topHouse = housePredictions.length > 0
    ? [...housePredictions].sort((a, b) => b.confidence - a.confidence)[0]
    : null;

  // Derived
  const dev200d = f.currentPrice && f.twoHundredDayAvg ? ((f.currentPrice - f.twoHundredDayAvg) / f.twoHundredDayAvg) * 100 : null;
  const dev50d = f.currentPrice && f.fiftyDayAvg ? ((f.currentPrice - f.fiftyDayAvg) / f.fiftyDayAvg) * 100 : null;
  const portfolioPnl = pos && pos.entry_price && pos.current_price
    ? ((pos.current_price - pos.entry_price) / pos.entry_price) * (pos.direction === 'long' ? 1 : -1) * 100
    : null;

  const sectorLine = [f.exchange, f.sector, f.industry].filter(Boolean).join(' · ');

  return (
    <>
      {/* Breadcrumb top-bar (matches /content/[id]) */}
      <div className="top-bar" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
        <Link href="/assets" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>
          Assets
        </Link>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0 }}>/</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {ticker}
        </span>
      </div>

      {/* Document flow: single column, max-width 800, centered (matches /content/[id]) */}
      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, maxWidth: 800, width: '100%', margin: '0 auto' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12,
            cursor: 'pointer', padding: 0, marginBottom: 'var(--space-4)',
          }}
        >
          ← Back to assets
        </button>

        {/* Header — row 1: ticker + name (left) + price (right). Row 2: chip row. Row 3: sector. */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          {/* Row 1: title row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <h1 className="mono" style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1 }}>{ticker}</h1>
            <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>{f.name || profile.name}</span>
            <div style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 24, fontWeight: 600 }}>{fmtCurrency(f.currentPrice)}</span>
          </div>

          {/* Row 2: chip row (house view + portfolio + tradingview) */}
          {(topHouse || pos) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
              {topHouse && (() => {
                const dirColor = topHouse.direction === 'long' ? '#22c55e' : '#ef4444';
                const arrow = topHouse.direction === 'long' ? '↑' : '↓';
                const convColor = topHouse.conviction === 'high' ? '#22c55e' : topHouse.conviction === 'medium' ? '#eab308' : '#ef4444';
                return (
                  <>
                    <span style={{ color: dirColor, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{arrow}</span>
                    <span className="mono" style={{
                      fontSize: 10, padding: '3px 7px', borderRadius: 3,
                      background: `color-mix(in srgb, ${dirColor} 15%, transparent)`,
                      color: dirColor, letterSpacing: '0.06em', fontWeight: 500,
                    }}>
                      {topHouse.direction.toUpperCase()}
                    </span>
                    <span className="mono" style={{
                      fontSize: 10, padding: '3px 7px', borderRadius: 3,
                      background: `color-mix(in srgb, ${convColor} 15%, transparent)`,
                      color: convColor, letterSpacing: '0.06em', fontWeight: 500,
                    }}>
                      {topHouse.conviction.toUpperCase()} {topHouse.confidence}
                    </span>
                  </>
                );
              })()}
              {pos && (
                <span className="mono" style={{
                  fontSize: 10, padding: '3px 7px', borderRadius: 3,
                  background: 'var(--accent-dim)', color: 'var(--accent)', letterSpacing: '0.06em', fontWeight: 500,
                }}>
                  IN PORT · {pos.direction.toUpperCase()} {pos.allocation_pct.toFixed(1)}%
                </span>
              )}
              <a
                href={tradingViewUrl(ticker)}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{
                  fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'none',
                  padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border)',
                }}
              >
                TradingView ↗
              </a>
            </div>
          )}

          {/* Row 3: sector */}
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {sectorLine || '—'}
          </span>
        </div>

        {/* House view banner */}
        {topHouse && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>House view</div>
            <div style={{
              padding: 'var(--space-4)',
              border: `1px solid ${topHouse.direction === 'long' ? '#22c55e' : '#ef4444'}66`,
              borderRadius: 'var(--radius-md)',
              background: `color-mix(in srgb, ${topHouse.direction === 'long' ? '#22c55e' : '#ef4444'} 8%, var(--bg-panel))`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span style={{ color: topHouse.direction === 'long' ? '#22c55e' : '#ef4444', fontSize: 16, fontWeight: 600 }}>
                  {topHouse.direction === 'long' ? '↑' : '↓'} {topHouse.direction.toUpperCase()}
                </span>
                <span className="mono" style={{
                  fontSize: 10, padding: '3px 7px', borderRadius: 3,
                  background: 'var(--bg-surface)', color: 'var(--text-secondary)', letterSpacing: '0.06em',
                }}>
                  {topHouse.conviction.toUpperCase()} · {topHouse.confidence}%
                </span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>{topHouse.claim}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                Ref ${topHouse.reference_value?.toFixed(2) || '—'} · {topHouse.target_condition} · Deadline {fmtShortDate(topHouse.deadline)}
              </div>
            </div>
          </div>
        )}

        {/* Portfolio banner */}
        {pos && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Portfolio position</div>
            <div style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--accent-dim)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-panel)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
                  {pos.direction.toUpperCase()} {pos.allocation_pct.toFixed(1)}%
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{pos.time_horizon}</span>
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                Entry {fmtCurrency(pos.entry_price)} → Current {fmtCurrency(pos.current_price)}
                {portfolioPnl !== null && (
                  <span style={{ color: pctColor(portfolioPnl), marginLeft: 'var(--space-2)' }}>
                    {portfolioPnl >= 0 ? '+' : ''}{portfolioPnl.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {pos.thesis}
              </div>
            </div>
          </div>
        )}

        {/* Returns */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Returns</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-2)' }}>
            <StatChip label="1D" value={fmtPct(f.return1d)} color={pctColor(f.return1d)} />
            <StatChip label="1W" value={fmtPct(f.return1w)} color={pctColor(f.return1w)} />
            <StatChip label="1M" value={fmtPct(f.return1m)} color={pctColor(f.return1m)} />
            <StatChip label="3M" value={fmtPct(f.return3m)} color={pctColor(f.return3m)} />
            <StatChip label="YTD" value={fmtPct(f.returnYtd)} color={pctColor(f.returnYtd)} />
            <StatChip label="1Y" value={fmtPct(f.return1y)} color={pctColor(f.return1y)} />
          </div>
        </div>

        {/* Technical deviations */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Technical deviations</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
            <StatChip label="50D MA" value={fmtCurrency(f.fiftyDayAvg)} />
            <StatChip
              label="50D MA Δ"
              value={dev50d !== null ? `${dev50d >= 0 ? '+' : ''}${dev50d.toFixed(2)}%` : '—'}
              color={pctColor(dev50d)}
            />
            <StatChip label="200D MA" value={fmtCurrency(f.twoHundredDayAvg)} />
            <StatChip
              label="200D MA Δ"
              value={dev200d !== null ? `${dev200d >= 0 ? '+' : ''}${dev200d.toFixed(2)}%` : '—'}
              color={pctColor(dev200d)}
            />
          </div>
        </div>

        {/* Key financials */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Key financials</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
            <StatChip label="Market Cap" value={fmtBigNum(f.marketCap)} />
            <StatChip label="P/E (TTM)" value={fmtMultiple(f.trailingPE)} />
            <StatChip label="P/E (Fwd)" value={fmtMultiple(f.forwardPE)} />
            <StatChip label="P/S" value={fmtMultiple(f.priceToSales)} />
            <StatChip label="Revenue" value={fmtBigNum(f.revenue)} />
            <StatChip label="Rev Growth" value={fmtPct(f.revenueGrowth, 1)} color={pctColor(f.revenueGrowth)} />
            <StatChip label="Gross Margin" value={fmtPct(f.grossMargin, 1)} />
            <StatChip label="Op Margin" value={fmtPct(f.operatingMargin, 1)} />
            <StatChip label="Net Margin" value={fmtPct(f.profitMargin, 1)} />
            <StatChip label="Cash" value={fmtBigNum(f.totalCash)} />
            <StatChip label="Debt" value={fmtBigNum(f.totalDebt)} />
            <StatChip label="Div Yield" value={fmtPct(f.dividendYield, 2)} />
          </div>
        </div>

        {/* Business */}
        {f.businessSummary && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Business</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{f.businessSummary}</p>
          </div>
        )}

        {/* Sector peers — same chip style as ASSETS MENTIONED on /content */}
        {peers.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Sector peers</div>
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {peers.map((p) => (
                <Link
                  key={p}
                  href={`/assets/${encodeURIComponent(p)}`}
                  className="mono"
                  style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 2,
                    background: 'var(--bg-surface)',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                  }}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Source predictions — table mirroring /content predictions block */}
        {sourcePredictions.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>
              Predictions ({sourcePredictions.length})
            </div>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 110px 80px 90px',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                gap: 'var(--space-2)',
              }}>
                <span className="label" style={{ margin: 0 }}>Claim</span>
                <span className="label" style={{ margin: 0 }}>Source</span>
                <span className="label" style={{ margin: 0 }}>Sentiment</span>
                <span className="label" style={{ margin: 0 }}>Horizon</span>
              </div>
              {sourcePredictions.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 110px 80px 90px',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    gap: 'var(--space-2)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)', lineHeight: 1.4 }}>{p.claim}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{fmtShortDate(p.date_made)}</div>
                  </div>
                  <div>{p.sources && <SourcePill name={p.sources.name} slug={p.sources.slug} />}</div>
                  <div>
                    <Tag
                      label={p.sentiment}
                      variant={p.sentiment === 'bullish' ? 'bullish' : p.sentiment === 'bearish' ? 'bearish' : 'default'}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: 11 }}>{p.time_horizon}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source mentions — list of cards */}
        {sourceMentions.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>
              Source mentions ({sourceMentions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sourceMentions.map((m) => {
                const sentColor =
                  m.sentiment_overall === 'bullish' ? '#22c55e'
                  : m.sentiment_overall === 'bearish' ? '#ef4444'
                  : 'var(--text-tertiary)';
                return (
                  <Link
                    key={m.id}
                    href={`/content/${m.content_id}`}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-panel)',
                      textDecoration: 'none',
                      color: 'var(--text-primary)',
                      display: 'block',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {m.content?.sources && <SourcePill name={m.content.sources.name} slug={m.content.sources.slug} />}
                      <span className="mono" style={{
                        fontSize: 9, color: sentColor, padding: '1px 5px', borderRadius: 2,
                        background: `color-mix(in srgb, ${sentColor} 15%, transparent)`, letterSpacing: '0.05em',
                      }}>
                        {m.sentiment_overall.toUpperCase()}
                      </span>
                      {m.content && (
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {fmtShortDate(m.content.published_at)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 'var(--space-1)', lineHeight: 1.4 }}>
                      {m.content?.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {m.summary?.slice(0, 240)}{m.summary && m.summary.length > 240 ? '…' : ''}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {sourcePredictions.length === 0 && sourceMentions.length === 0 && (
          <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
            No source coverage yet for {ticker}.
          </div>
        )}

        {/* Empty-date helper for layout consistency */}
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-4) 0' }}>
          {fmtDate(new Date().toISOString())}
        </div>
      </div>
    </>
  );
}
