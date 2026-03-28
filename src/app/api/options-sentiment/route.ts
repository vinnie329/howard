import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Fetch last 30 days of snapshots for sparklines
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: snapshots, error } = await supabase
      .from('options_sentiment_snapshots')
      .select('*')
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true });

    if (error || !snapshots || snapshots.length === 0) {
      return NextResponse.json({ current: null, history: [], updated_at: null });
    }

    const latest = snapshots[snapshots.length - 1];

    return NextResponse.json({
      current: {
        date: latest.date,
        vix: latest.vix,
        vix9d: latest.vix9d,
        vix3m: latest.vix3m,
        vix_term_spread: latest.vix_term_spread,
        skew: latest.skew,
        equity_pc_ratio: latest.equity_pc_ratio,
        index_pc_ratio: latest.index_pc_ratio,
        total_pc_ratio: latest.total_pc_ratio,
      },
      history: snapshots.map((s: typeof latest) => ({
        date: s.date,
        vix: s.vix,
        vix3m: s.vix3m,
        skew: s.skew,
        total_pc_ratio: s.total_pc_ratio,
      })),
      updated_at: latest.captured_at,
    });
  } catch {
    return NextResponse.json({ current: null, history: [], updated_at: null });
  }
}
