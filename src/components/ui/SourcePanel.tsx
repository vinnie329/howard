import type { Source } from '@/types';
import RadarChart from './RadarChart';
import StatsGrid from './StatsGrid';

interface SourcePanelProps {
  source: Source;
  contentCount: number;
  predictionCount: number;
  accuracy: number;
}

export default function SourcePanel({
  source,
  contentCount,
  predictionCount,
  accuracy,
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

    </div>
  );
}
