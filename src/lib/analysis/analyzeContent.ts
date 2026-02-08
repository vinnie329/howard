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
    asset_or_theme: string;
    direction: string;
    time_horizon: string;
    confidence: string;
  }>;
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
    model: 'claude-sonnet-4-5-20250929',
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
      "asset_or_theme": "what it's about",
      "direction": "bullish/bearish/specific target",
      "time_horizon": "timeframe if mentioned, otherwise 'unspecified'",
      "confidence": "high/medium/low based on language strength"
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

  return parsed;
}
