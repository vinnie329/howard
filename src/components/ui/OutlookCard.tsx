'use client';

import { useState } from 'react';
import Tag from './Tag';
import type { Outlook, OutlookHistory } from '@/types';

const sentimentColors: Record<string, { bg: string; color: string; border: string }> = {
  bullish: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.2)' },
  bearish: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  cautious: { bg: 'rgba(255, 72, 0, 0.15)', color: 'var(--accent)', border: 'rgba(255, 72, 0, 0.25)' },
  neutral: { bg: 'rgba(136, 136, 136, 0.12)', color: 'var(--text-secondary)', border: 'var(--border)' },
};

export default function OutlookCard({ outlook, latestUpdate }: { outlook: Outlook; latestUpdate?: OutlookHistory }) {
  const sColors = sentimentColors[outlook.sentiment] || sentimentColors.neutral;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-6)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-1)',
        }}>
          <h2 style={{ fontSize: 16 }}>{outlook.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: sColors.bg,
              color: sColors.color,
              border: `1px solid ${sColors.border}`,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}>
              {outlook.sentiment}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              {outlook.confidence}%
            </span>
          </div>
        </div>
        <span className="label" style={{ fontSize: 9 }}>{outlook.subtitle}</span>
      </div>

      {/* Latest Changes */}
      {latestUpdate && <ChangesSummary entry={latestUpdate} />}

      {/* Thesis */}
      <div style={{ padding: 'var(--space-6)' }}>
        {/* Intro */}
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: '0 0 var(--space-6)',
        }}>
          {outlook.thesis_intro}
        </p>

        {/* Thesis points */}
        {outlook.thesis_points.map((point, i) => (
          <div key={i} style={{ marginBottom: i < outlook.thesis_points.length - 1 ? 'var(--space-4)' : 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-1)',
            }}>
              {point.heading}
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: 12,
              lineHeight: 1.5,
              margin: 0,
            }}>
              {point.content}
            </p>
          </div>
        ))}
      </div>

      {/* Positioning */}
      {outlook.positioning.length > 0 && (
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--border)',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-3)', fontSize: 8 }}>
            Positioning
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {outlook.positioning.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 10, flexShrink: 0 }}>&bull;</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Themes */}
      {outlook.key_themes.length > 0 && (
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 'var(--space-1)',
          flexWrap: 'wrap',
        }}>
          {outlook.key_themes.map((theme, i) => (
            <Tag key={i} label={theme} highlight={i === 0} />
          ))}
        </div>
      )}

      {/* Sources */}
      {outlook.supporting_sources.length > 0 && (
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--border)',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)', fontSize: 8 }}>
            Sources Informing This View
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {outlook.supporting_sources.map((source, i) => (
              <span key={i} className="mono" style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}>
                {source.name} ({source.weight}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangesSummary({ entry }: { entry: OutlookHistory }) {
  const [expanded, setExpanded] = useState(false);
  const changeCount = entry.changes_summary.length;
  const date = new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  const sentimentChanged = entry.previous_sentiment !== entry.new_sentiment;
  const confidenceChanged = entry.previous_confidence !== entry.new_confidence;

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: 'var(--space-3) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: 11,
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 8,
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          &#9654;
        </span>
        <span className="mono" style={{ fontSize: 10 }}>
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </span>
        <span style={{ color: 'var(--border-light)' }}>&middot;</span>
        <span className="mono" style={{ fontSize: 10 }}>{date}</span>

        {sentimentChanged && (
          <>
            <span style={{ color: 'var(--border-light)' }}>&middot;</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {entry.previous_sentiment} &rarr; {entry.new_sentiment}
            </span>
          </>
        )}
        {confidenceChanged && (
          <>
            <span style={{ color: 'var(--border-light)' }}>&middot;</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {entry.previous_confidence}% &rarr; {entry.new_confidence}%
            </span>
          </>
        )}
      </button>

      {expanded && (
        <div style={{
          padding: '0 var(--space-6) var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
        }}>
          {entry.changes_summary.map((change, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 9, flexShrink: 0 }}>&bull;</span>
              <span style={{ color: 'var(--text-primary)', fontSize: 11, lineHeight: 1.4 }}>{change}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
