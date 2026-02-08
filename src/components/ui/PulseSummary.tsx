import type { ContentWithAnalysis } from '@/types';

interface PulseSummaryProps {
  items: ContentWithAnalysis[];
}

function computePulse(items: ContentWithAnalysis[]) {
  if (items.length === 0) {
    return {
      sentiment: 'No data',
      theme: '—',
      divergences: 'Insufficient data to detect divergences.',
      signal_count: '0 items analyzed',
    };
  }

  // Aggregate sentiment
  const scores = items
    .map((i) => i.analysis.sentiment_score)
    .filter((s) => s !== 0 || items.length === 1);
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  let sentiment: string;
  if (avgScore > 0.3) sentiment = `Bullish (${avgScore.toFixed(2)})`;
  else if (avgScore < -0.3) sentiment = `Bearish (${avgScore.toFixed(2)})`;
  else if (avgScore > 0.1) sentiment = `Leaning Bullish (${avgScore.toFixed(2)})`;
  else if (avgScore < -0.1) sentiment = `Leaning Bearish (${avgScore.toFixed(2)})`;
  else sentiment = `Neutral (${avgScore.toFixed(2)})`;

  // Top theme by frequency
  const themeCounts = new Map<string, number>();
  for (const item of items) {
    for (const theme of item.analysis.themes) {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }
  }
  const topTheme = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const theme = topTheme ? `${topTheme[0]} (${topTheme[1]}x)` : '—';

  // Detect divergences: sources with opposing sentiments
  const bullishSources = items
    .filter((i) => i.analysis.sentiment_score > 0.3)
    .map((i) => i.source.name);
  const bearishSources = items
    .filter((i) => i.analysis.sentiment_score < -0.3)
    .map((i) => i.source.name);

  let divergences: string;
  if (bullishSources.length > 0 && bearishSources.length > 0) {
    const bullNames = Array.from(new Set(bullishSources)).slice(0, 2).join(', ');
    const bearNames = Array.from(new Set(bearishSources)).slice(0, 2).join(', ');
    divergences = `${bullNames} bullish vs ${bearNames} bearish.`;
  } else {
    divergences = 'No major divergences detected — sources largely aligned.';
  }

  const analyzed = items.filter((i) => i.analysis.id).length;
  const signal_count = `${analyzed} item${analyzed !== 1 ? 's' : ''} analyzed · ${themeCounts.size} themes`;

  return { sentiment, theme, divergences, signal_count };
}

export default function PulseSummary({ items }: PulseSummaryProps) {
  const data = computePulse(items);

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
