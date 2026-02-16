interface DeviationGaugeProps {
  current: number;
  histMin: number;
  histMax: number;
  width?: number;
  height?: number;
}

function fmtDev(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${Math.round(v)}%`;
}

export default function DeviationGauge({
  current,
  histMin,
  histMax,
  width = 200,
  height = 20,
}: DeviationGaugeProps) {
  const labelWidth = 32;
  const gap = 4;
  const barLeft = labelWidth + gap;
  const barRight = width - labelWidth - gap;
  const barWidth = barRight - barLeft;
  const barY = height / 2 - 3;
  const barHeight = 6;

  const range = histMax - histMin;
  if (range === 0) return null;

  const zeroPos = barLeft + ((-histMin) / range) * barWidth;
  const currentPos = barLeft + ((current - histMin) / range) * barWidth;
  const clampedCurrent = Math.max(barLeft, Math.min(barRight, currentPos));

  const isPositive = current >= 0;
  const fillColor = isPositive ? 'var(--green)' : '#ef4444';
  const fillStart = Math.min(zeroPos, clampedCurrent);
  const fillWidth = Math.abs(clampedCurrent - zeroPos);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Min label */}
      <text
        x={barLeft - gap}
        y={height / 2}
        textAnchor="end"
        dominantBaseline="central"
        fill="var(--text-tertiary)"
        fontSize={8}
        fontFamily="var(--font-mono)"
      >
        {fmtDev(histMin)}
      </text>

      {/* Background track */}
      <rect
        x={barLeft}
        y={barY}
        width={barWidth}
        height={barHeight}
        rx={2}
        fill="var(--border)"
      />

      {/* Fill from zero to current */}
      <rect
        x={fillStart}
        y={barY}
        width={fillWidth}
        height={barHeight}
        rx={2}
        fill={fillColor}
        opacity={0.5}
      />

      {/* Zero line */}
      <line
        x1={zeroPos}
        y1={barY - 1}
        x2={zeroPos}
        y2={barY + barHeight + 1}
        stroke="var(--text-tertiary)"
        strokeWidth={1}
      />

      {/* Current position dot */}
      <circle
        cx={clampedCurrent}
        cy={height / 2}
        r={3.5}
        fill={fillColor}
        stroke="var(--bg-body)"
        strokeWidth={1}
      />

      {/* Max label */}
      <text
        x={barRight + gap}
        y={height / 2}
        textAnchor="start"
        dominantBaseline="central"
        fill="var(--text-tertiary)"
        fontSize={8}
        fontFamily="var(--font-mono)"
      >
        {fmtDev(histMax)}
      </text>
    </svg>
  );
}
