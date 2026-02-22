/**
 * generate-signals.ts — Generate AI signals from analyses, predictions, and technicals.
 * Standalone version of /api/technicals/signals that runs without the dev server.
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Technicals (inline from /api/technicals) ────────────────────────────

const SYMBOLS = [
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'MU', name: 'Micron' },
  { ticker: 'MRVL', name: 'Marvell' },
  { ticker: 'AVGO', name: 'Broadcom' },
  { ticker: 'ANET', name: 'Arista' },
  { ticker: 'VST', name: 'Vistra' },
  { ticker: 'ARM', name: 'ARM Holdings' },
  { ticker: 'PLTR', name: 'Palantir' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'GOOGL', name: 'Google' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'META', name: 'Meta' },
  { ticker: 'AMD', name: 'AMD' },
  { ticker: 'INTC', name: 'Intel' },
  { ticker: 'TSM', name: 'TSMC' },
  { ticker: 'BTC-USD', name: 'Bitcoin' },
  { ticker: 'ETH-USD', name: 'Ethereum' },
  { ticker: 'GC=F', name: 'Gold' },
  { ticker: 'SI=F', name: 'Silver' },
  { ticker: 'HG=F', name: 'Copper' },
  { ticker: '^GSPC', name: 'S&P 500' },
  { ticker: '^IXIC', name: 'NASDAQ' },
];

function computeSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

async function fetchChartData(ticker: string, range: string, interval: string): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const closes: (number | null)[] = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((v): v is number => v !== null);
  } catch {
    return [];
  }
}

async function fetchTechnicalData(): Promise<string> {
  const lines: string[] = [];

  for (const sym of SYMBOLS) {
    try {
      const [daily, weekly] = await Promise.all([
        fetchChartData(sym.ticker, '1y', '1d'),
        fetchChartData(sym.ticker, '5y', '1wk'),
      ]);
      if (daily.length === 0) continue;

      const price = daily[daily.length - 1];
      const displaySymbol = sym.ticker.replace('=F', '').replace('^', '').replace('-USD', '');
      const ma200d = computeSMA(daily, 200);
      const dev200d = ma200d ? ((price - ma200d) / ma200d) * 100 : null;
      const ma200w = computeSMA(weekly, 200);
      const dev200w = ma200w ? ((price - ma200w) / ma200w) * 100 : null;

      let line = `${sym.name} (${displaySymbol}): $${Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      if (dev200d != null) line += ` | 200d MA: ${dev200d > 0 ? '+' : ''}${dev200d.toFixed(1)}%`;
      if (dev200w != null) line += ` | 200w MA: ${dev200w > 0 ? '+' : ''}${dev200w.toFixed(1)}%`;
      lines.push(line);
    } catch {
      // skip
    }
  }

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Howard Signal Generator ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Gather data
  console.log('Fetching analyses...');
  const { data: analyses } = await supabase
    .from('analyses')
    .select('sentiment_overall, sentiment_score, assets_mentioned, themes, summary, content:content_id(title, published_at, source:source_id(name))')
    .order('created_at', { ascending: false });

  console.log(`  ${analyses?.length ?? 0} analyses`);

  console.log('Fetching predictions...');
  const { data: predictions } = await supabase
    .from('predictions')
    .select('claim, assets_mentioned, themes, sentiment, time_horizon, confidence, specificity, source:source_id(name)')
    .order('created_at', { ascending: false });

  console.log(`  ${predictions?.length ?? 0} predictions`);

  console.log('Fetching technicals...');
  const technicalsBlock = await fetchTechnicalData();
  const techCount = technicalsBlock.split('\n').filter(Boolean).length;
  console.log(`  ${techCount} symbols\n`);

  // Format for Claude
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysesBlock = (analyses ?? []).map((a: any) => {
    const src = a.content?.source?.name ?? 'Unknown';
    const title = a.content?.title ?? '';
    return `[${src}] "${title}" — Sentiment: ${a.sentiment_overall} (${a.sentiment_score})\n` +
      `  Themes: ${(a.themes ?? []).join(', ')}\n` +
      `  Assets: ${(a.assets_mentioned ?? []).join(', ') || 'none'}\n` +
      `  Summary: ${a.summary ?? ''}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const predictionsBlock = (predictions ?? []).map((p: any) => {
    const src = p.source?.name ?? 'Unknown';
    return `[${src}] ${p.claim}\n` +
      `  Sentiment: ${p.sentiment} | Horizon: ${p.time_horizon ?? '?'} | Confidence: ${p.confidence ?? '?'}\n` +
      `  Themes: ${(p.themes ?? []).join(', ')} | Assets: ${(p.assets_mentioned ?? []).join(', ') || 'none'}`;
  }).join('\n\n');

  const prompt = `You are an elite financial analyst reviewing a private intelligence database. Below is ALL the data — source analyses (from trusted investors/analysts), their predictions, and current technical positions of tracked assets.

Your job: find the most interesting, non-obvious patterns, connections, contradictions, and insights across ALL of this data. Think like a macro strategist looking for alpha.

Things to look for:
- Sources who disagree with each other on the same thesis (and who might be right given the data)
- Themes getting consensus attention — is the crowd right or is this a crowded trade?
- Assets where the technical position tells a different story than the narrative
- Connections between seemingly unrelated analyses (e.g. two sources talking about different things that actually imply the same macro bet)
- Things that look overstretched, dangerous, or under-appreciated
- Predictions that are aging well or poorly given current prices
- Regime signals — what does the overall pattern of asset positions suggest about the macro environment?

Be honest and direct. If something looks dangerous say so. If a "bullish" 200w reading actually means extreme overextension, call it out. Think critically — a +137% move from 200w MA is NOT bullish, it's terrifying.

═══ SOURCE ANALYSES (${analyses?.length ?? 0} total) ═══
${analysesBlock}

═══ PREDICTIONS (${predictions?.length ?? 0} total) ═══
${predictionsBlock}

═══ CURRENT TECHNICAL POSITIONS ═══
${technicalsBlock}

Return a JSON array of 6-10 signal objects. Each signal should be a genuine insight that connects multiple data points. Format:
[
  {
    "type": "SHORT_LABEL",
    "severity": "high" | "medium" | "low",
    "headline": "One compelling sentence about the pattern you found.",
    "detail": "2-3 sentences of analysis explaining WHY this matters and what it implies. Reference specific sources, numbers, and data points. Be specific, not generic.",
    "assets": ["TICKER1", "TICKER2"],
    "color": "#hex"
  }
]

Type should be a short 1-3 word label like: CROWDED TRADE, HIDDEN RISK, NARRATIVE GAP, SMART MONEY SPLIT, REGIME SHIFT, OVERSTRETCH, CONTRARIAN SIGNAL, THESIS AGING, UNDER THE RADAR, MACRO DISCONNECT, etc.

Color: use #22c55e for opportunity/confirmation, #ef4444 for danger/risk, #eab308 for caution/watch, #a855f7 for unusual/contrarian, #60a5fa for informational.

Return ONLY the JSON array, no other text.`;

  // Call Claude
  console.log('Generating signals with Claude...');
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Failed to parse signals from Claude response');
    process.exit(1);
  }

  const signals = JSON.parse(jsonMatch[0]);
  console.log(`  Generated ${signals.length} signals\n`);

  // Cache to Supabase
  const todayKey = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('signals_cache').upsert({
    key: todayKey,
    data: signals,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) {
    console.error('Cache write failed:', error.message);
  } else {
    console.log(`Cached signals for ${todayKey}`);
  }

  // Print summary
  for (const s of signals) {
    const icon = s.severity === 'high' ? '!!' : s.severity === 'medium' ? ' !' : '  ';
    console.log(`  ${icon} [${s.type}] ${s.headline}`);
  }

  console.log('\n=== Done! ===');
}

main().catch((err) => {
  console.error('Signal generation failed:', err);
  process.exit(1);
});
