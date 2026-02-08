import { createClient } from '@supabase/supabase-js';
import { fetchYouTubeVideos } from '../src/lib/fetchers/youtube';
import { fetchOaktreeMemos } from '../src/lib/fetchers/oaktree';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAll() {
  console.log('=== Howard Content Fetcher ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Load all sources
  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .order('weighted_score', { ascending: false });

  if (error || !sources) {
    console.error('Failed to load sources:', error?.message);
    process.exit(1);
  }

  console.log(`Found ${sources.length} sources\n`);

  let totalInserted = 0;

  for (const source of sources) {
    console.log(`\n--- ${source.name} ---`);

    // YouTube
    const queries = source.youtube_search_queries as string[] | null;
    if (youtubeApiKey && queries && queries.length > 0) {
      console.log(`  YouTube: searching ${queries.length} queries...`);
      const count = await fetchYouTubeVideos(
        supabase,
        source.id,
        queries,
        youtubeApiKey
      );
      console.log(`  YouTube: ${count} new items`);
      totalInserted += count;
    } else if (!youtubeApiKey) {
      console.log('  YouTube: skipped (no API key)');
    } else {
      console.log('  YouTube: no search queries configured');
    }

    // Oaktree memos (only for Howard Marks)
    if (source.slug === 'howard-marks') {
      console.log('  Oaktree memos: fetching...');
      const count = await fetchOaktreeMemos(supabase, source.id);
      console.log(`  Oaktree memos: ${count} new items`);
      totalInserted += count;
    }
  }

  console.log(`\n=== Done! ${totalInserted} new items fetched ===`);
}

fetchAll();
