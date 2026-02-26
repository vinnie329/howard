'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant G — Terminal
   Full dark, monospace-only, no rounded corners, sharp grid lines,
   data-table driven, command-line aesthetic. */

const v = {
  bg: '#0c0c0c',
  surface: '#111',
  ink: '#b0b0b0',
  bright: '#e0e0e0',
  line: '#222',
  accent: '#FF4800',
  green: '#22c55e',
  red: '#ef4444',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutG() {
  const { content, outlooks, trending, loading } = useBriefingData();

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.mono, fontSize: 12, lineHeight: 1.4 }}>
      {/* Status bar */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span>HOWARD v1.0 — Intelligence Terminal</span>
        <span>STATUS: <span style={{ color: v.green }}>ONLINE</span> · ITEMS: {content.length} · OUTLOOKS: {outlooks.length}</span>
      </header>

      {/* Outlook block */}
      <section style={{ borderBottom: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: `repeat(${Math.max(outlooks.length, 1)}, 1fr)` }}>
        {outlooks.map((o) => {
          const sc = sentimentColor[o.sentiment] || v.ink;
          return (
            <div key={o.id} style={{ padding: '16px', borderRight: `1px solid ${v.line}` }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, marginBottom: 8 }}>
                {horizonLabel[o.time_horizon]}
              </div>
              <div style={{ fontSize: 14, color: v.bright, marginBottom: 4 }}>{o.title}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: sc }}>{o.sentiment.toUpperCase()}</span>
                <span>{o.confidence}%</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px' }}>
        {/* Feed */}
        <div>
          <div style={{ padding: '6px 16px', borderBottom: `1px solid ${v.line}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>
            ── CAPTURED INTELLIGENCE ──
          </div>
          {loading ? (
            <div style={{ padding: 16, opacity: 0.5 }}>Loading...</div>
          ) : (
            content.map((item, i) => {
              const title = decode(item.analysis.display_title || item.title);
              const sc = sentimentColor[item.analysis.sentiment_overall] || v.ink;
              return (
                <div key={item.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = v.surface; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ opacity: 0.3, fontSize: 10, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ color: sc, fontSize: 10 }}>●</span>
                      <span style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase' }}>{item.source.name}</span>
                      <span style={{ fontSize: 10, opacity: 0.3, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
                    </div>
                    <div style={{ color: v.bright, fontSize: 12 }}>{title}</div>
                    {item.analysis.assets_mentioned.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 10, opacity: 0.4 }}>
                        ASSETS: {item.analysis.assets_mentioned.slice(0, 5).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right rail */}
        <div style={{ borderLeft: `1px solid ${v.line}` }}>
          <div style={{ padding: '6px 16px', borderBottom: `1px solid ${v.line}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>
            ── TRENDING ──
          </div>
          {trending.slice(0, 10).map((topic, i) => (
            <div key={topic.title} style={{ padding: '6px 16px', borderBottom: `1px solid ${v.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span><span style={{ opacity: 0.3, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
              <span style={{ color: topic.trend === 'up' ? v.green : topic.trend === 'down' ? v.red : v.ink }}>{topic.mentions}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
