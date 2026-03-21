import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  // Delete ALL content with null source_id (orphaned duplicates)
  const { data: orphans } = await supabase.from('content').select('id, title').is('source_id', null);
  for (const c of orphans || []) {
    await supabase.from('analyses').delete().eq('content_id', c.id);
    await supabase.from('predictions').delete().eq('content_id', c.id);
    await supabase.from('content').delete().eq('id', c.id);
    console.log('Deleted null-source content:', c.id, c.title);
  }

  // Check totals
  const { count } = await supabase.from('content').select('*', { count: 'exact', head: true });
  console.log('Total content items:', count);

  const { count: analysisCount } = await supabase.from('analyses').select('*', { count: 'exact', head: true });
  console.log('Total analyses:', analysisCount);
}
cleanup();
