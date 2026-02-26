'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E4 — Bottom Tab Bar
   Tabs at the bottom of the viewport like a mobile app bar.
   Full-height scrollable content above. Hero stays. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

type Tab = 'feed' | 'outlook' | 'predictions' | 'themes';

export default function LayoutE4() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('feed');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'feed', label: 'Feed', icon: '⋮' },
    { id: 'outlook', label: 'Outlook', icon: '◎' },
    { id: 'predictions', label: 'Claims', icon: '→' },
    { id: 'themes', label: 'Themes', icon: '#' },
  ];

  return (
    <div style={{ height: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
        <strong>Howard</strong>
        <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.5 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </header>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading...</div>
        ) : (
          <>
            {tab === 'feed' && (
              <>
                {/* Mini outlook banner */}
                <div style={{ borderBottom: `1px solid ${v.line}`, padding: '2rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
                  <h1 style={{ fontSize: '4vw', lineHeight: 0.85, letterSpacing: '-0.04em', fontWeight: 400 }}>{outlooks[0]?.title}</h1>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
                    {outlooks.map((o) => (
                      <span key={o.id} style={{ fontFamily: v.mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                        {horizonLabel[o.time_horizon]} {o.confidence}%
                      </span>
                    ))}
                  </div>
                </div>
                {content.map((item, i) => {
                  const title = decode(item.analysis.display_title || item.title);
                  return (
                    <div key={item.id} style={{
                      display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12,
                      padding: '12px 2rem', borderBottom: `1px solid ${v.line}`, alignItems: 'start',
                      cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
                    >
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div style={{ fontSize: 13, lineHeight: 1.4 }}>{title}</div>
                        <div style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, marginTop: 2 }}>{item.source.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                        <span style={{ fontFamily: v.mono, fontSize: 10 }}>{timeAgo(item.published_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'outlook' && outlooks.map((o) => (
              <div key={o.id} style={{ borderBottom: `1px solid ${v.line}`, padding: '2.5rem 2rem' }}>
                <div style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 12 }}>
                  {horizonLabel[o.time_horizon]} · {o.sentiment} · {o.confidence}%
                </div>
                <h2 style={{ fontSize: '4vw', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 0.9, marginBottom: 16 }}>{o.title}</h2>
                <p style={{ opacity: 0.6, lineHeight: 1.6, maxWidth: '50ch', marginBottom: 24 }}>{o.subtitle}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {o.positioning.slice(0, 4).map((pos, i) => (
                    <div key={i} style={{ padding: '12px 16px', border: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6 }}>
                      <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.4, display: 'block', marginBottom: 4 }}>{String(i + 1).padStart(2, '0')}</span>
                      {pos.length > 100 ? pos.slice(0, 100) + '...' : pos}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {tab === 'predictions' && predictions.map((pred, i) => (
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

            {tab === 'themes' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {trending.map((topic, i) => (
                  <div key={topic.title} style={{
                    border: `1px solid ${v.line}`, padding: '1.5rem', cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
                  >
                    <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ fontSize: 13, marginTop: 6 }}>{topic.title}</div>
                    <div style={{ fontFamily: v.mono, fontSize: 22, marginTop: 6, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>
                      {topic.mentions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav style={{ borderTop: `1px solid ${v.line}`, display: 'flex', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: tab === t.id ? v.ink : 'transparent',
            color: tab === t.id ? v.bg : v.ink,
            border: 'none', borderRight: `1px solid ${v.line}`,
            padding: '14px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, transition: 'background 0.2s, color 0.2s',
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontFamily: v.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
