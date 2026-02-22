'use client';

import { useState, useEffect, useCallback } from 'react';
import WatchlistPanel from '@/components/ui/WatchlistPanel';
import Sidebar from '@/components/ui/Sidebar';
import TickerTape from '@/components/ui/TickerTape';
import { DomainFilterProvider } from '@/lib/domain-filter-context';
import { SearchProvider } from '@/components/ui/SearchTrigger';
import { TransitionProvider } from '@/lib/transition-context';
import { getContentWithAnalysis } from '@/lib/data';
import type { ContentWithAnalysis } from '@/types';

/* ---- Vertical Card (inline) ---- */

const sentimentAccent: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: '#888888',
  mixed: '#888888',
};

function VerticalCard({ item }: { item: ContentWithAnalysis }) {
  const accent = sentimentAccent[item.analysis.sentiment_overall] || '#888';
  const title = decodeEntities(item.analysis.display_title || item.title);

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Cover area */}
      <div style={{
        height: 120,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Source pill + sentiment badge overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '4px 8px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}>
              {item.source.name.charAt(0)}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{item.source.name}</span>
          </div>

          <span style={{
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            border: `1px solid ${accent}33`,
            color: accent,
            background: `${accent}15`,
          }}>
            {item.analysis.sentiment_overall}
          </span>
        </div>

        {/* Accent glow */}
        <div style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: accent,
          opacity: 0.06,
          filter: 'blur(24px)',
        }} />
        {/* Theme placeholder */}
        <span style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginTop: 'var(--space-6)',
        }}>
          {item.analysis.themes[0] || 'Uncategorized'}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.45,
          margin: 0,
          color: 'var(--text-primary)',
          flex: 1,
        }}>
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {formatTimestamp(item.published_at)}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>&middot;</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {item.platform}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- Helpers ---- */

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

/* ---- Page content ---- */

function PageContent() {
  const [loading, setLoading] = useState(true);
  const [contentItems, setContentItems] = useState<ContentWithAnalysis[]>([]);

  const loadData = useCallback(async () => {
    const contentResult = await getContentWithAnalysis(1, 20);
    setContentItems(contentResult.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Center — card grid with max-width */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
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

        {/* Grid */}
        <div style={{
          maxWidth: 960,
          width: '100%',
          padding: 'var(--space-6)',
        }}>
          <div className="panel-header" style={{ marginBottom: 'var(--space-6)' }}>
            Captured Intelligence
          </div>

          {loading ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Loading...</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 'var(--space-4)',
            }}>
              {contentItems.map((item) => (
                <VerticalCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Watchlist */}
      <div style={{
        width: 320,
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        flexShrink: 0,
        padding: 'var(--space-4)',
      }}>
        <div className="panel-header">Watchlist</div>
        <div style={{ flex: 1, minHeight: 0, marginTop: 'var(--space-4)' }}>
          <WatchlistPanel />
        </div>
      </div>
    </div>
  );
}

/* ---- Layout shell ---- */

export default function LayoutC() {
  return (
    <TransitionProvider>
      <DomainFilterProvider>
        <SearchProvider>
          <div className="app-layout">
            <TickerTape />
            <div className="app-body" style={{ width: '100%' }}>
              <Sidebar />
              <div className="main-area" style={{ display: 'flex', overflow: 'hidden' }}>
                <PageContent />
              </div>
            </div>
          </div>
        </SearchProvider>
      </DomainFilterProvider>
    </TransitionProvider>
  );
}
