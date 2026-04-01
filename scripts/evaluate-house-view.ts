/**
 * evaluate-house-view.ts — Evaluate Howard's house predictions against market data.
 *
 * For each pending prediction whose deadline has passed (or is close):
 *   1. Fetches current price for the asset
 *   2. Evaluates the target condition against reality
 *   3. Computes Brier scores and calibration metrics
 *   4. Updates track record — biased towards high-confidence predictions
 *
 * Usage:
 *   npx tsx scripts/evaluate-house-view.ts              # evaluate due predictions
 *   npx tsx scripts/evaluate-house-view.ts --force      # evaluate all pending
 *   npx tsx scripts/evaluate-house-view.ts --dry-run    # preview without writing
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

const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

interface HousePredRow {
  id: string;
  claim: string;
  asset: string;
  direction: string;
  target_value: number | null;
  target_condition: string;
  reference_value: number | null;
  time_horizon: string;
  deadline: string;
  confidence: number;
  conviction: string;
  thesis: string;
  invalidation_criteria: string | null;
  category: string;
}

async function evaluatePrediction(
  pred: HousePredRow,
  currentPrice: number | null,
): Promise<{ outcome: string; outcome_score: number; reasoning: string }> {
  const prompt = `You are evaluating whether a specific financial prediction came true.

PREDICTION:
- Claim: ${pred.claim}
- Asset: ${pred.asset}
- Direction: ${pred.direction}
- Target condition: ${pred.target_condition}
- Reference price (when predicted): ${pred.reference_value !== null ? `$${pred.reference_value}` : 'N/A'}
- Current price: ${currentPrice !== null ? `$${currentPrice}` : 'N/A'}
- Deadline: ${pred.deadline}
- Confidence: ${pred.confidence}%

RULES:
- "correct": The target condition was clearly met
- "partially_correct": The direction was right but target not fully met (e.g. predicted 10% drop, got 6%)
- "incorrect": The prediction was wrong — opposite direction or condition not met
- "expired": Cannot evaluate (no price data, condition unmeasurable)

Be strict. A prediction is "correct" only if the specific condition was met.

Respond in valid JSON:
{
  "outcome": "correct" | "incorrect" | "partially_correct" | "expired",
  "outcome_score": <0 to 1>,
  "reasoning": "<2-3 sentence explanation>"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { outcome: 'expired', outcome_score: 0, reasoning: 'Failed to parse evaluation' };
  }
  return JSON.parse(jsonMatch[0]);
}

/** Compute Brier score: measures calibration quality. Lower = better. */
function brierScore(confidence: number, correct: boolean): number {
  const prob = confidence / 100;
  const outcome = correct ? 1 : 0;
  return (prob - outcome) ** 2;
}

/** Update calibration table and track record. Biases accuracy towards high-confidence predictions. */
async function updateCalibrationAndTrackRecord() {
  // Fetch all evaluated house predictions
  const { data: evaluated } = await supabase
    .from('house_predictions')
    .select('*')
    .neq('outcome', 'pending')
    .is('superseded_by', null); // only count latest versions

  if (!evaluated || evaluated.length === 0) return;

  const scorable = evaluated.filter((p) => p.outcome !== 'expired' && p.outcome !== 'invalidated');

  // --- Calibration by confidence bucket ---
  const buckets = new Map<number, { total: number; correct: number }>();
  for (const p of scorable) {
    const bucket = Math.round(p.confidence / 10) * 10;
    const entry = buckets.get(bucket) || { total: 0, correct: 0 };
    entry.total++;
    if (p.outcome === 'correct') entry.correct++;
    else if (p.outcome === 'partially_correct') entry.correct += 0.5;
    buckets.set(bucket, entry);
  }

  // Upsert calibration rows
  for (const [bucket, data] of buckets) {
    const actualRate = data.total > 0 ? data.correct / data.total : 0;
    const expectedRate = bucket / 100;
    const calibError = Math.abs(actualRate - expectedRate);

    if (!dryRun) {
      await supabase.from('house_calibration').upsert({
        confidence_bucket: bucket,
        total_predictions: data.total,
        correct_predictions: Math.round(data.correct),
        actual_rate: Math.round(actualRate * 1000) / 1000,
        calibration_error: Math.round(calibError * 1000) / 1000,
        category: 'all',
        computed_at: new Date().toISOString(),
      }, { onConflict: 'confidence_bucket,category' });
    }

    console.log(`  Bucket ${bucket}%: ${data.total} predictions, ${(actualRate * 100).toFixed(1)}% actual (error: ${(calibError * 100).toFixed(1)}%)`);
  }

  // --- Overall track record (confidence-weighted) ---
  const correct = scorable.filter((p) => p.outcome === 'correct');
  const partial = scorable.filter((p) => p.outcome === 'partially_correct');
  const incorrect = scorable.filter((p) => p.outcome === 'incorrect');

  // Simple accuracy
  const overallAccuracy = scorable.length > 0
    ? (correct.length + partial.length * 0.5) / scorable.length
    : 0;

  // Weighted accuracy — high-confidence predictions count more
  let weightedCorrect = 0;
  let weightedTotal = 0;
  for (const p of scorable) {
    const weight = p.confidence / 50; // 80% confidence → weight 1.6, 30% → weight 0.6
    weightedTotal += weight;
    if (p.outcome === 'correct') weightedCorrect += weight;
    else if (p.outcome === 'partially_correct') weightedCorrect += weight * 0.5;
  }
  const weightedAccuracy = weightedTotal > 0 ? weightedCorrect / weightedTotal : 0;

  // Brier score
  const totalBrier = scorable.reduce((sum, p) => {
    return sum + brierScore(p.confidence, p.outcome === 'correct');
  }, 0);
  const avgBrier = scorable.length > 0 ? totalBrier / scorable.length : 0;

  // Avg confidence
  const avgConf = scorable.length > 0
    ? scorable.reduce((s, p) => s + p.confidence, 0) / scorable.length
    : 0;

  // Best/worst category
  const byCategory = new Map<string, { total: number; correct: number }>();
  for (const p of scorable) {
    const cat = p.category || 'unknown';
    const entry = byCategory.get(cat) || { total: 0, correct: 0 };
    entry.total++;
    if (p.outcome === 'correct') entry.correct++;
    else if (p.outcome === 'partially_correct') entry.correct += 0.5;
    byCategory.set(cat, entry);
  }
  const catAccuracies = Array.from(byCategory.entries())
    .filter(([, v]) => v.total >= 2)
    .map(([cat, v]) => ({ cat, accuracy: v.correct / v.total }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const { data: pendingCount } = await supabase
    .from('house_predictions')
    .select('id', { count: 'exact', head: true })
    .eq('outcome', 'pending')
    .is('superseded_by', null);

  const trackRecord = {
    total_predictions: evaluated.length,
    evaluated: scorable.length,
    correct: correct.length,
    partially_correct: partial.length,
    incorrect: incorrect.length,
    overall_accuracy: Math.round(overallAccuracy * 1000) / 1000,
    weighted_accuracy: Math.round(weightedAccuracy * 1000) / 1000,
    brier_score: Math.round(avgBrier * 1000) / 1000,
    avg_confidence: Math.round(avgConf * 10) / 10,
    best_category: catAccuracies[0]?.cat || null,
    worst_category: catAccuracies[catAccuracies.length - 1]?.cat || null,
    active_predictions: pendingCount || 0,
    computed_at: new Date().toISOString(),
  };

  if (!dryRun) {
    await supabase.from('house_track_record').insert(trackRecord);
  }

  console.log(`\n  Track Record:`);
  console.log(`    Overall accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
  console.log(`    Weighted accuracy (confidence-biased): ${(weightedAccuracy * 100).toFixed(1)}%`);
  console.log(`    Brier score: ${avgBrier.toFixed(3)} (lower = better calibrated, 0 = perfect)`);
  console.log(`    Avg confidence: ${avgConf.toFixed(1)}%`);
}

async function main() {
  console.log('=== Howard House View Evaluator ===\n');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : force ? 'FORCE' : 'Normal'}\n`);

  // Fetch pending predictions
  let query = supabase
    .from('house_predictions')
    .select('*')
    .eq('outcome', 'pending')
    .is('superseded_by', null) // only evaluate latest version
    .order('deadline', { ascending: true });

  if (!force) {
    // Only evaluate predictions past 80% of their lifetime or past deadline
    query = query.lte('deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  }

  const { data: predictions, error } = await query;
  if (error) {
    console.error('Failed to fetch predictions:', error.message);
    process.exit(1);
  }

  if (!predictions || predictions.length === 0) {
    console.log('No predictions due for evaluation.\n');
    // Still update calibration from existing data
    console.log('Updating calibration and track record...');
    await updateCalibrationAndTrackRecord();
    return;
  }

  console.log(`${predictions.length} predictions to evaluate.\n`);

  let resolved = 0;

  for (const pred of predictions) {
    console.log(`Evaluating: "${pred.claim}"`);
    console.log(`  Asset: ${pred.asset} | Confidence: ${pred.confidence}% | Deadline: ${new Date(pred.deadline).toLocaleDateString()}`);

    const currentPrice = await fetchPrice(pred.asset);
    console.log(`  Current price: ${currentPrice !== null ? `$${currentPrice.toFixed(2)}` : 'N/A'}`);
    console.log(`  Reference price: ${pred.reference_value !== null ? `$${pred.reference_value}` : 'N/A'}`);

    const result = await evaluatePrediction(pred as HousePredRow, currentPrice);
    console.log(`  → ${result.outcome} (score: ${result.outcome_score})`);
    console.log(`  → ${result.reasoning}\n`);

    if (!dryRun) {
      const { error: updateErr } = await supabase
        .from('house_predictions')
        .update({
          outcome: result.outcome,
          outcome_score: result.outcome_score,
          outcome_reasoning: result.reasoning,
          final_value: currentPrice,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', pred.id);

      if (updateErr) {
        console.error(`  Update failed: ${updateErr.message}`);
      } else {
        resolved++;
      }
    } else {
      resolved++;
    }

    await sleep(1500);
  }

  // Update calibration
  console.log('\nUpdating calibration and track record...');
  await updateCalibrationAndTrackRecord();

  console.log(`\n=== Evaluation Complete ===`);
  console.log(`Predictions evaluated: ${predictions.length}`);
  console.log(`Predictions resolved: ${resolved}`);
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
