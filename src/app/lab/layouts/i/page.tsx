'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant I — Dense Ticker Board
   Full-screen data grid. No whitespace. Every pixel is information.
   Inspired by Bloomberg terminal / financial data walls.
   Light background, dark data. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c0bdb6',
  accent: '#FF4800',
  green: '#006600',
  red: '#990000',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutI() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING...</div>;

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.mono, fontSize: 11, lineHeight: 1.3 }}>
      {/* Top status strip */}
      <div style={{ borderBottom: `1px solid ${v.line}`, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <span>HOWARD INTELLIGENCE BOARD</span>
        <span>{content.length} ITEMS · {predictions.length} PREDICTIONS · {trending.length} THEMES</span>
        <span>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
      </div>

      {/* 4-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 280px', height: 'calc(100vh - 28px)' }}>

        {/* Col 1: Outlooks */}
        <div style={{ borderRight: `1px solid ${v.line}`, overflowY: 'auto' }}>
          <div style={{ padding: '4px 8px', borderBottom: `1px solid ${v.line}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, background: `${v.ink}08` }}>
            OUTLOOKS
          </div>
          {outlooks.map((o) => (
            <div key={o.id} style={{ padding: '8px', borderBottom: `1px solid ${v.lineLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase' }}>{horizonLabel[o.time_horizon]}</span>
                <span style={{ color: sentimentColor[o.sentiment] }}>{o.sentiment.toUpperCase()} {o.confidence}%</span>
              </div>
              <div style={{ fontSize: 12, color: v.ink, fontFamily: v.sans, fontWeight: 500 }}>{o.title}</div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{o.subtitle}</div>
              {o.positioning.slice(0, 2).map((pos, i) => (
                <div key={i} style={{ fontSize: 10, marginTop: 4, paddingLeft: 8, borderLeft: `2px solid ${v.lineLight}`, opacity: 0.6 }}>
                  {pos.length > 80 ? pos.slice(0, 80) + '...' : pos}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Col 2: Intelligence feed */}
        <div style={{ borderRight: `1px solid ${v.line}`, overflowY: 'auto' }}>
          <div style={{ padding: '4px 8px', borderBottom: `1px solid ${v.line}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, background: `${v.ink}08` }}>
            INTELLIGENCE FEED
          </div>
          {content.map((item, i) => (
            <div key={item.id} style={{ padding: '6px 8px', borderBottom: `1px solid ${v.lineLight}`, cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ opacity: 0.3, fontSize: 9 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                <span style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase' }}>{item.source.name}</span>
                <span style={{ fontSize: 9, opacity: 0.3, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.3 }}>{decode(item.analysis.display_title || item.title)}</div>
            </div>
          ))}
        </div>

        {/* Col 3: Predictions */}
        <div style={{ borderRight: `1px solid ${v.line}`, overflowY: 'auto' }}>
          <div style={{ padding: '4px 8px', borderBottom: `1px solid ${v.line}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, background: `${v.ink}08` }}>
            PREDICTIONS
          </div>
          {predictions.slice(0, 15).map((pred) => (
            <div key={pred.id} style={{ padding: '6px 8px', borderBottom: `1px solid ${v.lineLight}` }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: sentimentColor[pred.sentiment] }} />
                <span style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase' }}>{pred.confidence}</span>
                <span style={{ fontSize: 9, opacity: 0.3 }}>{pred.time_horizon}</span>
                {pred.assets_mentioned.slice(0, 2).map((a) => (
                  <span key={a} style={{ fontSize: 8, padding: '0 3px', border: `1px solid ${v.lineLight}`, textTransform: 'uppercase' }}>{a}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, lineHeight: 1.4 }}>{pred.claim.length > 100 ? pred.claim.slice(0, 100) + '...' : pred.claim}</div>
            </div>
          ))}
        </div>

        {/* Col 4: Trending */}
        <div style={{ overflowY: 'auto' }}>
          <div style={{ padding: '4px 8px', borderBottom: `1px solid ${v.line}`, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, background: `${v.ink}08` }}>
            THEMES
          </div>
          {trending.map((topic, i) => (
            <div key={topic.title} style={{ padding: '5px 8px', borderBottom: `1px solid ${v.lineLight}`, display: 'flex', justifyContent: 'space-between' }}>
              <span><span style={{ opacity: 0.3, marginRight: 6 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
              <span style={{ color: topic.trend === 'up' ? v.green : topic.trend === 'down' ? v.red : v.ink }}>{topic.mentions}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
