import { createClient } from '@supabase/supabase-js';
import { analyzeContent } from '../src/lib/analysis/analyzeContent';
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

const BATCH_DELAY_MS = 2000; // 2 seconds between API calls

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function analyzeAll() {
  console.log('=== Howard Content Analyzer ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Find content without analyses
  const { data: allContent, error: contentError } = await supabase
    .from('content')
    .select('id, title, raw_text, source_id, platform, sources(name, weighted_score)')
    .order('published_at', { ascending: false });

  if (contentError || !allContent) {
    console.error('Failed to load content:', contentError?.message);
    process.exit(1);
  }

  // Get existing analysis content_ids
  const { data: existingAnalyses } = await supabase
    .from('analyses')
    .select('content_id');

  const analyzedIds = new Set(
    (existingAnalyses || []).map((a) => a.content_id)
  );

  // Filter to unanalyzed content with text
  const toAnalyze = allContent.filter(
    (c) => !analyzedIds.has(c.id) && c.raw_text && c.raw_text.length > 100
  );

  console.log(`Total content: ${allContent.length}`);
  console.log(`Already analyzed: ${analyzedIds.size}`);
  console.log(`To analyze: ${toAnalyze.length}`);
  console.log(`Skipped (no text): ${allContent.length - analyzedIds.size - toAnalyze.length}\n`);

  if (toAnalyze.length === 0) {
    console.log('Nothing to analyze. Done!');
    return;
  }

  let analyzed = 0;
  let failed = 0;

  for (const item of toAnalyze) {
    const sourceName = (item.sources as unknown as { name: string } | null)?.name || 'Unknown';
    console.log(`\n[${analyzed + failed + 1}/${toAnalyze.length}] Analyzing: "${item.title}"`);
    console.log(`  Source: ${sourceName} | Platform: ${item.platform}`);
    console.log(`  Text length: ${item.raw_text.length} chars`);

    try {
      const result = await analyzeContent(
        item.title,
        item.raw_text,
        sourceName,
        anthropicKey
      );

      console.log(`  Title: ${result.display_title}`);
      console.log(`  Sentiment: ${result.sentiment_overall} (${result.sentiment_score})`);
      console.log(`  Themes: ${result.themes.join(', ')}`);
      console.log(`  Predictions: ${result.predictions.length}`);

      // Insert analysis
      const { error: insertError } = await supabase.from('analyses').insert({
        content_id: item.id,
        display_title: result.display_title,
        sentiment_overall: result.sentiment_overall,
        sentiment_score: result.sentiment_score,
        assets_mentioned: result.assets_mentioned,
        themes: result.themes,
        predictions: result.predictions.map((p) => p.claim),
        key_quotes: result.key_quotes,
        referenced_people: result.referenced_people,
        summary: result.summary,
      });

      if (insertError) {
        console.error(`  Error inserting analysis:`, insertError.message);
        failed++;
      } else {
        // Insert predictions
        for (const pred of result.predictions) {
          const { error: predError } = await supabase.from('predictions').insert({
            content_id: item.id,
            source_id: item.source_id,
            claim: pred.claim,
            asset_or_theme: pred.asset_or_theme,
            direction: pred.direction,
            time_horizon: pred.time_horizon,
            confidence: pred.confidence,
            status: 'pending',
          });

          if (predError) {
            console.error(`  Error inserting prediction:`, predError.message);
          }
        }

        analyzed++;
        console.log(`  ✓ Saved`);
      }
    } catch (err) {
      console.error(`  ✕ Failed:`, err instanceof Error ? err.message : err);
      failed++;
    }

    // Rate limit
    if (analyzed + failed < toAnalyze.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n=== Done! Analyzed: ${analyzed}, Failed: ${failed} ===`);
}

analyzeAll();
