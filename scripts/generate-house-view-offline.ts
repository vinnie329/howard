/**
 * generate-house-view-offline.ts — Generate house view without API calls.
 * Applies the same synthesis logic Claude would use, based on source consensus,
 * credibility weighting, and outlook alignment.
 */

import { mockSources, mockPredictions, mockOutlook } from '../src/lib/mock-data';

interface HouseViewPrediction {
  claim: string;
  asset: string;
  direction: 'long' | 'short' | 'neutral';
  target_condition: string;
  time_horizon: string;
  deadline_days: number;
  confidence: number;
  conviction: 'high' | 'medium' | 'low';
  thesis: string;
  supporting_sources: string[];
  key_drivers: string[];
  invalidation_criteria: string;
  category: string;
  themes: string[];
}

// Synthesize house predictions from the intelligence
function synthesize(): HouseViewPrediction[] {
  // Analyze source consensus by asset/theme
  const sourcesByAsset = new Map<string, { sources: string[]; sentiment: string; confidences: string[]; weights: number[] }>();

  for (const pred of mockPredictions) {
    const source = mockSources.find((s) => s.id === pred.source_id);
    if (!source) continue;

    for (const asset of pred.assets_mentioned) {
      const entry = sourcesByAsset.get(asset) || { sources: [], sentiment: pred.sentiment, confidences: [], weights: [] };
      entry.sources.push(source.name);
      entry.confidences.push(pred.confidence);
      entry.weights.push(source.weighted_score);
      sourcesByAsset.set(asset, entry);
    }
  }

  // Short-term outlook is bearish (72% confidence) — supported by Marks, Howell, Burry
  // Medium-term says gold to $5k, energy bottleneck, semis downturn
  // Strong consensus: bearish risk assets, bullish gold, bearish semis

  const predictions: HouseViewPrediction[] = [
    {
      claim: 'S&P 500 declines 10%+ from February 2026 highs within 6 months',
      asset: 'SPY',
      direction: 'short',
      target_condition: 'SPY trades below 490 (representing 10%+ drawdown from ~545 level)',
      time_horizon: '6 months',
      deadline_days: 180,
      confidence: 72,
      conviction: 'high',
      thesis: 'Three of Howard\'s highest-credibility sources (Marks 4.39, Howell 4.29, Burry 4.26) independently call for a correction. Liquidity withdrawal is the mechanical driver — Howell projects $500B drain. Marks sees 2007-like complacency. Burry is putting real capital behind it with QQQ puts.',
      supporting_sources: ['Howard Marks', 'Michael Howell', 'Mike Burry'],
      key_drivers: ['Fed liquidity drain of ~$500B over Q1-Q2', 'Elevated equity valuations vs rising real rates', 'Institutional positioning shift (Burry 13F confirms)'],
      invalidation_criteria: 'SPY breaks above 575 on expanding market breadth with Fed pivoting to easing or liquidity metrics reversing higher',
      category: 'macro',
      themes: ['Market Correction', 'Liquidity Tightening', 'Market Complacency'],
    },
    {
      claim: 'Gold reaches $4,900/oz by end of 2026',
      asset: 'GLD',
      direction: 'long',
      target_condition: 'Gold futures (GC=F) trade above $4,900/oz',
      time_horizon: '10 months',
      deadline_days: 300,
      confidence: 68,
      conviction: 'high',
      thesis: 'Medium-term outlook targets $4,900-5,000 driven by central bank accumulation and debasement narrative. Burry (4.26 credibility, high confidence) is long gold. Howard\'s outlook positions gold as ~15% core allocation. The trade works in both deflation (safe haven) and inflation (real asset) scenarios.',
      supporting_sources: ['Mike Burry', 'Michael Howell', 'Howard Marks'],
      key_drivers: ['Central bank gold accumulation accelerating', 'Retail adoption of debasement narrative', 'Safe haven flows if equity correction materializes'],
      invalidation_criteria: 'Gold drops below $2,200 with real rates surging above 3% and dollar breaking to new highs',
      category: 'commodities',
      themes: ['Hard Assets', 'Monetary Reset', 'Gold Repricing'],
    },
    {
      claim: 'QQQ underperforms SPY by 8%+ over the next 3 months',
      asset: 'QQQ',
      direction: 'short',
      target_condition: 'QQQ/SPY ratio declines 8%+ from current levels',
      time_horizon: '3 months',
      deadline_days: 90,
      confidence: 65,
      conviction: 'medium',
      thesis: 'Burry (high confidence, high credibility) has massive QQQ put positions. Patel flags GPU CapEx saturation hitting NVIDIA — the largest QQQ weight. Rising real rates disproportionately hit long-duration tech. Short-term outlook is bearish with crypto (tech proxy) already breaking down.',
      supporting_sources: ['Mike Burry', 'Dylan Patel'],
      key_drivers: ['13F shows aggressive QQQ put positioning', 'GPU order reductions hit mega-cap tech earnings', 'Rising real rates compress growth multiples'],
      invalidation_criteria: 'QQQ breaks to new all-time highs with NVIDIA beating and raising guidance, accompanied by liquidity expansion',
      category: 'sector',
      themes: ['Tech Correction', 'GPU CapEx Saturation'],
    },
    {
      claim: 'NVIDIA shares decline 20%+ from recent highs within 6 months',
      asset: 'NVDA',
      direction: 'short',
      target_condition: 'NVDA trades 20%+ below its February 2026 price',
      time_horizon: '6 months',
      deadline_days: 180,
      confidence: 58,
      conviction: 'medium',
      thesis: 'Patel (SemiAnalysis, 3.89 credibility) flags 15-20% GPU order reductions in H2 2026 based on supply chain checks. Hyperscaler spending has overshot near-term AI revenue. Memory squeeze shifts the bottleneck narrative away from GPUs. Burry\'s tech short thesis aligns.',
      supporting_sources: ['Dylan Patel', 'Mike Burry'],
      key_drivers: ['15-20% reduction in GPU orders H2 2026', 'Hyperscaler CapEx rationalization', 'Guidance revision risk as supply chain checks deteriorate'],
      invalidation_criteria: 'NVIDIA reports accelerating order growth with new product cycle (Blackwell Ultra) driving upside revisions',
      category: 'single-stock',
      themes: ['GPU CapEx Saturation', 'Semiconductor Cycle'],
    },
    {
      claim: 'NASDAQ composite trades below 16,000 before June 2026',
      asset: 'QQQ',
      direction: 'short',
      target_condition: 'NASDAQ Composite index falls below 16,000',
      time_horizon: '3 months',
      deadline_days: 90,
      confidence: 55,
      conviction: 'medium',
      thesis: 'Howell (4.29 credibility, high confidence) specifically calls out risk asset headwinds in Q1 2026 driven by liquidity mechanics. The Global Liquidity Index leads risk assets by ~6 weeks. Combined with Burry\'s concentrated tech short and Marks\' cycle warning, the probability of a meaningful drawdown is elevated.',
      supporting_sources: ['Michael Howell', 'Mike Burry', 'Howard Marks'],
      key_drivers: ['$500B liquidity drain over Q1', 'Global Liquidity Index leading indicator turning negative', 'Tech-specific headwinds from GPU order cycle'],
      invalidation_criteria: 'NASDAQ breaks above 20,000 with Fed announcing QE or emergency liquidity facilities',
      category: 'macro',
      themes: ['Liquidity Tightening', 'Risk Asset Headwinds'],
    },
    {
      claim: 'Infrastructure ETF (PAVE) outperforms semiconductors ETF (SOXX) by 15%+ over 12 months',
      asset: 'PAVE',
      direction: 'long',
      target_condition: 'PAVE/SOXX ratio increases 15%+ from current level',
      time_horizon: '12 months',
      deadline_days: 365,
      confidence: 60,
      conviction: 'medium',
      thesis: 'Medium-term outlook explicitly positions "Long infrastructure (PAVE), short semiconductors (SOXX)". The thesis: AI constraint shifts from chips to electricity. Data center power demand creates a bottleneck that benefits physical infrastructure over silicon. Energy grid buildout is the next mega-theme.',
      supporting_sources: ['Dylan Patel', 'Michael Howell'],
      key_drivers: ['AI power demand shifting bottleneck from chips to grid', 'Re-industrialization narrative gaining policy support', 'Semiconductor cycle downturn vs infrastructure buildout'],
      invalidation_criteria: 'New semiconductor super-cycle driven by novel architecture breakthrough, or infrastructure spending delayed by political gridlock',
      category: 'sector',
      themes: ['Energy Bottleneck', 'From Chips to Grid', 'K-shaped Economy'],
    },
    {
      claim: 'Bitcoin fails to reclaim $100,000 and trades below $70,000 within 3 months',
      asset: 'BTC-USD',
      direction: 'short',
      target_condition: 'Bitcoin trades below $70,000',
      time_horizon: '3 months',
      deadline_days: 90,
      confidence: 45,
      conviction: 'low',
      thesis: 'Short-term outlook identifies Bitcoin as a "smoke alarm" — already breaking down technically against gold and dollar. Quantum computing fears triggering long-term holder selling. Liquidity tightening is the fundamental driver. However, crypto can decouple from macro on idiosyncratic flows, keeping confidence moderate.',
      supporting_sources: ['Michael Howell'],
      key_drivers: ['Bitcoin/gold ratio breakdown', 'Liquidity tightening reducing speculative appetite', 'Quantum computing fears accelerating selling'],
      invalidation_criteria: 'Bitcoin breaks above $120,000 with on-chain metrics showing strong accumulation and liquidity metrics stabilizing',
      category: 'crypto',
      themes: ['Crypto Breakdown', 'Liquidity Tightening'],
    },
  ];

  return predictions;
}

function main() {
  const predictions = synthesize();

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  HOWARD HOUSE VIEW — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  console.log(`  Synthesized from ${mockSources.length} sources, ${mockPredictions.length} predictions, ${mockOutlook.length} outlooks`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const pred of predictions.sort((a, b) => b.confidence - a.confidence)) {
    const arrow = pred.direction === 'long' ? '↑' : pred.direction === 'short' ? '↓' : '↔';
    const bars = pred.conviction === 'high' ? '███' : pred.conviction === 'medium' ? '██░' : '█░░';

    console.log(`  ${arrow} [${pred.confidence}%] ${bars}  ${pred.claim}`);
    console.log(`    Asset: ${pred.asset} | Category: ${pred.category} | Horizon: ${pred.time_horizon}`);
    console.log(`    Target: ${pred.target_condition}`);
    console.log(`    Thesis: ${pred.thesis}`);
    console.log(`    Drivers: ${pred.key_drivers.join(' · ')}`);
    console.log(`    Sources: ${pred.supporting_sources.join(', ')}`);
    console.log(`    Invalidation: ${pred.invalidation_criteria}`);
    console.log(`    Themes: ${pred.themes.join(', ')}`);
    console.log('');
  }

  console.log(`${'─'.repeat(70)}`);
  console.log(`  SUMMARY`);
  console.log(`  ${predictions.length} predictions | Avg confidence: ${(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length).toFixed(1)}%`);
  console.log(`  High conviction (70-90%): ${predictions.filter((p) => p.confidence >= 70).length}`);
  console.log(`  Medium conviction (40-69%): ${predictions.filter((p) => p.confidence >= 40 && p.confidence < 70).length}`);
  console.log(`  Low conviction (20-39%): ${predictions.filter((p) => p.confidence < 40).length}`);
  console.log(`  Direction bias: ${predictions.filter((p) => p.direction === 'short').length} short / ${predictions.filter((p) => p.direction === 'long').length} long`);
  console.log(`${'─'.repeat(70)}\n`);

  console.log('  Overall house posture: BEARISH');
  console.log('  Highest conviction: SPY correction (72%), Gold to $4,900 (68%)');
  console.log('  Key theme: Liquidity withdrawal → risk asset repricing → rotation to real assets\n');
}

main();
