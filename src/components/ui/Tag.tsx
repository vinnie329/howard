interface TagProps {
  label: string;
  highlight?: boolean;
  variant?: 'default' | 'bullish' | 'bearish';
}

export default function Tag({ label, highlight = false, variant = 'default' }: TagProps) {
  const resolvedVariant = variant !== 'default' ? variant : highlight ? 'bearish' : 'default';

  const styles: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: 'var(--border)' },
    bearish: { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'var(--accent-dim)' },
    bullish: { bg: 'var(--green-dim)', color: 'var(--green)', border: 'var(--green-dim)' },
  };

  const s = styles[resolvedVariant];

  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 2,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {label}
    </span>
  );
}
