-- Buildout watchlist — buy-and-hold equities tied to the AGI / robotics
-- infrastructure ramp. Distinct from `core_watchlist` (compounders, durable
-- regardless of macro): names here REQUIRE the AI capex cycle to actually
-- happen, but offer the cleanest exposure if it does.
--
-- A ticker can appear in BOTH books — e.g. ASML is a compounder AND a
-- foundational buildout play; the framings are complementary.

CREATE TABLE IF NOT EXISTS buildout_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  asset_name TEXT NOT NULL,
  category TEXT NOT NULL,                       -- 'compute_silicon' | 'memory_storage' | 'power_generation' | 'networking_optical' | 'datacenter_capacity' | 'robotics_silicon' | 'robotics_oem' | 'specialty_materials' | 'cooling_electrical' | 'semicap'
  value_chain_layer TEXT,                       -- 'foundational' | 'enabling' | 'application'
  thesis TEXT NOT NULL,
  agi_dependency TEXT NOT NULL DEFAULT 'core',  -- 'core' | 'optional' | 'hedge'
  buy_zone_max NUMERIC,
  trim_zone_min NUMERIC,
  invalidation_capex_stall TEXT,                -- what breaks if AI capex stalls
  invalidation_disintermediation TEXT,          -- what breaks if competitor / vertical-integration disintermediates
  status TEXT NOT NULL DEFAULT 'watching',      -- 'watching' | 'in_position' | 'thesis_broken'
  dossier_md TEXT,
  dossier_updated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildout_watchlist_category ON buildout_watchlist(category);
CREATE INDEX IF NOT EXISTS idx_buildout_watchlist_status ON buildout_watchlist(status);
