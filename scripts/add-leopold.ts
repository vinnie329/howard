import { createClient } from '@supabase/supabase-js';
import { calculateWeightedScore } from '../src/lib/scoring';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // 1. Add Leopold as a source
  const scores = {
    intelligence: 5,
    intuition_eq: 4,
    sincerity: 4,
    access: 4,
    independence: 3,
    capital_at_risk: 3,
    reputational_sensitivity: 4,
    performance: 3,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Leopold Aschenbrenner credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Leopold Aschenbrenner',
    slug: 'leopold-aschenbrenner',
    bio: 'Former OpenAI researcher and founder of Situational Awareness. Known for his influential essay series on AGI timelines, the intelligence explosion, and US-China AI competition.',
    avatar_url: '/avatars/leopold-aschenbrenner.jpg',
    domains: ['AI / Semiconductors'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Leopold Aschenbrenner', 'Leopold Aschenbrenner interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);

  // 2. Parse transcript
  const xml = readFileSync('/tmp/leopold.en.srv1', 'utf-8');
  const texts = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)].map(m => m[1]);
  const transcript = texts.join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/\[Music\]/gi, '').replace(/\[Applause\]/gi, '')
    .replace(/\s+/g, ' ').trim();

  console.log(`Transcript: ${transcript.length} chars`);

  // 3. Add content
  const { data: content, error: contentErr } = await supabase.from('content').upsert({
    source_id: source.id,
    platform: 'youtube',
    external_id: 'zdbVtZIn9IM',
    title: 'Leopold Aschenbrenner — 2027 AGI, China/US super-intelligence race, & the return of history',
    url: 'https://www.youtube.com/watch?v=zdbVtZIn9IM',
    published_at: '2024-06-04T00:00:00Z',
    raw_text: transcript,
  }, { onConflict: 'platform,external_id' }).select().single();

  if (contentErr) {
    console.error('Content insert failed:', contentErr.message);
    process.exit(1);
  }
  console.log('Content added:', content.id);
}

main();
