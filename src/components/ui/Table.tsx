/**
 * Generic Table component matching the Howard portfolio-page style:
 *   bordered rounded container, mono uppercase label header,
 *   click-row callback, optional sortable columns, optional
 *   per-row expanded slot.
 *
 * Columns are described declaratively. The component handles header
 * rendering, sort state, hover, and the inline-grid layout. Rows
 * remain plain values — the caller's `render` returns the cell content.
 */
'use client';

import { useState, useMemo, ReactNode } from 'react';

export interface TableColumn<Row> {
  key: string;
  label: string;
  width: string;                         // e.g. "72px" or "1fr"
  align?: 'left' | 'right' | 'center';
  // Render the cell content for a row
  render: (row: Row) => ReactNode;
  // Sort key extractor — return a number/string/null. Omit to disable sort on this column.
  sortValue?: (row: Row) => number | string | null;
}

interface TableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  expandedKey?: string | null;
  renderExpanded?: (row: Row) => ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  emptyMessage?: string;
}

export default function Table<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  expandedKey,
  renderExpanded,
  initialSort,
  emptyMessage = 'No data',
}: TableProps<Row>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      // Nulls last regardless of direction
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sort, columns]);

  const gridTemplate = columns.map((c) => c.width).join(' ');

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'desc' };
      if (cur.dir === 'desc') return { key, dir: 'asc' };
      return null; // third click clears sort
    });
  }

  return (
    <div className="table-scroll">
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {/* Header */}
        <div className="mono" style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          gap: 'var(--space-2)',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.03em',
        }}>
          {columns.map((c) => {
            const isSorted = sort?.key === c.key;
            const sortable = !!c.sortValue;
            return (
              <span
                key={c.key}
                onClick={sortable ? () => toggleSort(c.key) : undefined}
                style={{
                  textAlign: c.align ?? 'left',
                  cursor: sortable ? 'pointer' : 'default',
                  userSelect: sortable ? 'none' : 'auto',
                  color: isSorted ? 'var(--accent)' : undefined,
                }}
              >
                {c.label}{isSorted ? (sort?.dir === 'desc' ? ' ↓' : ' ↑') : ''}
              </span>
            );
          })}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
            {emptyMessage}
          </div>
        ) : (
          <div className="stagger-in">
            {sorted.map((row) => {
              const key = rowKey(row);
              const expanded = expandedKey === key;
              return (
                <div key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                    onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridTemplate,
                      padding: 'var(--space-3) var(--space-4)',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.1s ease',
                      background: expanded ? 'var(--bg-surface)' : 'transparent',
                    }}
                  >
                    {columns.map((c) => (
                      <div key={c.key} style={{ textAlign: c.align ?? 'left', minWidth: 0 }}>
                        {c.render(row)}
                      </div>
                    ))}
                  </div>
                  {expanded && renderExpanded && (
                    <div style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)' }}>
                      {renderExpanded(row)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
