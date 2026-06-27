-- ═══════════════════════════════════════════════════════════
-- Migration 004 – Alle fehlenden Spalten nachrüsten
-- Sicher wiederholbar (IF NOT EXISTS überall).
-- Abdeckt alles aus Migrationen 001-003 + aktuelle Bugfixes.
-- Ausführen im Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── bikes ───────────────────────────────────────────────────
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- ── components ──────────────────────────────────────────────
ALTER TABLE components ADD COLUMN IF NOT EXISTS price_eur numeric;
ALTER TABLE components ADD COLUMN IF NOT EXISTS link text;

-- ── trackers ────────────────────────────────────────────────
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS interval_type text DEFAULT 'km';
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS interval_hours integer;
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS hours_at_start numeric DEFAULT 0;
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

-- ── upgrades (Wunschliste) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS upgrades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bike_id     uuid not null references bikes(id) on delete cascade,
  name        text not null,
  price_eur   numeric,
  done        boolean default false,
  notes       text default '',
  created_at  timestamptz default now()
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

-- ── pack_items (Renn-Packliste) ──────────────────────────────
CREATE TABLE IF NOT EXISTS pack_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null default 'Sonstiges',
  critical    boolean default false,
  checked     boolean default false,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

ALTER TABLE pack_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pack_items' AND policyname = 'own pack_items'
  ) THEN
    CREATE POLICY "own pack_items" ON pack_items FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pack_items_user ON pack_items(user_id);
