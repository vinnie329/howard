import { createClient } from '@supabase/supabase-js';
import { execFile } from 'child_process';
import { readFile, unlink, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Agent, setGlobalDispatcher } from 'undici';
import { analyzeContent } from '../src/lib/analysis/analyzeContent';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Gemini transcription replies can take >5min for long chunks; the default
// undici HeadersTimeout (300s) kills them before headers arrive. Bump it.
setGlobalDispatcher(new Agent({ headersTimeout: 600000, bodyTimeout: 600000 }));

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

let ytDlpBlocked = false;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/\n/g, ' ');
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  if (ytDlpBlocked) {
    console.log(`  Skipping yt-dlp (bot-blocked)`);
    return null;
  }

  const tempBase = join(tmpdir(), `howard-yt-${videoId}-${Date.now()}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`  Fetching transcript for ${videoId}...`);

  await new Promise<void>((resolve, reject) => {
    execFile('yt-dlp', [
      '--write-sub', '--write-auto-sub', '--sub-lang', 'en',
      '--sub-format', 'srv1', '--skip-download', '-o', tempBase, url,
    ], { timeout: 60000 }, (error, _stdout, stderr) => {
      if (error) {
        if (stderr?.includes('Sign in to confirm') || error.message?.includes('Sign in to confirm')) {
          ytDlpBlocked = true;
          console.log(`  Bot detection — disabling yt-dlp for remaining videos`);
        }
        reject(error);
        return;
      }
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
  if (ytDlpBlocked) {
    console.log(`  Skipping Gemini audio (yt-dlp bot-blocked)`);
    return null;
  }

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
      ], { timeout: 180000 }, (error, _stdout, stderr) => {
        if (error) {
          if (stderr?.includes('Sign in to confirm') || error.message?.includes('Sign in to confirm')) {
            ytDlpBlocked = true;
            console.log(`  Bot detection — disabling yt-dlp for remaining videos`);
          }
          reject(error);
          return;
        }
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

const GEMINI_TRANSCRIBE_PROMPT =
  'Transcribe this video verbatim. Return only the transcript text. No timestamps, no speaker labels, no markdown formatting.';

// Returns video duration in seconds via YouTube API (needed for chunking long videos).
async function fetchVideoDuration(videoId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const dur = data.items?.[0]?.contentDetails?.duration || '';
    const h = parseInt(dur.match(/(\d+)H/)?.[1] || '0');
    const m = parseInt(dur.match(/(\d+)M/)?.[1] || '0');
    const s = parseInt(dur.match(/(\d+)S/)?.[1] || '0');
    return h * 3600 + m * 60 + s;
  } catch {
    return null;
  }
}

// Single Gemini URL transcription, optionally clipped via videoMetadata.
async function geminiTranscribeOnce(
  videoId: string,
  apiKey: string,
  startSec?: number,
  endSec?: number,
): Promise<{ ok: true; text: string } | { ok: false; tokenLimit: boolean; error: string }> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const part: Record<string, unknown> = { file_data: { mime_type: 'video/mp4', file_uri: ytUrl } };
  if (startSec !== undefined && endSec !== undefined) {
    part.video_metadata = { start_offset: `${startSec}s`, end_offset: `${endSec}s` };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [part, { text: GEMINI_TRANSCRIBE_PROMPT }] }],
        }),
        signal: AbortSignal.timeout(540000), // 9min — paired with undici's 10min headersTimeout
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      const tokenLimit = errText.includes('exceeds the maximum number of tokens');
      return { ok: false, tokenLimit, error: `${res.status} ${errText.slice(0, 200)}` };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text ? { ok: true, text } : { ok: false, tokenLimit: false, error: 'empty response' };
  } catch (err) {
    return { ok: false, tokenLimit: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchTranscriptGeminiUrl(videoId: string): Promise<string | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) return null;

  console.log(`  Gemini URL transcription for https://www.youtube.com/watch?v=${videoId}...`);

  const first = await geminiTranscribeOnce(videoId, geminiApiKey);
  if (first.ok) return first.text;

  // If single-call hit the 1M-token cap (long videos), chunk via videoMetadata.
  if (!first.tokenLimit) {
    console.log(`  Gemini URL error: ${first.error}`);
    return null;
  }
  console.log(`  Hit token cap — falling back to chunked transcription.`);

  const duration = await fetchVideoDuration(videoId);
  if (!duration) {
    console.log(`  Cannot chunk: YOUTUBE_API_KEY missing or duration unavailable.`);
    return null;
  }

  // 25min chunks: well under 1M token cap AND each call replies fast enough to
  // avoid the 5min undici headersTimeout on slower chunks (50min was borderline).
  const CHUNK_SEC = 25 * 60;
  const chunks: string[] = [];
  for (let start = 0; start < duration; start += CHUNK_SEC) {
    const end = Math.min(start + CHUNK_SEC, duration);
    console.log(`    chunk ${start}–${end}s of ${duration}s...`);
    const r = await geminiTranscribeOnce(videoId, geminiApiKey, start, end);
    if (!r.ok) {
      console.log(`    chunk failed: ${r.error}`);
      return null; // partial transcript would corrupt the analysis — fail clean instead
    }
    chunks.push(r.text);
  }
  const merged = chunks.join(' ');
  console.log(`  Chunked transcription: ${chunks.length} chunks, ${merged.length} chars`);
  return merged;
}

async function main() {
  console.log('=== Fetch Missing Transcripts & Analyze ===\n');

  // Cap per run: at ~3min/item worst case, 10 items keeps us inside the 10min step budget.
  // Anything beyond gets retried on the next pipeline run (newest first).
  const MAX_PER_RUN = 10;

  // Find content with no raw_text — newest first so fresh content gets analyzed quickly.
  const { data: missing } = await supabase
    .from('content')
    .select('id, title, source_id, platform, external_id, published_at, raw_text, sources(name)')
    .or('raw_text.is.null,raw_text.eq.')
    .order('created_at', { ascending: false });

  if (!missing || missing.length === 0) {
    console.log('No content with missing text.');
    return;
  }

  const queue = missing.slice(0, MAX_PER_RUN);
  console.log(`Found ${missing.length} items with no text — processing ${queue.length} this run:\n`);

  let recovered = 0;
  const stillMissing: { id: string; title: string; platform: string }[] = [];

  for (const item of queue) {
    console.log(`"${item.title}" (${item.platform}/${item.external_id})`);

    if (item.platform !== 'youtube') {
      console.log('  Skipping (not YouTube)\n');
      stillMissing.push({ id: item.id, title: item.title, platform: item.platform });
      continue;
    }

    try {
      let transcript: string | null = null;

      // Strategy 1: yt-dlp subtitles (skip if bot-blocked)
      if (!ytDlpBlocked) {
        transcript = await fetchTranscript(item.external_id).catch(() => null);
      }
      // Strategy 2: yt-dlp audio download → Gemini transcription (skip if bot-blocked)
      if ((!transcript || transcript.length < 100) && !ytDlpBlocked) {
        console.log(`  No subtitles — trying Gemini audio download...`);
        transcript = await fetchTranscriptGemini(item.external_id);
      }
      // Strategy 3: Gemini native YouTube URL (no yt-dlp needed — always available)
      if (!transcript || transcript.length < 100) {
        if (ytDlpBlocked) {
          console.log(`  yt-dlp blocked — using Gemini URL transcription directly...`);
        } else {
          console.log(`  Audio download failed — trying Gemini URL transcription...`);
        }
        transcript = await fetchTranscriptGeminiUrl(item.external_id);
      }
      if (!transcript || transcript.length < 100) {
        console.log(`  No usable transcript (${transcript?.length || 0} chars)\n`);
        stillMissing.push({ id: item.id, title: item.title, platform: item.platform });
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

      recovered++;
      console.log(`  ✓ Done\n`);
    } catch (err) {
      console.error(`  ✕ Failed: ${err instanceof Error ? err.message : err}\n`);
      stillMissing.push({ id: item.id, title: item.title, platform: item.platform });
    }
  }

  // Loud summary so accumulating orphans are visible in pipeline logs.
  console.log(`\n=== Transcript retry summary ===`);
  console.log(`  Processed: ${queue.length} (cap: ${MAX_PER_RUN})`);
  console.log(`  Recovered: ${recovered}`);
  console.log(`  Still missing this run: ${stillMissing.length}`);
  console.log(`  Total backlog after run: ${missing.length - recovered}`);
  if (stillMissing.length > 0) {
    console.log(`\n  Items still without raw_text:`);
    for (const m of stillMissing) console.log(`    - ${m.id} | ${m.platform} | ${m.title}`);
  }
  if (missing.length - recovered > MAX_PER_RUN) {
    console.log(`\n  ⚠ Backlog exceeds per-run cap — run scripts/retry-empty-transcripts.ts to drain.`);
  }
}

main();
