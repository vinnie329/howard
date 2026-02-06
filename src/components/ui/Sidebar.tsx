'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOMAINS } from '@/types';
import type { Domain } from '@/types';
import { useDomainFilter } from '@/lib/domain-filter-context';

interface NavItem {
  label: string;
  href: string;
}

const intelligence: NavItem[] = [
  { label: 'Daily Digest', href: '/' },
  { label: 'Predictions Ledger', href: '/predictions' },
  { label: 'Discovery Pipeline', href: '/discovery' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { selectedDomains, toggle, clear } = useDomainFilter();
  const hasFilters = selectedDomains.length > 0;

  return (
    <aside className="sidebar">
      <div style={{ padding: 'var(--space-6)' }}>
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

        {/* Domains filter group */}
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
            paddingLeft: 'var(--space-2)',
            paddingRight: 'var(--space-2)',
          }}>
            <span className="label">Domains</span>
            {hasFilters && (
              <button
                onClick={clear}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  padding: 0,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                Clear
              </button>
            )}
          </div>
          {DOMAINS.map((domain) => (
            <DomainToggle
              key={domain}
              domain={domain}
              active={selectedDomains.includes(domain)}
              onToggle={() => toggle(domain)}
            />
          ))}
        </div>
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
          5 sources tracked
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
  return (
    <Link
      href={href}
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
    </Link>
  );
}

function DomainToggle({
  domain,
  active,
  onToggle,
}: {
  domain: Domain;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.15s ease',
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
      {/* Checkbox square */}
      <div style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        border: active ? 'none' : '1px solid var(--border-light)',
        background: active ? 'var(--accent)' : 'transparent',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }} />
      <span>{domain}</span>
    </button>
  );
}
