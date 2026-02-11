'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentById, type ContentDetail } from '@/lib/data';
import SourcePill from '@/components/ui/SourcePill';
import Tag from '@/components/ui/Tag';

function decodeEntities(text: string): string {
  const el = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (el) {
    el.innerHTML = text;
    return el.value;
  }
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      getContentById(id).then((result) => {
        setData(result);
        setLoading(false);
      });
    }
  }, [params.id]);

  if (loading) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Data Feed</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Loading...</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1 }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading...</span>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="top-bar">
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Data Feed</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12 }}>Not Found</span>
        </div>
        <div style={{ padding: 'var(--space-6)', flex: 1 }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Content not found.</p>
        </div>
      </>
    );
  }

  const { source, analysis, predictions } = data;
  const title = decodeEntities(analysis.display_title || data.title);
  const publishedDate = new Date(data.published_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const badgeColorMap: Record<string, string> = {
    bearish: 'badge-bearish',
    bullish: 'badge-bullish',
    neutral: 'badge-neutral',
    mixed: 'badge-neutral',
  };
  const badgeClass = `badge ${badgeColorMap[analysis.sentiment_overall] || 'badge-neutral'}`;

  return (
    <>
      {/* Breadcrumb */}
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <a href="/" style={{ color: 'var(--text-tertiary)', fontSize: 12, textDecoration: 'none' }}>Data Feed</a>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, maxWidth: 800, margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 'var(--space-4)',
          }}
        >
          &larr; Back to feed
        </button>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <SourcePill name={source.name} slug={source.slug} />
            <span className={badgeClass}>{analysis.sentiment_overall}</span>
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'none' }}
              >
                {data.platform} ↗
              </a>
            )}
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, marginBottom: 'var(--space-2)' }}>
            {title}
          </h1>

          <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {publishedDate}
          </span>
        </div>

        {/* Summary */}
        {analysis.summary && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Summary</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Key Quotes */}
        {analysis.key_quotes.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Key Quotes</div>
            <div style={{
              borderLeft: '2px solid var(--border-light)',
              paddingLeft: 'var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              {analysis.key_quotes.map((quote, i) => (
                <p key={i} style={{
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  margin: 0,
                  fontStyle: 'italic',
                }}>
                  &ldquo;<strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{quote}</strong>&rdquo;
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Themes */}
        {analysis.themes.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Themes</div>
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {analysis.themes.map((theme, i) => (
                <Tag key={i} label={theme} highlight={i === 0} />
              ))}
            </div>
          </div>
        )}

        {/* Assets Mentioned */}
        {analysis.assets_mentioned.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Assets Mentioned</div>
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {analysis.assets_mentioned.map((asset, i) => (
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
          </div>
        )}

        {/* Referenced People */}
        {analysis.referenced_people.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Referenced People</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {analysis.referenced_people.map((person, i) => (
                <span key={i} style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>
                  {person}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Predictions */}
        {predictions.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>
              Predictions ({predictions.length})
            </div>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 80px 100px 80px',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span className="label" style={{ margin: 0 }}>Claim</span>
                <span className="label" style={{ margin: 0 }}>Sentiment</span>
                <span className="label" style={{ margin: 0 }}>Horizon</span>
                <span className="label" style={{ margin: 0 }}>Specificity</span>
              </div>

              {/* Rows */}
              {predictions.map((pred) => (
                <div
                  key={pred.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 80px 100px 80px',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                      {pred.claim}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {pred.themes.map((t) => (
                        <Tag key={t} label={t} />
                      ))}
                      {pred.assets_mentioned.map((a) => (
                        <span key={a} className="mono" style={{
                          fontSize: 9,
                          padding: '1px 5px',
                          borderRadius: 2,
                          background: 'var(--bg-surface)',
                          color: 'var(--text-tertiary)',
                          border: '1px solid var(--border)',
                        }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Tag
                      label={pred.sentiment}
                      highlight={pred.sentiment === 'bearish'}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: 11 }}>
                    {pred.time_horizon}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {pred.specificity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
