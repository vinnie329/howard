'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 12, radius = 4, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'var(--bg-surface)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

/** A few lines of text placeholder */
export function SkeletonLines({ count = 3, gap = 8 }: { count?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          height={10}
          width={i === count - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

/** Card-shaped skeleton matching ContentCard / signal card layouts */
export function SkeletonCard() {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Skeleton width={60} height={10} />
        <Skeleton width={40} height={10} />
      </div>
      <Skeleton height={14} width="85%" />
      <SkeletonLines count={2} gap={6} />
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
        <Skeleton width={48} height={18} radius={4} />
        <Skeleton width={56} height={18} radius={4} />
        <Skeleton width={40} height={18} radius={4} />
      </div>
    </div>
  );
}

/** Row-shaped skeleton for table/list items */
export function SkeletonRow() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) 0',
    }}>
      <Skeleton width={80} height={10} />
      <Skeleton width="100%" height={10} />
      <Skeleton width={48} height={10} />
    </div>
  );
}

/** Stack of cards */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Stack of rows */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
