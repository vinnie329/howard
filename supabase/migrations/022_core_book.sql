-- Migration: Three-book portfolio architecture (MVP — Buffett book scaffolding)
--
-- Adds the `book` column to portfolio_positions so existing tactical positions
-- can be tagged 'marks' and future long-hold positions can be tagged 'core'.
-- Adds the core_watchlist table, the Buffett-book candidate list with thesis +
-- buy-zone trigger fields. Status enum lets the user track lifecycle:
-- watching → in_position (manually deployed from cash) → thesis_broken |
-- taken_profits.

-- 1. Add book column on existing portfolio_positions (default existing rows to 'marks')
ALTER TABLE portfolio_positions
  ADD COLUMN IF NOT EXISTS book TEXT NOT NULL DEFAULT 'marks'
  CHECK (book IN ('marks', 'core'));

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_book ON portfolio_positions(book);

-- 2. The Buffett-book candidate list. One row per ticker.
CREATE TABLE IF NOT EXISTS core_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  asset_name TEXT NOT NULL,

  -- The core thesis. Why is this business a quality compounder?
  thesis TEXT NOT NULL,

  -- The Sleep/Smith/Akre quality criteria (free-form text per name).
  -- Filled in as the dossier matures; not required at MVP.
  reinvestment_runway TEXT,
  pricing_power_evidence TEXT,
  capital_allocation_notes TEXT,

  -- Trigger prices. The watchlist exists so capital deploys at these levels.
  buy_zone_max NUMERIC,         -- max price for a fresh buy
  trim_zone_min NUMERIC,        -- price above which to consider trimming

  -- What kills the thesis (NOT a deadline — these are forever theses)
  invalidation_criteria TEXT,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'watching'
    CHECK (status IN ('watching', 'in_position', 'thesis_broken', 'taken_profits')),
  position_opened_at TIMESTAMPTZ,
  position_closed_at TIMESTAMPTZ,

  -- Free-form notes
  notes TEXT,

  -- Linkage to source intelligence (if a source flagged this as a quality candidate)
  flagged_by_sources TEXT[] DEFAULT '{}',

  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_watchlist_status ON core_watchlist(status);
CREATE INDEX IF NOT EXISTS idx_core_watchlist_ticker ON core_watchlist(ticker);
