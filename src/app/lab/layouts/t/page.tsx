'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant T — Stacked Modules
   Vertical scroll of full-width panels, each with a header bar and content.
   Dark bg, panel backgrounds, numbered sections. No columns. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutT() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [expandedPred, setExpandedPred] = useState<string | null>(null);

  if (loading) return <div style={{ minHeight: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5 }}>
      {/* Sticky header */}
      <header style={{
        height: 60, borderBottom: `1px solid ${g.border}`, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: g.bg, zIndex: 10,
      }}>
        <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard</span>
        <div style={{ display: 'flex', gap: 24, fontSize: 11, color: g.muted, fontFamily: g.mono }}>
          <span>{content.length} items</span>
          <span>{predictions.length} predictions</span>
          <span>{trending.length} themes</span>
        </div>
      </header>

      {/* Module 1: Outlooks */}
      <Module num="01" title="Active Outlooks" count={outlooks.length}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${outlooks.length}, 1fr)` }}>
          {outlooks.map((o) => (
            <div key={o.id} style={{ padding: 24, borderRight: `1px solid ${g.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{horizonLabel[o.time_horizon]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                  <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{o.confidence}%</span>
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.2, marginBottom: 8 }}>{o.title}</div>
              <div style={{ fontSize: 12, color: g.muted, lineHeight: 1.5 }}>{o.subtitle}</div>
            </div>
          ))}
        </div>
      </Module>

      {/* Module 2: Intelligence */}
      <Module num="02" title="Captured Intelligence" count={content.length}>
        {content.map((item, i) => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 80px',
            padding: '16px 24px', borderBottom: `1px solid ${g.border}`, alignItems: 'baseline',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0e0e0e'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ fontSize: 14, lineHeight: 1.4 }}>{decode(item.analysis.display_title || item.title)}</div>
              {item.analysis.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {item.analysis.themes.slice(0, 3).map((theme) => (
                    <span key={theme} style={{ fontSize: 10, padding: '1px 6px', border: `1px solid ${g.border}`, color: g.muted }}>{theme}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
              <span style={{ fontSize: 11, color: g.muted }}>{item.source.name}</span>
            </div>
            <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted, textAlign: 'right' }}>{timeAgo(item.published_at)}</span>
          </div>
        ))}
      </Module>

      {/* Module 3: Predictions */}
      <Module num="03" title="Tracked Predictions" count={predictions.length}>
        {predictions.slice(0, 12).map((pred) => (
          <div key={pred.id}
            onClick={() => setExpandedPred(expandedPred === pred.id ? null : pred.id)}
            style={{ borderBottom: `1px solid ${g.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0e0e0e'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ padding: '14px 24px', display: 'flex', gap: 12, alignItems: 'start' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[pred.sentiment], flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim.length > 120 ? pred.claim.slice(0, 120) + '...' : pred.claim}</div>
                <div style={{ fontSize: 10, color: g.muted, fontFamily: g.mono, marginTop: 4 }}>{pred.confidence} · {pred.time_horizon} · {pred.sentiment}</div>
              </div>
            </div>
            {expandedPred === pred.id && (
              <div style={{ padding: '0 24px 14px 42px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {pred.themes.map((theme) => (
                  <span key={theme} style={{ fontSize: 10, padding: '2px 8px', border: `1px solid ${g.border}`, color: g.muted }}>{theme}</span>
                ))}
                {pred.assets_mentioned.map((asset) => (
                  <span key={asset} style={{ fontSize: 10, padding: '2px 8px', background: g.panel, color: g.text, fontFamily: g.mono }}>{asset}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </Module>

      {/* Module 4: Themes */}
      <Module num="04" title="Trending Themes" count={trending.length}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {trending.slice(0, 12).map((topic) => (
            <div key={topic.title} style={{
              aspectRatio: '1', borderRight: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 12, cursor: 'pointer', transition: 'background 0.2s, color 0.2s', color: g.muted, textAlign: 'center',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = g.text; e.currentTarget.style.background = g.panel; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = g.muted; e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: g.mono, fontSize: 20 }}>{topic.mentions}</span>
              <span style={{ fontSize: 10, marginTop: 4 }}>{topic.title}</span>
            </div>
          ))}
        </div>
      </Module>

      {/* Footer */}
      <footer style={{ height: 40, borderTop: `1px solid ${g.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontSize: 11, color: g.muted }}>
        <span>→ system status: online</span>
        <span style={{ fontFamily: g.mono }}>HOWARD v1.0</span>
      </footer>
    </div>
  );
}

function Module({ num, title, count, children }: { num: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section style={{ borderBottom: `1px solid ${g.border}` }}>
      <div style={{
        padding: '12px 24px', borderBottom: `1px solid ${g.border}`, background: '#0e0e0e',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 60, zIndex: 5,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#6B7280' }}>({num})</span>
          <span style={{ fontSize: 13, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</span>
        </div>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#6B7280' }}>{count}</span>
      </div>
      {children}
    </section>
  );
}
