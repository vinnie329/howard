'use client';

import { useState } from 'react';
import { useBriefingData, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant O — Outlook Inspector
   Three-panel: left nav (sources/filters), center (outlook list), right (deep detail).
   Optimized for reading outlooks and their positioning. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutO() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [selected, setSelected] = useState(0);

  if (loading) return <div style={{ minHeight: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const outlook = outlooks[selected];

  return (
    <div style={{ height: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ height: 60, borderBottom: `1px solid ${g.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid white' }} />)}
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '220px 1fr 420px', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left: filters + trends */}
        <aside style={{ borderRight: `1px solid ${g.border}`, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>(1) Time Horizons</div>
          <ul style={{ listStyle: 'none', marginBottom: 32 }}>
            {outlooks.map((o, i) => (
              <li key={o.id} onClick={() => setSelected(i)} style={{
                padding: '8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                textDecoration: selected === i ? 'underline' : 'none', textUnderlineOffset: 4,
              }}>
                <span style={{ fontSize: 10, opacity: selected === i ? 1 : 0, transition: 'opacity 0.2s' }}>→</span>
                <span>{horizonLabel[o.time_horizon]}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: g.mono, color: sentimentColor[o.sentiment] }}>{o.confidence}%</span>
              </li>
            ))}
          </ul>

          <div style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>(2) Trending</div>
          <ul style={{ listStyle: 'none' }}>
            {trending.slice(0, 8).map((t) => (
              <li key={t.title} style={{ padding: '6px 0', fontSize: 12, display: 'flex', justifyContent: 'space-between', color: g.muted }}>
                <span>{t.title}</span>
                <span style={{ fontFamily: g.mono, fontSize: 10, color: t.trend === 'up' ? '#22c55e' : t.trend === 'down' ? '#ef4444' : g.muted }}>{t.mentions}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 'auto', fontSize: 11, color: g.muted }}>
            <div>{content.length} intelligence items</div>
            <div>{predictions.length} predictions</div>
          </div>
        </aside>

        {/* Center: outlook cards */}
        <section style={{ background: g.panel, borderRight: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${g.border}`, fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            (3) Outlook Overview
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {outlooks.map((o, i) => (
              <div key={o.id} onClick={() => setSelected(i)} style={{
                padding: '24px', borderBottom: `1px solid ${g.border}`, cursor: 'pointer',
                background: selected === i ? '#1a1a1a' : 'transparent',
                transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => { if (selected !== i) e.currentTarget.style.background = g.bg; }}
                onMouseLeave={(e) => { if (selected !== i) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{horizonLabel[o.time_horizon]}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
                    <span style={{ fontSize: 11, fontFamily: g.mono, color: g.muted }}>{o.confidence}%</span>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.2, marginBottom: 6 }}>{o.title}</div>
                <div style={{ fontSize: 13, color: g.muted, lineHeight: 1.5 }}>{o.subtitle}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: deep inspector */}
        <aside style={{ background: g.bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {outlook && (
            <>
              <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>{outlook.title}</h1>
                <div style={{ fontSize: 14, color: g.muted }}>{horizonLabel[outlook.time_horizon]} · {outlook.sentiment} · {outlook.confidence}%</div>
              </div>

              {/* Sentiment display */}
              <div style={{ height: 160, borderBottom: `1px solid ${g.border}`, background: g.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 20, border: `1px solid ${g.border}`, borderTopRightRadius: 100, borderBottomRightRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <span style={{ fontSize: 64, color: sentimentColor[outlook.sentiment] }}>
                    {outlook.confidence}
                  </span>
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase' }}>confidence</span>
                </div>
              </div>

              {/* Thesis */}
              <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(4) Thesis</span>
                <p style={{ color: g.muted, fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
                  {outlook.thesis_intro && outlook.thesis_intro.length > 300 ? outlook.thesis_intro.slice(0, 300) + '...' : outlook.thesis_intro}
                </p>
              </div>

              {/* Positioning */}
              <div style={{ padding: 24, borderBottom: `1px solid ${g.border}` }}>
                <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(5) Positioning</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 12 }}>
                  {outlook.positioning.slice(0, 6).map((pos, i) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: `1px solid ${g.border}`, fontSize: 12, lineHeight: 1.5, color: g.muted }}>
                      <span style={{ fontFamily: g.mono, fontSize: 10, color: '#444', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                      {pos.length > 120 ? pos.slice(0, 120) + '...' : pos}
                    </div>
                  ))}
                </div>
              </div>

              {/* Key themes grid */}
              <div style={{ padding: '16px 24px 0' }}>
                <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(6) Key Themes</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: `1px solid ${g.border}`, marginTop: 12 }}>
                {outlook.key_themes.slice(0, 12).map((theme) => (
                  <div key={theme} style={{
                    borderRight: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`,
                    padding: 12, fontSize: 11, color: g.muted, cursor: 'pointer',
                    transition: 'color 0.2s, background 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = g.text; e.currentTarget.style.background = g.panel; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = g.muted; e.currentTarget.style.background = 'transparent'; }}
                  >
                    {theme}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </main>

      <footer style={{ height: 40, borderTop: `1px solid ${g.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontSize: 11, color: g.muted, flexShrink: 0 }}>
        <span>→ {outlooks.length} active outlooks</span>
        <span style={{ fontFamily: g.mono }}>HOWARD OUTLOOK INSPECTOR</span>
      </footer>
    </div>
  );
}
