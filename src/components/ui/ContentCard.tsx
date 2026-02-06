import SourcePill from './SourcePill';
import Tag from './Tag';

interface ContentCardProps {
  sourceName: string;
  sourceAvatar?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  title: string;
  summary: string;
  keyQuotes: string[];
  themes: string[];
  timestamp: string;
  platform: string;
}

export default function ContentCard({
  sourceName,
  sourceAvatar,
  sentiment,
  title,
  summary,
  keyQuotes,
  themes,
  timestamp,
  platform,
}: ContentCardProps) {
  const badgeClass = `badge badge-${sentiment}`;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
      }}>
        <SourcePill name={sourceName} avatarUrl={sourceAvatar} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {platform}
          </span>
          <span className={badgeClass}>{sentiment}</span>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ marginBottom: 'var(--space-2)' }}>{title}</h2>

      {/* Summary */}
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        lineHeight: 1.5,
        margin: '0 0 var(--space-3)',
      }}>
        {summary}
      </p>

      {/* Key quotes */}
      {keyQuotes.length > 0 && (
        <div style={{
          borderLeft: '2px solid var(--border-light)',
          paddingLeft: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}>
          {keyQuotes.map((quote, i) => (
            <p key={i} style={{
              color: 'var(--text-secondary)',
              fontSize: 12,
              lineHeight: 1.5,
              margin: i === 0 ? 0 : 'var(--space-2) 0 0',
              fontStyle: 'italic',
            }}>
              &ldquo;<strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{quote}</strong>&rdquo;
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {themes.map((theme, i) => (
            <Tag key={i} label={theme} highlight={i === 0} />
          ))}
        </div>
        <span className="mono" style={{ fontSize: 10, flexShrink: 0 }}>
          {timestamp}
        </span>
      </div>
    </div>
  );
}
