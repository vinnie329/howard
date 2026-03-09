import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseServiceClient();

  // Get the most recent daily update cache entry
  const { data: latest } = await supabase
    .from('daily_update_cache')
    .select('key, generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (!latest) {
    return NextResponse.json({
      healthy: false,
      message: 'No pipeline data found. Pipeline may have never run.',
      lastRun: null,
    });
  }

  const generatedAt = new Date(latest.generated_at);
  const ageMs = Date.now() - generatedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  // Pipeline runs at 5am and 5pm UTC — if >18h stale, something is wrong
  const healthy = ageHours < 18;

  return NextResponse.json({
    healthy,
    message: healthy
      ? null
      : `Pipeline has not completed successfully since ${latest.key}. Check Anthropic API credit balance.`,
    lastRun: latest.generated_at,
    lastDate: latest.key,
    ageHours: Math.round(ageHours * 10) / 10,
  });
}
