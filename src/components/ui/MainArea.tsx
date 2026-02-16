'use client';

import { usePageTransition } from '@/lib/transition-context';

export default function MainArea({ children }: { children: React.ReactNode }) {
  const { leaving } = usePageTransition();

  return (
    <div
      className="main-area"
      style={{
        opacity: leaving ? 0 : 1,
        transition: 'opacity 120ms ease',
      }}
    >
      {children}
    </div>
  );
}
