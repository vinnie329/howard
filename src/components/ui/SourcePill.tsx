import Link from 'next/link';

interface SourcePillProps {
  name: string;
  avatarUrl?: string;
  slug?: string;
}

export default function SourcePill({ name, avatarUrl, slug }: SourcePillProps) {
  const inner = (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '4px 8px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)',
      transition: 'border-color 0.15s ease',
    }}>
      <div style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'var(--border-light)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 7,
        color: 'var(--text-secondary)',
        fontWeight: 600,
      }}>
        {!avatarUrl && name.charAt(0)}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{name}</span>
    </div>
  );

  if (slug) {
    return (
      <Link
        href={`/sources/${slug}`}
        style={{ textDecoration: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
