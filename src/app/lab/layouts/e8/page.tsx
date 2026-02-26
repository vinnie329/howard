'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* E8 — Dual Tab Rows
   Two levels of tabs: primary (content type) and secondary (filter/sort).
   Primary tabs switch content. Secondary tabs filter within the active view.
   Maximum brutalist: everything is a bordered grid cell. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

type PrimaryTab = 'feed' | 'outlook' | 'predictions';
type SentFilter = 'all' | 'bullish' | 'bearish' | 'mixed';

export default function LayoutE8() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [primary, setPrimary] = useState<PrimaryTab>('feed');
  const [sentFilter, setSentFilter] = useState<SentFilter>('all');

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, fontFamily: v.mono, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const sentFilters: SentFilter[] = ['all', 'bullish', 'bearish', 'mixed'];
  const filteredContent = sentFilter === 'all' ? content : content.filter((c) => c.analysis.sentiment_overall === sentFilter);
  const filteredPreds = sentFilter === 'all' ? predictions : predictions.filter((p) => p.sentiment === sentFilter);

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14, lineHeight: 1.3 }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'sticky', top: 0, background: v.bg, zIndex: 100 }}>
        <div><strong>Howard</strong> <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4, marginLeft: 8 }}>Intelligence</span></div>
        <div style={{ display: 'flex', gap: 16 }}>
          {outlooks.map((o) => (
            <span key={o.id} style={{ fontFamily: v.mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[o.sentiment] }} />
              {horizonLabel[o.time_horizon].charAt(0)} {o.confidence}%
            </span>
          ))}
        </div>
      </header>

      {/* Primary tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${v.line}`, position: 'sticky', top: 53, background: v.bg, zIndex: 95 }}>
        {(['feed', 'outlook', 'predictions'] as PrimaryTab[]).map((t) => (
          <button key={t} onClick={() => { setPrimary(t); setSentFilter('all'); }} style={{
            background: primary === t ? v.ink : 'transparent',
            color: primary === t ? v.bg : v.ink,
            border: 'none', borderRight: `1px solid ${v.line}`,
            padding: '14px 24px', fontFamily: v.sans, fontSize: 14, cursor: 'pointer',
            textAlign: 'left', textTransform: 'capitalize',
            transition: 'background 0.2s, color 0.2s',
          }}>
            {t === 'feed' ? 'Intelligence' : t}
          </button>
        ))}
      </div>

      {/* Secondary filter tabs (sentiment) */}
      {(primary === 'feed' || primary === 'predictions') && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${v.line}`, position: 'sticky', top: 103, background: v.bg, zIndex: 90 }}>
          {sentFilters.map((s) => (
            <button key={s} onClick={() => setSentFilter(s)} style={{
              background: 'none', border: 'none', borderRight: `1px solid ${v.lineLight}`,
              padding: '8px 20px', fontFamily: v.mono, fontSize: 10, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              color: sentFilter === s ? v.ink : v.lineLight,
              borderBottom: sentFilter === s ? `2px solid ${v.ink}` : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'color 0.15s',
            }}>
              {s !== 'all' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[s] }} />}
              {s}
              <span style={{ opacity: 0.4 }}>
                {s === 'all'
                  ? (primary === 'feed' ? content.length : predictions.length)
                  : (primary === 'feed'
                    ? content.filter((c) => c.analysis.sentiment_overall === s).length
                    : predictions.filter((p) => p.sentiment === s).length
                  )
                }
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {primary === 'feed' && filteredContent.map((item, i) => {
        const title = decode(item.analysis.display_title || item.title);
        return (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1fr',
            padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, alignItems: 'baseline',
            cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
          >
            <span style={{ fontFamily: v.mono, fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>{title}</span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>{item.source.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
              <span style={{ fontFamily: v.mono, fontSize: 11, textTransform: 'uppercase' }}>{item.analysis.sentiment_overall}</span>
              <span style={{ fontFamily: v.mono, fontSize: 11, marginLeft: 'auto' }}>{timeAgo(item.published_at)}</span>
            </div>
          </div>
        );
      })}

      {primary === 'outlook' && outlooks.map((o) => (
        <div key={o.id} style={{ borderBottom: `1px solid ${v.line}` }}>
          <div style={{ padding: '2.5rem 2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
            <div>
              <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4 }}>{horizonLabel[o.time_horizon]} · {o.sentiment} · {o.confidence}%</span>
              <h2 style={{ fontSize: '3.5vw', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 0.9, marginTop: 8, marginBottom: 16 }}>{o.title}</h2>
              <p style={{ opacity: 0.6, lineHeight: 1.6, maxWidth: '50ch' }}>{o.subtitle}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {o.positioning.slice(0, 4).map((pos, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${v.lineLight}`, fontSize: 12, lineHeight: 1.5, opacity: 0.6 }}>
                  <span style={{ fontFamily: v.mono, fontSize: 9, opacity: 0.4, marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                  {pos.length > 120 ? pos.slice(0, 120) + '...' : pos}
                </div>
              ))}
            </div>
          </div>
          {/* Key themes row */}
          <div style={{ borderTop: `1px solid ${v.line}`, display: 'flex', padding: '8px 2rem', gap: 12, overflowX: 'auto' }}>
            {o.key_themes.slice(0, 8).map((theme) => (
              <span key={theme} style={{ fontFamily: v.mono, fontSize: 9, padding: '3px 8px', border: `1px solid ${v.lineLight}`, textTransform: 'uppercase', flexShrink: 0 }}>{theme}</span>
            ))}
          </div>
        </div>
      ))}

      {primary === 'predictions' && filteredPreds.map((pred, i) => (
        <div key={pred.id} style={{
          padding: '1rem 2rem', borderBottom: `1px solid ${v.line}`, display: 'grid', gridTemplateColumns: '40px 6px 1fr auto', gap: 12, alignItems: 'start',
          cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; }}
        >
          <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sentimentColor[pred.sentiment], marginTop: 5 }} />
          <div>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pred.claim}</div>
            {pred.assets_mentioned.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {pred.assets_mentioned.slice(0, 4).map((a) => (
                  <span key={a} style={{ fontFamily: v.mono, fontSize: 9, padding: '1px 5px', border: `1px solid ${v.lineLight}`, textTransform: 'uppercase' }}>{a}</span>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5, whiteSpace: 'nowrap' }}>{pred.confidence} · {pred.time_horizon}</span>
        </div>
      ))}

      {/* Footer */}
      <footer style={{ borderTop: `2px solid ${v.ink}`, padding: '2rem', display: 'flex', justifyContent: 'space-between', fontFamily: v.mono, fontSize: 9, opacity: 0.4, textTransform: 'uppercase' }}>
        <span>Howard Intelligence System</span>
        <span>{content.length} items · {predictions.length} predictions · {trending.length} themes</span>
      </footer>
    </div>
  );
}
