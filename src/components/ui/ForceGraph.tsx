'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ForceSimulation, type SimNode } from '@/lib/force-simulation';
import {
  type GraphData,
  type GraphNode,
  sentimentColor,
  sentimentColorDim,
  nodeRadius,
  edgeWidth,
  truncateLabel,
} from '@/lib/graph-utils';

interface ForceGraphProps {
  data: GraphData;
  onSelectNode: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
}

export default function ForceGraph({ data, onSelectNode, selectedNodeId }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<ForceSimulation | null>(null);
  const [, forceRender] = useState(0);

  // Viewbox state for pan/zoom
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Dragging node
  const dragNode = useRef<string | null>(null);

  // Hover
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Connected set for highlight
  const connectedTo = useRef(new Map<string, Set<string>>());

  // Build connected map
  useEffect(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of data.edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    }
    connectedTo.current = map;
  }, [data.edges]);

  // Initialize simulation
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;

    const simNodes: SimNode[] = data.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / data.nodes.length;
      const r = Math.min(w, h) * 0.3;
      return {
        id: n.id,
        x: w / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: h / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: nodeRadius(n.count),
      };
    });

    setViewBox({ x: 0, y: 0, w, h });

    const sim = new ForceSimulation(simNodes, data.edges, { width: w, height: h });
    simRef.current = sim;

    sim.start(() => {
      forceRender((n) => n + 1);
    });

    return () => {
      sim.stop();
    };
  }, [data]);

  // Get simulation node position by id
  const getPos = useCallback((id: string) => {
    const n = simRef.current?.getNode(id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  }, []);

  // Is node/edge highlighted?
  const isHighlighted = useCallback(
    (nodeId: string) => {
      if (!hoveredId) return true;
      if (nodeId === hoveredId) return true;
      return connectedTo.current.get(hoveredId)?.has(nodeId) ?? false;
    },
    [hoveredId],
  );

  const isEdgeHighlighted = useCallback(
    (source: string, target: string) => {
      if (!hoveredId) return true;
      return source === hoveredId || target === hoveredId;
    },
    [hoveredId],
  );

  // Mouse handlers for pan
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    // Check if we're on a node (handled by node handlers)
    const target = e.target as SVGElement;
    if (target.closest('[data-node-id]')) return;

    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    onSelectNode(null);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragNode.current && simRef.current) {
      // Dragging a node
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const node = simRef.current.getNode(dragNode.current);
      if (node) {
        node.x = viewBox.x + (e.clientX - rect.left) * scaleX;
        node.y = viewBox.y + (e.clientY - rect.top) * scaleY;
        node.vx = 0;
        node.vy = 0;
        simRef.current.reheat(0.1);
      }
      return;
    }

    if (isPanning.current) {
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const dx = (e.clientX - panStart.current.x) * scaleX;
      const dy = (e.clientY - panStart.current.y) * scaleY;
      setViewBox((v) => ({ ...v, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
    }
  };

  const handleMouseUp = () => {
    if (dragNode.current && simRef.current) {
      const node = simRef.current.getNode(dragNode.current);
      if (node) node.pinned = false;
      dragNode.current = null;
    }
    isPanning.current = false;
  };

  // Wheel for zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();

    const factor = e.deltaY > 0 ? 1.08 : 0.92;

    // Cursor position in viewbox coords
    const cx = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const cy = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;

    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;

    // Anchor zoom to cursor
    const newX = cx - (cx - viewBox.x) * factor;
    const newY = cy - (cy - viewBox.y) * factor;

    setViewBox({ x: newX, y: newY, w: newW, h: newH });
  };

  // Node drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    dragNode.current = nodeId;
    if (simRef.current) {
      const node = simRef.current.getNode(nodeId);
      if (node) node.pinned = true;
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = data.nodes.find((n) => n.id === nodeId);
    if (node) onSelectNode(selectedNodeId === nodeId ? null : node);
  };

  // Zoom level for label visibility
  const zoomLevel = 800 / viewBox.w;
  const showLabels = zoomLevel > 0.4;

  return (
    <svg
      ref={svgRef}
      className="canvas-svg"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Edges */}
      {data.edges.map((edge) => {
        const s = getPos(edge.source);
        const t = getPos(edge.target);
        const highlighted = isEdgeHighlighted(edge.source, edge.target);
        return (
          <line
            key={`${edge.source}-${edge.target}`}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke="var(--border-light)"
            strokeWidth={edgeWidth(edge.weight)}
            opacity={highlighted ? 0.3 : 0.04}
            style={{ transition: 'opacity 0.2s ease' }}
          />
        );
      })}

      {/* Nodes */}
      {data.nodes.map((node) => {
        const pos = getPos(node.id);
        const r = nodeRadius(node.count);
        const color = sentimentColor(node.sentiment);
        const dimColor = sentimentColorDim(node.sentiment);
        const highlighted = isHighlighted(node.id);
        const isSelected = selectedNodeId === node.id;

        return (
          <g
            key={node.id}
            data-node-id={node.id}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
            opacity={highlighted ? 1 : 0.1}
            onMouseEnter={() => setHoveredId(node.id)}
            onMouseLeave={() => setHoveredId(null)}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onClick={(e) => handleNodeClick(e, node.id)}
          >
            {/* Glow */}
            <circle cx={pos.x} cy={pos.y} r={r + 4} fill={dimColor} opacity={isSelected ? 0.6 : 0.3} />
            {/* Main circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={dimColor}
              stroke={color}
              strokeWidth={isSelected ? 2 : 1}
              opacity={0.9}
            />
            {/* Inner dot */}
            <circle cx={pos.x} cy={pos.y} r={3} fill={color} opacity={0.8} />
            {/* Label */}
            {showLabels && (
              <text
                x={pos.x}
                y={pos.y + r + 14}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize={10}
                fontFamily="var(--font-main)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {truncateLabel(node.label, r)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
