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

const BATCH_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reanalyze() {
  console.log('=== Howard Content Re-Analyzer ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Step 1: Delete existing predictions and analyses
  console.log('Clearing existing predictions...');
  const { error: predDelErr } = await supabase.from('predictions').delete().not('id', 'is', null);
  if (predDelErr) {
    console.error('Failed to delete predictions:', predDelErr.message);
    process.exit(1);
  }

  console.log('Clearing existing analyses...');
  const { error: anaDelErr } = await supabase.from('analyses').delete().not('id', 'is', null);
  if (anaDelErr) {
    console.error('Failed to delete analyses:', anaDelErr.message);
    process.exit(1);
  }

  console.log('Cleared!\n');

  // Step 2: Load all content
  const { data: allContent, error: contentError } = await supabase
    .from('content')
    .select('id, title, raw_text, source_id, platform, published_at, sources(name)')
    .order('published_at', { ascending: false });

  if (contentError || !allContent) {
    console.error('Failed to load content:', contentError?.message);
    process.exit(1);
  }

  const toAnalyze = allContent.filter((c) => c.raw_text && c.raw_text.length > 100);

  console.log(`Total content: ${allContent.length}`);
  console.log(`To analyze: ${toAnalyze.length}`);
  console.log(`Skipped (no text): ${allContent.length - toAnalyze.length}\n`);

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
      console.log(`  Assets: ${result.assets_mentioned.join(', ')}`);
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
          console.log(`    → "${pred.claim}"`);
          console.log(`      themes: [${pred.themes.join(', ')}]  assets: [${pred.assets_mentioned.join(', ')}]`);

          const { error: predError } = await supabase.from('predictions').insert({
            content_id: item.id,
            source_id: item.source_id,
            claim: pred.claim,
            themes: pred.themes,
            assets_mentioned: pred.assets_mentioned,
            sentiment: pred.sentiment,
            time_horizon: pred.time_horizon,
            confidence: pred.confidence,
            specificity: pred.specificity,
            date_made: item.published_at || new Date().toISOString(),
          });

          if (predError) {
            console.error(`      Error inserting prediction:`, predError.message);
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

reanalyze();
