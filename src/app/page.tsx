'use client';

import { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/ui/ContentCard';
import ListRow from '@/components/ui/ListRow';
import DailyPulse from '@/components/ui/DailyPulse';
import WatchlistPanel from '@/components/ui/WatchlistPanel';
import AddContentModal from '@/components/ui/AddContentModal';
import { useDomainFilter } from '@/lib/domain-filter-context';
import { getSources, getContentWithAnalysis, getTrendingTopics } from '@/lib/data';
import type { Source, ContentWithAnalysis, TrendingTopic } from '@/types';

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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function DailyDigest() {
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [sources, setSources] = useState<Source[]>([]);
  const [contentItems, setContentItems] = useState<ContentWithAnalysis[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { selectedDomains } = useDomainFilter();
  const hasFilters = selectedDomains.length > 0;

  const loadData = useCallback(async () => {
    const [s, contentResult, topics] = await Promise.all([
      getSources(),
      getContentWithAnalysis(1, 20),
      getTrendingTopics(),
    ]);
    setSources(s);
    setContentItems(contentResult.items);
    setHasMore(contentResult.hasMore);
    setTrendingTopics(topics);
    setPage(1);
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await getContentWithAnalysis(nextPage, 20);
    setContentItems((prev) => [...prev, ...result.items]);
    setHasMore(result.hasMore);
    setPage(nextPage);
    setLoadingMore(false);
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Domain filtering
  const domainFilteredContent = hasFilters
    ? contentItems.filter((c) =>
        c.source.domains.some((d) => selectedDomains.includes(d as typeof selectedDomains[number]))
      )
    : contentItems;

  const sentimentFiltered =
    filter === 'high'
      ? domainFilteredContent.filter((c) => Math.abs(c.analysis.sentiment_score) >= 0.5)
      : domainFilteredContent;

  const filteredContent = selectedTheme
    ? sentimentFiltered.filter((c) => c.analysis.themes.includes(selectedTheme))
    : sentimentFiltered;

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Data Feed</span>
        {hasFilters && (
          <span style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            marginLeft: 'var(--space-2)',
          }}>
            {selectedDomains.length} domain{selectedDomains.length !== 1 ? 's' : ''} filtered
          </span>
        )}
        {selectedTheme && (
          <span
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              marginLeft: 'var(--space-2)',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedTheme(null)}
          >
            {selectedTheme} ×
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
            title="Add content"
          >
            +
          </button>
          <span className="mono" style={{ fontSize: 10 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="dashboard">
        {/* Left Panel - Emerging Narratives */}
        <div className="panel-left">
          <div className="panel-section">
            <div className="panel-section-title">Trending Topics</div>
            {trendingTopics.length > 0 ? (
              trendingTopics.map((topic, i) => (
                <ListRow
                  key={topic.title}
                  rank={i + 1}
                  title={topic.title}
                  meta={`${topic.mentions} mentions`}
                  trend={topic.trend}
                />
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-3) 0' }}>
                No trending topics yet.
              </p>
            )}
          </div>
        </div>

        {/* Main Panel - Captured Intelligence */}
        <div className="panel-main">
          <div className="panel-header">Captured Intelligence</div>

          <DailyPulse />

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'high' ? 'active' : ''}`}
              onClick={() => setFilter('high')}
            >
              High Signal
            </button>
          </div>

          <div className="content-stack">
            {filteredContent.length > 0 ? (
              filteredContent.map((item) => (
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
              ))
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
                No content matches the current filters.
              </p>
            )}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-2) var(--space-4)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: loadingMore ? 'default' : 'pointer',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>

        {/* Right Panel - Watchlist */}
        <div className="panel-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">Watchlist</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <WatchlistPanel />
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <AddContentModal
          sources={sources}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
        />
      )}
    </>
  );
}
