'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel, t } from '../_shared';

/* Variant A — Widget Grid
   Mixed-size cards like iOS widgets. 2-col grid, some cards span full width.
   Dense but scannable. Each card is one glanceable fact. */

export default function BriefingA() {
  const { content, outlooks, trending, predictions, history, loading } = useBriefingData();

  if (loading) return <Shell><p style={{ color: t.text3 }}>Loading briefing...</p></Shell>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const bullish = predictions.filter((p) => p.sentiment === 'bullish').length;
  const bearish = predictions.filter((p) => p.sentiment === 'bearish').length;
  const latest = content.slice(0, 3);
  const topSignal = history[0];

  return (
    <Shell>
      {/* Date header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: t.text3, fontFamily: t.mono, marginBottom: 4 }}>{today}</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Daily Briefing</h1>
      </div>

      {/* Widget grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        maxWidth: 640,
      }}>
        {/* Stat: new content */}
        <Card>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: t.mono, letterSpacing: '-0.03em' }}>
            +{content.length}
          </div>
          <div style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>new analyses</div>
        </Card>

        {/* Stat: prediction sentiment */}
        <Card>
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <span style={{ fontSize: 28, fontWeight: 700, fontFamily: t.mono, color: '#22c55e' }}>{bullish}</span>
            <span style={{ fontSize: 28, fontWeight: 700, fontFamily: t.mono, color: '#ef4444' }}>{bearish}</span>
          </div>
          <div style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>bullish / bearish calls</div>
        </Card>

        {/* Outlook cards — full width each */}
        {outlooks.map((o) => (
          <Card key={o.id} span={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: sentimentColor[o.sentiment] || t.text3,
              }} />
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {horizonLabel[o.time_horizon]}
              </span>
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, marginLeft: 'auto' }}>{o.confidence}%</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{o.title}</div>
            <div style={{ fontSize: 12, color: t.text3, marginTop: 4, lineHeight: 1.4 }}>{o.subtitle}</div>
          </Card>
        ))}

        {/* Latest update */}
        {topSignal && (
          <Card span={2}>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Latest Change
            </div>
            <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>
              {topSignal.changes_summary[0]}
            </div>
          </Card>
        )}

        {/* Latest content */}
        {latest.map((item) => (
          <Card key={item.id}>
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 4 }}>{item.source.name}</div>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
              {decode(item.analysis.display_title || item.title)}
            </div>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, marginTop: 6 }}>{timeAgo(item.published_at)}</div>
          </Card>
        ))}

        {/* Trending */}
        <Card span={latest.length % 2 === 1 ? 1 : 2}>
          <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Trending
          </div>
          {trending.slice(0, 5).map((topic, i) => (
            <div key={topic.title} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0',
              borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
            }}>
              <span style={{ fontSize: 12, color: t.text }}>{topic.title}</span>
              <span style={{ fontSize: 11, fontFamily: t.mono, color: topic.trend === 'up' ? '#22c55e' : t.text3 }}>
                {topic.mentions}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      color: t.text,
      fontFamily: t.font,
      display: 'flex',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 640 }}>{children}</div>
    </div>
  );
}

function Card({ children, span = 1 }: { children: React.ReactNode; span?: number }) {
  return (
    <div style={{
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      padding: 20,
      gridColumn: span > 1 ? `span ${span}` : undefined,
    }}>
      {children}
    </div>
  );
}
