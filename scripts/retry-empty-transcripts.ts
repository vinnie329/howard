/**
 * Retry transcription + analysis for content items with empty raw_text.
 *
 * Usage:
 *   npx tsx scripts/retry-empty-transcripts.ts           # retry all empties
 *   npx tsx scripts/retry-empty-transcripts.ts <id> ...  # retry specific IDs
 */
import { createClient } from '@supabase/supabase-js';
import { analyzeContent } from '../src/lib/analysis/analyzeContent';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropicKey = process.env.ANTHROPIC_API_KEY!;
const geminiKey = process.env.GEMINI_API_KEY!;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_PROMPT =
  'Transcribe this audio verbatim. Return only the transcript text. No timestamps, no speaker labels, no markdown formatting.';

async function transcribe(videoId: string): Promise<string | null> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`  Transcribing ${ytUrl}...`);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { file_data: { mime_type: 'video/mp4', file_uri: ytUrl } },
          { text: GEMINI_PROMPT },
        ]}],
      }),
      signal: AbortSignal.timeout(300000),
    }
  );
  if (!res.ok) {
    console.log(`  Gemini error: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function main() {
  const specificIds = process.argv.slice(2).filter((a) => !a.startsWith('-'));

  let query = sb.from('content').select('id, title, external_id, platform, raw_text, source_id, sources(name)');
  if (specificIds.length > 0) {
    query = query.in('id', specificIds);
  } else {
    query = query.eq('platform', 'youtube').order('created_at', { ascending: false });
  }

  const { data: items } = await query;
  const empties = (items || []).filter((c) => !c.raw_text || c.raw_text.length === 0);
  console.log(`Found ${empties.length} items to retry\n`);

  let success = 0;
  for (const item of empties) {
    console.log(`\n${(item as any).sources?.name} | ${item.title}`);
    const text = await transcribe(item.external_id);

    if (!text || text.length < 50) {
      console.log(`  Failed (${text?.length || 0} chars)`);
      continue;
    }

    console.log(`  Transcript: ${text.length} chars`);

    await sb.from('content').update({ raw_text: text }).eq('id', item.id);

    console.log(`  Analyzing...`);
    const result = await analyzeContent(
      item.title,
      text,
      (item as any).sources?.name || 'Unknown',
      anthropicKey
    );

    console.log(`  ${result.display_title} | ${result.sentiment_overall} | ${result.themes.slice(0, 3).join(', ')}`);

    // analyses.content_id has no unique constraint — plain insert (matches fetch-missing-transcripts.ts).
    const { error: aErr } = await sb.from('analyses').insert({
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
    if (aErr) console.log(`  analyses insert error: ${aErr.message}`);

    for (const pred of result.predictions) {
      await sb.from('predictions').insert({
        content_id: item.id,
        source_id: item.source_id,
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

    success++;
    console.log(`  Done.`);
  }

  console.log(`\n\nRetried ${empties.length}, succeeded: ${success}`);
}

main();
