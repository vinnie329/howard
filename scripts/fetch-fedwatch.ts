import { createClient } from '@supabase/supabase-js';
import { fetchFedWatch } from '../src/lib/fetchers/fedwatch';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

fetchFedWatch(supabase).catch((err) => {
  console.error('FedWatch fetch failed:', err);
  process.exit(1);
});
