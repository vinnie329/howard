import type { CredibilityScores, CredibilityDimension } from '@/types';

export const WEIGHTS: Record<CredibilityDimension, number> = {
  intelligence: 1.0,
  intuition_eq: 1.1,
  sincerity: 1.4,
  access: 1.2,
  independence: 1.3,
  capital_at_risk: 1.1,
  reputational_sensitivity: 0.8,
  performance: 1.5,
};

export const DIMENSION_LABELS: Record<CredibilityDimension, string> = {
  intelligence: 'Intelligence',
  intuition_eq: 'Intuition / EQ',
  sincerity: 'Sincerity',
  access: 'Access',
  independence: 'Independence',
  capital_at_risk: 'Capital at Risk',
  reputational_sensitivity: 'Reputational Sensitivity',
  performance: 'Performance',
};

export function calculateWeightedScore(scores: CredibilityScores): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dimension, weight] of Object.entries(WEIGHTS)) {
    const key = dimension as CredibilityDimension;
    weightedSum += scores[key] * weight;
    totalWeight += weight;
  }

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}
