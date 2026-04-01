/**
 * fetch-positioning-data.ts — Fetch CFTC COT, credit spreads, and options sentiment.
 *
 * Usage:
 *   npx tsx scripts/fetch-positioning-data.ts              # fetch all
 *   npx tsx scripts/fetch-positioning-data.ts --cot        # CFTC COT only
 *   npx tsx scripts/fetch-positioning-data.ts --credit     # credit spreads only
 *   npx tsx scripts/fetch-positioning-data.ts --options    # options sentiment only
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchCOT, formatCOTBlock } from '../src/lib/fetchers/cftc-cot';
import { fetchCreditSpreads, formatCreditBlock } from '../src/lib/fetchers/credit-spreads';
import { fetchOptionsSentiment, formatOptionsBlock } from '../src/lib/fetchers/options-sentiment';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const runAll = args.length === 0;
const runCOT = runAll || args.includes('--cot');
const runCredit = runAll || args.includes('--credit');
const runOptions = runAll || args.includes('--options');

async function main() {
  console.log('=== Positioning Data Fetch ===\n');

  if (runCOT) {
    const records = await fetchCOT(supabase);
    if (records.length > 0) {
      console.log('\nCOT Summary:');
      console.log(formatCOTBlock(records));
    }
    console.log('');
  }

  if (runCredit) {
    const records = await fetchCreditSpreads(supabase);
    if (records.length > 0) {
      console.log('\nCredit Spreads Summary:');
      console.log(formatCreditBlock(records));
    }
    console.log('');
  }

  if (runOptions) {
    const sentiment = await fetchOptionsSentiment(supabase);
    console.log('\nOptions Sentiment Summary:');
    console.log(formatOptionsBlock(sentiment));
    console.log('');
  }

  console.log('=== Done! ===');
}

main().catch((err) => {
  console.error('Positioning data fetch failed:', err);
  process.exit(1);
});
