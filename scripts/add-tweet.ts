/**
 * Add a tweet/thread manually: insert content row and analyze.
 *
 * Usage:
 *   npx tsx scripts/add-tweet.ts <source-slug> <tweet-url> <text-file-or-inline>
 *
 * Examples:
 *   npx tsx scripts/add-tweet.ts nic-carter https://x.com/nic_carter/status/123 --text "Thread text here..."
 *   npx tsx scripts/add-tweet.ts nic-carter https://x.com/nic_carter/status/123 --file thread.txt
 */
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
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

const anthropicKey = process.env.ANTHROPIC_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: npx tsx scripts/add-tweet.ts <source-slug> <tweet-url> --text "..." | --file <path>');
    process.exit(1);
  }

  const sourceSlug = args[0];
  const tweetUrl = args[1];

  // Parse tweet text from --text or --file
  let text: string;
  const textIdx = args.indexOf('--text');
  const fileIdx = args.indexOf('--file');
  if (textIdx !== -1) {
    text = args.slice(textIdx + 1).join(' ');
  } else if (fileIdx !== -1) {
    text = await readFile(args[fileIdx + 1], 'utf-8');
  } else {
    console.error('Provide thread text via --text "..." or --file <path>');
    process.exit(1);
  }

  // Extract tweet ID from URL
  const idMatch = tweetUrl.match(/status\/(\d+)/);
  if (!idMatch) {
    console.error('Could not extract tweet ID from URL');
    process.exit(1);
  }
  const tweetId = idMatch[1];

  console.log(`=== Add Tweet: ${tweetId} ===\n`);

  // Look up source
  const { data: source, error: srcErr } = await supabase
    .from('sources')
    .select('id, name')
    .eq('slug', sourceSlug)
    .single();

  if (srcErr || !source) {
    console.error(`Source "${sourceSlug}" not found. Available sources:`);
    const { data: all } = await supabase.from('sources').select('slug, name');
    for (const s of all || []) console.log(`  ${s.slug} — ${s.name}`);
    process.exit(1);
  }

  console.log(`Source: ${source.name} (${source.id})`);
  console.log(`Text: ${text.length} chars\n`);

  // Upsert content row
  const title = `Thread by @${tweetUrl.match(/x\.com\/([^/]+)/)?.[1] || sourceSlug}`;

  const { data: content, error: insertErr } = await supabase
    .from('content')
    .upsert({
      source_id: source.id,
      platform: 'twitter',
      external_id: tweetId,
      title,
      url: tweetUrl,
      published_at: new Date().toISOString(),
      raw_text: text,
    }, { onConflict: 'platform,external_id' })
    .select('id')
    .single();

  if (insertErr) {
    console.error(`DB error: ${insertErr.message}`);
    process.exit(1);
  }

  console.log(`Saved to content: ${content.id}`);

  // Analyze
  if (text.length >= 50) {
    console.log('\nAnalyzing with Claude...');
    const result = await analyzeContent(title, text, source.name, anthropicKey);

    console.log(`  Display title: ${result.display_title}`);
    console.log(`  Sentiment: ${result.sentiment_overall} (${result.sentiment_score})`);
    console.log(`  Themes: ${result.themes.join(', ')}`);
    console.log(`  Assets: ${result.assets_mentioned.join(', ')}`);
    console.log(`  Predictions: ${result.predictions.length}`);

    await supabase.from('analyses').insert({
      content_id: content.id,
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

    for (const pred of result.predictions) {
      console.log(`    → "${pred.claim}"`);
      await supabase.from('predictions').insert({
        content_id: content.id,
        source_id: source.id,
        claim: pred.claim,
        themes: pred.themes,
        assets_mentioned: pred.assets_mentioned,
        sentiment: pred.sentiment,
        time_horizon: pred.time_horizon,
        confidence: pred.confidence,
        specificity: pred.specificity,
        date_made: new Date().toISOString(),
      });
    }

    console.log('\nAnalysis saved.');
  }

  console.log('\nDone!');
}

main();
