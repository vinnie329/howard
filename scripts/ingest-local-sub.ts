import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { analyzeContent } from '../src/lib/analysis/analyzeContent';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\n/g, ' ');
}

async function main() {
  const contentId = process.argv[2];
  const subFile = process.argv[3];
  if (!contentId || !subFile) {
    console.error('Usage: npx tsx scripts/ingest-local-sub.ts <content-id> <subtitle-file>');
    process.exit(1);
  }

  const { data: content } = await supabase.from('content')
    .select('id, title, source_id, external_id, platform, published_at, sources(name)')
    .eq('id', contentId).single();

  if (!content) { console.error('Content not found'); process.exit(1); }

  const sourceName = (content.sources as unknown as { name: string })?.name || 'Unknown';
  console.log(`Title: ${content.title}`);
  console.log(`Source: ${sourceName}`);

  // Parse subtitle file
  const xml = await readFile(subFile, 'utf-8');
  const textRegex = /<text[^>]*>([^]*?)<\/text>/g;
  const segments: string[] = [];
  let match = textRegex.exec(xml);
  while (match) {
    const decoded = decodeHtmlEntities(match[1].trim());
    if (decoded && decoded !== '[Music]' && decoded !== '[Applause]') {
      segments.push(decoded);
    }
    match = textRegex.exec(xml);
  }

  const rawText = segments.join(' ');
  console.log(`Transcript: ${rawText.length} chars from ${segments.length} segments`);

  if (rawText.length < 100) {
    console.error('Transcript too short');
    process.exit(1);
  }

  // Save transcript
  await supabase.from('content').update({ raw_text: rawText }).eq('id', contentId);
  console.log('Saved transcript\n');

  // Run analysis
  console.log('Analyzing...');
  const result = await analyzeContent(content.title, rawText, sourceName, process.env.ANTHROPIC_API_KEY!);

  console.log(`Display title: ${result.display_title}`);
  console.log(`Themes: ${result.themes.join(', ')}`);
  console.log(`Predictions: ${result.predictions.length}\n`);

  // Delete existing analysis/predictions if re-running
  await supabase.from('predictions').delete().eq('content_id', contentId);
  await supabase.from('analyses').delete().eq('content_id', contentId);

  await supabase.from('analyses').insert({
    content_id: contentId,
    display_title: result.display_title,
    sentiment_overall: result.sentiment_overall,
    sentiment_score: result.sentiment_score,
    assets_mentioned: result.assets_mentioned,
    themes: result.themes,
    predictions: result.predictions.map(p => p.claim),
    key_quotes: result.key_quotes,
    referenced_people: result.referenced_people,
    summary: result.summary,
  });

  for (const pred of result.predictions) {
    await supabase.from('predictions').insert({
      content_id: contentId,
      source_id: content.source_id,
      claim: pred.claim,
      themes: pred.themes,
      assets_mentioned: pred.assets_mentioned,
      sentiment: pred.sentiment,
      time_horizon: pred.time_horizon,
      confidence: pred.confidence,
      specificity: pred.specificity,
      date_made: content.published_at || new Date().toISOString(),
    });
  }

  console.log('Done!');
}
main();
