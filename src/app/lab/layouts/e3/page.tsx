'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E3 — Vertical Side Tabs
   Tabs run vertically on the left edge as a narrow rail.
   Content fills the rest. Hero becomes contextual per tab. */

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

const tabDefs: { id: Tab; label: string; short: string }[] = [
  { id: 'feed', label: 'Intelligence Feed', short: 'FD' },
  { id: 'outlook', label: 'Outlooks', short: 'OL' },
  { id: 'predictions', label: 'Predictions', short: 'PR' },
  { id: 'themes', label: 'Trending Themes', short: 'TH' },
];

export default function LayoutE3() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3, display: 'flex' }}>
      {/* Vertical tab rail */}
      <nav style={{ width: 56, borderRight: `1px solid ${v.line}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '16px 0', textAlign: 'center', borderBottom: `1px solid ${v.line}`, fontWeight: 700, fontSize: 14 }}>H</div>
        {tabDefs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? v.ink : 'transparent',
            color: tab === t.id ? v.bg : v.ink,
            border: 'none', borderBottom: `1px solid ${v.line}`,
            padding: '20px 0', fontFamily: v.mono, fontSize: 10, cursor: 'pointer',
            letterSpacing: '0.1em', transition: 'background 0.2s, color 0.2s',
            writingMode: 'vertical-lr', textTransform: 'uppercase',
          }}
            onMouseEnter={(e) => { if (tab !== t.id) { e.currentTarget.style.background = `${v.ink}10`; } }}
            onMouseLeave={(e) => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; } }}
          >
            {t.short}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 0', textAlign: 'center', borderTop: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 9, opacity: 0.4, writingMode: 'vertical-lr' }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1 }}>
        {/* Context header */}
        <div style={{ borderBottom: `1px solid ${v.line}`, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 24, fontWeight: 400, letterSpacing: '-0.02em' }}>
            {tabDefs.find((t) => t.id === tab)?.label}
          </h2>
          <div style={{ display: 'flex', gap: 16 }}>
            {outlooks.map((o) => (
              <span key={o.id} style={{ fontFamily: v.mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                {horizonLabel[o.time_horizon].slice(0, 1)} {o.confidence}%
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading...</div>
        ) : (
          <>
            {tab === 'feed' && content.map((item, i) => {
              const title = decode(item.analysis.display_title || item.title);
              return (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr auto',
                  padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
                  cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
                >
                  <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div style={{ fontSize: 14, lineHeight: 1.4 }}>{title}</div>
                    <div style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, marginTop: 2 }}>{item.source.name} · {timeAgo(item.published_at)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                    <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase' }}>{item.analysis.sentiment_overall}</span>
                  </div>
                </div>
              );
            })}

            {tab === 'outlook' && outlooks.map((o) => (
              <div key={o.id} style={{ borderBottom: `1px solid ${v.line}`, padding: '2rem' }}>
                <div style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: 8 }}>{horizonLabel[o.time_horizon]} · {o.sentiment} · {o.confidence}%</div>
                <h3 style={{ fontSize: '3vw', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.9, marginBottom: 16 }}>{o.title}</h3>
                <p style={{ opacity: 0.6, lineHeight: 1.6, maxWidth: '55ch' }}>{o.subtitle}</p>
              </div>
            ))}

            {tab === 'predictions' && predictions.map((pred, i) => (
              <div key={pred.id} style={{
                padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: '40px 6px 1fr auto', gap: 12, alignItems: 'start',
                cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
              >
                <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[pred.sentiment], marginTop: 5 }} />
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim.length > 120 ? pred.claim.slice(0, 120) + '...' : pred.claim}</div>
                <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, whiteSpace: 'nowrap' }}>{pred.confidence} · {pred.time_horizon}</span>
              </div>
            ))}

            {tab === 'themes' && trending.map((topic, i) => (
              <div key={topic.title} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`,
                cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
              >
                <span><span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.3, marginRight: 12 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
                <span style={{ fontFamily: v.mono, fontSize: 14, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>{topic.mentions}</span>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
