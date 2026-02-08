'use client';

import { useState } from 'react';
import type { Prediction } from '@/types';

interface PredictionRowProps {
  prediction: Prediction;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'var(--bg-surface)', color: 'var(--text-secondary)' },
  correct: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' },
  incorrect: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  unfalsifiable: { bg: 'var(--bg-surface)', color: 'var(--text-tertiary)' },
};

export default function PredictionRow({ prediction }: PredictionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = statusColors[prediction.status] || statusColors.pending;

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {prediction.claim}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)', flexWrap: 'wrap' }}>
            {prediction.asset_or_theme && (
              <span className="mono" style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}>
                {prediction.asset_or_theme}
              </span>
            )}
            {prediction.direction && (
              <span className="mono" style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 2,
                background: prediction.direction.toLowerCase().includes('bull')
                  ? 'rgba(34, 197, 94, 0.12)' : prediction.direction.toLowerCase().includes('bear')
                    ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                color: prediction.direction.toLowerCase().includes('bull')
                  ? '#22c55e' : prediction.direction.toLowerCase().includes('bear')
                    ? '#ef4444' : 'var(--text-tertiary)',
              }}>
                {prediction.direction}
              </span>
            )}
            {prediction.time_horizon && prediction.time_horizon !== 'unspecified' && (
              <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                {prediction.time_horizon}
              </span>
            )}
          </div>
        </div>
        <span style={{
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          background: colors.bg,
          color: colors.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>
          {prediction.status}
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <span className="label" style={{ fontSize: 9 }}>Confidence</span>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>{prediction.confidence || '—'}</div>
            </div>
            <div>
              <span className="label" style={{ fontSize: 9 }}>Date</span>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                {new Date(prediction.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            {prediction.notes && (
              <div style={{ width: '100%' }}>
                <span className="label" style={{ fontSize: 9 }}>Notes</span>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                  {prediction.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
