'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor } from '../../briefings/_shared';

/* Variant N — Specimen Manager
   Three-panel dark app: left nav, center list, right inspector.
   Inspired by type foundry specimen manager. Polished, app-like. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutN() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [selected, setSelected] = useState(0);

  if (loading) return <div style={{ minHeight: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const item = content[selected];

  return (
    <div style={{ height: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ height: 60, borderBottom: `1px solid ${g.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard Intelligence</span>
        <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </header>

      {/* Main */}
      <main style={{ display: 'grid', gridTemplateColumns: '240px 1fr 400px', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Nav */}
        <aside style={{ borderRight: `1px solid ${g.border}`, padding: 24, display: 'flex', flexDirection: 'column', background: g.bg }}>
          <SectionLabel label="(1) Outlooks" />
          <ul style={{ listStyle: 'none', marginBottom: 32 }}>
            {outlooks.map((o) => (
              <NavItem key={o.id} label={o.title} meta={`${o.sentiment} · ${o.confidence}%`} color={sentimentColor[o.sentiment]} />
            ))}
          </ul>

          <SectionLabel label="(2) Themes" />
          <ul style={{ listStyle: 'none', marginBottom: 32 }}>
            {trending.slice(0, 6).map((topic) => (
              <NavItem key={topic.title} label={topic.title} meta={`${topic.mentions}`} />
            ))}
          </ul>

          <div style={{ marginTop: 'auto' }}>
            <SectionLabel label="Status" />
            <div style={{ fontSize: 11, color: g.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>{content.length} items captured</span>
              <span>{predictions.length} predictions tracked</span>
              <span>{trending.length} themes active</span>
            </div>
          </div>
        </aside>

        {/* Center List */}
        <section style={{ background: g.panel, borderRight: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${g.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(3) Intelligence Feed</span>
            <span style={{ fontSize: 11, color: g.muted, fontFamily: g.mono }}>{content.length} ITEMS</span>
          </div>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 80px', padding: '8px 24px', borderBottom: `1px solid ${g.border}`, fontSize: 11, color: g.muted }}>
            <div>#</div>
            <div>TITLE</div>
            <div>SOURCE</div>
            <div style={{ textAlign: 'right' }}>AGE</div>
          </div>
          {/* Rows */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {content.map((c, i) => (
              <div
                key={c.id}
                onClick={() => setSelected(i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1.5fr 1fr 80px',
                  padding: '16px 24px',
                  borderBottom: `1px solid ${g.border}`,
                  alignItems: 'baseline',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  background: selected === i ? '#1a1a1a' : 'transparent',
                }}
                onMouseEnter={(e) => { if (selected !== i) e.currentTarget.style.background = g.bg; }}
                onMouseLeave={(e) => { if (selected !== i) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ color: g.muted, fontSize: 11, fontFamily: g.mono }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16 }}>
                  {decode(c.analysis.display_title || c.title)}
                </span>
                <span style={{ color: g.muted, fontSize: 11 }}>{c.source.name}</span>
                <span style={{ color: g.muted, fontSize: 11, fontFamily: g.mono, textAlign: 'right' }}>{timeAgo(c.published_at)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Right Inspector */}
        <aside style={{ background: g.bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {item && (
            <>
              {/* Inspector header */}
              <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4, lineHeight: 1.2 }}>{decode(item.analysis.display_title || item.title)}</h1>
                    <div style={{ fontSize: 14, color: g.muted }}>{item.source.name} · {timeAgo(item.published_at)}</div>
                  </div>
                </div>
              </div>

              {/* Large preview: sentiment display */}
              <div style={{
                height: 200,
                borderBottom: `1px solid ${g.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: g.panel,
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 20,
                  border: `1px solid ${g.border}`,
                  borderTopRightRadius: 100,
                  borderBottomRightRadius: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 48, lineHeight: 1, color: sentimentColor[item.analysis.sentiment_overall] }}>
                    {item.analysis.sentiment_overall === 'bullish' ? '↑' : item.analysis.sentiment_overall === 'bearish' ? '↓' : '→'}
                  </span>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.analysis.sentiment_overall} · {Math.round(item.analysis.sentiment_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: '0 24px 24px' }}>
                <div style={{ color: g.muted, fontSize: 16, lineHeight: 1.5, marginTop: 24 }}>
                  {item.analysis.summary}
                </div>
              </div>

              {/* Themes grid */}
              <div style={{ padding: '0 24px' }}>
                <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(4) Themes</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: `1px solid ${g.border}`, marginTop: 16 }}>
                {item.analysis.themes.slice(0, 9).map((theme) => (
                  <div key={theme} style={{
                    aspectRatio: '2',
                    borderRight: `1px solid ${g.border}`,
                    borderBottom: `1px solid ${g.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: g.muted,
                    textAlign: 'center',
                    padding: 8,
                    transition: 'color 0.2s, background 0.2s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = g.text; e.currentTarget.style.background = g.panel; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = g.muted; e.currentTarget.style.background = 'transparent'; }}
                  >
                    {theme}
                  </div>
                ))}
              </div>

              {/* Assets */}
              {item.analysis.assets_mentioned.length > 0 && (
                <div style={{ padding: 24 }}>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(5) Assets Mentioned</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {item.analysis.assets_mentioned.map((asset) => (
                      <span key={asset} style={{ fontSize: 11, fontFamily: g.mono, padding: '4px 10px', border: `1px solid ${g.border}`, color: g.muted }}>
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </main>

      {/* Footer */}
      <footer style={{ height: 40, borderTop: `1px solid ${g.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontSize: 11, color: g.muted }}>
        <span>→ system status: online</span>
        <span style={{ fontFamily: g.mono }}>HOWARD v1.0 — INTELLIGENCE SYSTEM</span>
      </footer>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div style={{ color: '#6B7280', marginBottom: 16, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>;
}

function NavItem({ label, meta, color }: { label: string; meta?: string; color?: string }) {
  return (
    <li style={{ padding: '8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.2s', fontSize: 13 }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#6B7280'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
    >
      <span style={{ opacity: 0, fontSize: 10, transition: 'opacity 0.2s' }}>→</span>
      <span style={{ flex: 1 }}>{label}</span>
      {meta && <span style={{ fontSize: 11, color: color || '#6B7280', fontFamily: '"Courier New", monospace' }}>{meta}</span>}
    </li>
  );
}
