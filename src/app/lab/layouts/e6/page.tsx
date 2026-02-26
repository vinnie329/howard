'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E6 — Full-Width Section Tabs
   Each section of the original E layout becomes a tab.
   Tabs span full width as a bordered row. No hero — clean transition. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

type Tab = 'overview' | 'feed' | 'predictions' | 'themes';

export default function LayoutE6() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'feed', label: 'Intelligence' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'themes', label: 'Themes' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'sticky', top: 0, background: v.bg, zIndex: 100 }}>
        <div><strong>Howard</strong> <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4, marginLeft: 8 }}>Intelligence System</span></div>
        <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>
          {content.length} items · {predictions.length} predictions · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </header>

      {/* Tab row — each tab is a bordered equal cell */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, borderBottom: `1px solid ${v.line}`, position: 'sticky', top: 53, background: v.bg, zIndex: 90 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? v.ink : 'transparent',
            color: tab === t.id ? v.bg : v.ink,
            border: 'none', borderRight: `1px solid ${v.line}`,
            padding: '14px 24px', fontFamily: v.sans, fontSize: 13, cursor: 'pointer',
            textAlign: 'left', transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={(e) => { if (tab !== t.id) { e.currentTarget.style.background = `${v.ink}10`; } }}
            onMouseLeave={(e) => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; } }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading...</div>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              {/* Hero */}
              <section style={{ borderBottom: `1px solid ${v.line}`, padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
                <div>
                  <h1 style={{ fontSize: '6vw', lineHeight: 0.85, letterSpacing: '-0.04em', fontWeight: 400, marginBottom: 24 }}>
                    {outlooks[0]?.title}
                  </h1>
                  <p style={{ maxWidth: '45ch', lineHeight: 1.6, opacity: 0.6 }}>{outlooks[0]?.subtitle}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end' }}>
                  {outlooks.map((o) => (
                    <div key={o.id} style={{ borderTop: `1px solid ${v.line}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{horizonLabel[o.time_horizon]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                        <span style={{ fontFamily: v.mono, fontSize: 11 }}>{o.sentiment} {o.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              {/* Quick feed + themes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ borderRight: `1px solid ${v.line}` }}>
                  <div style={{ padding: '8px 2rem', borderBottom: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', opacity: 0.4 }}>Latest</div>
                  {content.slice(0, 5).map((item, i) => (
                    <div key={item.id} style={{ padding: '10px 2rem', borderBottom: `1px solid ${v.lineLight}`, display: 'flex', gap: 10, alignItems: 'start', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
                    >
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{decode(item.analysis.display_title || item.title)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ padding: '8px 2rem', borderBottom: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', opacity: 0.4 }}>Trending</div>
                  {trending.slice(0, 5).map((topic, i) => (
                    <div key={topic.title} style={{ padding: '10px 2rem', borderBottom: `1px solid ${v.lineLight}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span><span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
                      <span style={{ fontFamily: v.mono, fontSize: 11, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>{topic.mentions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'feed' && content.map((item, i) => {
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

          {tab === 'predictions' && predictions.map((pred, i) => (
            <div key={pred.id} style={{
              padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, display: 'flex', gap: 12,
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

          {tab === 'themes' && trending.map((topic, i) => (
            <div key={topic.title} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr auto',
              padding: '1.25rem 2rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
              cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
            >
              <span style={{ fontFamily: v.mono, fontSize: 28, fontWeight: 300, opacity: 0.15 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 16 }}>{topic.title}</span>
              <span style={{ fontFamily: v.mono, fontSize: 16, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>{topic.mentions}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
