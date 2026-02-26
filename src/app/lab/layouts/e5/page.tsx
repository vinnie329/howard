'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E5 — Segmented Control + Split
   Compact segmented control in the header. Content area splits into
   main + sidebar, sidebar shows context relevant to current tab. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

type Tab = 'feed' | 'outlook' | 'predictions' | 'themes';

export default function LayoutE5() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('feed');

  const tabs: Tab[] = ['feed', 'outlook', 'predictions', 'themes'];

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '12px 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: v.bg, zIndex: 100 }}>
        <strong>Howard</strong>
        {/* Segmented control */}
        <div style={{ display: 'flex', border: `1px solid ${v.ink}` }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? v.ink : 'transparent',
              color: tab === t ? v.bg : v.ink,
              border: 'none', borderRight: `1px solid ${v.ink}`,
              padding: '6px 16px', fontFamily: v.mono, fontSize: 10, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {t}
            </button>
          ))}
        </div>
        <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </header>

      {loading ? (
        <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px' }}>
          {/* Main */}
          <div style={{ borderRight: `1px solid ${v.line}` }}>
            {tab === 'feed' && (
              <>
                {/* Hero */}
                <div style={{ borderBottom: `1px solid ${v.line}`, padding: '2.5rem 2rem' }}>
                  <h1 style={{ fontSize: '4vw', lineHeight: 0.85, letterSpacing: '-0.04em', fontWeight: 400 }}>{outlooks[0]?.title}</h1>
                  <p style={{ marginTop: 16, maxWidth: '45ch', lineHeight: 1.5, opacity: 0.6 }}>{outlooks[0]?.subtitle}</p>
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
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div style={{ fontSize: 13, lineHeight: 1.4 }}>{title}</div>
                        <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5 }}>{item.source.name}</span>
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
              <div key={o.id} style={{ borderBottom: `1px solid ${v.line}`, padding: '2rem' }}>
                <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>{horizonLabel[o.time_horizon]}</span>
                <h2 style={{ fontSize: '3.5vw', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 0.9, marginTop: 8, marginBottom: 16 }}>{o.title}</h2>
                <p style={{ opacity: 0.6, lineHeight: 1.6, maxWidth: '55ch', marginBottom: 20 }}>{o.subtitle}</p>
                {o.positioning.slice(0, 5).map((pos, i) => (
                  <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6 }}>
                    <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.4, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                    {pos.length > 140 ? pos.slice(0, 140) + '...' : pos}
                  </div>
                ))}
              </div>
            ))}

            {tab === 'predictions' && predictions.map((pred, i) => (
              <div key={pred.id} style={{
                padding: '12px 2rem', borderBottom: `1px solid ${v.line}`, display: 'flex', gap: 12,
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
                padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
              >
                <span><span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3, marginRight: 12 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
                <span style={{ fontFamily: v.mono, fontSize: 14, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>{topic.mentions}</span>
              </div>
            ))}
          </div>

          {/* Sidebar — context changes per tab */}
          <aside style={{ position: 'sticky', top: 50, height: 'calc(100vh - 50px)', overflowY: 'auto', padding: '1.5rem' }}>
            {tab === 'feed' && (
              <>
                <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>Trending</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 12 }}>
                  {trending.slice(0, 8).map((topic, i) => (
                    <div key={topic.title} style={{ padding: '6px 0', borderBottom: `1px solid ${v.lineLight}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span><span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.3, marginRight: 6 }}>{String(i + 1).padStart(2, '0')}</span>{topic.title}</span>
                      <span style={{ fontFamily: v.mono, fontSize: 10, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>{topic.mentions}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === 'outlook' && (
              <>
                <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>Sentiment Summary</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  {outlooks.map((o) => (
                    <div key={o.id} style={{ borderBottom: `1px solid ${v.lineLight}`, paddingBottom: 12 }}>
                      <div style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{horizonLabel[o.time_horizon]}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 24, fontWeight: 300 }}>{o.confidence}%</span>
                        <span style={{ fontFamily: v.mono, fontSize: 11, color: sentimentColor[o.sentiment], alignSelf: 'flex-end' }}>{o.sentiment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === 'predictions' && (
              <>
                <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>Breakdown</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  {['bullish', 'bearish', 'mixed', 'neutral'].map((s) => {
                    const count = predictions.filter((p) => p.sentiment === s).length;
                    return (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[s] }} />
                          <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase' }}>{s}</span>
                        </div>
                        <span style={{ fontFamily: v.mono, fontSize: 18 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {tab === 'themes' && (
              <>
                <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>Latest Intelligence</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 12 }}>
                  {content.slice(0, 6).map((item) => (
                    <div key={item.id} style={{ padding: '8px 0', borderBottom: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.4 }}>
                      {decode(item.analysis.display_title || item.title)}
                      <div style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.4, marginTop: 2 }}>{item.source.name}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
