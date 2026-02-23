import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(url, key);

async function main() {
  const { data } = await supabase
    .from('content')
    .select('id, title, raw_text')
    .eq('id', '4eafa7a7-eab8-498a-a881-7f9804b8e163')
    .single();

  if (data) {
    console.log('Title:', data.title);
    console.log('Text length:', data.raw_text?.length || 0);
    console.log('First 500 chars:', data.raw_text?.substring(0, 500));
  } else {
    console.log('Not found');
  }
}

main().catch(console.error);
