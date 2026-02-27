-- Remove duplicate holdings rows, keeping the earliest-created one per position
DELETE FROM holdings
WHERE id NOT IN (
  SELECT DISTINCT ON (fund_id, filing_date, cusip, COALESCE(option_type, ''))
    id
  FROM holdings
  ORDER BY fund_id, filing_date, cusip, COALESCE(option_type, ''), created_at ASC
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_holdings_unique_position
  ON holdings (fund_id, filing_date, cusip, COALESCE(option_type, ''));
