'use client';

import { useState, useEffect } from 'react';
import { getHousePredictions, getHouseCalibration, getHouseTrackRecord } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';
import Tag from '@/components/ui/Tag';
import type { HousePrediction, HouseCalibration, HouseTrackRecord } from '@/types';

type ViewMode = 'active' | 'evaluated' | 'calibration';
type CategoryFilter = 'all' | 'macro' | 'sector' | 'single-stock' | 'rates' | 'commodities' | 'crypto';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (86400000));
}

function ConvictionBadge({ conviction, confidence }: { conviction: string; confidence: number }) {
  const colors: Record<string, { bg: string; color: string }> = {
    high: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    medium: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
    low: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
  };
  const s = colors[conviction] || colors.medium;
  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.color }}>
      {confidence}% {conviction}
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
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('active');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getHousePredictions('active'),
      getHousePredictions('evaluated'),
      getHouseCalibration(),
      getHouseTrackRecord(),
    ]).then(([active, evaluated, cal, tr]) => {
      setActivePredictions(active);
      setEvaluatedPredictions(evaluated);
      setCalibration(cal);
      setTrackRecord(tr);
      setLoading(false);
    });
  }, []);

  const allPredictions = [...activePredictions, ...evaluatedPredictions];
  const filtered = (view === 'active' ? activePredictions : view === 'evaluated' ? evaluatedPredictions : allPredictions)
    .filter((p) => category === 'all' || p.category === category);

  // Compute aggregate stats from actual data
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

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>House View</h1>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
          Howard's synthesized, falsifiable predictions — measuring whether this system has predictive value
        </p>

        {/* Track Record Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}>
          {[
            { label: 'Active Predictions', value: totalActive.toString(), color: '#6366f1' },
            { label: 'Evaluated', value: totalEvaluated.toString(), color: 'var(--accent)' },
            { label: 'Correct', value: correctCount.toString(), color: '#22c55e' },
            { label: 'Avg Confidence', value: `${avgConfidence.toFixed(0)}%`, color: 'var(--text-primary)' },
            {
              label: 'Weighted Accuracy',
              value: trackRecord ? `${(trackRecord.weighted_accuracy * 100).toFixed(1)}%` : '—',
              color: trackRecord && trackRecord.weighted_accuracy >= 0.5 ? '#22c55e' : '#ef4444',
            },
            {
              label: 'Brier Score',
              value: trackRecord ? trackRecord.brier_score.toFixed(3) : '—',
              color: trackRecord && trackRecord.brier_score <= 0.25 ? '#22c55e' : '#eab308',
            },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: 'var(--space-3)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div className="label" style={{ marginBottom: 'var(--space-1)', fontSize: 9 }}>{stat.label}</div>
              <div className="mono" style={{ fontSize: 18, color: stat.color, fontWeight: 600 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Brier score explainer */}
        {trackRecord && (
          <div style={{
            padding: 'var(--space-3)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-6)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}>
            <strong>Weighted Accuracy</strong> biases towards high-confidence predictions — getting a 80% confidence call right matters more than a 30% one.
            <strong> Brier Score</strong> measures calibration (0 = perfect, 0.25 = random). Score below 0.2 means Howard has genuine predictive value.
          </div>
        )}

        {/* View tabs */}
        <div className="filter-tabs" style={{ marginBottom: 'var(--space-3)' }}>
          {([
            ['active', `Active (${activePredictions.length})`],
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

        {/* Category filter */}
        {view !== 'calibration' && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            {(['all', 'macro', 'sector', 'single-stock', 'rates', 'commodities', 'crypto'] as CategoryFilter[]).map((c) => (
              <button
                key={c}
                className={`filter-tab ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(c)}
                style={{ fontSize: 10 }}
              >
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <SkeletonRows count={6} />
        ) : view === 'calibration' ? (
          <CalibrationView calibration={calibration} trackRecord={trackRecord} />
        ) : (
          <PredictionsGrid
            predictions={filtered}
            expanded={expanded}
            setExpanded={setExpanded}
            showOutcome={view === 'evaluated'}
          />
        )}
      </div>
    </>
  );
}

function PredictionsGrid({
  predictions,
  expanded,
  setExpanded,
  showOutcome,
}: {
  predictions: HousePrediction[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  showOutcome: boolean;
}) {
  if (predictions.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          No predictions yet. Run: npx tsx scripts/generate-house-view.ts
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {predictions.map((pred) => {
        const isExpanded = expanded === pred.id;
        const days = daysUntil(pred.deadline);
        const isOverdue = days < 0;

        return (
          <div
            key={pred.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: isExpanded ? 'var(--bg-surface)' : 'transparent',
            }}
          >
            {/* Header row */}
            <div
              onClick={() => setExpanded(isExpanded ? null : pred.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr 80px 100px 100px',
                padding: 'var(--space-3) var(--space-4)',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.1s ease',
              }}
            >
              <DirectionArrow direction={pred.direction} />
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)', fontWeight: 500 }}>
                  {pred.claim}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="mono" style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 2,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    {pred.asset}
                  </span>
                  <Tag label={pred.category} />
                  {pred.themes.slice(0, 2).map((t) => <Tag key={t} label={t} />)}
                </div>
              </div>
              <ConvictionBadge conviction={pred.conviction} confidence={pred.confidence} />
              {showOutcome ? (
                <OutcomeBadge outcome={pred.outcome} />
              ) : (
                <span className="mono" style={{
                  fontSize: 10,
                  color: isOverdue ? '#ef4444' : days <= 7 ? '#eab308' : 'var(--text-tertiary)',
                }}>
                  {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                </span>
              )}
              <ConfidenceBar confidence={pred.confidence} />
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Target</div>
                    <p style={{ color: 'var(--text-secondary)' }}>{pred.target_condition}</p>
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Reference Price</div>
                    <p className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {pred.reference_value !== null ? `$${pred.reference_value.toFixed(2)}` : '—'}
                      {pred.final_value !== null && (
                        <span style={{ marginLeft: 'var(--space-2)', color: 'var(--text-tertiary)' }}>
                          → ${pred.final_value.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Thesis</div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{pred.thesis}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Key Drivers</div>
                    <ul style={{ color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)', margin: 0 }}>
                      {pred.key_drivers.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Supporting Sources</div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {pred.supporting_sources.map((s) => (
                        <span key={s} className="mono" style={{
                          fontSize: 9,
                          padding: '1px 5px',
                          borderRadius: 2,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                        }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {pred.invalidation_criteria && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div className="label" style={{ marginBottom: 'var(--space-1)', color: '#ef4444' }}>Invalidation Criteria</div>
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{pred.invalidation_criteria}</p>
                  </div>
                )}

                {pred.outcome_reasoning && (
                  <div style={{
                    padding: 'var(--space-3)',
                    background: pred.outcome === 'correct' ? 'rgba(34,197,94,0.05)' : pred.outcome === 'incorrect' ? 'rgba(239,68,68,0.05)' : 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Evaluation</div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{pred.outcome_reasoning}</p>
                  </div>
                )}

                <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-3)', fontSize: 10 }}>
                  <span className="mono" style={{ color: 'var(--text-tertiary)' }}>Created: {formatDate(pred.created_at)}</span>
                  <span className="mono" style={{ color: 'var(--text-tertiary)' }}>Deadline: {formatDate(pred.deadline)}</span>
                  {pred.version > 1 && <span className="mono" style={{ color: 'var(--text-tertiary)' }}>v{pred.version}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

  // For a well-calibrated system, actual_rate should match confidence_bucket/100
  const maxTotal = Math.max(...calibration.map((c) => c.total_predictions), 1);

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

        {/* ASCII-style calibration visualization */}
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
                  {/* Expected bar (dotted outline) */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${expected * 100}%`,
                    height: '100%',
                    border: '1px dashed var(--border)',
                    borderRadius: 3,
                    opacity: 0.6,
                  }} />
                  {/* Actual bar */}
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: 0,
                    width: `${actual * 100}%`,
                    height: 'calc(100% - 4px)',
                    background: color,
                    borderRadius: 2,
                    opacity: 0.8,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span className="mono" style={{ fontSize: 10, color }}>
                  {(actual * 100).toFixed(0)}% actual
                </span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                  n={bucket.total_predictions}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'var(--space-2)', fontSize: 10, color: 'var(--text-tertiary)' }}>
          Dashed = expected rate | Solid = actual rate | Green = well-calibrated
        </div>
      </div>

      {/* Track record history */}
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
