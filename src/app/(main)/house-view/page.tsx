'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHousePredictions, getHouseCalibration, getHouseTrackRecord, getHouseViewHistory } from '@/lib/data';
import type { HouseViewChange } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';
import StatsGrid from '@/components/ui/StatsGrid';
import type { HousePrediction, HouseCalibration, HouseTrackRecord } from '@/types';

type ViewMode = 'overview' | 'evaluated' | 'calibration';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function ConvictionBadge({ conviction, confidence }: { conviction: string; confidence: number }) {
  const color = confidence >= 70 ? '#22c55e' : confidence >= 40 ? '#eab308' : '#ef4444';
  const label = conviction === 'high' ? 'HIGH' : conviction === 'medium' ? 'MED' : 'LOW';
  return (
    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 3, background: `color-mix(in srgb, ${color} 15%, transparent)`, color, letterSpacing: '0.05em' }}>
      {label}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    correct: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    incorrect: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    partially_correct: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
    pending: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
    expired: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
    invalidated: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
  };
  const s = styles[outcome] || styles.pending;
  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {outcome.replace('_', ' ')}
    </span>
  );
}

function DirectionArrow({ direction }: { direction: string }) {
  const color = direction === 'long' ? '#22c55e' : direction === 'short' ? '#ef4444' : 'var(--text-tertiary)';
  const arrow = direction === 'long' ? '\u2191' : direction === 'short' ? '\u2193' : '\u2194';
  return <span style={{ color, fontSize: 16, fontWeight: 600 }}>{arrow}</span>;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 70 ? '#22c55e' : confidence >= 40 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <div style={{ width: 60, height: 5, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${confidence}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span className="mono" style={{ fontSize: 10, color }}>{confidence}%</span>
    </div>
  );
}

export default function HouseViewPage() {
  const [activePredictions, setActivePredictions] = useState<HousePrediction[]>([]);
  const [evaluatedPredictions, setEvaluatedPredictions] = useState<HousePrediction[]>([]);
  const [calibration, setCalibration] = useState<HouseCalibration[]>([]);
  const [trackRecord, setTrackRecord] = useState<HouseTrackRecord | null>(null);
  const [changeHistory, setChangeHistory] = useState<HouseViewChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('overview');

  useEffect(() => {
    Promise.all([
      getHousePredictions('active'),
      getHousePredictions('evaluated'),
      getHouseCalibration(),
      getHouseTrackRecord(),
      getHouseViewHistory(15),
    ]).then(([active, evaluated, cal, tr, history]) => {
      setActivePredictions(active);
      setEvaluatedPredictions(evaluated);
      setCalibration(cal);
      setTrackRecord(tr);
      setChangeHistory(history);
      setLoading(false);
    });
  }, []);

  const allPredictions = [...activePredictions, ...evaluatedPredictions];
  const totalActive = activePredictions.length;
  const totalEvaluated = evaluatedPredictions.filter((p) => p.outcome !== 'expired' && p.outcome !== 'invalidated').length;
  const correctCount = evaluatedPredictions.filter((p) => p.outcome === 'correct').length;
  const avgConfidence = allPredictions.length > 0
    ? allPredictions.reduce((s, p) => s + p.confidence, 0) / allPredictions.length
    : 0;

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>House View</span>
      </div>

      <div className="page-two-col" style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* Main column */}
        <div className="page-two-col-main" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>House View</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
            Howard&apos;s synthesized, falsifiable predictions — measuring whether this system has predictive value
          </p>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <StatsGrid columns={3} stats={[
              { value: totalActive.toString(), label: 'Active' },
              { value: totalEvaluated.toString(), label: 'Evaluated' },
              { value: correctCount.toString(), label: 'Correct' },
              { value: `${avgConfidence.toFixed(0)}%`, label: 'Avg Confidence' },
              { value: trackRecord ? `${(trackRecord.weighted_accuracy * 100).toFixed(1)}%` : '—', label: 'Weighted Accuracy' },
              { value: trackRecord ? trackRecord.brier_score.toFixed(3) : '—', label: 'Brier Score' },
            ]} />
          </div>

          {/* View tabs */}
          <div className="filter-tabs" style={{ marginBottom: 'var(--space-4)' }}>
            {([
              ['overview', `Overview (${activePredictions.length})`],
              ['evaluated', `Evaluated (${evaluatedPredictions.length})`],
              ['calibration', 'Calibration'],
            ] as [ViewMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                className={`filter-tab ${view === mode ? 'active' : ''}`}
                onClick={() => setView(mode)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonRows count={6} />
          ) : view === 'calibration' ? (
            <CalibrationView calibration={calibration} trackRecord={trackRecord} />
          ) : view === 'evaluated' ? (
            <EvaluatedList predictions={evaluatedPredictions} />
          ) : (
            <AssetOverview predictions={activePredictions} />
          )}
        </div>

        {/* Right column — Change History */}
        <div className="page-two-col-aside" style={{
          width: 340,
          minWidth: 340,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          borderLeft: '1px solid var(--border)',
          marginLeft: 'auto',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>
            Change History
          </div>

          {loading ? (
            <SkeletonRows count={4} />
          ) : changeHistory.length === 0 ? (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              No changes recorded yet.
            </div>
          ) : (
            <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {changeHistory.map((entry, i) => (
                <ChangeHistoryCard key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Overview: per-asset cards ── */

function AssetOverview({ predictions }: { predictions: HousePrediction[] }) {
  const [search, setSearch] = useState('');

  if (predictions.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          No active predictions. Run: npx tsx scripts/generate-house-view.ts
        </span>
      </div>
    );
  }

  // Group by asset — take the highest confidence if multiple per asset
  const byAsset = new Map<string, HousePrediction>();
  for (const pred of predictions) {
    const existing = byAsset.get(pred.asset);
    if (!existing || pred.confidence > existing.confidence) {
      byAsset.set(pred.asset, pred);
    }
  }

  const sorted = Array.from(byAsset.values()).sort((a, b) => b.confidence - a.confidence);

  const q = search.toLowerCase();
  const filtered = q
    ? sorted.filter(p => p.asset.toLowerCase().includes(q) || p.claim.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.direction.includes(q))
    : sorted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by asset, claim, or category..."
        className="mono"
        style={{
          width: '100%',
          padding: 'var(--space-2) var(--space-3)',
          fontSize: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          outline: 'none',
          marginBottom: 'var(--space-1)',
        }}
      />
      {filtered.map((pred) => {
        const days = daysUntil(pred.deadline);
        const isOverdue = days < 0;

        return (
          <Link
            key={pred.id}
            href={`/house-view/${encodeURIComponent(pred.asset)}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto',
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              gap: 'var(--space-3)',
              alignItems: 'start',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <DirectionArrow direction={pred.direction} />
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {pred.claim}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    created {formatDate(pred.created_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <span className="mono" style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 2,
                    background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                  }}>
                    {pred.asset}
                  </span>
                  <span className="mono" style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 2,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8',
                  }}>
                    {pred.time_horizon}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)', minWidth: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <ConfidenceBar confidence={pred.confidence} />
                  <ConvictionBadge conviction={pred.conviction} confidence={pred.confidence} />
                </div>
                <span className="mono" style={{
                  fontSize: 11,
                  color: isOverdue ? '#ef4444' : days <= 7 ? '#eab308' : 'var(--text-secondary)',
                }}>
                  {isOverdue ? `${Math.abs(days)}d overdue` : `by ${formatDate(pred.deadline)} (${days}d)`}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Evaluated list ── */

function EvaluatedList({ predictions }: { predictions: HousePrediction[] }) {
  if (predictions.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          No evaluated predictions yet.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {predictions.map((pred) => (
        <Link
          key={pred.id}
          href={`/house-view/${encodeURIComponent(pred.asset)}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr auto',
            padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            gap: 'var(--space-3)',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <DirectionArrow direction={pred.direction} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>
                {pred.claim}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className="mono" style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 2,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                }}>
                  {pred.asset}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {formatDate(pred.created_at)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <ConfidenceBar confidence={pred.confidence} />
              <OutcomeBadge outcome={pred.outcome} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Calibration ── */

function CalibrationView({
  calibration,
  trackRecord,
}: {
  calibration: HouseCalibration[];
  trackRecord: HouseTrackRecord | null;
}) {
  if (calibration.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          No calibration data yet. Evaluate predictions first: npx tsx scripts/evaluate-house-view.ts
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-4)',
      }}>
        <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Calibration Chart</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
          A well-calibrated system has actual outcomes matching confidence levels.
          If Howard says 70% confident, it should be right ~70% of the time.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {calibration.map((bucket) => {
            const expected = bucket.confidence_bucket / 100;
            const actual = bucket.actual_rate;
            const isGood = bucket.calibration_error < 0.15;
            const color = isGood ? '#22c55e' : bucket.calibration_error < 0.25 ? '#eab308' : '#ef4444';

            return (
              <div key={bucket.confidence_bucket} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 60px', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {bucket.confidence_bucket}%
                </span>
                <div style={{ position: 'relative', height: 16 }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: `${expected * 100}%`, height: '100%',
                    border: '1px dashed var(--border)', borderRadius: 3, opacity: 0.6,
                  }} />
                  <div style={{
                    position: 'absolute', top: 2, left: 0, width: `${actual * 100}%`, height: 'calc(100% - 4px)',
                    background: color, borderRadius: 2, opacity: 0.8, transition: 'width 0.3s ease',
                  }} />
                </div>
                <span className="mono" style={{ fontSize: 10, color }}>{(actual * 100).toFixed(0)}% actual</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>n={bucket.total_predictions}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'var(--space-2)', fontSize: 10, color: 'var(--text-tertiary)' }}>
          Dashed = expected rate | Solid = actual rate | Green = well-calibrated
        </div>
      </div>

      {trackRecord && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Latest Track Record</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
            <Stat label="Overall Accuracy" value={`${(trackRecord.overall_accuracy * 100).toFixed(1)}%`} />
            <Stat label="Weighted Accuracy" value={`${(trackRecord.weighted_accuracy * 100).toFixed(1)}%`} sub="(confidence-biased)" />
            <Stat label="Brier Score" value={trackRecord.brier_score.toFixed(3)} sub={trackRecord.brier_score <= 0.2 ? 'predictive value' : 'needs improvement'} />
            <Stat label="Avg Confidence" value={`${trackRecord.avg_confidence.toFixed(0)}%`} />
            <Stat label="Best Category" value={trackRecord.best_category || '—'} />
            <Stat label="Worst Category" value={trackRecord.worst_category || '—'} />
          </div>
          <div className="mono" style={{ marginTop: 'var(--space-3)', fontSize: 10, color: 'var(--text-tertiary)' }}>
            Computed: {formatDate(trackRecord.computed_at)}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="label" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{sub}</div>}
    </div>
  );
}

/* ── Change History sidebar card ── */

function ChangeHistoryCard({ entry }: { entry: HouseViewChange }) {
  const totalChanges = entry.added.length + entry.updated.length + entry.removed.length;
  const isInitialSeed = entry.added.length > 0 && entry.updated.length === 0 && entry.removed.length === 0
    && entry.added.length >= 4;

  return (
    <a
      href={`/house-view/changes/${encodeURIComponent(entry.date)}`}
      style={{
        padding: 'var(--space-3)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
          {new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
        <span className="mono" style={{
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 2,
          background: isInitialSeed ? 'rgba(99,102,241,0.1)' : totalChanges === 0 ? 'var(--bg-surface)' : 'rgba(234,179,8,0.1)',
          color: isInitialSeed ? '#818cf8' : totalChanges === 0 ? 'var(--text-tertiary)' : '#eab308',
          border: `1px solid ${isInitialSeed ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
        }}>
          {isInitialSeed ? 'initial' : `${totalChanges} change${totalChanges !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {entry.added.map((a, i) => (
          <div key={`a${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
            <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600, width: 12, flexShrink: 0 }}>+</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {a.direction === 'long' ? '\u2191' : a.direction === 'short' ? '\u2193' : '\u2194'}{' '}
              {a.asset}
            </span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto', flexShrink: 0 }}>
              {a.confidence}%
            </span>
          </div>
        ))}

        {entry.updated.map((u, i) => (
          <div key={`u${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
              <span style={{ color: '#eab308', fontSize: 11, fontWeight: 600, width: 12, flexShrink: 0 }}>~</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {u.direction === 'long' ? '\u2191' : u.direction === 'short' ? '\u2193' : '\u2194'}{' '}
                {u.asset}
              </span>
              {u.prev_confidence !== u.confidence && (
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto', flexShrink: 0 }}>
                  {u.prev_confidence}% → {u.confidence}%
                </span>
              )}
            </div>
            {u.prev_claim !== u.claim && (
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', paddingLeft: 16, lineHeight: 1.3 }}>
                was: {u.prev_claim.length > 60 ? u.prev_claim.substring(0, 60) + '...' : u.prev_claim}
              </div>
            )}
          </div>
        ))}

        {entry.removed.map((r, i) => (
          <div key={`r${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
            <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, width: 12, flexShrink: 0 }}>&minus;</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
              {r.direction === 'long' ? '\u2191' : r.direction === 'short' ? '\u2193' : '\u2194'}{' '}
              {r.asset}
            </span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 'auto', flexShrink: 0 }}>
              {r.confidence}%
            </span>
          </div>
        ))}
      </div>
    </a>
  );
}
