'use client';

import { useState, useEffect } from 'react';

interface MeetingProbs {
  meeting_date: string;
  probabilities: Record<string, number>;
}

interface MeetingChange {
  meeting_date: string;
  date: string;
  probabilities: Record<string, number>;
}

interface FedWatchData {
  current: MeetingProbs[];
  changes: MeetingChange[];
  updated_at: string | null;
}

/** Parse rate range string "325-350" into basis points [325, 350] */
function parseRange(range: string): [number, number] {
  const [lo, hi] = range.split('-').map(Number);
  return [lo, hi];
}

/** Format range as percentage: "325-350" -> "3.25-3.50%" */
function rangeToPercent(range: string): string {
  const [lo, hi] = parseRange(range);
  return `${(lo / 100).toFixed(2)}-${(hi / 100).toFixed(2)}%`;
}

/** Format date as short: "2026-03-18" -> "Mar 18" */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Format date with year: "2026-03-18" -> "Mar 18, 2026" */
function fullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** Calculate implied rate cuts from current rate */
function impliedCuts(probs: Record<string, number>, currentRateHigh: number): number {
  let weightedRate = 0;
  for (const [range, prob] of Object.entries(probs)) {
    const [lo, hi] = parseRange(range);
    const midpoint = (lo + hi) / 2;
    weightedRate += midpoint * prob;
  }
  const diff = currentRateHigh - weightedRate;
  return Math.max(0, diff / 25); // Number of 25bp cuts
}

/** Get probability change between two snapshots */
function getProbChange(
  changes: MeetingChange[],
  meetingDate: string,
  range: string,
  currentProb: number,
): number | null {
  // Find the oldest snapshot for this meeting in the changes
  const meetingChanges = changes.filter((c) => c.meeting_date === meetingDate);
  if (meetingChanges.length < 2) return null;

  const oldest = meetingChanges[0];
  const oldProb = oldest.probabilities[range] || 0;
  const diff = currentProb - oldProb;
  return Math.abs(diff) > 0.005 ? diff : null;
}

/** Color for probability cell background — darker = more certain */
function probBg(prob: number, isHighest: boolean): string {
  if (isHighest && prob > 0.1) {
    // 50% → alpha 0.15 (light), 100% → alpha 0.45 (dark)
    const alpha = 0.02 + prob * 0.45;
    return `rgba(59, 130, 246, ${alpha})`;
  }
  if (prob > 0.5) return 'rgba(59, 130, 246, 0.06)';
  if (prob > 0.1) return 'rgba(255, 255, 255, 0.02)';
  return 'transparent';
}

const LOOKBACK_OPTIONS = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
] as const;

const LOOKBACK_LABELS: Record<string, string> = {
  '1d': '24 hours',
  '1w': '7 days',
  '1m': '30 days',
  '3m': '90 days',
};

export default function FedWatchPage() {
  const [data, setData] = useState<FedWatchData>({ current: [], changes: [], updated_at: null });
  const [loading, setLoading] = useState(true);
  const [lookback, setLookback] = useState('1w');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/fedwatch?lookback=${lookback}`)
      .then((res) => res.json())
      .then((d: FedWatchData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lookback]);

  // Determine all rate ranges across all meetings
  const allRanges = new Set<string>();
  for (const meeting of data.current) {
    for (const range of Object.keys(meeting.probabilities)) {
      allRanges.add(range);
    }
  }
  const sortedRanges = Array.from(allRanges).sort((a, b) => {
    return parseRange(a)[0] - parseRange(b)[0];
  });

  // Current rate — infer from the highest range with significant probability in the nearest meeting
  const currentRateHigh = (() => {
    if (data.current.length === 0) return 375;
    const nearest = data.current[0];
    let maxProb = 0;
    let maxRange = '350-375';
    for (const [range, prob] of Object.entries(nearest.probabilities)) {
      if (prob > maxProb) {
        maxProb = prob;
        maxRange = range;
      }
    }
    return parseRange(maxRange)[1];
  })();

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Fed Watch</span>
      </div>

      <div style={{ flex: 1, margin: 32, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Fed Watch</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
            FOMC meeting rate probabilities derived from Fed Funds futures. Tracks the market-implied path of monetary policy as a signal for liquidity conditions.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            {LOOKBACK_OPTIONS.map((opt) => {
              const active = lookback === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLookback(opt.value)}
                  className="mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${active ? '#fff' : 'var(--border)'}`,
                    background: active ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface)',
                    color: active ? '#fff' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : data.current.length === 0 ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 'var(--space-4) 0' }}>
              No FedWatch data yet. Data is fetched during the pipeline run (5am/5pm UTC).
            </div>
          ) : (
            <>
              {/* Implied Cuts Summary */}
              <div style={{
                marginBottom: 'var(--space-6)',
                padding: 'var(--space-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-panel)',
              }}>
                <div className="mono" style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  marginBottom: 'var(--space-3)',
                }}>
                  Implied Rate Cuts (25bp)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                  {data.current.map((meeting) => {
                    const cuts = impliedCuts(meeting.probabilities, currentRateHigh);
                    return (
                      <div key={meeting.meeting_date} style={{ minWidth: 80 }}>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {shortDate(meeting.meeting_date)}
                        </div>
                        <div className="mono" style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: cuts >= 1 ? '#22c55e' : cuts >= 0.5 ? '#3b82f6' : 'var(--text-primary)',
                        }}>
                          {cuts.toFixed(1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rate Probability Table */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    minWidth: sortedRanges.length * 80 + 120,
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'left',
                          borderBottom: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          fontWeight: 500,
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                        }}>
                          <span className="mono" style={{ fontSize: 10 }}>Meeting</span>
                        </th>
                        {sortedRanges.map((range) => (
                          <th key={range} style={{
                            padding: 'var(--space-3) var(--space-3)',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}>
                            <span className="mono" style={{ fontSize: 10 }}>
                              {rangeToPercent(range)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.current.map((meeting, idx) => {
                        // Find highest probability for this meeting
                        let maxProb = 0;
                        let maxRange = '';
                        for (const [range, prob] of Object.entries(meeting.probabilities)) {
                          if (prob > maxProb) {
                            maxProb = prob;
                            maxRange = range;
                          }
                        }

                        return (
                          <tr key={meeting.meeting_date}>
                            <td style={{
                              padding: 'var(--space-3) var(--space-4)',
                              borderBottom: idx < data.current.length - 1 ? '1px solid var(--border)' : 'none',
                              background: 'var(--bg-panel)',
                              position: 'sticky',
                              left: 0,
                              zIndex: 1,
                              whiteSpace: 'nowrap',
                            }}>
                              <div className="mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                                {shortDate(meeting.meeting_date)}
                              </div>
                              <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                {new Date(meeting.meeting_date + 'T12:00:00Z').getFullYear()}
                              </div>
                            </td>
                            {sortedRanges.map((range) => {
                              const prob = meeting.probabilities[range] || 0;
                              const isHighest = range === maxRange;
                              const change = getProbChange(data.changes, meeting.meeting_date, range, prob);

                              return (
                                <td key={range} style={{
                                  padding: 'var(--space-2) var(--space-3)',
                                  textAlign: 'center',
                                  borderBottom: idx < data.current.length - 1 ? '1px solid var(--border)' : 'none',
                                  background: probBg(prob, isHighest),
                                  transition: 'background 0.2s ease',
                                }}>
                                  {prob > 0.005 ? (
                                    <div>
                                      <div className="mono" style={{
                                        fontSize: 13,
                                        fontWeight: isHighest ? 600 : 400,
                                        color: isHighest
                                          ? '#3b82f6'
                                          : prob > 0.1
                                            ? 'var(--text-primary)'
                                            : 'var(--text-tertiary)',
                                      }}>
                                        {(prob * 100).toFixed(1)}%
                                      </div>
                                      {change !== null && (
                                        <div className="mono" style={{
                                          fontSize: 9,
                                          color: change > 0 ? '#22c55e' : '#ef4444',
                                          marginTop: 1,
                                        }}>
                                          {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', opacity: 0.3 }}>
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Most Likely Path Summary */}
              <div style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-panel)',
              }}>
                <div className="mono" style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  marginBottom: 'var(--space-3)',
                }}>
                  Most Likely Path
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {data.current.map((meeting, idx) => {
                    let maxProb = 0;
                    let maxRange = '';
                    for (const [range, prob] of Object.entries(meeting.probabilities)) {
                      if (prob > maxProb) {
                        maxProb = prob;
                        maxRange = range;
                      }
                    }

                    return (
                      <div key={meeting.meeting_date} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{
                          padding: 'var(--space-2) var(--space-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface)',
                        }}>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            {shortDate(meeting.meeting_date)}
                          </div>
                          <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
                            {rangeToPercent(maxRange)}
                          </div>
                          <div className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                            {(maxProb * 100).toFixed(0)}%
                          </div>
                        </div>
                        {idx < data.current.length - 1 && (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mono" style={{ marginTop: 'var(--space-4)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                {data.updated_at
                  ? `Last updated ${fullDate(data.updated_at.substring(0, 10))} — `
                  : ''}
                Probabilities from Fed Funds futures. Updated every pipeline run.
                {data.changes.length > 0 && ` Changes shown vs ${LOOKBACK_LABELS[lookback]} ago.`}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
