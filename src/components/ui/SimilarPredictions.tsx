'use client';

import { useState, useEffect } from 'react';
import { SkeletonRows } from './Skeleton';

interface SimilarPrediction {
  id: string;
  title: string;
  similarity: number;
  source_name?: string;
}

export default function SimilarPredictions({ predictionId }: { predictionId: string }) {
  const [items, setItems] = useState<SimilarPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/related-predictions/${predictionId}?limit=5&threshold=0.2`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [predictionId]);

  if (loading) {
    return <SkeletonRows count={3} />;
  }

  if (items.length === 0) {
    return (
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: 'var(--space-1) 0' }}>
        No similar predictions found
      </div>
    );
  }

  return (
    <div>
      <div className="label" style={{ marginBottom: 'var(--space-2)', fontSize: 9 }}>
        Similar Predictions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-panel)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.title}
              </div>
              {item.source_name && (
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                  {item.source_name}
                </span>
              )}
            </div>
            <span className="mono" style={{
              fontSize: 9,
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap',
            }}>
              {Math.round(item.similarity * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
