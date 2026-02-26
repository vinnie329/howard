'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant E — Brutalist Light
   Inspired by: Variant generative design systems.
   Light bg, dark ink, hard borders, data rows with hover inversion,
   uppercase mono labels, grid structure. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutE() {
  const { content, outlooks, trending, loading } = useBriefingData();

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Header */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        borderBottom: `1px solid ${v.line}`,
        position: 'sticky',
        top: 0,
        background: v.bg,
        zIndex: 100,
      }}>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}` }}>
          <strong>Howard</strong> <span style={{ opacity: 0.5, marginLeft: 5, fontFamily: v.mono, fontSize: 11 }}>Intelligence</span>
        </div>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 12 }}>
          {outlooks.length} Outlooks Active
        </div>
        <div style={{ padding: '1rem', borderRight: `1px solid ${v.line}`, fontFamily: v.mono, fontSize: 12 }}>
          {content.length} Items Captured
        </div>
        <div style={{ padding: '1rem', fontFamily: v.mono, fontSize: 12, textAlign: 'right' }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </header>

      {/* Outlook banner */}
      <section style={{ borderBottom: `1px solid ${v.line}`, padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '6vw', lineHeight: 0.85, letterSpacing: '-0.04em', fontWeight: 400 }}>
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

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1.5fr 1fr 1fr',
        padding: '0.5rem 1rem',
        borderBottom: `1px solid ${v.line}`,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        opacity: 0.5,
        fontFamily: v.mono,
        position: 'sticky',
        top: 55,
        background: v.bg,
        zIndex: 90,
      }}>
        <div>idx</div>
        <div>Intelligence</div>
        <div>Source</div>
        <div>Sentiment</div>
      </div>

      {/* Data rows */}
      {loading ? (
        <div style={{ padding: '2rem', fontFamily: v.mono, fontSize: 12, opacity: 0.5 }}>Loading data...</div>
      ) : (
        content.map((item, i) => (
          <DataRow key={item.id} item={item} index={i} />
        ))
      )}

      {/* Trending footer */}
      <section style={{ borderTop: `1px solid ${v.line}`, padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Trending Themes</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {trending.slice(0, 6).map((topic, i) => (
              <div key={topic.title} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{String(i + 1).padStart(2, '0')}. {topic.title}</span>
                <span style={{ fontFamily: v.mono, fontSize: 12, color: topic.trend === 'up' ? '#00AA00' : topic.trend === 'down' ? '#CC0000' : v.ink }}>
                  {topic.mentions} mentions
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ fontFamily: v.mono, fontSize: 10, textAlign: 'right', opacity: 0.5 }}>
            Howard Intelligence System<br />
            Monitoring {content.length} items<br />
            {trending.length} active themes
          </div>
        </div>
      </section>
    </div>
  );
}

function DataRow({ item, index }: { item: ReturnType<typeof useBriefingData>['content'][0]; index: number }) {
  const title = decode(item.analysis.display_title || item.title);
  const sc = sentimentColor[item.analysis.sentiment_overall] || '#666';

  return (
    <a
      href={`/content/${item.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1.5fr 1fr 1fr',
        padding: '1rem',
        borderBottom: `1px solid ${v.line}`,
        cursor: 'pointer',
        alignItems: 'baseline',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.2s, color 0.2s',
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
    </a>
  );
}
