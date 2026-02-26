'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant F — Broadsheet
   Newspaper-style columns, serif headlines, hard rules,
   light paper background, data-dense grid. */

const v = {
  bg: '#F0EDE6',
  ink: '#1a1a1a',
  line: '#1a1a1a',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutF() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: v.mono, fontSize: 12, color: v.ink }}>Loading...</div>;

  const lead = content[0];
  const rest = content.slice(1, 9);

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 13, lineHeight: 1.4 }}>
      {/* Masthead */}
      <header style={{ borderBottom: `2px solid ${v.ink}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: v.serif, fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em' }}>Howard Intelligence</div>
        <div style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      {/* Outlook strip */}
      <div style={{ borderBottom: `1px solid ${v.ink}`, display: 'grid', gridTemplateColumns: `repeat(${outlooks.length}, 1fr)` }}>
        {outlooks.map((o) => (
          <div key={o.id} style={{ padding: '0.75rem 2rem', borderRight: `1px solid ${v.lineLight}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ opacity: 0.5 }}>{horizonLabel[o.time_horizon]}</span>{' '}
            <span style={{ color: sentimentColor[o.sentiment] }}>{o.sentiment}</span>{' '}
            <span>{o.confidence}%</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: `1px solid ${v.ink}` }}>
        {/* Lead story */}
        <div style={{ padding: '2rem', borderRight: `1px solid ${v.ink}` }}>
          {lead && (
            <>
              <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, display: 'block', marginBottom: '0.5rem' }}>
                Lead Intelligence · {lead.source.name}
              </span>
              <h2 style={{ fontFamily: v.serif, fontSize: 32, fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
                {decode(lead.analysis.display_title || lead.title)}
              </h2>
              <p style={{ lineHeight: 1.6, maxWidth: '55ch', marginBottom: '1rem' }}>
                {lead.analysis.summary}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {lead.analysis.themes.slice(0, 5).map((theme) => (
                  <span key={theme} style={{ fontFamily: v.mono, fontSize: 10, padding: '2px 6px', border: `1px solid ${v.lineLight}`, textTransform: 'uppercase' }}>{theme}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar: trending + predictions */}
        <div>
          <div style={{ padding: '1rem 2rem', borderBottom: `1px solid ${v.lineLight}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
            Trending Themes
          </div>
          {trending.slice(0, 5).map((topic, i) => (
            <div key={topic.title} style={{ padding: '0.5rem 2rem', borderBottom: `1px solid ${v.lineLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13 }}>{String(i + 1).padStart(2, '0')}. {topic.title}</span>
              <span style={{ fontFamily: v.mono, fontSize: 10, color: topic.trend === 'up' ? '#006600' : topic.trend === 'down' ? '#990000' : v.ink }}>{topic.mentions}</span>
            </div>
          ))}
          <div style={{ padding: '1rem 2rem', borderBottom: `1px solid ${v.lineLight}`, borderTop: `1px solid ${v.ink}`, fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
            Recent Predictions
          </div>
          {predictions.slice(0, 4).map((pred) => (
            <div key={pred.id} style={{ padding: '0.75rem 2rem', borderBottom: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[pred.sentiment] }} />
                <span style={{ fontFamily: v.mono, fontSize: 9, textTransform: 'uppercase', opacity: 0.5 }}>{pred.confidence} · {pred.time_horizon}</span>
              </div>
              {pred.claim.length > 100 ? pred.claim.slice(0, 100) + '...' : pred.claim}
            </div>
          ))}
        </div>
      </div>

      {/* Below-fold: 2-column article list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${v.ink}` }}>
        {rest.map((item, i) => (
          <div key={item.id} style={{
            padding: '1.25rem 2rem',
            borderBottom: `1px solid ${v.lineLight}`,
            borderRight: i % 2 === 0 ? `1px solid ${v.lineLight}` : 'none',
          }}>
            <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4, textTransform: 'uppercase' }}>{item.source.name} · {timeAgo(item.published_at)}</span>
            <h3 style={{ fontFamily: v.serif, fontSize: 16, fontWeight: 400, lineHeight: 1.3, marginTop: 4, letterSpacing: '-0.01em' }}>
              {decode(item.analysis.display_title || item.title)}
            </h3>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ padding: '2rem', fontFamily: v.mono, fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Howard Intelligence System · {content.length} items captured · {predictions.length} predictions tracked
      </footer>
    </div>
  );
}
