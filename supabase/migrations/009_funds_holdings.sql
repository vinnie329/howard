-- Funds table: tracks institutional investors with 13F filings
CREATE TABLE IF NOT EXISTS funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  cik text UNIQUE NOT NULL,
  manager_name text,
  source_id uuid REFERENCES sources(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Holdings table: individual positions from 13F filings
CREATE TABLE IF NOT EXISTS holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  filing_date date NOT NULL,
  cusip text NOT NULL,
  ticker text,
  company_name text NOT NULL,
  title_of_class text,
  value bigint NOT NULL,
  shares bigint NOT NULL,
  share_change bigint DEFAULT 0,
  change_type text DEFAULT 'unchanged',
  option_type text,
  investment_discretion text DEFAULT 'SOLE',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_change_type CHECK (change_type IN ('new', 'increased', 'decreased', 'sold', 'unchanged')),
  CONSTRAINT chk_option_type CHECK (option_type IS NULL OR option_type IN ('put', 'call'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holdings_fund_id ON holdings(fund_id);
CREATE INDEX IF NOT EXISTS idx_holdings_filing_date ON holdings(filing_date);
CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);
CREATE INDEX IF NOT EXISTS idx_holdings_cusip ON holdings(cusip);
CREATE INDEX IF NOT EXISTS idx_holdings_fund_filing ON holdings(fund_id, filing_date);
CREATE INDEX IF NOT EXISTS idx_funds_cik ON funds(cik);

-- RLS
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on funds" ON funds FOR SELECT USING (true);
CREATE POLICY "Service role write access on funds" ON funds FOR ALL USING (true);

CREATE POLICY "Public read access on holdings" ON holdings FOR SELECT USING (true);
CREATE POLICY "Service role write access on holdings" ON holdings FOR ALL USING (true);
