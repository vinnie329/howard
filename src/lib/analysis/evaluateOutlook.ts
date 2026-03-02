import Anthropic from '@anthropic-ai/sdk';
import type { Outlook } from '@/types';

export interface AnalysisWithSource {
  content_id: string;
  title: string;
  platform: string;
  published_at: string;
  summary: string;
  sentiment_overall: string;
  sentiment_score: number;
  themes: string[];
  predictions: string[];
  key_quotes: string[];
  source_name: string;
  source_weighted_score: number;
}

export interface OutlookEvaluation {
  should_update: boolean;
  reasoning: string;
  updated_title?: string;
  updated_thesis_intro?: string;
  updated_thesis_points?: Array<{ heading: string; content: string }>;
  updated_positioning?: string[];
  updated_key_themes?: string[];
  updated_sentiment?: 'bullish' | 'bearish' | 'cautious' | 'neutral';
  updated_confidence?: number;
  changes_summary: string[];
}

// --- Weighting functions ---

const MEDIUM_TERM_THEMES = [
  'cycle', 'policy', 'gold', 'inflation', 'rates', 'rotation',
  'yield', 'semiconductor', 'energy', 'commodities', 'capex',
  'fiscal', 'manufacturing', 'grid', 'memory', 'copper', 'uranium',
  'liquidity', 'fed', 'earnings', 'positioning', 'flows', 'crypto',
  'bitcoin', 'options', 'catalyst',
];

const LONG_TERM_THEMES = [
  'structural', 'demographics', 'debt', 'ai transformation', 'deglobalization',
  'energy transition', 'sovereignty', 'nationalism', 'nuclear', 'labor',
  'ubi', 'monetary reset', 'regime change', 'geopolitics', 'rare earth',
  'ai capex', 'robotics', 'space', 'currency debasement', 'de-dollarization',
  'fiscal deficits', 'debt crisis',
];

export function getTimeHorizonRelevance(
  themes: string[],
  timeHorizon: 'short' | 'medium' | 'long',
): number {
  const themeSet = timeHorizon === 'medium'
    ? MEDIUM_TERM_THEMES
    : LONG_TERM_THEMES;

  const lowerThemes = themes.map((t) => t.toLowerCase());
  let matches = 0;
  for (const theme of lowerThemes) {
    for (const target of themeSet) {
      if (theme.includes(target) || target.includes(theme)) {
        matches++;
        break;
      }
    }
  }

  // Zero base — only content with matching themes gets included
  if (matches === 0) return 0;
  return Math.min(1, matches / Math.max(themes.length, 1));
}

export function getRecencyWeight(publishedAt: string): number {
  const daysAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay: yesterday = ~0.9, 7 days = ~0.5, 30 days = ~0.05
  return Math.exp(-daysAgo / 10);
}

export function getSourceWeight(weightedScore: number): number {
  // 4.5 = 1.0, 3.5 = 0.33, 3.0 = 0
  return Math.max(0, Math.min(1, (weightedScore - 3) / 1.5));
}

export function getAnalysisWeight(
  analysis: AnalysisWithSource,
  timeHorizon: 'short' | 'medium' | 'long',
): number {
  const relevance = getTimeHorizonRelevance(analysis.themes, timeHorizon);
  const recency = getRecencyWeight(analysis.published_at);
  const credibility = getSourceWeight(analysis.source_weighted_score);
  return relevance * recency * credibility;
}

// --- Evaluation function ---

export async function evaluateOutlook(
  currentOutlook: Outlook,
  recentAnalyses: AnalysisWithSource[],
  timeHorizon: 'short' | 'medium' | 'long',
  anthropicKey: string,
  semanticBoostIds?: Set<string>,
): Promise<OutlookEvaluation> {
  // Weight and sort analyses by relevance
  const weighted = recentAnalyses
    .map((a) => {
      let weight = getAnalysisWeight(a, timeHorizon);
      // Boost weight by 1.5x for semantically relevant analyses
      if (semanticBoostIds && semanticBoostIds.has(a.content_id)) {
        weight *= 1.5;
      }
      return { analysis: a, weight };
    })
    .filter((w) => w.weight > 0.05)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 15); // Top 15 most relevant

  if (weighted.length === 0) {
    return {
      should_update: false,
      reasoning: 'No sufficiently relevant recent analyses found for this time horizon.',
      changes_summary: [],
    };
  }

  // Format analyses for prompt
  const analysesText = weighted
    .map(({ analysis: a, weight }) => {
      const lines = [
        `--- ${a.source_name} (Credibility: ${a.source_weighted_score.toFixed(2)}/5, Relevance weight: ${weight.toFixed(2)}) ---`,
        `Date: ${new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        `Platform: ${a.platform}`,
        `Sentiment: ${a.sentiment_overall} (${a.sentiment_score.toFixed(2)})`,
        `Summary: ${a.summary}`,
      ];
      if (a.themes.length > 0) lines.push(`Key themes: ${a.themes.join(', ')}`);
      if (a.predictions.length > 0) lines.push(`Predictions: ${a.predictions.join('; ')}`);
      if (a.key_quotes.length > 0) lines.push(`Key quotes: "${a.key_quotes.slice(0, 2).join('"; "')}"`);
      return lines.join('\n');
    })
    .join('\n\n');

  // Format current thesis points
  const thesisPointsText = currentOutlook.thesis_points
    .map((p) => `  - ${p.heading}: ${p.content}`)
    .join('\n');

  const positioningText = currentOutlook.positioning
    .map((p) => `  - ${p}`)
    .join('\n');

  const horizonDesc = timeHorizon === 'medium'
    ? 'medium-term (12 months) — Focus on cyclical factors, policy shifts, sector rotations, current positioning'
    : 'long-term (5+ years) — Focus ONLY on structural/secular trends, regime changes, demographic shifts';

  const horizonRules = timeHorizon === 'medium'
    ? `MEDIUM-TERM RULES:
- Include: cyclical positioning, rate/policy outlook, sector rotation calls, commodity cycles, earnings-driven theses
- Include: specific trade ideas with 6-12 month timeframes
- EXCLUDE: multi-decade structural shifts (those belong in long-term)
- EXCLUDE: vague generalities — every point must be actionable within 12 months
- Keep thesis_points to 3-5 maximum. Each must be distinct and non-overlapping.
- Keep positioning to 4-6 items maximum. Be specific (e.g. "Overweight gold miners" not "Consider commodities").`
    : `LONG-TERM RULES:
- Include ONLY: structural regime changes, demographic megatrends, technological paradigm shifts, monetary system evolution
- EXCLUDE: anything with a 12-month or shorter timeframe (that belongs in medium-term)
- EXCLUDE: specific trade ideas or cyclical positioning
- Keep thesis_points to 3-4 maximum. Each should describe a multi-year structural force.
- Keep positioning to 3-5 items maximum. These are decade-long portfolio tilts, not trades.`;

  const client = new Anthropic({ apiKey: anthropicKey });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `You are Howard, a financial intelligence system that maintains market outlooks across two time horizons (12-month and 5-year). You synthesize insights from trusted sources, weighted by their credibility scores.

## Current ${timeHorizon.toUpperCase()} Outlook
Title: ${currentOutlook.title}
Subtitle: ${currentOutlook.subtitle}
Thesis: ${currentOutlook.thesis_intro}

Current thesis points:
${thesisPointsText}

Current positioning:
${positioningText}

Current sentiment: ${currentOutlook.sentiment} (${currentOutlook.confidence}% confidence)
Key themes: ${currentOutlook.key_themes.join(', ')}

## Recent Intelligence (Last 30 Days)
${analysesText}

## Horizon Rules
${horizonRules}

## Your Task
Evaluate whether the ${horizonDesc} outlook should be updated based on this new intelligence.

CRITICAL — Precision over volume:
- Less is more. Remove weak or redundant points rather than accumulating.
- Each thesis point must be DISTINCT — no overlapping ideas across points.
- Positioning items must be specific and actionable, not vague.
- If two thesis points say similar things, merge them or drop the weaker one.
- key_themes should be 4-6 items maximum.

Consider:
1. **Confirmation**: Does new information strengthen existing thesis points?
2. **Contradiction**: Does anything challenge or invalidate current views?
3. **New signals**: Are there important themes or risks not currently captured?
4. **Source weighting**: Higher credibility sources (4.0+) should carry more weight
5. **Pruning**: Are any existing points stale, redundant, or better suited to the other time horizon? Remove them.

Respond in JSON only (no markdown fences):
{
  "should_update": boolean,
  "reasoning": "Explain why update is or isn't warranted",
  "updated_title": "New title if changed, otherwise null",
  "updated_thesis_intro": "New intro if changed, otherwise null — keep to 1-2 sentences max",
  "updated_thesis_points": [{"heading": "Point title", "content": "Point content — 1-2 sentences"}] or null if unchanged,
  "updated_positioning": ["Position 1", "Position 2"] or null if unchanged,
  "updated_key_themes": ["theme1", "theme2"] or null if unchanged,
  "updated_sentiment": "bullish|bearish|cautious|neutral" or null if unchanged,
  "updated_confidence": number 0-100 or null if unchanged,
  "changes_summary": ["Brief description of each change made"]
}

Important:
- Only recommend updates when there's meaningful new information
- If updating, provide the COMPLETE updated field, not just the changes
- Prune aggressively — remove anything that doesn't earn its place
- Be specific in your reasoning`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return {
      should_update: false,
      reasoning: 'Failed to get response from Claude.',
      changes_summary: [],
    };
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonStr) as OutlookEvaluation;
}
