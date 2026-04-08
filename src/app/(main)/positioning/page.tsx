'use client';

import { useState, useEffect } from 'react';
import { getPositioning, getPositioningHistory } from '@/lib/data';
import type { PositioningData, PositioningChange } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';

const POSTURE_CONFIG: Record<string, { label: string; color: string }> = {
  aggressive: { label: 'AGGRESSIVE', color: '#22c55e' },
  'lean-in':  { label: 'LEAN IN',    color: '#4ade80' },
  neutral:    { label: 'NEUTRAL',    color: '#eab308' },
  cautious:   { label: 'CAUTIOUS',   color: '#f97316' },
  defensive:  { label: 'DEFENSIVE',  color: '#ef4444' },
};

function AssetPill({ name, detail }: { ticker?: string; name: string; detail?: string }) {
  const letter = name.charAt(0);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 8px 2px 3px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)',
      verticalAlign: 'middle',
      margin: '2px 1px',
    }}>
      <span style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 8,
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        flexShrink: 0,
      }}>
        {letter}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 500 }}>
        {name}
      </span>
      {detail && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {detail}
        </span>
      )}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
      {children}
    </span>
  );
}

export default function PositioningPage() {
  const [positioning, setPositioning] = useState<PositioningData | null>(null);
  const [history, setHistory] = useState<PositioningChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    Promise.all([getPositioning(refresh), getPositioningHistory(10)])
      .then(([data, hist]) => {
        setPositioning(data);
        setHistory(hist);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { fetchData(); }, []);

  const posture = positioning?.posture
    ? POSTURE_CONFIG[positioning.posture] ?? POSTURE_CONFIG.neutral
    : null;

  const generatedAt = positioning?.generated_at
    ? new Date(positioning.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Positioning</span>
      </div>

      <div className="page-two-col" style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* Center column — Positioning */}
        <div className="page-two-col-main" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-8) var(--space-6)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
          {loading ? (
            <SkeletonRows count={5} />
          ) : !positioning ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              No positioning data. Run the pipeline to generate.
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <h1 style={{ fontSize: 18 }}>Positioning</h1>
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="mono"
                  style={{
                    fontSize: 10,
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    background: refreshing ? 'var(--bg-surface)' : 'transparent',
                    border: '1px solid var(--border)',
                    color: refreshing ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                    cursor: refreshing ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!refreshing) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {refreshing ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>

              {/* Posture badge */}
              {posture && (
                <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="mono" style={{
                    fontSize: 10,
                    padding: '2px var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    background: posture.color + '18',
                    border: `1px solid ${posture.color}40`,
                    color: posture.color,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}>
                    {posture.label}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    posture
                  </span>
                </div>
              )}

              {/* Narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                {positioning.narrative.split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i} style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.8,
                    margin: 0,
                  }}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Opportunities */}
              {positioning.opportunities.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <SectionLabel>Opportunities</SectionLabel>
                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {positioning.opportunities.map((opp) => (
                      <div key={opp.ticker} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-3)',
                      }}>
                        <AssetPill ticker={opp.ticker} name={opp.name} />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, paddingTop: 2 }}>
                          {opp.rationale}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shorts */}
              {positioning.shorts && positioning.shorts.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <SectionLabel>Short / Underweight</SectionLabel>
                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {positioning.shorts.map((s) => (
                      <div key={s.ticker} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-3)',
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          <AssetPill ticker={s.ticker} name={s.name} />
                          <span className="mono" style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#ef444418',
                            border: '1px solid #ef444440',
                            color: '#ef4444',
                            fontWeight: 600,
                          }}>
                            {s.confidence}%
                          </span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, paddingTop: 2 }}>
                          {s.rationale}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fat pitches */}
              {positioning.fat_pitches.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <SectionLabel>Fat pitches (MA deviation)</SectionLabel>
                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {positioning.fat_pitches.map((fp) => (
                      <AssetPill
                        key={fp.ticker}
                        ticker={fp.ticker}
                        name={fp.name}
                        detail={`${fp.dev200d > 0 ? '+' : ''}${fp.dev200d.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Avoids */}
              {positioning.avoids.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <SectionLabel>Avoid</SectionLabel>
                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {positioning.avoids.map((avoid, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <span style={{ color: '#ef4444', marginRight: 6 }}>-</span>
                        {avoid}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                Generated {generatedAt} · {positioning.opportunities.length} opportunities · {positioning.shorts?.length ?? 0} shorts · {positioning.fat_pitches.length} fat pitch{positioning.fat_pitches.length !== 1 ? 'es' : ''}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Right column — Changelog */}
        <div className="page-two-col-aside" style={{
          width: 340,
          minWidth: 340,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          borderLeft: '1px solid var(--border)',
          marginLeft: 'auto',
        }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>
            Positioning Changes
          </div>

          {loading ? (
            <SkeletonRows count={4} />
          ) : history.length === 0 ? (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              No changes yet.
            </div>
          ) : (
            <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {history.map((entry) => (
                <div
                  key={entry.date}
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {entry.posture_change && (
                      <span className="mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                        {entry.posture_change.from} → {entry.posture_change.to}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {entry.added_opportunities.map((t) => (
                      <div key={'ao' + t} className="mono" style={{ fontSize: 10, color: '#22c55e' }}>
                        + Long {t}
                      </div>
                    ))}
                    {entry.removed_opportunities.map((t) => (
                      <div key={'ro' + t} className="mono" style={{ fontSize: 10, color: '#ef4444' }}>
                        − Long {t}
                      </div>
                    ))}
                    {entry.added_shorts.map((t) => (
                      <div key={'as' + t} className="mono" style={{ fontSize: 10, color: '#f97316' }}>
                        + Short {t}
                      </div>
                    ))}
                    {entry.removed_shorts.map((t) => (
                      <div key={'rs' + t} className="mono" style={{ fontSize: 10, color: '#22c55e' }}>
                        − Short {t}
                      </div>
                    ))}
                    {entry.added_avoids.map((a) => (
                      <div key={'aa' + a} className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        + Avoid: {a.length > 40 ? a.slice(0, 40) + '…' : a}
                      </div>
                    ))}
                    {entry.removed_avoids.map((a) => (
                      <div key={'ra' + a} className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                        {a.length > 40 ? a.slice(0, 40) + '…' : a}
                      </div>
                    ))}
                  </div>

                  {entry.drivers.length > 0 && (
                    <div style={{
                      marginTop: 'var(--space-2)',
                      paddingTop: 'var(--space-2)',
                      borderTop: '1px solid var(--border)',
                    }}>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 3 }}>
                        Driven by
                      </div>
                      {entry.drivers.map((d, i) => (
                        <div key={i} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 2 }}>
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
