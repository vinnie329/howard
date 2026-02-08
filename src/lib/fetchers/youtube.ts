import { execFile } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const WHITELISTED_CHANNELS = [
  'invest like the best',
  'the mad podcast with matt turck',
  'tbpn',
  'dwarkesh patel',
  'cnbc television',
  'bloomberg television',
  'forwardguidancebw',
  'the monetary matters network',
  'no priors: ai, machine learning, tech, & startups',
];

function isWhitelistedChannel(channelTitle: string): boolean {
  return WHITELISTED_CHANNELS.some(
    (name) =>
      channelTitle.toLowerCase().includes(name) ||
      name.includes(channelTitle.toLowerCase())
  );
}

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

/**
 * Fetch transcript using yt-dlp (reliable, handles YouTube anti-bot).
 * Downloads subtitles to a temp file, parses XML, and returns plain text.
 */
async function fetchTranscript(videoId: string): Promise<string | null> {
  const tempBase = join(tmpdir(), `howard-yt-${videoId}-${Date.now()}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`      [transcript] Fetching via yt-dlp: ${videoId}`);

  try {
    // Run yt-dlp to download subtitles
    await new Promise<void>((resolve, reject) => {
      execFile(
        'yt-dlp',
        [
          '--write-sub',
          '--write-auto-sub',
          '--sub-lang', 'en',
          '--sub-format', 'srv1',
          '--skip-download',
          '-o', tempBase,
          url,
        ],
        { timeout: 30000 },
        (error, _stdout, stderr) => {
          if (error) {
            console.log(`      [transcript] yt-dlp error: ${error.message}`);
            if (stderr) console.log(`      [transcript] stderr: ${stderr.substring(0, 300)}`);
            reject(error);
            return;
          }
          resolve();
        }
      );
    });

    // Try to read the subtitle file (could be .en.srv1)
    const subFile = `${tempBase}.en.srv1`;
    let xml: string;
    try {
      xml = await readFile(subFile, 'utf-8');
      console.log(`      [transcript] Subtitle file read: ${xml.length} bytes`);
    } catch {
      console.log(`      [transcript] No subtitle file found at ${subFile}`);
      return null;
    } finally {
      // Clean up temp file
      try { await unlink(subFile); } catch {}
    }

    // Parse <text> elements from the XML
    const textRegex = /<text[^>]*>([^]*?)<\/text>/g;
    const segments: string[] = [];
    let match = textRegex.exec(xml);
    while (match) {
      const decoded = decodeHtmlEntities(match[1].trim());
      // Skip [Music] and similar annotations
      if (decoded && decoded !== '[Music]' && decoded !== '[Applause]') {
        segments.push(decoded);
      }
      match = textRegex.exec(xml);
    }

    console.log(`      [transcript] Parsed ${segments.length} text segments`);

    if (segments.length === 0) {
      console.log(`      [transcript] No text segments found in XML`);
      return null;
    }

    const fullText = segments.join(' ');
    console.log(`      [transcript] Full text: ${fullText.length} chars`);
    return fullText;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`      [transcript] Failed: ${msg}`);
    return null;
  }
}

interface YouTubeSearchItem {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
}

export async function fetchYouTubeVideos(
  supabase: SupabaseClient,
  sourceId: string,
  searchQueries: string[],
  apiKey: string,
  maxResults: number = 10
): Promise<number> {
  let inserted = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const publishedAfter = thirtyDaysAgo.toISOString();

  for (const query of searchQueries) {
    try {
      console.log(`\n  Searching YouTube: "${query}"`);

      const url = new URL(`${YOUTUBE_API_BASE}/search`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('q', query);
      url.searchParams.set('type', 'video');
      url.searchParams.set('order', 'date');
      url.searchParams.set('publishedAfter', publishedAfter);
      url.searchParams.set('maxResults', String(maxResults));
      url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const body = await res.text();
        console.error(`  YouTube API error for "${query}": ${res.status} ${res.statusText}`);
        console.error(`  Response: ${body.substring(0, 300)}`);
        continue;
      }

      const data = await res.json();
      const items: YouTubeSearchItem[] = (data.items || []).map(
        (item: {
          id: { videoId: string };
          snippet: {
            title: string;
            description: string;
            channelTitle: string;
            publishedAt: string;
          };
        }) => ({
          videoId: item.id.videoId,
          title: decodeHtmlEntities(item.snippet.title),
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
        })
      );

      console.log(`  Found ${items.length} results`);

      // Filter out Shorts by checking video duration via the videos API
      const videoIds = items.map((v) => v.videoId).join(',');
      const durUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      durUrl.searchParams.set('part', 'contentDetails');
      durUrl.searchParams.set('id', videoIds);
      durUrl.searchParams.set('key', apiKey);

      const shortsSet = new Set<string>();
      try {
        const durRes = await fetch(durUrl.toString());
        if (durRes.ok) {
          const durData = await durRes.json();
          for (const v of durData.items || []) {
            const duration = v.contentDetails?.duration || '';
            // Parse ISO 8601 duration (PT#M#S). Skip short-form videos (≤3 min).
            const minutes = duration.match(/(\d+)M/)?.[1];
            const hours = duration.match(/(\d+)H/)?.[1];
            const seconds = duration.match(/(\d+)S/)?.[1];
            const totalSec =
              (parseInt(hours || '0') * 3600) +
              (parseInt(minutes || '0') * 60) +
              parseInt(seconds || '0');
            if (totalSec <= 180) {
              shortsSet.add(v.id);
            }
          }
        }
      } catch (err) {
        console.log(`  ⚠ Could not check durations: ${err instanceof Error ? err.message : err}`);
      }

      for (const video of items) {
        // Skip short-form videos (≤3 min)
        if (shortsSet.has(video.videoId)) {
          console.log(`    ✕ Skipped (short-form ≤3min): ${video.title}`);
          continue;
        }
        // Channel whitelist check
        if (!isWhitelistedChannel(video.channelTitle)) {
          console.log(`    ✕ Skipped (channel: ${video.channelTitle}): ${video.title}`);
          continue;
        }

        console.log(`\n    Processing: "${video.title}" [${video.channelTitle}]`);
        console.log(`    Video ID: ${video.videoId}`);

        // Fetch transcript
        let rawText: string | null = null;
        try {
          rawText = await fetchTranscript(video.videoId);
          if (rawText && rawText.length > 0) {
            console.log(`    ✓ Transcript OK: ${rawText.length} chars`);
          } else {
            console.log(`    ⚠ No transcript available`);
            rawText = null;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`    ✕ Transcript error: ${msg}`);
          rawText = null;
        }

        // Save to database
        const row = {
          source_id: sourceId,
          platform: 'youtube' as const,
          external_id: video.videoId,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          published_at: video.publishedAt,
          raw_text: rawText,
        };

        console.log(`    Saving to DB (raw_text: ${rawText ? rawText.length + ' chars' : 'NULL'})...`);

        const { error } = await supabase
          .from('content')
          .upsert(row, { onConflict: 'platform,external_id' });

        if (error) {
          if (error.code === '23505') {
            console.log(`    ~ Already exists (duplicate)`);
          } else {
            console.error(`    ✕ DB error: ${error.message} (code: ${error.code})`);
          }
        } else {
          inserted++;
          console.log(`    + Saved successfully`);
        }
      }
    } catch (err) {
      console.error(
        `  Error fetching YouTube for query "${query}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return inserted;
}
