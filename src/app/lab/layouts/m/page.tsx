'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant M — Focus / Reader
   One item at a time. Full-screen content view with prev/next navigation.
   Inspired by the "canvas area" — large central object, minimal chrome.
   Light background, generous whitespace. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutM() {
  const { content, outlooks, loading } = useBriefingData();
  const [index, setIndex] = useState(0);

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const item = content[index];
  if (!item) return null;

  const title = decode(item.analysis.display_title || item.title);
  const sc = sentimentColor[item.analysis.sentiment_overall] || '#888';

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, display: 'flex', flexDirection: 'column' }}>
      {/* Nav bar */}
      <header style={{ borderBottom: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: 0, position: 'sticky', top: 0, background: v.bg, zIndex: 10 }}>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}` }}>
          <strong>Howard</strong>
        </div>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button onClick={() => setIndex(Math.max(0, index - 1))} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: index === 0 ? v.lineLight : v.ink, padding: '0 8px' }}>&larr;</button>
          <span>{String(index + 1).padStart(2, '0')} / {String(content.length).padStart(2, '0')}</span>
          <button onClick={() => setIndex(Math.min(content.length - 1, index + 1))} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: index === content.length - 1 ? v.lineLight : v.ink, padding: '0 8px' }}>&rarr;</button>
        </div>
        <div style={{ padding: '1rem', fontFamily: v.mono, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.5 }}>
          {timeAgo(item.published_at)} · {item.source.name}
        </div>
      </header>

      {/* Main canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
        {/* Sentiment & source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem', fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc }} />
          <span style={{ opacity: 0.5 }}>{item.analysis.sentiment_overall}</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{ opacity: 0.5 }}>{item.source.name}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 400, textAlign: 'center', marginBottom: '2rem' }}>
          {title}
        </h1>

        {/* Summary */}
        <p style={{ fontSize: 16, lineHeight: 1.7, textAlign: 'center', maxWidth: '50ch', opacity: 0.7, marginBottom: '2rem' }}>
          {item.analysis.summary}
        </p>

        {/* Themes */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {item.analysis.themes.slice(0, 6).map((theme) => (
            <span key={theme} style={{ fontFamily: v.mono, fontSize: 10, padding: '4px 10px', border: `1px solid ${v.line}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{theme}</span>
          ))}
        </div>

        {/* Assets */}
        {item.analysis.assets_mentioned.length > 0 && (
          <div style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4, textTransform: 'uppercase' }}>
            Assets: {item.analysis.assets_mentioned.join(' · ')}
          </div>
        )}
      </div>

      {/* Bottom strip: outlook context */}
      <div style={{ borderTop: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: `repeat(${outlooks.length}, 1fr)` }}>
        {outlooks.map((o) => (
          <div key={o.id} style={{ padding: '0.75rem 1.5rem', borderRight: `1px solid ${v.lineLight}` }}>
            <div style={{ fontFamily: v.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>{horizonLabel[o.time_horizon]}</div>
            <div style={{ fontSize: 13, fontWeight: 400, marginTop: 2 }}>{o.title}</div>
            <div style={{ fontFamily: v.mono, fontSize: 10, color: sentimentColor[o.sentiment], marginTop: 2 }}>{o.sentiment} {o.confidence}%</div>
          </div>
        ))}
      </div>

      {/* Item strip at bottom */}
      <div style={{ borderTop: `1px solid ${v.line}`, display: 'flex', overflowX: 'auto' }}>
        {content.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setIndex(i)}
            style={{
              background: i === index ? v.ink : 'transparent',
              color: i === index ? v.bg : v.ink,
              border: 'none',
              borderRight: `1px solid ${v.lineLight}`,
              padding: '8px 16px',
              fontFamily: v.mono,
              fontSize: 10,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
              minWidth: 40,
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
