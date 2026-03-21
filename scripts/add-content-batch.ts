import { createClient } from '@supabase/supabase-js';
import { calculateWeightedScore } from '../src/lib/scoring';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VIDEO_IDS = ['E5B0cS6XRkg', 'Uj4aGC8ZjeI', 'JUsb1FYOstA'];
const GEMINI_MODEL = 'gemini-2.5-flash';

async function upsertSources() {
  console.log('=== Upserting Sources ===\n');

  const sources = [
    {
      name: 'Ben Thompson',
      slug: 'ben-thompson',
      bio: 'Founder of Stratechery. Leading technology and business strategy analyst known for frameworks like Aggregation Theory.',
      avatar_url: '/avatars/ben-thompson.jpg',
      domains: ['AI / Technology'],
      scores: { intelligence: 5, intuition_eq: 4, sincerity: 4, access: 4, independence: 5, capital_at_risk: 2, reputational_sensitivity: 5, performance: 4 },
      youtube_search_queries: ['Ben Thompson Stratechery', 'Ben Thompson technology'],
      substack_url: 'https://stratechery.com',
    },
    {
      name: 'Gokul Rajaram',
      slug: 'gokul-rajaram',
      bio: 'Board member at Pinterest, Coinbase, and The Trade Desk. Former exec at Square, Google, and Facebook. Angel investor and advisor to startups.',
      avatar_url: '/avatars/gokul-rajaram.jpg',
      domains: ['AI / Technology'],
      scores: { intelligence: 4, intuition_eq: 4, sincerity: 4, access: 5, independence: 3, capital_at_risk: 4, reputational_sensitivity: 4, performance: 4 },
      youtube_search_queries: ['Gokul Rajaram', 'Gokul Rajaram interview'],
      substack_url: null,
    },
  ];

  for (const src of sources) {
    const weighted = calculateWeightedScore(src.scores);
    console.log(`${src.name} credibility score: ${weighted.toFixed(2)}`);

    const { data, error } = await supabase.from('sources').upsert({
      name: src.name,
      slug: src.slug,
      bio: src.bio,
      avatar_url: src.avatar_url,
      domains: src.domains,
      scores: src.scores,
      weighted_score: weighted,
      youtube_search_queries: src.youtube_search_queries,
      substack_url: src.substack_url,
    }, { onConflict: 'slug' }).select().single();

    if (error) {
      console.error(`  Failed to upsert ${src.name}: ${error.message}`);
    } else {
      console.log(`  Upserted: ${data.name} (${data.id})`);
    }
  }

  console.log('');
}

async function checkExistingVideos(): Promise<Set<string>> {
  console.log('=== Checking Existing Videos ===\n');

  const { data, error } = await supabase
    .from('content')
    .select('external_id')
    .in('external_id', VIDEO_IDS);

  if (error) {
    console.error(`Error checking existing videos: ${error.message}`);
    return new Set();
  }

  const existing = new Set((data || []).map((r: { external_id: string }) => r.external_id));

  for (const id of VIDEO_IDS) {
    if (existing.has(id)) {
      console.log(`  ${id} — already exists, skipping`);
    } else {
      console.log(`  ${id} — new, will fetch`);
    }
  }

  console.log('');
  return existing;
}

interface VideoMeta {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
}

async function fetchVideoMetadata(videoIds: string[]): Promise<VideoMeta[]> {
  console.log('=== Fetching Video Metadata from YouTube API ===\n');

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY');
    process.exit(1);
  }

  const ids = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`YouTube API error: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const json = await res.json();
  const results: VideoMeta[] = [];

  for (const item of json.items || []) {
    const meta: VideoMeta = {
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
    };
    console.log(`  ${meta.videoId}: "${meta.title}"`);
    console.log(`    Channel: ${meta.channelTitle}`);
    console.log(`    Published: ${meta.publishedAt}`);
    results.push(meta);
  }

  console.log('');
  return results;
}

async function matchSource(meta: VideoMeta): Promise<{ id: string; name: string } | null> {
  // Fetch all sources
  const { data: sources } = await supabase.from('sources').select('id, name, slug');
  if (!sources) return null;

  const channelLower = meta.channelTitle.toLowerCase();
  const titleLower = meta.title.toLowerCase();
  const descLower = meta.description.toLowerCase();

  // Direct channel name match
  for (const src of sources) {
    const nameLower = src.name.toLowerCase();
    const slugParts = src.slug.split('-');

    if (channelLower.includes(nameLower) || nameLower.includes(channelLower)) {
      return { id: src.id, name: src.name };
    }

    // Check if slug parts appear in channel name
    if (slugParts.length >= 2 && slugParts.every((p: string) => channelLower.includes(p))) {
      return { id: src.id, name: src.name };
    }
  }

  // Check if video title/description mentions a source (interview/podcast featuring them)
  for (const src of sources) {
    const nameLower = src.name.toLowerCase();
    if (titleLower.includes(nameLower) || descLower.includes(nameLower)) {
      console.log(`  Matched "${meta.title}" to ${src.name} (mentioned in title/description)`);
      return { id: src.id, name: src.name };
    }
  }

  console.log(`  Could not match channel "${meta.channelTitle}" to any source. Skipping ${meta.videoId}.`);
  return null;
}

async function fetchTranscriptGeminiUrl(videoId: string): Promise<string | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.log('  Gemini transcription skipped (no GEMINI_API_KEY)');
    return null;
  }

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`  Gemini URL transcription for ${ytUrl}...`);

  try {
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
        signal: AbortSignal.timeout(300000), // 5 min timeout
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.log(`  Gemini URL error: ${res.status} ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.log(`  Gemini URL failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function main() {
  console.log('=== Add Content Batch ===\n');

  // Step 1: Upsert sources
  await upsertSources();

  // Step 2: Check which videos already exist
  const existing = await checkExistingVideos();
  const newVideoIds = VIDEO_IDS.filter(id => !existing.has(id));

  if (newVideoIds.length === 0) {
    console.log('All videos already exist. Nothing to do.');
    return;
  }

  // Step 3: Fetch metadata from YouTube API
  const metas = await fetchVideoMetadata(newVideoIds);

  // Step 4: Match sources and insert content
  console.log('=== Inserting Content ===\n');

  const inserted: { meta: VideoMeta; contentId: string }[] = [];

  for (const meta of metas) {
    const source = await matchSource(meta);
    if (!source) continue;

    console.log(`  Inserting "${meta.title}" for ${source.name}...`);

    const { data, error } = await supabase
      .from('content')
      .upsert({
        source_id: source.id,
        platform: 'youtube',
        external_id: meta.videoId,
        title: meta.title,
        url: `https://www.youtube.com/watch?v=${meta.videoId}`,
        published_at: meta.publishedAt,
      }, { onConflict: 'platform,external_id' })
      .select('id')
      .single();

    if (error) {
      console.error(`  DB error for ${meta.videoId}: ${error.message}`);
      continue;
    }

    console.log(`  Saved: ${data.id}`);
    inserted.push({ meta, contentId: data.id });
  }

  console.log('');

  // Step 5: Fetch transcripts via Gemini URL transcription
  console.log('=== Fetching Transcripts ===\n');

  for (const { meta, contentId } of inserted) {
    console.log(`Transcribing: "${meta.title}" (${meta.videoId})`);

    const transcript = await fetchTranscriptGeminiUrl(meta.videoId);

    if (!transcript || transcript.length < 50) {
      console.log(`  No usable transcript (${transcript?.length || 0} chars)\n`);
      continue;
    }

    console.log(`  Transcript: ${transcript.length} chars`);

    const { error } = await supabase
      .from('content')
      .update({ raw_text: transcript })
      .eq('id', contentId);

    if (error) {
      console.error(`  Failed to save transcript: ${error.message}\n`);
    } else {
      console.log(`  Saved transcript to content row\n`);
    }
  }

  console.log('=== Done ===');
}

main();
