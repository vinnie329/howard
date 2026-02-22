import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface Signal {
  type: string;
  severity: 'high' | 'medium' | 'low';
  headline: string;
  detail: string;
  assets: string[];
  color: string;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const supabase = getSupabaseServiceClient();
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const todayKey = new Date().toISOString().slice(0, 10); // e.g. "2026-02-16"

  // ── Check cache first ────────────────────────────────────────────────
  if (!forceRefresh) {
    try {
      const { data: cached } = await supabase
        .from('signals_cache')
        .select('data, generated_at')
        .eq('key', todayKey)
        .single();

      if (cached) {
        const age = Date.now() - new Date(cached.generated_at).getTime();
        if (age < MAX_AGE_MS) {
          return NextResponse.json(cached.data, {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
              'X-Signals-Cached': 'true',
              'X-Signals-Age': `${Math.round(age / 60000)}m`,
            },
          });
        }
      }
    } catch {
      // Cache miss — proceed to generate
    }
  }

  // ── Gather all data ──────────────────────────────────────────────────
  const headersList = headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const [analysesResult, predictionsResult, technicalsResult] = await Promise.all([
    Promise.resolve(
      supabase.from('analyses')
        .select('sentiment_overall, sentiment_score, assets_mentioned, themes, summary, content:content_id(title, published_at, source:source_id(name))')
        .order('created_at', { ascending: false })

    ).then(r => r.data ?? []).catch(() => []),

    Promise.resolve(
      supabase.from('predictions')
        .select('claim, assets_mentioned, themes, sentiment, time_horizon, confidence, specificity, source:source_id(name)')
        .order('created_at', { ascending: false })
    ).then(r => r.data ?? []).catch(() => []),

    fetch(`${origin}/api/technicals`, { next: { revalidate: 3600 } })
      .then(r => r.json())
      .catch(() => []),
  ]);

  // ── Format data for Claude ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const technicalsBlock = (technicalsResult as any[]).map((t: any) =>
    `${t.name} (${t.symbol}): $${Number(t.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` +
    (t.devFromMa200d != null ? ` | 200d MA: ${t.devFromMa200d > 0 ? '+' : ''}${Number(t.devFromMa200d).toFixed(1)}%` : '') +
    (t.devFromMa200w != null ? ` | 200w MA: ${t.devFromMa200w > 0 ? '+' : ''}${Number(t.devFromMa200w).toFixed(1)}%` : '')
  ).join('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysesBlock = (analysesResult as any[]).map(a => {
    const src = a.content?.source?.name ?? 'Unknown';
    const title = a.content?.title ?? '';
    return `[${src}] "${title}" — Sentiment: ${a.sentiment_overall} (${a.sentiment_score})\n` +
      `  Themes: ${(a.themes ?? []).join(', ')}\n` +
      `  Assets: ${(a.assets_mentioned ?? []).join(', ') || 'none'}\n` +
      `  Summary: ${a.summary ?? ''}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const predictionsBlock = (predictionsResult as any[]).map(p => {
    const src = p.source?.name ?? 'Unknown';
    return `[${src}] ${p.claim}\n` +
      `  Sentiment: ${p.sentiment} | Horizon: ${p.time_horizon ?? '?'} | Confidence: ${p.confidence ?? '?'}\n` +
      `  Themes: ${(p.themes ?? []).join(', ')} | Assets: ${(p.assets_mentioned ?? []).join(', ') || 'none'}`;
  }).join('\n\n');

  const prompt = `You are an elite financial analyst reviewing a private intelligence database. Below is ALL the data — source analyses (from trusted investors/analysts), their predictions, and current technical positions of tracked assets.

Your job: find the most interesting, non-obvious patterns, connections, contradictions, and insights across ALL of this data. Think like a macro strategist looking for alpha.

Things to look for:
- Sources who disagree with each other on the same thesis (and who might be right given the data)
- Themes getting consensus attention — is the crowd right or is this a crowded trade?
- Assets where the technical position tells a different story than the narrative
- Connections between seemingly unrelated analyses (e.g. two sources talking about different things that actually imply the same macro bet)
- Things that look overstretched, dangerous, or under-appreciated
- Predictions that are aging well or poorly given current prices
- Regime signals — what does the overall pattern of asset positions suggest about the macro environment?

Be honest and direct. If something looks dangerous say so. If a "bullish" 200w reading actually means extreme overextension, call it out. Think critically — a +137% move from 200w MA is NOT bullish, it's terrifying.

═══ SOURCE ANALYSES (${analysesResult.length} total) ═══
${analysesBlock}

═══ PREDICTIONS (${predictionsResult.length} total) ═══
${predictionsBlock}

═══ CURRENT TECHNICAL POSITIONS ═══
${technicalsBlock}

Return a JSON array of 6-10 signal objects. Each signal should be a genuine insight that connects multiple data points. Format:
[
  {
    "type": "SHORT_LABEL",
    "severity": "high" | "medium" | "low",
    "headline": "One compelling sentence about the pattern you found.",
    "detail": "2-3 sentences of analysis explaining WHY this matters and what it implies. Reference specific sources, numbers, and data points. Be specific, not generic.",
    "assets": ["TICKER1", "TICKER2"],
    "color": "#hex"
  }
]

Type should be a short 1-3 word label like: CROWDED TRADE, HIDDEN RISK, NARRATIVE GAP, SMART MONEY SPLIT, REGIME SHIFT, OVERSTRETCH, CONTRARIAN SIGNAL, THESIS AGING, UNDER THE RADAR, MACRO DISCONNECT, etc.

Color: use #22c55e for opportunity/confirmation, #ef4444 for danger/risk, #eab308 for caution/watch, #a855f7 for unusual/contrarian, #60a5fa for informational.

Return ONLY the JSON array, no other text.`;

  // ── Call Claude ───────────────────────────────────────────────────────
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'public, s-maxage=300' },
      });
    }

    const signals: Signal[] = JSON.parse(jsonMatch[0]);

    // ── Write to cache ─────────────────────────────────────────────────
    try {
      await supabase.from('signals_cache').upsert({
        key: todayKey,
        data: signals,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    } catch {
      // Non-fatal — signals still returned even if cache write fails
    }

    return NextResponse.json(signals, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Signals-Cached': 'false',
      },
    });
  } catch (err) {
    console.error('Signal analysis failed:', err instanceof Error ? err.message : err);
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }
}
