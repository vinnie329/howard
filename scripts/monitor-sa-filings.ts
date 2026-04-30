/**
 * monitor-sa-filings.ts — Daily watch on Situational Awareness LP SEC filings.
 *
 * Detects any new SEC filings (13F-HR, 13D, 13D/A, 13G, 13G/A) since the
 * last ingested set, parses non-13F filings for issuer + ownership detail,
 * and writes to `insider_filings`. The daily briefing reads from this
 * table to surface SA moves at the top.
 *
 * Position-level 13F data is still ingested separately by fetch-13f.ts.
 *
 *   npx tsx scripts/monitor-sa-filings.ts
 *   npx tsx scripts/monitor-sa-filings.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SA_CIK = '0002045724';
const SA_SLUG = 'situational-awareness';
const USER_AGENT = 'Howard Research vinnie329@gmail.com';
const TRACKED_FORMS = ['13F-HR', '13F-HR/A', 'SCHEDULE 13D', 'SCHEDULE 13D/A', 'SCHEDULE 13G', 'SCHEDULE 13G/A'];

const dryRun = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Filing {
  form: string;
  filingDate: string;
  reportDate: string;
  accessionNumber: string;
  primaryDocument: string;
}

interface ParsedOwnership {
  issuer_name?: string;
  issuer_cusip?: string;
  shares_owned?: number;
  pct_of_class?: number;
  cost_basis?: number;
  event_date?: string;
  purpose_text?: string;
}

async function fetchSubmissions(cik: string): Promise<Filing[]> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`SEC submissions API failed: ${res.status}`);
  const json = await res.json();
  const recent = json.filings?.recent;
  if (!recent) return [];
  const out: Filing[] = [];
  for (let i = 0; i < recent.form.length; i++) {
    out.push({
      form: recent.form[i],
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate[i] || '',
      accessionNumber: recent.accessionNumber[i],
      primaryDocument: recent.primaryDocument[i] || '',
    });
  }
  return out;
}

function buildDocUrl(cik: string, accession: string, primaryDoc: string): string {
  const cikInt = parseInt(cik, 10).toString();
  const accClean = accession.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accClean}/${primaryDoc}`;
}

async function fetch13DXml(cik: string, accession: string): Promise<string | null> {
  const cikInt = parseInt(cik, 10).toString();
  const accClean = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accClean}/primary_doc.xml`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  return res.text();
}

function parse13D(xml: string): ParsedOwnership {
  const out: ParsedOwnership = {};
  const get = (re: RegExp): string | undefined => {
    const m = xml.match(re);
    return m ? m[1].trim() : undefined;
  };

  out.issuer_name = get(/<issuerName>([^<]+)<\/issuerName>/);
  out.issuer_cusip = get(/<issuerCUSIP>([^<]+)<\/issuerCUSIP>/);
  const eventDate = get(/<dateOfEvent>([^<]+)<\/dateOfEvent>/);
  if (eventDate) {
    // SEC stores as MM/DD/YYYY — normalize to YYYY-MM-DD
    const [mm, dd, yyyy] = eventDate.split('/');
    if (mm && dd && yyyy) out.event_date = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // The <reportingPersons> block has multiple <reportingPersonInfo> entries with
  // the same aggregate numbers (joint filers). Take the first valid one.
  const sharesStr = get(/<aggregateAmountOwned>([\d.]+)<\/aggregateAmountOwned>/);
  if (sharesStr) out.shares_owned = Math.round(parseFloat(sharesStr));
  const pctStr = get(/<percentOfClass>([\d.]+)<\/percentOfClass>/);
  if (pctStr) out.pct_of_class = parseFloat(pctStr);

  // Item 3: funds source has the cost basis
  const fundsSource = get(/<fundsSource>([\s\S]+?)<\/fundsSource>/);
  if (fundsSource) {
    const costMatch = fundsSource.match(/\$([\d,]+(?:\.\d+)?)/);
    if (costMatch) out.cost_basis = parseFloat(costMatch[1].replace(/,/g, ''));
  }

  // Item 4: purpose narrative (truncate to keep it sane)
  const purpose = get(/<transactionPurpose>([\s\S]+?)<\/transactionPurpose>/);
  if (purpose) out.purpose_text = purpose.slice(0, 4000).trim();

  return out;
}

async function main() {
  console.log(`=== SA Filing Monitor (${dryRun ? 'DRY RUN' : 'APPLY'}) ===`);

  const { data: fund, error: fundErr } = await supabase
    .from('funds').select('id, name').eq('slug', SA_SLUG).single();
  if (fundErr || !fund) { console.error(`Fund "${SA_SLUG}" not found`); process.exit(1); }
  console.log(`Fund: ${fund.name} (${fund.id})\n`);

  // Pull SEC filings
  const allFilings = await fetchSubmissions(SA_CIK);
  const tracked = allFilings.filter((f) => TRACKED_FORMS.includes(f.form));
  console.log(`SEC: ${allFilings.length} total filings, ${tracked.length} match tracked forms`);

  // What do we already have?
  const { data: known } = await supabase
    .from('insider_filings')
    .select('accession_number')
    .eq('fund_id', fund.id);
  const knownAccessions = new Set((known || []).map((r) => r.accession_number));
  console.log(`DB: ${knownAccessions.size} filings already on file`);

  const newFilings = tracked.filter((f) => !knownAccessions.has(f.accessionNumber));
  console.log(`\n${newFilings.length} NEW filing(s) to ingest:\n`);

  if (newFilings.length === 0) {
    console.log('Nothing new. Done.');
    return;
  }

  for (const f of newFilings) {
    const docUrl = buildDocUrl(SA_CIK, f.accessionNumber, f.primaryDocument);
    console.log(`  ${f.form.padEnd(18)} filed=${f.filingDate} period=${f.reportDate || '-'} acc=${f.accessionNumber}`);

    const row: Record<string, unknown> = {
      fund_id: fund.id,
      form_type: f.form,
      filing_date: f.filingDate,
      period_of_report: f.reportDate || null,
      accession_number: f.accessionNumber,
      primary_doc_url: docUrl,
    };

    // Parse 13D-style filings for issuer detail
    if (f.form.includes('13D') || f.form.includes('13G')) {
      const xml = await fetch13DXml(SA_CIK, f.accessionNumber);
      if (xml) {
        const parsed = parse13D(xml);
        Object.assign(row, parsed);
        if (parsed.issuer_name) console.log(`    issuer: ${parsed.issuer_name} (cusip ${parsed.issuer_cusip})`);
        if (parsed.shares_owned) console.log(`    ${parsed.shares_owned.toLocaleString()} sh = ${parsed.pct_of_class}% of class`);
        if (parsed.cost_basis) console.log(`    cost basis: $${(parsed.cost_basis / 1e6).toFixed(1)}M`);
      }
    }

    if (!dryRun) {
      const { error } = await supabase.from('insider_filings').insert(row);
      if (error) console.error(`    INSERT ERROR: ${error.message}`);
      else console.log(`    inserted ✓`);
    }
  }

  console.log(`\nDone. ${newFilings.length} filing(s) ${dryRun ? 'would be' : 'were'} recorded.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
