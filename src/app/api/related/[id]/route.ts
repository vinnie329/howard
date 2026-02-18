import { NextRequest, NextResponse } from 'next/server';
import { getRelatedContent } from '@/lib/data';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '5', 10);
  const threshold = parseFloat(searchParams.get('threshold') || '0.5');

  try {
    const results = await getRelatedContent(id, limit, threshold);

    // Enrich with source names
    const sourceIds = Array.from(new Set(results.map((r) => r.source_id).filter(Boolean) as string[]));
    if (sourceIds.length > 0) {
      const supabase = getSupabaseServiceClient();
      const { data: sourcesData } = await supabase
        .from('sources')
        .select('id, name, slug')
        .in('id', sourceIds);

      if (sourcesData) {
        const sourceMap = new Map(sourcesData.map((s) => [s.id, { name: s.name, slug: s.slug }]));
        for (const result of results) {
          const source = sourceMap.get(result.source_id || '');
          if (source) {
            (result as unknown as Record<string, unknown>).source_name = source.name;
            (result as unknown as Record<string, unknown>).source_slug = source.slug;
          }
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Related content error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ results: [] });
  }
}
