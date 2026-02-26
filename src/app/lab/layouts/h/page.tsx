'use client';

import { useState } from 'react';
import { useBriefingData, decode, timeAgo, sentimentColor, horizonLabel } from '../../briefings/_shared';

/* Variant H — Slider Panels
   Full-width horizontal panels that slide/expand on click.
   Inspired by the "controls" section — large type, interactive sliders,
   everything in stacked bordered sections. */

const v = {
  bg: '#E4E3E0',
  ink: '#141414',
  line: '#141414',
  lineLight: '#c8c4bc',
  accent: '#FF4800',
  mono: '"Courier New", Courier, monospace',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default function LayoutH() {
  const { content, outlooks, trending, predictions, loading } = useBriefingData();
  const [expandedSection, setExpandedSection] = useState<string | null>('intelligence');

  if (loading) return <div style={{ minHeight: '100vh', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: v.mono, fontSize: 12 }}>Loading...</div>;

  const sections = [
    { id: 'outlooks', label: 'Outlooks', count: outlooks.length },
    { id: 'intelligence', label: 'Captured Intelligence', count: content.length },
    { id: 'predictions', label: 'Predictions', count: predictions.length },
    { id: 'trending', label: 'Trending Themes', count: trending.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.ink, fontFamily: v.sans, fontSize: 14 }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${v.line}`, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <strong style={{ fontSize: 16 }}>Howard</strong>
          <span style={{ fontFamily: v.mono, fontSize: 10, marginLeft: 12, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Intelligence System</span>
        </div>
        <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </header>

      {/* Accordion sections */}
      {sections.map((section) => {
        const isOpen = expandedSection === section.id;
        return (
          <section key={section.id} style={{ borderBottom: `1px solid ${v.line}` }}>
            {/* Section header */}
            <button
              onClick={() => setExpandedSection(isOpen ? null : section.id)}
              style={{
                width: '100%',
                background: isOpen ? v.ink : 'transparent',
                color: isOpen ? v.bg : v.ink,
                border: 'none',
                padding: '1.25rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontFamily: v.sans,
                fontSize: 14,
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => { if (!isOpen) { e.currentTarget.style.background = v.ink; e.currentTarget.style.color = v.bg; } }}
              onMouseLeave={(e) => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = v.ink; } }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.5 }}>{String(sections.indexOf(section) + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 18, fontWeight: 400 }}>{section.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: v.mono, fontSize: 11, opacity: 0.6 }}>{section.count} items</span>
                <span style={{ fontSize: 18, transition: 'transform 0.3s', transform: isOpen ? 'rotate(45deg)' : 'none' }}>+</span>
              </div>
            </button>

            {/* Section content */}
            {isOpen && (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {section.id === 'outlooks' && outlooks.map((o) => (
                  <div key={o.id} style={{ padding: '1.5rem 2rem', borderTop: `1px solid ${v.lineLight}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontFamily: v.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>{horizonLabel[o.time_horizon]}</span>
                      <span style={{ fontFamily: v.mono, fontSize: 10 }}>{o.sentiment} · {o.confidence}%</span>
                    </div>
                    <h3 style={{ fontSize: 24, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 6 }}>{o.title}</h3>
                    <p style={{ opacity: 0.6, lineHeight: 1.5, maxWidth: '65ch' }}>{o.subtitle}</p>
                  </div>
                ))}

                {section.id === 'intelligence' && content.map((item, i) => (
                  <div key={item.id} style={{
                    padding: '0.75rem 2rem',
                    borderTop: `1px solid ${v.lineLight}`,
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr auto',
                    gap: 12,
                    alignItems: 'baseline',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${v.ink}08`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{decode(item.analysis.display_title || item.title)}</div>
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>{item.source.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[item.analysis.sentiment_overall] }} />
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.5 }}>{timeAgo(item.published_at)}</span>
                    </div>
                  </div>
                ))}

                {section.id === 'predictions' && predictions.slice(0, 12).map((pred) => (
                  <div key={pred.id} style={{ padding: '0.75rem 2rem', borderTop: `1px solid ${v.lineLight}`, display: 'flex', gap: 12 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sentimentColor[pred.sentiment], flexShrink: 0, marginTop: 6 }} />
                    <div>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{pred.claim.length > 120 ? pred.claim.slice(0, 120) + '...' : pred.claim}</div>
                      <span style={{ fontFamily: v.mono, fontSize: 10, opacity: 0.4 }}>{pred.confidence} · {pred.time_horizon}</span>
                    </div>
                  </div>
                ))}

                {section.id === 'trending' && trending.map((topic, i) => (
                  <div key={topic.title} style={{ padding: '0.5rem 2rem', borderTop: `1px solid ${v.lineLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span>{String(i + 1).padStart(2, '0')}. {topic.title}</span>
                    <span style={{ fontFamily: v.mono, fontSize: 11, color: topic.trend === 'up' ? '#006600' : topic.trend === 'down' ? '#990000' : v.ink }}>{topic.mentions}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
