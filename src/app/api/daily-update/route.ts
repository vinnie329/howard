import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseServiceClient();
  const todayKey = new Date().toISOString().slice(0, 10);

  // Try today's cache
  const { data: cached } = await supabase
    .from('daily_update_cache')
    .select('data, generated_at')
    .eq('key', todayKey)
    .single();

  if (cached) {
    // Tight CDN cache (5min) — daily update can be regenerated mid-day and we
    // don't want stale edge responses sticking around for an hour.
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
        'X-Daily-Update-Date': todayKey,
      },
    });
  }

  // Fall back to most recent
  const { data: latest } = await supabase
    .from('daily_update_cache')
    .select('data, key')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    return NextResponse.json(latest.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
        'X-Daily-Update-Date': latest.key,
      },
    });
  }

  return NextResponse.json(null, { status: 404 });
}
