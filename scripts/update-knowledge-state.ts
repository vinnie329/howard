/**
 * update-knowledge-state.ts — Compile per-source and per-theme knowledge state.
 *
 * Layer 2: For each source with recent analyses, maintain a running knowledge doc
 * summarizing their current thesis, key positions, evolving views, and open predictions.
 *
 * Layer 3: For each active theme, synthesize across sources to maintain bull/bear cases,
 * key debates, and how the theme is evolving.
 *
 * These state docs feed back into content analysis as institutional memory.
 */

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Layer 2: Source State ──

async function updateSourceStates() {
  console.log('\n=== Updating Source Knowledge States ===\n');

  // Get all sources that have analyses
  const { data: sources } = await supabase
    .from('sources')
    .select('id, name, slug, domains, bio')
    .order('weighted_score', { ascending: false });

  if (!sources || sources.length === 0) {
    console.log('No sources found');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const source of sources) {
    // Get all analyses for this source, most recent first
    const { data: analyses } = await supabase
      .from('analyses')
      .select('display_title, sentiment_overall, sentiment_score, summary, themes, key_quotes, created_at, content!inner(source_id, published_at)')
      .eq('content.source_id', source.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!analyses || analyses.length < 2) {
      skipped++;
      continue; // Need at least 2 analyses to compile a meaningful state
    }

    // Get open predictions for this source
    const { data: predictions } = await supabase
      .from('predictions')
      .select('claim, sentiment, time_horizon, confidence, specificity, themes, date_made, outcome')
      .eq('source_id', source.id)
      .order('date_made', { ascending: false })
      .limit(20);

    // Get existing state
    const { data: existingState } = await supabase
      .from('source_state')
      .select('state, updated_at')
      .eq('source_id', source.id)
      .single();

    // Check if we need to update (new analyses since last state update)
    if (existingState?.updated_at) {
      const lastUpdate = new Date(existingState.updated_at);
      const latestAnalysis = new Date(analyses[0].created_at);
      if (latestAnalysis <= lastUpdate) {
        skipped++;
        continue; // No new analyses since last state update
      }
    }

    console.log(`  Compiling state for ${source.name} (${analyses.length} analyses)...`);

    const analysisLines = analyses.map((a) => {
      const published = (a.content as unknown as { published_at: string })?.published_at || a.created_at;
      return `- [${published?.slice(0, 10)}] "${a.display_title}" (${a.sentiment_overall}, ${a.sentiment_score}): ${a.summary}`;
    }).join('\n');

    const predictionLines = (predictions || []).map((p) => {
      const outcome = p.outcome ? ` [OUTCOME: ${p.outcome}]` : ' [OPEN]';
      return `- [${p.date_made?.slice(0, 10)}] ${p.claim} (${p.sentiment}, ${p.confidence} confidence, ${p.specificity})${outcome}`;
    }).join('\n');

    const existingBlock = existingState?.state
      ? `\nPrevious knowledge state (update and evolve this, don't start from scratch):\n${existingState.state}\n`
      : '';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are maintaining a knowledge state document for ${source.name} in Howard, a financial intelligence system.

Source bio: ${source.bio || 'N/A'}
Domains: ${(source.domains as string[] || []).join(', ')}
${existingBlock}
Recent analyses (newest first):
${analysisLines}

Predictions:
${predictionLines || 'None'}

Write a concise knowledge state document in markdown. Include:

## Current Thesis
Their core market view right now (2-3 sentences max)

## Key Positions
Bullet list of specific positions/calls they're making

## Evolving Views
How their thinking has shifted over recent analyses — what changed and when

## Open Predictions
Active forward-looking calls that haven't resolved yet

## Credibility Notes
Which calls have been right/wrong based on outcomes

Keep it factual, concise, and useful as context for analyzing their next piece of content. No preamble — start directly with ## Current Thesis.`
        }],
      });

      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') continue;

      const state = text.text.trim();

      // Upsert source state
      const { error } = await supabase
        .from('source_state')
        .upsert({
          source_id: source.id,
          state,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'source_id' });

      if (error) {
        console.error(`    Error saving state for ${source.name}:`, error.message);
      } else {
        updated++;
        console.log(`    ✓ ${source.name} (${state.length} chars)`);
      }

      await sleep(1000); // Rate limit
    } catch (err) {
      console.error(`    ✕ Failed for ${source.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Source states: ${updated} updated, ${skipped} skipped`);
}

// ── Layer 3: Theme State ──

async function updateThemeStates() {
  console.log('\n=== Updating Theme Knowledge States ===\n');

  // Get all themes from recent analyses (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAnalyses } = await supabase
    .from('analyses')
    .select('themes, sentiment_overall, sentiment_score, display_title, summary, content!inner(source_id, sources(name, slug), published_at)')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (!recentAnalyses || recentAnalyses.length === 0) {
    console.log('No recent analyses found');
    return;
  }

  // Count theme occurrences and group analyses by theme
  const themeMap = new Map<string, Array<{
    title: string;
    summary: string;
    sentiment: string;
    score: number;
    source: string;
    sourceSlug: string;
    date: string;
  }>>();

  for (const a of recentAnalyses) {
    const themes = (a.themes as string[]) || [];
    const source = (a.content as unknown as { sources: { name: string; slug: string } })?.sources;
    const published = (a.content as unknown as { published_at: string })?.published_at;

    for (const theme of themes) {
      if (!themeMap.has(theme)) themeMap.set(theme, []);
      themeMap.get(theme)!.push({
        title: a.display_title || '',
        summary: a.summary || '',
        sentiment: a.sentiment_overall || 'neutral',
        score: a.sentiment_score || 0,
        source: source?.name || 'Unknown',
        sourceSlug: source?.slug || '',
        date: published?.slice(0, 10) || '',
      });
    }
  }

  // Only compile state for themes with 3+ sources (meaningful cross-source synthesis)
  const activeThemes = [...themeMap.entries()]
    .filter(([, entries]) => {
      const uniqueSources = new Set(entries.map((e) => e.source));
      return uniqueSources.size >= 3;
    })
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20); // Top 20 themes

  console.log(`  Found ${themeMap.size} themes, ${activeThemes.length} with 3+ sources\n`);

  let updated = 0;

  for (const [theme, entries] of activeThemes) {
    const uniqueSources = [...new Set(entries.map((e) => e.sourceSlug))];

    // Check if we need to update
    const { data: existingTheme } = await supabase
      .from('theme_state')
      .select('state, updated_at')
      .eq('theme', theme)
      .single();

    const entriesBlock = entries.slice(0, 15).map((e) =>
      `- [${e.date}] ${e.source} (${e.sentiment}, ${e.score}): "${e.title}" — ${e.summary.slice(0, 150)}`
    ).join('\n');

    const existingBlock = existingTheme?.state
      ? `\nPrevious theme state (update and evolve this):\n${existingTheme.state}\n`
      : '';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `You are maintaining a cross-source knowledge state for the theme "${theme}" in Howard, a financial intelligence system.
${existingBlock}
Recent analysis mentioning this theme (newest first):
${entriesBlock}

Write a concise theme state document in markdown:

## Consensus View
What most sources agree on (1-2 sentences)

## Bull Case
Sources and arguments for the bullish side

## Bear Case
Sources and arguments for the bearish side

## Key Debate
The central disagreement or open question

## Related Themes
Other themes this connects to

Keep it factual and concise. No preamble — start directly with ## Consensus View.`
        }],
      });

      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') continue;

      const state = text.text.trim();

      const { error } = await supabase
        .from('theme_state')
        .upsert({
          theme,
          state,
          sources: uniqueSources,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'theme' });

      if (error) {
        console.error(`    Error saving theme "${theme}":`, error.message);
      } else {
        updated++;
        console.log(`    ✓ ${theme} (${uniqueSources.length} sources, ${state.length} chars)`);
      }

      await sleep(1000);
    } catch (err) {
      console.error(`    ✕ Failed for "${theme}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Theme states: ${updated} updated`);
}

// ── Main ──

async function main() {
  console.log('=== Howard Knowledge State Compiler ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  await updateSourceStates();
  await updateThemeStates();

  console.log('\n=== Knowledge state compilation complete ===');
}

main();
