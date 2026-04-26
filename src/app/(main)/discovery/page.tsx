'use client';

import { useState, useEffect } from 'react';
import { getSources } from '@/lib/data';
import { DIMENSION_LABELS } from '@/lib/scoring';
import SourcePill from '@/components/ui/SourcePill';
import StatsGrid from '@/components/ui/StatsGrid';
import AddSourceModal from '@/components/ui/AddSourceModal';
import { SkeletonRows } from '@/components/ui/Skeleton';
import type { Source, CredibilityDimension } from '@/types';

const dimensionKeys = Object.keys(DIMENSION_LABELS) as CredibilityDimension[];

export default function DiscoveryPipeline() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  function loadSources() {
    getSources().then((data) => {
      setSources(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadSources();
  }, []);

  const uniqueDomains = Array.from(new Set(sources.flatMap((s) => s.domains)));

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Discovery Pipeline</span>
      </div>

      <div className="dashboard">
        {/* Tracked sources overview */}
        <div className="panel-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="panel-header">Tracked Sources</div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                fontSize: 11,
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              + Add Source
            </button>
          </div>

          {loading ? (
            <SkeletonRows count={5} />
          ) : (
            <>
              <StatsGrid stats={[
                { value: String(sources.length), label: 'Sources' },
                { value: String(uniqueDomains.length), label: 'Domains' },
              ]} />

              <div className="stagger-in" style={{ marginTop: 'var(--space-6)' }}>
                {sources.map((source, i) => {
                  const isExpanded = expandedId === source.id;
                  return (
                    <div key={source.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-3) 0',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : source.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 16, textAlign: 'right' }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <SourcePill name={source.name} slug={source.slug} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            {source.domains?.[0] ?? ''}
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

                      {/* Expanded dimension scores */}
                      {isExpanded && (
                        <div style={{
                          padding: '0 0 var(--space-4) 28px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 'var(--space-2) var(--space-4)',
                        }}>
                          {dimensionKeys.map((key) => {
                            const value = source.scores?.[key] ?? 0;
                            const barColor = value >= 4.5 ? '#22c55e'
                              : value >= 3.5 ? 'var(--accent)'
                              : value >= 2.5 ? 'var(--text-tertiary)'
                              : '#ef4444';
                            return (
                              <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                                    {DIMENSION_LABELS[key]}
                                  </span>
                                  <span className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                                    {value.toFixed(1)}
                                  </span>
                                </div>
                                <div style={{
                                  height: 3,
                                  background: 'var(--bg-surface)',
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${(value / 5) * 100}%`,
                                    background: barColor,
                                    borderRadius: 2,
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSourceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadSources}
        />
      )}
    </>
  );
}
