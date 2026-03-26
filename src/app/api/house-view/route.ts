import { NextRequest, NextResponse } from 'next/server';
import {
  getHousePredictions,
  getHouseTrackRecord,
  getHouseCalibration,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get('filter') as
    | 'active'
    | 'evaluated'
    | 'all'
    | null;

  const [predictions, trackRecord, calibration] = await Promise.all([
    getHousePredictions(filter ?? 'active'),
    getHouseTrackRecord(),
    getHouseCalibration(),
  ]);

  return NextResponse.json(
    { predictions, trackRecord, calibration },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    }
  );
}
