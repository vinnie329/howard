'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SourcePanel from '@/components/ui/SourcePanel';
import ContentCard from '@/components/ui/ContentCard';
import Tag from '@/components/ui/Tag';
import { getSourceBySlug, getContentForSource, getPredictionsForSource } from '@/lib/data';
import type { Source, ContentWithAnalysis, Prediction } from '@/types';

function decodeEntities(text: string): string {
  const el = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (el) {
    el.innerHTML = text;
    return el.value;
  }
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'");
}

type PredFilter = 'all' | 'bullish' | 'bearish';
type RightTab = 'content' | 'predictions';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function SourceProfile() {
  const params = useParams();
  const slug = params.id as string;

  const [source, setSource] = useState<Source | null>(null);
  const [content, setContent] = useState<ContentWithAnalysis[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predFilter, setPredFilter] = useState<PredFilter>('all');
  const [rightTab, setRightTab] = useState<RightTab>('content');

  const loadData = useCallback(async () => {
    const s = await getSourceBySlug(slug);
    setSource(s);
    if (s) {
      const [c, p] = await Promise.all([
        getContentForSource(s.id),
        getPredictionsForSource(s.id),
      ]);
      setContent(c);
      setPredictions(p);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Sources</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Loading...</span>
        </div>
      </>
    );
  }

  if (!source) {
    return (
      <>
        <div className="top-bar">
          <Link href="/" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Sources</Link>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Source not found.</p>
        </div>
      </>
    );
  }

  // Prediction stats
  const totalPreds = predictions.length;
  const bullish = predictions.filter((p) => p.sentiment === 'bullish').length;
  const bearish = predictions.filter((p) => p.sentiment === 'bearish').length;

  // Theme aggregation
  const themeMap = new Map<string, string>();
  for (const c of content) {
    for (const theme of c.analysis.themes) {
      if (!themeMap.has(theme)) {
        themeMap.set(theme, c.published_at);
      }
    }
  }
  const themeList = Array.from(themeMap.entries())
    .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime());

  // Filtered predictions
  const filteredPreds = predFilter === 'all'
    ? predictions
    : predictions.filter((p) => p.sentiment === predFilter);

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <Link href="/" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Intelligence</Link>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>{source.name}</span>
      </div>

      <div style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* Left column */}
        <div style={{ width: 380, minWidth: 380, overflowY: 'auto', padding: 'var(--space-4)', borderRight: '1px solid var(--border)' }}>
          <SourcePanel
            source={source}
            contentCount={content.length}
            predictionCount={totalPreds}
            accuracy={0}
          />

          {/* Theme Timeline */}
          {themeList.length > 0 && (
            <div style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}>
              <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Themes Discussed</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {themeList.map(([theme, firstDate]) => (
                  <div key={theme} title={`First mentioned: ${new Date(firstDate).toLocaleDateString()}`}>
                    <Tag label={theme} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Segmented control */}
          <div style={{ padding: 'var(--space-4)' }}>
            <div style={{
              display: 'inline-flex',
              background: 'rgba(23,23,23,0.5)',
              borderRadius: 8,
              border: '1px solid #262626',
              padding: 4,
            }}>
              {(['content', 'predictions'] as RightTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  style={{
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'color 0.15s, background 0.15s',
                    background: rightTab === tab ? '#262626' : 'transparent',
                    color: rightTab === tab ? '#ffffff' : '#a3a3a3',
                    boxShadow: rightTab === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {tab === 'content' ? `Content (${content.length})` : `Predictions (${totalPreds})`}
                </button>
              ))}
            </div>
          </div>

          {/* Content view */}
          {rightTab === 'content' && (
            <div style={{ flex: 1, padding: '0 var(--space-4) var(--space-4)' }}>
              {content.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {content.map((item) => (
                    <a
                      key={item.id}
                      href={`/content/${item.id}`}
                      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <ContentCard
                        sourceName={item.source.name}
                        sourceSlug={item.source.slug}
                        sentiment={item.analysis.sentiment_overall}
                        title={decodeEntities(item.analysis.display_title || item.title)}
                        summary={item.analysis.summary}
                        themes={item.analysis.themes}
                        assetsMentioned={item.analysis.assets_mentioned}
                        timestamp={formatTimestamp(item.published_at)}
                        platform={item.platform}
                        url={item.url}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  No content captured yet.
                </div>
              )}
            </div>
          )}

          {/* Predictions view */}
          {rightTab === 'predictions' && (
            <div style={{ flex: 1 }}>
              <div style={{ padding: '0 var(--space-4)' }}>
                <div className="filter-tabs" style={{ marginBottom: 0 }}>
                  {(['all', 'bullish', 'bearish'] as PredFilter[]).map((f) => (
                    <button
                      key={f}
                      className={`filter-tab ${predFilter === f ? 'active' : ''}`}
                      onClick={() => setPredFilter(f)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {f} {f === 'all' ? `(${totalPreds})` : f === 'bullish' ? `(${bullish})` : `(${bearish})`}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                {filteredPreds.length > 0 ? (
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}>
                    {/* Table header */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 80px 100px 80px',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--bg-surface)',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span className="label">Claim</span>
                      <span className="label">Sentiment</span>
                      <span className="label">Horizon</span>
                      <span className="label">Specificity</span>
                    </div>
                    {/* Rows */}
                    {filteredPreds.map((pred) => (
                      <div
                        key={pred.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 80px 100px 80px',
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    No predictions {predFilter !== 'all' ? `(${predFilter})` : ''} yet.
                  </div>
                )}
                <div className="mono" style={{ marginTop: 'var(--space-2)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {filteredPreds.length} prediction{filteredPreds.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
