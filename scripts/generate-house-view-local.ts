/**
 * generate-house-view-local.ts — Generate house view from mock/local data.
 * Use when Supabase is not configured.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const anthropic = new Anthropic();

// Import mock data directly
import { mockSources, mockPredictions, mockOutlook } from '../src/lib/mock-data';

interface GeneratedPrediction {
  claim: string;
  asset: string;
  direction: 'long' | 'short' | 'neutral';
  target_value: number | null;
  target_condition: string;
  time_horizon: string;
  deadline_days: number;
  confidence: number;
  conviction: 'high' | 'medium' | 'low';
  thesis: string;
  supporting_sources: string[];
  key_drivers: string[];
  invalidation_criteria: string;
  category: string;
  themes: string[];
}

async function fetchPrice(ticker: string): Promise<number | null> {
  const tickerMap: Record<string, string> = {
    'S&P 500': '^GSPC', 'SPY': 'SPY', 'SPX': '^GSPC',
    'NASDAQ': '^IXIC', 'QQQ': 'QQQ',
    'Gold': 'GC=F', 'GLD': 'GLD',
    'Bitcoin': 'BTC-USD', 'BTC': 'BTC-USD', 'BTC-USD': 'BTC-USD',
    'Silver': 'SI=F', 'Oil': 'CL=F', 'Crude': 'CL=F',
    'TLT': 'TLT', 'US10Y': '^TNX', 'DXY': 'DX-Y.NYB',
    'NVDA': 'NVDA', 'AAPL': 'AAPL', 'MSFT': 'MSFT', 'AMD': 'AMD',
    'TSMC': 'TSM', 'SOXX': 'SOXX', 'PAVE': 'PAVE',
    'Copper': 'HG=F', 'Uranium': 'URA',
  };
  const symbol = tickerMap[ticker] || ticker;
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 5 * 24 * 60 * 60;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Howard/1.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes || closes.length === 0) return null;
    return closes.filter((c: number | null) => c !== null).pop() || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Howard House View Generator (Local Mode) ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Build context from mock data
  const outlookSummary = mockOutlook.map((o) => {
    return `[${o.time_horizon.toUpperCase()}] "${o.title}" — ${o.sentiment} (confidence: ${o.confidence}/100)
  Thesis: ${o.thesis_intro}
  Key themes: ${o.key_themes.join(', ')}
  Positioning: ${o.positioning.join('; ')}`;
  }).join('\n\n');

  const predictionsSummary = mockPredictions.map((p) => {
    const source = mockSources.find((s) => s.id === p.source_id);
    return `[${source?.name || 'Unknown'} (credibility: ${source?.weighted_score || 3}/5, performance: ${source?.scores.performance || 3}/5)] ${p.claim}
    Sentiment: ${p.sentiment} | Confidence: ${p.confidence} | Specificity: ${p.specificity} | Horizon: ${p.time_horizon} | Assets: ${p.assets_mentioned.join(', ') || 'none'}`;
  }).join('\n');

  console.log('Intelligence summary:');
  console.log(`  Outlooks: ${mockOutlook.length}`);
  console.log(`  Source predictions: ${mockPredictions.length}`);
  console.log(`  Sources: ${mockSources.length}\n`);

  console.log('Synthesizing house view with Claude...\n');

  const prompt = `You are Howard, an AI financial intelligence system that synthesizes predictions from multiple expert sources into a coherent house view. Your job is to generate SPECIFIC, FALSIFIABLE, TIME-BOUND predictions with calibrated confidence ratings.

## YOUR INTELLIGENCE

### Current Outlooks
${outlookSummary}

### Source Predictions (weighted by credibility)
${predictionsSummary}

## INSTRUCTIONS

Generate 5-8 house predictions. Each must be:

1. **Asset-specific**: tied to a tradeable asset (ticker or commodity)
2. **Falsifiable**: has a clear target condition that can be measured
3. **Time-bound**: has a specific deadline (30 days to 12 months)
4. **Confidence-calibrated**:
   - Only assign high confidence (70-90%) when multiple high-credibility sources agree AND the data strongly supports it
   - Use medium confidence (40-69%) for directional calls with some uncertainty
   - Use low confidence (20-39%) for contrarian or speculative calls
   - NEVER go above 90% — markets are inherently uncertain
   - Your confidence should reflect the ACTUAL probability you believe this will happen

5. **Source-weighted**: Give more weight to predictions from sources with higher credibility scores and better track records (performance scores). A prediction backed by Howard Marks (4.39/5) should carry more weight than one from a lower-rated source.

6. **Bias towards conviction**: Prefer generating fewer, higher-confidence predictions over many low-confidence ones. Howard's value comes from having strong, well-reasoned calls — not from hedging everything.

Categories: macro, sector, single-stock, rates, commodities, crypto

For each prediction, provide invalidation criteria — what would prove it wrong early, so we can cut losses on bad calls.

Respond in valid JSON array format:
[
  {
    "claim": "S&P 500 will decline 10%+ from current levels",
    "asset": "SPY",
    "direction": "short",
    "target_value": 480,
    "target_condition": "below 480 (10% decline from ~533)",
    "time_horizon": "6 months",
    "deadline_days": 180,
    "confidence": 65,
    "conviction": "medium",
    "thesis": "Liquidity withdrawal + elevated valuations + multiple credible sources calling for correction",
    "supporting_sources": ["Howard Marks", "Michael Howell", "Mike Burry"],
    "key_drivers": ["Fed liquidity drain", "Valuation compression", "Credit tightening"],
    "invalidation_criteria": "SPY breaks above 560 with expanding breadth and improving liquidity metrics",
    "category": "macro",
    "themes": ["Market Correction", "Liquidity Tightening"]
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Failed to parse Claude response.');
    console.error('Raw:', text.substring(0, 500));
    process.exit(1);
  }

  const generated: GeneratedPrediction[] = JSON.parse(jsonMatch[0]);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  HOWARD HOUSE VIEW — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Fetch prices and display
  for (const pred of generated.sort((a, b) => b.confidence - a.confidence)) {
    const price = await fetchPrice(pred.asset);
    const arrow = pred.direction === 'long' ? '↑' : pred.direction === 'short' ? '↓' : '↔';
    const convColor = pred.conviction === 'high' ? '●●●' : pred.conviction === 'medium' ? '●●○' : '●○○';

    console.log(`${arrow} [${pred.confidence}% ${convColor}] ${pred.claim}`);
    console.log(`  Asset: ${pred.asset}${price ? ` (current: $${price.toFixed(2)})` : ''}`);
    console.log(`  Target: ${pred.target_condition}`);
    console.log(`  Horizon: ${pred.time_horizon} (${pred.deadline_days} days)`);
    console.log(`  Category: ${pred.category} | Themes: ${pred.themes.join(', ')}`);
    console.log(`  Thesis: ${pred.thesis}`);
    console.log(`  Drivers: ${pred.key_drivers.join(' | ')}`);
    console.log(`  Sources: ${pred.supporting_sources.join(', ')}`);
    console.log(`  Invalidation: ${pred.invalidation_criteria}`);
    console.log('');
  }

  console.log(`${'─'.repeat(60)}`);
  console.log(`  ${generated.length} predictions generated`);
  console.log(`  Avg confidence: ${(generated.reduce((s, p) => s + p.confidence, 0) / generated.length).toFixed(1)}%`);
  console.log(`  High conviction (70-90%): ${generated.filter((p) => p.confidence >= 70).length}`);
  console.log(`  Medium conviction (40-69%): ${generated.filter((p) => p.confidence >= 40 && p.confidence < 70).length}`);
  console.log(`  Low conviction (20-39%): ${generated.filter((p) => p.confidence < 40).length}`);
  console.log(`${'─'.repeat(60)}\n`);

  console.log('To persist to database, configure Supabase and run:');
  console.log('  npx tsx scripts/generate-house-view.ts');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
