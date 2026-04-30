/**
 * Dedupe predictions that were created when the same content was analyzed multiple times.
 *
 * Groups by (source_id, content_id), clusters claims via Jaccard similarity on normalized
 * word tokens, keeps the "best" prediction per cluster (scored outcome > pending; oldest
 * created_at as tiebreaker), and deletes the rest.
 *
 * Usage:
 *   npx tsx scripts/dedupe-predictions.ts           # dry-run
 *   npx tsx scripts/dedupe-predictions.ts --apply   # actually delete
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SIMILARITY_THRESHOLD = 0.7;
const apply = process.argv.includes('--apply');

const STOP = new Set(['the','a','an','is','are','was','were','be','been','being','to','of','in','on','at','for','with','by','as','and','or','but','if','that','this','will','would','could','may','might','should','can']);

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function score(p: { outcome: string | null; created_at: string }): number {
  // Higher = keep. Scored outcomes beat pending; ties broken by earliest.
  const resolved = p.outcome && ['correct','incorrect','partially_correct'].includes(p.outcome);
  return (resolved ? 1e12 : 0) - new Date(p.created_at).getTime();
}

async function main() {
  console.log(`Mode: ${apply ? 'APPLY (will delete)' : 'DRY RUN'}\n`);

  let all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('predictions')
      .select('id, source_id, content_id, claim, outcome, created_at, date_made')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Loaded ${all.length} predictions\n`);

  // Group by (source_id, content_id)
  const groups = new Map<string, any[]>();
  for (const p of all) {
    if (!p.content_id) continue;
    const key = `${p.source_id}::${p.content_id}`;
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }

  const toDelete: string[] = [];
  const clusters: Array<{ keep: any; drop: any[] }> = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    // Cluster by similarity
    const withTokens = group.map((p) => ({ ...p, _tok: tokens(p.claim) }));
    const clustered: boolean[] = new Array(withTokens.length).fill(false);

    for (let i = 0; i < withTokens.length; i++) {
      if (clustered[i]) continue;
      const cluster = [withTokens[i]];
      clustered[i] = true;
      for (let j = i + 1; j < withTokens.length; j++) {
        if (clustered[j]) continue;
        if (jaccard(withTokens[i]._tok, withTokens[j]._tok) >= SIMILARITY_THRESHOLD) {
          cluster.push(withTokens[j]);
          clustered[j] = true;
        }
      }
      if (cluster.length > 1) {
        cluster.sort((a, b) => score(b) - score(a));
        const keep = cluster[0];
        const drop = cluster.slice(1);
        clusters.push({ keep, drop });
        for (const d of drop) toDelete.push(d.id);
      }
    }
  }

  console.log(`Found ${clusters.length} duplicate clusters`);
  console.log(`Will delete ${toDelete.length} predictions\n`);

  // Sample output
  for (const c of clusters.slice(0, 5)) {
    console.log(`KEEP: ${c.keep.claim.slice(0, 90)}`);
    for (const d of c.drop) {
      console.log(`  DROP: ${d.claim.slice(0, 90)}`);
    }
    console.log();
  }
  if (clusters.length > 5) console.log(`... and ${clusters.length - 5} more clusters\n`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to delete.');
    return;
  }

  // Delete in batches
  const batchSize = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error } = await sb.from('predictions').delete().in('id', batch);
    if (error) {
      console.error('Delete error:', error.message);
      process.exit(1);
    }
    deleted += batch.length;
    process.stdout.write(`\rDeleted ${deleted}/${toDelete.length}`);
  }
  console.log(`\n\nDone. Deleted ${deleted} duplicate predictions.`);
}

main();
