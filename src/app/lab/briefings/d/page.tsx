'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel, t } from '../_shared';

/* Variant D — Magazine
   Large hero card for the primary thesis, smaller supporting cards below.
   Editorial feel. The most important thing is big. Everything else supports it. */

export default function BriefingD() {
  const { content, outlooks, history, loading } = useBriefingData();

  if (loading) return <Shell><p style={{ color: t.text3 }}>Loading...</p></Shell>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const primary = outlooks.find((o) => o.time_horizon === 'short');
  const others = outlooks.filter((o) => o.time_horizon !== 'short');
  const latestChange = history[0];

  return (
    <Shell>
      <div style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, marginBottom: 4 }}>{today}</div>

      {/* Hero — primary thesis */}
      {primary && (
        <div style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: '36px 32px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              fontSize: 10, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: 999,
              background: `${sentimentColor[primary.sentiment]}18`,
              color: sentimentColor[primary.sentiment] || t.text3,
              border: `1px solid ${sentimentColor[primary.sentiment]}30`,
            }}>
              {primary.sentiment}
            </span>
            <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>{primary.confidence}%</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.2 }}>
            {primary.title}
          </h1>
          <p style={{ fontSize: 14, color: t.text2, lineHeight: 1.6, margin: 0 }}>
            {primary.subtitle}
          </p>
          {primary.key_themes.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
              {primary.key_themes.slice(0, 6).map((theme, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 999,
                  background: t.surface, border: `1px solid ${t.border}`, color: t.text2,
                }}>
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Supporting grid — 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Other horizons */}
        {others.map((o) => (
          <MiniCard key={o.id}>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {horizonLabel[o.time_horizon]}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>{o.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[o.sentiment] || t.text3 }} />
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>{o.confidence}%</span>
            </div>
          </MiniCard>
        ))}

        {/* Latest change */}
        {latestChange && (
          <MiniCard>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Updated
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: t.text }}>
              {latestChange.changes_summary[0]}
            </div>
          </MiniCard>
        )}
      </div>

      {/* New intelligence — compact list */}
      <div style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 10, fontFamily: t.mono, color: t.text3,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '12px 20px',
          borderBottom: `1px solid ${t.border}`,
        }}>
          New Intelligence
        </div>
        {content.slice(0, 5).map((item, i) => (
          <div key={item.id} style={{
            padding: '12px 20px',
            borderBottom: i < 4 ? `1px solid ${t.border}` : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>
                {decode(item.analysis.display_title || item.title)}
              </div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{item.source.name}</div>
            </div>
            <span style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, whiteSpace: 'nowrap', paddingTop: 2 }}>
              {timeAgo(item.published_at)}
            </span>
          </div>
        ))}
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
      <div style={{ width: '100%', maxWidth: 720 }}>{children}</div>
    </div>
  );
}

function MiniCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      padding: 16,
    }}>
      {children}
    </div>
  );
}
