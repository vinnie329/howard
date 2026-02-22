'use client';

import { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/ui/ContentCard';
import ListRow from '@/components/ui/ListRow';
import DailyPulse from '@/components/ui/DailyPulse';
import WatchlistPanel from '@/components/ui/WatchlistPanel';
import Sidebar from '@/components/ui/Sidebar';
import TickerTape from '@/components/ui/TickerTape';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { DomainFilterProvider } from '@/lib/domain-filter-context';
import { SearchProvider } from '@/components/ui/SearchTrigger';
import { TransitionProvider } from '@/lib/transition-context';
import { getSources, getContentWithAnalysis, getTrendingTopics } from '@/lib/data';
import type { ContentWithAnalysis, TrendingTopic } from '@/types';

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

function PageContent() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [contentItems, setContentItems] = useState<ContentWithAnalysis[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);

  const loadData = useCallback(async () => {
    const [_s, contentResult, topics] = await Promise.all([
      getSources(),
      getContentWithAnalysis(1, 10),
      getTrendingTopics(),
    ]);
    setContentItems(contentResult.items);
    setTrendingTopics(topics);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredContent =
    filter === 'high'
      ? contentItems.filter((c) => Math.abs(c.analysis.sentiment_score) >= 0.5)
      : contentItems;

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Data Feed</span>
        <div style={{ marginLeft: 'auto' }}>
          <span className="mono" style={{ fontSize: 10 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="dashboard">
        <div className="panel-left">
          <div className="panel-section">
            <div className="panel-section-title">Trending Topics</div>
            {trendingTopics.length > 0 ? (
              <div className="stagger-in">{trendingTopics.map((topic, i) => (
                <ListRow
                  key={topic.title}
                  rank={i + 1}
                  title={topic.title}
                  meta={`${topic.mentions} mentions`}
                  trend={topic.trend}
                />
              ))}</div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-3) 0' }}>
                No trending topics yet.
              </p>
            )}
          </div>
        </div>

        <div className="panel-main">
          <div className="panel-header">Captured Intelligence</div>
          <DailyPulse />
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >All</button>
            <button
              className={`filter-tab ${filter === 'high' ? 'active' : ''}`}
              onClick={() => setFilter('high')}
            >High Signal</button>
          </div>
          <div className="content-stack">
            {loading ? (
              <SkeletonCards count={4} />
            ) : (
              filteredContent.map((item) => (
                <ContentCard
                  key={item.id}
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
              ))
            )}
          </div>
        </div>

        <div className="panel-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">Watchlist</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <WatchlistPanel />
          </div>
        </div>
      </div>
    </>
  );
}

export default function LayoutA() {
  return (
    <TransitionProvider>
      <DomainFilterProvider>
        <SearchProvider>
          <div className="app-layout">
            <TickerTape />
            <div className="app-body">
              <Sidebar />
              <div className="main-area">
                <PageContent />
              </div>
            </div>
          </div>
        </SearchProvider>
      </DomainFilterProvider>
    </TransitionProvider>
  );
}
