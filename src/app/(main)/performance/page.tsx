'use client';

import { useState, useEffect } from 'react';
import { getSources, getPredictions, getSourcePerformance, getBacktestRuns } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';
import Tag from '@/components/ui/Tag';
import SourcePill from '@/components/ui/SourcePill';
import type { Source, Prediction, SourcePerformance, BacktestRun } from '@/types';

type ViewMode = 'leaderboard' | 'predictions' | 'runs';
type OutcomeFilter = 'all' | 'correct' | 'incorrect' | 'partially_correct' | 'pending' | 'expired';

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    correct: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    incorrect: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    partially_correct: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
    pending: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
    expired: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
  };
  const s = styles[outcome] || styles.pending;
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'var(--font-mono)',
      padding: '2px 8px',
      borderRadius: 3,
      background: s.bg,
      color: s.color,
      textTransform: 'capitalize',
    }}>
      {outcome.replace('_', ' ')}
    </span>
  );
}

function AccuracyBar({ rate, size = 'normal' }: { rate: number; size?: 'normal' | 'large' }) {
  const width = size === 'large' ? 120 : 80;
  const height = size === 'large' ? 8 : 5;
  const color = rate >= 0.7 ? '#22c55e' : rate >= 0.4 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <div style={{ width, height, background: 'var(--bg-surface)', borderRadius: height / 2, overflow: 'hidden' }}>
        <div style={{ width: `${rate * 100}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.3s ease' }} />
      </div>
      <span className="mono" style={{ fontSize: size === 'large' ? 14 : 11, color }}>{formatPct(rate)}</span>
    </div>
  );
}

export default function PerformanceDashboard() {
  const [sources, setSources] = useState<Source[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [performance, setPerformance] = useState<SourcePerformance[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('leaderboard');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [expandedPred, setExpandedPred] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getSources(),
      getPredictions(),
      getSourcePerformance(),
      getBacktestRuns(),
    ]).then(([srcs, preds, perf, rns]) => {
      setSources(srcs);
      setPredictions(preds);
      setPerformance(perf);
      setRuns(rns);
      setLoading(false);
    });
  }, []);

  // Aggregate stats from predictions
  const evaluated = predictions.filter((p) => p.outcome && p.outcome !== 'pending');
  const scorable = evaluated.filter((p) => p.outcome !== 'expired');
  const correctCount = evaluated.filter((p) => p.outcome === 'correct').length;
  const partialCount = evaluated.filter((p) => p.outcome === 'partially_correct').length;
  const incorrectCount = evaluated.filter((p) => p.outcome === 'incorrect').length;
  const pendingCount = predictions.filter((p) => !p.outcome || p.outcome === 'pending').length;
  const overallAccuracy = scorable.length > 0 ? (correctCount + partialCount * 0.5) / scorable.length : 0;

  // Filtered predictions view
  const filteredPredictions = predictions
    .filter((p) => outcomeFilter === 'all' || p.outcome === outcomeFilter)
    .filter((p) => !selectedSource || p.source_id === selectedSource);

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Predictive Performance</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Predictive Performance</h1>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
          Automated backtesting of source predictions against market reality
        </p>

        {/* Aggregate Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}>
          {[
            { label: 'Total Predictions', value: predictions.length.toString(), color: 'var(--text-primary)' },
            { label: 'Evaluated', value: evaluated.length.toString(), color: 'var(--accent)' },
            { label: 'Correct', value: correctCount.toString(), color: '#22c55e' },
            { label: 'Partially Correct', value: partialCount.toString(), color: '#eab308' },
            { label: 'Incorrect', value: incorrectCount.toString(), color: '#ef4444' },
            { label: 'Pending', value: pendingCount.toString(), color: 'var(--text-tertiary)' },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div className="label" style={{ marginBottom: 'var(--space-1)' }}>{stat.label}</div>
              <div className="mono" style={{ fontSize: 20, color: stat.color, fontWeight: 600 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Overall accuracy bar */}
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span className="label">Overall Accuracy</span>
          <AccuracyBar rate={overallAccuracy} size="large" />
        </div>

        {/* View tabs */}
        <div className="filter-tabs" style={{ marginBottom: 'var(--space-4)' }}>
          {([
            ['leaderboard', 'Source Leaderboard'],
            ['predictions', 'Prediction Outcomes'],
            ['runs', 'Backtest Runs'],
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
        ) : view === 'leaderboard' ? (
          <LeaderboardView sources={sources} performance={performance} predictions={predictions} />
        ) : view === 'predictions' ? (
          <>
            {/* Outcome filter */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
              {(['all', 'correct', 'partially_correct', 'incorrect', 'pending', 'expired'] as OutcomeFilter[]).map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${outcomeFilter === f ? 'active' : ''}`}
                  onClick={() => setOutcomeFilter(f)}
                  style={{ fontSize: 11 }}
                >
                  {f === 'all' ? 'All' : f.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Source filter */}
            <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                className={`filter-tab ${!selectedSource ? 'active' : ''}`}
                onClick={() => setSelectedSource(null)}
                style={{ fontSize: 10 }}
              >
                All Sources
              </button>
              {sources.map((s) => (
                <button
                  key={s.id}
                  className={`filter-tab ${selectedSource === s.id ? 'active' : ''}`}
                  onClick={() => setSelectedSource(selectedSource === s.id ? null : s.id)}
                  style={{ fontSize: 10 }}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <PredictionsView
              predictions={filteredPredictions}
              sources={sources}
              expandedPred={expandedPred}
              setExpandedPred={setExpandedPred}
            />
          </>
        ) : (
          <BacktestRunsView runs={runs} />
        )}
      </div>
    </>
  );
}

function LeaderboardView({
  sources,
  performance,
  predictions,
}: {
  sources: Source[];
  performance: SourcePerformance[];
  predictions: Prediction[];
}) {
  // Build leaderboard from performance data, or compute from predictions if no performance rows
  const rows = sources.map((source) => {
    const perf = performance.find((p) => p.source_id === source.id);
    const srcPreds = predictions.filter((p) => p.source_id === source.id);
    const evaluated = srcPreds.filter((p) => p.outcome && p.outcome !== 'pending' && p.outcome !== 'expired');
    const correct = evaluated.filter((p) => p.outcome === 'correct').length;
    const partial = evaluated.filter((p) => p.outcome === 'partially_correct').length;

    return {
      source,
      total: perf?.total_predictions ?? srcPreds.length,
      evaluated: perf?.evaluated_predictions ?? evaluated.length,
      accuracy: perf?.accuracy_rate ?? (evaluated.length > 0 ? (correct + partial * 0.5) / evaluated.length : 0),
      weightedAccuracy: perf?.weighted_accuracy ?? 0,
      correct: perf?.correct ?? correct,
      incorrect: perf?.incorrect ?? evaluated.filter((p) => p.outcome === 'incorrect').length,
      streak: perf?.streak_current ?? 0,
      bestDomain: perf?.best_domain ?? null,
      byHorizon: perf?.performance_by_horizon ?? {},
      bySpecificity: perf?.performance_by_specificity ?? {},
    };
  }).filter((r) => r.total > 0)
    .sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1.5fr 80px 80px 120px 80px 80px 1fr',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="label">#</span>
        <span className="label">Source</span>
        <span className="label">Total</span>
        <span className="label">Scored</span>
        <span className="label">Accuracy</span>
        <span className="label">Correct</span>
        <span className="label">Wrong</span>
        <span className="label">Best Domain</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            No predictions evaluated yet. Run the backtester to see results.
          </span>
        </div>
      ) : (
        <div className="stagger-in">
          {rows.map((row, i) => (
            <div
              key={row.source.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1.5fr 80px 80px 120px 80px 80px 1fr',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}
            >
              <span className="mono" style={{
                fontSize: 14,
                fontWeight: 600,
                color: i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text-tertiary)',
              }}>
                {i + 1}
              </span>
              <div>
                <SourcePill name={row.source.name} />
                {row.streak > 0 && (
                  <span className="mono" style={{ fontSize: 9, color: '#22c55e', marginLeft: 'var(--space-2)' }}>
                    {row.streak} streak
                  </span>
                )}
              </div>
              <span className="mono" style={{ fontSize: 12 }}>{row.total}</span>
              <span className="mono" style={{ fontSize: 12 }}>{row.evaluated}</span>
              <AccuracyBar rate={row.accuracy} />
              <span className="mono" style={{ fontSize: 12, color: '#22c55e' }}>{row.correct}</span>
              <span className="mono" style={{ fontSize: 12, color: '#ef4444' }}>{row.incorrect}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {row.bestDomain || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PredictionsView({
  predictions,
  sources,
  expandedPred,
  setExpandedPred,
}: {
  predictions: Prediction[];
  sources: Source[];
  expandedPred: string | null;
  setExpandedPred: (id: string | null) => void;
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 100px 80px 90px',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="label">Claim</span>
        <span className="label">Source</span>
        <span className="label">Outcome</span>
        <span className="label">Score</span>
        <span className="label">Evaluated</span>
      </div>

      {predictions.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            No predictions match the current filters.
          </span>
        </div>
      ) : (
        <div className="stagger-in">
          {predictions.map((pred) => {
            const source = sources.find((s) => s.id === pred.source_id);
            return (
              <div key={pred.id}>
                <div
                  onClick={() => setExpandedPred(expandedPred === pred.id ? null : pred.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 100px 80px 90px',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                    background: expandedPred === pred.id ? 'var(--bg-surface)' : 'transparent',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                      {pred.claim}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      <Tag
                        label={pred.sentiment}
                        variant={pred.sentiment === 'bullish' ? 'bullish' : pred.sentiment === 'bearish' ? 'bearish' : 'default'}
                      />
                      <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{pred.specificity}</span>
                    </div>
                  </div>
                  <SourcePill name={source?.name || 'Unknown'} />
                  <OutcomeBadge outcome={pred.outcome} />
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {pred.outcome_score !== null ? `${(pred.outcome_score * 100).toFixed(0)}%` : '—'}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {pred.evaluated_at ? formatDate(pred.evaluated_at) : '—'}
                  </span>
                </div>
                {expandedPred === pred.id && pred.outcome_reasoning && (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                  }}>
                    <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Evaluation Reasoning</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {pred.outcome_reasoning}
                    </p>
                    <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-3)' }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        Made: {formatDate(pred.date_made)}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        Horizon: {pred.time_horizon}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        Confidence: {pred.confidence}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
        {predictions.length} prediction{predictions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function BacktestRunsView({ runs }: { runs: BacktestRun[] }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 100px 100px',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="label">Date</span>
        <span className="label">Evaluated</span>
        <span className="label">Resolved</span>
        <span className="label">Sources</span>
        <span className="label">Duration</span>
      </div>

      {runs.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            No backtest runs yet. Run: npx tsx scripts/backtest-predictions.ts
          </span>
        </div>
      ) : (
        runs.map((run) => (
          <div
            key={run.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 100px 100px',
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <span className="mono" style={{ fontSize: 12 }}>{formatDate(run.created_at)}</span>
            <span className="mono" style={{ fontSize: 12 }}>{run.predictions_evaluated}</span>
            <span className="mono" style={{ fontSize: 12 }}>{run.predictions_resolved}</span>
            <span className="mono" style={{ fontSize: 12 }}>{run.sources_updated}</span>
            <span className="mono" style={{ fontSize: 12 }}>
              {run.run_duration_ms ? `${(run.run_duration_ms / 1000).toFixed(1)}s` : '—'}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
