import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearContent() {
  console.log('Clearing content and analyses...\n');

  // Delete analyses first (foreign key on content)
  const { error: analysesError } = await supabase
    .from('analyses')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (analysesError) {
    console.error('Error deleting analyses:', analysesError.message);
  } else {
    console.log('  Deleted all analyses');
  }

  // Delete predictions (foreign key on content)
  const { error: predsError } = await supabase
    .from('predictions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (predsError) {
    console.error('Error deleting predictions:', predsError.message);
  } else {
    console.log('  Deleted all predictions');
  }

  // Delete content
  const { error: contentError } = await supabase
    .from('content')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (contentError) {
    console.error('Error deleting content:', contentError.message);
  } else {
    console.log('  Deleted all content items');
  }

  console.log('\nDone! Tables cleared.');
}

clearContent();
