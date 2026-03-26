'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getHousePredictionsForAsset } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';
import StatsGrid from '@/components/ui/StatsGrid';
import type { HousePrediction } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function formatPrice(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AssetDetailPage() {
  const params = useParams();
  const asset = decodeURIComponent(params.asset as string);
  const [predictions, setPredictions] = useState<HousePrediction[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHousePredictionsForAsset(asset).then((data) => {
      setPredictions(data);
      setLoading(false);
    });
    // Fetch current price
    const tickerMap: Record<string, string> = {
      'S&P 500': '^GSPC', SPX: '^GSPC', NASDAQ: '^IXIC',
      Gold: 'GC=F', GLD: 'GC=F', Silver: 'SI=F', Oil: 'CL=F',
      Bitcoin: 'BTC-USD', 'BTC-USD': 'BTC-USD', TLT: 'TLT',
      Copper: 'HG=F', 'HG=F': 'HG=F', DXY: 'DX-Y.NYB',
    };
    const symbol = tickerMap[asset] || asset;
    const end = Math.floor(Date.now() / 1000);
    const start = end - 5 * 24 * 60 * 60;
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`)
      .then(r => r.json())
      .then(json => {
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if (closes?.length) setCurrentPrice(closes.filter((c: number | null) => c !== null).pop());
      })
      .catch(() => {});
  }, [asset]);

  const latest = predictions.length > 0 ? predictions[predictions.length - 1] : null;
  const days = latest ? daysUntil(latest.deadline) : 0;
  const isOverdue = days < 0;
  const dirColor = latest?.direction === 'long' ? '#22c55e' : latest?.direction === 'short' ? '#ef4444' : 'var(--text-tertiary)';
  const dirArrow = latest?.direction === 'long' ? '\u2191' : latest?.direction === 'short' ? '\u2193' : '\u2194';

  return (
    <>
      <div className="top-bar">
        <Link href="/house-view" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 14 }}>&larr;</span> House View
        </Link>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <SkeletonRows count={8} />
        ) : !latest ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              No predictions found for {asset}
            </span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: dirColor, fontSize: 28, fontWeight: 700 }}>{dirArrow}</span>
              <h1 style={{ margin: 0 }}>{asset}</h1>
              <span className="mono" style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 3,
                background: latest.direction === 'long' ? 'rgba(34,197,94,0.15)' : latest.direction === 'short' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)',
                color: dirColor,
              }}>
                {latest.direction.toUpperCase()}
              </span>
            </div>

            <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
              {latest.claim}
            </p>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <StatsGrid columns={3} stats={[
                { value: `${latest.confidence}%`, label: 'Confidence', color: latest.confidence >= 70 ? '#22c55e' : latest.confidence >= 40 ? '#eab308' : '#ef4444' },
                { value: latest.conviction.toUpperCase(), label: 'Conviction', color: latest.confidence >= 70 ? '#22c55e' : latest.confidence >= 40 ? '#eab308' : '#ef4444' },
                { value: latest.time_horizon, label: 'Time Horizon' },
                { value: isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`, label: `Deadline · ${formatDate(latest.deadline)}`, color: isOverdue ? '#ef4444' : days <= 7 ? '#eab308' : undefined },
                { value: latest.reference_value !== null ? formatPrice(latest.reference_value) : '—', label: `Price at Call · ${formatDate(latest.created_at)}` },
                { value: currentPrice !== null ? formatPrice(currentPrice) : '—', label: 'Current Price' },
              ]} />
            </div>

            {/* Detail sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <DetailSection label="Target">
                <p style={{ color: 'var(--text-primary)', fontSize: 13 }}>{latest.target_condition}</p>
              </DetailSection>

              <DetailSection label="Thesis">
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>{latest.thesis}</p>
              </DetailSection>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <DetailSection label="Key Drivers">
                  <ul style={{ color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)', margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                    {latest.key_drivers.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </DetailSection>

                <DetailSection label="Supporting Sources">
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {latest.supporting_sources.map((s) => (
                      <span key={s} className="mono" style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 3,
                        background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </DetailSection>
              </div>

              {latest.invalidation_criteria && (
                <DetailSection label="Invalidation Criteria" labelColor="#ef4444">
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
                    {latest.invalidation_criteria}
                  </p>
                </DetailSection>
              )}
            </div>

            {/* Prediction History */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 14, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
                Prediction History
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)', fontWeight: 400 }}>
                  {predictions.length} prediction{predictions.length !== 1 ? 's' : ''}
                </span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[...predictions].reverse().map((pred, i) => {
                  const isLatest = pred.id === predictions[predictions.length - 1].id;
                  const isSuperseded = !!pred.superseded_by;
                  const isResolved = pred.outcome !== 'pending' && !isSuperseded;
                  const pConfColor = pred.confidence >= 70 ? '#22c55e' : pred.confidence >= 40 ? '#eab308' : '#ef4444';

                  let statusLabel: string;
                  let statusColor: string;
                  if (isLatest && pred.outcome === 'pending') {
                    statusLabel = 'ACTIVE';
                    statusColor = '#6366f1';
                  } else if (isResolved) {
                    statusLabel = (pred.outcome || '').toUpperCase().replace('_', ' ');
                    statusColor = pred.outcome === 'correct' ? '#22c55e' : pred.outcome === 'incorrect' ? '#ef4444' : '#eab308';
                  } else if (isSuperseded) {
                    statusLabel = 'SUPERSEDED';
                    statusColor = 'var(--text-tertiary)';
                  } else {
                    statusLabel = 'PENDING';
                    statusColor = 'var(--text-tertiary)';
                  }

                  // Find chronologically previous prediction for confidence delta
                  const chronIndex = predictions.indexOf(pred);
                  const prevConf = chronIndex > 0 ? predictions[chronIndex - 1].confidence : null;
                  const delta = prevConf !== null ? pred.confidence - prevConf : null;
                  const isFirst = i === 0;
                  const isLast = i === predictions.length - 1;

                  return (
                    <div key={pred.id} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      {/* Timeline rail */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                        <div style={{ width: 2, flex: '1 0 8px', background: isFirst ? 'transparent' : 'var(--border)' }} />
                        <div style={{
                          width: isLatest ? 12 : 8,
                          height: isLatest ? 12 : 8,
                          borderRadius: '50%',
                          background: isSuperseded ? 'var(--border)' : statusColor,
                          flexShrink: 0,
                          border: isLatest ? `2px solid ${statusColor}` : 'none',
                        }} />
                        <div style={{ width: 2, flex: '1 0 8px', background: isLast ? 'transparent' : 'var(--border)' }} />
                      </div>

                      {/* Entry content */}
                      <div style={{ flex: 1, padding: 'var(--space-3) 0', opacity: isSuperseded ? 0.45 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                            {formatDate(pred.created_at)}
                          </span>
                          <span className="mono" style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 3,
                            background: `color-mix(in srgb, ${statusColor} 15%, transparent)`, color: statusColor,
                          }}>
                            {statusLabel}
                          </span>
                          {pred.version > 1 && (
                            <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>v{pred.version}</span>
                          )}
                        </div>

                        <div style={{
                          fontSize: 12,
                          color: isSuperseded ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                          textDecoration: isSuperseded ? 'line-through' : 'none',
                          marginBottom: 4,
                          lineHeight: 1.4,
                        }}>
                          {pred.claim}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                          <span className="mono" style={{ fontSize: 11, color: pConfColor, fontWeight: 500 }}>
                            {pred.confidence}%
                          </span>
                          {delta !== null && delta !== 0 && (
                            <span className="mono" style={{ fontSize: 10, color: delta > 0 ? '#22c55e' : '#ef4444' }}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                          )}
                          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            {pred.target_condition}
                          </span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            by {formatDate(pred.deadline)}
                          </span>
                        </div>

                        {pred.outcome_reasoning && (
                          <div style={{
                            marginTop: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: pred.outcome === 'correct' ? 'rgba(34,197,94,0.05)' : pred.outcome === 'incorrect' ? 'rgba(239,68,68,0.05)' : 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                          }}>
                            {pred.outcome_reasoning}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DetailSection({ label, labelColor, children }: { label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 'var(--space-2)', fontSize: 10, color: labelColor }}>{label}</div>
      {children}
    </div>
  );
}
