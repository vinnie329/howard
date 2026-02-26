/**
 * Add a single YouTube video manually: insert content row,
 * fetch transcript (subtitles → Gemini audio fallback), and analyze.
 *
 * Usage:
 *   npx tsx scripts/add-video.ts <video-id-or-url> <source-slug>
 *
 * Example:
 *   npx tsx scripts/add-video.ts CTDAcborxWE ashok-varadhan
 *   npx tsx scripts/add-video.ts https://www.youtube.com/watch?v=CTDAcborxWE ashok-varadhan
 */
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

// --- Transcript helpers (same as fetch-missing-transcripts.ts) ---

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/\n/g, ' ');
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  const tempBase = join(tmpdir(), `howard-yt-${videoId}-${Date.now()}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`  Fetching subtitles for ${videoId}...`);

  try {
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
  } catch {
    return null;
  }
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

  console.log('  Downloading audio via yt-dlp...');

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

    // Upload via Gemini File API
    console.log('  Uploading to Gemini File API...');
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'audio/mpeg', 'X-Goog-Upload-Protocol': 'raw' }, body: audioData }
    );
    if (!uploadRes.ok) {
      console.log(`  Gemini upload error: ${uploadRes.status} ${await uploadRes.text()}`);
      return null;
    }
    const fileUri = (await uploadRes.json()).file?.uri;
    if (!fileUri) return null;

    console.log(`  Uploaded: ${fileUri}`);
    await new Promise(r => setTimeout(r, 5000));

    // Transcribe
    console.log('  Transcribing with Gemini...');
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
    if (!res.ok) {
      console.log(`  Gemini transcription error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.log(`  Gemini fallback failed: ${err instanceof Error ? err.message : err}`);
    return null;
  } finally {
    try { await unlink(tempFile); } catch {}
  }
}

// --- Get video metadata from yt-dlp ---

async function getVideoMeta(videoId: string): Promise<{ title: string; publishedAt: string } | null> {
  return new Promise((resolve) => {
    execFile('yt-dlp', [
      '--print', '%(title)s|||%(upload_date)s',
      '--no-download',
      `https://www.youtube.com/watch?v=${videoId}`,
    ], { timeout: 30000 }, (error, stdout) => {
      if (error) { resolve(null); return; }
      const [title, dateStr] = stdout.trim().split('|||');
      // Convert YYYYMMDD → ISO date
      const publishedAt = dateStr
        ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`
        : new Date().toISOString();
      resolve({ title, publishedAt });
    });
  });
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/add-video.ts <video-id-or-url> <source-slug>');
    process.exit(1);
  }

  // Extract video ID from URL or use as-is
  let videoId = args[0];
  const urlMatch = videoId.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (urlMatch) videoId = urlMatch[1];

  const sourceSlug = args[1];

  console.log(`=== Add Video: ${videoId} ===\n`);

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

  // Get video metadata
  console.log('Fetching video metadata...');
  const meta = await getVideoMeta(videoId);
  if (!meta) {
    console.error('Could not fetch video metadata');
    process.exit(1);
  }
  console.log(`Title: ${meta.title}`);
  console.log(`Published: ${meta.publishedAt}\n`);

  // Fetch transcript (subtitles first, then Gemini fallback)
  let transcript = await fetchTranscript(videoId);
  if (!transcript || transcript.length < 50) {
    console.log('  No subtitles available — trying Gemini audio transcription...\n');
    transcript = await fetchTranscriptGemini(videoId);
  }

  if (!transcript || transcript.length < 50) {
    console.error(`\nFailed to get transcript (${transcript?.length || 0} chars). Inserting without transcript.`);
  } else {
    console.log(`\nTranscript: ${transcript.length} chars`);
  }

  // Upsert content row
  const row = {
    source_id: source.id,
    platform: 'youtube',
    external_id: videoId,
    title: meta.title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    published_at: meta.publishedAt,
    raw_text: transcript || null,
  };

  const { data: content, error: insertErr } = await supabase
    .from('content')
    .upsert(row, { onConflict: 'platform,external_id' })
    .select('id')
    .single();

  if (insertErr) {
    console.error(`DB error: ${insertErr.message}`);
    process.exit(1);
  }

  console.log(`Saved to content: ${content.id}`);

  // Analyze if we have a transcript
  if (transcript && transcript.length >= 50) {
    console.log('\nAnalyzing with Claude...');
    const result = await analyzeContent(meta.title, transcript, source.name, anthropicKey);

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
        date_made: meta.publishedAt,
      });
    }

    console.log('\nAnalysis saved.');
  }

  console.log('\nDone!');
}

main();
