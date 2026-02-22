'use client';

import ContentCard from '@/components/ui/ContentCard';
import DailyPulse from '@/components/ui/DailyPulse';
import '../lab.css';
import Link from 'next/link';

/* ---- Vertical Card variant ---- */

interface VerticalCardProps {
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  title: string;
  sourceName: string;
  timestamp: string;
  themes: string[];
  platform?: string;
}

const sentimentAccent: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: '#888888',
  mixed: '#888888',
};

function VerticalCard({ sentiment, title, sourceName, timestamp, themes, platform }: VerticalCardProps) {
  const accent = sentimentAccent[sentiment];

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      width: 260,
    }}>
      {/* Cover area — placeholder for theme symbols */}
      <div style={{
        height: 140,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Source pill + sentiment badge overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          {/* Source pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '4px 8px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}>
              {sourceName.charAt(0)}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{sourceName}</span>
          </div>

          {/* Sentiment badge */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: 'var(--radius-pill)',
              border: `1px solid ${accent}33`,
              color: accent,
              background: `${accent}15`,
            }}>
              {sentiment}
            </span>
          </div>
        </div>

        {/* Subtle accent glow */}
        <div style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: accent,
          opacity: 0.06,
          filter: 'blur(24px)',
        }} />
        {/* Theme label as placeholder */}
        <span style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginTop: 'var(--space-6)',
        }}>
          {themes[0] || 'Uncategorized'}
        </span>
      </div>

      {/* Body — headline + timestamp */}
      <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.45,
          margin: 0,
          color: 'var(--text-primary)',
          flex: 1,
        }}>
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {timestamp}
          </span>
          {platform && (
            <>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>&middot;</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {platform}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Section data ---- */

const componentSections: Array<{
  name: string;
  render: () => React.ReactNode;
  count: number;
}> = [
  {
    name: 'DailyPulse',
    count: 1,
    render: () => {
      return (
        <div className="lab-component-grid">
          <div className="lab-component-card" style={{ gridColumn: '1 / -1', maxWidth: 720 }}>
            <div className="lab-component-card-label">Live — auto-rotates headlines</div>
            <div className="lab-component-card-body" style={{ padding: 'var(--space-4)' }}>
              <DailyPulse />
            </div>
          </div>
        </div>
      );
    },
  },
  {
    name: 'ContentCard',
    count: 3,
    render: () => {
      const variants = [
        {
          label: 'Bullish',
          props: {
            sourceName: 'Howard Marks',
              sentiment: 'bullish' as const,
            title: 'Credit Markets Showing Unusual Strength in Q1',
            summary: 'Spreads have tightened beyond historical norms, suggesting the market is pricing in a soft landing scenario.',
            themes: ['Credit', 'Fixed Income', 'Macro'],
            assetsMentioned: ['HYG', 'LQD', 'TLT'],
            timestamp: '2h ago',
            platform: 'Memo',
          },
        },
        {
          label: 'Bearish',
          props: {
            sourceName: 'Michael Burry',
              sentiment: 'bearish' as const,
            title: 'Liquidity Withdrawal Accelerating Faster Than Consensus',
            summary: 'Global M2 contraction continues and central bank balance sheets are shrinking at the fastest pace since 2022.',
            themes: ['Liquidity', 'Central Banks'],
            assetsMentioned: ['SPY', 'QQQ'],
            timestamp: '5h ago',
            platform: 'X',
          },
        },
        {
          label: 'Neutral',
          props: {
            sourceName: 'Dylan Patel',
              sentiment: 'neutral' as const,
            title: 'TSMC Capacity Allocation Shifts Signal Changing Demand Mix',
            summary: 'Advanced node utilization remains high but the customer mix is shifting from mobile to AI inference workloads.',
            themes: ['Semiconductors', 'AI Infrastructure'],
            assetsMentioned: ['TSM', 'NVDA', 'AVGO'],
            timestamp: '1d ago',
            platform: 'Substack',
          },
        },
      ];
      return (
        <div className="lab-component-grid">
          {variants.map((v) => (
            <div key={v.label} className="lab-component-card">
              <div className="lab-component-card-label">{v.label}</div>
              <div className="lab-component-card-body">
                <ContentCard {...v.props} />
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    name: 'VerticalCard',
    count: 3,
    render: () => {
      const variants = [
        {
          label: 'Bullish',
          props: {
            sentiment: 'bullish' as const,
            title: 'Credit Markets Showing Unusual Strength in Q1',
            sourceName: 'Howard Marks',
            timestamp: '2h ago',
            themes: ['Credit'],
            platform: 'Memo',
          },
        },
        {
          label: 'Bearish',
          props: {
            sentiment: 'bearish' as const,
            title: 'Liquidity Withdrawal Accelerating Faster Than Consensus',
            sourceName: 'Michael Burry',
            timestamp: '5h ago',
            themes: ['Liquidity'],
            platform: 'X',
          },
        },
        {
          label: 'Neutral',
          props: {
            sentiment: 'neutral' as const,
            title: 'TSMC Capacity Allocation Shifts Signal Changing Demand Mix',
            sourceName: 'Dylan Patel',
            timestamp: '1d ago',
            themes: ['Semiconductors'],
            platform: 'Substack',
          },
        },
      ];
      return (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {variants.map((v) => (
            <div key={v.label} className="lab-component-card" style={{ width: 'auto' }}>
              <div className="lab-component-card-label">{v.label}</div>
              <div className="lab-component-card-body" style={{ padding: 0 }}>
                <VerticalCard {...v.props} />
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
];

export default function ComponentsIndex() {
  return (
    <div className="lab">
      <Link href="/lab" className="lab-back">
        &larr; Lab
      </Link>
      <div className="lab-title">
        Components <span>({componentSections.length})</span>
      </div>
      {componentSections.map((section) => (
        <div key={section.name} className="lab-component-section">
          <div className="lab-component-section-header">
            <h3>{section.name}</h3>
            <span className="count">{section.count}</span>
          </div>
          {section.render()}
        </div>
      ))}
    </div>
  );
}
