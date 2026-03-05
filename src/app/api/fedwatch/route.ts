import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SnapshotRow {
  meeting_date: string;
  rate_range: string;
  probability: number;
  captured_at: string;
}

interface MeetingProbs {
  meeting_date: string;
  probabilities: Record<string, number>;
}

interface MeetingChange {
  meeting_date: string;
  date: string;
  probabilities: Record<string, number>;
}

const LOOKBACK_DAYS: Record<string, number> = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '3m': 90,
};

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const lookback = searchParams.get('lookback') || '1w';
  const days = LOOKBACK_DAYS[lookback] ?? 7;

  // 1. Get the latest captured_at timestamp
  const { data: latestRow } = await supabase
    .from('fedwatch_snapshots')
    .select('captured_at')
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRow) {
    return NextResponse.json({ current: [], changes: [], updated_at: null });
  }

  const latestCaptured = latestRow.captured_at;

  // 2. Get all rows from the latest snapshot (same captured_at timestamp)
  const { data: currentRows } = await supabase
    .from('fedwatch_snapshots')
    .select('meeting_date, rate_range, probability, captured_at')
    .eq('captured_at', latestCaptured)
    .order('meeting_date');

  // 3. Get historical data for change tracking
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: historyRows } = await supabase
    .from('fedwatch_snapshots')
    .select('meeting_date, rate_range, probability, captured_at')
    .gte('captured_at', cutoff)
    .order('captured_at', { ascending: true });

  // 4. Build current probabilities grouped by meeting
  const current: MeetingProbs[] = [];
  const currentMap = new Map<string, Record<string, number>>();

  for (const row of (currentRows as SnapshotRow[]) || []) {
    if (!currentMap.has(row.meeting_date)) {
      currentMap.set(row.meeting_date, {});
    }
    currentMap.get(row.meeting_date)![row.rate_range] = Number(row.probability);
  }

  currentMap.forEach((probabilities, meeting_date) => {
    current.push({ meeting_date, probabilities });
  });

  // Sort by meeting date
  current.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));

  // 5. Build changes: group by (meeting_date, date) — one entry per snapshot per meeting
  const changeMap = new Map<string, MeetingChange>();

  for (const row of (historyRows as SnapshotRow[]) || []) {
    const capturedDate = row.captured_at.substring(0, 10); // YYYY-MM-DD
    const key = `${row.meeting_date}|${capturedDate}`;

    if (!changeMap.has(key)) {
      changeMap.set(key, {
        meeting_date: row.meeting_date,
        date: capturedDate,
        probabilities: {},
      });
    }
    changeMap.get(key)!.probabilities[row.rate_range] = Number(row.probability);
  }

  // Deduplicate: for each meeting_date + date, keep only the latest snapshot
  // (already handled by using date-level granularity — last insert wins via order)
  const changes = Array.from(changeMap.values()).sort((a, b) => {
    const cmp = a.meeting_date.localeCompare(b.meeting_date);
    if (cmp !== 0) return cmp;
    return a.date.localeCompare(b.date);
  });

  return NextResponse.json({
    current,
    changes,
    updated_at: latestCaptured,
  });
}
