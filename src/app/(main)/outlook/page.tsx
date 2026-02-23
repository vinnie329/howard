'use client';

import { useState, useEffect } from 'react';
import { getOutlook, getOutlookHistory } from '@/lib/data';
import OutlookCard from '@/components/ui/OutlookCard';
import { SkeletonCards, SkeletonRows } from '@/components/ui/Skeleton';
import type { Outlook, OutlookHistory } from '@/types';

const horizonLabels: Record<string, string> = {
  short: 'Short-term',
  medium: 'Medium-term',
  long: 'Long-term',
};

export default function OutlookPage() {
  const [outlooks, setOutlooks] = useState<Outlook[]>([]);
  const [history, setHistory] = useState<OutlookHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOutlook(), getOutlookHistory(10)]).then(([outlookData, historyData]) => {
      setOutlooks(outlookData);
      setHistory(historyData);
      setLoading(false);
    });
  }, []);

  const latestUpdate = outlooks.length > 0
    ? new Date(Math.max(...outlooks.map((o) => new Date(o.last_updated).getTime())))
        .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  const avgConfidence = outlooks.length > 0
    ? Math.round(outlooks.reduce((sum, o) => sum + o.confidence, 0) / outlooks.length)
    : 0;

  // Filter history to only entries with actual changes
  const changesHistory = history.filter((h) => h.changes_summary.length > 0);

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Outlook</span>
      </div>

      <div style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* Left column — Outlooks */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
          {/* Header */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h1 style={{ marginBottom: 'var(--space-2)' }}>Howard&apos;s Outlook</h1>
            <p style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              margin: '0 0 var(--space-2)',
              lineHeight: 1.4,
            }}>
              Synthesized market thesis across time horizons, updated as new intelligence arrives.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              {latestUpdate && (
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  Last updated: {latestUpdate}
                </span>
              )}
              {avgConfidence > 0 && (
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  Avg conviction: {avgConfidence}%
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <SkeletonCards count={3} />
          ) : (
            <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {outlooks.map((outlook) => {
                const latestUpdate = changesHistory.find((h) => h.outlook_id === outlook.id);
                return <OutlookCard key={outlook.id} outlook={outlook} latestUpdate={latestUpdate} />;
              })}
            </div>
          )}
        </div>

        {/* Right column — Recent Updates */}
        <div style={{
          width: 340,
          minWidth: 340,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          borderLeft: '1px solid var(--border)',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>
            Recent Updates
          </div>

          {loading ? (
            <SkeletonRows count={4} />
          ) : changesHistory.length === 0 ? (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              No updates yet.
            </div>
          ) : (
            <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {changesHistory.map((entry) => (
                <a
                  key={entry.id}
                  href={`/outlook/updates/${entry.id}`}
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    <span className="mono" style={{
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 2,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border)',
                    }}>
                      {horizonLabels[entry.time_horizon] || entry.time_horizon}
                    </span>
                    {entry.previous_sentiment !== entry.new_sentiment && (
                      <span className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                        {entry.previous_sentiment} → {entry.new_sentiment}
                      </span>
                    )}
                    {entry.previous_confidence !== entry.new_confidence && (
                      <span className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                        {entry.previous_confidence}% → {entry.new_confidence}%
                      </span>
                    )}
                  </div>
                  {/* Show first change as summary */}
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 'var(--space-2)' }}>
                    {entry.changes_summary[0]}
                  </div>
                  {entry.changes_summary.length > 1 && (
                    <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                      +{entry.changes_summary.length - 1} more change{entry.changes_summary.length > 2 ? 's' : ''}
                    </span>
                  )}
                  <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
