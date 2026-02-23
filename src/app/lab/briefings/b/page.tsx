'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel, t } from '../_shared';

/* Variant B — Morning Brief
   Narrow centered column. Reads like a morning newsletter.
   Each section is a simple block with a label and content. No grid. */

export default function BriefingB() {
  const { content, outlooks, trending, predictions, history, loading } = useBriefingData();

  if (loading) return <Shell><p style={{ color: t.text3 }}>Loading...</p></Shell>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const highConviction = predictions.filter((p) => p.confidence === 'high').slice(0, 3);

  return (
    <Shell>
      <div style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, marginBottom: 8 }}>{today}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Good morning.</h1>
      <p style={{ fontSize: 14, color: t.text2, lineHeight: 1.6, margin: '0 0 40px' }}>
        {content.length} new pieces of intelligence captured. {outlooks.length} outlook{outlooks.length !== 1 ? 's' : ''} updated.
      </p>

      {/* Outlook snapshot */}
      <Section label="Thesis Snapshot">
        {outlooks.map((o) => (
          <div key={o.id} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: sentimentColor[o.sentiment] || t.text3,
              }} />
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>
                {horizonLabel[o.time_horizon]} &middot; {o.confidence}%
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{o.title}</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 2, lineHeight: 1.4 }}>{o.subtitle}</div>
          </div>
        ))}
      </Section>

      {/* Recent changes */}
      {history.length > 0 && (
        <Section label="What Changed">
          {history.slice(0, 3).map((h) => (
            <div key={h.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>{h.changes_summary[0]}</div>
              {h.previous_sentiment !== h.new_sentiment && (
                <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text2 }}>
                  {h.previous_sentiment} &rarr; {h.new_sentiment}
                </span>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* High conviction predictions */}
      {highConviction.length > 0 && (
        <Section label="High Conviction Calls">
          {highConviction.map((p) => (
            <div key={p.id} style={{
              padding: '12px 0',
              borderBottom: `1px solid ${t.border}`,
            }}>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{p.claim}</div>
              <div style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, marginTop: 4 }}>
                {p.sentiment} &middot; {p.time_horizon}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* New intelligence */}
      <Section label="New Intelligence">
        {content.slice(0, 5).map((item) => (
          <div key={item.id} style={{
            padding: '12px 0',
            borderBottom: `1px solid ${t.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                {decode(item.analysis.display_title || item.title)}
              </div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{item.source.name}</div>
            </div>
            <span style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, whiteSpace: 'nowrap', paddingTop: 2 }}>
              {timeAgo(item.published_at)}
            </span>
          </div>
        ))}
      </Section>

      {/* Trending */}
      <Section label="Trending Themes">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {trending.slice(0, 8).map((topic) => (
            <span key={topic.title} style={{
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              background: t.card,
              border: `1px solid ${t.border}`,
              color: t.text2,
            }}>
              {topic.title}
            </span>
          ))}
        </div>
      </Section>
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
      padding: '64px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        fontSize: 10,
        fontFamily: t.mono,
        color: t.text3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 12,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
