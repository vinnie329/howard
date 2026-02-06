'use client';

import type { CredibilityScores, CredibilityDimension } from '@/types';
import { DIMENSION_LABELS } from '@/lib/scoring';

interface RadarChartProps {
  scores: CredibilityScores;
  weightedScore: number;
}

const dimensions: CredibilityDimension[] = [
  'intelligence',
  'intuition_eq',
  'sincerity',
  'access',
  'independence',
  'capital_at_risk',
  'reputational_sensitivity',
  'performance',
];

const SIZE = 200;
const CENTER = SIZE / 2;
const MAX_RADIUS = 75;
const RINGS = 5;

function polarToCartesian(angle: number, radius: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

export default function RadarChart({ scores, weightedScore }: RadarChartProps) {
  const angleStep = 360 / dimensions.length;

  // Build the data polygon
  const points = dimensions.map((dim, i) => {
    const angle = i * angleStep;
    const value = scores[dim] / 5; // normalize to 0-1
    const radius = value * MAX_RADIUS;
    return polarToCartesian(angle, radius);
  });

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Ring guides */}
        {Array.from({ length: RINGS }, (_, i) => {
          const r = ((i + 1) / RINGS) * MAX_RADIUS;
          return (
            <circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth={0.5}
              strokeDasharray={i < RINGS - 1 ? '2 2' : 'none'}
            />
          );
        })}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep;
          const [x, y] = polarToCartesian(angle, MAX_RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={polygonPath}
          fill="var(--accent-dim)"
          stroke="var(--accent)"
          strokeWidth={1.5}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={2.5}
            fill="var(--accent)"
          />
        ))}

        {/* Axis labels */}
        {dimensions.map((dim, i) => {
          const angle = i * angleStep;
          const [x, y] = polarToCartesian(angle, MAX_RADIUS + 18);
          const shortLabels: Record<string, string> = {
            intelligence: 'INT',
            intuition_eq: 'EQ',
            sincerity: 'SIN',
            access: 'ACC',
            independence: 'IND',
            capital_at_risk: 'CAP',
            reputational_sensitivity: 'REP',
            performance: 'PER',
          };
          return (
            <text
              key={dim}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-tertiary)"
              fontSize={8}
              fontFamily="var(--font-mono)"
            >
              {shortLabels[dim]}
            </text>
          );
        })}

        {/* Center score */}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary)"
          fontSize={16}
          fontWeight={400}
        >
          {weightedScore.toFixed(2)}
        </text>
        <text
          x={CENTER}
          y={CENTER + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-tertiary)"
          fontSize={8}
          fontFamily="var(--font-mono)"
          textDecoration="uppercase"
        >
          WEIGHTED
        </text>
      </svg>

      {/* Dimension breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-1) var(--space-4)',
        width: '100%',
        marginTop: 'var(--space-3)',
      }}>
        {dimensions.map((dim) => (
          <div key={dim} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              {DIMENSION_LABELS[dim]}
            </span>
            <span className="mono" style={{ fontSize: 10 }}>
              {scores[dim]}/5
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
