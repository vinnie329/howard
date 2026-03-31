-- Model Portfolio: AI-generated portfolio from Howard's intelligence

-- One row per rebalance event
create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  starting_capital numeric not null default 50000,
  cash_allocation numeric not null default 0,
  total_positions integer not null default 0,
  thesis_summary text not null,
  risk_posture text not null check (risk_posture in ('aggressive', 'moderate', 'defensive')),
  rebalance_reasoning text,
  supersedes uuid references portfolio_snapshots(id),
  is_current boolean not null default true,
  created_at timestamptz default now()
);

-- Individual allocations within a snapshot
create table if not exists portfolio_positions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references portfolio_snapshots(id) on delete cascade,
  ticker text not null,
  asset_name text not null,
  direction text not null check (direction in ('long', 'short')),
  allocation_pct numeric not null check (allocation_pct > 0 and allocation_pct <= 100),
  entry_price numeric,
  current_price numeric,
  thesis text not null,
  conviction text not null check (conviction in ('high', 'medium', 'low')),
  confidence numeric not null check (confidence >= 0 and confidence <= 100),
  category text not null default 'macro',
  time_horizon text not null,
  house_prediction_ids uuid[] default '{}',
  source_prediction_ids uuid[] default '{}',
  supporting_sources text[] default '{}',
  key_drivers text[] default '{}',
  stop_loss_condition text,
  created_at timestamptz default now()
);

-- Daily NAV snapshots
create table if not exists portfolio_performance (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references portfolio_snapshots(id),
  date date not null,
  nav numeric not null,
  daily_return_pct numeric,
  cumulative_return_pct numeric,
  spy_cumulative_pct numeric,
  positions_data jsonb not null default '[]',
  created_at timestamptz default now(),
  unique (snapshot_id, date)
);

create index if not exists idx_portfolio_positions_snapshot on portfolio_positions(snapshot_id);
create index if not exists idx_portfolio_performance_snapshot_date on portfolio_performance(snapshot_id, date);
create index if not exists idx_portfolio_snapshots_current on portfolio_snapshots(is_current) where is_current = true;
