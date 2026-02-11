'use client';

import { useState, useEffect } from 'react';
import { getPredictions, getSources } from '@/lib/data';
import Tag from '@/components/ui/Tag';
import SourcePill from '@/components/ui/SourcePill';
import type { Prediction, Source } from '@/types';

type SentimentFilter = 'all' | 'bullish' | 'bearish' | 'neutral' | 'mixed';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PredictionsLedger() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SentimentFilter>('all');

  useEffect(() => {
    Promise.all([getPredictions(), getSources()]).then(([preds, srcs]) => {
      setPredictions(preds);
      setSources(srcs);
      setLoading(false);
    });
  }, []);

  const filtered =
    filter === 'all'
      ? predictions
      : predictions.filter((p) => p.sentiment === filter);

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Predictions Ledger</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-6)' }}>Predictions Ledger</h1>

        <div className="filter-tabs">
          {(['all', 'bullish', 'bearish', 'neutral', 'mixed'] as SentimentFilter[]).map((s) => (
            <button
              key={s}
              className={`filter-tab ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
            No predictions found.
          </div>
        ) : (
          <>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 80px 100px 80px 90px',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span className="label">Claim</span>
                <span className="label">Source</span>
                <span className="label">Sentiment</span>
                <span className="label">Horizon</span>
                <span className="label">Specificity</span>
                <span className="label">Date Made</span>
              </div>

              {/* Rows */}
              {filtered.map((pred) => {
                const source = sources.find((s) => s.id === pred.source_id);
                return (
                  <div
                    key={pred.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 80px 100px 80px 90px',
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                        {pred.claim}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                        {pred.themes.map((t) => (
                          <Tag key={t} label={t} />
                        ))}
                        {pred.assets_mentioned.map((a) => (
                          <span key={a} className="mono" style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 2,
                            background: 'var(--bg-surface)',
                            color: 'var(--text-tertiary)',
                            border: '1px solid var(--border)',
                          }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <SourcePill name={source?.name || 'Unknown'} />
                    </div>
                    <div>
                      <Tag
                        label={pred.sentiment}
                        highlight={pred.sentiment === 'bearish'}
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 11 }}>
                      {pred.time_horizon}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {pred.specificity}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {formatDate(pred.date_made)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
              {filtered.length} prediction{filtered.length !== 1 ? 's' : ''} tracked
            </div>
          </>
        )}
      </div>
    </>
  );
}
