'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHouseViewChangeDetail } from '@/lib/data';
import type { HouseViewChangeDetail } from '@/lib/data';
import { Skeleton, SkeletonLines } from '@/components/ui/Skeleton';
import type { HousePrediction } from '@/types';

function DirectionArrow({ direction }: { direction: string }) {
  const color = direction === 'long' ? '#22c55e' : direction === 'short' ? '#ef4444' : 'var(--text-tertiary)';
  const arrow = direction === 'long' ? '\u2191' : direction === 'short' ? '\u2193' : '\u2194';
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

function PredictionCard({ pred, label, labelColor }: { pred: HousePrediction; label: string; labelColor: string }) {
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
        <DirectionArrow direction={pred.direction} />
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {pred.asset}
        </span>
        <ConvictionBadge conviction={pred.conviction} confidence={pred.confidence} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {pred.confidence}%
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        {pred.claim}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
        {pred.thesis}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', fontSize: 11 }}>
        {pred.key_drivers.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Key Drivers</div>
            {pred.key_drivers.map((d, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
        )}
        {pred.supporting_sources.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Sources</div>
            {pred.supporting_sources.map((s, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)' }}>{s}</div>
            ))}
          </div>
        )}
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Details</div>
          <div style={{ color: 'var(--text-secondary)' }}>Target: {pred.target_condition}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Horizon: {pred.time_horizon}</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Deadline: {new Date(pred.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {pred.invalidation_criteria && (
            <div style={{ color: '#ef4444' }}>Invalidation: {pred.invalidation_criteria}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HouseViewChangeDetail() {
  const params = useParams();
  const router = useRouter();
  const [detail, setDetail] = useState<HouseViewChangeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const date = decodeURIComponent(params.date as string);
    if (date) {
      getHouseViewChangeDetail(date).then((result) => {
        setDetail(result);
        setLoading(false);
      });
    }
  }, [params.date]);

  if (loading) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>House View</span>
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
          <Link href="/house-view" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>House View</Link>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1 }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Change event not found.</p>
        </div>
      </>
    );
  }

  const date = new Date(detail.date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const totalChanges = detail.added.length + detail.updated.length + detail.removed.length;
  const isInitialSeed = detail.added.length >= 4 && detail.updated.length === 0 && detail.removed.length === 0;

  return (
    <>
      <div className="top-bar">
        <Link href="/house-view" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>House View</Link>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Change Detail</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, maxWidth: 740, margin: '0 auto' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 'var(--space-4)',
          }}
        >
          &larr; Back to house view
        </button>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <span className="mono" style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 2,
              background: isInitialSeed ? 'rgba(99,102,241,0.1)' : 'rgba(234,179,8,0.1)',
              color: isInitialSeed ? '#818cf8' : '#eab308',
              border: `1px solid ${isInitialSeed ? 'rgba(99,102,241,0.25)' : 'rgba(234,179,8,0.25)'}`,
            }}>
              {isInitialSeed ? 'initial generation' : `${totalChanges} change${totalChanges !== 1 ? 's' : ''}`}
            </span>
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            House View {isInitialSeed ? 'Initial Generation' : 'Update'}
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
        }}>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Added</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: detail.added.length > 0 ? '#22c55e' : 'var(--text-tertiary)' }}>
              {detail.added.length}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Updated</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: detail.updated.length > 0 ? '#eab308' : 'var(--text-tertiary)' }}>
              {detail.updated.length}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Removed</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: detail.removed.length > 0 ? '#ef4444' : 'var(--text-tertiary)' }}>
              {detail.removed.length}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Unchanged</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-tertiary)' }}>
              {detail.kept.length}
            </div>
          </div>
        </div>

        {/* Added */}
        {detail.added.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>
              {isInitialSeed ? 'Predictions Generated' : 'New Views Added'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {detail.added.map((pred) => (
                <PredictionCard key={pred.id} pred={pred} label="ADDED" labelColor="#22c55e" />
              ))}
            </div>
          </div>
        )}

        {/* Updated */}
        {detail.updated.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Views Updated</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {detail.updated.map(({ current, previous }) => (
                <div key={current.id}>
                  {/* Show what changed */}
                  {(previous.confidence !== current.confidence || previous.claim !== current.claim) && (
                    <div style={{
                      padding: 'var(--space-3)',
                      background: 'rgba(234,179,8,0.05)',
                      border: '1px solid rgba(234,179,8,0.15)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--space-2)',
                      fontSize: 11,
                    }}>
                      {previous.confidence !== current.confidence && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 2 }}>
                          <span className="label">Confidence</span>
                          <span className="mono" style={{ color: 'var(--text-tertiary)' }}>{previous.confidence}%</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                          <span className="mono" style={{ fontWeight: 500 }}>{current.confidence}%</span>
                        </div>
                      )}
                      {previous.claim !== current.claim && (
                        <div>
                          <span className="label">Previous claim: </span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{previous.claim}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <PredictionCard pred={current} label="UPDATED" labelColor="#eab308" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Removed */}
        {detail.removed.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Views Removed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {detail.removed.map((pred) => (
                <PredictionCard key={pred.id} pred={pred} label="REMOVED" labelColor="#ef4444" />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
