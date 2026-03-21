/**
 * seed-house-view.ts — Insert house view predictions into Supabase
 * from the offline synthesis logic (no Claude API needed).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  {
    claim: 'Private credit experiences a dislocating event (major fund gate or mark-to-market loss) within 12 months',
    asset: 'BIZD',
    direction: 'short',
    target_condition: 'A top-20 private credit fund suspends redemptions, or BDC index (BIZD) drops 15%+',
    time_horizon: '12 months',
    deadline_days: 365,
    confidence: 30,
    conviction: 'low',
    thesis: '"Private Credit Bubble" is the #5 trending topic across sources with rising momentum. Howell\'s liquidity framework implies private credit has been masking the true tightening. Marks (2007 parallel) warns that complacency peaks in opaque credit markets.',
    supporting_sources: ['Howard Marks (implied)', 'Michael Howell (implied)'],
    key_drivers: ['Private credit AUM tripled to $1.7T since 2020', 'Rising real rates stress floating-rate borrowers', 'Redemption/liquidity mismatch in semi-liquid vehicles', 'Mark-to-model masking deterioration'],
    invalidation_criteria: 'Fed cuts rates 100bp+ and private credit default rates remain below 3%',
    category: 'macro',
    themes: ['Private Credit Bubble', 'Shadow Liquidity', 'Credit Stress'],
  },
  {
    claim: 'Micron Technology (MU) outperforms NVIDIA by 25%+ over 12 months',
    asset: 'MU',
    direction: 'long',
    target_condition: 'MU/NVDA ratio increases 25%+ from current level',
    time_horizon: '12 months',
    deadline_days: 365,
    confidence: 35,
    conviction: 'low',
    thesis: 'The "Memory Squeeze" thesis from the medium-term outlook is underappreciated. Patel projects server memory costs doubling by late 2026 — AI demand is crowding out all other DRAM use cases.',
    supporting_sources: ['Dylan Patel'],
    key_drivers: ['Server memory costs projected to double by late 2026', 'AI inference scaling faster than training', 'DRAM supply constrained by AI crowding out consumer/enterprise demand'],
    invalidation_criteria: 'New memory technology breaks the supply bottleneck, or AI inference growth stalls',
    category: 'single-stock',
    themes: ['Memory Squeeze', 'AI Infrastructure', 'Semiconductor Cycle'],
  },
  {
    claim: 'Copper breaks above $12,000/ton within 12 months as AI power demand accelerates',
    asset: 'HG=F',
    direction: 'long',
    target_condition: 'Copper futures trade above $12,000/ton ($5.44/lb)',
    time_horizon: '12 months',
    deadline_days: 365,
    confidence: 38,
    conviction: 'low',
    thesis: 'The long-term outlook\'s "Power Consumption Explosion" thesis has near-term implications for copper. Each GW of data center capacity requires ~10,000 tons of copper for grid infrastructure.',
    supporting_sources: ['Dylan Patel (implied)', 'Jeff Currie (domain alignment)'],
    key_drivers: ['Data center power buildout requires massive copper wiring', 'Grid expansion plans across US, EU, Asia', 'Mine supply constrained — 7-10 year lead time for new capacity'],
    invalidation_criteria: 'Global recession crushes industrial demand, or copper substitution technologies gain traction',
    category: 'commodities',
    themes: ['Energy Bottleneck', 'From Chips to Grid', 'Resource Nationalism'],
  },
  {
    claim: 'US 10-Year yield breaches 5.5% within 6 months, triggering policy intervention',
    asset: 'TLT',
    direction: 'short',
    target_condition: 'US 10Y yield trades above 5.5% (TLT below $78)',
    time_horizon: '6 months',
    deadline_days: 180,
    confidence: 25,
    conviction: 'low',
    thesis: 'The long-term outlook describes "250% debt-to-GDP by mid-2050s" and a "binary choice: sacrifice dollar or lose AI race". Sovereign debt concerns are the #2 trending topic with rising momentum.',
    supporting_sources: ['Michael Howell (implied)', 'Ashok Varadhan (domain alignment)'],
    key_drivers: ['$36T+ federal debt with rising refinancing costs', 'Foreign central bank diversification away from Treasuries', 'Fiscal deficits expanding not contracting'],
    invalidation_criteria: 'Fed announces yield curve control or emergency bond buying, or recession fears drive flight-to-safety',
    category: 'rates',
    themes: ['Sovereign Debt Concerns', 'Monetary Reset', 'Yield Curve Control'],
  },
  {
    claim: 'GE Vernova (GEV) doubles from current levels within 18 months as grid buildout accelerates',
    asset: 'GEV',
    direction: 'long',
    target_condition: 'GEV trades at 2x its March 2026 price',
    time_horizon: '18 months',
    deadline_days: 540,
    confidence: 32,
    conviction: 'low',
    thesis: 'The medium-term outlook explicitly lists "Overweight: nuclear, gas turbines (GE Vernova), grid components". The power demand thesis (33 GW → 176 GW) is the most concrete, measurable claim in the long-term outlook.',
    supporting_sources: ['Dylan Patel (implied)', 'Josh Wolfe (domain alignment)'],
    key_drivers: ['176 GW data center target requires massive gas turbine orders', 'Grid modernization becoming national security priority', 'GE Vernova backlog growth from hyperscaler power contracts'],
    invalidation_criteria: 'Nuclear/SMR technology breakthrough makes gas turbines less critical, or data center buildout timelines pushed back significantly',
    category: 'single-stock',
    themes: ['Energy Bottleneck', 'From Chips to Grid', 'AI Infrastructure'],
  },
  {
    claim: 'Uranium ETF (URA) gains 40%+ within 12 months as nuclear buildout narrative crystallizes',
    asset: 'URA',
    direction: 'long',
    target_condition: 'URA trades 40%+ above its March 2026 price',
    time_horizon: '12 months',
    deadline_days: 365,
    confidence: 33,
    conviction: 'low',
    thesis: 'Long-term outlook positions "Energy infrastructure: nuclear, natural gas" as a core theme. You can\'t build 143 GW of new data center capacity on solar and wind alone. Nuclear is the only baseload zero-carbon option.',
    supporting_sources: ['Dylan Patel (implied)', 'Michael Howell (implied)'],
    key_drivers: ['Data center baseload power needs favor nuclear', 'Uranium supply deficit as mines remain underinvested', 'Government policy shifting pro-nuclear'],
    invalidation_criteria: 'SMR projects face major delays or cost overruns, or fusion breakthrough changes calculus',
    category: 'commodities',
    themes: ['Energy Bottleneck', 'Resource Nationalism', 'Nuclear Renaissance'],
  },
];

async function main() {
  console.log('=== Seeding House View Predictions ===\n');

  // Check for existing predictions
  const { data: existing } = await supabase
    .from('house_predictions')
    .select('id')
    .eq('outcome', 'pending');

  if (existing && existing.length > 0) {
    console.log(`  Found ${existing.length} existing predictions — clearing them first`);
    await supabase.from('house_predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const now = new Date();
  let inserted = 0;

  for (const pred of predictions) {
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + pred.deadline_days);

    const { error } = await supabase.from('house_predictions').insert({
      claim: pred.claim,
      asset: pred.asset,
      direction: pred.direction,
      target_condition: pred.target_condition,
      time_horizon: pred.time_horizon,
      deadline: deadline.toISOString(),
      confidence: pred.confidence,
      conviction: pred.conviction,
      thesis: pred.thesis,
      supporting_sources: pred.supporting_sources,
      key_drivers: pred.key_drivers,
      invalidation_criteria: pred.invalidation_criteria,
      category: pred.category,
      themes: pred.themes,
      outcome: 'pending',
    });

    if (error) {
      console.log(`  ✗ Failed: ${pred.claim.substring(0, 60)}...`);
      console.log(`    ${error.message}`);
    } else {
      console.log(`  ✓ ${pred.conviction.toUpperCase()} [${pred.confidence}%] ${pred.claim.substring(0, 70)}`);
      inserted++;
    }
  }

  console.log(`\n=== Done! Inserted ${inserted}/${predictions.length} predictions ===`);
}

main();
