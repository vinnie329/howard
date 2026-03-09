'use client';

import { useState, useEffect } from 'react';

export default function PipelineBanner() {
  const [status, setStatus] = useState<{
    healthy: boolean;
    message: string | null;
    lastDate: string | null;
    ageHours: number;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/pipeline-status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status || status.healthy || dismissed) return null;

  return (
    <div
      style={{
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fca5a5',
        padding: '8px 16px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        zIndex: 100,
      }}
    >
      <span style={{ color: '#ef4444', flexShrink: 0 }}>&#x26A0;</span>
      <span>
        {status.message}
        {status.lastDate && (
          <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
            Last successful run: {status.lastDate} ({status.ageHours}h ago)
          </span>
        )}
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#fca5a5',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}
