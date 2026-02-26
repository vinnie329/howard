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

      // Resolve tickers and prepare records
      const holdingsWithTickers = rawHoldings.map((h) => ({
        ...h,
        ticker: resolveTickerFromCusip(h.cusip, h.company_name),
      }));

      // Compute share changes relative to previous quarter
      const records = await computeShareChanges(fundRow.id, reportDate, holdingsWithTickers);

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

  console.log('\n=== Done! ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
