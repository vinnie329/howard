'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant J — Split Thesis
   Two massive panels: left = thesis (outlooks), right = evidence (intelligence).
   Large type, minimal chrome, high contrast. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  dark: '#0e0e0e',
  light: '#f5f4f1',
  line: '#141414',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutJ() {
  const { content, outlooks, trending, predictions: _predictions, loading } = useBriefingData();
  const [activeHorizon, setActiveHorizon] = useState<string>('medium');

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const activeOutlook = outlooks.find((o) => o.time_horizon === activeHorizon) || outlooks[0];

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', fontFamily: v.sans }}>
      {/* LEFT: Thesis — dark */}
      <div style={{ background: v.dark, color: v.light, padding: '2rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Horizon tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', borderBottom: `1px solid #333` }}>
          {outlooks.map((o) => (
            <button
              key={o.id}
              onClick={() => setActiveHorizon(o.time_horizon)}
              style={{
                background: activeHorizon === o.time_horizon ? '#222' : 'transparent',
                color: activeHorizon === o.time_horizon ? v.light : '#666',
                border: 'none',
                padding: '8px 16px',
                fontFamily: v.mono,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                borderBottom: activeHorizon === o.time_horizon ? `1px solid ${v.accent}` : '1px solid transparent',
              }}
            >
              {horizonLabel[o.time_horizon]}
            </button>
          ))}
        </div>

        {activeOutlook && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: sentimentColor[activeOutlook.sentiment] }} />
              <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', color: '#888' }}>
                {activeOutlook.sentiment} · {activeOutlook.confidence}%
              </span>
            </div>
            <h1 style={{ fontSize: '3.5vw', lineHeight: 0.9, letterSpacing: '-0.04em', fontWeight: 400, marginBottom: '1.5rem' }}>
              {activeOutlook.title}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#aaa', marginBottom: '2rem', maxWidth: '45ch' }}>
              {activeOutlook.subtitle}
            </p>

            {/* Positioning */}
            <div style={{ fontFamily: v.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '0.75rem' }}>
              Positioning
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflowY: 'auto' }}>
              {activeOutlook.positioning.slice(0, 6).map((pos, i) => (
                <div key={i} style={{ padding: '10px 0', borderTop: '1px solid #222', fontSize: 12, lineHeight: 1.5, color: '#bbb' }}>
                  <span style={{ color: '#555', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                  {pos.length > 150 ? pos.slice(0, 150) + '...' : pos}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Evidence — light */}
      <div style={{ background: v.bg, color: v.ink, minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${v.line}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'sticky', top: 0, background: v.bg, zIndex: 10 }}>
          <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>Supporting Evidence</span>
          <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3 }}>{content.length} items</span>
        </div>

        {/* Intelligence rows */}
        {content.map((item, i) => {
          const title = decode(item.analysis.display_title || item.title);
          const sc = sentimentColor[item.analysis.sentiment_overall] || '#888';
          return (
            <div key={item.id} style={{
              padding: '0.75rem 2rem',
              borderBottom: `1px solid ${v.line}`,
              display: 'grid',
              gridTemplateColumns: '28px 1fr',
              gap: 8,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
            >
              <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc }} />
                  <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.5, textTransform: 'uppercase' }}>{item.source.name}</span>
                  <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.3, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{title}</div>
                {item.analysis.themes.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {item.analysis.themes.slice(0, 3).map((theme) => (
                      <span key={theme} style={{ fontFamily: v.mono, fontSize: 9, padding: '1px 5px', border: `1px solid ${v.lineLight}`, textTransform: 'uppercase' }}>{theme}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Trending bar */}
        <div style={{ borderTop: `2px solid ${v.ink}`, padding: '1rem 2rem' }}>
          <div style={{ fontFamily: v.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '0.5rem' }}>Trending</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {trending.slice(0, 8).map((topic) => (
              <span key={topic.title} style={{ fontFamily: v.mono, fontSize: 10 }}>
                {topic.title} <span style={{ color: topic.trend === 'up' ? '#006600' : topic.trend === 'down' ? '#990000' : v.ink, opacity: 0.6 }}>{topic.mentions}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
