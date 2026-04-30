-- Insider/ownership filings (13D, 13D/A, 13G, 13G/A) — non-13F SEC disclosures
-- where a fund crosses ownership thresholds in a single issuer.
--
-- Also records the *fact* of a 13F-HR filing for daily-briefing flagging,
-- with position-level data still populated separately by fetch-13f.ts.

CREATE TABLE IF NOT EXISTS insider_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,                      -- '13F-HR', '13D', '13D/A', '13G', '13G/A', etc.
  filing_date DATE NOT NULL,
  event_date DATE,                              -- date triggering the filing (13D)
  period_of_report DATE,                        -- 13F covers this period
  accession_number TEXT NOT NULL UNIQUE,
  primary_doc_url TEXT,
  -- 13D-style fields (NULL for 13F-HR)
  issuer_name TEXT,
  issuer_ticker TEXT,
  issuer_cusip TEXT,
  shares_owned BIGINT,
  pct_of_class NUMERIC(8, 4),
  cost_basis NUMERIC(18, 2),
  prior_pct NUMERIC(8, 4),                      -- for amendments — what the prior 13D reported
  purpose_text TEXT,                            -- Item 4 narrative
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insider_filings_fund_date ON insider_filings(fund_id, filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_filings_ingested ON insider_filings(ingested_at DESC);
