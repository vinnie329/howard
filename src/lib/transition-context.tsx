'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface TransitionContextValue {
  navigateTo: (href: string) => void;
  leaving: boolean;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigateTo: () => {},
  leaving: false,
});

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const targetRef = useRef<string | null>(null);

  // When pathname changes to our target, the new page is rendered — fade in
  useEffect(() => {
    if (targetRef.current && pathname === targetRef.current) {
      requestAnimationFrame(() => setLeaving(false));
      targetRef.current = null;
    }
  }, [pathname]);

  const navigateTo = useCallback((href: string) => {
    if (href === pathname || leaving) return;
    targetRef.current = href;
    setLeaving(true);
    // Wait for fade-out to finish, then navigate
    setTimeout(() => router.push(href), 120);
  }, [router, pathname, leaving]);

  return (
    <TransitionContext.Provider value={{ navigateTo, leaving }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function usePageTransition() {
  return useContext(TransitionContext);
}
