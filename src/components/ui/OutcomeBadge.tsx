export function OutcomeBadge({ outcome }: { outcome: string | null | undefined }) {
  const o = outcome || 'pending';
  const styles: Record<string, { bg: string; color: string }> = {
    correct: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    incorrect: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    partially_correct: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
    pending: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
    expired: { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-tertiary)' },
  };
  const s = styles[o] || styles.pending;
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'var(--font-mono)',
      padding: '2px 8px',
      borderRadius: 3,
      background: s.bg,
      color: s.color,
      textTransform: 'capitalize',
    }}>
      {o.replace('_', ' ')}
    </span>
  );
}

export function AccuracyBar({ rate, size = 'normal' }: { rate: number; size?: 'normal' | 'large' }) {
  const width = size === 'large' ? 120 : 80;
  const height = size === 'large' ? 8 : 5;
  const color = rate >= 0.7 ? '#22c55e' : rate >= 0.4 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <div style={{ width, height, background: 'var(--bg-surface)', borderRadius: height / 2, overflow: 'hidden' }}>
        <div style={{ width: `${rate * 100}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.3s ease' }} />
      </div>
      <span className="mono" style={{ fontSize: size === 'large' ? 14 : 11, color }}>{(rate * 100).toFixed(1)}%</span>
    </div>
  );
}
