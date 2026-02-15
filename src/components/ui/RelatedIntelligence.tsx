'use client';

import { useState, useEffect } from 'react';

interface RelatedItem {
  id: string;
  type: 'content' | 'analysis' | 'prediction' | 'source';
  title: string;
  summary: string | null;
  source_id: string | null;
  content_id: string | null;
  similarity: number;
  source_name?: string;
  source_slug?: string;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  content: 'var(--accent)',
  analysis: 'var(--accent)',
  prediction: '#22C55E',
  source: '#888888',
};

export default function RelatedIntelligence({ contentId }: { contentId: string }) {
  const [items, setItems] = useState<RelatedItem[]>([]);

  useEffect(() => {
    fetch(`/api/related/${contentId}?limit=5&threshold=0.2`)
      .then((res) => res.json())
      .then((data) => setItems(data.results || []))
      .catch(() => {});
  }, [contentId]);

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div className="label" style={{ marginBottom: 'var(--space-3)' }}>
        Related Intelligence
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((item) => {
          const href =
            item.type === 'content' || item.type === 'analysis'
              ? `/content/${item.type === 'analysis' ? item.content_id : item.id}`
              : item.type === 'source' && item.source_slug
                ? `/sources/${item.source_slug}`
                : null;

          const content = (
            <div
              style={{
                padding: 'var(--space-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                cursor: href ? 'pointer' : 'default',
                transition: 'border-color 0.15s ease',
              }}
            >
              <span style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: `${TYPE_BADGE_COLORS[item.type]}20`,
                color: TYPE_BADGE_COLORS[item.type],
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                marginTop: 1,
              }}>
                {item.type}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.title}
                </div>
                {item.source_name && (
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    display: 'inline-block',
                    marginTop: 2,
                  }}>
                    {item.source_name}
                  </span>
                )}
              </div>

              <span className="mono" style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                marginTop: 1,
              }}>
                {Math.round(item.similarity * 100)}%
              </span>
            </div>
          );

          return href ? (
            <a key={`${item.type}-${item.id}`} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {content}
            </a>
          ) : (
            <div key={`${item.type}-${item.id}`}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
