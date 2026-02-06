'use client';

import { mockUntrackedSignals, mockSources } from '@/lib/mock-data';
import SourcePill from '@/components/ui/SourcePill';
import StatsGrid from '@/components/ui/StatsGrid';

export default function DiscoveryPipeline() {
  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Discovery Pipeline</span>
      </div>

      <div className="dashboard">
        {/* Candidates */}
        <div className="panel-left" style={{ width: 360, minWidth: 360 }}>
          <div className="panel-header">Source Candidates</div>

          <div className="panel-section">
            <div className="panel-section-title">Referenced by Tracked Sources</div>
            {mockUntrackedSignals.map((signal) => (
              <div
                key={signal.name}
                style={{
                  padding: 'var(--space-3)',
                  marginBottom: 'var(--space-2)',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{signal.name}</span>
                  <button style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    border: 'none',
                    cursor: 'pointer',
                  }}>
                    + Track
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  {signal.context}
                </div>
                <div className="mono" style={{ fontSize: 10, marginTop: 'var(--space-1)', color: 'var(--text-tertiary)' }}>
                  Referenced by {signal.mentioned_by.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracked sources overview */}
        <div className="panel-main">
          <div className="panel-header">Tracked Sources</div>

          <StatsGrid stats={[
            { value: '5', label: 'Sources' },
            { value: '4', label: 'Content Items' },
            { value: '7', label: 'Predictions' },
            { value: '2', label: 'Domains' },
          ]} />

          <div style={{ marginTop: 'var(--space-6)' }}>
            {mockSources.map((source, i) => (
              <div
                key={source.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 16, textAlign: 'right' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <SourcePill name={source.name} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {source.domains[0]}
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {source.weighted_score.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
