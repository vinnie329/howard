'use client';

import MicroLoader from '@/components/ui/MicroLoader';

export default function LoaderDemoPage() {
  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>System</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Loader Demo</span>
      </div>

      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>MicroLoader</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', maxWidth: 480, lineHeight: 1.5 }}>
          Dot grid loader that cycles through circle, square, and triangle shapes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Default */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <span className="label">Default (accent)</span>
            </div>
            <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center', background: 'var(--bg-panel)' }}>
              <MicroLoader label="Loading intelligence..." />
            </div>
          </div>

          {/* Colors */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <span className="label">Color variants</span>
            </div>
            <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 'var(--space-8)', background: 'var(--bg-panel)' }}>
              <MicroLoader color="var(--accent)" label="Accent" />
              <MicroLoader color="#22c55e" label="Green" />
              <MicroLoader color="#60a5fa" label="Blue" />
              <MicroLoader color="#a855f7" label="Purple" />
              <MicroLoader color="#ef4444" label="Red" />
            </div>
          </div>

          {/* In context */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <span className="label">In context</span>
            </div>
            <div style={{ display: 'flex', background: 'var(--bg-panel)' }}>
              <div style={{ flex: 1, padding: 'var(--space-8)', display: 'flex', justifyContent: 'center', borderRight: '1px solid var(--border)' }}>
                <MicroLoader label="Analyzing patterns across all data..." />
              </div>
              <div style={{ flex: 1, padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}>
                <MicroLoader color="#22c55e" label="Fetching technicals..." />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
