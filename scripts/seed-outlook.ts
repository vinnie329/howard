import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const outlookData = [
  {
    time_horizon: 'short',
    domain: 'general',
    title: 'The Liquidity Air Pocket',
    subtitle: 'Next 30 days',
    thesis_intro: 'The immediate environment is defined by tightening financial conditions and elevated risk across crypto and geopolitical spheres.',
    thesis_points: [
      {
        heading: 'Liquidity Crunch',
        content: 'Global liquidity is falling. Federal Reserve liquidity projected to drop ~10% over the next nine months. Repo market spreads are widening - early stress signals.',
      },
      {
        heading: 'Crypto as Smoke Alarm',
        content: 'Bitcoin has broken down technically against both gold and the dollar. Acting as a leading indicator for broader risk assets. Quantum computing fears have triggered selling by long-term holders.',
      },
      {
        heading: 'Geopolitical Flashpoints',
        content: "Aggressive moves to secure physical resources. The 'Greenland Gambit' signals intent to control rare earth supply chains critical for AI and defense.",
      },
      {
        heading: 'AI Security Vulnerabilities',
        content: 'Rapid open-source AI agent adoption has exposed major security gaps. Enterprise-grade alternatives with proper guardrails expected within 3 months.',
      },
    ],
    positioning: [
      'Short duration fixed income - avoid long-term bonds, hold T-bills as dry powder',
      'Trim high-beta tech and crypto exposure',
      'Maintain tactical cash position',
    ],
    key_themes: ['liquidity crunch', 'crypto breakdown', 'geopolitical risk', 'AI security'],
    sentiment: 'bearish',
    confidence: 72,
    supporting_sources: [
      { name: 'Michael Howell', weight: 30 },
      { name: 'Howard Marks', weight: 25 },
      { name: 'Mike Burry', weight: 25 },
      { name: 'Dylan Patel', weight: 20 },
    ],
  },
  {
    time_horizon: 'medium',
    domain: 'general',
    title: 'The Physical Pivot',
    subtitle: 'Next 12 months',
    thesis_intro: 'A K-shaped economy emerges. AI drives growth while the broader market confronts physical constraints and rising real capital costs.',
    thesis_points: [
      {
        heading: 'Gold to $5,000',
        content: 'Targeting $4,900-5,000/oz by end of 2026. Driven by central bank accumulation and retail adoption of the debasement narrative.',
      },
      {
        heading: 'Tale of Two Halves',
        content: 'H1 2026: Asset prices struggle under liquidity withdrawal and rising real rates. H2 2026: Potential nominal boom if yield curve control is implemented to fund re-industrialization.',
      },
      {
        heading: 'From Chips to Grid',
        content: 'The AI constraint shifts from silicon to electricity. Data center power demand is the new bottleneck. Industrial commodities (copper, uranium) and energy infrastructure become the trades.',
      },
      {
        heading: 'Memory Squeeze',
        content: 'Server memory costs expected to double by late 2026. AI demand is crowding out all other use cases. Structural shift in semiconductor economics.',
      },
    ],
    positioning: [
      'Gold ~15% allocation as core anchor',
      'Long infrastructure (PAVE), short semiconductors (SOXX)',
      'Overweight: nuclear, gas turbines (GE Vernova), grid components',
      'Overweight: memory manufacturers (Micron, Western Digital)',
      'Underweight: high-multiple tech',
    ],
    key_themes: ['gold', 'yield curve control', 'energy bottleneck', 'semiconductors', 'K-shaped economy'],
    sentiment: 'cautious',
    confidence: 65,
    supporting_sources: [
      { name: 'Michael Howell', weight: 30 },
      { name: 'Dylan Patel', weight: 25 },
      { name: 'Howard Marks', weight: 25 },
      { name: 'Mike Burry', weight: 20 },
    ],
  },
  {
    time_horizon: 'long',
    domain: 'general',
    title: 'The Sovereignty Trade',
    subtitle: '5+ year horizon',
    thesis_intro: 'A new structural regime defined by Capital Wars. The race for physical control over the means of intelligence production.',
    thesis_points: [
      {
        heading: 'Monetary Reset',
        content: 'US debt trajectory: 250% of GDP by mid-2050s. If real debt value is maintained in gold terms, implies $10,000/oz by mid-2030s, $25,000/oz by 2050s.',
      },
      {
        heading: 'Resource Nationalism',
        content: 'Rules-based order gives way to physical possession as law. Nations stockpile critical minerals. Permanent premium on resource sovereignty. US faces binary choice: sacrifice dollar or lose AI race.',
      },
      {
        heading: 'Power Consumption Explosion',
        content: 'US data center capacity: 33 GW (2024) \u2192 176 GW (2035). Fivefold increase. Massive nuclear and natural gas buildout required.',
      },
      {
        heading: 'Social Bifurcation',
        content: 'AI is labor-saving at scale. Four out of five jobs potentially threatened. Social polarization increases. UBI becomes policy necessity.',
      },
    ],
    positioning: [
      'Gold as long-term anchor - potential for significant repricing',
      'Strategic commodities: copper, uranium, rare earths',
      'Energy infrastructure: nuclear, natural gas',
      'Avoid: long-duration sovereign debt',
      'High conviction, concentrated positions over broad diversification',
    ],
    key_themes: ['monetary reset', 'resource nationalism', 'energy infrastructure', 'AI labor displacement', 'gold repricing'],
    sentiment: 'cautious',
    confidence: 58,
    supporting_sources: [
      { name: 'Michael Howell', weight: 35 },
      { name: 'Howard Marks', weight: 30 },
      { name: 'Mike Burry', weight: 20 },
      { name: 'Dylan Patel', weight: 15 },
    ],
  },
];

async function seed() {
  console.log('Seeding Howard outlook data...\n');

  for (const outlook of outlookData) {
    const { error } = await supabase.from('outlook').upsert(
      {
        ...outlook,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'time_horizon,domain' },
    );

    if (error) {
      console.error(`  Error seeding ${outlook.time_horizon} outlook:`, error.message);
    } else {
      console.log(`  Seeded: ${outlook.time_horizon} term (${outlook.sentiment}, ${outlook.confidence}% confidence)`);
    }
  }

  console.log('\nDone!');
}

seed();
