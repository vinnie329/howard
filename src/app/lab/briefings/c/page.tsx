'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel, t } from '../_shared';

/* Variant C — Bento
   Strict 2x3 grid. Every card is the same size. Six pieces of information,
   equal weight. Very structured, very balanced. */

export default function BriefingC() {
  const { content, outlooks, trending, predictions, history, loading } = useBriefingData();

  if (loading) return <Shell><p style={{ color: t.text3 }}>Loading...</p></Shell>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const bullish = predictions.filter((p) => p.sentiment === 'bullish').length;
  const bearish = predictions.filter((p) => p.sentiment === 'bearish').length;
  const shortOutlook = outlooks.find((o) => o.time_horizon === 'short');

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Briefing</h1>
        <span style={{ fontSize: 12, fontFamily: t.mono, color: t.text3 }}>{today}</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: 12,
        maxWidth: 680,
      }}>
        {/* 1. Thesis */}
        <BentoCard>
          <Label>Thesis</Label>
          {shortOutlook ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
                {shortOutlook.title}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: sentimentColor[shortOutlook.sentiment] || t.text3,
                }} />
                <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>
                  {shortOutlook.sentiment} &middot; {shortOutlook.confidence}%
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: t.text3, fontSize: 12 }}>No outlook.</div>
          )}
        </BentoCard>

        {/* 2. Sentiment balance */}
        <BentoCard>
          <Label>Sentiment</Label>
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', marginTop: 4 }}>
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: t.mono, color: '#22c55e' }}>{bullish}</span>
              <div style={{ fontSize: 10, color: t.text3, marginTop: 2 }}>bullish</div>
            </div>
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: t.mono, color: '#ef4444' }}>{bearish}</span>
              <div style={{ fontSize: 10, color: t.text3, marginTop: 2 }}>bearish</div>
            </div>
          </div>
        </BentoCard>

        {/* 3. Latest change */}
        <BentoCard>
          <Label>Latest Change</Label>
          {history[0] ? (
            <div style={{ fontSize: 13, lineHeight: 1.5, color: t.text }}>
              {history[0].changes_summary[0]}
            </div>
          ) : (
            <div style={{ color: t.text3, fontSize: 12 }}>No recent changes.</div>
          )}
        </BentoCard>

        {/* 4. Trending */}
        <BentoCard>
          <Label>Trending</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {trending.slice(0, 4).map((topic) => (
              <div key={topic.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: t.text }}>{topic.title}</span>
                <span style={{ fontSize: 10, fontFamily: t.mono, color: topic.trend === 'up' ? '#22c55e' : t.text3 }}>
                  {topic.mentions}
                </span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* 5. New content */}
        <BentoCard>
          <Label>New Intelligence</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {content.slice(0, 3).map((item) => (
              <div key={item.id}>
                <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
                  {decode(item.analysis.display_title || item.title)}
                </div>
                <div style={{ fontSize: 10, color: t.text3, marginTop: 1 }}>
                  {item.source.name} &middot; {timeAgo(item.published_at)}
                </div>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* 6. Horizons */}
        <BentoCard>
          <Label>All Horizons</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {outlooks.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: sentimentColor[o.sentiment] || t.text3, flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, flex: 1 }}>{horizonLabel[o.time_horizon]}</span>
                <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>{o.confidence}%</span>
              </div>
            ))}
          </div>
        </BentoCard>
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
      <div style={{ width: '100%', maxWidth: 680 }}>{children}</div>
    </div>
  );
}

function BentoCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      padding: 20,
      minHeight: 120,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontFamily: t.mono,
      color: t.text3,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}
