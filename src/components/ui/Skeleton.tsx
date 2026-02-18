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
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius: radius,
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

/** Signal-card shaped skeleton matching the actual signal card layout */
export function SkeletonSignalCard() {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--bg-panel)',
    }}>
      {/* Header bar — mimics type label + severity */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Skeleton width={3} height={16} radius={2} />
          <Skeleton width={80} height={10} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Skeleton width={40} height={3} radius={2} />
          <Skeleton width={36} height={9} />
        </div>
      </div>

      {/* Body — mimics headline + detail text + asset chips */}
      <div style={{ padding: 'var(--space-4)' }}>
        <Skeleton height={15} width="75%" style={{ marginBottom: 'var(--space-3)' }} />
        <SkeletonLines count={3} gap={8} />
        <div style={{
          display: 'flex',
          gap: 'var(--space-1)',
          marginTop: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border)',
        }}>
          <Skeleton width={48} height={20} radius={4} />
          <Skeleton width={56} height={20} radius={4} />
          <Skeleton width={40} height={20} radius={4} />
        </div>
      </div>
    </div>
  );
}

/** ContentCard-shaped skeleton: source pill + badge, title, summary, asset chips, theme tags + timestamp */
export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
    }}>
      {/* Header — source pill left, platform + sentiment badge right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
      }}>
        <Skeleton width={100} height={22} radius={100} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Skeleton width={44} height={10} />
          <Skeleton width={52} height={20} radius={100} />
        </div>
      </div>

      {/* Title */}
      <Skeleton height={14} width="80%" style={{ marginBottom: 'var(--space-2)' }} />

      {/* Summary */}
      <Skeleton height={10} width="95%" style={{ marginBottom: 4 }} />
      <Skeleton height={10} width="70%" style={{ marginBottom: 'var(--space-3)' }} />

      {/* Asset chips */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-1)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-3)',
      }}>
        <Skeleton width={36} height={16} radius={2} />
        <Skeleton width={28} height={16} radius={2} />
        <Skeleton width={44} height={16} radius={2} />
      </div>

      {/* Footer — theme tags + timestamp */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <Skeleton width={60} height={20} radius={4} />
          <Skeleton width={52} height={20} radius={4} />
          <Skeleton width={48} height={20} radius={4} />
        </div>
        <Skeleton width={32} height={10} />
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

/** Stack of content cards with staggered opacity */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.12 }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

/** Stack of signal cards with staggered opacity */
export function SkeletonSignalCards({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.12 }}>
          <SkeletonSignalCard />
        </div>
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
