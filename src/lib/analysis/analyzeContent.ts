import Anthropic from '@anthropic-ai/sdk';

export interface AnalysisResult {
  display_title: string;
  sentiment_overall: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  sentiment_score: number;
  summary: string;
  key_quotes: string[];
  themes: string[];
  assets_mentioned: string[];
  referenced_people: string[];
  predictions: Array<{
    claim: string;
    themes: string[];
    assets_mentioned: string[];
    sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    time_horizon: string;
    confidence: string;
    specificity: 'hard' | 'directional' | 'thematic';
  }>;
}

// Stem: strip trailing s/es/ing for fuzzy word comparison
function stem(word: string): string {
  return word.replace(/(ing|es|s)$/i, '').toLowerCase();
}

// Score how well raw matches a canonical label using word overlap
function overlapScore(raw: string, label: string): number {
  const rawWords = raw.toLowerCase().split(/[\s/,&-]+/).map(stem).filter(Boolean);
  const labelWords = label.toLowerCase().split(/[\s/,&-]+/).map(stem).filter(Boolean);
  // Count how many label words appear in raw words
  const hits = labelWords.filter((lw) => rawWords.some((rw) => rw === lw || rw.includes(lw) || lw.includes(rw)));
  if (hits.length === 0) return 0;
  return hits.length / labelWords.length;
}

export function matchToCanonical(raw: string, labels: string[]): string {
  if (!raw || labels.length === 0) return raw;
  const lower = raw.toLowerCase();
  // Exact match
  const exact = labels.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;
  // Substring match
  const contained = labels.filter(
    (l) => lower.includes(l.toLowerCase()) || l.toLowerCase().includes(lower)
  );
  if (contained.length > 0) return contained.sort((a, b) => a.length - b.length)[0];
  // Word overlap — require all label words to be present in raw (or stemmed equivalent)
  const scored = labels
    .map((l) => ({ label: l, score: overlapScore(raw, l) }))
    .filter((s) => s.score >= 0.8) // at least 80% of label words match
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) return scored[0].label;
  return raw;
}

export async function analyzeContent(
  title: string,
  rawText: string,
  sourceName: string,
  apiKey: string
): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey });

  // Truncate very long transcripts to stay within token limits
  const maxChars = 80000;
  const text = rawText.length > maxChars
    ? rawText.slice(0, maxChars) + '\n\n[...transcript truncated]'
    : rawText;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are analyzing content from ${sourceName}, a financial analyst/investor. Extract structured insights from this content.

Title: ${title}
Transcript/Text:
${text}

Respond in JSON format only (no markdown fences) with these fields:
{
  "display_title": "clean, concise title capturing the key insight (max 80 chars, no HTML entities, written like an intelligence briefing headline)",
  "sentiment_overall": "bullish" | "bearish" | "neutral" | "mixed",
  "sentiment_score": number between -1 (very bearish) and 1 (very bullish),
  "summary": "2-3 sentence summary of the key points",
  "key_quotes": ["array of 2-4 notable direct quotes from the text"],
  "themes": ["array of 3-6 broad, reusable theme tags. Use short phrases (1-3 words max) that could apply across multiple pieces of content. Examples: 'NVIDIA', 'Liquidity', 'Gold', 'AI CapEx', 'Energy', 'China', 'Fed Policy', 'Semiconductors', 'Data Centers'. NOT article titles or long descriptions — e.g. 'NVIDIA' not 'NVIDIA's Strategic Moat', 'Data Centers' not 'Data Center Infrastructure and Power'"],
  "assets_mentioned": ["array of specific assets/tickers mentioned, e.g. 'BTC', 'NVDA', 'US Treasuries'"],
  "referenced_people": ["array of notable people mentioned or referenced"],
  "predictions": [
    {
      "claim": "specific prediction or forward-looking statement made",
      "themes": ["relevant themes from the themes array above — use the EXACT same labels"],
      "assets_mentioned": ["relevant assets from the assets_mentioned array above — use the EXACT same labels"],
      "sentiment": "bullish | bearish | neutral | mixed",
      "time_horizon": "timeframe if mentioned, otherwise 'unspecified'",
      "confidence": "high/medium/low based on language strength",
      "specificity": "hard (specific price/date target) | directional (clear up/down call) | thematic (broad thesis or narrative)"
    }
  ]
}

If the content doesn't contain meaningful financial analysis (e.g. it's an intro, ad, or off-topic), return minimal results with sentiment_overall "neutral" and empty arrays.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON — handle potential markdown fences
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonStr) as AnalysisResult;

  // Clamp sentiment score
  parsed.sentiment_score = Math.max(-1, Math.min(1, parsed.sentiment_score));

  // Normalize prediction themes/assets to match the canonical lists
  const canonicalThemes = parsed.themes || [];
  const canonicalAssets = parsed.assets_mentioned || [];
  for (const pred of parsed.predictions) {
    pred.themes = (pred.themes || []).map((t) => matchToCanonical(t, canonicalThemes));
    pred.assets_mentioned = (pred.assets_mentioned || []).map((a) => matchToCanonical(a, canonicalAssets));
  }

  return parsed;
}
