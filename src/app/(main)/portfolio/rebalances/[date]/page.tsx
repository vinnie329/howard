'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPortfolioRebalanceDetail } from '@/lib/data';
import type { PortfolioRebalanceDetail } from '@/lib/data';
import { Skeleton, SkeletonLines } from '@/components/ui/Skeleton';
import type { PortfolioPosition } from '@/types';

function DirectionArrow({ direction }: { direction: string }) {
  const color = direction === 'long' ? '#22c55e' : '#ef4444';
  const arrow = direction === 'long' ? '\u2191' : '\u2193';
  return <span style={{ color, fontSize: 16, fontWeight: 600 }}>{arrow}</span>;
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

function PositionCard({ pos, label, labelColor, pnl }: {
  pos: PortfolioPosition;
  label: string;
  labelColor: string;
  pnl?: number | null;
}) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span className="mono" style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 2,
          background: `color-mix(in srgb, ${labelColor} 15%, transparent)`,
          color: labelColor,
        }}>
          {label}
        </span>
        <DirectionArrow direction={pos.direction} />
        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {pos.ticker}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pos.asset_name}</span>
        <ConvictionBadge conviction={pos.conviction} confidence={pos.confidence} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {pos.allocation_pct}%
        </span>
        {pnl != null && (
          <span className="mono" style={{
            fontSize: 10, fontWeight: 500,
            color: pnl >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
        {pos.thesis}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', fontSize: 11 }}>
        {pos.key_drivers.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Key Drivers</div>
            {pos.key_drivers.map((d, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
        )}
        {pos.supporting_sources.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Sources</div>
            {pos.supporting_sources.map((s, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)' }}>{s}</div>
            ))}
          </div>
        )}
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Details</div>
          <div style={{ color: 'var(--text-secondary)' }}>Horizon: {pos.time_horizon}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Confidence: {pos.confidence}%</div>
          {pos.entry_price != null && (
            <div style={{ color: 'var(--text-secondary)' }}>Entry: ${pos.entry_price.toFixed(2)}</div>
          )}
          {pos.target_price != null && (
            <div style={{ color: pos.direction === 'long' ? '#22c55e' : '#ef4444' }}>
              Target: ${pos.target_price.toFixed(2)}
            </div>
          )}
          {pos.stop_loss_condition && (
            <div style={{ color: '#ef4444' }}>Stop: {pos.stop_loss_condition}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioRebalanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [detail, setDetail] = useState<PortfolioRebalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const date = params.date as string;
    if (date) {
      getPortfolioRebalanceDetail(date).then((result) => {
        setDetail(result);
        setLoading(false);
      });
    }
  }, [params.date]);

  if (loading) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Portfolio</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton height={20} width="60%" />
          <SkeletonLines count={5} />
        </div>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <div className="top-bar">
          <Link href="/portfolio" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Portfolio</Link>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1 }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Rebalance not found.</p>
        </div>
      </>
    );
  }

  const date = new Date(detail.date + 'T00:00:00').toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalChanges = detail.added.length + detail.removed.length + detail.resized.length;
  const riskChanged = detail.risk_posture !== detail.prev_risk_posture;

  return (
    <>
      <div className="top-bar">
        <Link href="/portfolio" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Portfolio</Link>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Rebalance</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, maxWidth: 740, margin: '0 auto' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 'var(--space-4)',
          }}
        >
          &larr; Back to portfolio
        </button>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <RiskBadge posture={detail.risk_posture} />
            <span className="mono" style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 2,
              background: 'rgba(234,179,8,0.1)', color: '#eab308',
              border: '1px solid rgba(234,179,8,0.25)',
            }}>
              {totalChanges} change{totalChanges !== 1 ? 's' : ''}
            </span>
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Portfolio Rebalance
          </h1>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {date}
          </span>
        </div>

        {/* Summary box */}
        <div style={{
          display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)',
          padding: 'var(--space-4)', background: 'var(--bg-panel)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          flexWrap: 'wrap',
        }}>
          {riskChanged && (
            <div>
              <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Risk Posture</div>
              <div style={{ fontSize: 14 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{detail.prev_risk_posture}</span>
                <span style={{ color: 'var(--text-tertiary)', margin: '0 var(--space-2)' }}>&rarr;</span>
                <span style={{ fontWeight: 500 }}>{detail.risk_posture}</span>
              </div>
            </div>
          )}
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Added</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: detail.added.length > 0 ? '#22c55e' : 'var(--text-tertiary)' }}>
              {detail.added.length}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Removed</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: detail.removed.length > 0 ? '#ef4444' : 'var(--text-tertiary)' }}>
              {detail.removed.length}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Resized</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: detail.resized.length > 0 ? '#eab308' : 'var(--text-tertiary)' }}>
              {detail.resized.length}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Unchanged</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-tertiary)' }}>
              {detail.unchanged.length}
            </div>
          </div>
        </div>

        {/* Reasoning */}
        {detail.reasoning && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Rebalance Reasoning</div>
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {detail.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Drivers */}
        {detail.drivers.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>House View Drivers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {detail.drivers.map((d, i) => (
                <div key={i} style={{
                  padding: 'var(--space-3)',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Added positions */}
        {detail.added.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Positions Added</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {detail.added.map((pos) => (
                <PositionCard key={pos.id} pos={pos} label="ADDED" labelColor="#22c55e" />
              ))}
            </div>
          </div>
        )}

        {/* Removed positions */}
        {detail.removed.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Positions Removed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {detail.removed.map((pos) => (
                <PositionCard key={pos.id} pos={pos} label="REMOVED" labelColor="#ef4444" pnl={pos.pnl_pct} />
              ))}
            </div>
          </div>
        )}

        {/* Resized positions */}
        {detail.resized.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Positions Resized</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {detail.resized.map(({ current, previous }) => (
                <div key={current.id}>
                  <div style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(234,179,8,0.05)',
                    border: '1px solid rgba(234,179,8,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--space-2)',
                    fontSize: 11,
                  }}>
                    <span className="label">Allocation </span>
                    <span className="mono" style={{ color: 'var(--text-tertiary)' }}>{previous.allocation_pct}%</span>
                    <span style={{ color: 'var(--text-tertiary)', margin: '0 var(--space-2)' }}>&rarr;</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{current.allocation_pct}%</span>
                  </div>
                  <PositionCard pos={current} label="RESIZED" labelColor="#eab308" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
