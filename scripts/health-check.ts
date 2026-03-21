// Post-pipeline health check: flags content issues that need attention
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  let issues = 0;

  // 1. Content with no transcript (empty or null raw_text)
  const { data: noText } = await supabase
    .from('content')
    .select('id, title, platform, external_id, created_at')
    .or('raw_text.is.null,raw_text.eq.')
    .not('source_id', 'is', null)
    .order('created_at', { ascending: false });

  if (noText?.length) {
    console.log(`\n⚠ MISSING TRANSCRIPTS (${noText.length}):`);
    for (const c of noText) {
      console.log(`  - [${c.platform}] ${c.title} (${c.id})`);
    }
    issues += noText.length;
  }

  // 2. Content with transcript but no analysis
  const { data: allContent } = await supabase
    .from('content')
    .select('id, title, platform, raw_text')
    .not('source_id', 'is', null);

  const { data: allAnalyses } = await supabase
    .from('analyses')
    .select('content_id');

  const analyzedIds = new Set((allAnalyses || []).map(a => a.content_id));
  const needsAnalysis = (allContent || []).filter(
    c => c.raw_text && c.raw_text.length >= 100 && !analyzedIds.has(c.id)
  );

  if (needsAnalysis.length) {
    console.log(`\n⚠ HAVE TRANSCRIPT, MISSING ANALYSIS (${needsAnalysis.length}):`);
    for (const c of needsAnalysis) {
      console.log(`  - [${c.platform}] ${c.title} (${c.id}) — ${c.raw_text!.length} chars`);
    }
    issues += needsAnalysis.length;
  }

  // 3. Content with null source_id (orphaned)
  const { data: orphaned } = await supabase
    .from('content')
    .select('id, title')
    .is('source_id', null);

  if (orphaned?.length) {
    console.log(`\n⚠ ORPHANED CONTENT — null source_id (${orphaned.length}):`);
    for (const c of orphaned) {
      console.log(`  - ${c.title} (${c.id})`);
    }
    issues += orphaned.length;
  }

  // 4. Summary
  const { count: totalContent } = await supabase.from('content').select('*', { count: 'exact', head: true });
  const { count: totalAnalyses } = await supabase.from('analyses').select('*', { count: 'exact', head: true });
  const { count: totalPredictions } = await supabase.from('predictions').select('*', { count: 'exact', head: true });

  console.log(`\n--- SUMMARY ---`);
  console.log(`Content: ${totalContent}`);
  console.log(`Analyses: ${totalAnalyses}`);
  console.log(`Predictions: ${totalPredictions}`);
  console.log(`Coverage: ${totalAnalyses && totalContent ? ((totalAnalyses / totalContent) * 100).toFixed(0) : 0}%`);
  console.log(`Issues: ${issues}`);

  if (issues > 0) {
    console.log(`\nTo fix missing transcripts, run locally:`);
    console.log(`  yt-dlp --write-sub --write-auto-sub --sub-lang en --sub-format srv1 --skip-download -o /tmp/sub "https://www.youtube.com/watch?v=VIDEO_ID"`);
    console.log(`  npx tsx scripts/ingest-local-sub.ts <content-id> /tmp/sub.en.srv1`);
    console.log(`\nTo fix missing analyses:`);
    console.log(`  npx tsx scripts/analyze-one.ts <content-id>`);
  }

  // Exit 0 even with issues — health check is informational, not a gate
  process.exit(0);
}
main();
