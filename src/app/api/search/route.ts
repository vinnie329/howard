import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { generateEmbedding, toVectorString } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

type SearchType = 'content' | 'analysis' | 'prediction' | 'source';

interface ResultRow {
  id: string;
  type?: string;
  title?: string;
  claim?: string;
  name?: string;
  display_title?: string;
  summary?: string;
  source_id?: string;
  content_id?: string;
  similarity: number;
  source_name?: string;
  source_slug?: string;
  [key: string]: unknown;
}

const RPC_MAP: Record<SearchType, string> = {
  content: 'match_content',
  analysis: 'match_analyses',
  prediction: 'match_predictions',
  source: 'match_sources',
};

/**
 * Text-based fallback search for items that may lack embeddings.
 * Runs ilike queries and returns results in the same shape as search_all.
 */
async function textFallback(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  query: string,
  type: SearchType | null,
  limit: number,
  excludeIds: Set<string>,
): Promise<ResultRow[]> {
  const pattern = `%${query}%`;
  const results: ResultRow[] = [];

  // Content text search
  if (!type || type === 'content') {
    const { data } = await supabase
      .from('content')
      .select('id, title, source_id, platform, url, published_at, raw_text')
      .ilike('title', pattern)
      .limit(limit);
    if (data) {
      for (const c of data) {
        if (!excludeIds.has(c.id)) {
          results.push({
            id: c.id,
            type: 'content',
            title: c.title,
            summary: c.raw_text?.slice(0, 200) || null,
            source_id: c.source_id,
            content_id: undefined,
            similarity: 0.5,
          });
        }
      }
    }
  }

  // Analysis text search
  if (!type || type === 'analysis') {
    const { data } = await supabase
      .from('analyses')
      .select('id, content_id, display_title, summary, sentiment_overall, themes')
      .or(`display_title.ilike.${pattern},summary.ilike.${pattern}`)
      .limit(limit);
    if (data) {
      for (const a of data) {
        if (!excludeIds.has(a.id)) {
          results.push({
            id: a.id,
            type: 'analysis',
            title: a.display_title || 'Analysis',
            summary: a.summary?.slice(0, 200) || null,
            source_id: undefined,
            content_id: a.content_id,
            similarity: 0.5,
          });
        }
      }
    }
  }

  // Prediction text search
  if (!type || type === 'prediction') {
    const { data } = await supabase
      .from('predictions')
      .select('id, content_id, source_id, claim, themes, assets_mentioned, sentiment, time_horizon, confidence')
      .ilike('claim', pattern)
      .limit(limit);
    if (data) {
      for (const p of data) {
        if (!excludeIds.has(p.id)) {
          results.push({
            id: p.id,
            type: 'prediction',
            title: p.claim,
            summary: undefined,
            source_id: p.source_id,
            content_id: p.content_id,
            similarity: 0.5,
          });
        }
      }
    }
  }

  // Source text search
  if (!type || type === 'source') {
    const { data } = await supabase
      .from('sources')
      .select('id, name, slug, bio, domains, weighted_score')
      .or(`name.ilike.${pattern},bio.ilike.${pattern}`)
      .limit(limit);
    if (data) {
      for (const s of data) {
        if (!excludeIds.has(s.id)) {
          results.push({
            id: s.id,
            type: 'source',
            title: s.name,
            summary: s.bio || null,
            source_id: s.id,
            content_id: undefined,
            similarity: 0.5,
            source_name: s.name,
            source_slug: s.slug,
          });
        }
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') as SearchType | null;
  const threshold = parseFloat(searchParams.get('threshold') || '0.2');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  let vectorResults: ResultRow[] = [];

  // Vector search (if Voyage API key is configured)
  if (process.env.VOYAGE_API_KEY) {
    try {
      const embedding = await generateEmbedding(query);

      const rpcName = type ? RPC_MAP[type] : 'search_all';
      if (rpcName) {
        const { data, error } = await supabase.rpc(rpcName, {
          query_embedding: toVectorString(embedding),
          match_threshold: threshold,
          match_count: limit,
        });

        if (!error && data) {
          vectorResults = data as ResultRow[];
        }
      }
    } catch (err) {
      console.error('Vector search error:', err instanceof Error ? err.message : err);
    }
  }

  // Text fallback — finds items that vector search missed (no embeddings)
  const vectorIds = new Set(vectorResults.map((r) => r.id));
  let textResults: ResultRow[] = [];
  try {
    textResults = await textFallback(supabase, query, type, limit, vectorIds);
  } catch (err) {
    console.error('Text search error:', err instanceof Error ? err.message : err);
  }

  // Merge: vector results first (sorted by similarity), then text matches
  const results = [...vectorResults, ...textResults].slice(0, limit);

  // Enrich results with source names
  const sourceIds = Array.from(new Set(
    results
      .map((r) => r.source_id)
      .filter(Boolean) as string[]
  ));

  if (sourceIds.length > 0) {
    const { data: sourcesData } = await supabase
      .from('sources')
      .select('id, name, slug')
      .in('id', sourceIds);

    if (sourcesData) {
      const sourceMap = new Map(sourcesData.map((s) => [s.id, { name: s.name, slug: s.slug }]));
      for (const result of results) {
        if (!result.source_name) {
          const source = sourceMap.get(result.source_id as string);
          if (source) {
            result.source_name = source.name;
            result.source_slug = source.slug;
          }
        }
      }
    }
  }

  return NextResponse.json({ query, results });
}
