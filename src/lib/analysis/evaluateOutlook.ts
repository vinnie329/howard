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

const SHORT_TERM_THEMES = [
  'liquidity', 'fed', 'repo', 'volatility', 'sentiment', 'crypto',
  'positioning', 'options', 'vix', 'flows', 'short-term', 'catalyst',
  'earnings', 'bitcoin', 'risk-off', 'risk-on',
];

const MEDIUM_TERM_THEMES = [
  'cycle', 'policy', 'gold', 'inflation', 'rates', 'rotation',
  'yield', 'semiconductor', 'energy', 'commodities', 'capex',
  'fiscal', 'manufacturing', 'grid', 'memory', 'copper', 'uranium',
];

const LONG_TERM_THEMES = [
  'structural', 'demographics', 'debt', 'ai transformation', 'deglobalization',
  'energy transition', 'sovereignty', 'nationalism', 'nuclear', 'labor',
  'ubi', 'monetary reset', 'regime change', 'geopolitics', 'rare earth',
];

export function getTimeHorizonRelevance(
  themes: string[],
  timeHorizon: 'short' | 'medium' | 'long',
): number {
  const themeSet = timeHorizon === 'short'
    ? SHORT_TERM_THEMES
    : timeHorizon === 'medium'
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

  // Base relevance of 0.2 (all content has some relevance) + match bonus
  return Math.min(1, 0.2 + (matches / Math.max(themes.length, 1)) * 0.8);
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
): Promise<OutlookEvaluation> {
  // Weight and sort analyses by relevance
  const weighted = recentAnalyses
    .map((a) => ({ analysis: a, weight: getAnalysisWeight(a, timeHorizon) }))
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

  const horizonDesc = timeHorizon === 'short'
    ? 'short-term (30 days) — Focus on immediate catalysts, liquidity, sentiment'
    : timeHorizon === 'medium'
      ? 'medium-term (12 months) — Focus on cyclical factors, policy shifts, sector rotations'
      : 'long-term (5+ years) — Focus on structural trends, regime changes, secular shifts';

  const client = new Anthropic({ apiKey: anthropicKey });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `You are Howard, a financial intelligence system that maintains market outlooks across three time horizons. You synthesize insights from trusted sources, weighted by their credibility scores.

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

## Your Task
Evaluate whether the ${horizonDesc} outlook should be updated based on this new intelligence.

Consider:
1. **Confirmation**: Does new information strengthen existing thesis points?
2. **Contradiction**: Does anything challenge or invalidate current views?
3. **New signals**: Are there important themes or risks not currently captured?
4. **Source weighting**: Higher credibility sources (4.0+) should carry more weight
5. **Recency**: More recent analyses are more relevant
6. **Time horizon fit**: Only include information relevant to the ${timeHorizon}-term view

Respond in JSON only (no markdown fences):
{
  "should_update": boolean,
  "reasoning": "Explain why update is or isn't warranted",
  "updated_title": "New title if changed, otherwise null",
  "updated_thesis_intro": "New intro if changed, otherwise null",
  "updated_thesis_points": [{"heading": "Point title", "content": "Point content"}] or null if unchanged,
  "updated_positioning": ["Position 1", "Position 2"] or null if unchanged,
  "updated_key_themes": ["theme1", "theme2"] or null if unchanged,
  "updated_sentiment": "bullish|bearish|cautious|neutral" or null if unchanged,
  "updated_confidence": number 0-100 or null if unchanged,
  "changes_summary": ["Brief description of each change made"]
}

Important:
- Only recommend updates when there's meaningful new information
- Preserve the structure and format of thesis points
- Maintain consistency in tone and style
- If updating, provide the COMPLETE updated field, not just the changes
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
