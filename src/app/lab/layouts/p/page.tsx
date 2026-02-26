'use client';

import { useState } from 'react';
import { useBriefingData, sentimentColor } from '../../briefings/_shared';

/* Variant P — Predictions Tracker
   Two-panel: scrollable prediction list + detail inspector.
   Focus on tracking claims, confidence, timelines. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutP() {
  const { predictions, loading } = useBriefingData();
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);

  if (loading) return <div style={{ minHeight: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const filtered = filter ? predictions.filter((p) => p.sentiment === filter) : predictions;
  const pred = filtered[selected] || filtered[0];

  const sentiments = ['bullish', 'bearish', 'mixed', 'neutral'];

  return (
    <div style={{ height: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ height: 60, borderBottom: `1px solid ${g.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prediction Tracker</span>
        <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{predictions.length} CLAIMS</span>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 420px', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left: list */}
        <section style={{ background: g.panel, borderRight: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filters */}
          <div style={{ padding: '12px 24px', borderBottom: `1px solid ${g.border}`, display: 'flex', gap: 8 }}>
            <FilterBtn label="All" active={filter === null} onClick={() => { setFilter(null); setSelected(0); }} />
            {sentiments.map((s) => (
              <FilterBtn key={s} label={s} active={filter === s} onClick={() => { setFilter(s); setSelected(0); }} color={sentimentColor[s]} />
            ))}
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 60px', padding: '8px 24px', borderBottom: `1px solid ${g.border}`, fontSize: 11, color: g.muted, textTransform: 'uppercase' }}>
            <div>#</div>
            <div>Claim</div>
            <div>Confidence</div>
            <div>Horizon</div>
            <div style={{ textAlign: 'right' }}>Sent.</div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map((p, i) => (
              <div key={p.id} onClick={() => setSelected(i)} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 60px',
                padding: '14px 24px', borderBottom: `1px solid ${g.border}`, alignItems: 'baseline',
                cursor: 'pointer', background: selected === i ? '#1a1a1a' : 'transparent',
                transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => { if (selected !== i) e.currentTarget.style.background = g.bg; }}
                onMouseLeave={(e) => { if (selected !== i) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16 }}>
                  {p.claim.length > 80 ? p.claim.slice(0, 80) + '...' : p.claim}
                </span>
                <span style={{ fontSize: 11, color: g.muted, fontFamily: g.mono }}>{p.confidence}</span>
                <span style={{ fontSize: 11, color: g.muted }}>{p.time_horizon}</span>
                <span style={{ textAlign: 'right' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[p.sentiment], display: 'inline-block' }} />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Right: inspector */}
        <aside style={{ background: g.bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {pred && (
            <>
              <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sentimentColor[pred.sentiment] }} />
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase' }}>{pred.sentiment} · {pred.confidence}</span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.4 }}>{pred.claim}</h1>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${g.border}` }}>
                <MetricCell label="Time Horizon" value={pred.time_horizon} />
                <MetricCell label="Confidence" value={pred.confidence} />
                <MetricCell label="Specificity" value={pred.specificity} />
                <MetricCell label="Sentiment" value={pred.sentiment} color={sentimentColor[pred.sentiment]} />
              </div>

              {/* Themes */}
              {pred.themes.length > 0 && (
                <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Themes</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {pred.themes.map((theme) => (
                      <span key={theme} style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${g.border}`, color: g.muted }}>{theme}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assets */}
              {pred.assets_mentioned.length > 0 && (
                <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assets</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 12, border: `1px solid ${g.border}` }}>
                    {pred.assets_mentioned.map((asset) => (
                      <div key={asset} style={{
                        padding: 12, borderRight: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`,
                        fontSize: 12, fontFamily: g.mono, textAlign: 'center', color: g.muted,
                        cursor: 'pointer', transition: 'color 0.2s, background 0.2s',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = g.text; e.currentTarget.style.background = g.panel; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = g.muted; e.currentTarget.style.background = 'transparent'; }}
                      >
                        {asset}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {pred.notes && (
                <div style={{ padding: 24 }}>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</span>
                  <p style={{ color: g.muted, fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{pred.notes}</p>
                </div>
              )}
            </>
          )}
        </aside>
      </main>

      <footer style={{ height: 40, borderTop: `1px solid ${g.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontSize: 11, color: g.muted, flexShrink: 0 }}>
        <span>→ tracking {predictions.length} predictions</span>
        <span style={{ fontFamily: g.mono }}>HOWARD PREDICTIONS</span>
      </footer>
    </div>
  );
}

function FilterBtn({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#1a1a1a' : 'transparent',
      border: `1px solid ${active ? '#333' : '#1F1F1F'}`,
      color: color || (active ? '#FFFFFF' : '#6B7280'),
      padding: '4px 12px', fontSize: 11, fontFamily: '"Helvetica Neue", sans-serif',
      cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
    }}>
      {label}
    </button>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid #1F1F1F', borderRight: '1px solid #1F1F1F' }}>
      <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 400, color: color || '#FFFFFF' }}>{value}</div>
    </div>
  );
}
