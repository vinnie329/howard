import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
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

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function run() {
  console.log('=== Theme Normalizer ===\n');

  // Fetch all analyses with themes
  const { data: analyses, error } = await supabase
    .from('analyses')
    .select('id, themes');

  if (error || !analyses) {
    console.error('Failed to fetch analyses:', error?.message);
    process.exit(1);
  }

  // Collect unique themes
  const allThemes = new Set<string>();
  for (const a of analyses) {
    for (const t of (a.themes || []) as string[]) {
      allThemes.add(t);
    }
  }

  const uniqueThemes = Array.from(allThemes).sort();
  console.log(`Found ${uniqueThemes.length} unique themes across ${analyses.length} analyses\n`);

  if (uniqueThemes.length === 0) {
    console.log('Nothing to normalize.');
    return;
  }

  // Ask Claude to create a mapping
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Map each verbose theme to a clean, short tag (1-3 words max). Tags should be broad and reusable across content.

Examples of good tags: "NVIDIA", "Liquidity", "Gold", "AI CapEx", "Energy", "China", "Fed Policy", "Semiconductors", "Data Centers"

Verbose themes to normalize:
${uniqueThemes.map((t) => `- "${t}"`).join('\n')}

Respond in JSON only (no markdown fences) — an object mapping each original theme to its short tag:
{"original theme": "Short Tag", ...}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    console.error('No response from Claude');
    process.exit(1);
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const mapping = JSON.parse(jsonStr) as Record<string, string>;

  console.log('Theme mapping:');
  for (const [old, normalized] of Object.entries(mapping)) {
    console.log(`  "${old}" → "${normalized}"`);
  }
  console.log('');

  // Apply mapping to each analysis
  let updated = 0;
  for (const analysis of analyses) {
    const oldThemes = (analysis.themes || []) as string[];
    const newThemes = oldThemes.map((t) => mapping[t] || t);

    // Deduplicate after mapping (multiple verbose themes may map to same tag)
    const deduped = Array.from(new Set(newThemes));

    if (JSON.stringify(oldThemes) !== JSON.stringify(deduped)) {
      const { error: updateError } = await supabase
        .from('analyses')
        .update({ themes: deduped })
        .eq('id', analysis.id);

      if (updateError) {
        console.error(`  Error updating ${analysis.id}:`, updateError.message);
      } else {
        console.log(`Updated analysis ${analysis.id}: [${deduped.join(', ')}]`);
        updated++;
      }
    }
  }

  console.log(`\nDone! Updated ${updated}/${analyses.length} analyses.`);
}

run();
