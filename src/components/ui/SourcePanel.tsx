import type { Source, Prediction } from '@/types';
import RadarChart from './RadarChart';
import StatsGrid from './StatsGrid';

interface SourcePanelProps {
  source: Source;
  contentCount: number;
  predictionCount: number;
  accuracy: number;
  predictions: Prediction[];
}

export default function SourcePanel({
  source,
  contentCount,
  predictionCount,
  accuracy,
  predictions,
}: SourcePanelProps) {
  return (
    <div>
      {/* Source header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--bg-surface-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontWeight: 500,
          flexShrink: 0,
        }}>
          {source.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{source.name}</div>
          <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
            {source.domains.map((d) => (
              <span key={d} className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Radar chart */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <RadarChart scores={source.scores} weightedScore={source.weighted_score} />
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <StatsGrid stats={[
          { value: String(contentCount), label: 'Items' },
          { value: String(predictionCount), label: 'Predictions' },
          { value: `${accuracy}%`, label: 'Accuracy' },
          { value: source.weighted_score.toFixed(2), label: 'Score' },
        ]} />
      </div>

      {/* Active predictions */}
      <div>
        <div className="panel-section-title">Active Predictions</div>
        {predictions.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No active predictions</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {predictions.map((pred) => (
              <div key={pred.id} style={{
                padding: 'var(--space-3)',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                  {pred.claim}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                    {pred.themes.map((t) => (
                      <span key={t} className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{t}</span>
                    ))}
                    {pred.assets_mentioned.map((a) => (
                      <span key={a} className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{a}</span>
                    ))}
                  </div>
                  <span style={{
                    fontSize: 9,
                    padding: '1px 4px',
                    borderRadius: 2,
                    background: pred.sentiment === 'bearish'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : pred.sentiment === 'bullish'
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(136, 136, 136, 0.12)',
                    color: pred.sentiment === 'bearish' ? '#ef4444'
                      : pred.sentiment === 'bullish' ? '#22c55e'
                      : 'var(--text-secondary)',
                  }}>
                    {pred.sentiment}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {pred.time_horizon}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
