/**
 * Utility functions for the canvas knowledge graph.
 * Sentiment-to-color mapping, radius scaling, label helpers.
 */

export interface GraphNode {
  id: string;
  label: string;
  count: number;
  sentiment: number;       // -1 to 1
  sentimentLabel: string;  // 'bullish' | 'bearish' | 'neutral' | 'mixed'
  assets: string[];
  sources: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Map sentiment score to fill color. Green=bullish, red=bearish, gray=neutral. */
export function sentimentColor(score: number): string {
  if (score > 0.15) return '#22c55e';   // green
  if (score < -0.15) return '#ef4444';  // red
  return '#888888';                      // gray/neutral
}

/** Dimmed version for backgrounds / glows. */
export function sentimentColorDim(score: number): string {
  if (score > 0.15) return 'rgba(34, 197, 94, 0.15)';
  if (score < -0.15) return 'rgba(239, 68, 68, 0.15)';
  return 'rgba(136, 136, 136, 0.12)';
}

/** Scale node radius based on mention count. sqrt scaling for visual balance. */
export function nodeRadius(count: number): number {
  return Math.max(8, Math.sqrt(count) * 10);
}

/** Edge stroke width based on co-occurrence weight. */
export function edgeWidth(weight: number): number {
  return Math.max(0.5, Math.log2(weight + 1));
}

/** Truncate label for small nodes. */
export function truncateLabel(label: string, radius: number): string {
  const maxChars = Math.floor(radius / 3.5);
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + '…';
}
