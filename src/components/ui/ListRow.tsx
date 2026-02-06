interface ListRowProps {
  rank?: number;
  title: string;
  meta?: string;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

const trendIcons: Record<string, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const trendColors: Record<string, string> = {
  up: '#22c55e',
  down: '#ef4444',
  stable: 'var(--text-tertiary)',
};

export default function ListRow({ rank, title, meta, trend, onClick }: ListRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = 'var(--bg-surface)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.background = 'transparent';
      }}
    >
      {rank !== undefined && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 16, textAlign: 'right', flexShrink: 0 }}>
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{title}</span>
      {meta && (
        <span className="mono" style={{ fontSize: 10, flexShrink: 0 }}>{meta}</span>
      )}
      {trend && (
        <span style={{ fontSize: 11, color: trendColors[trend], flexShrink: 0 }}>
          {trendIcons[trend]}
        </span>
      )}
    </div>
  );
}
