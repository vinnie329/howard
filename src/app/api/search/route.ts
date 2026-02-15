import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { generateEmbedding, toVectorString } from '@/lib/embeddings';

type SearchType = 'content' | 'analysis' | 'prediction' | 'source';

const RPC_MAP: Record<SearchType, string> = {
  content: 'match_content',
  analysis: 'match_analyses',
  prediction: 'match_predictions',
  source: 'match_sources',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') as SearchType | null;
  const threshold = parseFloat(searchParams.get('threshold') || '0.2');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (!process.env.VOYAGE_API_KEY) {
    return NextResponse.json({ error: 'Semantic search is not configured' }, { status: 503 });
  }

  try {
    const embedding = await generateEmbedding(query);
    const supabase = getSupabaseServiceClient();

    const rpcName = type ? RPC_MAP[type] : 'search_all';
    if (!rpcName) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${Object.keys(RPC_MAP).join(', ')}` },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc(rpcName, {
      query_embedding: toVectorString(embedding),
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Search RPC error:', error.message);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Enrich results with source names
    const results = data || [];
    const sourceIds = Array.from(new Set(
      results
        .map((r: Record<string, unknown>) => r.source_id)
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
          const r = result as Record<string, unknown>;
          const source = sourceMap.get(r.source_id as string);
          if (source) {
            r.source_name = source.name;
            r.source_slug = source.slug;
          }
        }
      }
    }

    return NextResponse.json({ query, results });
  } catch (err) {
    console.error('Search error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
