import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SpreadRow {
  series: string;
  label: string;
  observation_date: string;
  value: number;
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: snapshots, error } = await supabase
      .from('credit_spread_snapshots')
      .select('series, label, observation_date, value')
      .gte('observation_date', ninetyDaysAgo)
      .order('observation_date', { ascending: true });

    if (error) {
      return NextResponse.json({ series: [], updated_at: null });
    }

    // Group by series
    const bySeries = new Map<string, SpreadRow[]>();
    for (const row of (snapshots || []) as SpreadRow[]) {
      const arr = bySeries.get(row.series) || [];
      arr.push(row);
      bySeries.set(row.series, arr);
    }

    const series = Array.from(bySeries.entries()).map(([seriesId, rows]) => {
      const sorted = rows.sort((a, b) => a.observation_date.localeCompare(b.observation_date));
      const latest = sorted[sorted.length - 1];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const prev = sorted.find(r => r.observation_date >= thirtyDaysAgo) || sorted[0];
      const change30d = latest.value - prev.value;

      return {
        series: seriesId,
        label: latest.label,
        latest_value: latest.value,
        latest_date: latest.observation_date,
        change_30d: change30d,
        history: sorted.map(r => ({ date: r.observation_date, value: r.value })),
        stress: seriesId === 'BAMLH0A0HYM2' && latest.value > 500
          ? latest.value > 800 ? 'high' : 'elevated'
          : seriesId === 'TEDRATE' && latest.value > 0.5
            ? 'elevated'
            : 'normal',
      };
    });

    const updatedAt = snapshots && snapshots.length > 0
      ? (snapshots as SpreadRow[])[snapshots.length - 1].observation_date
      : null;

    return NextResponse.json({ series, updated_at: updatedAt });
  } catch {
    return NextResponse.json({ series: [], updated_at: null });
  }
}
