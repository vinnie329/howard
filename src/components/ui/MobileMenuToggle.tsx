'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileMenuToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', open);
    return () => document.body.classList.remove('sidebar-open');
  }, [open]);

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
