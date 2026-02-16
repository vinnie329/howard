'use client';

import { useState, useEffect, useRef } from 'react';

interface MicroLoaderProps {
  cellSize?: number;
  gap?: number;
  color?: string;
  label?: string;
}

export default function MicroLoader({
  cellSize = 8,
  gap = 2,
  color = 'var(--accent)',
  label,
}: MicroLoaderProps) {
  const total = 9;
  const [opacities, setOpacities] = useState<number[]>(() =>
    Array.from({ length: total }, () => 0.1 + Math.random() * 0.9)
  );
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setOpacities(
        Array.from({ length: total }, () => 0.1 + Math.random() * 0.9)
      );
    }, 600);
    return () => clearInterval(timerRef.current);
  }, []);

  const gridPx = 3 * cellSize + 2 * gap;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(3, ${cellSize}px)`,
          gap,
          width: gridPx,
          height: gridPx,
        }}
      >
        {opacities.map((op, i) => (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 3,
              background: color,
              opacity: op,
              boxShadow: op > 0.5 ? `0 0 ${cellSize * 0.8}px ${color}` : 'none',
              transition: 'opacity 500ms ease, box-shadow 500ms ease',
            }}
          />
        ))}
      </div>
      {label && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
