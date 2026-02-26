'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E1 — Header Tabs
   Tabs sit in the 4-column header grid, replacing stats.
   Active tab underlined. Content swaps below the hero. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

type Tab = 'intelligence' | 'outlooks' | 'predictions' | 'themes';

export default function LayoutE1() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('intelligence');

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'intelligence', label: 'Intelligence', count: content.length },
    { id: 'outlooks', label: 'Outlooks', count: outlooks.length },
    { id: 'predictions', label: 'Predictions', count: predictions.length },
    { id: 'themes', label: 'Themes', count: trending.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Header with tabs */}
      <header style={{
        display: 'grid', gridTemplateColumns: '200px 1fr',
        borderBottom: `1px solid ${v.line}`, position: 'sticky', top: 0, background: v.bg, zIndex: 100,
      }}>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}` }}>
          <strong>Howard</strong> <span style={{ opacity: 0.5, marginLeft: 5, fontFamily: v.mono, fontSize: 11 }}>Intelligence</span>
        </div>
        <div style={{ display: 'flex' }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', borderRight: `1px solid ${v.line}`,
              padding: '1rem 1.5rem', fontFamily: v.sans, fontSize: 13, cursor: 'pointer',
              color: v.ink, borderBottom: tab === t.id ? `2px solid ${v.ink}` : '2px solid transparent',
              display: 'flex', gap: 8, alignItems: 'baseline', transition: 'border-color 0.2s',
            }}>
              <span>{t.label}</span>
              <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>{t.count}</span>
            </button>
          ))}
          <div style={{ flex: 1, padding: '1rem', fontFamily: v.mono, fontSize: 11, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.5 }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Hero — always shows primary outlook */}
      <section style={{ borderBottom: `1px solid ${v.line}`, padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '5vw', lineHeight: 0.85, letterSpacing: '-0.04em', fontWeight: 400 }}>
            {outlooks[0]?.title || 'Loading'}
          </h1>
          <p style={{ marginTop: '1.5rem', maxWidth: '40ch', lineHeight: 1.5, opacity: 0.7 }}>
            {outlooks[0]?.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'flex-end' }}>
          {outlooks.map((o) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${v.line}`, paddingTop: '0.5rem' }}>
              <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{horizonLabel[o.time_horizon]}</span>
              <span style={{ fontFamily: v.mono, fontSize: 11 }}>{o.sentiment} · {o.confidence}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tab content */}
      {loading ? (
        <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading...</div>
      ) : (
        <>
          {tab === 'intelligence' && (
            <>
              <TableHeader cols={['idx', 'Intelligence', 'Source', 'Sentiment']} />
              {content.map((item, i) => (
                <DataRow key={item.id} item={item} index={i} />
              ))}
            </>
          )}

          {tab === 'outlooks' && outlooks.map((o) => (
            <div key={o.id} style={{ padding: '2rem', borderBottom: `1px solid ${v.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>{horizonLabel[o.time_horizon]}</span>
                <span style={{ fontFamily: v.mono, fontSize: 11 }}>{o.sentiment} · {o.confidence}%</span>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>{o.title}</h2>
              <p style={{ opacity: 0.6, lineHeight: 1.6, maxWidth: '60ch', marginBottom: 16 }}>{o.subtitle}</p>
              {o.positioning.slice(0, 4).map((pos, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6, display: 'flex', gap: 10 }}>
                  <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>{String(i + 1).padStart(2, '0')}</span>
                  {pos.length > 140 ? pos.slice(0, 140) + '...' : pos}
                </div>
              ))}
            </div>
          ))}

          {tab === 'predictions' && (
            <>
              <TableHeader cols={['idx', 'Claim', 'Confidence', 'Horizon']} />
              {predictions.map((pred, i) => (
                <div key={pred.id} style={{
                  display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr',
                  padding: '1rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
                  cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
                >
                  <span style={{ fontFamily: v.mono, fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim.length > 90 ? pred.claim.slice(0, 90) + '...' : pred.claim}</span>
                  <span style={{ fontFamily: v.mono, fontSize: 11 }}>{pred.confidence}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[pred.sentiment] }} />
                    <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase' }}>{pred.sentiment}</span>
                    <span style={{ fontFamily: v.mono, fontSize: 11, marginLeft: 'auto', opacity: 0.5 }}>{pred.time_horizon}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'themes' && (
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
              {trending.map((topic, i) => (
                <div key={topic.title} style={{
                  border: `1px solid ${v.line}`, padding: '1.5rem', cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
                >
                  <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ fontSize: 14, marginTop: 8 }}>{topic.title}</div>
                  <div style={{ fontFamily: v.mono, fontSize: 24, marginTop: 8, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : 'inherit' }}>
                    {topic.mentions}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr',
      padding: '0.5rem 1rem', borderBottom: `1px solid ${v.line}`,
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5,
      fontFamily: v.mono, position: 'sticky', top: 55, background: v.bg, zIndex: 90,
    }}>
      {cols.map((c) => <div key={c}>{c}</div>)}
    </div>
  );
}

function DataRow({ item, index }: { item: ReturnType<typeof useBriefingData>['content'][0]; index: number }) {
  const title = decode(item.analysis.display_title || item.title);
  const sc = sentimentColor[item.analysis.sentiment_overall] || '#666';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr',
      padding: '1rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
      cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
    >
      <div style={{ fontFamily: v.mono, fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</div>
      <div style={{ fontSize: 14, lineHeight: 1.4 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{item.source.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, flexShrink: 0 }} />
        <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase' }}>{item.analysis.sentiment_overall}</span>
        <span style={{ fontFamily: v.mono, fontSize: 11, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
      </div>
    </div>
  );
}
