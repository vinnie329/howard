import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseTranscript(file: string): string {
  const xml = readFileSync(file, 'utf-8');
  const texts = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)].map(m => m[1]);
  return texts.join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/\[Music\]/gi, '').replace(/\[Applause\]/gi, '')
    .replace(/\s+/g, ' ').trim();
}

const items = [
  { id: 'f40d36b6-474a-41c6-91cf-4bfed4101bdb', file: '/tmp/burry.en.srv1', name: 'Burry' },
  { id: '70fe2df5-8ead-4627-9d72-90e496574748', file: '/tmp/patel.en.srv1', name: 'Patel' },
];

async function main() {
  for (const item of items) {
    const transcript = parseTranscript(item.file);
    console.log(`${item.name}: ${transcript.length} chars`);
    if (transcript.length < 100) {
      console.log(`  Skipping — too short (likely no real captions)`);
      continue;
    }
    console.log(`  Preview: ${transcript.slice(0, 150)}`);
    const { error } = await sb.from('content').update({ raw_text: transcript }).eq('id', item.id);
    if (error) console.error(`  Failed: ${error.message}`);
    else console.log(`  Updated`);
  }
}

main();
