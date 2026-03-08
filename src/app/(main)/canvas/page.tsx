'use client';

import { useState, useEffect } from 'react';
import ForceGraph from '@/components/ui/ForceGraph';
import NodeDetail from '@/components/ui/NodeDetail';
import type { GraphData, GraphNode } from '@/lib/graph-utils';

export default function CanvasPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch('/api/canvas')
      .then((res) => res.json())
      .then((d: GraphData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="top-bar">
        <span style={{ fontSize: 12 }}>Canvas</span>
        {data && (
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>
            {data.nodes.length} themes · {data.edges.length} connections
          </span>
        )}
      </div>

      <div className="canvas-container">
        {loading ? (
          <div className="canvas-loading">
            <div className="skeleton-shimmer" style={{ width: 120, height: 12, borderRadius: 'var(--radius-sm)' }} />
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
              Building knowledge graph…
            </span>
          </div>
        ) : data && data.nodes.length > 0 ? (
          <>
            <ForceGraph
              data={data}
              onSelectNode={setSelectedNode}
              selectedNodeId={selectedNode?.id ?? null}
            />
            {selectedNode && (
              <NodeDetail
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            )}
            {/* Legend */}
            <div className="canvas-legend">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span>Bullish</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <span>Bearish</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#888' }} />
                <span>Neutral</span>
              </div>
            </div>
          </>
        ) : (
          <div className="canvas-loading">
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              No theme data available
            </span>
          </div>
        )}
      </div>
    </>
  );
}
