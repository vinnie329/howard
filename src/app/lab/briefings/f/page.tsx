'use client';

import { useBriefingData, decode, sentimentColor, horizonLabel, t } from '../_shared';

/* Variant F — Sparse Canvas
   Generous whitespace. Cards float on a blank canvas with asymmetric placement.
   Nothing touches. Feels open and calm. Each piece of info breathes. */

export default function BriefingF() {
  const { content, outlooks, trending, predictions, history, loading } = useBriefingData();

  if (loading) return <Canvas><p style={{ color: t.text3, textAlign: 'center', marginTop: '30vh' }}>Loading...</p></Canvas>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const short = outlooks.find((o) => o.time_horizon === 'short');
  const medium = outlooks.find((o) => o.time_horizon === 'medium');
  const long = outlooks.find((o) => o.time_horizon === 'long');
  const bullish = predictions.filter((p) => p.sentiment === 'bullish').length;
  const bearish = predictions.filter((p) => p.sentiment === 'bearish').length;

  return (
    <Canvas>
      {/* Top left — date and greeting */}
      <div style={{ position: 'absolute', top: 48, left: 48 }}>
        <div style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, marginBottom: 4 }}>{today}</div>
        <div style={{ fontSize: 14, color: t.text2 }}>Daily Briefing</div>
      </div>

      {/* Center canvas — floating cards */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 800,
        height: 600,
      }}>
        {/* Primary thesis — center */}
        {short && (
          <FloatingCard style={{ top: 0, left: '50%', transform: 'translateX(-50%)', width: 340 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: sentimentColor[short.sentiment] || t.text3,
              }} />
              <span style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Near-term
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6 }}>
              {short.title}
            </div>
            <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.5 }}>
              {short.subtitle}
            </div>
            <div style={{ fontSize: 11, fontFamily: t.mono, color: t.text3, marginTop: 10 }}>{short.confidence}% conviction</div>
          </FloatingCard>
        )}

        {/* Medium — left */}
        {medium && (
          <FloatingCard style={{ top: 200, left: 0, width: 260 }}>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {horizonLabel[medium.time_horizon]}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>{medium.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[medium.sentiment] || t.text3 }} />
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>{medium.confidence}%</span>
            </div>
          </FloatingCard>
        )}

        {/* Long — right */}
        {long && (
          <FloatingCard style={{ top: 180, right: 0, width: 260 }}>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {horizonLabel[long.time_horizon]}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>{long.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[long.sentiment] || t.text3 }} />
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.text3 }}>{long.confidence}%</span>
            </div>
          </FloatingCard>
        )}

        {/* Sentiment — bottom left */}
        <FloatingCard style={{ bottom: 60, left: 40, width: 160 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: t.mono, color: '#22c55e' }}>{bullish}</span>
              <div style={{ fontSize: 9, color: t.text3, marginTop: 2 }}>bullish</div>
            </div>
            <div>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: t.mono, color: '#ef4444' }}>{bearish}</span>
              <div style={{ fontSize: 9, color: t.text3, marginTop: 2 }}>bearish</div>
            </div>
          </div>
        </FloatingCard>

        {/* Latest change — bottom center */}
        {history[0] && (
          <FloatingCard style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 300 }}>
            <div style={{ fontSize: 10, fontFamily: t.mono, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Latest
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: t.text }}>
              {history[0].changes_summary[0]}
            </div>
          </FloatingCard>
        )}

        {/* New content — bottom right */}
        <FloatingCard style={{ bottom: 40, right: 0, width: 240 }}>
          <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            New
          </div>
          {content.slice(0, 3).map((item) => (
            <div key={item.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
                {decode(item.analysis.display_title || item.title)}
              </div>
              <div style={{ fontSize: 10, color: t.text3, marginTop: 1 }}>{item.source.name}</div>
            </div>
          ))}
        </FloatingCard>

        {/* Trending — top right corner */}
        <FloatingCard style={{ top: 20, right: 20, width: 140 }}>
          <div style={{ fontSize: 10, fontFamily: t.mono, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Trending
          </div>
          {trending.slice(0, 4).map((topic) => (
            <div key={topic.title} style={{ fontSize: 11, color: t.text2, marginBottom: 3 }}>
              {topic.title}
            </div>
          ))}
        </FloatingCard>
      </div>
    </Canvas>
  );
}

function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: t.bg,
      color: t.text,
      fontFamily: t.font,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {children}
    </div>
  );
}

function FloatingCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute',
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: 14,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}
