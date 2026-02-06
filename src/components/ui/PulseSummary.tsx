import type { PulseSummaryData } from '@/types';

interface PulseSummaryProps {
  data: PulseSummaryData;
}

export default function PulseSummary({ data }: PulseSummaryProps) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-6)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      background: 'var(--bg-panel)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span className="label">Daily Pulse</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Sentiment</div>
          <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>
            {data.sentiment}
          </div>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Key Theme</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {data.theme}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Divergence: </strong>
          {data.divergences}
        </div>
      </div>

      <div style={{
        marginTop: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span className="mono" style={{ fontSize: 10 }}>{data.signal_count}</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
