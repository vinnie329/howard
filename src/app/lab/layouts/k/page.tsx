'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant K — Index / Table of Contents
   Everything is a list. Single-column, border-separated rows.
   Generous padding, large index numbers, hover arrows.
   Inspired by the data-row pattern from the reference. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutK() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ padding: '3rem 2rem 1rem', borderBottom: `2px solid ${v.ink}` }}>
        <div style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.5rem' }}>
          Howard Intelligence · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <h1 style={{ fontSize: '4rem', lineHeight: 0.9, letterSpacing: '-0.04em', fontWeight: 400 }}>
          Index
        </h1>
      </header>

      {/* Outlooks section */}
      <SectionLabel label="Outlooks" count={outlooks.length} />
      {outlooks.map((o, i) => (
        <div key={o.id} style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr auto 40px',
          padding: '1.25rem 2rem',
          borderBottom: `1px solid ${v.line}`,
          alignItems: 'baseline',
          cursor: 'pointer',
          transition: 'background 0.2s, color 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
        >
          <span style={{ fontFamily: v.mono, fontSize: 28, fontWeight: 300, opacity: 0.2 }}>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-0.01em' }}>{o.title}</div>
            <div style={{ fontFamily: v.mono, fontSize: 10, marginTop: 4, opacity: 0.5, textTransform: 'uppercase' }}>
              {horizonLabel[o.time_horizon]} · {o.sentiment} · {o.confidence}%
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {o.key_themes.slice(0, 2).map((theme) => (
              <span key={theme} style={{ fontFamily: v.mono, fontSize: 9, padding: '2px 6px', border: `1px solid ${v.lineLight}`, textTransform: 'uppercase' }}>{theme}</span>
            ))}
          </div>
          <span style={{ fontSize: 18, textAlign: 'right', transition: 'transform 0.3s' }}>&#8599;</span>
        </div>
      ))}

      {/* Intelligence section */}
      <SectionLabel label="Captured Intelligence" count={content.length} />
      {content.map((item, i) => {
        const title = decode(item.analysis.display_title || item.title);
        return (
          <div key={item.id} style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr auto 40px',
            padding: '1rem 2rem',
            borderBottom: `1px solid ${v.line}`,
            alignItems: 'baseline',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
          >
            <span style={{ fontFamily: v.mono, fontSize: 28, fontWeight: 300, opacity: 0.2 }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ fontSize: 14, lineHeight: 1.4 }}>{title}</div>
              <div style={{ fontFamily: v.mono, fontSize: 10, marginTop: 2, opacity: 0.5 }}>{item.source.name} · {timeAgo(item.published_at)}</div>
            </div>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
            <span style={{ fontSize: 18, textAlign: 'right' }}>&#8599;</span>
          </div>
        );
      })}

      {/* Trending section */}
      <SectionLabel label="Trending Themes" count={trending.length} />
      {trending.slice(0, 8).map((topic, i) => (
        <div key={topic.title} style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr auto',
          padding: '0.75rem 2rem',
          borderBottom: `1px solid ${v.lineLight}`,
          alignItems: 'baseline',
        }}>
          <span style={{ fontFamily: v.mono, fontSize: 22, fontWeight: 300, opacity: 0.2 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ fontSize: 14 }}>{topic.title}</span>
          <span style={{ fontFamily: v.mono, fontSize: 11, color: topic.trend === 'up' ? '#006600' : topic.trend === 'down' ? '#990000' : v.ink }}>
            {topic.mentions} mentions
          </span>
        </div>
      ))}

      {/* Footer */}
      <footer style={{ padding: '3rem 2rem', fontFamily: v.mono, fontSize: 9, opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        End of Index · {content.length + outlooks.length + predictions.length} total entries
      </footer>
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      padding: '0.75rem 2rem',
      borderBottom: `1px solid ${v.line}`,
      borderTop: `2px solid ${v.ink}`,
      fontFamily: v.mono,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      display: 'flex',
      justifyContent: 'space-between',
      opacity: 0.5,
      marginTop: '2rem',
    }}>
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );
}
