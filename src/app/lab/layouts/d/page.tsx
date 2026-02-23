'use client';

import { useState, useEffect, useCallback } from 'react';
import { getContentWithAnalysis, getOutlook, getTrendingTopics } from '@/lib/data';
import type { ContentWithAnalysis, Outlook, TrendingTopic } from '@/types';

/* ---- Helpers ---- */

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3.6e6);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const sentimentDot: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  cautious: '#f59e0b',
  neutral: '#666',
  mixed: '#666',
};

/* ---- Geist-inspired tokens ---- */

const g = {
  bg: '#000000',
  bg1: '#0a0a0a',
  bg2: '#111111',
  border: '#1a1a1a',
  borderLight: '#262626',
  text: '#ededed',
  text2: '#888888',
  text3: '#555555',
  blue: '#0070f3',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", "SF Mono", Menlo, monospace',
  radius: 8,
  radiusSm: 6,
};

/* ---- Components ---- */

function NavItem({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: '6px 12px',
        fontSize: 14,
        color: active ? g.text : g.text3,
        cursor: 'pointer',
        borderRadius: g.radiusSm,
        transition: 'color 0.15s',
        fontFamily: g.font,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = g.text2; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = g.text3; }}
    >
      {label}
    </button>
  );
}

function FeedRow({ item }: { item: ContentWithAnalysis }) {
  const title = decodeEntities(item.analysis.display_title || item.title);
  const dot = sentimentDot[item.analysis.sentiment_overall] || g.text3;

  return (
    <a
      href={`/content/${item.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        padding: '16px 0',
        borderBottom: `1px solid ${g.border}`,
        textDecoration: 'none',
        color: 'inherit',
        alignItems: 'start',
      }}
    >
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: g.text2 }}>{item.source.name}</span>
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.5,
          color: g.text,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </div>
        {item.analysis.themes.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {item.analysis.themes.slice(0, 4).map((theme, i) => (
              <span key={i} style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: g.bg2,
                color: g.text2,
                border: `1px solid ${g.border}`,
              }}>
                {theme}
              </span>
            ))}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 12,
        color: g.text3,
        fontFamily: g.mono,
        whiteSpace: 'nowrap',
        paddingTop: 2,
      }}>
        {timeAgo(item.published_at)}
      </span>
    </a>
  );
}

function OutlookRow({ outlook }: { outlook: Outlook }) {
  const dot = sentimentDot[outlook.sentiment] || g.text3;
  const horizonLabel: Record<string, string> = {
    short: 'Short',
    medium: 'Medium',
    long: 'Long',
  };

  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: `1px solid ${g.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: g.mono,
          color: g.text3,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {horizonLabel[outlook.time_horizon] || outlook.time_horizon}
        </span>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dot,
        }} />
        <span style={{
          fontSize: 11,
          fontFamily: g.mono,
          color: g.text3,
          marginLeft: 'auto',
        }}>
          {outlook.confidence}%
        </span>
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 500,
        color: g.text,
        letterSpacing: '-0.01em',
        lineHeight: 1.4,
      }}>
        {outlook.title}
      </div>
      <div style={{
        fontSize: 12,
        color: g.text3,
        marginTop: 4,
        lineHeight: 1.4,
      }}>
        {outlook.subtitle}
      </div>
    </div>
  );
}

function TrendingRow({ topic, rank }: { topic: TrendingTopic; rank: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',
      borderBottom: `1px solid ${g.border}`,
    }}>
      <span style={{
        fontSize: 11,
        fontFamily: g.mono,
        color: g.text3,
        width: 16,
      }}>
        {rank}
      </span>
      <span style={{ fontSize: 13, color: g.text, flex: 1 }}>
        {topic.title}
      </span>
      <span style={{
        fontSize: 11,
        fontFamily: g.mono,
        color: topic.trend === 'up' ? '#22c55e' : topic.trend === 'down' ? '#ef4444' : g.text3,
      }}>
        {topic.mentions}
      </span>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: g.bg1,
      border: `1px solid ${g.border}`,
      borderRadius: g.radius,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${g.border}`,
        fontSize: 13,
        fontWeight: 500,
        color: g.text,
        letterSpacing: '-0.01em',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ---- Page ---- */

export default function LayoutD() {
  const [contentItems, setContentItems] = useState<ContentWithAnalysis[]>([]);
  const [outlooks, setOutlooks] = useState<Outlook[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'feed' | 'outlook'>('feed');

  const loadData = useCallback(async () => {
    const [contentResult, outlookData, trendingData] = await Promise.all([
      getContentWithAnalysis(1, 20),
      getOutlook(),
      getTrendingTopics(),
    ]);
    setContentItems(contentResult.items);
    setOutlooks(outlookData);
    setTrending(trendingData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div style={{
      minHeight: '100vh',
      background: g.bg,
      color: g.text,
      fontFamily: g.font,
    }}>
      {/* Top nav */}
      <header style={{
        height: 48,
        borderBottom: `1px solid ${g.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 4,
        position: 'sticky',
        top: 0,
        background: g.bg,
        zIndex: 10,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          marginRight: 24,
        }}>
          Howard
        </span>
        <NavItem label="Feed" active={tab === 'feed'} onClick={() => setTab('feed')} />
        <NavItem label="Outlook" active={tab === 'outlook'} onClick={() => setTab('outlook')} />
        <NavItem label="Signals" />
        <NavItem label="Predictions" />

        <span style={{
          marginLeft: 'auto',
          fontSize: 12,
          fontFamily: g.mono,
          color: g.text3,
        }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </header>

      {/* Content area */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* Main column */}
        <div>
          {tab === 'feed' && (
            <>
              {loading ? (
                <div style={{ color: g.text3, fontSize: 13 }}>Loading...</div>
              ) : (
                contentItems.map((item) => (
                  <FeedRow key={item.id} item={item} />
                ))
              )}
            </>
          )}

          {tab === 'outlook' && (
            <>
              {loading ? (
                <div style={{ color: g.text3, fontSize: 13 }}>Loading...</div>
              ) : (
                <div style={{
                  border: `1px solid ${g.border}`,
                  borderRadius: g.radius,
                  overflow: 'hidden',
                  background: g.bg1,
                }}>
                  {outlooks.map((outlook) => (
                    <OutlookRow key={outlook.id} outlook={outlook} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'sticky',
          top: 80,
        }}>
          {/* Outlook summary */}
          <SidePanel title="Outlook">
            {loading ? (
              <div style={{ padding: 20, color: g.text3, fontSize: 13 }}>Loading...</div>
            ) : (
              outlooks.map((outlook) => (
                <OutlookRow key={outlook.id} outlook={outlook} />
              ))
            )}
          </SidePanel>

          {/* Trending */}
          <SidePanel title="Trending">
            {trending.length === 0 ? (
              <div style={{ padding: 20, color: g.text3, fontSize: 13 }}>No trending topics.</div>
            ) : (
              trending.slice(0, 8).map((topic, i) => (
                <TrendingRow key={topic.title} topic={topic} rank={i + 1} />
              ))
            )}
          </SidePanel>
        </div>
      </div>
    </div>
  );
}
