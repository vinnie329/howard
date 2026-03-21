'use client';

import { useParams } from 'next/navigation';
import { mockSources, mockContentWithAnalysis, mockPredictions } from '@/lib/mock-data';
import SourcePanel from '@/components/ui/SourcePanel';
import ContentCard from '@/components/ui/ContentCard';

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
  const sourceId = params.id as string;

  const source = mockSources.find((s) => s.id === sourceId || s.slug === sourceId);
  const content = mockContentWithAnalysis.filter(
    (c) => c.source_id === source?.id
  );
  const predictions = mockPredictions.filter(
    (p) => p.source_id === source?.id
  );

  if (!source) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Sources</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div className="panel-main" style={{ padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Source not found.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Sources</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>{source.name}</span>
      </div>

      <div className="dashboard">
        {/* Source details on left */}
        <div className="panel-left" style={{ width: 320, minWidth: 320 }}>
          <div className="panel-header">Profile</div>
          <SourcePanel
            source={source}
            contentCount={content.length}
            predictionCount={predictions.length}
            accuracy={0}
            predictions={predictions}
          />
        </div>

        {/* Content from this source */}
        <div className="panel-main">
          <div className="panel-header">Content History</div>
          <div className="content-stack">
            {content.map((item) => (
              <ContentCard
                key={item.id}
                sourceName={item.source.name}
                sentiment={item.analysis.sentiment_overall}
                title={item.title}
                summary={item.analysis.summary}
                keyQuotes={item.analysis.key_quotes}
                themes={item.analysis.themes}
                timestamp={formatTimestamp(item.published_at)}
                platform={item.platform}
              />
            ))}
            {content.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                No content captured yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
