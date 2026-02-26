'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant S — Dashboard Grid
   Fixed-height panels arranged in a CSS grid.
   Each panel is a self-contained module. No scrolling — everything visible. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutS() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();

  if (loading) return <div style={{ height: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>Loading...</div>;

  return (
    <div style={{ height: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ height: 48, borderBottom: `1px solid ${g.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard Dashboard</span>
        <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {content.length} items · {predictions.length} predictions
        </span>
      </header>

      {/* Grid */}
      <div style={{
        flex: 1, display: 'grid', overflow: 'hidden',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: 'auto 1fr 1fr',
      }}>
        {/* Row 1: Outlooks (spans full width) */}
        {outlooks.map((o) => (
          <div key={o.id} style={{ borderBottom: `1px solid ${g.border}`, borderRight: `1px solid ${g.border}`, padding: '16px 20px', background: g.panel }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{horizonLabel[o.time_horizon]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                <span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted }}>{o.confidence}%</span>
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.3 }}>{o.title}</div>
            <div style={{ fontSize: 11, color: g.muted, marginTop: 4, lineHeight: 1.4 }}>
              {o.subtitle && o.subtitle.length > 80 ? o.subtitle.slice(0, 80) + '...' : o.subtitle}
            </div>
          </div>
        ))}

        {/* Row 2: Intelligence (2 cols) + Trending (1 col) */}
        <div style={{ gridColumn: 'span 2', borderRight: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 20px', borderBottom: `1px solid ${g.border}`, fontSize: 10, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            (1) Latest Intelligence
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {content.slice(0, 8).map((item, i) => (
              <div key={item.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${g.border}`, display: 'flex', gap: 12, alignItems: 'start', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = g.panel; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted, paddingTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{decode(item.analysis.display_title || item.title)}</div>
                  <div style={{ fontSize: 10, color: g.muted, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                    {item.source.name} · {timeAgo(item.published_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderBottom: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 20px', borderBottom: `1px solid ${g.border}`, fontSize: 10, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            (2) Trending Themes
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {trending.map((topic, i) => (
              <div key={topic.title} style={{ padding: '8px 20px', borderBottom: `1px solid ${g.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}><span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
                <span style={{ fontFamily: g.mono, fontSize: 11, color: topic.trend === 'up' ? '#22c55e' : topic.trend === 'down' ? '#ef4444' : g.muted }}>{topic.mentions}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Predictions (2 cols) + Stats (1 col) */}
        <div style={{ gridColumn: 'span 2', borderRight: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 20px', borderBottom: `1px solid ${g.border}`, fontSize: 10, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            (3) Recent Predictions
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {predictions.slice(0, 8).map((pred, i) => (
              <div key={pred.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${g.border}`, display: 'flex', gap: 12, alignItems: 'start' }}>
                <span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted, paddingTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[pred.sentiment], flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>{pred.claim.length > 100 ? pred.claim.slice(0, 100) + '...' : pred.claim}</div>
                  <div style={{ fontSize: 10, color: g.muted, fontFamily: g.mono, marginTop: 2 }}>{pred.confidence} · {pred.time_horizon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 20px', borderBottom: `1px solid ${g.border}`, fontSize: 10, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            (4) System
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <StatRow label="Intelligence Items" value={String(content.length)} />
            <StatRow label="Active Predictions" value={String(predictions.length)} />
            <StatRow label="Tracked Themes" value={String(trending.length)} />
            <StatRow label="Active Outlooks" value={String(outlooks.length)} />
            <StatRow label="Bullish Predictions" value={String(predictions.filter((p) => p.sentiment === 'bullish').length)} color="#22c55e" />
            <StatRow label="Bearish Predictions" value={String(predictions.filter((p) => p.sentiment === 'bearish').length)} color="#ef4444" />
            <div style={{ flex: 1 }} />
            <div style={{ padding: 20, borderTop: `1px solid ${g.border}`, fontSize: 10, color: g.muted, fontFamily: g.mono }}>
              SYSTEM: ONLINE<br />
              LAST SYNC: {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid #1F1F1F', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 18, fontFamily: '"Courier New", monospace', fontWeight: 400, color: color || '#FFFFFF' }}>{value}</span>
    </div>
  );
}
