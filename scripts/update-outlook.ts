import { createClient } from '@supabase/supabase-js';
import { evaluateOutlook, type AnalysisWithSource } from '../src/lib/analysis/evaluateOutlook';
import type { Outlook } from '../src/types';
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

const anthropicKey: string = process.env.ANTHROPIC_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TIME_HORIZONS = ['short', 'medium', 'long'] as const;

async function fetchRecentAnalyses(): Promise<AnalysisWithSource[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('analyses')
    .select('*, content!inner(id, title, platform, published_at, source_id, sources!inner(name, weighted_score))')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Failed to fetch recent analyses:', error?.message);
    return [];
  }

  return data.map((row) => {
    const content = row.content as Record<string, unknown>;
    const source = content.sources as Record<string, unknown>;

    return {
      content_id: content.id as string,
      title: content.title as string,
      platform: content.platform as string,
      published_at: content.published_at as string,
      summary: row.summary || '',
      sentiment_overall: row.sentiment_overall,
      sentiment_score: row.sentiment_score,
      themes: (row.themes || []) as string[],
      predictions: (row.predictions || []) as string[],
      key_quotes: (row.key_quotes || []) as string[],
      source_name: source.name as string,
      source_weighted_score: source.weighted_score as number,
    };
  });
}

async function fetchCurrentOutlooks(): Promise<Outlook[]> {
  const { data, error } = await supabase
    .from('outlook')
    .select('*');

  if (error || !data) {
    console.error('Failed to fetch outlooks:', error?.message);
    return [];
  }

  return data.map((o) => ({
    id: o.id,
    time_horizon: o.time_horizon,
    domain: o.domain || 'general',
    title: o.title,
    subtitle: o.subtitle || '',
    thesis_intro: o.thesis_intro || '',
    thesis_points: (o.thesis_points || []) as Outlook['thesis_points'],
    positioning: (o.positioning || []) as string[],
    key_themes: (o.key_themes || []) as string[],
    sentiment: o.sentiment,
    confidence: o.confidence,
    supporting_sources: (o.supporting_sources || []) as { name: string; weight: number }[],
    last_updated: o.last_updated,
    created_at: o.created_at,
  }));
}

async function run() {
  console.log('=== Howard Outlook Updater ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Fetch recent analyses (last 30 days)
  const analyses = await fetchRecentAnalyses();
  console.log(`Found ${analyses.length} analyses from last 30 days\n`);

  if (analyses.length === 0) {
    console.log('No recent analyses to evaluate. Done!');
    return;
  }

  // Fetch current outlooks
  const outlooks = await fetchCurrentOutlooks();
  console.log(`Found ${outlooks.length} outlook(s)\n`);

  for (const horizon of TIME_HORIZONS) {
    const outlook = outlooks.find((o) => o.time_horizon === horizon);
    if (!outlook) {
      console.log(`No ${horizon}-term outlook found, skipping.\n`);
      continue;
    }

    console.log(`--- Evaluating ${horizon}-term outlook ---`);
    console.log(`  Current: "${outlook.title}" (${outlook.sentiment}, ${outlook.confidence}%)`);

    try {
      const evaluation = await evaluateOutlook(outlook, analyses, horizon, anthropicKey);

      console.log(`  Should update: ${evaluation.should_update}`);
      console.log(`  Reasoning: ${evaluation.reasoning}`);

      if (evaluation.should_update) {
        // Build update payload
        const updatePayload: Record<string, unknown> = {
          last_updated: new Date().toISOString(),
        };

        if (evaluation.updated_title) updatePayload.title = evaluation.updated_title;
        if (evaluation.updated_thesis_intro) updatePayload.thesis_intro = evaluation.updated_thesis_intro;
        if (evaluation.updated_thesis_points) updatePayload.thesis_points = evaluation.updated_thesis_points;
        if (evaluation.updated_positioning) updatePayload.positioning = evaluation.updated_positioning;
        if (evaluation.updated_key_themes) updatePayload.key_themes = evaluation.updated_key_themes;
        if (evaluation.updated_sentiment) updatePayload.sentiment = evaluation.updated_sentiment;
        if (evaluation.updated_confidence !== undefined && evaluation.updated_confidence !== null) {
          updatePayload.confidence = evaluation.updated_confidence;
        }

        // Apply update
        const { error: updateError } = await supabase
          .from('outlook')
          .update(updatePayload)
          .eq('id', outlook.id);

        if (updateError) {
          console.error(`  Error updating outlook:`, updateError.message);
        } else {
          console.log(`  Updated ${horizon}-term outlook`);
          for (const change of evaluation.changes_summary) {
            console.log(`    - ${change}`);
          }
        }

        // Log to history
        const { error: historyError } = await supabase
          .from('outlook_history')
          .insert({
            outlook_id: outlook.id,
            time_horizon: horizon,
            evaluation_reasoning: evaluation.reasoning,
            changes_summary: evaluation.changes_summary,
            previous_sentiment: outlook.sentiment,
            new_sentiment: evaluation.updated_sentiment || outlook.sentiment,
            previous_confidence: outlook.confidence,
            new_confidence: evaluation.updated_confidence ?? outlook.confidence,
            analyses_evaluated: analyses.length,
          });

        if (historyError) {
          console.error(`  Error logging history:`, historyError.message);
        }
      } else {
        // Log no-change to history too
        const { error: historyError } = await supabase
          .from('outlook_history')
          .insert({
            outlook_id: outlook.id,
            time_horizon: horizon,
            evaluation_reasoning: evaluation.reasoning,
            changes_summary: [],
            previous_sentiment: outlook.sentiment,
            new_sentiment: outlook.sentiment,
            previous_confidence: outlook.confidence,
            new_confidence: outlook.confidence,
            analyses_evaluated: analyses.length,
          });

        if (historyError) {
          console.error(`  Error logging history:`, historyError.message);
        }
      }
    } catch (err) {
      console.error(`  ${horizon}-term evaluation failed:`, err instanceof Error ? err.message : err);
    }

    console.log('');
  }

  console.log('=== Outlook update complete ===');
}

run();
