'use client';

import { useBriefingData, decode, timeAgo, sentimentColor, t } from '../_shared';

/* Variant E — Terminal
   Monospace everything. Data-dense. No cards, no borders, no radius.
   Just structured text on black. Feels like reading a Bloomberg terminal. */

export default function BriefingE() {
  const { content, outlooks, trending, predictions, history, loading } = useBriefingData();

  if (loading) return <Shell><span style={{ color: t.text3 }}>loading...</span></Shell>;

  const today = new Date().toISOString().split('T')[0];
  const bullish = predictions.filter((p) => p.sentiment === 'bullish').length;
  const bearish = predictions.filter((p) => p.sentiment === 'bearish').length;
  const neutral = predictions.filter((p) => p.sentiment === 'neutral' || p.sentiment === 'mixed').length;

  return (
    <Shell>
      <div style={{ color: t.text3, marginBottom: 4 }}>HOWARD DAILY BRIEFING</div>
      <div style={{ color: t.text, marginBottom: 24 }}>{today}</div>

      <div style={{ borderBottom: `1px solid ${t.borderLight}`, marginBottom: 16 }} />

      {/* Outlook table */}
      <div style={{ color: t.text3, marginBottom: 8 }}>OUTLOOK</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            {['HORIZON', 'TITLE', 'SENTIMENT', 'CONF'].map((h) => (
              <th key={h} style={{ textAlign: 'left', fontSize: 10, color: t.text3, padding: '4px 8px 4px 0', borderBottom: `1px solid ${t.border}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outlooks.map((o) => (
            <tr key={o.id}>
              <td style={{ padding: '6px 8px 6px 0', color: t.text3 }}>{o.time_horizon.toUpperCase()}</td>
              <td style={{ padding: '6px 8px 6px 0', color: t.text }}>{o.title}</td>
              <td style={{ padding: '6px 8px 6px 0', color: sentimentColor[o.sentiment] || t.text3 }}>
                {o.sentiment}
              </td>
              <td style={{ padding: '6px 8px 6px 0', color: t.text }}>{o.confidence}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Prediction balance */}
      <div style={{ color: t.text3, marginBottom: 8 }}>PREDICTIONS ({predictions.length} total)</div>
      <div style={{ marginBottom: 24 }}>
        <span style={{ color: '#22c55e' }}>BULL {bullish}</span>
        {'  '}
        <span style={{ color: '#ef4444' }}>BEAR {bearish}</span>
        {'  '}
        <span style={{ color: t.text3 }}>NTRL {neutral}</span>
      </div>

      {/* Changes */}
      {history.length > 0 && (
        <>
          <div style={{ color: t.text3, marginBottom: 8 }}>CHANGES</div>
          {history.slice(0, 4).map((h) => (
            <div key={h.id} style={{ marginBottom: 8 }}>
              <span style={{ color: t.text3 }}>[{h.time_horizon.toUpperCase()}] </span>
              <span style={{ color: t.text }}>{h.changes_summary[0]}</span>
              {h.previous_sentiment !== h.new_sentiment && (
                <span style={{ color: t.text2 }}> ({h.previous_sentiment}&rarr;{h.new_sentiment})</span>
              )}
            </div>
          ))}
          <div style={{ marginBottom: 24 }} />
        </>
      )}

      {/* Content feed */}
      <div style={{ color: t.text3, marginBottom: 8 }}>NEW CONTENT ({content.length})</div>
      {content.slice(0, 8).map((item) => (
        <div key={item.id} style={{ marginBottom: 6 }}>
          <span style={{ color: t.text3 }}>{timeAgo(item.published_at).padEnd(4)}</span>
          <span style={{ color: t.text2 }}>{item.source.name.padEnd(20)}</span>
          <span style={{ color: t.text }}>{decode(item.analysis.display_title || item.title)}</span>
        </div>
      ))}

      <div style={{ borderBottom: `1px solid ${t.borderLight}`, margin: '24px 0 16px' }} />

      {/* Trending */}
      <div style={{ color: t.text3, marginBottom: 8 }}>TRENDING</div>
      {trending.slice(0, 6).map((topic) => (
        <div key={topic.title} style={{ marginBottom: 4 }}>
          <span style={{ color: topic.trend === 'up' ? '#22c55e' : topic.trend === 'down' ? '#ef4444' : t.text3 }}>
            {topic.trend === 'up' ? '▲' : topic.trend === 'down' ? '▼' : '–'}
          </span>
          {'  '}
          <span style={{ color: t.text }}>{topic.title}</span>
          <span style={{ color: t.text3 }}> ({topic.mentions})</span>
        </div>
      ))}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: t.text,
      fontFamily: t.mono,
      fontSize: 12,
      lineHeight: 1.5,
      padding: '48px 32px',
    }}>
      <div style={{ maxWidth: 800 }}>{children}</div>
    </div>
  );
}
