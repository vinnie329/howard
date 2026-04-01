-- COT (Commitments of Traders) positioning snapshots
create table if not exists cot_snapshots (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  commodity text not null,
  report_date text not null,
  commercial_net integer not null,
  noncommercial_net integer not null,
  spec_net_pct numeric not null,
  captured_at timestamptz not null default now(),
  unique (ticker, report_date)
);

-- Credit spread snapshots from FRED
create table if not exists credit_spread_snapshots (
  id uuid primary key default gen_random_uuid(),
  series text not null,
  label text not null,
  observation_date text not null,
  value numeric not null,
  captured_at timestamptz not null default now(),
  unique (series, observation_date)
);

-- Options sentiment snapshots (VIX, SKEW, put/call ratios)
create table if not exists options_sentiment_snapshots (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  vix numeric,
  vix9d numeric,
  vix3m numeric,
  vix_term_spread numeric,
  skew numeric,
  equity_pc_ratio numeric,
  index_pc_ratio numeric,
  total_pc_ratio numeric,
  captured_at timestamptz not null default now()
);
