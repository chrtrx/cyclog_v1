-- ═══════════════════════════════════════════════════════════
-- Migration 001 – Bike Detail Redesign
-- Ausführen im Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── components: neue Felder ──────────────────────────────
ALTER TABLE components ADD COLUMN IF NOT EXISTS price_eur numeric;
ALTER TABLE components ADD COLUMN IF NOT EXISTS link text;

-- ── trackers: Pinning + Stunden-Intervall ────────────────
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS pinned boolean default false;
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS interval_hours integer;

-- ── upgrades (Wunschliste) ───────────────────────────────
CREATE TABLE IF NOT EXISTS upgrades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  bike_id    uuid not null references bikes(id) on delete cascade,
  name       text not null,
  price_eur  numeric,
  done       boolean default false,
  notes      text default '',
  created_at timestamptz default now()
);

ALTER TABLE upgrades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'upgrades' AND policyname = 'own upgrades'
  ) THEN
    CREATE POLICY "own upgrades" ON upgrades FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_upgrades_bike ON upgrades(bike_id);
