import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface PositioningData {
  narrative: string;
  opportunities: Array<{ ticker: string; name: string; rationale: string }>;
  fat_pitches: Array<{ ticker: string; name: string; dev200d: number }>;
  avoids: string[];
  posture: 'aggressive' | 'lean-in' | 'neutral' | 'cautious' | 'defensive';
  generated_at: string;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const todayKey = new Date().toISOString().slice(0, 10);

  // ── Check cache ────────────────────────────────────────────────────
  if (!forceRefresh) {
    try {
      const { data: cached } = await supabase
        .from('positioning_cache')
        .select('data, generated_at')
        .eq('key', todayKey)
        .single();

      if (cached) {
        const age = Date.now() - new Date(cached.generated_at).getTime();
        if (age < MAX_AGE_MS) {
          return NextResponse.json(cached.data, {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
              'X-Positioning-Cached': 'true',
              'X-Positioning-Age': `${Math.round(age / 60000)}m`,
            },
          });
        }
      }
    } catch {
      // Cache miss — fall through
    }
  }

  // ── On-demand generation (refresh=true) ────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Return stale data if available
    try {
      const { data: stale } = await supabase
        .from('positioning_cache')
        .select('data')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();
      if (stale) return NextResponse.json(stale.data);
    } catch { /* no cache at all */ }
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // Gather data for inline generation
  const [outlookResult, signalsResult, analysesResult] = await Promise.all([
    Promise.resolve(supabase.from('outlook').select('*'))
      .then((r) => r.data ?? []).catch(() => [] as never[]),
    Promise.resolve(supabase.from('signals_cache').select('data').eq('key', todayKey).single())
      .then((r) => r.data?.data ?? []).catch(() => [] as never[]),
    Promise.resolve(
      supabase.from('analyses')
        .select('sentiment_overall, sentiment_score, assets_mentioned, themes, summary, content:content_id(title, published_at, source:source_id(name))')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
    ).then((r) => r.data ?? []).catch(() => [] as never[]),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlooksBlock = (outlookResult as any[]).map((o) => {
    return `[${o.time_horizon}] "${o.title}" — Sentiment: ${o.sentiment} (${o.confidence}% confidence)\n` +
      `  Positioning: ${(o.positioning || []).join('; ')}\n` +
      `  Themes: ${(o.key_themes || []).join(', ')}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signalsBlock = (Array.isArray(signalsResult) ? signalsResult : []).map((s: any) => {
    return `[${s.type}] ${s.headline} — ${s.detail}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysesBlock = (analysesResult as any[]).map((a) => {
    const src = a.content?.source?.name ?? 'Unknown';
    return `[${src}] "${a.content?.title ?? ''}" — ${a.sentiment_overall}\n  ${a.summary ?? ''}`;
  }).join('\n\n');

  const prompt = `You are an elite macro strategist. Synthesize this intelligence into a positioning view.

═══ OUTLOOKS ═══
${outlooksBlock}

═══ SIGNALS ═══
${signalsBlock}

═══ RECENT ANALYSES ═══
${analysesBlock}

Return a JSON object:
{
  "narrative": "3-5 paragraphs of positioning prose. Direct, authoritative. Reference specific sources and data. No markdown.",
  "opportunities": [{ "ticker": "SYM", "name": "Name", "rationale": "Why now" }],
  "fat_pitches": [{ "ticker": "SYM", "name": "Name", "dev200d": -20.5 }],
  "avoids": ["what to avoid"],
  "posture": "aggressive" | "lean-in" | "neutral" | "cautious" | "defensive"
}

Return ONLY the JSON object.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(null, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
    }

    const positioning = JSON.parse(jsonMatch[0]);
    positioning.generated_at = new Date().toISOString();

    // Write to cache
    try {
      await supabase.from('positioning_cache').upsert({
        key: todayKey,
        data: positioning,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    } catch {
      // Non-fatal
    }

    return NextResponse.json(positioning, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Positioning-Cached': 'false',
      },
    });
  } catch (err) {
    console.error('Positioning generation failed:', err instanceof Error ? err.message : err);
    // Try returning stale cache
    try {
      const { data: stale } = await supabase
        .from('positioning_cache')
        .select('data')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();
      if (stale) return NextResponse.json(stale.data);
    } catch { /* nothing */ }
    return NextResponse.json(null, { status: 500 });
  }
}
