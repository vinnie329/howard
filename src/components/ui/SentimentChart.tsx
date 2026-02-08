'use client';

interface DataPoint {
  date: string;
  score: number;
  title?: string;
}

interface SentimentChartProps {
  data: DataPoint[];
}

const WIDTH = 500;
const HEIGHT = 160;
const PAD_X = 40;
const PAD_Y = 20;
const CHART_W = WIDTH - PAD_X * 2;
const CHART_H = HEIGHT - PAD_Y * 2;

export default function SentimentChart({ data }: SentimentChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: 12 }}>
        No sentiment data yet.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Map score (-1 to 1) → y position
  const yForScore = (score: number) => PAD_Y + CHART_H / 2 - (score * CHART_H) / 2;
  const xForIndex = (i: number) =>
    sorted.length === 1 ? PAD_X + CHART_W / 2 : PAD_X + (i / (sorted.length - 1)) * CHART_W;

  const points = sorted.map((d, i) => ({ x: xForIndex(i), y: yForScore(d.score), ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Gradient area fill
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${yForScore(0)}` +
    ` L ${points[0].x} ${yForScore(0)} Z`;

  const yLabels = [
    { score: 1, label: 'Bullish' },
    { score: 0, label: 'Neutral' },
    { score: -1, label: 'Bearish' },
  ];

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block' }}>
      {/* Grid lines */}
      {yLabels.map(({ score }) => (
        <line
          key={score}
          x1={PAD_X}
          y1={yForScore(score)}
          x2={WIDTH - PAD_X}
          y2={yForScore(score)}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray={score === 0 ? 'none' : '2 2'}
        />
      ))}

      {/* Y-axis labels */}
      {yLabels.map(({ score, label }) => (
        <text
          key={score}
          x={PAD_X - 4}
          y={yForScore(score)}
          textAnchor="end"
          dominantBaseline="middle"
          fill="var(--text-tertiary)"
          fontSize={8}
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="var(--accent-dim)" opacity={0.5} />

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={1.5} />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent)">
          <title>{`${p.title || p.date}: ${p.score.toFixed(2)}`}</title>
        </circle>
      ))}

      {/* X-axis date labels (first and last) */}
      {sorted.length > 0 && (
        <>
          <text
            x={PAD_X}
            y={HEIGHT - 4}
            textAnchor="start"
            fill="var(--text-tertiary)"
            fontSize={8}
            fontFamily="var(--font-mono)"
          >
            {new Date(sorted[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
          {sorted.length > 1 && (
            <text
              x={WIDTH - PAD_X}
              y={HEIGHT - 4}
              textAnchor="end"
              fill="var(--text-tertiary)"
              fontSize={8}
              fontFamily="var(--font-mono)"
            >
              {new Date(sorted[sorted.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
