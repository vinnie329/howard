import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import {
  mockContentWithAnalysis,
  mockPredictions,
  mockSources,
} from '@/lib/mock-data';
import type { GraphData, GraphNode, GraphEdge } from '@/lib/graph-utils';

export const dynamic = 'force-dynamic';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface ThemeAgg {
  count: number;
  sentimentSum: number;
  sentimentCount: number;
  assets: Set<string>;
  sources: Set<string>;
}

function buildGraph(
  analyses: { themes: string[]; sentiment_score: number; assets_mentioned: string[]; source_name?: string }[],
  predictions: { themes: string[]; sentiment: string; assets_mentioned: string[]; source_name?: string }[],
): GraphData {
  const themeMap = new Map<string, ThemeAgg>();

  const ensure = (theme: string) => {
    if (!themeMap.has(theme)) {
      themeMap.set(theme, { count: 0, sentimentSum: 0, sentimentCount: 0, assets: new Set(), sources: new Set() });
    }
    return themeMap.get(theme)!;
  };

  // Aggregate from analyses
  for (const a of analyses) {
    const themes = (a.themes || []) as string[];
    for (const t of themes) {
      const agg = ensure(t);
      agg.count++;
      agg.sentimentSum += a.sentiment_score || 0;
      agg.sentimentCount++;
      for (const asset of (a.assets_mentioned || [])) agg.assets.add(asset);
      if (a.source_name) agg.sources.add(a.source_name);
    }
  }

  // Aggregate from predictions
  for (const p of predictions) {
    const themes = (p.themes || []) as string[];
    const score = p.sentiment === 'bullish' ? 0.5 : p.sentiment === 'bearish' ? -0.5 : 0;
    for (const t of themes) {
      const agg = ensure(t);
      agg.count++;
      agg.sentimentSum += score;
      agg.sentimentCount++;
      for (const asset of (p.assets_mentioned || [])) agg.assets.add(asset);
      if (p.source_name) agg.sources.add(p.source_name);
    }
  }

  // Build nodes
  const nodes: GraphNode[] = [];
  for (const [label, agg] of Array.from(themeMap.entries())) {
    const avgSentiment = agg.sentimentCount > 0 ? agg.sentimentSum / agg.sentimentCount : 0;
    let sentimentLabel: string;
    if (avgSentiment > 0.15) sentimentLabel = 'bullish';
    else if (avgSentiment < -0.15) sentimentLabel = 'bearish';
    else sentimentLabel = 'neutral';

    nodes.push({
      id: label,
      label,
      count: agg.count,
      sentiment: Math.round(avgSentiment * 100) / 100,
      sentimentLabel,
      assets: Array.from(agg.assets),
      sources: Array.from(agg.sources),
    });
  }

  // Build edges: co-occurrence of themes within the same analysis/prediction
  const edgeMap = new Map<string, number>();
  const allThemeLists = [
    ...analyses.map(a => (a.themes || []) as string[]),
    ...predictions.map(p => (p.themes || []) as string[]),
  ];

  for (const themes of allThemeLists) {
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        const [a, b] = [themes[i], themes[j]].sort();
        const key = `${a}|||${b}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
  }

  const edges: GraphEdge[] = [];
  for (const [key, weight] of Array.from(edgeMap.entries())) {
    if (weight < 2) continue; // filter weak edges
    const [source, target] = key.split('|||');
    edges.push({ source, target, weight });
  }

  return { nodes, edges };
}

export async function GET() {
  if (!hasSupabase) {
    // Build from mock data
    const sourceMap = new Map(mockSources.map(s => [s.id, s.name]));
    const analyses = mockContentWithAnalysis.map(c => ({
      themes: c.analysis.themes,
      sentiment_score: c.analysis.sentiment_score,
      assets_mentioned: c.analysis.assets_mentioned,
      source_name: sourceMap.get(c.source_id) || '',
    }));
    const predictions = mockPredictions.map(p => ({
      themes: p.themes,
      sentiment: p.sentiment,
      assets_mentioned: p.assets_mentioned,
      source_name: sourceMap.get(p.source_id) || '',
    }));
    return NextResponse.json(buildGraph(analyses, predictions));
  }

  try {
    const supabase = getSupabaseClient();

    // Fetch analyses with source names
    const { data: analysisRows } = await supabase
      .from('analyses')
      .select('themes, sentiment_score, assets_mentioned, content:content_id(source_id, sources:source_id(name))');

    // Fetch predictions with source names
    const { data: predictionRows } = await supabase
      .from('predictions')
      .select('themes, sentiment, assets_mentioned, sources:source_id(name)');

    const analyses = (analysisRows || []).map((a: Record<string, unknown>) => {
      const content = a.content as Record<string, unknown> | null;
      const source = content?.sources as Record<string, unknown> | null;
      return {
        themes: (a.themes || []) as string[],
        sentiment_score: (a.sentiment_score || 0) as number,
        assets_mentioned: (a.assets_mentioned || []) as string[],
        source_name: (source?.name || '') as string,
      };
    });

    const predictions = (predictionRows || []).map((p: Record<string, unknown>) => {
      const source = p.sources as Record<string, unknown> | null;
      return {
        themes: (p.themes || []) as string[],
        sentiment: (p.sentiment || 'neutral') as string,
        assets_mentioned: (p.assets_mentioned || []) as string[],
        source_name: (source?.name || '') as string,
      };
    });

    const graph = buildGraph(analyses, predictions);

    // If Supabase returned empty, fall back to mock
    if (graph.nodes.length === 0) {
      const sourceMap = new Map(mockSources.map(s => [s.id, s.name]));
      const mockAnalyses = mockContentWithAnalysis.map(c => ({
        themes: c.analysis.themes,
        sentiment_score: c.analysis.sentiment_score,
        assets_mentioned: c.analysis.assets_mentioned,
        source_name: sourceMap.get(c.source_id) || '',
      }));
      const mockPreds = mockPredictions.map(p => ({
        themes: p.themes,
        sentiment: p.sentiment,
        assets_mentioned: p.assets_mentioned,
        source_name: sourceMap.get(p.source_id) || '',
      }));
      return NextResponse.json(buildGraph(mockAnalyses, mockPreds));
    }

    return NextResponse.json(graph);
  } catch {
    // Fallback to mock
    const sourceMap = new Map(mockSources.map(s => [s.id, s.name]));
    const analyses = mockContentWithAnalysis.map(c => ({
      themes: c.analysis.themes,
      sentiment_score: c.analysis.sentiment_score,
      assets_mentioned: c.analysis.assets_mentioned,
      source_name: sourceMap.get(c.source_id) || '',
    }));
    const predictions = mockPredictions.map(p => ({
      themes: p.themes,
      sentiment: p.sentiment,
      assets_mentioned: p.assets_mentioned,
      source_name: sourceMap.get(p.source_id) || '',
    }));
    return NextResponse.json(buildGraph(analyses, predictions));
  }
}
