'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSourceBySlug, getPredictionsForSource } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';
import Tag from '@/components/ui/Tag';
import { OutcomeBadge, AccuracyBar } from '@/components/ui/OutcomeBadge';
import type { Source, Prediction } from '@/types';

type OutcomeFilter = 'all' | 'resolved' | 'unresolved' | 'correct' | 'incorrect' | 'partially_correct' | 'pending' | 'expired';
type SentimentFilter = 'all' | 'bullish' | 'bearish' | 'neutral' | 'mixed';
type HorizonFilter = 'all' | 'short_term' | 'medium_term' | 'long_term';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const RESOLVED = new Set(['correct', 'incorrect', 'partially_correct']);

export default function SourcePerformanceDetail() {
  const params = useParams();
  const slug = params.slug as string;

  const [source, setSource] = useState<Source | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('all');
  const [expandedPred, setExpandedPred] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const s = await getSourceBySlug(slug);
    setSource(s);
    if (s) {
      const p = await getPredictionsForSource(s.id);
      setPredictions(p);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <>
        <div className="top-bar"><span style={{ fontSize: 12 }}>Performance</span></div>
        <div style={{ padding: 'var(--space-6)', flex: 1 }}><SkeletonRows count={6} /></div>
      </>
    );
  }

  if (!source) {
    return (
      <>
        <div className="top-bar">
          <Link href="/performance" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Performance</Link>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Source not found.</p>
        </div>
      </>
    );
  }

  const total = predictions.length;
  const resolved = predictions.filter((p) => p.outcome && RESOLVED.has(p.outcome));
  const correct = resolved.filter((p) => p.outcome === 'correct').length;
  const incorrect = resolved.filter((p) => p.outcome === 'incorrect').length;
  const partial = resolved.filter((p) => p.outcome === 'partially_correct').length;
  const pending = predictions.filter((p) => !p.outcome || p.outcome === 'pending').length;
  const expired = predictions.filter((p) => p.outcome === 'expired').length;
  const accuracy = resolved.length > 0 ? (correct + partial * 0.5) / resolved.length : 0;

  const filtered = predictions.filter((p) => {
    const outcome = p.outcome || 'pending';
    if (outcomeFilter === 'resolved' && !RESOLVED.has(outcome)) return false;
    if (outcomeFilter === 'unresolved' && RESOLVED.has(outcome)) return false;
    if (!['all', 'resolved', 'unresolved'].includes(outcomeFilter) && outcome !== outcomeFilter) return false;
    if (sentimentFilter !== 'all' && p.sentiment !== sentimentFilter) return false;
    if (horizonFilter !== 'all' && p.time_horizon !== horizonFilter) return false;
    return true;
  });

  const outcomeCounts: Record<OutcomeFilter, number> = {
    all: total,
    resolved: resolved.length,
    unresolved: pending + expired,
    correct,
    incorrect,
    partially_correct: partial,
    pending,
    expired,
  };

  return (
    <>
      <div className="top-bar" style={{ gap: 'var(--space-2)' }}>
        <Link href="/performance" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Performance</Link>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>{source.name}</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
          <h1>{source.name}</h1>
          <Link
            href={`/sources/${source.slug}`}
            style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
          >
            View profile →
          </Link>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
          Prediction performance detail
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}>
          {[
            { label: 'Total', value: total, color: 'var(--text-primary)' },
            { label: 'Resolved', value: resolved.length, color: 'var(--accent)' },
            { label: 'Correct', value: correct, color: '#22c55e' },
            { label: 'Partial', value: partial, color: '#eab308' },
            { label: 'Incorrect', value: incorrect, color: '#ef4444' },
            { label: 'Pending', value: pending, color: 'var(--text-tertiary)' },
            { label: 'Expired', value: expired, color: 'var(--text-tertiary)' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div className="label" style={{ marginBottom: 'var(--space-1)' }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 20, color: s.color, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Accuracy */}
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
          <span className="label">Accuracy (resolved only)</span>
          <AccuracyBar rate={accuracy} size="large" />
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Outcome</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {(['all', 'resolved', 'unresolved', 'correct', 'partially_correct', 'incorrect', 'pending', 'expired'] as OutcomeFilter[]).map((f) => (
              <button
                key={f}
                className={`filter-tab ${outcomeFilter === f ? 'active' : ''}`}
                onClick={() => setOutcomeFilter(f)}
                style={{ fontSize: 11 }}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())} ({outcomeCounts[f]})
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Sentiment</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {(['all', 'bullish', 'bearish', 'neutral', 'mixed'] as SentimentFilter[]).map((f) => (
              <button
                key={f}
                className={`filter-tab ${sentimentFilter === f ? 'active' : ''}`}
                onClick={() => setSentimentFilter(f)}
                style={{ fontSize: 11, textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Horizon</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {(['all', 'short_term', 'medium_term', 'long_term'] as HorizonFilter[]).map((f) => (
              <button
                key={f}
                className={`filter-tab ${horizonFilter === f ? 'active' : ''}`}
                onClick={() => setHorizonFilter(f)}
                style={{ fontSize: 11 }}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Predictions list */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 100px 100px 80px 90px',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span className="label">Claim</span>
            <span className="label">Outcome</span>
            <span className="label">Horizon</span>
            <span className="label">Score</span>
            <span className="label">Evaluated</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                No predictions match the current filters.
              </span>
            </div>
          ) : (
            filtered.map((pred) => (
              <div key={pred.id}>
                <div
                  onClick={() => setExpandedPred(expandedPred === pred.id ? null : pred.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 100px 100px 80px 90px',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                    cursor: 'pointer',
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
                  <OutcomeBadge outcome={pred.outcome} />
                  <span className="mono" style={{ fontSize: 11 }}>{pred.time_horizon}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {pred.outcome_score !== null && pred.outcome_score !== undefined ? `${(pred.outcome_score * 100).toFixed(0)}%` : '—'}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {pred.evaluated_at ? formatDate(pred.evaluated_at) : '—'}
                  </span>
                </div>
                {expandedPred === pred.id && (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                  }}>
                    {pred.outcome_reasoning && (
                      <>
                        <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Evaluation Reasoning</div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {pred.outcome_reasoning}
                        </p>
                      </>
                    )}
                    <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
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
            ))
          )}

          <div className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
            {filtered.length} of {total} prediction{total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </>
  );
}
