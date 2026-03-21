interface Stat {
  value: string;
  label: string;
  color?: string;
}

interface StatsGridProps {
  stats: Stat[];
  columns?: number;
}

export default function StatsGrid({ stats, columns = 2 }: StatsGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 1,
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--border)',
    }}>
      {stats.map((stat, i) => (
        <div key={i} style={{
          background: 'var(--bg-panel)',
          padding: 'var(--space-3)',
        }}>
          <div style={{ fontSize: 16, color: stat.color || 'var(--text-primary)', fontWeight: 400 }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-1)',
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
