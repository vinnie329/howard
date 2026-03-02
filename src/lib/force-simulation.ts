/**
 * Zero-dependency force-directed graph layout engine.
 * Three forces: repulsion (Coulomb), spring attraction on edges, center gravity.
 * Velocity damping 0.85, alpha cooling 0.99. Settles in ~4s at 60fps.
 */

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned?: boolean;
}

export interface SimEdge {
  source: string;
  target: string;
  weight: number;
}

interface SimConfig {
  width: number;
  height: number;
  repulsion: number;
  springStrength: number;
  springLength: number;
  gravity: number;
  damping: number;
  alphaCool: number;
  alphaMin: number;
}

const DEFAULTS: SimConfig = {
  width: 800,
  height: 600,
  repulsion: 5000,
  springStrength: 0.005,
  springLength: 120,
  gravity: 0.02,
  damping: 0.85,
  alphaCool: 0.99,
  alphaMin: 0.001,
};

export class ForceSimulation {
  nodes: SimNode[];
  edges: SimEdge[];
  config: SimConfig;
  alpha: number;
  private nodeMap: Map<string, SimNode>;
  private raf: number | null = null;
  private onTick: (() => void) | null = null;

  constructor(
    nodes: SimNode[],
    edges: SimEdge[],
    config?: Partial<SimConfig>,
  ) {
    this.config = { ...DEFAULTS, ...config };
    this.alpha = 1;
    this.nodeMap = new Map();

    // Initialize node positions in a circle if not set
    const cx = this.config.width / 2;
    const cy = this.config.height / 2;
    const r = Math.min(cx, cy) * 0.6;

    this.nodes = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const node: SimNode = {
        ...n,
        x: n.x || cx + r * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: n.y || cy + r * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
      };
      this.nodeMap.set(node.id, node);
      return node;
    });

    this.edges = edges;
  }

  tick(): boolean {
    if (this.alpha < this.config.alphaMin) return false;

    const { repulsion, springStrength, springLength, gravity, damping } = this.config;
    const cx = this.config.width / 2;
    const cy = this.config.height / 2;

    // Repulsion (Coulomb, O(n²))
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      if (a.pinned) continue;
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = a.radius + b.radius + 10;
        if (dist < minDist) dist = minDist;
        const force = (repulsion * this.alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        if (!b.pinned) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }

    // Spring attraction on edges
    for (const edge of this.edges) {
      const a = this.nodeMap.get(edge.source);
      const b = this.nodeMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - springLength;
      const force = springStrength * displacement * this.alpha * Math.sqrt(edge.weight);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.pinned) { a.vx += fx; a.vy += fy; }
      if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
    }

    // Center gravity
    for (const node of this.nodes) {
      if (node.pinned) continue;
      node.vx += (cx - node.x) * gravity * this.alpha;
      node.vy += (cy - node.y) * gravity * this.alpha;
    }

    // Apply velocity + damping
    for (const node of this.nodes) {
      if (node.pinned) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }

    this.alpha *= this.config.alphaCool;
    return true;
  }

  start(onTick: () => void) {
    this.onTick = onTick;
    const loop = () => {
      const running = this.tick();
      this.onTick?.();
      if (running) {
        this.raf = requestAnimationFrame(loop);
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  reheat(alpha = 0.3) {
    const wasRunning = this.raf !== null;
    this.alpha = Math.max(this.alpha, alpha);
    if (!wasRunning && this.onTick) {
      this.start(this.onTick);
    }
  }

  getNode(id: string): SimNode | undefined {
    return this.nodeMap.get(id);
  }
}
