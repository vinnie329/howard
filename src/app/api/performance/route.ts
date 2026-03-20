import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const [performanceRes, runsRes, predictionsRes, sourcesRes] = await Promise.all([
      supabase.from('source_performance').select('*').order('accuracy_rate', { ascending: false }),
      supabase.from('backtest_runs').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('predictions').select('id, source_id, outcome, outcome_score, confidence, specificity, time_horizon, sentiment, evaluated_at'),
      supabase.from('sources').select('id, name, slug, avatar_url, scores, weighted_score'),
    ]);

    const performance = performanceRes.data || [];
    const runs = runsRes.data || [];
    const predictions = predictionsRes.data || [];
    const sources = sourcesRes.data || [];

    // Aggregate stats
    const totalPredictions = predictions.length;
    const evaluated = predictions.filter((p) => p.outcome && p.outcome !== 'pending');
    const correct = evaluated.filter((p) => p.outcome === 'correct').length;
    const partial = evaluated.filter((p) => p.outcome === 'partially_correct').length;
    const incorrect = evaluated.filter((p) => p.outcome === 'incorrect').length;
    const pending = predictions.filter((p) => !p.outcome || p.outcome === 'pending').length;

    const overallAccuracy = evaluated.length > 0
      ? (correct + partial * 0.5) / evaluated.filter((p) => p.outcome !== 'expired').length
      : 0;

    return NextResponse.json({
      sources: sources.map((s) => {
        const perf = performance.find((p) => p.source_id === s.id);
        return { ...s, performance: perf || null };
      }),
      aggregate: {
        total_predictions: totalPredictions,
        evaluated: evaluated.length,
        correct,
        partially_correct: partial,
        incorrect,
        pending,
        overall_accuracy: Math.round(overallAccuracy * 1000) / 10,
      },
      recent_runs: runs,
    });
  } catch (err) {
    console.error('Performance API error:', err);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
