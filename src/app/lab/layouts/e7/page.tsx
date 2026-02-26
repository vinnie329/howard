'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E7 — Horizon Tabs
   Tabs are the three outlook time horizons: Short / Medium / Long.
   Each tab shows the outlook + relevant intelligence filtered by themes.
   Keeps the E brutalist data-row style throughout. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutE7() {
  const { content, outlooks, trending: _trending, predictions, loading } = useBriefingData();
  const [horizon, setHorizon] = useState<string>('medium');

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const activeOutlook = outlooks.find((o) => o.time_horizon === horizon) || outlooks[0];
  const horizonPreds = predictions.filter((p) => {
    const h = p.time_horizon.toLowerCase();
    if (horizon === 'short') return h.includes('near') || h.includes('month') || h.includes('week');
    if (horizon === 'long') return h.includes('year') || h.includes('decade') || h.includes('long');
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: '200px 1fr', position: 'sticky', top: 0, background: v.bg, zIndex: 100 }}>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}` }}>
          <strong>Howard</strong>
        </div>
        <div style={{ display: 'flex' }}>
          {outlooks.map((o) => (
            <button key={o.id} onClick={() => setHorizon(o.time_horizon)} style={{
              flex: 1, background: horizon === o.time_horizon ? v.ink : 'transparent',
              color: horizon === o.time_horizon ? v.bg : v.ink,
              border: 'none', borderRight: `1px solid ${v.line}`,
              padding: '1rem 1.5rem', cursor: 'pointer', fontFamily: v.sans, fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'background 0.2s, color 0.2s',
            }}
              onMouseEnter={(e) => { if (horizon !== o.time_horizon) e.currentTarget.style.background = `${v.ink}10`; }}
              onMouseLeave={(e) => { if (horizon !== o.time_horizon) e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{horizonLabel[o.time_horizon]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                <span style={{ fontFamily: v.mono, fontSize: 10 }}>{o.confidence}%</span>
              </div>
            </button>
          ))}
        </div>
      </header>

      {/* Outlook hero */}
      {activeOutlook && (
        <section style={{ borderBottom: `1px solid ${v.line}`, padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
          <div>
            <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, display: 'block', marginBottom: 12 }}>
              {horizonLabel[activeOutlook.time_horizon]} Outlook
            </span>
            <h1 style={{ fontSize: '5vw', lineHeight: 0.85, letterSpacing: '-0.04em', fontWeight: 400, marginBottom: 16 }}>
              {activeOutlook.title}
            </h1>
            <p style={{ maxWidth: '45ch', lineHeight: 1.6, opacity: 0.6 }}>{activeOutlook.subtitle}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 8 }}>Positioning</span>
            {activeOutlook.positioning.slice(0, 5).map((pos, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6 }}>
                <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.4, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                {pos.length > 120 ? pos.slice(0, 120) + '...' : pos}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related predictions */}
      <div style={{ padding: '8px 2rem', borderBottom: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.4, position: 'sticky', top: 55, background: v.bg, zIndex: 90 }}>
        Related Predictions · {horizonPreds.length}
      </div>
      {horizonPreds.slice(0, 8).map((pred, i) => (
        <div key={pred.id} style={{
          padding: '12px 2rem', borderBottom: `1px solid ${v.line}`, display: 'flex', gap: 12, alignItems: 'start',
          cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
        >
          <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3, paddingTop: 3 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[pred.sentiment], flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim}</div>
            <div style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4, marginTop: 3 }}>{pred.confidence} · {pred.time_horizon}</div>
          </div>
        </div>
      ))}

      {/* Intelligence rows */}
      <div style={{ padding: '8px 2rem', borderBottom: `1px solid ${v.line}`, borderTop: `2px solid ${v.ink}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.4, position: 'sticky', top: 55, background: v.bg, zIndex: 90 }}>
        Intelligence Feed · {content.length}
      </div>
      {content.map((item, i) => {
        const title = decode(item.analysis.display_title || item.title);
        return (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr',
            padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
            cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
          >
            <span style={{ fontFamily: v.mono, fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>{title}</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>{item.source.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
              <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase' }}>{item.analysis.sentiment_overall}</span>
              <span style={{ fontFamily: v.mono, fontSize: 11, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
