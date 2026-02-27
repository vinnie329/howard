'use client';

import { useState, useEffect, useMemo } from 'react';
import { getOutlook } from '@/lib/data';
import { SkeletonRows } from '@/components/ui/Skeleton';
import type { Outlook } from '@/types';

interface TechnicalData {
  symbol: string;
  name: string;
  currentPrice: number;
  devFromMa200d: number | null;
  devFromMa200w: number | null;
  historicalMinDev200d: number | null;
  historicalMinDev200w: number | null;
  source: 'core' | '13f';
}

function AssetPill({ name, price }: { name: string; price?: number }) {
  const letter = name.charAt(0);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 8px 2px 3px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)',
      verticalAlign: 'middle',
      margin: '2px 1px',
    }}>
      <span style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 8,
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        flexShrink: 0,
      }}>
        {letter}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 500 }}>
        {name}
      </span>
      {price != null && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          ${price >= 1000 ? price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : price.toFixed(2)}
        </span>
      )}
    </span>
  );
}

// Identify assets trading well below their moving averages — potential fat pitches
function findFatPitches(technicals: TechnicalData[]): TechnicalData[] {
  return technicals
    .filter((t) => {
      // Must have MA data and be meaningfully below 200d or 200w MA
      const below200d = t.devFromMa200d !== null && t.devFromMa200d < -15;
      const below200w = t.devFromMa200w !== null && t.devFromMa200w < -20;
      // Near historical lows relative to MA
      const nearFloor200d = t.devFromMa200d !== null && t.historicalMinDev200d !== null
        && t.historicalMinDev200d < 0
        && t.devFromMa200d < t.historicalMinDev200d * 0.6;
      return below200d || below200w || nearFloor200d;
    })
    .sort((a, b) => (a.devFromMa200d ?? 0) - (b.devFromMa200d ?? 0))
    .slice(0, 8);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
      {children}
    </span>
  );
}

// Build positioning narrative from outlook data + technicals
// Returns an array of "sections" — each section is a React node rendered as its own block
function buildNarrative(
  outlooks: Outlook[],
  technicals: TechnicalData[],
): React.ReactNode[] {
  const short = outlooks.find((o) => o.time_horizon === 'short');
  const all = outlooks.flatMap((o) => o.positioning);
  const allThemes = outlooks.flatMap((o) => o.key_themes);

  const techMap = new Map<string, TechnicalData>();
  for (const t of technicals) techMap.set(t.symbol, t);

  const lookup = (t: string): TechnicalData | undefined => {
    const clean = t.replace('=F', '').replace('-USD', '').replace('^', '');
    return techMap.get(t) || techMap.get(clean);
  };

  // Fallback names for tickers not in technicals
  const NAMES: Record<string, string> = {
    'GC=F': 'Gold', 'SI=F': 'Silver', 'HG=F': 'Copper',
    'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum',
    MU: 'Micron', WDC: 'Western Digital', PAVE: 'PAVE', GEV: 'GE Vernova',
  };

  const pill = (ticker: string) => {
    const t = lookup(ticker);
    const name = t?.name || NAMES[ticker] || ticker;
    return (
      <AssetPill key={ticker} name={name} price={t?.currentPrice} />
    );
  };

  const sections: React.ReactNode[] = [];

  // --- Prose section ---
  const prose: React.ReactNode[] = [];

  // Opening posture — reference Howell's liquidity cycle
  if (short) {
    const hasLiquidity = allThemes.some((t) => /liquidity/i.test(t))
      || all.some((p) => /liquidity/i.test(p));
    const posture: Record<string, string> = {
      bearish: hasLiquidity
        ? 'Howell\'s global liquidity cycle is contracting — favor patience and capital preservation. '
        : 'The near-term environment favors patience and capital preservation. ',
      cautious: hasLiquidity
        ? 'Howell\'s liquidity cycle signals caution — we are in the tightening phase. '
        : 'Conditions warrant caution. ',
      bullish: hasLiquidity
        ? 'Howell\'s liquidity cycle is turning up — conditions favor leaning in. '
        : 'Conditions favor leaning in. ',
      neutral: hasLiquidity
        ? 'Howell\'s liquidity indicators are mixed. '
        : 'Near-term signals are mixed. ',
    };
    prose.push(posture[short.sentiment] || '');
  }

  // Cash
  if (all.some((p) => /cash|dry powder|t-bill/i.test(p))) {
    prose.push('Hold dry powder and wait for fat pitches. ');
  }

  // Gold anchor
  if (all.some((p) => /gold/i.test(p))) {
    prose.push(pill('GC=F'));
    prose.push(' anchors the portfolio');
    if (all.some((p) => /gold.*repricing|gold.*5,?000|\$10,?000/i.test(p))) {
      prose.push(' — structural repricing potential remains significant');
    }
    prose.push('. ');
  }

  // Commodities
  if (all.some((p) => /copper|uranium|rare earth/i.test(p))) {
    prose.push('Strategic commodities — ');
    prose.push(pill('HG=F'));
    prose.push(', uranium, rare earths — are the resource scarcity bet. ');
  }

  // Energy / infrastructure
  if (all.some((p) => /energy infrastructure|nuclear|natural gas/i.test(p))) {
    prose.push('Energy infrastructure is the bottleneck as AI scales. ');
  }

  if (prose.length > 0) {
    sections.push(
      <p key="prose" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2, margin: 0 }}>
        {prose}
      </p>
    );
  }

  // --- Opportunity sections ---
  const ovTickers: string[] = [];
  for (const p of all) {
    if (/overweight.*memory|overweight.*micron/i.test(p)) {
      if (!ovTickers.includes('MU')) ovTickers.push('MU');
    }
    if (/western digital/i.test(p)) {
      if (!ovTickers.includes('WDC')) ovTickers.push('WDC');
    }
    if (/infrastructure.*PAVE/i.test(p)) {
      if (!ovTickers.includes('PAVE')) ovTickers.push('PAVE');
    }
    if (/GE Vernova|gas turbine/i.test(p)) {
      if (!ovTickers.includes('GEV')) ovTickers.push('GEV');
    }
  }

  // Fat pitches from technicals — assets meaningfully below MAs
  const fatPitches = findFatPitches(technicals);
  const fatPitchSymbols = fatPitches.map((fp) => fp.symbol);

  // Register fat pitch names for pill lookup
  for (const fp of fatPitches) {
    if (!NAMES[fp.symbol]) NAMES[fp.symbol] = fp.name;
  }

  // Merge outlook-driven picks with technical fat pitches (dedup)
  const allOpps = [...ovTickers];
  for (const sym of fatPitchSymbols) {
    if (!allOpps.includes(sym)) allOpps.push(sym);
  }

  if (ovTickers.length > 0) {
    const pills: React.ReactNode[] = [];
    ovTickers.forEach((t, i) => {
      if (i > 0) pills.push(' ');
      pills.push(pill(t));
    });
    sections.push(
      <div key="thesis">
        <SectionLabel>Thesis-driven opportunities:</SectionLabel>
        <div style={{ marginTop: 6 }}>{pills}</div>
      </div>
    );
  }

  const purelyTechnical = fatPitchSymbols.filter((s) => !ovTickers.includes(s));
  if (purelyTechnical.length > 0) {
    const pills: React.ReactNode[] = [];
    purelyTechnical.forEach((t, i) => {
      if (i > 0) pills.push(' ');
      pills.push(pill(t));
    });
    sections.push(
      <div key="fat-pitches">
        <SectionLabel>Fat pitches on MA deviation:</SectionLabel>
        <div style={{ marginTop: 6 }}>{pills}</div>
      </div>
    );
  }

  // Avoids
  const avoids: string[] = [];
  if (all.some((p) => /high.multiple tech|underweight.*tech/i.test(p))) avoids.push('high-multiple tech');
  if (all.some((p) => /long.duration.*debt|sovereign debt/i.test(p))) avoids.push('long-duration sovereign debt');
  if (avoids.length > 0) {
    sections.push(
      <div key="avoids" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Avoid {avoids.join(' and ')}.
      </div>
    );
  }

  return sections;
}

export default function PositioningPage() {
  const [outlooks, setOutlooks] = useState<Outlook[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOutlook(),
      fetch('/api/technicals').then((r) => r.json()).catch(() => []),
    ]).then(([outlookData, techData]) => {
      setOutlooks(outlookData);
      if (Array.isArray(techData)) {
        setTechnicals(techData as TechnicalData[]);
      }
      setLoading(false);
    });
  }, []);

  const narrative = useMemo(
    () => buildNarrative(outlooks, technicals),
    [outlooks, technicals],
  );

  const fatPitchCount = useMemo(
    () => findFatPitches(technicals).length,
    [technicals],
  );

  const avgConfidence = outlooks.length > 0
    ? Math.round(outlooks.reduce((sum, o) => sum + o.confidence, 0) / outlooks.length)
    : 0;

  const lastUpdated = outlooks.length > 0
    ? new Date(Math.max(...outlooks.map((o) => new Date(o.last_updated).getTime())))
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <>
      <div className="top-bar">
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Intelligence</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Positioning</span>
      </div>

      <div style={{
        padding: 'var(--space-8) var(--space-6)',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          {loading ? (
            <SkeletonRows count={3} />
          ) : outlooks.length === 0 ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              No outlook data.
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 18, marginBottom: 'var(--space-6)' }}>Positioning</h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {narrative}
              </div>

              <div className="mono" style={{ marginTop: 'var(--space-6)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                {lastUpdated} · {avgConfidence}% avg conviction · {fatPitchCount} fat pitch{fatPitchCount !== 1 ? 'es' : ''} detected
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
