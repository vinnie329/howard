'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E2 — Underline Pill Tabs
   Tabs sit between hero and content as a full-width bar.
   Each tab is a pill with count. Hero collapses to a thin strip
   showing just the outlook title + sentiment. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

type Tab = 'feed' | 'outlook' | 'predictions' | 'themes';

export default function LayoutE2() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('feed');

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'feed', label: 'Feed', count: content.length },
    { id: 'outlook', label: 'Outlook', count: outlooks.length },
    { id: 'predictions', label: 'Predictions', count: predictions.length },
    { id: 'themes', label: 'Themes', count: trending.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Compact header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'sticky', top: 0, background: v.bg, zIndex: 100 }}>
        <div>
          <strong>Howard</strong>
          <span style={{ fontFamily: v.mono, fontSize: 11, marginLeft: 12, opacity: 0.5 }}>Intelligence</span>
        </div>
        <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.5 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </header>

      {/* Outlook strip */}
      <div style={{ borderBottom: `1px solid ${v.line}`, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: '3vw', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 400 }}>
          {outlooks[0]?.title || 'Loading'}
        </h1>
        <div style={{ display: 'flex', gap: 24 }}>
          {outlooks.map((o) => (
            <span key={o.id} style={{ fontFamily: v.mono, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
              {horizonLabel[o.time_horizon]} {o.confidence}%
            </span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: `1px solid ${v.line}`, padding: '0 2rem', display: 'flex', gap: 0, position: 'sticky', top: 55, background: v.bg, zIndex: 90 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? v.ink : 'transparent',
            color: tab === t.id ? v.bg : v.ink,
            border: 'none', borderRight: `1px solid ${v.line}`,
            padding: '12px 24px', fontFamily: v.sans, fontSize: 13, cursor: 'pointer',
            display: 'flex', gap: 8, alignItems: 'baseline',
            transition: 'background 0.2s, color 0.2s',
          }}>
            <span>{t.label}</span>
            <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading...</div>
      ) : (
        <>
          {tab === 'feed' && content.map((item, i) => {
            const title = decode(item.analysis.display_title || item.title);
            const sc = sentimentColor[item.analysis.sentiment_overall] || '#666';
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
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />
                  <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase' }}>{item.analysis.sentiment_overall}</span>
                  <span style={{ fontFamily: v.mono, fontSize: 11, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
                </div>
              </div>
            );
          })}

          {tab === 'outlook' && outlooks.map((o) => (
            <section key={o.id} style={{ borderBottom: `1px solid ${v.line}` }}>
              <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>{horizonLabel[o.time_horizon]}</span>
                  <h2 style={{ fontSize: 32, fontWeight: 400, letterSpacing: '-0.03em', marginTop: 8, lineHeight: 1 }}>{o.title}</h2>
                  <p style={{ marginTop: 12, opacity: 0.6, lineHeight: 1.6, maxWidth: '45ch' }}>{o.subtitle}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {o.positioning.slice(0, 4).map((pos, i) => (
                    <div key={i} style={{ padding: '10px 0', borderTop: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6 }}>
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                      {pos.length > 120 ? pos.slice(0, 120) + '...' : pos}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}

          {tab === 'predictions' && predictions.map((pred, i) => (
            <div key={pred.id} style={{
              padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, display: 'flex', gap: 16,
              cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
            >
              <span style={{ fontFamily: v.mono, fontSize: 12, opacity: 0.3, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[pred.sentiment], flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim}</div>
                <div style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, marginTop: 4 }}>{pred.confidence} · {pred.time_horizon} · {pred.specificity}</div>
              </div>
            </div>
          ))}

          {tab === 'themes' && trending.map((topic, i) => (
            <div key={topic.title} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr auto',
              padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
              cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
            >
              <span style={{ fontFamily: v.mono, fontSize: 28, fontWeight: 300, opacity: 0.2 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 16 }}>{topic.title}</span>
              <span style={{ fontFamily: v.mono, fontSize: 14, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>{topic.mentions}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
