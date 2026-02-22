'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOutlookHistoryById } from '@/lib/data';
import { Skeleton, SkeletonLines } from '@/components/ui/Skeleton';
import type { OutlookHistory } from '@/types';

const horizonLabels: Record<string, string> = {
  short: 'Short-term',
  medium: 'Medium-term',
  long: 'Long-term',
};

export default function OutlookUpdateDetail() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<OutlookHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      getOutlookHistoryById(id).then((result) => {
        setEntry(result);
        setLoading(false);
      });
    }
  }, [params.id]);

  if (loading) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Outlook</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton height={20} width="60%" />
          <SkeletonLines count={5} />
        </div>
      </>
    );
  }

  if (!entry) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <Link href="/outlook" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Outlook</Link>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1 }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Update not found.</p>
        </div>
      </>
    );
  }

  const date = new Date(entry.created_at).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const sentimentChanged = entry.previous_sentiment !== entry.new_sentiment;
  const confidenceChanged = entry.previous_confidence !== entry.new_confidence;

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <Link href="/outlook" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Outlook</Link>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Update</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, maxWidth: 700, margin: '0 auto' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 'var(--space-4)',
          }}
        >
          &larr; Back to outlook
        </button>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <span className="mono" style={{
              fontSize: 9,
              padding: '2px 6px',
              borderRadius: 2,
              background: 'var(--bg-surface)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}>
              {horizonLabels[entry.time_horizon] || entry.time_horizon}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              {entry.analyses_evaluated} analyses evaluated
            </span>
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Outlook Update
          </h1>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {date}
          </span>
        </div>

        {/* Sentiment / Confidence changes */}
        {(sentimentChanged || confidenceChanged) && (
          <div style={{
            display: 'flex',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            {sentimentChanged && (
              <div>
                <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Sentiment</div>
                <div style={{ fontSize: 14 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{entry.previous_sentiment}</span>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 var(--space-2)' }}>→</span>
                  <span style={{ fontWeight: 500 }}>{entry.new_sentiment}</span>
                </div>
              </div>
            )}
            {confidenceChanged && (
              <div>
                <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Conviction</div>
                <div className="mono" style={{ fontSize: 14 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{entry.previous_confidence}%</span>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 var(--space-2)' }}>→</span>
                  <span style={{ fontWeight: 500 }}>{entry.new_confidence}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Changes */}
        {entry.changes_summary.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Changes Made</div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              {entry.changes_summary.map((change, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'baseline',
                  padding: 'var(--space-3)',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: 10, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                    {change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        {entry.evaluation_reasoning && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Evaluation Reasoning</div>
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {entry.evaluation_reasoning}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
