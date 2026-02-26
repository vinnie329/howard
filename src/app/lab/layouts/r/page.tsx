'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant R — Tabbed Workspace
   Full-height app with tab switching between views.
   No panels — full-width content areas. Specimen controls in each view. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

type Tab = 'feed' | 'outlook' | 'predictions' | 'themes';

export default function LayoutR() {
  const { content, outlooks, predictions, trending, loading } = useBriefingData();
  const [tab, setTab] = useState<Tab>('feed');

  if (loading) return <div style={{ minHeight: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>Loading...</div>;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'feed', label: 'Intelligence', count: content.length },
    { id: 'outlook', label: 'Outlooks', count: outlooks.length },
    { id: 'predictions', label: 'Predictions', count: predictions.length },
    { id: 'themes', label: 'Themes', count: trending.length },
  ];

  return (
    <div style={{ height: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with tabs */}
      <header style={{ borderBottom: `1px solid ${g.border}`, flexShrink: 0 }}>
        <div style={{ height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard</span>
          <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <div style={{ display: 'flex', padding: '0 24px' }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', borderBottom: tab === t.id ? '1px solid white' : '1px solid transparent',
              color: tab === t.id ? g.text : g.muted, padding: '12px 20px', fontSize: 13, fontFamily: g.font,
              cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', transition: 'color 0.2s',
            }}>
              {t.label}
              <span style={{ fontFamily: g.mono, fontSize: 10, opacity: 0.5 }}>{t.count}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', maxWidth: 1000, width: '100%', margin: '0 auto' }}>
        {tab === 'feed' && content.map((item, i) => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto',
            padding: '20px 24px', borderBottom: `1px solid ${g.border}`, gap: 16, alignItems: 'start',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = g.panel; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                <span style={{ fontSize: 11, color: g.muted }}>{item.source.name}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.4 }}>{decode(item.analysis.display_title || item.title)}</div>
              <div style={{ fontSize: 12, color: g.muted, lineHeight: 1.5, marginTop: 6, maxWidth: '65ch' }}>
                {item.analysis.summary.length > 150 ? item.analysis.summary.slice(0, 150) + '...' : item.analysis.summary}
              </div>
              {item.analysis.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {item.analysis.themes.slice(0, 4).map((theme) => (
                    <span key={theme} style={{ fontSize: 10, padding: '2px 8px', border: `1px solid ${g.border}`, color: g.muted }}>{theme}</span>
                  ))}
                </div>
              )}
            </div>
            <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted, paddingTop: 2 }}>{timeAgo(item.published_at)}</span>
          </div>
        ))}

        {tab === 'outlook' && outlooks.map((o) => (
          <div key={o.id} style={{ padding: '32px 24px', borderBottom: `1px solid ${g.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{horizonLabel[o.time_horizon]}</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
              <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{o.confidence}%</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>{o.title}</h2>
            <p style={{ color: g.muted, fontSize: 14, lineHeight: 1.6, maxWidth: '60ch', marginBottom: 20 }}>{o.subtitle}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {o.positioning.slice(0, 5).map((pos, i) => (
                <div key={i} style={{ padding: '12px 0', borderTop: `1px solid ${g.border}`, fontSize: 12, lineHeight: 1.5, color: g.muted, display: 'flex', gap: 12 }}>
                  <span style={{ fontFamily: g.mono, fontSize: 10, color: '#333', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{pos.length > 160 ? pos.slice(0, 160) + '...' : pos}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {tab === 'predictions' && predictions.map((pred, i) => (
          <div key={pred.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 60px',
            padding: '14px 24px', borderBottom: `1px solid ${g.border}`, alignItems: 'baseline',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = g.panel; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim.length > 100 ? pred.claim.slice(0, 100) + '...' : pred.claim}</span>
            <span style={{ fontSize: 11, color: g.muted, fontFamily: g.mono }}>{pred.confidence}</span>
            <span style={{ fontSize: 11, color: g.muted }}>{pred.time_horizon}</span>
            <span style={{ textAlign: 'right' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[pred.sentiment], display: 'inline-block' }} /></span>
          </div>
        ))}

        {tab === 'themes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {trending.map((topic, i) => (
              <div key={topic.title} style={{
                borderRight: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`,
                padding: 24, cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = g.panel; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ fontSize: 14, marginTop: 8 }}>{topic.title}</div>
                <div style={{ fontFamily: g.mono, fontSize: 20, marginTop: 8, color: topic.trend === 'up' ? '#22c55e' : topic.trend === 'down' ? '#ef4444' : g.muted }}>
                  {topic.mentions}
                </div>
                <div style={{ fontSize: 11, color: g.muted, marginTop: 4 }}>mentions</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ height: 40, borderTop: `1px solid ${g.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontSize: 11, color: g.muted, flexShrink: 0 }}>
        <span>→ server status: online</span>
        <span style={{ fontFamily: g.mono }}>HOWARD WORKSPACE</span>
      </footer>
    </div>
  );
}
