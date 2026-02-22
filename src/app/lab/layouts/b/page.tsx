'use client';

import { useState, useEffect, useCallback } from 'react';
import WatchlistPanel from '@/components/ui/WatchlistPanel';
import ListRow from '@/components/ui/ListRow';
import Tag from '@/components/ui/Tag';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { getContentWithAnalysis, getTrendingTopics } from '@/lib/data';
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

const sentimentColors: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: 'var(--text-tertiary)',
  mixed: 'var(--text-tertiary)',
};

function QuietCard({ item }: { item: ContentWithAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  const title = decodeEntities(item.analysis.display_title || item.title);

  return (
    <div
      style={{
        padding: 'var(--space-4) 0',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Row 1: source + timestamp */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {item.source.name}
        </span>
        <span style={{
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: sentimentColors[item.analysis.sentiment_overall] || 'var(--text-tertiary)',
          flexShrink: 0,
        }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {formatTimestamp(item.published_at)}
        </span>
        <span className="mono" style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          marginLeft: 'auto',
          flexShrink: 0,
        }}>
          {item.platform}
        </span>
      </div>

      {/* Row 2: title */}
      <h2 style={{
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.4,
        margin: 0,
        color: 'var(--text-primary)',
      }}>
        {title}
      </h2>

      {/* Expanded: summary + tags */}
      {expanded && (
        <div style={{
          marginTop: 'var(--space-3)',
          animation: 'fadeIn 150ms ease',
        }}>
          {item.analysis.summary && (
            <p style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              margin: '0 0 var(--space-3)',
            }}>
              {item.analysis.summary.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')}
            </p>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', alignItems: 'center' }}>
            {item.analysis.themes.slice(0, 3).map((theme, i) => (
              <Tag key={i} label={theme} highlight={i === 0} />
            ))}
            {item.analysis.assets_mentioned && item.analysis.assets_mentioned.length > 0 && (
              <>
                <span style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 var(--space-1)' }} />
                {item.analysis.assets_mentioned.slice(0, 4).map((asset, i) => (
                  <span key={i} className="mono" style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 2,
                    background: 'var(--bg-surface)',
                    color: 'var(--text-tertiary)',
                  }}>
                    {asset}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function LayoutB() {
  const [loading, setLoading] = useState(true);
  const [contentItems, setContentItems] = useState<ContentWithAnalysis[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [rightTab, setRightTab] = useState<'watchlist' | 'trending'>('watchlist');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(async () => {
    const [contentResult, topics] = await Promise.all([
      getContentWithAnalysis(1, 20),
      getTrendingTopics(),
    ]);
    setContentItems(contentResult.items);
    setHasMore(contentResult.hasMore);
    setTrendingTopics(topics);
    setPage(1);
    setLoading(false);
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

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-body)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-main)',
    }}>
      {/* Main feed — wide, breathing room */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '48px 56px',
        maxWidth: 800,
      }}>
        {/* Minimal header */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-8)',
        }}>
          <h1 style={{
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Intelligence Feed
          </h1>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Content — quiet rows */}
        {loading ? (
          <SkeletonCards count={6} />
        ) : (
          <div>
            {contentItems.map((item) => (
              <QuietCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              marginTop: 'var(--space-6)',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: loadingMore ? 'default' : 'pointer',
              width: '100%',
            }}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>

      {/* Right panel — tabbed: watchlist / trending */}
      <div style={{
        width: 320,
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          padding: '0 var(--space-4)',
        }}>
          {(['watchlist', 'trending'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--space-3) var(--space-3)',
                fontSize: 11,
                color: rightTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                borderBottom: rightTab === tab ? '1px solid var(--text-primary)' : '1px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-4)' }}>
          {rightTab === 'watchlist' ? (
            <WatchlistPanel />
          ) : (
            <div>
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
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  No trending topics yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
