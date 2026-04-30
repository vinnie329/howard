/**
 * seed-buildout-watchlist.ts — Initial seed of buy-and-hold AGI / robotics
 * buildout exposures. Buy/trim zones are starting estimates, not bids — refine
 * per name as conviction develops.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Seed {
  ticker: string;
  asset_name: string;
  category: string;
  value_chain_layer: 'foundational' | 'enabling' | 'application';
  thesis: string;
  agi_dependency: 'core' | 'optional' | 'hedge';
  buy_zone_max: number | null;
  trim_zone_min: number | null;
  invalidation_capex_stall: string;
  invalidation_disintermediation: string;
  notes?: string;
}

const SEEDS: Seed[] = [
  // ── Compute silicon ──
  {
    ticker: 'NVDA', asset_name: 'NVIDIA',
    category: 'compute_silicon', value_chain_layer: 'foundational',
    thesis: '~85% AI training silicon share, full-stack moat (silicon + NVLink + CUDA + NIM). The single most direct buildout exposure on the planet. Hyperscalers diversify but cannot replace.',
    agi_dependency: 'core',
    buy_zone_max: 115, trim_zone_min: 200,
    invalidation_capex_stall: 'Hyperscaler capex cuts of >25% across 2 quarters; OpenAI/Anthropic revenue stalls force compute-rental contraction',
    invalidation_disintermediation: 'GOOGL TPU, MSFT MTIA, META MTIA reach >25% combined share of new AI training capacity (today <10%)',
    notes: 'Crowded trade — accept the price for buildout-essentiality',
  },
  {
    ticker: 'AMD', asset_name: 'Advanced Micro Devices',
    category: 'compute_silicon', value_chain_layer: 'foundational',
    thesis: 'MI300/MI325/MI350 line as second-source for hyperscalers diversifying off NVDA. Modest AI silicon share today (~10%) but rising in inference where ROCm gaps matter less.',
    agi_dependency: 'core',
    buy_zone_max: 135, trim_zone_min: 220,
    invalidation_capex_stall: 'Same as NVDA — broad capex contraction',
    invalidation_disintermediation: 'NVDA achieves perpetual 85%+ share without erosion; ROCm software gap fails to close',
  },
  {
    ticker: 'AVGO', asset_name: 'Broadcom',
    category: 'compute_silicon', value_chain_layer: 'foundational',
    thesis: 'Custom AI ASICs for hyperscalers (Google TPU, Meta MTIA), Tomahawk networking switches, plus VMware. Picks-and-shovels of the hyperscaler-diversification trade.',
    agi_dependency: 'core',
    buy_zone_max: 1500, trim_zone_min: 2500,
    invalidation_capex_stall: 'Hyperscalers pause custom-silicon programs',
    invalidation_disintermediation: 'Hyperscalers in-source ASIC design (low probability — Broadcom IP and supply chain are deeply embedded)',
  },
  {
    ticker: 'MRVL', asset_name: 'Marvell Technology',
    category: 'compute_silicon', value_chain_layer: 'foundational',
    thesis: 'Custom AI silicon (DSPs, ethernet) and datacenter networking. Smaller than AVGO but rising share in the AI customer-silicon market.',
    agi_dependency: 'core',
    buy_zone_max: 65, trim_zone_min: 110,
    invalidation_capex_stall: 'Same as compute silicon broadly',
    invalidation_disintermediation: 'AVGO consolidates customer-ASIC market; competitive losses in 5G + storage segments',
  },
  {
    ticker: 'TSM', asset_name: 'TSMC',
    category: 'compute_silicon', value_chain_layer: 'foundational',
    thesis: 'Foundry monopoly for advanced nodes (3nm, 2nm). Bottleneck for everyone except struggling Samsung foundry. Without TSM, no advanced AI silicon.',
    agi_dependency: 'core',
    buy_zone_max: 170, trim_zone_min: 260,
    invalidation_capex_stall: 'AI silicon orders to TSM contract >20% — would require multi-quarter hyperscaler pull-back',
    invalidation_disintermediation: 'Samsung foundry catches up at 2nm (currently ~2 years behind); China takes Taiwan (geopolitical tail)',
  },
  {
    ticker: 'ASML', asset_name: 'ASML Holding',
    category: 'compute_silicon', value_chain_layer: 'foundational',
    thesis: 'EUV lithography monopoly. Without ASML, no advanced nodes, no AI buildout. Most defensible single-vendor moat in semis. Already in compounder watchlist — duplicate framing here as a buildout pick.',
    agi_dependency: 'core',
    buy_zone_max: 700, trim_zone_min: 1100,
    invalidation_capex_stall: 'Foundry capex pause >2 quarters across TSM + Samsung + Intel',
    invalidation_disintermediation: 'Effectively impossible — no competing EUV vendor exists or could exist within 5 years',
  },

  // ── Memory + storage ──
  {
    ticker: 'MU', asset_name: 'Micron Technology',
    category: 'memory_storage', value_chain_layer: 'foundational',
    thesis: 'DRAM + HBM (the AI memory bottleneck). Cyclical — but the AI cycle is structurally tighter than prior memory cycles because HBM gates training capacity directly.',
    agi_dependency: 'core',
    buy_zone_max: 90, trim_zone_min: 150,
    invalidation_capex_stall: 'HBM oversupply emerges; AI training pause cuts demand',
    invalidation_disintermediation: 'SK Hynix / Samsung capture >70% of HBM permanently (currently ~50/35/15 split)',
  },
  {
    ticker: 'SNDK', asset_name: 'SanDisk',
    category: 'memory_storage', value_chain_layer: 'enabling',
    thesis: 'Spun off from WDC. NAND for AI inference checkpointing + storage. Smaller AI exposure than DRAM but real beneficiary as inference workloads scale.',
    agi_dependency: 'core',
    buy_zone_max: 50, trim_zone_min: 90,
    invalidation_capex_stall: 'NAND oversupply; smartphone/PC weakness drags broader demand',
    invalidation_disintermediation: 'New storage technology (e.g., HBM-as-storage, persistent memory) eats NAND share',
  },
  {
    ticker: '000660.KS', asset_name: 'SK Hynix',
    category: 'memory_storage', value_chain_layer: 'foundational',
    thesis: 'HBM market leader (~50% share). NVDA primary HBM partner. Korean listing — currency exposure can cut both ways.',
    agi_dependency: 'core',
    buy_zone_max: 150000, trim_zone_min: 280000,
    invalidation_capex_stall: 'AI HBM demand contraction',
    invalidation_disintermediation: 'Samsung HBM3E qualifies at NVDA at scale; MU captures incremental NVDA share',
    notes: 'Buy/trim zones in KRW',
  },

  // ── Power generation ──
  {
    ticker: 'CEG', asset_name: 'Constellation Energy',
    category: 'power_generation', value_chain_layer: 'enabling',
    thesis: 'Largest US nuclear operator. Microsoft 20-year PPA on Three Mile Island restart established direct DC nuclear pricing. Most-direct nuclear-AI exposure.',
    agi_dependency: 'core',
    buy_zone_max: 200, trim_zone_min: 360,
    invalidation_capex_stall: 'DC PPA pipeline stalls; gas peaking absorbs incremental load',
    invalidation_disintermediation: 'New SMR vendors (e.g., NuScale, X-energy) gain commercial traction at scale by 2030',
  },
  {
    ticker: 'VST', asset_name: 'Vistra',
    category: 'power_generation', value_chain_layer: 'enabling',
    thesis: 'Nuclear + gas + Texas grid exposure. Multi-DC PPAs in pipeline. ERCOT positioning is strategic for Stargate / Pecos build.',
    agi_dependency: 'core',
    buy_zone_max: 130, trim_zone_min: 210,
    invalidation_capex_stall: 'Texas DC pipeline slows; ERCOT power prices normalize',
    invalidation_disintermediation: 'Less of a moat — competing Texas IPPs (TLN, generation owners) compete for same PPAs',
  },
  {
    ticker: 'TLN', asset_name: 'Talen Energy',
    category: 'power_generation', value_chain_layer: 'enabling',
    thesis: 'Nuclear (Susquehanna) + Amazon Cumulus DC PPA. Smaller but pure-play AI-power exposure.',
    agi_dependency: 'core',
    buy_zone_max: 190, trim_zone_min: 310,
    invalidation_capex_stall: 'AMZN DC ramp slips; Susquehanna PPA terms re-priced',
    invalidation_disintermediation: 'Limited — single-asset moat is durable',
  },
  {
    ticker: 'BE', asset_name: 'Bloom Energy',
    category: 'power_generation', value_chain_layer: 'enabling',
    thesis: 'Solid-oxide fuel cells for behind-the-meter DC power. The grid cannot deliver power fast enough; BE is one of the few near-term answers. Leopold added 17% AUM in Q4 2025 — biggest single new bet in SA.',
    agi_dependency: 'core',
    buy_zone_max: 20, trim_zone_min: 50,
    invalidation_capex_stall: 'DC operators choose to wait for grid rather than install fuel cells',
    invalidation_disintermediation: 'Cheaper / better behind-the-meter alternatives (gas turbines from GEV, Cummins) capture share',
    notes: 'Speculative leg — sized for asymmetric upside, not core conviction',
  },
  {
    ticker: 'EQT', asset_name: 'EQT Corporation',
    category: 'power_generation', value_chain_layer: 'foundational',
    thesis: 'Largest US natgas producer. Gas is the bridge fuel for DC power — much faster to permit and build than nuclear or new transmission. Already in Leopold book.',
    agi_dependency: 'core',
    buy_zone_max: 35, trim_zone_min: 60,
    invalidation_capex_stall: 'Gas demand for DC weakens',
    invalidation_disintermediation: 'Renewables + storage become commercially superior for DC base load (unlikely pre-2030)',
  },
  {
    ticker: 'NEE', asset_name: 'NextEra Energy',
    category: 'power_generation', value_chain_layer: 'enabling',
    thesis: 'Largest US renewables developer + Florida regulated utility. Slower-growth than IPPs but most durable buildout exposure. Dividend cushion.',
    agi_dependency: 'optional',
    buy_zone_max: 60, trim_zone_min: 95,
    invalidation_capex_stall: 'Renewables development pace slows; rate-base growth at FPL flattens',
    invalidation_disintermediation: 'Utility competition is regulated — limited disintermediation risk',
  },
  {
    ticker: 'GEV', asset_name: 'GE Vernova',
    category: 'power_generation', value_chain_layer: 'enabling',
    thesis: 'GE spinoff. Gas turbines + grid equipment + onshore wind. The shovel for the shovel — power gen needs equipment.',
    agi_dependency: 'core',
    buy_zone_max: 260, trim_zone_min: 500,
    invalidation_capex_stall: 'Gas turbine orders contract; grid investment pauses',
    invalidation_disintermediation: 'Siemens Energy + Mitsubishi Heavy Industries compete on turbines; less moat than at the silicon layer',
  },

  // ── Networking + optical ──
  {
    ticker: 'ANET', asset_name: 'Arista Networks',
    category: 'networking_optical', value_chain_layer: 'enabling',
    thesis: 'AI networking incumbent. 400G/800G ethernet for hyperscaler east-west traffic. Direct relationships with MSFT, META, oracular roadmap visibility.',
    agi_dependency: 'core',
    buy_zone_max: 90, trim_zone_min: 140,
    invalidation_capex_stall: 'Hyperscaler network spend contracts',
    invalidation_disintermediation: 'NVDA InfiniBand wins 800G+ generations (currently splitting market)',
  },
  {
    ticker: 'COHR', asset_name: 'Coherent Corp',
    category: 'networking_optical', value_chain_layer: 'enabling',
    thesis: 'II-VI / Coherent merger. Optical components (lasers, transceivers) for AI networking. Pure-play optical buildout exposure.',
    agi_dependency: 'core',
    buy_zone_max: 70, trim_zone_min: 140,
    invalidation_capex_stall: 'Optical transceiver demand softens',
    invalidation_disintermediation: 'Co-packaged optics (CPO) commoditizes the discrete transceiver market — could go either way for COHR',
  },
  {
    ticker: 'LITE', asset_name: 'Lumentum',
    category: 'networking_optical', value_chain_layer: 'enabling',
    thesis: 'Optical components for hyperscaler interconnect — co-packaged optics is the thesis. Already in Leopold book ($479M new position Q4 2025).',
    agi_dependency: 'core',
    buy_zone_max: 65, trim_zone_min: 130,
    invalidation_capex_stall: 'Optical buildout slows',
    invalidation_disintermediation: 'CPO innovation cycle favors integrated players (NVDA, BRCM) over standalone components',
  },
  {
    ticker: 'CIEN', asset_name: 'Ciena',
    category: 'networking_optical', value_chain_layer: 'enabling',
    thesis: 'Datacenter interconnect (DCI) — long-haul + metro between DCs. Less crowded than the in-DC AI-narrative names.',
    agi_dependency: 'optional',
    buy_zone_max: 55, trim_zone_min: 100,
    invalidation_capex_stall: 'Inter-DC bandwidth demand grows slower than expected',
    invalidation_disintermediation: 'Cisco / Juniper / Nokia win DCI share',
  },

  // ── Datacenter capacity ──
  {
    ticker: 'EQIX', asset_name: 'Equinix',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'Global colocation REIT. Slow-growth at high rates but premium scale + interconnection density.',
    agi_dependency: 'optional',
    buy_zone_max: 700, trim_zone_min: 1100,
    invalidation_capex_stall: 'Hyperscaler self-build cannibalizes colo growth',
    invalidation_disintermediation: 'Power constraints force AI workloads to large hyperscale campuses outside Equinix footprint',
  },
  {
    ticker: 'DLR', asset_name: 'Digital Realty Trust',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'Larger DC REIT than EQIX in absolute capacity. More hyperscale-tilted; lower interconnection premium than EQIX.',
    agi_dependency: 'optional',
    buy_zone_max: 130, trim_zone_min: 220,
    invalidation_capex_stall: 'Hyperscaler self-build cannibalizes colo demand',
    invalidation_disintermediation: 'Same as EQIX',
  },
  {
    ticker: 'CRWV', asset_name: 'CoreWeave',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'Merchant AI cloud. Already in Leopold book at ~14% AUM. Volatile but pure-play. Customer concentration risk (heavy MSFT/Anthropic).',
    agi_dependency: 'core',
    buy_zone_max: 70, trim_zone_min: 200,
    invalidation_capex_stall: 'AI compute demand cools; merchant cloud margin compression',
    invalidation_disintermediation: 'Hyperscalers undercut merchant cloud pricing using internal silicon; Anthropic / OpenAI build own infra',
  },
  {
    ticker: 'ORCL', asset_name: 'Oracle',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: '$348B DC build commitment tied to OpenAI / Stargate. Highest single-customer concentration risk in the watchlist (Ed Zitron / Just Dario short thesis).',
    agi_dependency: 'core',
    buy_zone_max: 130, trim_zone_min: 250,
    invalidation_capex_stall: 'OpenAI revenue cannot service the $75B/yr commitment Ellison signed',
    invalidation_disintermediation: 'OpenAI shifts capacity to alternatives (Google TPU, MSFT) faster than expected',
    notes: 'High-beta to OpenAI execution; sized accordingly',
  },
  {
    ticker: 'IREN', asset_name: 'IREN Limited',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'Hybrid bitcoin miner + AI cloud / GPU rental. 50 EH/s mining + 810 MW operating DC capacity. Hybrid optionality.',
    agi_dependency: 'core',
    buy_zone_max: 13, trim_zone_min: 40,
    invalidation_capex_stall: 'AI GPU rental rates collapse; mining economics weak',
    invalidation_disintermediation: 'Other miners pivot faster; NVDA direct sales bypass GPU-rental tier',
  },
  {
    ticker: 'APLD', asset_name: 'Applied Digital',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'BTC-miner pivoting to AI HPC. Speculative — execution risk on conversion.',
    agi_dependency: 'core',
    buy_zone_max: 9, trim_zone_min: 25,
    invalidation_capex_stall: 'AI conversion stalls; HPC tenant pipeline weak',
    invalidation_disintermediation: 'Larger DC operators (CRWV, CORZ) win HPC tenants',
  },
  {
    ticker: 'CORZ', asset_name: 'Core Scientific',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'CoreWeave anchor tenant (~590 MW contracted); Leopold Aschenbrenner via Situational Awareness owns 9.4% (filed 13D). Mining-to-AI transition story. See full dossier.',
    agi_dependency: 'core',
    buy_zone_max: 14, trim_zone_min: 40,
    invalidation_capex_stall: 'CoreWeave demand contracts; new tenant pipeline weak',
    invalidation_disintermediation: 'CoreWeave brings infra in-house post-merger termination; CORZ loses anchor',
    notes: 'See /assets/CORZ for full dossier',
  },
  {
    ticker: 'CIFR', asset_name: 'Cipher Mining',
    category: 'datacenter_capacity', value_chain_layer: 'application',
    thesis: 'BTC-miner with Texas power portfolio. 168 MW / 10-year AI hosting agreement with Fluidstack. ~2.4 GW pipeline.',
    agi_dependency: 'core',
    buy_zone_max: 9, trim_zone_min: 25,
    invalidation_capex_stall: 'Fluidstack contract under-delivers; pipeline conversion slow',
    invalidation_disintermediation: 'Other Texas DC operators win incremental tenants',
  },

  // ── Robotics silicon ──
  {
    ticker: 'TI', asset_name: 'Texas Instruments',
    category: 'robotics_silicon', value_chain_layer: 'foundational',
    thesis: 'Largest analog motor / power vendor (~20% global analog share). Auto + industrial = ~75% of revenue. Cyclically depressed; structurally exposed to robotics ramp 3–7 years out. See robotics-silicon dossier.',
    agi_dependency: 'core',
    buy_zone_max: 170, trim_zone_min: 260,
    invalidation_capex_stall: 'Industrial recession deeper than expected; robotics ramp delays past 2030',
    invalidation_disintermediation: 'China analog (Will Semi, GigaDevice) takes share at scale',
    notes: 'See robotics-silicon dossier on /assets/NVDA',
  },
  {
    ticker: 'ADI', asset_name: 'Analog Devices',
    category: 'robotics_silicon', value_chain_layer: 'foundational',
    thesis: 'Sensor signal chains + precision motor control. Higher industrial mix than TI; better margins.',
    agi_dependency: 'core',
    buy_zone_max: 200, trim_zone_min: 300,
    invalidation_capex_stall: 'Same as TI',
    invalidation_disintermediation: 'Same as TI',
  },
  {
    ticker: '6758.T', asset_name: 'Sony Group',
    category: 'robotics_silicon', value_chain_layer: 'foundational',
    thesis: 'Image sensor near-monopoly (~50% global share). Robotics + AV vision driver. Diversified consumer business muddies signal — but image-sensor segment alone justifies the multiple.',
    agi_dependency: 'core',
    buy_zone_max: 2400, trim_zone_min: 3800,
    invalidation_capex_stall: 'Smartphone + auto camera demand softens',
    invalidation_disintermediation: 'Apple internalizes sensor design; Samsung gains share',
    notes: 'Buy/trim zones in JPY',
  },
  {
    ticker: 'IFX.DE', asset_name: 'Infineon Technologies',
    category: 'robotics_silicon', value_chain_layer: 'foundational',
    thesis: '#1 auto silicon globally. SiC + GaN exposure for high-efficiency power. EU listing, less crowded than US peers.',
    agi_dependency: 'core',
    buy_zone_max: 28, trim_zone_min: 50,
    invalidation_capex_stall: 'Auto cycle weakens; SiC volume ramp slower',
    invalidation_disintermediation: 'Wolfspeed / OnSemi take SiC share',
    notes: 'Buy/trim zones in EUR',
  },
  {
    ticker: 'STM', asset_name: 'STMicroelectronics',
    category: 'robotics_silicon', value_chain_layer: 'foundational',
    thesis: 'Motor drivers, MCUs, MEMS sensors. Industrial + auto exposure.',
    agi_dependency: 'core',
    buy_zone_max: 20, trim_zone_min: 40,
    invalidation_capex_stall: 'Same as TI / ADI',
    invalidation_disintermediation: 'Same as TI / ADI',
  },

  // ── Robotics OEM ──
  {
    ticker: 'TSLA', asset_name: 'Tesla',
    category: 'robotics_oem', value_chain_layer: 'application',
    thesis: 'Optimus humanoid + FSD chip vertical integration. Highest single-stock beta to humanoid timeline. Auto cashflow funds the robotics moonshot.',
    agi_dependency: 'core',
    buy_zone_max: 200, trim_zone_min: 400,
    invalidation_capex_stall: 'Optimus production fails to scale (target: 1000+ units 2026)',
    invalidation_disintermediation: 'Figure / Apptronik / Chinese humanoids (Unitree, Xiaomi) win commercial scale first',
  },
  {
    ticker: 'FANUY', asset_name: 'Fanuc',
    category: 'robotics_oem', value_chain_layer: 'application',
    thesis: 'Industrial robotics oligopolist. Stable but slow-growth. Commodity exposure to global capex.',
    agi_dependency: 'optional',
    buy_zone_max: 11, trim_zone_min: 22,
    invalidation_capex_stall: 'Industrial automation capex stalls',
    invalidation_disintermediation: 'Chinese robot OEMs (e.g., Estun) take low-end share',
  },
  {
    ticker: 'ABBN.SW', asset_name: 'ABB',
    category: 'robotics_oem', value_chain_layer: 'application',
    thesis: 'Robotics + electrification + automation. European listing. Diversified industrial.',
    agi_dependency: 'optional',
    buy_zone_max: 40, trim_zone_min: 65,
    invalidation_capex_stall: 'Industrial spending contracts',
    invalidation_disintermediation: 'Same as Fanuc',
    notes: 'Buy/trim zones in CHF',
  },

  // ── Specialty materials ──
  {
    ticker: '2802.T', asset_name: 'Ajinomoto',
    category: 'specialty_materials', value_chain_layer: 'foundational',
    thesis: 'ABF (Ajinomoto Build-up Film) ~95–99% global monopoly — the dielectric build-up film between substrate layers in EVERY flip-chip BGA package on EVERY high-performance AI chip. SemiAnalysis has flagged this as one of the cleanest single-name bottleneck longs in AI supply chain. Originated as side-product of MSG amino-acid research.',
    agi_dependency: 'core',
    buy_zone_max: 5000, trim_zone_min: 8500,
    invalidation_capex_stall: 'Advanced packaging volume contracts',
    invalidation_disintermediation: 'Effectively impossible — substitute materials would take 5+ years to qualify into existing flip-chip processes',
    notes: 'Same Ajinomoto that makes MSG. Buy/trim in JPY.',
  },
  {
    ticker: 'TSEM', asset_name: 'Tower Semiconductor',
    category: 'specialty_materials', value_chain_layer: 'foundational',
    thesis: 'Specialty foundry for analog, RF, sensors. SK Hynix + Intel partnerships. Already in Leopold book.',
    agi_dependency: 'core',
    buy_zone_max: 35, trim_zone_min: 60,
    invalidation_capex_stall: 'Specialty silicon demand softens',
    invalidation_disintermediation: 'Chinese specialty foundries gain qualification',
  },
  {
    ticker: 'WOLF', asset_name: 'Wolfspeed',
    category: 'specialty_materials', value_chain_layer: 'foundational',
    thesis: 'SiC monopoly for high-efficiency power electronics (EV, DC power, motor drives). Volatile — execution-risk-heavy.',
    agi_dependency: 'core',
    buy_zone_max: 4, trim_zone_min: 20,
    invalidation_capex_stall: 'EV + DC demand softens; SiC capacity oversupply',
    invalidation_disintermediation: 'Infineon / OnSemi take share at scale',
    notes: 'Speculative — sized small',
  },

  // ── Cooling / electrical ──
  {
    ticker: 'VRT', asset_name: 'Vertiv Holdings',
    category: 'cooling_electrical', value_chain_layer: 'enabling',
    thesis: 'DC cooling, power distribution, UPS. Cleanest pure-play "DC infrastructure" name outside silicon. Liquid-cooling ramp is direct AI exposure.',
    agi_dependency: 'core',
    buy_zone_max: 90, trim_zone_min: 160,
    invalidation_capex_stall: 'Hyperscaler DC build slows',
    invalidation_disintermediation: 'Schneider Electric (private equity competitor) takes liquid-cooling share',
  },
  {
    ticker: 'CARR', asset_name: 'Carrier Global',
    category: 'cooling_electrical', value_chain_layer: 'enabling',
    thesis: 'HVAC for DCs + commercial buildings. Less concentrated than VRT but bigger TAM.',
    agi_dependency: 'optional',
    buy_zone_max: 60, trim_zone_min: 90,
    invalidation_capex_stall: 'Commercial construction softens',
    invalidation_disintermediation: 'Trane / Lennox / Daikin compete on residential + commercial',
  },
  {
    ticker: 'ETN', asset_name: 'Eaton',
    category: 'cooling_electrical', value_chain_layer: 'enabling',
    thesis: 'Power management, switchgear, DC electrical. Diversified industrial — direct DC + grid exposure.',
    agi_dependency: 'optional',
    buy_zone_max: 300, trim_zone_min: 440,
    invalidation_capex_stall: 'Industrial + DC capex contracts',
    invalidation_disintermediation: 'Schneider / ABB compete on switchgear',
  },

  // ── Semicap ──
  {
    ticker: 'AEHR', asset_name: 'Aehr Test Systems',
    category: 'semicap', value_chain_layer: 'enabling',
    thesis: 'Test systems for SiC + analog. Tiny but high-beta to Wolfspeed thesis.',
    agi_dependency: 'core',
    buy_zone_max: 9, trim_zone_min: 25,
    invalidation_capex_stall: 'SiC capacity build slows',
    invalidation_disintermediation: 'Larger semicap players (KLA, Teradyne) enter test segment',
    notes: 'Speculative — sized small',
  },
  {
    ticker: 'KLAC', asset_name: 'KLA Corporation',
    category: 'semicap', value_chain_layer: 'foundational',
    thesis: 'Process control monopoly in semis (defect inspection). Fourth tool alongside ASML / AMAT / LRCX. Every fab needs KLA.',
    agi_dependency: 'core',
    buy_zone_max: 620, trim_zone_min: 900,
    invalidation_capex_stall: 'Semicap capex pause >2 quarters',
    invalidation_disintermediation: 'Effectively impossible — no competing process-control vendor at advanced nodes',
  },
];

async function main() {
  console.log(`Seeding buildout watchlist with ${SEEDS.length} names...\n`);
  let inserted = 0;
  let updated = 0;

  for (const s of SEEDS) {
    const { data: existing } = await supabase
      .from('buildout_watchlist').select('id').eq('ticker', s.ticker).maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('buildout_watchlist')
        .update({ ...s, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) console.error(`  ${s.ticker}: ${error.message}`);
      else { console.log(`  ${s.ticker.padEnd(10)} updated  [${s.category}]`); updated++; }
    } else {
      const { error } = await supabase.from('buildout_watchlist').insert(s);
      if (error) console.error(`  ${s.ticker}: ${error.message}`);
      else { console.log(`  ${s.ticker.padEnd(10)} inserted [${s.category}]`); inserted++; }
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${updated} updated.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
