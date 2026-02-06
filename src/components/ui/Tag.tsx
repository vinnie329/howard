interface TagProps {
  label: string;
  highlight?: boolean;
}

export default function Tag({ label, highlight = false }: TagProps) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 2,
      background: highlight ? 'var(--accent-dim)' : 'var(--bg-surface-hover)',
      color: highlight ? 'var(--accent)' : 'var(--text-secondary)',
      border: `1px solid ${highlight ? 'var(--accent-dim)' : 'var(--border)'}`,
    }}>
      {label}
    </span>
  );
}
