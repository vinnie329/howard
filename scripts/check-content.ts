import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: content } = await supabase
    .from('content')
    .select('id, title, platform, raw_text, source:source_id(name)')
    .order('created_at', { ascending: false });

  const { data: analyses } = await supabase
    .from('analyses')
    .select('content_id');

  const analyzedIds = new Set((analyses ?? []).map(a => a.content_id));

  console.log('=== Unanalyzed or missing text ===\n');
  for (const c of content ?? []) {
    const src = (c.source as any)?.name || '?';
    const hasText = c.raw_text && c.raw_text.length > 100;
    const analyzed = analyzedIds.has(c.id);

    if (!analyzed || !hasText) {
      console.log(`${analyzed ? 'ANALYZED' : 'NOT ANALYZED'} | ${hasText ? c.raw_text.length + ' chars' : 'NO TEXT'} | ${src} | ${c.platform} | ${c.title?.slice(0, 70)}`);
    }
  }
}

main();
