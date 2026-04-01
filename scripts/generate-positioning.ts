/**
 * generate-positioning.ts — Generate AI positioning synthesis from all intelligence data.
 * Follows the generate-signals.ts pattern: gather data → prompt Claude → cache to Supabase.
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

// ── Technicals (inline Yahoo Finance fetch) ─────────────────────────────

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

interface TechnicalLine {
  ticker: string;
  name: string;
  price: number;
  dev200d: number | null;
  dev200w: number | null;
}

async function fetchTechnicals(): Promise<{ text: string; data: TechnicalLine[] }> {
  const lines: string[] = [];
  const data: TechnicalLine[] = [];

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
      data.push({ ticker: displaySymbol, name: sym.name, price, dev200d, dev200w });
    } catch {
      // skip
    }
  }

  return { text: lines.join('\n'), data };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Howard Positioning Generator ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // 1. Outlooks
  console.log('Fetching outlooks...');
  const { data: outlooks } = await supabase
    .from('outlook')
    .select('*');
  console.log(`  ${outlooks?.length ?? 0} outlooks`);

  // 2. Technicals
  console.log('Fetching technicals...');
  const technicals = await fetchTechnicals();
  console.log(`  ${technicals.data.length} symbols`);

  // 3. Today's signals
  const todayKey = new Date().toISOString().slice(0, 10);
  console.log('Fetching today\'s signals...');
  const { data: signalsRow } = await supabase
    .from('signals_cache')
    .select('data')
    .eq('key', todayKey)
    .single();
  const signals = signalsRow?.data ?? [];
  console.log(`  ${Array.isArray(signals) ? signals.length : 0} signals`);

  // 4. Recent analyses (7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  console.log('Fetching recent analyses...');
  const { data: analyses } = await supabase
    .from('analyses')
    .select('sentiment_overall, sentiment_score, assets_mentioned, themes, summary, content:content_id(title, published_at, source:source_id(name))')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false });
  console.log(`  ${analyses?.length ?? 0} recent analyses\n`);

  // 5. House predictions (active shorts/longs from house view)
  console.log('Fetching house predictions...');
  const { data: housePredictions } = await supabase
    .from('house_predictions')
    .select('*')
    .eq('outcome', 'pending')
    .order('confidence', { ascending: false });
  console.log(`  ${housePredictions?.length ?? 0} active house predictions\n`);

  // ── Format data blocks ──────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlooksBlock = (outlooks ?? []).map((o: any) => {
    return `[${o.time_horizon}] "${o.title}" — Sentiment: ${o.sentiment} (${o.confidence}% confidence)\n` +
      `  Thesis: ${o.thesis_intro || ''}\n` +
      `  Points: ${(o.thesis_points || []).map((p: { text: string }) => p.text).join('; ')}\n` +
      `  Positioning: ${(o.positioning || []).join('; ')}\n` +
      `  Themes: ${(o.key_themes || []).join(', ')}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signalsBlock = (Array.isArray(signals) ? signals : []).map((s: any) => {
    return `[${s.type}] ${s.headline} (severity: ${s.severity})\n  ${s.detail}\n  Assets: ${(s.assets || []).join(', ')}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysesBlock = (analyses ?? []).map((a: any) => {
    const src = a.content?.source?.name ?? 'Unknown';
    const title = a.content?.title ?? '';
    return `[${src}] "${title}" — ${a.sentiment_overall} (${a.sentiment_score})\n` +
      `  Themes: ${(a.themes ?? []).join(', ')}\n` +
      `  Summary: ${a.summary ?? ''}`;
  }).join('\n\n');

  // Fat pitch candidates from technicals
  const fatPitchCandidates = technicals.data
    .filter((t) => t.dev200d !== null && t.dev200d < -15)
    .sort((a, b) => (a.dev200d ?? 0) - (b.dev200d ?? 0))
    .slice(0, 10);

  const fatPitchBlock = fatPitchCandidates.length > 0
    ? fatPitchCandidates.map((t) => `${t.name} (${t.ticker}): ${t.dev200d!.toFixed(1)}% from 200d MA, price $${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join('\n')
    : 'No assets currently >15% below 200d MA.';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const housePredictionsBlock = (housePredictions ?? []).map((hp: any) => {
    const arrow = hp.direction === 'long' ? '↑ LONG' : hp.direction === 'short' ? '↓ SHORT' : '↔ NEUTRAL';
    return `${arrow} ${hp.asset} [${hp.confidence}% confidence, ${hp.conviction}]\n` +
      `  Claim: ${hp.claim}\n` +
      `  Target: ${hp.target_condition}\n` +
      `  Thesis: ${hp.thesis}\n` +
      `  Horizon: ${hp.time_horizon} (${hp.deadline_days}d)`;
  }).join('\n\n');

  // ── Prompt Claude ─────────────────────────────────────────────────────

  const prompt = `You are an elite macro strategist and portfolio positioning advisor. You have access to a private intelligence database tracking trusted investors, analysts, and founders. Below is today's complete data set.

Your job: synthesize ALL of this into a cohesive positioning view. Think like a CIO writing a daily positioning memo for a sophisticated allocator.

═══ OUTLOOKS (3 horizons) ═══
${outlooksBlock}

═══ TODAY'S AI SIGNALS (${Array.isArray(signals) ? signals.length : 0}) ═══
${signalsBlock}

═══ RECENT ANALYSES (last 7 days, ${analyses?.length ?? 0} total) ═══
${analysesBlock}

═══ CURRENT TECHNICAL POSITIONS ═══
${technicals.text}

═══ FAT PITCH CANDIDATES (>15% below 200d MA) ═══
${fatPitchBlock}

═══ HOUSE VIEW PREDICTIONS (${housePredictions?.length ?? 0} active) ═══
${housePredictionsBlock || 'No active house predictions.'}

Return a JSON object with this exact structure:
{
  "narrative": "3-5 paragraphs of positioning prose. This is the core — a cohesive macro view synthesizing all data. Reference specific sources by name, specific price levels, and specific thesis points. Write in a direct, authoritative style. Start with the macro regime, then flow to sector views, then individual positioning. Do NOT use markdown formatting — write plain prose with line breaks between paragraphs.",
  "opportunities": [
    { "ticker": "SYMBOL", "name": "Full Name", "rationale": "1-2 sentence reason this is interesting NOW" }
  ],
  "shorts": [
    { "ticker": "SYMBOL", "name": "Full Name", "rationale": "1-2 sentence reason to be short/underweight this asset NOW", "confidence": 65 }
  ],
  "fat_pitches": [
    { "ticker": "SYMBOL", "name": "Full Name", "dev200d": -20.5 }
  ],
  "avoids": ["brief description of what to avoid and why"],
  "posture": "aggressive" | "lean-in" | "neutral" | "cautious" | "defensive"
}

Guidelines:
- "posture" reflects your overall read of the environment — be honest
- "opportunities" should be 3-8 thesis-driven LONG positions supported by the data (NOT just technically oversold)
- "shorts" should be 2-5 specific SHORT/UNDERWEIGHT positions derived from house view predictions. Every house view prediction with direction "short" and confidence >= 40% MUST appear here. Include the confidence score from the house view. These are active bearish positions, not just vague "avoids".
- "fat_pitches" should be assets meaningfully below their moving averages (use the fat pitch candidates above as input, include dev200d values)
- "avoids" should be 2-4 broader themes/sectors to stay away from (distinct from specific shorts)
- The narrative should feel like it was written by a human CIO, not a template
- Be contrarian where the data supports it — don't just summarize consensus
- IMPORTANT: The narrative MUST address both sides of the book — long opportunities AND short positions. Don't only talk about what to buy.

Return ONLY the JSON object, no other text.`;

  console.log('Generating positioning with Claude...');
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to parse positioning from Claude response');
    console.error('Raw response:', text.slice(0, 500));
    process.exit(1);
  }

  const positioning = JSON.parse(jsonMatch[0]);
  positioning.generated_at = new Date().toISOString();

  console.log(`  Posture: ${positioning.posture}`);
  console.log(`  Opportunities: ${positioning.opportunities?.length ?? 0}`);
  console.log(`  Fat pitches: ${positioning.fat_pitches?.length ?? 0}`);
  console.log(`  Avoids: ${positioning.avoids?.length ?? 0}\n`);

  // ── Cache to Supabase ───────────────────────────────────────────────

  const { error } = await supabase.from('positioning_cache').upsert({
    key: todayKey,
    data: positioning,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) {
    console.error('Cache write failed:', error.message);
  } else {
    console.log(`Cached positioning for ${todayKey}`);
  }

  // Print narrative preview
  const preview = positioning.narrative?.slice(0, 200) ?? '';
  console.log(`\nNarrative preview:\n  "${preview}..."\n`);
  console.log('=== Done! ===');
}

main().catch((err) => {
  console.error('Positioning generation failed:', err);
  process.exit(1);
});
