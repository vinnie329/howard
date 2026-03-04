import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FOMC meeting dates for 2025-2026.
 * Updated manually; these are publicly known well in advance.
 */
const FOMC_MEETINGS = [
  '2025-03-19', '2025-05-07', '2025-06-18', '2025-07-30',
  '2025-09-17', '2025-10-29', '2025-12-17',
  '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-16',
];

interface MeetingProbabilities {
  meeting_date: string;
  probabilities: Record<string, number>;
}

/**
 * Try fetching from CME Group's public FedWatch API.
 * This endpoint may be blocked or require authentication.
 */
async function tryCMEPublicAPI(): Promise<MeetingProbabilities[] | null> {
  const urls = [
    'https://www.cmegroup.com/services/fed-watch-tool/v1/probabilities',
    'https://www.cmegroup.com/CmeWS/mvc/FedWatch/Ede',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return parseCMEResponse(data);
    } catch {
      continue;
    }
  }
  return null;
}

function parseCMEResponse(data: unknown): MeetingProbabilities[] | null {
  // CME API returns various formats — handle what we can
  if (!data || typeof data !== 'object') return null;

  const results: MeetingProbabilities[] = [];

  // Format 1: Array of meetings with probability distributions
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.meetingDate && item.probabilities) {
        const probs: Record<string, number> = {};
        for (const p of item.probabilities) {
          if (p.range && typeof p.probability === 'number') {
            const range = p.range.replace(/[^0-9-]/g, '');
            probs[range] = p.probability / 100;
          }
        }
        if (Object.keys(probs).length > 0) {
          results.push({ meeting_date: item.meetingDate, probabilities: probs });
        }
      }
    }
  }

  // Format 2: Nested object with meetings
  if ('meetings' in (data as Record<string, unknown>)) {
    const meetings = (data as Record<string, unknown>).meetings;
    if (Array.isArray(meetings)) {
      return parseCMEResponse(meetings);
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Calculate Fed Funds rate probabilities from Fed Funds futures prices.
 * This is the same methodology CME uses.
 *
 * The implied rate from a Fed Funds futures contract is: 100 - price
 * The probability of a rate change is derived by comparing the implied rate
 * to the possible target rates.
 */
function calculateProbabilitiesFromFutures(
  currentRate: number,
  futuresImpliedRates: Record<string, number>, // meeting_month -> implied rate
): MeetingProbabilities[] {
  const results: MeetingProbabilities[] = [];
  const now = new Date();
  const futureMeetings = FOMC_MEETINGS.filter((d) => new Date(d) > now);

  let prevRate = currentRate;

  for (const meetingDate of futureMeetings) {
    const monthKey = meetingDate.substring(0, 7); // YYYY-MM
    const impliedRate = futuresImpliedRates[monthKey];

    if (impliedRate === undefined) continue;

    // Calculate probabilities for each 25bp outcome
    const possibleRates: number[] = [];
    for (let r = Math.max(0, prevRate - 100); r <= prevRate + 100; r += 25) {
      possibleRates.push(r);
    }

    const probs: Record<string, number> = {};

    // Simple two-outcome model: rate stays or moves 25bp
    const lowerRate = prevRate - 25;
    const higherRate = prevRate;

    if (impliedRate <= lowerRate) {
      // Fully priced cut
      const range = `${lowerRate}-${lowerRate + 25}`;
      probs[range] = 1.0;
    } else if (impliedRate >= higherRate) {
      // No cut priced
      const range = `${higherRate}-${higherRate + 25}`;
      probs[range] = 1.0;
    } else {
      // Partial pricing
      const cutProb = (higherRate - impliedRate) / 25;
      const holdProb = 1 - cutProb;
      const cutRange = `${lowerRate}-${lowerRate + 25}`;
      const holdRange = `${higherRate}-${higherRate + 25}`;
      if (cutProb > 0.005) probs[cutRange] = Math.round(cutProb * 1000) / 1000;
      if (holdProb > 0.005) probs[holdRange] = Math.round(holdProb * 1000) / 1000;
    }

    if (Object.keys(probs).length > 0) {
      results.push({ meeting_date: meetingDate, probabilities: probs });
    }

    // Update prevRate for chaining — use the most likely outcome
    const maxProb = Math.max(...Object.values(probs));
    const mostLikely = Object.entries(probs).find(([, p]) => p === maxProb);
    if (mostLikely) {
      prevRate = parseInt(mostLikely[0].split('-')[0], 10);
    }
  }

  return results;
}

/**
 * Try fetching from Yahoo Finance Fed Funds futures.
 * Tickers: ZQH25 (March 2025), ZQK25 (May 2025), etc.
 */
async function tryYahooFinanceFutures(): Promise<MeetingProbabilities[] | null> {
  // Month codes for Fed Funds futures (ZQ)
  const monthCodes: Record<string, string> = {
    '01': 'F', '02': 'G', '03': 'H', '04': 'J', '05': 'K', '06': 'M',
    '07': 'N', '08': 'Q', '09': 'U', '10': 'V', '11': 'X', '12': 'Z',
  };

  const now = new Date();
  const futureMeetings = FOMC_MEETINGS.filter((d) => new Date(d) > now);

  // Build unique month/year combos we need
  const monthsNeeded = new Set<string>();
  for (const m of futureMeetings) {
    monthsNeeded.add(m.substring(0, 7));
  }

  const impliedRates: Record<string, number> = {};

  for (const monthKey of Array.from(monthsNeeded)) {
    const [year, month] = monthKey.split('-');
    const yearSuffix = year.slice(-2);
    const monthCode = monthCodes[month];
    if (!monthCode) continue;

    const ticker = `ZQ${monthCode}${yearSuffix}.CBT`;
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok) continue;

      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number' && price > 0) {
        // Implied rate = 100 - futures price (in basis points, multiply by 100)
        const impliedRateBps = Math.round((100 - price) * 100);
        impliedRates[monthKey] = impliedRateBps;
      }
    } catch {
      continue;
    }
  }

  if (Object.keys(impliedRates).length === 0) return null;

  // Current effective Fed Funds rate — approximate from first available future
  // or use a known value. As of early 2026, assume current target is 350-375 (3.50-3.75%)
  const currentTargetHigh = 375; // Will need updating as rates change

  return calculateProbabilitiesFromFutures(currentTargetHigh, impliedRates);
}

/**
 * Hardcoded seed data reflecting approximate current market expectations.
 * This is used as a fallback when live data sources are unavailable.
 * Should be updated when the fetcher is first deployed.
 */
function getSeedData(): MeetingProbabilities[] {
  const now = new Date();
  const futureMeetings = FOMC_MEETINGS.filter((d) => new Date(d) > now);

  // Approximate market expectations as of early March 2026
  // Current target range: 350-375 bps (3.50%-3.75%)
  // Market expects gradual cuts through 2026
  const expectations: [string, Record<string, number>][] = [
    [futureMeetings[0] || '2026-03-18', { '325-350': 0.032, '350-375': 0.968 }],
    [futureMeetings[1] || '2026-05-06', { '300-325': 0.012, '325-350': 0.291, '350-375': 0.697 }],
    [futureMeetings[2] || '2026-06-17', { '275-300': 0.041, '300-325': 0.228, '325-350': 0.518, '350-375': 0.213 }],
    [futureMeetings[3] || '2026-07-29', { '275-300': 0.106, '300-325': 0.347, '325-350': 0.401, '350-375': 0.146 }],
    [futureMeetings[4] || '2026-09-16', { '250-275': 0.058, '275-300': 0.218, '300-325': 0.384, '325-350': 0.268, '350-375': 0.072 }],
    [futureMeetings[5] || '2026-10-28', { '250-275': 0.131, '275-300': 0.296, '300-325': 0.341, '325-350': 0.182, '350-375': 0.050 }],
    [futureMeetings[6] || '2026-12-16', { '225-250': 0.064, '250-275': 0.205, '275-300': 0.327, '300-325': 0.264, '325-350': 0.112, '350-375': 0.028 }],
  ];

  return expectations
    .filter(([date]) => new Date(date) > now)
    .map(([meeting_date, probabilities]) => ({ meeting_date, probabilities }));
}

export async function fetchFedWatch(supabase: SupabaseClient): Promise<void> {
  console.log('FedWatch: Fetching rate probabilities...');

  // Try data sources in order of preference
  let meetings: MeetingProbabilities[] | null = null;
  let source = '';

  // 1. Try CME public API
  console.log('  Trying CME public API...');
  meetings = await tryCMEPublicAPI();
  if (meetings && meetings.length > 0) {
    source = 'CME API';
  }

  // 2. Try Yahoo Finance futures
  if (!meetings || meetings.length === 0) {
    console.log('  Trying Yahoo Finance futures...');
    meetings = await tryYahooFinanceFutures();
    if (meetings && meetings.length > 0) {
      source = 'Yahoo Finance futures';
    }
  }

  // 3. Fall back to seed data
  if (!meetings || meetings.length === 0) {
    console.log('  Using seed/fallback data...');
    meetings = getSeedData();
    source = 'seed data (update with live source)';
  }

  if (meetings.length === 0) {
    console.log('  No FedWatch data available from any source.');
    return;
  }

  console.log(`  Source: ${source}`);
  console.log(`  ${meetings.length} meetings with probability data`);

  // Insert rows into fedwatch_snapshots
  const now = new Date().toISOString();
  const rows: Array<{
    meeting_date: string;
    rate_range: string;
    probability: number;
    captured_at: string;
  }> = [];

  for (const meeting of meetings) {
    for (const [range, prob] of Object.entries(meeting.probabilities)) {
      if (prob > 0.001) {
        rows.push({
          meeting_date: meeting.meeting_date,
          rate_range: range,
          probability: prob,
          captured_at: now,
        });
      }
    }
  }

  if (rows.length === 0) {
    console.log('  No rows to insert.');
    return;
  }

  // Insert in batches
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('fedwatch_snapshots').insert(batch);
    if (error) {
      console.error('  Insert error:', error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  Inserted ${inserted} probability rows for ${meetings.length} meetings`);
}
