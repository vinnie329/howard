/**
 * backtest-predictions.ts — Evaluate predictions against market reality using Claude.
 *
 * For each pending prediction whose time horizon has elapsed (or is close),
 * this script:
 *   1. Fetches relevant market data (price changes for mentioned assets)
 *   2. Uses Claude to assess whether the prediction was correct
 *   3. Updates the prediction with outcome, reasoning, and score
 *   4. Recomputes per-source accuracy metrics
 *
 * Usage:
 *   npx tsx scripts/backtest-predictions.ts              # evaluate due predictions
 *   npx tsx scripts/backtest-predictions.ts --force      # re-evaluate all (including already scored)
 *   npx tsx scripts/backtest-predictions.ts --dry-run    # preview without writing
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
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
const anthropic = new Anthropic();

const BATCH_DELAY_MS = 1500;
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a time horizon string like "3 months", "6 months", "12 months" into milliseconds. */
function parseHorizonMs(horizon: string): number {
  const match = horizon.match(/(\d+)\s*(day|week|month|year)/i);
  if (!match) return 90 * 24 * 60 * 60 * 1000; // default 90 days
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const dayMs = 24 * 60 * 60 * 1000;
  switch (unit) {
    case 'day': return num * dayMs;
    case 'week': return num * 7 * dayMs;
    case 'month': return num * 30 * dayMs;
    case 'year': return num * 365 * dayMs;
    default: return 90 * dayMs;
  }
}

/** Check if a prediction is due for evaluation (horizon elapsed or 80%+ elapsed). */
function isDue(dateMade: string, horizon: string): boolean {
  const horizonMs = parseHorizonMs(horizon);
  const elapsed = Date.now() - new Date(dateMade).getTime();
  return elapsed >= horizonMs * 0.8; // evaluate when 80% of horizon has passed
}

/** Fetch recent price data for an asset ticker from Yahoo Finance. */
async function fetchAssetPrice(ticker: string): Promise<{ price: number; change30d: number; change90d: number } | null> {
  try {
    // Map common names to tickers
    const tickerMap: Record<string, string> = {
      'S&P 500': '^GSPC', 'NASDAQ': '^IXIC', 'Gold': 'GC=F', 'GLD': 'GLD',
      'Bitcoin': 'BTC-USD', 'BTC': 'BTC-USD', 'US Dollar': 'DX-Y.NYB',
      'US Treasuries': 'TLT', 'Credit': 'HYG', 'QQQ': 'QQQ',
      'NVIDIA': 'NVDA', 'AMD': 'AMD', 'TSMC': 'TSM', 'Microsoft': 'MSFT',
    };
    const symbol = tickerMap[ticker] || ticker;

    const end = Math.floor(Date.now() / 1000);
    const start = end - 90 * 24 * 60 * 60; // 90 days ago
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Howard/1.0' } });
    if (!res.ok) return null;

    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes || closes.length < 2) return null;

    const validCloses = closes.filter((c: number | null) => c !== null);
    const current = validCloses[validCloses.length - 1];
    const thirtyDaysAgo = validCloses[Math.max(0, validCloses.length - 22)];
    const ninetyDaysAgo = validCloses[0];

    return {
      price: current,
      change30d: ((current - thirtyDaysAgo) / thirtyDaysAgo) * 100,
      change90d: ((current - ninetyDaysAgo) / ninetyDaysAgo) * 100,
    };
  } catch {
    return null;
  }
}

interface PredictionRow {
  id: string;
  claim: string;
  themes: string[];
  assets_mentioned: string[];
  sentiment: string;
  time_horizon: string;
  confidence: string;
  specificity: string;
  date_made: string;
  source_id: string;
  outcome: string | null;
}

interface EvaluationResult {
  outcome: 'correct' | 'incorrect' | 'partially_correct' | 'expired';
  outcome_score: number;
  outcome_reasoning: string;
  market_context: Record<string, unknown>;
}

async function evaluatePrediction(
  prediction: PredictionRow,
  marketData: Record<string, { price: number; change30d: number; change90d: number } | null>,
): Promise<EvaluationResult> {
  const marketSummary = Object.entries(marketData)
    .filter(([, v]) => v !== null)
    .map(([asset, data]) =>
      `${asset}: Current $${data!.price.toFixed(2)}, 30d change: ${data!.change30d.toFixed(1)}%, 90d change: ${data!.change90d.toFixed(1)}%`
    )
    .join('\n');

  const prompt = `You are evaluating whether a financial prediction came true based on market data.

PREDICTION:
- Claim: ${prediction.claim}
- Sentiment: ${prediction.sentiment}
- Date Made: ${prediction.date_made}
- Time Horizon: ${prediction.time_horizon}
- Confidence: ${prediction.confidence}
- Specificity: ${prediction.specificity}
- Assets Mentioned: ${prediction.assets_mentioned.join(', ') || 'None specific'}
- Themes: ${prediction.themes.join(', ')}

MARKET DATA (as of today, ${new Date().toISOString().split('T')[0]}):
${marketSummary || 'No market data available for mentioned assets.'}

EVALUATION CRITERIA:
- "correct": The prediction clearly materialized as described
- "partially_correct": The general direction was right but magnitude/timing was off, OR only part of the claim proved true
- "incorrect": The prediction did not materialize or the opposite occurred
- "expired": The time horizon passed and the prediction is no longer evaluable (too vague, no measurable criteria)

For "specificity" context:
- "hard" predictions have specific numbers/targets — evaluate strictly
- "directional" predictions have direction (up/down) — evaluate if direction was right
- "thematic" predictions describe trends — evaluate if the theme played out

Respond in valid JSON only:
{
  "outcome": "correct" | "incorrect" | "partially_correct" | "expired",
  "outcome_score": <number 0-1, where 1 = perfectly correct>,
  "reasoning": "<2-3 sentence explanation of your evaluation>"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { outcome: 'expired', outcome_score: 0, outcome_reasoning: 'Failed to parse evaluation', market_context: {} };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    outcome: parsed.outcome,
    outcome_score: parsed.outcome_score,
    outcome_reasoning: parsed.reasoning,
    market_context: marketData,
  };
}

/** Recompute source_performance for a given source based on all their evaluated predictions. */
async function updateSourcePerformance(sourceId: string) {
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('source_id', sourceId);

  if (!predictions || predictions.length === 0) return;

  const evaluated = predictions.filter((p) => p.outcome && p.outcome !== 'pending');
  const correct = evaluated.filter((p) => p.outcome === 'correct');
  const incorrect = evaluated.filter((p) => p.outcome === 'incorrect');
  const partial = evaluated.filter((p) => p.outcome === 'partially_correct');
  const expired = evaluated.filter((p) => p.outcome === 'expired');

  // Accuracy: correct=1, partial=0.5, incorrect=0, expired excluded
  const scorable = evaluated.filter((p) => p.outcome !== 'expired');
  const accuracyRate = scorable.length > 0
    ? (correct.length + partial.length * 0.5) / scorable.length
    : 0;

  // Weighted accuracy: weight by confidence level
  const confidenceWeights: Record<string, number> = { high: 1.5, medium: 1.0, low: 0.5 };
  let weightedCorrect = 0;
  let weightedTotal = 0;
  for (const p of scorable) {
    const w = confidenceWeights[p.confidence] || 1.0;
    weightedTotal += w;
    if (p.outcome === 'correct') weightedCorrect += w;
    else if (p.outcome === 'partially_correct') weightedCorrect += w * 0.5;
  }
  const weightedAccuracy = weightedTotal > 0 ? weightedCorrect / weightedTotal : 0;

  // Avg confidence when correct vs incorrect
  const confMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const avgConfCorrect = correct.length > 0
    ? correct.reduce((sum, p) => sum + (confMap[p.confidence] || 2), 0) / correct.length
    : 0;
  const avgConfIncorrect = incorrect.length > 0
    ? incorrect.reduce((sum, p) => sum + (confMap[p.confidence] || 2), 0) / incorrect.length
    : 0;

  // Performance by horizon
  const byHorizon: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const p of scorable) {
    const h = p.time_horizon || 'unknown';
    if (!byHorizon[h]) byHorizon[h] = { total: 0, correct: 0, accuracy: 0 };
    byHorizon[h].total++;
    if (p.outcome === 'correct') byHorizon[h].correct++;
    else if (p.outcome === 'partially_correct') byHorizon[h].correct += 0.5;
  }
  for (const h of Object.keys(byHorizon)) {
    byHorizon[h].accuracy = byHorizon[h].total > 0 ? byHorizon[h].correct / byHorizon[h].total : 0;
  }

  // Performance by specificity
  const bySpecificity: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const p of scorable) {
    const s = p.specificity || 'unknown';
    if (!bySpecificity[s]) bySpecificity[s] = { total: 0, correct: 0, accuracy: 0 };
    bySpecificity[s].total++;
    if (p.outcome === 'correct') bySpecificity[s].correct++;
    else if (p.outcome === 'partially_correct') bySpecificity[s].correct += 0.5;
  }
  for (const s of Object.keys(bySpecificity)) {
    bySpecificity[s].accuracy = bySpecificity[s].total > 0 ? bySpecificity[s].correct / bySpecificity[s].total : 0;
  }

  // Best/worst domain (by theme accuracy)
  const byTheme: Record<string, { total: number; correct: number }> = {};
  for (const p of scorable) {
    for (const theme of (p.themes || [])) {
      if (!byTheme[theme]) byTheme[theme] = { total: 0, correct: 0 };
      byTheme[theme].total++;
      if (p.outcome === 'correct') byTheme[theme].correct++;
      else if (p.outcome === 'partially_correct') byTheme[theme].correct += 0.5;
    }
  }
  const themeAccuracies = Object.entries(byTheme)
    .filter(([, v]) => v.total >= 2) // need at least 2 predictions in a theme
    .map(([theme, v]) => ({ theme, accuracy: v.correct / v.total }));
  themeAccuracies.sort((a, b) => b.accuracy - a.accuracy);
  const bestDomain = themeAccuracies[0]?.theme || null;
  const worstDomain = themeAccuracies[themeAccuracies.length - 1]?.theme || null;

  // Streak calculation (sorted by date, most recent first)
  const sortedEval = scorable.sort(
    (a, b) => new Date(b.evaluated_at || b.created_at).getTime() - new Date(a.evaluated_at || a.created_at).getTime()
  );
  let streakCurrent = 0;
  for (const p of sortedEval) {
    if (p.outcome === 'correct' || p.outcome === 'partially_correct') streakCurrent++;
    else break;
  }
  // Best streak
  let streakBest = 0;
  let currentRun = 0;
  for (const p of [...sortedEval].reverse()) {
    if (p.outcome === 'correct' || p.outcome === 'partially_correct') {
      currentRun++;
      if (currentRun > streakBest) streakBest = currentRun;
    } else {
      currentRun = 0;
    }
  }

  const performanceRow = {
    source_id: sourceId,
    total_predictions: predictions.length,
    evaluated_predictions: evaluated.length,
    correct: correct.length,
    incorrect: incorrect.length,
    partially_correct: partial.length,
    expired: expired.length,
    accuracy_rate: Math.round(accuracyRate * 1000) / 1000,
    weighted_accuracy: Math.round(weightedAccuracy * 1000) / 1000,
    avg_confidence_when_correct: Math.round(avgConfCorrect * 100) / 100,
    avg_confidence_when_incorrect: Math.round(avgConfIncorrect * 100) / 100,
    best_domain: bestDomain,
    worst_domain: worstDomain,
    performance_by_horizon: byHorizon,
    performance_by_specificity: bySpecificity,
    streak_current: streakCurrent,
    streak_best: streakBest,
    last_evaluated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Upsert
  const { error } = await supabase
    .from('source_performance')
    .upsert(performanceRow, { onConflict: 'source_id' });

  if (error) {
    console.error(`  Failed to update performance for source ${sourceId}:`, error.message);
  }

  // Also update the source's credibility "performance" score (1-5 scale)
  // Map accuracy_rate (0-1) to 1-5 scale, with minimum of 2 evaluated predictions
  if (scorable.length >= 2) {
    const perfScore = Math.round((1 + accuracyRate * 4) * 10) / 10; // 1.0 to 5.0
    const { data: source } = await supabase.from('sources').select('scores').eq('id', sourceId).single();
    if (source?.scores) {
      const updatedScores = { ...source.scores, performance: perfScore };
      await supabase.from('sources').update({ scores: updatedScores }).eq('id', sourceId);
    }
  }
}

async function main() {
  const startTime = Date.now();
  console.log('=== Howard Prediction Backtester ===\n');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : force ? 'FORCE (re-evaluate all)' : 'Normal'}\n`);

  // Fetch predictions to evaluate
  let query = supabase
    .from('predictions')
    .select('*')
    .order('date_made', { ascending: true });

  if (!force) {
    query = query.or('outcome.is.null,outcome.eq.pending');
  }

  const { data: predictions, error } = await query;
  if (error) {
    console.error('Failed to fetch predictions:', error.message);
    process.exit(1);
  }

  if (!predictions || predictions.length === 0) {
    console.log('No predictions to evaluate.');
    return;
  }

  console.log(`Found ${predictions.length} predictions to consider.\n`);

  // Filter to only due predictions
  const due = force
    ? predictions
    : predictions.filter((p) => isDue(p.date_made || p.created_at, p.time_horizon || '3 months'));

  console.log(`${due.length} predictions are due for evaluation.\n`);

  if (due.length === 0) return;

  let resolved = 0;
  const sourcesAffected = new Set<string>();

  for (const pred of due) {
    console.log(`Evaluating: "${pred.claim.substring(0, 60)}..."`);

    // Fetch market data for mentioned assets
    const marketData: Record<string, { price: number; change30d: number; change90d: number } | null> = {};
    for (const asset of (pred.assets_mentioned || [])) {
      marketData[asset] = await fetchAssetPrice(asset);
    }

    const result = await evaluatePrediction(pred as PredictionRow, marketData);
    console.log(`  → ${result.outcome} (score: ${result.outcome_score})`);
    console.log(`  → ${result.outcome_reasoning}\n`);

    if (!dryRun) {
      const { error: updateErr } = await supabase
        .from('predictions')
        .update({
          outcome: result.outcome,
          outcome_score: result.outcome_score,
          outcome_reasoning: result.outcome_reasoning,
          market_context: result.market_context,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', pred.id);

      if (updateErr) {
        console.error(`  Failed to update prediction ${pred.id}:`, updateErr.message);
      } else {
        resolved++;
        sourcesAffected.add(pred.source_id);
      }
    } else {
      resolved++;
      sourcesAffected.add(pred.source_id);
    }

    await sleep(BATCH_DELAY_MS);
  }

  // Update source performance metrics
  if (!dryRun) {
    console.log(`\nUpdating performance metrics for ${sourcesAffected.size} sources...`);
    for (const sourceId of sourcesAffected) {
      await updateSourcePerformance(sourceId);
      console.log(`  Updated source: ${sourceId}`);
    }
  }

  // Log the backtest run
  const duration = Date.now() - startTime;
  if (!dryRun) {
    await supabase.from('backtest_runs').insert({
      predictions_evaluated: due.length,
      predictions_resolved: resolved,
      sources_updated: sourcesAffected.size,
      run_duration_ms: duration,
      notes: force ? 'Force re-evaluation' : null,
    });
  }

  console.log(`\n=== Backtest Complete ===`);
  console.log(`Predictions evaluated: ${due.length}`);
  console.log(`Predictions resolved: ${resolved}`);
  console.log(`Sources updated: ${sourcesAffected.size}`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error('Backtest failed:', err);
  process.exit(1);
});
