'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant U — Sidebar Commander
   Left sidebar dominates with all navigation + outlook summary.
   Center is a wide content area with detail below. Like a mail client. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutU() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [selected, setSelected] = useState(0);

  if (loading) return <div style={{ height: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>Loading...</div>;

  const item = content[selected];

  return (
    <div style={{ height: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ height: 48, borderBottom: `1px solid ${g.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid white' }} />)}
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <aside style={{ borderRight: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: g.bg }}>
          {/* Outlooks */}
          <div style={{ padding: '16px 20px 8px', fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(1) Outlooks</div>
          {outlooks.map((o) => (
            <div key={o.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${g.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase' }}>{horizonLabel[o.time_horizon]}</span>
                <span style={{ fontSize: 11, fontFamily: g.mono, color: sentimentColor[o.sentiment] }}>{o.confidence}%</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 400 }}>{o.title}</div>
            </div>
          ))}

          {/* Trending */}
          <div style={{ padding: '16px 20px 8px', fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(2) Themes</div>
          {trending.slice(0, 6).map((t, i) => (
            <div key={t.title} style={{ padding: '6px 20px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: g.muted }}><span style={{ fontFamily: g.mono, fontSize: 10, marginRight: 6, opacity: 0.4 }}>{String(i + 1).padStart(2, '0')}</span>{t.title}</span>
              <span style={{ fontFamily: g.mono, fontSize: 10, color: t.trend === 'up' ? '#22c55e' : t.trend === 'down' ? '#ef4444' : g.muted }}>{t.mentions}</span>
            </div>
          ))}

          {/* Predictions count */}
          <div style={{ padding: '16px 20px 8px', fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>(3) Predictions</div>
          <div style={{ padding: '4px 20px', fontSize: 12, color: g.muted }}>
            {predictions.filter((p) => p.sentiment === 'bullish').length} bullish · {predictions.filter((p) => p.sentiment === 'bearish').length} bearish · {predictions.filter((p) => p.sentiment === 'mixed' || p.sentiment === 'neutral').length} other
          </div>

          <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: `1px solid ${g.border}`, fontSize: 10, color: g.muted, fontFamily: g.mono }}>
            STATUS: ONLINE<br />
            SYNC: {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </aside>

        {/* Right: list + detail split */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* List (top half) */}
          <div style={{ flex: '1 1 50%', borderBottom: `1px solid ${g.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 24px', borderBottom: `1px solid ${g.border}`, fontSize: 10, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em', background: g.panel }}>
              (4) Intelligence Feed — {content.length} items
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {content.map((c, i) => (
                <div key={c.id} onClick={() => setSelected(i)} style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr auto',
                  padding: '12px 24px', borderBottom: `1px solid ${g.border}`,
                  cursor: 'pointer', background: selected === i ? '#1a1a1a' : 'transparent',
                  transition: 'background 0.15s', gap: 12, alignItems: 'center',
                }}
                  onMouseEnter={(e) => { if (selected !== i) e.currentTarget.style.background = g.panel; }}
                  onMouseLeave={(e) => { if (selected !== i) e.currentTarget.style.background = selected === i ? '#1a1a1a' : 'transparent'; }}
                >
                  <span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted }}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[c.analysis.sentiment_overall], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {decode(c.analysis.display_title || c.title)}
                    </span>
                  </div>
                  <span style={{ fontFamily: g.mono, fontSize: 10, color: g.muted, whiteSpace: 'nowrap' }}>{c.source.name} · {timeAgo(c.published_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail (bottom half) */}
          {item && (
            <div style={{ flex: '1 1 50%', overflowY: 'auto', background: g.panel }}>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                  <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase' }}>{item.analysis.sentiment_overall} · {item.source.name} · {timeAgo(item.published_at)}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.3, marginBottom: 12 }}>
                  {decode(item.analysis.display_title || item.title)}
                </h2>
                <p style={{ fontSize: 13, color: g.muted, lineHeight: 1.6, maxWidth: '70ch' }}>
                  {item.analysis.summary}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                  {item.analysis.themes.map((theme) => (
                    <span key={theme} style={{ fontSize: 10, padding: '3px 8px', border: `1px solid ${g.border}`, color: g.muted }}>{theme}</span>
                  ))}
                  {item.analysis.assets_mentioned.map((asset) => (
                    <span key={asset} style={{ fontSize: 10, padding: '3px 8px', background: g.bg, color: g.text, fontFamily: g.mono }}>{asset}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
