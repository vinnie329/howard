import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evaluateOutlook, type AnalysisWithSource } from '@/lib/analysis/evaluateOutlook';
import type { Outlook } from '@/types';

export const dynamic = 'force-dynamic';

const TIME_HORIZONS = ['short', 'medium', 'long'] as const;

export async function POST(request: Request) {
  // Check for API key auth
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.OUTLOOK_UPDATE_KEY;
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !supabaseKey || !anthropicKey) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch recent analyses (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: analysisRows, error: analysisError } = await supabase
    .from('analyses')
    .select('*, content!inner(id, title, platform, published_at, source_id, sources!inner(name, weighted_score))')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (analysisError || !analysisRows) {
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
  }

  const analyses: AnalysisWithSource[] = analysisRows.map((row) => {
    const content = row.content as Record<string, unknown>;
    const source = content.sources as Record<string, unknown>;
    return {
      content_id: content.id as string,
      title: content.title as string,
      platform: content.platform as string,
      published_at: content.published_at as string,
      summary: row.summary || '',
      sentiment_overall: row.sentiment_overall,
      sentiment_score: row.sentiment_score,
      themes: (row.themes || []) as string[],
      predictions: (row.predictions || []) as string[],
      key_quotes: (row.key_quotes || []) as string[],
      source_name: source.name as string,
      source_weighted_score: source.weighted_score as number,
    };
  });

  // Fetch current outlooks
  const { data: outlookRows, error: outlookError } = await supabase
    .from('outlook')
    .select('*');

  if (outlookError || !outlookRows) {
    return NextResponse.json({ error: 'Failed to fetch outlooks' }, { status: 500 });
  }

  const results: Record<string, { updated: boolean; reasoning: string; changes: string[] }> = {};

  for (const horizon of TIME_HORIZONS) {
    const row = outlookRows.find((o) => o.time_horizon === horizon);
    if (!row) continue;

    const outlook: Outlook = {
      id: row.id,
      time_horizon: row.time_horizon,
      domain: row.domain || 'general',
      title: row.title,
      subtitle: row.subtitle || '',
      thesis_intro: row.thesis_intro || '',
      thesis_points: (row.thesis_points || []) as Outlook['thesis_points'],
      positioning: (row.positioning || []) as string[],
      key_themes: (row.key_themes || []) as string[],
      sentiment: row.sentiment,
      confidence: row.confidence,
      supporting_sources: (row.supporting_sources || []) as { name: string; weight: number }[],
      last_updated: row.last_updated,
      created_at: row.created_at,
    };

    try {
      const evaluation = await evaluateOutlook(outlook, analyses, horizon, anthropicKey);

      if (evaluation.should_update) {
        const updatePayload: Record<string, unknown> = {
          last_updated: new Date().toISOString(),
        };
        if (evaluation.updated_title) updatePayload.title = evaluation.updated_title;
        if (evaluation.updated_thesis_intro) updatePayload.thesis_intro = evaluation.updated_thesis_intro;
        if (evaluation.updated_thesis_points) updatePayload.thesis_points = evaluation.updated_thesis_points;
        if (evaluation.updated_positioning) updatePayload.positioning = evaluation.updated_positioning;
        if (evaluation.updated_key_themes) updatePayload.key_themes = evaluation.updated_key_themes;
        if (evaluation.updated_sentiment) updatePayload.sentiment = evaluation.updated_sentiment;
        if (evaluation.updated_confidence !== undefined && evaluation.updated_confidence !== null) {
          updatePayload.confidence = evaluation.updated_confidence;
        }

        await supabase.from('outlook').update(updatePayload).eq('id', outlook.id);

        await supabase.from('outlook_history').insert({
          outlook_id: outlook.id,
          time_horizon: horizon,
          evaluation_reasoning: evaluation.reasoning,
          changes_summary: evaluation.changes_summary,
          previous_sentiment: outlook.sentiment,
          new_sentiment: evaluation.updated_sentiment || outlook.sentiment,
          previous_confidence: outlook.confidence,
          new_confidence: evaluation.updated_confidence ?? outlook.confidence,
          analyses_evaluated: analyses.length,
        });

        results[horizon] = {
          updated: true,
          reasoning: evaluation.reasoning,
          changes: evaluation.changes_summary,
        };
      } else {
        await supabase.from('outlook_history').insert({
          outlook_id: outlook.id,
          time_horizon: horizon,
          evaluation_reasoning: evaluation.reasoning,
          changes_summary: [],
          previous_sentiment: outlook.sentiment,
          new_sentiment: outlook.sentiment,
          previous_confidence: outlook.confidence,
          new_confidence: outlook.confidence,
          analyses_evaluated: analyses.length,
        });

        results[horizon] = {
          updated: false,
          reasoning: evaluation.reasoning,
          changes: [],
        };
      }
    } catch (err) {
      results[horizon] = {
        updated: false,
        reasoning: `Error: ${err instanceof Error ? err.message : String(err)}`,
        changes: [],
      };
    }
  }

  return NextResponse.json({ ok: true, results });
}
