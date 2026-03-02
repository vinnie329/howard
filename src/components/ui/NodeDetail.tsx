'use client';

import type { GraphNode } from '@/lib/graph-utils';
import { sentimentColor } from '@/lib/graph-utils';

interface NodeDetailProps {
  node: GraphNode;
  onClose: () => void;
}

export default function NodeDetail({ node, onClose }: NodeDetailProps) {
  const color = sentimentColor(node.sentiment);

  return (
    <div className="canvas-detail fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 'var(--space-1)' }}>{node.label}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span
              className="badge"
              style={{
                background: color === '#22c55e' ? 'rgba(34,197,94,0.12)' : color === '#ef4444' ? 'rgba(239,68,68,0.12)' : 'rgba(136,136,136,0.12)',
                color,
                border: `1px solid ${color === '#22c55e' ? 'rgba(34,197,94,0.2)' : color === '#ef4444' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
              }}
            >
              {node.sentimentLabel}
            </span>
            <span className="mono" style={{ fontSize: 10 }}>
              {node.count} mention{node.count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 16,
            padding: 'var(--space-1)',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Assets */}
      {node.assets.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Assets</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
            {node.assets.map((asset) => (
              <span
                key={asset}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                {asset}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {node.sources.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Sources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {node.sources.map((source) => (
              <span
                key={source}
                className="mono"
                style={{ fontSize: 11 }}
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
