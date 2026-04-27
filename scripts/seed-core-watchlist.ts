/**
 * Seed the core_watchlist with starter quality-compounder candidates.
 * These are placeholders — review and edit each thesis before relying.
 *
 * Buy/trim zones are illustrative; real ones need your own valuation work
 * against the principal thesis. Run once; uses upsert so you can re-run
 * after editing this file to update individual entries.
 *
 *   npx tsx scripts/seed-core-watchlist.ts          # apply
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

interface SeedEntry {
  ticker: string;
  asset_name: string;
  thesis: string;
  reinvestment_runway: string;
  pricing_power_evidence: string;
  capital_allocation_notes?: string;
  buy_zone_max: number | null;
  trim_zone_min: number | null;
  invalidation_criteria: string;
  flagged_by_sources?: string[];
  notes?: string;
}

const SEEDS: SeedEntry[] = [
  {
    ticker: 'COST',
    asset_name: 'Costco Wholesale',
    thesis:
      'Membership flywheel + scale buying = lowest unit prices in retail, member loyalty >90%, durable pricing power on the recurring fee. The business reinvests in lower prices to deepen the moat — same playbook for 40+ years, no obvious end-state.',
    reinvestment_runway:
      'New warehouse openings ~25-30/year globally for the next decade; international (esp. China, India) is multi-decade unpenetrated. Membership fee can be raised every ~5 years with low churn.',
    pricing_power_evidence:
      'Members pay ~$65/year and renew at >90%. The company can effectively raise prices via the fee while keeping shelf prices below competitors. Gross margin discipline (~13%) is a feature, not a bug.',
    buy_zone_max: 800,
    trim_zone_min: 1200,
    invalidation_criteria:
      'Renewal rate falls below 88% for two consecutive years; OR international expansion stalls (no new markets opening); OR a credible warehouse-club competitor emerges with similar scale (e.g., Amazon Prime physical pivot).',
    notes:
      'Quintessential Sleep/Smith/Akre name. The valuation is rarely cheap — patience required for the buy zone.',
  },
  {
    ticker: 'BRK.B',
    asset_name: 'Berkshire Hathaway',
    thesis:
      'Permanent capital + best capital allocator in history + insurance float compounding tax-free at the corporate level. Owns a portfolio of cash-generating businesses (BNSF, BHE, GEICO, Apple stake) across the durable-economy spine.',
    reinvestment_runway:
      '$300B+ cash + insurance float redeploys into private and public equities. Buffett/Abel discipline = no overpaying. Buyback when Berkshire trades below intrinsic value.',
    pricing_power_evidence:
      'Subsidiaries (See\'s Candies, Dairy Queen, BNSF rail) all have moat-driven pricing power. The conglomerate itself can buy permanent capital at scale that few competitors can match.',
    capital_allocation_notes:
      'Best in show. Buybacks below ~1.4× book are essentially free money. Apple stake reduction in 2025 was textbook position trimming.',
    buy_zone_max: 380,
    trim_zone_min: 600,
    invalidation_criteria:
      'Loss of capital allocation discipline post-Buffett (e.g., Abel makes a mega-deal at premium multiples); OR float runs off without replacement underwriting; OR sustained buyback above 1.6× book (signaling overvaluation rather than discipline).',
  },
  {
    ticker: 'GOOGL',
    asset_name: 'Alphabet',
    thesis:
      'Frontier AI lab + the world\'s best ML talent + 6× hyperscale data centers + the data flywheel of Search, YouTube, Android, Maps. The principal-thesis pillar of "frontier model concentration" expressed through a public proxy with optionality across cloud, AI, and ads.',
    reinvestment_runway:
      'AI capex doubling annually. Cloud (GCP) growing 30%+. Waymo, DeepMind side-bets. Ads still a 30%+ operating-margin business funding the entire research engine.',
    pricing_power_evidence:
      'Search + YouTube ads with no real substitutes for advertisers needing intent-driven reach. Cloud customers locked into 1-3yr commits.',
    capital_allocation_notes:
      'Big buybacks; first dividend signaled discipline. Consistent cap-allocation upgrade since Pichai/Porat tenure.',
    buy_zone_max: 165,
    trim_zone_min: 280,
    invalidation_criteria:
      'Search query share falls materially (e.g., AI assistants intermediate >25% of shopping queries with no Google equivalent) AND ads margin compresses below 25%. OR DOJ remedies materially impair distribution (Apple deal forced unwind without offsetting alternative).',
    flagged_by_sources: ['principal-thesis-vinnie'],
    notes:
      'Aligned with the principal 5-year thesis: frontier AI lab oligopoly + network-effect platform.',
  },
  {
    ticker: 'V',
    asset_name: 'Visa',
    thesis:
      'Payment rails duopoly with Mastercard. Toll booth on consumer spending growth, FX, and cross-border. 60%+ operating margins, capital-light, organic 10%+ revenue growth.',
    reinvestment_runway:
      'Cross-border travel, B2B payments, real-time payments (RTP) extension, value-added services (data/security). Visa Direct push-payments is the next leg.',
    pricing_power_evidence:
      'Network duopoly; the only credible challengers are governments (UPI, Pix) at the edges. Mid-single-digit pricing power on top of volume growth.',
    buy_zone_max: 240,
    trim_zone_min: 380,
    invalidation_criteria:
      'Stablecoin payment rails reach 5%+ of global card-volume share AND merchants begin meaningful repricing of acceptance terms. OR a major government-backed RTP system displaces Visa for >30% of a major-economy retail volume.',
    notes:
      'Watch for stablecoin disruption — directly contradicts the thesis if it materializes.',
  },
  {
    ticker: 'ASML',
    asset_name: 'ASML Holding',
    thesis:
      'Monopoly on EUV lithography — the only company that makes the machines required to fabricate sub-7nm chips. Every leading-edge AI chip (NVIDIA, AMD, Apple, Google TPU) physically cannot exist without ASML\'s tools. The principal thesis\'s "physical atoms" pillar in its purest form: the bottleneck behind the bottleneck.',
    reinvestment_runway:
      'High-NA EUV ramping through 2030 (each tool ~$400M, multi-year backlog). AI compute buildout pulls forward equipment cycles. R&D advantage is multi-decade and deepening (Nikon/Canon are years behind on EUV).',
    pricing_power_evidence:
      'No substitute at the leading node — TSMC, Samsung, Intel are captive customers. Service + spare-parts revenue is recurring at 50%+ gross margin and grows with installed base.',
    capital_allocation_notes:
      'High R&D intensity ($3B+/yr) is a feature of the moat, not a drag — you cannot underinvest and stay competitive in EUV. Disciplined buybacks when shares trade below intrinsic value through cycles.',
    // Lower buy zone than current price — prices in cyclicality and the geopolitical tail
    buy_zone_max: 720,
    trim_zone_min: 1150,
    invalidation_criteria:
      'A credible non-EUV path to sub-2nm node manufacturing emerges (currently no such path exists). OR Dutch/US export restrictions on China expand to cut >50% of China revenue (currently ~25-30%) AND no offsetting demand from US/Korea/Japan customers. OR TSMC + Samsung simultaneously slow capex by >40% for two consecutive years.',
    flagged_by_sources: ['principal-thesis-vinnie', 'dylan-patel'],
    notes:
      'Less Sleep/Smith-pure than Costco/Visa — geopolitical tail (Dutch export rules) and customer-capex cyclicality argue for a lower buy zone than consensus. But the moat is genuine and tied to the principal thesis\'s "physical atoms" + "AI compute" pillars. Patel\'s March 2026 deep-dive flagged ASML as the structural bottleneck behind everything.',
  },
];

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let inserted = 0;
  let updated = 0;
  for (const s of SEEDS) {
    const { data: existing } = await sb.from('core_watchlist').select('id').eq('ticker', s.ticker).maybeSingle();
    const { error } = await sb.from('core_watchlist')
      .upsert({ ...s, status: 'watching' }, { onConflict: 'ticker' });
    if (error) { console.error(`  ${s.ticker}: ${error.message}`); continue; }
    if (existing) { updated++; console.log(`  ↻ updated ${s.ticker} — ${s.asset_name}`); }
    else { inserted++; console.log(`  + added ${s.ticker} — ${s.asset_name}`); }
  }
  console.log(`\nDone — ${inserted} added, ${updated} updated.`);
}
main().catch(console.error);
