import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  generateEmbeddings,
  prepareSourceText,
  prepareContentText,
  prepareAnalysisText,
  preparePredictionText,
  toVectorString,
} from '../src/lib/embeddings';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!process.env.VOYAGE_API_KEY) {
  console.error('Missing VOYAGE_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedSources() {
  console.log('\n--- Sources ---');

  const { data: rows, error } = await supabase
    .from('sources')
    .select('id, name, bio, domains')
    .is('embedding', null);

  if (error) {
    console.error('Failed to fetch sources:', error.message);
    return;
  }
  if (!rows || rows.length === 0) {
    console.log('All sources already embedded.');
    return;
  }

  console.log(`Found ${rows.length} sources to embed`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) =>
      prepareSourceText(r.name, r.bio || '', (r.domains || []) as string[])
    );

    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      const { error: updateErr } = await supabase
        .from('sources')
        .update({ embedding: toVectorString(embeddings[j]) })
        .eq('id', batch[j].id);

      if (updateErr) {
        console.error(`  Error embedding source ${batch[j].name}:`, updateErr.message);
      }
    }

    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} sources`);

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function embedContent() {
  console.log('\n--- Content ---');

  const { data: rows, error } = await supabase
    .from('content')
    .select('id, title, raw_text')
    .is('embedding', null)
    .not('raw_text', 'is', null);

  if (error) {
    console.error('Failed to fetch content:', error.message);
    return;
  }
  if (!rows || rows.length === 0) {
    console.log('All content already embedded.');
    return;
  }

  console.log(`Found ${rows.length} content items to embed`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) =>
      prepareContentText(r.title, r.raw_text || '')
    );

    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      const { error: updateErr } = await supabase
        .from('content')
        .update({ embedding: toVectorString(embeddings[j]) })
        .eq('id', batch[j].id);

      if (updateErr) {
        console.error(`  Error embedding content ${batch[j].id}:`, updateErr.message);
      }
    }

    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} content items`);

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function embedAnalyses() {
  console.log('\n--- Analyses ---');

  const { data: rows, error } = await supabase
    .from('analyses')
    .select('id, summary, themes, assets_mentioned')
    .is('embedding', null);

  if (error) {
    console.error('Failed to fetch analyses:', error.message);
    return;
  }
  if (!rows || rows.length === 0) {
    console.log('All analyses already embedded.');
    return;
  }

  console.log(`Found ${rows.length} analyses to embed`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) =>
      prepareAnalysisText(
        r.summary || '',
        (r.themes || []) as string[],
        (r.assets_mentioned || []) as string[],
      )
    );

    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      const { error: updateErr } = await supabase
        .from('analyses')
        .update({ embedding: toVectorString(embeddings[j]) })
        .eq('id', batch[j].id);

      if (updateErr) {
        console.error(`  Error embedding analysis ${batch[j].id}:`, updateErr.message);
      }
    }

    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} analyses`);

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function embedPredictions() {
  console.log('\n--- Predictions ---');

  const { data: rows, error } = await supabase
    .from('predictions')
    .select('id, claim, themes, assets_mentioned, sentiment')
    .is('embedding', null);

  if (error) {
    console.error('Failed to fetch predictions:', error.message);
    return;
  }
  if (!rows || rows.length === 0) {
    console.log('All predictions already embedded.');
    return;
  }

  console.log(`Found ${rows.length} predictions to embed`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) =>
      preparePredictionText(
        r.claim,
        (r.themes || []) as string[],
        (r.assets_mentioned || []) as string[],
        r.sentiment || '',
      )
    );

    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      const { error: updateErr } = await supabase
        .from('predictions')
        .update({ embedding: toVectorString(embeddings[j]) })
        .eq('id', batch[j].id);

      if (updateErr) {
        console.error(`  Error embedding prediction ${batch[j].id}:`, updateErr.message);
      }
    }

    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} predictions`);

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function main() {
  console.log('=== Howard Embedding Generator ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  await embedSources();
  await embedContent();
  await embedAnalyses();
  await embedPredictions();

  console.log('\n=== Done! ===');
}

main();
