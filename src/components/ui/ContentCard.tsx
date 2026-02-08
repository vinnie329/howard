import SourcePill from './SourcePill';
import Tag from './Tag';

interface ContentCardProps {
  sourceName: string;
  sourceAvatar?: string;
  sourceSlug?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  title: string;
  summary: string;
  keyQuotes: string[];
  themes: string[];
  assetsMentioned?: string[];
  timestamp: string;
  platform: string;
  url?: string;
}

export default function ContentCard({
  sourceName,
  sourceAvatar,
  sourceSlug,
  sentiment,
  title,
  summary,
  keyQuotes,
  themes,
  assetsMentioned,
  timestamp,
  platform,
  url,
}: ContentCardProps) {
  const badgeColorMap: Record<string, string> = {
    bearish: 'badge-bearish',
    bullish: 'badge-bullish',
    neutral: 'badge-neutral',
    mixed: 'badge-neutral',
  };
  const badgeClass = `badge ${badgeColorMap[sentiment] || 'badge-neutral'}`;

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
        <SourcePill name={sourceName} avatarUrl={sourceAvatar} slug={sourceSlug} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{ fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              onClick={(e) => e.stopPropagation()}
            >
              {platform} ↗
            </a>
          ) : (
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              {platform}
            </span>
          )}
          <span className={badgeClass}>{sentiment}</span>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ marginBottom: 'var(--space-2)' }}>{title}</h2>

      {/* Summary */}
      {summary && (
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.5,
          margin: '0 0 var(--space-3)',
        }}>
          {summary}
        </p>
      )}

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

      {/* Assets mentioned */}
      {assetsMentioned && assetsMentioned.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 'var(--space-1)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-3)',
        }}>
          {assetsMentioned.map((asset, i) => (
            <span key={i} className="mono" style={{
              fontSize: 9,
              padding: '1px 5px',
              borderRadius: 2,
              background: 'var(--bg-surface)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}>
              {asset}
            </span>
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
