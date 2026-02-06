'use client';

import { useState } from 'react';
import { mockPredictions, mockSources } from '@/lib/mock-data';
import Tag from '@/components/ui/Tag';
import SourcePill from '@/components/ui/SourcePill';

type StatusFilter = 'all' | 'pending' | 'correct' | 'incorrect';

export default function PredictionsLedger() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered =
    statusFilter === 'all'
      ? mockPredictions
      : mockPredictions.filter((p) => p.status === statusFilter);

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Predictions Ledger</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-6)' }}>Predictions Ledger</h1>

        <div className="filter-tabs">
          {(['all', 'pending', 'correct', 'incorrect'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Predictions table */}
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 80px 100px 80px',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span className="label">Claim</span>
            <span className="label">Source</span>
            <span className="label">Direction</span>
            <span className="label">Horizon</span>
            <span className="label">Status</span>
          </div>

          {/* Rows */}
          {filtered.map((pred) => {
            const source = mockSources.find((s) => s.id === pred.source_id);
            return (
              <div
                key={pred.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 80px 100px 80px',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                    {pred.claim}
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {pred.asset_or_theme}
                  </span>
                </div>
                <div>
                  <SourcePill name={source?.name || 'Unknown'} />
                </div>
                <div>
                  <Tag
                    label={pred.direction}
                    highlight={pred.direction === 'down'}
                  />
                </div>
                <span className="mono" style={{ fontSize: 11 }}>
                  {pred.time_horizon}
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: pred.status === 'pending'
                    ? 'rgba(136, 136, 136, 0.12)'
                    : pred.status === 'correct'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  color: pred.status === 'pending'
                    ? 'var(--text-secondary)'
                    : pred.status === 'correct'
                    ? '#22c55e'
                    : '#ef4444',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}>
                  {pred.status}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
          {filtered.length} prediction{filtered.length !== 1 ? 's' : ''} tracked
        </div>
      </div>
    </>
  );
}
