'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePageTransition } from '@/lib/transition-context';
import type { Source } from '@/types';
import { getSources } from '@/lib/data';

interface NavItem {
  label: string;
  href: string;
}

const intelligence: NavItem[] = [
  { label: 'Data Feed', href: '/' },
  { label: 'Signals', href: '/signals' },
  { label: 'Outlook', href: '/outlook' },
  { label: 'Predictions Ledger', href: '/predictions' },
  { label: 'Discovery Pipeline', href: '/discovery' },
  { label: 'Technicals', href: '/technicals' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    getSources().then(setSources);
  }, []);

  return (
    <aside className="sidebar">
      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 10,
            height: 10,
            background: 'var(--accent)',
            borderRadius: 2,
          }} />
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em' }}>Howard</span>
        </div>

        {/* Intelligence nav group */}
        <NavGroup label="Intelligence" items={intelligence} pathname={pathname} />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        padding: 'var(--space-4) var(--space-6)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#22c55e',
          }} />
          <span className="mono" style={{ fontSize: 10 }}>System Online</span>
        </div>
        <div className="mono" style={{ fontSize: 10, marginTop: 'var(--space-1)', color: 'var(--text-tertiary)' }}>
          {sources.length} source{sources.length !== 1 ? 's' : ''} tracked
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-2)' }}>
        {label}
      </div>
      {items.map((item) => (
        <NavItemRow
          key={item.href}
          label={item.label}
          href={item.href}
          active={pathname === item.href}
        />
      ))}
    </div>
  );
}

function NavItemRow({ label, href, active }: { label: string; href: string; active: boolean }) {
  const { navigateTo } = usePageTransition();

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigateTo(href);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-surface)' : 'transparent',
        textDecoration: 'none',
        fontSize: 13,
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-surface)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {active && (
        <div style={{
          width: 4,
          height: 4,
          background: 'var(--accent)',
          borderRadius: 1,
          flexShrink: 0,
        }} />
      )}
      <span>{label}</span>
    </a>
  );
}
