import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EDGAR_BASE = 'https://data.sec.gov';
const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
const USER_AGENT = 'Howard/1.0 (howard-app)';

const FUNDS = [
  {
    name: 'Situational Awareness LP',
    slug: 'situational-awareness',
    cik: '0002045724',
    manager_name: 'Leopold Aschenbrenner',
  },
  {
    name: 'Altimeter Capital Management',
    slug: 'altimeter-capital',
    cik: '0001541617',
    manager_name: 'Brad Gerstner',
  },
];

// CUSIP → ticker mapping (common ones for SA's portfolio)
const CUSIP_TICKER_MAP: Record<string, string> = {
  '458140100': 'INTC',
  '11135F101': 'AVGO',
  '92840M102': 'VST',
  '21872M104': 'CORZQ', // Core Scientific (old CUSIP)
  '21871U103': 'CORZ',
  'Q4689J109': 'IREN',
  '15463X105': 'CEG',
  '78410G104': 'SMH',
  '67066G104': 'NVDA',
  '22161N101': 'CRWV',
  '87854U108': 'TALO',
  '032654105': 'AMZN',
  '594918104': 'MSFT',
  '30303M102': 'META',
  '02079K305': 'GOOGL',
  '02079K107': 'GOOG',
  '88160R101': 'TSLA',
  '037833100': 'AAPL',
  '09857L108': 'BKNG',
  '023135106': 'AMZN',
  'Y7140J105': 'RGTI',
  '74347G200': 'PSQH',
  'G7700X109': 'RR',
  '74948K104': 'RDW',
  '29670E107': 'EOSE',
  '58463J304': 'MDB',
  '92553P201': 'VRTX',
  '256163106': 'DDOG',
  '82489T104': 'SHOP',
  '49338L103': 'KEYS',
  // SA portfolio additions
  '607828100': 'MOD',     // Modine Manufacturing
  '573874104': 'MRVL',    // Marvell Technology
  '87422Q109': 'TLN',     // Talen Energy
  '92537N108': 'VRT',     // Vertiv Holdings
  '038169207': 'APLD',    // Applied Digital
  '26884L109': 'EQT',     // EQT Corp
  'Q4982L109': 'IREN',    // IREN Limited (alternate CUSIP)
  '92189F676': 'SMH',     // VanEck Semiconductor ETF
  '92189F106': 'SMH',     // VanEck Semiconductor ETF
  'G11448100': 'BTDR',    // Bitdeer Technologies
  '093712AH0': 'BE',      // Bloom Energy (convertible)
  '093712107': 'BE',      // Bloom Energy
  '17253JAA4': 'CIFR',    // Cipher Mining (convertible)
  '17253J106': 'CIFR',    // Cipher Mining
  '19247G107': 'COHR',    // Coherent Corp
  '36317J209': 'GLXY',    // Galaxy Digital
  '44812J104': 'HUT',     // Hut 8 Corp
  '55024UAD1': 'LITE',    // Lumentum Holdings (convertible)
  '55024U109': 'LITE',    // Lumentum Holdings
  '595112103': 'MU',      // Micron Technology
  '767292105': 'RIOT',    // Riot Platforms
  '80004C200': 'SNDK',    // SanDisk
  'G7997R103': 'STX',     // Seagate Technology
  '83418M103': 'SEI',     // Solaris Energy Infrastructure
  '874039100': 'TSM',     // Taiwan Semiconductor
  'M87915274': 'TSEM',    // Tower Semiconductor
  '958102AT2': 'WDC',     // Western Digital (convertible)
  '05614L209': 'BW',      // Babcock & Wilcox
  '09173B107': 'BITF',    // Bitfarms
  '18452B209': 'CLSK',    // CleanSpark
  '456788108': 'INFY',    // Infosys
  '49427F108': 'KRC',     // Kilroy Realty
  '53115L104': 'LBRT',    // Liberty Energy
  '73933G202': 'PSIX',    // Power Solutions International
  '74347M108': 'PUMP',    // ProPetro Holding
  '683344105': 'ONTO',    // Onto Innovation
  'G96115103': 'WFBR',    // WhiteFiber Inc
  // Altimeter Capital portfolio
  '042068205': 'ARM',     // ARM Holdings
  '01609W102': 'BABA',    // Alibaba Group
  '565394103': 'CART',    // Maplebear (Instacart)
  '20717M103': 'CFLT',    // Confluent
  '22266T109': 'CPNG',    // Coupang
  '23804L103': 'DDOG',    // Datadog
  'G0370L116': 'GRAB',    // Grab Holdings
  'G0370L108': 'GRAB',    // Grab Holdings (alt CUSIP)
  '770700102': 'HOOD',    // Robinhood
  '79589L106': 'IOT',     // Samsara
  '58733R102': 'MELI',    // MercadoLibre
  '833445109': 'SNOW',    // Snowflake
  '90353T100': 'UBER',    // Uber Technologies
  '98954M200': 'Z',       // Zillow Group
  '98954M101': 'Z',       // Zillow Group (alt CUSIP)
  '82509L107': 'SHOP',    // Shopify
  '36866J105': 'GMNI',    // Gemini Space Station
  '64119N608': 'NSKU',    // Netskope
  '722304102': 'PDD',     // PDD Holdings
  '70339W104': 'PTRN',    // Pattern Group
  '871607107': 'SNPS',    // Synopsys
  '04626A103': 'ALAB',    // Astera Labs
  '781154109': 'RBRK',    // Rubrik
  '81764X103': 'TTAN',    // ServiceTitan
  '78781J109': 'SAIL',    // SailPoint
  '46090E103': 'QQQ',     // Invesco QQQ Trust
  '26603R106': 'DUOL',    // Duolingo
  'G3643J108': 'FLUT',    // Flutter Entertainment
  'G0370L124': 'AGC',     // Altimeter Growth Corp
  // Altimeter historical holdings
  '79466L302': 'CRM',     // Salesforce
  '64110L106': 'NFLX',    // Netflix
  '98980L101': 'ZM',      // Zoom Video
  '70450Y103': 'PYPL',    // PayPal
  '55087P104': 'LYFT',    // Lyft
  '25809K105': 'DASH',    // DoorDash
  '443573100': 'HUBS',    // HubSpot
  '679295105': 'OKTA',    // Okta
  '67059N108': 'NTNX',    // Nutanix
  '74624M102': 'PSTG',    // Pure Storage
  '268150109': 'DT',      // Dynatrace
  '338307101': 'FIVN',    // Five9
  '771049103': 'RBLX',    // Roblox
  '91332U101': 'U',       // Unity Software
  '888787108': 'TOST',    // Toast
  '90364P105': 'PATH',    // UiPath
  '83406F102': 'SOFI',    // SoFi Technologies
  '81762P102': 'NOW',     // ServiceNow
  '98138H101': 'WDAY',    // Workday
  '910047109': 'UAL',     // United Airlines
  '30212P303': 'EXPE',    // Expedia
  '896945201': 'TRIP',    // TripAdvisor
  '741503403': 'BKNG',    // Booking Holdings (fka Priceline)
  '009066101': 'ABNB',    // Airbnb
  '247361702': 'DAL',     // Delta Air Lines
  '056752108': 'BIDU',    // Baidu
  '22943F100': 'TCOM',    // Trip.com (fka Ctrip)
  '146869102': 'CVNA',    // Carvana
  '26210C104': 'DBX',     // Dropbox
  '852234103': 'SQ',      // Block (fka Square)
  '418100103': 'HCP',     // HashiCorp
  '683712103': 'OPEN',    // Opendoor Technologies
  '94419L101': 'W',       // Wayfair
  '985817105': 'YELP',    // Yelp
  '70614W100': 'PTON',    // Peloton
  '90138F102': 'TWLO',    // Twilio
  '37637K108': 'GTLB',    // GitLab
  '25402D102': 'DOCN',    // DigitalOcean
  '10576N102': 'BRZE',    // Braze
  '747525103': 'QCOM',    // Qualcomm
  '032095101': 'APH',     // Amphenol
  '315616102': 'FFIV',    // F5 Networks
  '24703L202': 'DELL',    // Dell Technologies
  '81141R100': 'SE',      // Sea Ltd
  'G68707101': 'PAGS',    // PagSeguro Digital
  'N14506104': 'ESTC',    // Elastic NV
  '163092109': 'CHGG',    // Chegg
  '399473107': 'GRPN',    // Groupon
  '860897107': 'SFIX',    // Stitch Fix
  '687793109': 'OSCR',    // Oscar Health
  '98936J101': 'ZEN',     // Zendesk
  '60937P106': 'MDB',     // MongoDB (alt CUSIP)
  '22788C105': 'CRWD',    // CrowdStrike
  '226718104': 'CRTO',    // Criteo
  '25862V105': 'DV',      // DoubleVerify
  'G66721104': 'NCLH',    // Norwegian Cruise Line
  'V7780T103': 'RCL',     // Royal Caribbean
  '911363109': 'URI',     // United Rentals
  '171484108': 'CHDN',    // Churchill Downs
  '053774105': 'CAR',     // Avis Budget Group
  '400110102': 'GRUB',    // Grubhub
  '830879102': 'SKYW',    // SkyWest
  '90138Q108': 'ME',      // 23andMe
  '94845U105': 'WBTN',    // Webtoon Entertainment
  '70451X104': 'PAYO',    // Payoneer Global
  '60938K106': 'ML',      // MoneyLion
  '12047B105': 'BMBL',    // Bumble
  '747601201': 'XM',      // Qualtrics
  'M7S64H106': 'MNDY',    // Monday.com
  '001176213': 'MNDY',    // Monday.com (alt CUSIP)
  // Altimeter historical (many delisted/acquired)
  '011659109': 'ALK',     // Alaska Air Group
  '103304101': 'BYD',     // Boyd Gaming
  '13123E500': 'CALD',    // Callidus Software (acquired by SAP)
  '24802Y105': 'DWRE',    // Demandware (acquired by Salesforce)
  '290138205': 'LONG',    // eLong (delisted)
  '31787A507': 'FNSR',    // Finisar (acquired by II-VI)
  '419870100': 'HA',      // Hawaiian Holdings
  '419879101': 'HA',      // Hawaiian Holdings (alt CUSIP)
  '42805T105': 'HTZ',     // Hertz Global Holdings
  'N47279109': 'INXN',    // Interxion (acquired by Digital Realty)
  '594901100': 'MCRS',    // MICROS Systems (acquired by Oracle)
  '64118U108': 'NQ',      // NQ Mobile (delisted)
  '68557K109': 'OWW',     // Orbitz Worldwide (acquired by Expedia)
  '75606N109': 'RP',      // RealPage (acquired by Thoma Bravo)
  '756577102': 'RHT',     // Red Hat (acquired by IBM)
  '848577102': 'SAVE',    // Spirit Airlines
  '848574109': 'SAVE',    // Spirit Airlines (alt CUSIP)
  '87582Y108': 'TNGO',    // Tangoe (delisted)
  '90341W108': 'LCC',     // US Airways Group (merged with AA)
  'N97284108': 'YNDX',    // Yandex NV (delisted)
  '64051M402': 'NEON',    // Neonode
  '02376R102': 'AAL',     // American Airlines
  'M0854Q105': 'ALLT',    // Allot Communications
  '034754101': 'ANGI',    // Angie's List (merged into ANGI)
  '043176106': 'ARUN',    // Aruba Networks (acquired by HPE)
  '206708109': 'CNQR',    // Concur Technologies (acquired by SAP)
  '37951D102': 'ENT',     // Global Eagle Entertainment (delisted)
  '45672H104': 'BLOX',    // Infoblox (acquired)
  '607525102': 'MODN',    // Model N
  'P31076105': 'CPA',     // Copa Holdings
  '37518B102': 'GIMO',    // Gigamon (acquired)
  '57063L107': 'MKTO',    // Marketo (acquired by Adobe)
  '21240E105': 'VLRS',    // Volaris (Controladora Vuela)
  '36118L106': 'FUTU',    // Futu Holdings
  '98954A107': 'Z',       // Zillow (old class)
  '74906P104': 'QUNR',    // Qunar (delisted)
  '10316T104': 'BOX',     // Box
  '87336U105': 'DATA',    // Tableau Software (acquired by Salesforce)
  '01748X102': 'ALGT',    // Allegiant Travel
  'V5633W109': 'MMYT',    // MakeMyTrip
  '625207105': 'MULE',    // MuleSoft (acquired by Salesforce)
  '89686D105': 'TRVG',    // trivago
  '46267X108': 'IQ',      // iQIYI
  '590479135': 'MESA',    // Mesa Air Group (delisted)
  '0G6672104': 'NCLH',    // Norwegian Cruise Line (alt CUSIP)
  '44919P508': 'IAC',     // IAC InterActiveCorp
  '75321W103': 'PACK',    // Ranpak Holdings
  '00183L102': 'ANGI',    // ANGI Homeservices
  '30744W107': 'FTCH',    // Farfetch (delisted)
  'G28302126': 'DGRO',    // Dragoneer Growth Opportunities
  'G28302100': 'DGRO',    // Dragoneer Growth Opportunities
  'G28302118': 'DGRO',    // Dragoneer Growth Opportunities
  '92918V109': 'VRM',     // Vroom (delisted)
  '22266L106': 'COUP',    // Coupa Software (acquired by Thoma Bravo)
  '126677103': 'CVT',     // Cvent (acquired by Blackstone)
  'G2007L105': 'CZOO',    // Cazoo Group (delisted)
  '500767306': 'KWEB',    // KraneShares CSI China Internet ETF
  '53566V106': 'LCTX',    // Lineage Cell Therapeutics
};

interface EdgarFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
}

interface Holding13F {
  company_name: string;
  title_of_class: string;
  cusip: string;
  value: number; // in thousands as reported
  shares: number;
  option_type: string | null;
  investment_discretion: string;
}

async function edgarFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, application/xml, text/xml, */*',
    },
  });
  if (!res.ok) {
    throw new Error(`EDGAR fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return res;
}

async function getFilings(cik: string): Promise<EdgarFiling[]> {
  const url = `${EDGAR_BASE}/submissions/CIK${cik}.json`;
  console.log(`Fetching submissions from ${url}`);
  const res = await edgarFetch(url);
  const data = await res.json();

  const recent = data.filings?.recent;
  if (!recent) {
    throw new Error('No recent filings found');
  }

  const filings: EdgarFiling[] = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '13F-HR') {
      filings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        form: recent.form[i],
      });
    }
  }

  return filings.sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
  );
}

async function getHoldingsFromFiling(
  cik: string,
  accessionNumber: string
): Promise<Holding13F[]> {
  const accessionPath = accessionNumber.replace(/-/g, '');
  const indexUrl = `${EDGAR_ARCHIVES}/${parseInt(cik)}/${accessionPath}/${accessionNumber}-index.htm`;

  console.log(`  Fetching filing index: ${indexUrl}`);
  const indexRes = await edgarFetch(indexUrl);
  const indexHtml = await indexRes.text();

  // Find the raw information table XML file (not the xslForm13F HTML-rendered version)
  // EDGAR lists both xslForm13F_X02/file.xml (HTML view) and file.xml (raw XML)
  // We need the raw XML which has parseable <infoTable> elements
  const allXml = [...indexHtml.matchAll(/href="([^"]*\.xml)"/gi)];

  let infoTableFile: string | null = null;

  // First pass: find raw XML that's not primary_doc and not xslForm13F
  for (const match of allXml) {
    const href = match[1];
    if (!href.includes('primary_doc') && !href.includes('xslForm13F')) {
      infoTableFile = href;
      break;
    }
  }

  // Fallback: if we only found xslForm13F versions, strip the prefix to get raw path
  if (!infoTableFile) {
    for (const match of allXml) {
      const href = match[1];
      if (href.includes('xslForm13F') && !href.includes('primary_doc')) {
        infoTableFile = href.replace(/xslForm13F_X\d+\//, '');
        break;
      }
    }
  }

  if (!infoTableFile) {
    console.error(`  Could not find information table XML in filing index`);
    return [];
  }

  // Handle both absolute paths (/Archives/...) and relative filenames (infotable.xml)
  let xmlUrl: string;
  if (infoTableFile.startsWith('/')) {
    xmlUrl = `https://www.sec.gov${infoTableFile}`;
  } else if (infoTableFile.startsWith('http')) {
    xmlUrl = infoTableFile;
  } else {
    xmlUrl = `${EDGAR_ARCHIVES}/${parseInt(cik)}/${accessionPath}/${infoTableFile}`;
  }
  console.log(`  Fetching holdings XML: ${xmlUrl}`);

  // Small delay to respect EDGAR rate limits
  await new Promise((r) => setTimeout(r, 200));

  const xmlRes = await edgarFetch(xmlUrl);
  const xml = await xmlRes.text();

  return parseHoldingsXml(xml);
}

function parseHoldingsXml(xml: string): Holding13F[] {
  const holdings: Holding13F[] = [];

  // Match each <infoTable> entry (namespace-agnostic)
  const entryPattern =
    /<(?:ns1:|)infoTable>[\s\S]*?<\/(?:ns1:|)infoTable>/gi;
  const entries = xml.match(entryPattern) || [];

  for (const entry of entries) {
    const get = (tag: string): string => {
      const match = entry.match(
        new RegExp(`<(?:ns1:|)${tag}>([^<]*)<\/(?:ns1:|)${tag}>`, 'i')
      );
      return match ? match[1].trim() : '';
    };

    const nameOfIssuer = get('nameOfIssuer');
    const titleOfClass = get('titleOfClass');
    const cusip = get('cusip');
    const value = parseInt(get('value')) || 0;
    const shares = parseInt(get('sshPrnamt')) || 0;
    const putCall = get('putCall');
    const discretion = get('investmentDiscretion') || 'SOLE';

    holdings.push({
      company_name: nameOfIssuer,
      title_of_class: titleOfClass,
      cusip,
      value,
      shares,
      option_type: putCall ? putCall.toLowerCase() : null,
      investment_discretion: discretion,
    });
  }

  return holdings;
}

function resolveTickerFromCusip(cusip: string, companyName: string): string | null {
  if (CUSIP_TICKER_MAP[cusip]) {
    return CUSIP_TICKER_MAP[cusip];
  }
  // Try to infer from company name for common ones
  const nameUpper = companyName.toUpperCase();
  if (nameUpper.includes('INTEL')) return 'INTC';
  if (nameUpper.includes('BROADCOM')) return 'AVGO';
  if (nameUpper.includes('VISTRA')) return 'VST';
  if (nameUpper.includes('CORE SCIENTIFIC')) return 'CORZ';
  if (nameUpper.includes('CONSTELLATION ENERGY')) return 'CEG';
  if (nameUpper.includes('NVIDIA')) return 'NVDA';
  if (nameUpper.includes('COREWEAVE')) return 'CRWV';
  if (nameUpper.includes('AMAZON')) return 'AMZN';
  if (nameUpper.includes('MICROSOFT')) return 'MSFT';
  if (nameUpper.includes('TESLA')) return 'TSLA';
  if (nameUpper.includes('APPLE')) return 'AAPL';
  if (nameUpper.includes('ALPHABET') || nameUpper.includes('GOOGLE')) return 'GOOGL';
  if (nameUpper.includes('META')) return 'META';
  if (nameUpper.includes('VANECK') && nameUpper.includes('SEMI')) return 'SMH';
  console.log(`    Unknown CUSIP ${cusip} for ${companyName}`);
  return null;
}

async function computeShareChanges(
  fundId: string,
  filingDate: string,
  holdings: Array<{
    cusip: string;
    ticker: string | null;
    company_name: string;
    title_of_class: string;
    value: number;
    shares: number;
    option_type: string | null;
    investment_discretion: string;
  }>
) {
  // Get the previous quarter's holdings for this fund
  const { data: prevHoldings } = await supabase
    .from('holdings')
    .select('cusip, shares, option_type')
    .eq('fund_id', fundId)
    .lt('filing_date', filingDate)
    .order('filing_date', { ascending: false });

  // Build a map of previous holdings (most recent filing before this one)
  const prevMap = new Map<string, number>();
  const seenDates = new Set<string>();
  if (prevHoldings && prevHoldings.length > 0) {
    for (const h of prevHoldings) {
      // Use cusip + option_type as key to differentiate equity vs options
      const key = `${h.cusip}:${h.option_type || 'equity'}`;
      if (!prevMap.has(key)) {
        prevMap.set(key, h.shares);
      }
    }
  }

  return holdings.map((h) => {
    const key = `${h.cusip}:${h.option_type || 'equity'}`;
    const prevShares = prevMap.get(key);

    let share_change = 0;
    let change_type = 'unchanged';

    if (prevShares === undefined) {
      // New position
      share_change = h.shares;
      change_type = 'new';
    } else if (h.shares > prevShares) {
      share_change = h.shares - prevShares;
      change_type = 'increased';
    } else if (h.shares < prevShares) {
      share_change = h.shares - prevShares;
      change_type = 'decreased';
    } else {
      share_change = 0;
      change_type = 'unchanged';
    }

    return {
      fund_id: fundId,
      filing_date: filingDate,
      cusip: h.cusip,
      ticker: h.ticker,
      company_name: h.company_name,
      title_of_class: h.title_of_class,
      value: h.value,
      shares: h.shares,
      share_change,
      change_type,
      option_type: h.option_type,
      investment_discretion: h.investment_discretion,
    };
  });
}

async function main() {
  console.log('=== Howard 13F Filing Importer ===\n');

  for (const fund of FUNDS) {
    console.log(`\nProcessing: ${fund.name} (CIK: ${fund.cik})`);

    // Upsert the fund
    const { data: fundRow, error: fundError } = await supabase
      .from('funds')
      .upsert(
        {
          name: fund.name,
          slug: fund.slug,
          cik: fund.cik,
          manager_name: fund.manager_name,
        },
        { onConflict: 'cik' }
      )
      .select()
      .single();

    if (fundError || !fundRow) {
      console.error(`  Error upserting fund:`, fundError?.message);
      continue;
    }

    console.log(`  Fund ID: ${fundRow.id}`);

    // Check which filings we already have
    const { data: existingFilings } = await supabase
      .from('holdings')
      .select('filing_date')
      .eq('fund_id', fundRow.id)
      .order('filing_date', { ascending: true });

    const existingDates = new Set(
      (existingFilings || []).map((f: { filing_date: string }) => f.filing_date)
    );

    // Get all 13F filings from EDGAR
    const filings = await getFilings(fund.cik);
    console.log(`  Found ${filings.length} 13F-HR filings`);

    for (const filing of filings) {
      const reportDate = filing.reportDate;

      if (existingDates.has(reportDate)) {
        console.log(`  Skipping ${reportDate} (already imported)`);
        continue;
      }

      console.log(`\n  Processing filing: ${reportDate} (filed: ${filing.filingDate})`);

      // Rate limit: EDGAR asks for max 10 requests/second
      await new Promise((r) => setTimeout(r, 300));

      const rawHoldings = await getHoldingsFromFiling(fund.cik, filing.accessionNumber);
      console.log(`  Found ${rawHoldings.length} holdings`);

      if (rawHoldings.length === 0) continue;

      // Deduplicate by cusip + option_type (some filings list same security multiple times)
      const dedupMap = new Map<string, Holding13F>();
      for (const h of rawHoldings) {
        const key = `${h.cusip}:${h.option_type || 'equity'}`;
        const existing = dedupMap.get(key);
        if (existing) {
          // Merge: sum values and shares for same position
          existing.value += h.value;
          existing.shares += h.shares;
          console.log(`    Merged duplicate: ${h.company_name} (${h.cusip}) - ${h.shares} shares`);
        } else {
          dedupMap.set(key, { ...h });
        }
      }
      const dedupedHoldings = Array.from(dedupMap.values());
      if (dedupedHoldings.length < rawHoldings.length) {
        console.log(`  Deduplicated: ${rawHoldings.length} → ${dedupedHoldings.length} holdings`);
      }

      // Resolve tickers and prepare records
      const holdingsWithTickers = dedupedHoldings.map((h) => ({
        ...h,
        ticker: resolveTickerFromCusip(h.cusip, h.company_name),
      }));

      // Compute share changes relative to previous quarter
      const records = await computeShareChanges(fundRow.id, reportDate, holdingsWithTickers);

      // Delete any existing holdings for this fund+date (idempotent re-runs)
      await supabase
        .from('holdings')
        .delete()
        .eq('fund_id', fundRow.id)
        .eq('filing_date', reportDate);

      // Insert holdings
      const { error: insertError } = await supabase.from('holdings').insert(records);

      if (insertError) {
        console.error(`  Error inserting holdings for ${reportDate}:`, insertError.message);
      } else {
        const totalValue = records.reduce((sum, r) => sum + r.value, 0);
        console.log(
          `  Inserted ${records.length} holdings for ${reportDate} (total value: $${(totalValue / 1000).toFixed(1)}M)`
        );

        // Log position summary
        for (const r of records) {
          const ticker = r.ticker || r.cusip;
          const optLabel = r.option_type ? ` (${r.option_type})` : '';
          const changeLabel =
            r.change_type === 'new'
              ? ' [NEW]'
              : r.change_type === 'increased'
                ? ` [+${r.share_change}]`
                : r.change_type === 'decreased'
                  ? ` [${r.share_change}]`
                  : '';
          console.log(
            `    ${ticker}${optLabel}: ${r.shares.toLocaleString()} shares, $${(r.value / 1000).toFixed(1)}M${changeLabel}`
          );
        }
      }
    }

    // Check for sold positions (in previous quarter but not in latest)
    // This is handled implicitly — if a position disappears, it's simply not in the new filing
    // We don't insert "sold" records since 13Fs only report current holdings
  }

  // Backfill: update any holdings rows with NULL tickers using the CUSIP map
  console.log('\n--- Backfilling missing tickers from CUSIP map ---');
  const { data: nullTickers } = await supabase
    .from('holdings')
    .select('id, cusip, company_name')
    .is('ticker', null);

  if (nullTickers && nullTickers.length > 0) {
    let updated = 0;
    for (const row of nullTickers) {
      const ticker = CUSIP_TICKER_MAP[row.cusip];
      if (ticker) {
        await supabase.from('holdings').update({ ticker }).eq('id', row.id);
        updated++;
      }
    }
    console.log(`  Updated ${updated} of ${nullTickers.length} rows with NULL tickers`);
  } else {
    console.log('  No NULL tickers to backfill');
  }

  console.log('\n=== Done! ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
