'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant L — Kanban / Column Cards
   Three vertical swim lanes: Short / Medium / Long outlook,
   with intelligence cards sorted by relevance.
   Light bg, hard borders, monospace labels. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  white: '#f5f4f1',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutL() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const horizons = ['short', 'medium', 'long'];

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 13 }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div><strong>Howard</strong> <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, marginLeft: 8, textTransform: 'uppercase' }}>Thesis Board</span></div>
        <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </header>

      {/* Trending strip */}
      <div style={{ borderBottom: `1px solid ${v.line}`, padding: '6px 1.5rem', display: 'flex', gap: 16, overflowX: 'auto', fontFamily: v.mono, fontSize: 10 }}>
        <span style={{ opacity: 0.4, textTransform: 'uppercase', flexShrink: 0 }}>Trending:</span>
        {trending.slice(0, 8).map((topic) => (
          <span key={topic.title} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            {topic.title} <span style={{ color: topic.trend === 'up' ? '#006600' : topic.trend === 'down' ? '#990000' : v.ink, opacity: 0.5 }}>{topic.mentions}</span>
          </span>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', minHeight: 'calc(100vh - 90px)' }}>
        {horizons.map((horizon) => {
          const outlook = outlooks.find((o) => o.time_horizon === horizon);
          // Assign content roughly to columns by index
          const colContent = content.filter((_, i) => i % 3 === horizons.indexOf(horizon));
          const colPreds = predictions.filter((_, i) => i % 3 === horizons.indexOf(horizon));

          return (
            <div key={horizon} style={{ borderRight: `1px solid ${v.line}`, display: 'flex', flexDirection: 'column' }}>
              {/* Column header */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${v.line}`, background: `${v.ink}06` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {horizonLabel[horizon]}
                  </span>
                  {outlook && (
                    <span style={{ fontFamily: v.mono, fontSize: 10, color: sentimentColor[outlook.sentiment] }}>
                      {outlook.sentiment.toUpperCase()} {outlook.confidence}%
                    </span>
                  )}
                </div>
                {outlook && (
                  <div style={{ fontSize: 16, fontWeight: 400, letterSpacing: '-0.02em', marginTop: 6 }}>{outlook.title}</div>
                )}
              </div>

              {/* Thesis */}
              {outlook && (
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6 }}>
                  {outlook.subtitle}
                </div>
              )}

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {colContent.slice(0, 4).map((item) => (
                  <div key={item.id} style={{
                    background: v.white,
                    border: `1px solid ${v.lineLight}`,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = v.ink; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = v.lineLight; }}
                  >
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                      <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.4, textTransform: 'uppercase' }}>{item.source.name}</span>
                      <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.3, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.4 }}>{decode(item.analysis.display_title || item.title)}</div>
                  </div>
                ))}
                {colPreds.slice(0, 3).map((pred) => (
                  <div key={pred.id} style={{
                    borderLeft: `2px solid ${sentimentColor[pred.sentiment]}`,
                    padding: '8px 12px',
                    fontSize: 11,
                    lineHeight: 1.4,
                    opacity: 0.7,
                  }}>
                    {pred.claim.length > 80 ? pred.claim.slice(0, 80) + '...' : pred.claim}
                    <div style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.5, marginTop: 2 }}>{pred.confidence} · {pred.time_horizon}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
