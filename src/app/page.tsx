'use client';

import { useState } from 'react';
import ContentCard from '@/components/ui/ContentCard';
import ListRow from '@/components/ui/ListRow';
import PulseSummary from '@/components/ui/PulseSummary';
import SourcePanel from '@/components/ui/SourcePanel';
import { useDomainFilter } from '@/lib/domain-filter-context';
import {
  mockContentWithAnalysis,
  mockTrendingTopics,
  mockUntrackedSignals,
  mockPulseSummary,
  mockSources,
  mockPredictions,
} from '@/lib/mock-data';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Map themes to domains for filtering trending topics
const themeDomainMap: Record<string, string> = {
  'GPU CapEx Saturation': 'AI / Semiconductors',
  'AI Revenue Gap': 'AI / Semiconductors',
  'AI Infrastructure': 'AI / Semiconductors',
  'Semiconductor Cycle': 'AI / Semiconductors',
  'Sovereign Debt Concerns': 'Macro / Liquidity',
  'Liquidity Tightening': 'Macro / Liquidity',
  'Market Complacency': 'Macro / Liquidity',
  'Private Credit Bubble': 'Credit / Fixed Income',
  'Gold as Safe Haven': 'Commodities / Energy',
  'Fed Balance Sheet': 'Macro / Liquidity',
};

export default function DailyDigest() {
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [selectedSourceId, setSelectedSourceId] = useState(mockSources[0].id);
  const { selectedDomains } = useDomainFilter();
  const hasFilters = selectedDomains.length > 0;

  // Filter content by domain
  const domainFilteredContent = hasFilters
    ? mockContentWithAnalysis.filter((c) =>
        c.source.domains.some((d) => selectedDomains.includes(d as typeof selectedDomains[number]))
      )
    : mockContentWithAnalysis;

  const filteredContent =
    filter === 'high'
      ? domainFilteredContent.filter((c) => Math.abs(c.analysis.sentiment_score) >= 0.5)
      : domainFilteredContent;

  // Filter trending topics by domain
  const filteredTopics = hasFilters
    ? mockTrendingTopics.filter((t) => {
        const domain = themeDomainMap[t.title];
        return !domain || selectedDomains.includes(domain as typeof selectedDomains[number]);
      })
    : mockTrendingTopics;

  // Filter untracked signals by domain (via the source that mentioned them)
  const filteredSignals = (() => {
    if (!hasFilters) return mockUntrackedSignals;
    const activeSourceNames = mockSources
      .filter((s) => s.domains.some((d) => selectedDomains.includes(d as typeof selectedDomains[number])))
      .map((s) => s.name);
    return mockUntrackedSignals.filter((sig) =>
      sig.mentioned_by.some((name) => activeSourceNames.includes(name))
    );
  })();

  const selectedSource = mockSources.find((s) => s.id === selectedSourceId) || mockSources[0];
  const sourcePredictions = mockPredictions.filter((p) => p.source_id === selectedSourceId);
  const sourceContentCount = mockContentWithAnalysis.filter((c) => c.source_id === selectedSourceId).length;

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Daily Digest</span>
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
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
          <div className="panel-header">Emerging Narratives</div>

          <div className="panel-section">
            <div className="panel-section-title">Trending Topics</div>
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic, i) => (
                <ListRow
                  key={topic.rank}
                  rank={i + 1}
                  title={topic.title}
                  meta={`${topic.mentions} mentions`}
                  trend={topic.trend}
                />
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-3) 0' }}>
                No topics match selected domains.
              </p>
            )}
          </div>

          <div className="panel-section">
            <div className="panel-section-title">Untracked Signals</div>
            {filteredSignals.length > 0 ? (
              filteredSignals.map((signal) => (
                <div
                  key={signal.name}
                  style={{
                    padding: 'var(--space-3) 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                    {signal.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                    {signal.context}
                  </div>
                  <div className="mono" style={{ fontSize: 10, marginTop: 'var(--space-1)', color: 'var(--text-tertiary)' }}>
                    via {signal.mentioned_by.join(', ')}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-3) 0' }}>
                No signals match selected domains.
              </p>
            )}
          </div>
        </div>

        {/* Main Panel - Captured Intelligence */}
        <div className="panel-main">
          <div className="panel-header">Captured Intelligence</div>

          <PulseSummary data={mockPulseSummary} />

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
                <div
                  key={item.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedSourceId(item.source_id)}
                >
                  <ContentCard
                    sourceName={item.source.name}
                    sentiment={item.analysis.sentiment_overall}
                    title={item.title}
                    summary={item.analysis.summary}
                    keyQuotes={item.analysis.key_quotes}
                    themes={item.analysis.themes}
                    timestamp={formatTimestamp(item.published_at)}
                    platform={item.platform}
                  />
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
                No content matches the current filters.
              </p>
            )}
          </div>
        </div>

        {/* Right Panel - Source Analysis */}
        <div className="panel-right">
          <div className="panel-header">Source Analysis</div>
          <SourcePanel
            source={selectedSource}
            contentCount={sourceContentCount}
            predictionCount={sourcePredictions.length}
            accuracy={0}
            predictions={sourcePredictions}
          />
        </div>
      </div>
    </>
  );
}
