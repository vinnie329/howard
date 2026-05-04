/**
 * generate-daily-update.ts — Generate a daily intelligence digest.
 * Gathers all changes from the last 24 hours across all tables,
 * sends to Claude for narrative synthesis, and caches to Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function main() {
  console.log('=== Howard Daily Update Generator ===\n');
  const todayKey = new Date().toISOString().slice(0, 10);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  console.log(`Date: ${todayKey}`);
  console.log(`Window: since ${twentyFourHoursAgo}\n`);

  // 1. New content + analyses
  console.log('Fetching recent content & analyses...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentAnalyses } = await supabase
    .from('analyses')
    .select('sentiment_overall, sentiment_score, themes, assets_mentioned, summary, display_title, content:content_id(title, published_at, platform, source:source_id(name))')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });
  console.log(`  ${recentAnalyses?.length ?? 0} new analyses`);

  // 2. Signals
  console.log('Fetching signals...');
  const { data: signalsRow } = await supabase
    .from('signals_cache')
    .select('data')
    .eq('key', todayKey)
    .single();
  const signals = signalsRow?.data ?? [];
  console.log(`  ${Array.isArray(signals) ? signals.length : 0} signals`);

  // 3. Outlook changes
  console.log('Fetching outlook changes...');
  const { data: outlookChanges } = await supabase
    .from('outlook_history')
    .select('*')
    .gte('created_at', twentyFourHoursAgo);
  console.log(`  ${outlookChanges?.length ?? 0} outlook changes`);

  // 4. Prediction market moves (big movers)
  console.log('Fetching prediction market data...');
  const { data: marketSnapshots } = await supabase
    .from('prediction_market_snapshots')
    .select('yes_price, volume_24h, captured_at, market:market_id(id, title, source, category)')
    .gte('captured_at', twentyFourHoursAgo)
    .order('captured_at', { ascending: false });
  console.log(`  ${marketSnapshots?.length ?? 0} market snapshots`);

  // 5. FedWatch rate probability changes
  console.log('Fetching FedWatch data...');
  const { data: latestFW } = await supabase
    .from('fedwatch_snapshots')
    .select('captured_at')
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  let fedwatchBlock = '';
  if (latestFW) {
    const { data: fwCurrent } = await supabase
      .from('fedwatch_snapshots')
      .select('meeting_date, rate_range, probability')
      .eq('captured_at', latestFW.captured_at)
      .order('meeting_date');

    // Get previous snapshot for comparison
    const { data: fwPrev } = await supabase
      .from('fedwatch_snapshots')
      .select('captured_at')
      .lt('captured_at', latestFW.captured_at)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevMap = new Map<string, Map<string, number>>();
    if (fwPrev) {
      const { data: fwPrevRows } = await supabase
        .from('fedwatch_snapshots')
        .select('meeting_date, rate_range, probability')
        .eq('captured_at', fwPrev.captured_at);
      for (const row of fwPrevRows ?? []) {
        if (!prevMap.has(row.meeting_date)) prevMap.set(row.meeting_date, new Map());
        prevMap.get(row.meeting_date)!.set(row.rate_range, Number(row.probability));
      }
    }

    // Build FedWatch summary
    const byMeeting = new Map<string, Map<string, number>>();
    for (const row of fwCurrent ?? []) {
      if (!byMeeting.has(row.meeting_date)) byMeeting.set(row.meeting_date, new Map());
      byMeeting.get(row.meeting_date)!.set(row.rate_range, Number(row.probability));
    }

    const fwLines: string[] = [];
    for (const [meetingDate, probs] of byMeeting) {
      let maxProb = 0;
      let maxRange = '';
      for (const [range, prob] of probs) {
        if (prob > maxProb) { maxProb = prob; maxRange = range; }
      }
      const [lo, hi] = maxRange.split('-').map(Number);
      const rangeStr = `${(lo / 100).toFixed(2)}-${(hi / 100).toFixed(2)}%`;

      // Check for changes
      const prevMeeting = prevMap.get(meetingDate);
      let changeNote = '';
      if (prevMeeting) {
        const prevProb = prevMeeting.get(maxRange) ?? 0;
        const diff = maxProb - prevProb;
        if (Math.abs(diff) > 0.01) {
          changeNote = ` (${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}pp vs prior)`;
        }
      }

      fwLines.push(`${meetingDate}: Most likely ${rangeStr} at ${(maxProb * 100).toFixed(1)}%${changeNote}`);
    }
    fedwatchBlock = fwLines.join('\n');
    console.log(`  ${byMeeting.size} meetings tracked`);
  } else {
    console.log('  No FedWatch data');
  }

  // 7. Positioning
  console.log('Fetching positioning...');
  const { data: posCache } = await supabase
    .from('positioning_cache')
    .select('data')
    .eq('key', todayKey)
    .single();
  console.log(`  ${posCache ? 'found' : 'none'}`);

  // 8. Holdings changes (recent)
  console.log('Fetching holdings...');
  const { data: recentHoldings } = await supabase
    .from('holdings')
    .select('ticker, company_name, value, shares, share_change, change_type, fund:fund_id(name)')
    .gte('created_at', twentyFourHoursAgo)
    .order('value', { ascending: false })
    .limit(20);
  console.log(`  ${recentHoldings?.length ?? 0} holdings changes`);

  // 9. Insider/SA filings detected in last 24h (top-of-briefing alert)
  console.log('Fetching insider filings...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insiderFilings } = await supabase
    .from('insider_filings')
    .select('form_type, filing_date, event_date, period_of_report, issuer_name, issuer_ticker, issuer_cusip, shares_owned, pct_of_class, cost_basis, prior_pct, primary_doc_url, fund:fund_id(name, manager_name)')
    .gte('ingested_at', twentyFourHoursAgo)
    .order('filing_date', { ascending: false });
  console.log(`  ${insiderFilings?.length ?? 0} insider filings detected`);

  // 10. Buildout watchlist names that are in or near their buy zone (alertable).
  // Compute live prices and surface any name where current_price <= buy_zone_max
  // OR within 5% of buy_zone_max. These are buy-zone-hit alerts for the daily briefing.
  console.log('Fetching buildout watchlist buy-zone hits...');
  const { data: buildoutRows } = await supabase
    .from('buildout_watchlist')
    .select('ticker, asset_name, category, agi_dependency, buy_zone_max, trim_zone_min, thesis, status')
    .eq('status', 'watching')
    .not('buy_zone_max', 'is', null);
  // Use the same chart endpoint used elsewhere — quick last-close price per ticker
  async function fetchLast(ticker: string): Promise<number | null> {
    try {
      const end = Math.floor(Date.now() / 1000);
      const startTs = end - 5 * 24 * 60 * 60;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${startTs}&period2=${end}&interval=1d`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Howard/1.0' } });
      if (!res.ok) return null;
      const json = await res.json();
      const closes = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter((c: number | null) => c !== null);
      return closes[closes.length - 1] ?? null;
    } catch { return null; }
  }
  const buildoutAlerts: Array<{ ticker: string; asset_name: string; category: string; agi_dependency: string; current_price: number; buy_zone_max: number; pct_to_buy: number; in_zone: boolean; thesis: string }> = [];
  for (const r of buildoutRows || []) {
    const price = await fetchLast(r.ticker);
    if (price === null || r.buy_zone_max === null) continue;
    const pct = ((price - r.buy_zone_max) / r.buy_zone_max) * 100;
    // Alert if in zone (≤ buy zone) OR within 5% above
    if (pct <= 5) {
      buildoutAlerts.push({
        ticker: r.ticker,
        asset_name: r.asset_name,
        category: r.category,
        agi_dependency: r.agi_dependency,
        current_price: price,
        buy_zone_max: r.buy_zone_max,
        pct_to_buy: pct,
        in_zone: pct <= 0,
        thesis: r.thesis,
      });
    }
  }
  console.log(`  ${buildoutAlerts.length} buildout name(s) at or near buy zone`);

  // 11. Intelligence signals — convergence + tension across high-credibility sources.
  // Surface signals UPDATED today (or convergences with ≥4 sources regardless of recency).
  console.log('Fetching intelligence signals...');
  const { data: signalRows } = await supabase
    .from('intelligence_signals')
    .select('signal_type, signal_kind, signal_key, direction, source_count, avg_credibility, source_names, bullish_count, bearish_count, bullish_sources, bearish_sources, sample_claims, last_signal_at, updated_at')
    .eq('status', 'active')
    .order('source_count', { ascending: false });
  const today = new Date().toISOString().slice(0, 10);
  const intelligenceSignals = (signalRows || []).filter((s) => {
    // Always include very strong convergences (≥4 sources)
    if (s.signal_type === 'convergence' && s.source_count >= 4) return true;
    // Always include tensions with ≥3 total sources
    if (s.signal_type === 'tension' && s.source_count >= 3) return true;
    // Otherwise only include if updated today (fresh signal)
    return (s.updated_at || '').slice(0, 10) === today || (s.last_signal_at || '').slice(0, 10) === today;
  }).slice(0, 20);
  console.log(`  ${intelligenceSignals.length} intelligence signal(s) to surface`);

  // 12. Derived implications — 2nd / 3rd order chains from today's high-cred predictions
  console.log('Fetching derived implications...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: implRows } = await supabase
    .from('derived_implications')
    .select('order_n, affected_asset, affected_theme, direction, conviction, reasoning, derivation_steps, parent_source_name, parent_source_credibility, parent_claim, created_at')
    .gte('created_at', twentyFourHoursAgo)
    .order('parent_source_credibility', { ascending: false })
    .order('order_n')
    .limit(40);
  const derivedImplications = implRows || [];
  console.log(`  ${derivedImplications.length} derived implication(s)`);

  // 13. Tension resolutions — adjudications of cross-source disagreements
  console.log('Fetching tension resolutions...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: resolRows } = await supabase
    .from('tension_resolutions')
    .select('signal_id, resolution_type, winning_side, confidence, point_of_disagreement, net_recommendation, source_weighting_factor, bull_count, bear_count, bull_sources, bear_sources, resolved_at, intelligence_signals(signal_kind, signal_key)')
    .gte('resolved_at', twentyFourHoursAgo)
    .order('confidence', { ascending: false })
    .limit(15);
  const tensionResolutions = resolRows || [];
  console.log(`  ${tensionResolutions.length} tension resolution(s)\n`);

  // ── Check if there's anything to report ──────────────────────────────
  const totalData =
    (recentAnalyses?.length ?? 0) +
    (Array.isArray(signals) ? signals.length : 0) +
    (outlookChanges?.length ?? 0) +
    (marketSnapshots?.length ?? 0) +
    (recentHoldings?.length ?? 0) +
    (insiderFilings?.length ?? 0) +
    buildoutAlerts.length +
    intelligenceSignals.length +
    derivedImplications.length +
    tensionResolutions.length;

  if (totalData === 0) {
    console.log('No new data in the last 24 hours. Skipping generation.');
    return;
  }

  // ── Format data blocks ───────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlock = (recentAnalyses ?? []).map((a: any) => {
    const src = a.content?.source?.name ?? 'Unknown';
    const title = a.display_title || (a.content?.title ?? '');
    return `[${src}] "${title}" — ${a.sentiment_overall} (${a.sentiment_score})\n  Themes: ${(a.themes ?? []).join(', ')}\n  Summary: ${a.summary ?? ''}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signalsBlock = (Array.isArray(signals) ? signals : []).map((s: any) => {
    return `[${s.type}] ${s.headline} (${s.severity})\n  ${s.detail}`;
  }).join('\n\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlookBlock = (outlookChanges ?? []).map((o: any) => {
    return `[${o.time_horizon}] ${o.previous_sentiment} → ${o.new_sentiment} (confidence: ${o.previous_confidence} → ${o.new_confidence})\n  ${o.evaluation_reasoning ?? ''}\n  Changes: ${(o.changes_summary ?? []).join('; ')}`;
  }).join('\n\n');

  // Group market snapshots by market and compute moves
  const marketMoves: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marketMap = new Map<string, any[]>();
  for (const s of marketSnapshots ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const market = s.market as any;
    if (!market) continue;
    const arr = marketMap.get(market.id) || [];
    arr.push(s);
    marketMap.set(market.id, arr);
  }
  for (const [, snaps] of marketMap) {
    if (snaps.length < 2) continue;
    const latest = snaps[0];
    const oldest = snaps[snaps.length - 1];
    const change = Number(latest.yes_price) - Number(oldest.yes_price);
    if (Math.abs(change) > 0.03) { // >3pp move
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const market = latest.market as any;
      marketMoves.push(`"${market.title}" (${market.source}): ${Math.round(Number(oldest.yes_price) * 100)}% → ${Math.round(Number(latest.yes_price) * 100)}% (${change > 0 ? '+' : ''}${Math.round(change * 100)}pp)`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const holdingsBlock = (recentHoldings ?? []).map((h: any) => {
    const fund = h.fund?.name ?? 'Unknown Fund';
    return `[${fund}] ${h.change_type}: ${h.company_name} (${h.ticker ?? 'N/A'}) — ${h.shares?.toLocaleString() ?? 0} shares, $${(h.value / 1000).toFixed(0)}k, change: ${h.share_change?.toLocaleString() ?? 0}`;
  }).join('\n');

  // Insider/SA filing alerts — top-of-briefing flag for any new SEC filing
  // by tracked funds (13F-HR / 13D / 13G / amendments). Surfaces the *fact*
  // of the filing plus parsed ownership data for 13D-style filings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insiderBlock = (insiderFilings ?? []).map((f: any) => {
    const fund = f.fund?.name ?? 'Unknown Fund';
    const mgr = f.fund?.manager_name ? ` (${f.fund.manager_name})` : '';
    const lines: string[] = [`[${fund}${mgr}] ${f.form_type} filed ${f.filing_date}`];
    if (f.period_of_report) lines.push(`  Period: ${f.period_of_report}`);
    if (f.event_date) lines.push(`  Event date: ${f.event_date}`);
    if (f.issuer_name) lines.push(`  Issuer: ${f.issuer_name}${f.issuer_ticker ? ` (${f.issuer_ticker})` : ''}`);
    if (f.shares_owned && f.pct_of_class) {
      lines.push(`  Position: ${Number(f.shares_owned).toLocaleString()} sh = ${f.pct_of_class}% of class`);
    }
    if (f.cost_basis) lines.push(`  Cost basis: $${(Number(f.cost_basis) / 1e6).toFixed(1)}M`);
    if (f.prior_pct) lines.push(`  Prior %: ${f.prior_pct}% (this is an amendment)`);
    return lines.join('\n');
  }).join('\n\n');

  const positioningBlock = posCache?.data
    ? `Posture: ${posCache.data.posture}\nNarrative: ${(posCache.data.narrative ?? '').slice(0, 500)}`
    : 'No positioning data today.';

  // ── Prompt Claude ────────────────────────────────────────────────────

  const prompt = `You are Howard, an elite financial intelligence system. Generate a daily briefing for ${todayKey} summarizing everything that changed in the last 24 hours.

${insiderBlock ? `═══ ⚑ TRACKED-FUND SEC FILINGS (${insiderFilings?.length ?? 0}) — TOP PRIORITY ═══
${insiderBlock}

These are SEC filings by funds we follow that surfaced today. They are HIGHEST priority — surface them at the very top of the briefing in a dedicated section. 13D / 13D/A filings are particularly significant (5%+ ownership disclosure with cost basis). New 13F-HRs reveal a quarter's worth of positioning. Mention specific issuer, ownership %, cost basis, and what the move implies vs the prior filing.

` : ''}${tensionResolutions.length > 0 ? `═══ ⚑ TENSION RESOLUTIONS — ADJUDICATED DISAGREEMENTS (${tensionResolutions.length}) ═══
${tensionResolutions.map((r) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig = r.intelligence_signals as any;
  const key = sig?.signal_key || '?';
  const kind = sig?.signal_kind || '?';
  return `[${kind}: ${key}] ${r.resolution_type} (conf ${r.confidence})${r.winning_side ? ` — ${r.winning_side.toUpperCase()} side wins` : ''}\n  Point of disagreement: ${r.point_of_disagreement}\n  Bull (${r.bull_count}): ${(r.bull_sources || []).slice(0, 4).join(', ')}\n  Bear (${r.bear_count}): ${(r.bear_sources || []).slice(0, 4).join(', ')}\n  Recommendation: ${r.net_recommendation}\n  Weighting: ${r.source_weighting_factor}`;
}).join('\n\n')}

These are ADJUDICATED tensions — Claude has weighted source credibility, recency, and time horizons to identify which side has the weight (or whether both are right at different windows). Surface high-confidence resolutions prominently — they translate cross-source disagreement into actionable trade direction. For "both_right_different_horizons" outcomes, frame as the sequenced trade (e.g., "near-term bear, long-term bull").

` : ''}${derivedImplications.length > 0 ? `═══ ⚑ DERIVED IMPLICATIONS — 2ND/3RD ORDER CHAINS (${derivedImplications.length}) ═══
${derivedImplications.slice(0, 25).map((d) => {
  const target = d.affected_asset || d.affected_theme || '?';
  return `[O${d.order_n} · ${d.direction.toUpperCase()} · ${d.conviction}] ${target} ← from ${d.parent_source_name} (${d.parent_source_credibility})\n  Parent: "${(d.parent_claim || '').slice(0, 120)}"\n  Why: ${d.reasoning}`;
}).join('\n\n')}

These are 2nd / 3rd order implications automatically derived from today's high-credibility predictions, grounded in our tracked asset universe. Surface in a dedicated section that highlights cross-asset spillovers — particularly when many implications hit the same asset (cluster signal) or when implications contradict direct predictions (tension worth flagging).

` : ''}${intelligenceSignals.length > 0 ? `═══ ⚑ INTELLIGENCE SIGNALS — CONVERGENCE + TENSION (${intelligenceSignals.length}) ═══
${intelligenceSignals.map((s) => {
  if (s.signal_type === 'convergence') {
    return `[CONVERGENCE · ${s.signal_kind}] ${s.signal_key} ${s.direction?.toUpperCase()} — ${s.source_count} sources @ avg cred ${s.avg_credibility}\n  Sources: ${(s.source_names || []).join(', ')}\n  Sample claim: ${(s.sample_claims || [''])[0]?.slice(0, 180)}`;
  } else {
    return `[TENSION · ${s.signal_kind}] ${s.signal_key} — BULL ${s.bullish_count} (${(s.bullish_sources || []).slice(0, 5).join(', ')}) vs BEAR ${s.bearish_count} (${(s.bearish_sources || []).slice(0, 5).join(', ')})`;
  }
}).join('\n\n')}

These are CROSS-SOURCE patterns — convergences (≥3 high-credibility sources stacking the same direction) and tensions (high-credibility sources disagreeing). They are HIGH PRIORITY — surface at the very top of the briefing alongside tracked-fund SEC filings. For convergences, name the sources and explain the implication. For tensions, frame as "credible disagreement worth resolving" — both sides have weight.

` : ''}${buildoutAlerts.length > 0 ? `═══ ⚑ BUILDOUT WATCHLIST — BUY-ZONE HITS (${buildoutAlerts.length}) ═══
${buildoutAlerts.map((b) => `[${b.category} · ${b.agi_dependency}] ${b.ticker} ${b.asset_name} — $${b.current_price.toFixed(2)} ${b.in_zone ? 'IN BUY ZONE' : `${b.pct_to_buy.toFixed(1)}% above buy zone`} (buy ≤ $${b.buy_zone_max})\n  Thesis: ${b.thesis.slice(0, 200)}`).join('\n\n')}

These are AGI/robotics buildout names that have hit or are within 5% of their buy zone. Surface as a dedicated alert section just below tracked-fund filings. Highlight 'core' agi_dependency names first (the ramp dependency makes them highest-conviction buy-zone candidates).

` : ''}═══ NEW CONTENT & ANALYSES (${recentAnalyses?.length ?? 0}) ═══
${contentBlock || 'No new content.'}

═══ SIGNALS (${Array.isArray(signals) ? signals.length : 0}) ═══
${signalsBlock || 'No signals today.'}

═══ OUTLOOK CHANGES (${outlookChanges?.length ?? 0}) ═══
${outlookBlock || 'No outlook changes.'}

═══ PREDICTION MARKET MOVES (${marketMoves.length}) ═══
${marketMoves.join('\n') || 'No significant market moves (>3pp).'}

═══ FEDWATCH RATE PROBABILITIES ═══
${fedwatchBlock || 'No FedWatch data available.'}

═══ POSITIONING ═══
${positioningBlock}

═══ 13F HOLDINGS CHANGES (${recentHoldings?.length ?? 0}) ═══
${holdingsBlock || 'No new holdings data.'}

Generate a JSON daily briefing with this structure:
{
  "date": "${todayKey}",
  "summary": "2-3 paragraphs providing a narrative overview of the day's intelligence. Write in a direct, authoritative style. Reference specific sources and data points. Do NOT use markdown formatting.",
  "sections": {
    "insider_filings": [{ "fund": "Name", "manager": "Name", "form_type": "13D|13F-HR|13D/A|...", "filing_date": "YYYY-MM-DD", "issuer": "Company (TICKER)", "ownership": "X.X% of class (Y shares)", "cost_basis_usd": 0, "headline": "one-liner — what this filing tells us", "significance": "why it matters" }],
    "buildout_alerts": [{ "ticker": "SYM", "name": "Asset Name", "category": "compute_silicon|power_generation|...", "agi_dependency": "core|optional|hedge", "current_price": 0, "buy_zone_max": 0, "in_zone": true, "headline": "one-liner — buy-zone status + thesis hook", "significance": "why this name matters now" }],
    "intelligence_signals": [{ "signal_type": "convergence|tension", "signal_kind": "asset|theme", "signal_key": "TICKER or theme name", "direction": "bullish|bearish|null", "source_count": 0, "avg_credibility": 0, "headline": "one-liner — what this convergence/tension says", "implication": "concrete trade or watch implication" }],
    "derived_implications": [{ "order_n": 2, "affected_asset": "TICKER", "affected_theme": null, "direction": "bullish|bearish|mixed", "conviction": "high|medium|low", "parent_source": "Source Name", "headline": "one-liner — implication summary", "reasoning": "why this follows from the parent prediction" }],
    "tension_resolutions": [{ "signal_kind": "asset|theme", "signal_key": "TICKER or theme", "resolution_type": "side_a_wins|side_b_wins|both_right_different_horizons|unresolvable_pending_evidence|genuine_uncertainty", "winning_side": "bullish|bearish|null", "confidence": 0, "point_of_disagreement": "what's actually being disagreed about", "net_recommendation": "one-line trade implication", "headline": "one-liner — adjudication summary" }],
    "new_content": {
      "count": <number>,
      "highlights": [{ "source": "Name", "title": "Title", "sentiment": "bearish|bullish|neutral|mixed", "summary": "1 sentence" }]
    },
    "technical_moves": [{ "ticker": "SYM", "name": "Name", "change": "description", "significance": "why it matters" }],
    "market_moves": [{ "title": "Market question", "source": "kalshi|polymarket", "previous_price": 0.34, "current_price": 0.61, "change": 27 }],
    "signal_changes": [{ "type": "SIGNAL_TYPE", "headline": "one liner", "detail": "2-3 sentences", "severity": "high|medium|low" }],
    "outlook_changes": [{ "time_horizon": "short|medium|long", "previous_sentiment": "x", "new_sentiment": "y", "reasoning": "why" }],
    "fedwatch_changes": { "summary": "1-2 sentences on rate expectations shift", "meetings": [{ "date": "YYYY-MM-DD", "most_likely_range": "3.50-3.75%", "probability": 0.85, "change_vs_prior": "+2.5pp" }] },
    "holdings_changes": [{ "fund": "Name", "action": "new|increased|decreased|exited", "ticker": "SYM", "detail": "context" }]
  }
}

Guidelines:
- Only include sections that have meaningful data — omit empty arrays
- The summary should be the most important part — synthesize across all data sources
- For content highlights, pick the top 3-5 most significant items
- For market moves, only include >3pp probability changes
- Be specific with numbers, names, and data points
- Write like a CIO morning briefing, not a template

Return ONLY the JSON object.`;

  console.log('Generating daily update with Claude...');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to parse daily update from Claude response');
    console.error('Raw response:', text.slice(0, 500));
    process.exit(1);
  }

  const dailyUpdate = JSON.parse(jsonMatch[0]);
  dailyUpdate.generated_at = new Date().toISOString();

  console.log(`  Summary length: ${dailyUpdate.summary?.length ?? 0} chars`);
  console.log(`  Content highlights: ${dailyUpdate.sections?.new_content?.highlights?.length ?? 0}`);
  console.log(`  Technical moves: ${dailyUpdate.sections?.technical_moves?.length ?? 0}`);
  console.log(`  Market moves: ${dailyUpdate.sections?.market_moves?.length ?? 0}`);
  console.log(`  Signal changes: ${dailyUpdate.sections?.signal_changes?.length ?? 0}`);
  console.log(`  Outlook changes: ${dailyUpdate.sections?.outlook_changes?.length ?? 0}`);
  console.log(`  FedWatch changes: ${dailyUpdate.sections?.fedwatch_changes?.meetings?.length ?? 0}`);
  console.log(`  Holdings changes: ${dailyUpdate.sections?.holdings_changes?.length ?? 0}\n`);

  // ── Cache to Supabase ────────────────────────────────────────────────

  const { error } = await supabase.from('daily_update_cache').upsert({
    key: todayKey,
    data: dailyUpdate,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (error) {
    console.error('Cache write failed:', error.message);
  } else {
    console.log(`Cached daily update for ${todayKey}`);
  }

  const preview = dailyUpdate.summary?.slice(0, 200) ?? '';
  console.log(`\nSummary preview:\n  "${preview}..."\n`);
  console.log('=== Done! ===');
}

main().catch((err) => {
  console.error('Daily update generation failed:', err);
  process.exit(1);
});
