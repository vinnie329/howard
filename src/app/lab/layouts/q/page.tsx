'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant Q — Source Matrix
   Grid of source cards with their latest intelligence.
   Glyph-grid inspired layout — each source is a cell. */

const g = {
  bg: '#0A0A0A',
  panel: '#141414',
  border: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#6B7280',
  font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
};

export default function LayoutQ() {
  const { content, outlooks, trending, loading } = useBriefingData();

  if (loading) return <div style={{ minHeight: '100vh', background: g.bg, color: g.muted, fontFamily: g.font, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>Loading...</div>;

  // Group content by source
  const bySource = new Map<string, typeof content>();
  content.forEach((item) => {
    const key = item.source.name;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(item);
  });
  const sources = Array.from(bySource.entries());

  return (
    <div style={{ minHeight: '100vh', background: g.bg, color: g.text, fontFamily: g.font, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ height: 60, borderBottom: `1px solid ${g.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Howard — Source Matrix</span>
        <span style={{ fontFamily: g.mono, fontSize: 11, color: g.muted }}>{sources.length} SOURCES · {content.length} ITEMS</span>
      </header>

      {/* Outlook strip */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${g.border}`, flexShrink: 0 }}>
        {outlooks.map((o) => (
          <div key={o.id} style={{ flex: 1, padding: '12px 24px', borderRight: `1px solid ${g.border}` }}>
            <div style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{horizonLabel[o.time_horizon]}</div>
            <div style={{ fontSize: 14, fontWeight: 400 }}>{o.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
              <span style={{ fontSize: 11, fontFamily: g.mono, color: g.muted }}>{o.sentiment} {o.confidence}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Source grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 0 }}>
        {sources.map(([sourceName, items]) => (
          <div key={sourceName} style={{ borderRight: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`, display: 'flex', flexDirection: 'column' }}>
            {/* Source header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${g.border}`, background: g.panel }}>
              <div style={{ fontSize: 16, fontWeight: 400 }}>{sourceName}</div>
              <div style={{ fontSize: 11, color: g.muted, fontFamily: g.mono, marginTop: 2 }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Items */}
            {items.slice(0, 3).map((item) => (
              <div key={item.id} style={{
                padding: '12px 20px', borderBottom: `1px solid ${g.border}`,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = g.panel; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                  <span style={{ fontSize: 10, color: g.muted, fontFamily: g.mono }}>{timeAgo(item.published_at)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{decode(item.analysis.display_title || item.title)}</div>
                {item.analysis.themes.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {item.analysis.themes.slice(0, 2).map((theme) => (
                      <span key={theme} style={{ fontSize: 10, padding: '2px 6px', border: `1px solid ${g.border}`, color: g.muted }}>{theme}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Trending footer */}
      <div style={{ borderTop: `1px solid ${g.border}`, padding: '10px 24px', display: 'flex', gap: 24, overflowX: 'auto', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: g.muted, textTransform: 'uppercase', flexShrink: 0 }}>Trending:</span>
        {trending.slice(0, 8).map((t) => (
          <span key={t.title} style={{ fontSize: 11, color: g.muted, fontFamily: g.mono, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t.title} <span style={{ color: t.trend === 'up' ? '#22c55e' : t.trend === 'down' ? '#ef4444' : g.muted }}>{t.mentions}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
