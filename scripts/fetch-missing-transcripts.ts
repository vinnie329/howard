import { createClient } from '@supabase/supabase-js';
import { execFile } from 'child_process';
import { readFile, unlink, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/\n/g, ' ');
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  const tempBase = join(tmpdir(), `howard-yt-${videoId}-${Date.now()}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`  Fetching transcript for ${videoId}...`);

  await new Promise<void>((resolve, reject) => {
    execFile('yt-dlp', [
      '--write-sub', '--write-auto-sub', '--sub-lang', 'en',
      '--sub-format', 'srv1', '--skip-download', '-o', tempBase, url,
    ], { timeout: 60000 }, (error) => {
      if (error) { reject(error); return; }
      resolve();
    });
  });

  const subFile = `${tempBase}.en.srv1`;
  let xml: string;
  try {
    xml = await readFile(subFile, 'utf-8');
  } catch {
    console.log(`  No subtitle file found`);
    return null;
  } finally {
    try { await unlink(subFile); } catch {}
  }

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

  return segments.length > 0 ? segments.join(' ') : null;
}

const GEMINI_MODEL = 'gemini-2.5-flash';

async function fetchTranscriptGemini(videoId: string): Promise<string | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.log('  Gemini fallback skipped (no GEMINI_API_KEY)');
    return null;
  }

  const tempBase = join(tmpdir(), `howard-audio-${videoId}-${Date.now()}`);
  const tempFile = `${tempBase}.mp3`;
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log('  Gemini fallback: downloading audio...');

  try {
    await new Promise<void>((resolve, reject) => {
      execFile('yt-dlp', [
        '-x', '--audio-format', 'mp3',
        '--postprocessor-args', 'ffmpeg:-ac 1 -b:a 48k',
        '-o', `${tempBase}.%(ext)s`, url,
      ], { timeout: 180000 }, (error) => {
        if (error) { reject(error); return; }
        resolve();
      });
    });

    const stats = await stat(tempFile);
    console.log(`  Audio: ${(stats.size / (1024 * 1024)).toFixed(1)}MB`);

    const audioData = await readFile(tempFile);

    // Upload via File API
    console.log('  Uploading to Gemini...');
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'audio/mpeg', 'X-Goog-Upload-Protocol': 'raw' }, body: audioData }
    );
    if (!uploadRes.ok) {
      console.log(`  Gemini upload error: ${uploadRes.status}`);
      return null;
    }
    const fileUri = (await uploadRes.json()).file?.uri;
    if (!fileUri) return null;

    await new Promise(r => setTimeout(r, 5000));

    // Transcribe
    console.log('  Transcribing...');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { file_data: { mime_type: 'audio/mpeg', file_uri: fileUri } },
            { text: 'Transcribe this audio verbatim. Return only the transcript text. No timestamps, no speaker labels, no markdown formatting.' },
          ]}],
        }),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.log(`  Gemini fallback failed: ${err instanceof Error ? err.message : err}`);
    return null;
  } finally {
    try { await unlink(tempFile); } catch {}
  }
}

async function main() {
  console.log('=== Fetch Missing Transcripts & Analyze ===\n');

  // Find content with no raw_text
  const { data: missing } = await supabase
    .from('content')
    .select('id, title, source_id, platform, external_id, published_at, raw_text, sources(name)')
    .or('raw_text.is.null,raw_text.eq.');

  if (!missing || missing.length === 0) {
    console.log('No content with missing text.');
    return;
  }

  console.log(`Found ${missing.length} items with no text:\n`);

  for (const item of missing) {
    console.log(`"${item.title}" (${item.platform}/${item.external_id})`);

    if (item.platform !== 'youtube') {
      console.log('  Skipping (not YouTube)\n');
      continue;
    }

    try {
      let transcript = await fetchTranscript(item.external_id);
      if (!transcript || transcript.length < 100) {
        console.log(`  No subtitles — trying Gemini audio transcription...`);
        transcript = await fetchTranscriptGemini(item.external_id);
      }
      if (!transcript || transcript.length < 100) {
        console.log(`  No usable transcript (${transcript?.length || 0} chars)\n`);
        continue;
      }

      console.log(`  Transcript: ${transcript.length} chars`);

      // Update raw_text
      await supabase.from('content').update({ raw_text: transcript }).eq('id', item.id);
      console.log(`  Updated raw_text`);

      // Analyze
      const sourceName = (item.sources as unknown as { name: string } | null)?.name || 'Unknown';
      const result = await analyzeContent(item.title, transcript, sourceName, anthropicKey);

      console.log(`  Analysis: ${result.display_title}`);
      console.log(`  Themes: ${result.themes.join(', ')}`);
      console.log(`  Assets: ${result.assets_mentioned.join(', ')}`);
      console.log(`  Predictions: ${result.predictions.length}`);

      await supabase.from('analyses').insert({
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

      for (const pred of result.predictions) {
        console.log(`    → "${pred.claim}"`);
        console.log(`      themes: [${pred.themes.join(', ')}]  assets: [${pred.assets_mentioned.join(', ')}]`);

        await supabase.from('predictions').insert({
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
      }

      console.log(`  ✓ Done\n`);
    } catch (err) {
      console.error(`  ✕ Failed: ${err instanceof Error ? err.message : err}\n`);
    }
  }
}

main();
