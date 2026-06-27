-- ═══════════════════════════════════════════════════════════
-- Migration 003 – Räder archivieren + Renn-Packliste
-- Ausführen im Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Räder archivieren
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Packliste für Rennen
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
