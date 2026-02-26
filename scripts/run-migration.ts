import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

async function runMigration() {
  const sql = readFileSync('supabase/migrations/009_funds_holdings.sql', 'utf8');

  // Use the Supabase Management API / pg_net or just run via REST
  // The simplest approach: use the SQL endpoint
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Actually, let's just use the supabase-js to verify tables exist
  // and if not, we'll use the SQL editor approach
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if funds table exists
  const { error: checkError } = await supabase.from('funds').select('id').limit(1);

  if (checkError && checkError.message.includes('does not exist')) {
    console.log('Tables do not exist yet. Please run the migration SQL in your Supabase dashboard:');
    console.log('  1. Go to https://supabase.com/dashboard/project/tqvulocpjbpgubbgjjzw/sql/new');
    console.log('  2. Paste the contents of supabase/migrations/009_funds_holdings.sql');
    console.log('  3. Click "Run"');
    console.log('  4. Then re-run: npx tsx scripts/fetch-13f.ts');
    process.exit(1);
  } else if (checkError) {
    console.error('Error checking tables:', checkError.message);
    process.exit(1);
  } else {
    console.log('Tables already exist! You can run: npx tsx scripts/fetch-13f.ts');
  }
}

runMigration();
