import { createClient } from '@supabase/supabase-js';
import { analyzeContent } from '../src/lib/analysis/analyzeContent';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_MODEL = 'gemini-2.5-flash';

async function main() {
  const contentId = process.argv[2];
  if (!contentId) {
    console.error('Usage: npx tsx scripts/analyze-one.ts <content-id>');
    process.exit(1);
  }

  const { data: content } = await supabase.from('content')
    .select('id, title, raw_text, source_id, external_id, platform, published_at, sources(name)')
    .eq('id', contentId).single();

  if (!content) { console.error('Content not found'); process.exit(1); }

  const sourceName = (content.sources as unknown as { name: string })?.name || 'Unknown';
  console.log(`Title: ${content.title}`);
  console.log(`Source: ${sourceName}`);
  console.log(`Text: ${content.raw_text?.length || 0} chars\n`);

  let rawText = content.raw_text;

  // If no transcript and it's a YouTube video, try Gemini URL transcription
  if ((!rawText || rawText.length < 100) && content.platform === 'youtube' && content.external_id) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) { console.error('No GEMINI_API_KEY'); process.exit(1); }

    const ytUrl = `https://www.youtube.com/watch?v=${content.external_id}`;
    console.log(`Fetching transcript via Gemini URL: ${ytUrl}...`);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { file_data: { mime_type: 'video/mp4', file_uri: ytUrl } },
            { text: 'Transcribe this video verbatim. Return only the transcript text. No timestamps, no speaker labels, no markdown formatting.' },
          ]}],
        }),
        signal: AbortSignal.timeout(300000), // 5 min for long videos
      }
    );

    if (!res.ok) {
      console.error('Gemini error:', res.status, (await res.text()).slice(0, 200));
      process.exit(1);
    }

    const data = await res.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) { console.error('No transcript returned'); process.exit(1); }

    console.log(`Transcript: ${rawText.length} chars`);
    await supabase.from('content').update({ raw_text: rawText }).eq('id', contentId);
    console.log('Saved transcript\n');
  }

  if (!rawText || rawText.length < 100) {
    console.error('No usable text to analyze');
    process.exit(1);
  }

  // Run analysis
  console.log('Analyzing...');
  const result = await analyzeContent(content.title, rawText, sourceName, process.env.ANTHROPIC_API_KEY!);

  console.log(`Display title: ${result.display_title}`);
  console.log(`Themes: ${result.themes.join(', ')}`);
  console.log(`Assets: ${result.assets_mentioned.join(', ')}`);
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
