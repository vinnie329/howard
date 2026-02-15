'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPredictions, getSources } from '@/lib/data';
import Tag from '@/components/ui/Tag';
import SourcePill from '@/components/ui/SourcePill';
import SimilarPredictions from '@/components/ui/SimilarPredictions';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string> | null>(null);
  const [searching, setSearching] = useState(false);
  const [expandedPrediction, setExpandedPrediction] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchPredictions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchMatchIds(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=prediction&limit=50&threshold=0.2`);
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>((data.results || []).map((r: { id: string }) => r.id));
        setSearchMatchIds(ids);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPredictions(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchPredictions]);

  useEffect(() => {
    Promise.all([getPredictions(), getSources()]).then(([preds, srcs]) => {
      setPredictions(preds);
      setSources(srcs);
      setLoading(false);
    });
  }, []);

  const sentimentFiltered =
    filter === 'all'
      ? predictions
      : predictions.filter((p) => p.sentiment === filter);

  const filtered = searchMatchIds
    ? sentimentFiltered.filter((p) => searchMatchIds.has(p.id))
    : sentimentFiltered;

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Predictions Ledger</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-6)' }}>Predictions Ledger</h1>

        {/* Semantic search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Semantic search predictions..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-main)',
            }}
          />
          {searching && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              Searching...
            </span>
          )}
          {searchQuery && !searching && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: 14,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          )}
        </div>

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
                  <div key={pred.id}>
                    <div
                      onClick={() => setExpandedPrediction(expandedPrediction === pred.id ? null : pred.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 80px 100px 80px 90px',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease',
                        background: expandedPrediction === pred.id ? 'var(--bg-surface)' : 'transparent',
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
                          variant={pred.sentiment === 'bullish' ? 'bullish' : pred.sentiment === 'bearish' ? 'bearish' : 'default'}
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
                    {expandedPrediction === pred.id && (
                      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                        <SimilarPredictions predictionId={pred.id} />
                      </div>
                    )}
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
