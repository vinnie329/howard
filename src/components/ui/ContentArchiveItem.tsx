'use client';

import { useState } from 'react';
import Tag from './Tag';

interface ContentArchiveItemProps {
  title: string;
  platform: string;
  url?: string;
  publishedAt: string;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  summary?: string;
  keyQuotes?: string[];
  themes?: string[];
}

const badgeColorMap: Record<string, string> = {
  bearish: 'badge-bearish',
  bullish: 'badge-bullish',
  neutral: 'badge-neutral',
  mixed: 'badge-neutral',
};

export default function ContentArchiveItem({
  title,
  platform,
  url,
  publishedAt,
  sentiment,
  summary,
  keyQuotes,
  themes,
}: ContentArchiveItemProps) {
  const [expanded, setExpanded] = useState(false);
  const badgeClass = `badge ${badgeColorMap[sentiment] || 'badge-neutral'}`;
  const date = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {platform}
        </span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <span className={badgeClass} style={{ flexShrink: 0 }}>{sentiment}</span>
        <span className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {date}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{ fontSize: 9, color: 'var(--text-tertiary)', textDecoration: 'none', flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            ↗
          </a>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
          {summary && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 var(--space-3)' }}>
              {summary}
            </p>
          )}
          {keyQuotes && keyQuotes.length > 0 && (
            <div style={{ borderLeft: '2px solid var(--border-light)', paddingLeft: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              {keyQuotes.map((quote, i) => (
                <p key={i} style={{
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  lineHeight: 1.5,
                  margin: i === 0 ? 0 : 'var(--space-1) 0 0',
                  fontStyle: 'italic',
                }}>
                  &ldquo;<strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{quote}</strong>&rdquo;
                </p>
              ))}
            </div>
          )}
          {themes && themes.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {themes.map((theme, i) => (
                <Tag key={i} label={theme} highlight={i === 0} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
