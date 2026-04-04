import { createClient } from '@supabase/supabase-js';
import { analyzeContent } from '../src/lib/analysis/analyzeContent';
import {
  generateEmbedding,
  prepareContentText,
  prepareAnalysisText,
  preparePredictionText,
  toVectorString,
} from '../src/lib/embeddings';
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

const anthropicKey: string = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_DELAY_MS = 2000; // 2 seconds between API calls

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build prior context for a source: latest daily summary + recent analyses from this source.
 * This gives the LLM Howard's institutional memory so it can identify shifts, contradictions,
 * and genuinely new information rather than treating each piece of content in isolation.
 */
async function buildPriorContext(sourceId: string, sourceName: string, themes?: string[]): Promise<string | undefined> {
  const parts: string[] = [];

  // 1. Source knowledge state (Layer 2 — compiled per-source memory)
  try {
    const { data: sourceState } = await supabase
      .from('source_state')
      .select('state')
      .eq('source_id', sourceId)
      .single();

    if (sourceState?.state) {
      parts.push(`=== ${sourceName} — Compiled Knowledge State ===\n${sourceState.state}`);
    }
  } catch {}

  // 2. Latest daily update summary (Howard's current market view)
  try {
    const { data: latest } = await supabase
      .from('daily_update_cache')
      .select('data')
      .order('key', { ascending: false })
      .limit(1)
      .single();

    if (latest?.data?.summary) {
      parts.push(`=== Howard's Latest Market Summary ===\n${latest.data.summary}`);
    }
  } catch {}

  // 3. Recent analyses from this same source (last 10) — fallback if no source state
  try {
    const { data: recentAnalyses } = await supabase
      .from('analyses')
      .select('display_title, sentiment_overall, sentiment_score, summary, themes, created_at, content!inner(source_id)')
      .eq('content.source_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentAnalyses && recentAnalyses.length > 0) {
      const lines = recentAnalyses.map((a) =>
        `- "${a.display_title}" (${a.sentiment_overall}, ${a.sentiment_score}): ${a.summary}`
      );
      parts.push(`=== Recent Analysis from ${sourceName} (${recentAnalyses.length} most recent) ===\n${lines.join('\n')}`);
    }
  } catch {}

  // 4. Relevant theme states (Layer 3 — cross-source synthesis for themes this source covers)
  if (themes && themes.length > 0) {
    try {
      // Fetch theme states for this source's known domains/themes
      const { data: themeStates } = await supabase
        .from('theme_state')
        .select('theme, state')
        .in('theme', themes.slice(0, 5)); // Top 5 most relevant

      if (themeStates && themeStates.length > 0) {
        const themeBlock = themeStates.map((t) =>
          `### ${t.theme}\n${t.state}`
        ).join('\n\n');
        parts.push(`=== Cross-Source Theme Intelligence ===\n${themeBlock}`);
      }
    } catch {}
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

async function analyzeAll() {
  console.log('=== Howard Content Analyzer ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Find content without analyses
  const { data: allContent, error: contentError } = await supabase
    .from('content')
    .select('id, title, raw_text, source_id, platform, published_at, sources(name, weighted_score, domains)')
    .order('published_at', { ascending: false });

  if (contentError || !allContent) {
    console.error('Failed to load content:', contentError?.message);
    process.exit(1);
  }

  // Get existing analysis content_ids
  const { data: existingAnalyses } = await supabase
    .from('analyses')
    .select('content_id');

  const analyzedIds = new Set(
    (existingAnalyses || []).map((a) => a.content_id)
  );

  // Filter to unanalyzed content with meaningful text
  const MIN_CONTENT_LENGTH = 200;
  const JUNK_PATTERNS = ['This video is unavailable', 'Video unavailable', 'Sign in to confirm your age'];
  const toAnalyze = allContent
    .filter(
      (c) =>
        !analyzedIds.has(c.id) &&
        c.raw_text &&
        c.raw_text.length > MIN_CONTENT_LENGTH &&
        !JUNK_PATTERNS.some((p) => c.raw_text.includes(p))
    )
    .sort((a, b) => {
      const scoreA = (a.sources as unknown as { weighted_score: number } | null)?.weighted_score || 0;
      const scoreB = (b.sources as unknown as { weighted_score: number } | null)?.weighted_score || 0;
      return scoreB - scoreA;
    });

  console.log(`Total content: ${allContent.length}`);
  console.log(`Already analyzed: ${analyzedIds.size}`);
  console.log(`To analyze: ${toAnalyze.length}`);
  console.log(`Skipped (no text): ${allContent.length - analyzedIds.size - toAnalyze.length}\n`);

  if (toAnalyze.length === 0) {
    console.log('Nothing to analyze. Done!');
    return;
  }

  let analyzed = 0;
  let failed = 0;

  for (const item of toAnalyze) {
    const sourceName = (item.sources as unknown as { name: string } | null)?.name || 'Unknown';
    console.log(`\n[${analyzed + failed + 1}/${toAnalyze.length}] Analyzing: "${item.title}"`);
    console.log(`  Source: ${sourceName} | Platform: ${item.platform}`);
    console.log(`  Text length: ${item.raw_text.length} chars`);

    try {
      // Build prior context from Howard's knowledge base
      const sourceDomains = (item.sources as unknown as { domains: string[] } | null)?.domains || [];
      const priorContext = await buildPriorContext(item.source_id, sourceName, sourceDomains);
      if (priorContext) {
        console.log(`  Prior context: ${(priorContext.length / 1024).toFixed(1)}KB`);
      }

      const MAX_RETRIES = 3;
      let result: Awaited<ReturnType<typeof analyzeContent>> | null = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          result = await analyzeContent(
            item.title,
            item.raw_text,
            sourceName,
            anthropicKey,
            priorContext
          );
          break;
        } catch (retryErr) {
          if (attempt === MAX_RETRIES) throw retryErr;
          console.log(`  Attempt ${attempt} failed, retrying in ${BATCH_DELAY_MS * attempt}ms...`);
          await sleep(BATCH_DELAY_MS * attempt);
        }
      }

      if (!result) throw new Error('Analysis returned no result');

      console.log(`  Title: ${result.display_title}`);
      console.log(`  Sentiment: ${result.sentiment_overall} (${result.sentiment_score})`);
      console.log(`  Themes: ${result.themes.join(', ')}`);
      console.log(`  Predictions: ${result.predictions.length}`);

      // Insert analysis
      const { error: insertError } = await supabase.from('analyses').insert({
        content_id: item.id,
        display_title: result.display_title,
        sentiment_overall: result.sentiment_overall,
        sentiment_score: result.sentiment_score,
        assets_mentioned: result.assets_mentioned,
        themes: result.themes,
        predictions: result.predictions.map((p) => p.claim),
        key_quotes: result.key_quotes,
        referenced_people: result.referenced_people,
        summary: result.summary,
      });

      if (insertError) {
        console.error(`  Error inserting analysis:`, insertError.message);
        failed++;
      } else {
        // Insert predictions
        const predictionRows: { id: string; claim: string; themes: string[]; assets_mentioned: string[]; sentiment: string }[] = [];
        for (const pred of result.predictions) {
          const { data: predRow, error: predError } = await supabase.from('predictions').insert({
            content_id: item.id,
            source_id: item.source_id,
            claim: pred.claim,
            themes: pred.themes,
            assets_mentioned: pred.assets_mentioned,
            sentiment: pred.sentiment,
            time_horizon: pred.time_horizon,
            confidence: pred.confidence,
            specificity: pred.specificity,
            date_made: item.published_at || new Date().toISOString(),
          }).select('id').single();

          if (predError) {
            console.error(`  Error inserting prediction:`, predError.message);
          } else if (predRow) {
            predictionRows.push({ id: predRow.id, claim: pred.claim, themes: pred.themes, assets_mentioned: pred.assets_mentioned, sentiment: pred.sentiment });
          }
        }

        analyzed++;
        console.log(`  ✓ Saved`);

        // Generate embeddings
        if (process.env.VOYAGE_API_KEY) {
          try {
            const contentEmb = await generateEmbedding(prepareContentText(item.title, item.raw_text));
            await supabase.from('content').update({ embedding: toVectorString(contentEmb) }).eq('id', item.id);

            // Get analysis id
            const { data: analysisData } = await supabase.from('analyses').select('id').eq('content_id', item.id).single();
            if (analysisData) {
              const analysisEmb = await generateEmbedding(prepareAnalysisText(result.summary, result.themes, result.assets_mentioned));
              await supabase.from('analyses').update({ embedding: toVectorString(analysisEmb) }).eq('id', analysisData.id);
            }

            for (const pred of predictionRows) {
              const predEmb = await generateEmbedding(preparePredictionText(pred.claim, pred.themes, pred.assets_mentioned, pred.sentiment));
              await supabase.from('predictions').update({ embedding: toVectorString(predEmb) }).eq('id', pred.id);
            }

            console.log(`  ✓ Embedded`);
          } catch (embErr) {
            console.error(`  Embedding failed:`, embErr instanceof Error ? embErr.message : embErr);
          }
        }
      }
    } catch (err) {
      console.error(`  ✕ Failed:`, err instanceof Error ? err.message : err);
      failed++;
    }

    // Rate limit
    if (analyzed + failed < toAnalyze.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n=== Done! Analyzed: ${analyzed}, Failed: ${failed} ===`);
}

analyzeAll();
