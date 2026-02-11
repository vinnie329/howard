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

async function validate() {
  console.log('=== Validate Prediction Themes/Assets Against Analyses ===\n');

  const { data: predictions, error: predErr } = await supabase
    .from('predictions')
    .select('id, content_id, themes, assets_mentioned');

  if (predErr || !predictions) {
    console.error('Failed to load predictions:', predErr?.message);
    process.exit(1);
  }

  const { data: analyses, error: anaErr } = await supabase
    .from('analyses')
    .select('content_id, themes, assets_mentioned');

  if (anaErr || !analyses) {
    console.error('Failed to load analyses:', anaErr?.message);
    process.exit(1);
  }

  const analysisMap = new Map<string, { themes: string[]; assets: string[] }>();
  for (const a of analyses) {
    analysisMap.set(a.content_id, {
      themes: (a.themes as string[]) || [],
      assets: (a.assets_mentioned as string[]) || [],
    });
  }

  let fixed = 0;

  for (const pred of predictions) {
    const analysis = analysisMap.get(pred.content_id);
    if (!analysis) continue;

    const predThemes = (pred.themes as string[]) || [];
    const predAssets = (pred.assets_mentioned as string[]) || [];

    // Filter to only values that exist in the analysis
    const validThemes = predThemes.filter((t) => analysis.themes.includes(t));
    const validAssets = predAssets.filter((a) => analysis.assets.includes(a));

    // Check for values that were in wrong column or don't match
    // A prediction "theme" that's actually an analysis asset should move
    const misplacedAsTheme = predThemes.filter(
      (t) => !analysis.themes.includes(t) && analysis.assets.includes(t)
    );
    const misplacedAsAsset = predAssets.filter(
      (a) => !analysis.assets.includes(a) && analysis.themes.includes(a)
    );

    const finalThemes = [...validThemes, ...misplacedAsAsset];
    const finalAssets = [...validAssets, ...misplacedAsTheme];

    // Report orphans (in neither list)
    const orphanThemes = predThemes.filter(
      (t) => !analysis.themes.includes(t) && !analysis.assets.includes(t)
    );
    const orphanAssets = predAssets.filter(
      (a) => !analysis.assets.includes(a) && !analysis.themes.includes(a)
    );

    const changed =
      JSON.stringify(finalThemes) !== JSON.stringify(predThemes) ||
      JSON.stringify(finalAssets) !== JSON.stringify(predAssets);

    if (changed || orphanThemes.length > 0 || orphanAssets.length > 0) {
      console.log(`Prediction ${pred.id}:`);
      if (orphanThemes.length) console.log(`  Dropping orphan themes: ${orphanThemes.join(', ')}`);
      if (orphanAssets.length) console.log(`  Dropping orphan assets: ${orphanAssets.join(', ')}`);
      if (misplacedAsTheme.length) console.log(`  Moving to assets: ${misplacedAsTheme.join(', ')}`);
      if (misplacedAsAsset.length) console.log(`  Moving to themes: ${misplacedAsAsset.join(', ')}`);
      console.log(`  themes: [${finalThemes.join(', ')}]  assets: [${finalAssets.join(', ')}]`);

      const { error } = await supabase
        .from('predictions')
        .update({ themes: finalThemes, assets_mentioned: finalAssets })
        .eq('id', pred.id);

      if (error) {
        console.error(`  Error:`, error.message);
      } else {
        fixed++;
      }
    }
  }

  console.log(`\nDone! Fixed: ${fixed}, Total: ${predictions.length}`);
}

validate();
