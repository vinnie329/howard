import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Fetch latest 4 weeks of COT data
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots, error } = await supabase
      .from('cot_snapshots')
      .select('*')
      .gte('captured_at', fourWeeksAgo)
      .order('report_date', { ascending: false });

    if (error) {
      return NextResponse.json({ records: [], updated_at: null }, { status: 200 });
    }

    // Group by ticker, compute latest + previous for trend
    const byTicker = new Map<string, typeof snapshots>();
    for (const row of snapshots || []) {
      const arr = byTicker.get(row.ticker) || [];
      arr.push(row);
      byTicker.set(row.ticker, arr);
    }

    const records = Array.from(byTicker.entries()).map(([ticker, rows]) => {
      const sorted = rows.sort((a: { report_date: string }, b: { report_date: string }) =>
        b.report_date.localeCompare(a.report_date)
      );
      const latest = sorted[0];
      const previous = sorted.length > 1 ? sorted[1] : null;
      const netChange = previous
        ? latest.noncommercial_net - previous.noncommercial_net
        : null;

      return {
        ticker,
        commodity: latest.commodity,
        report_date: latest.report_date,
        commercial_net: latest.commercial_net,
        noncommercial_net: latest.noncommercial_net,
        spec_net_pct: latest.spec_net_pct,
        net_change_wow: netChange,
        crowded: Math.abs(latest.spec_net_pct) > 20,
      };
    }).sort((a, b) => Math.abs(b.spec_net_pct) - Math.abs(a.spec_net_pct));

    const updatedAt = snapshots && snapshots.length > 0 ? snapshots[0].captured_at : null;

    return NextResponse.json({ records, updated_at: updatedAt });
  } catch {
    return NextResponse.json({ records: [], updated_at: null });
  }
}
