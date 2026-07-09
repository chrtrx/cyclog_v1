-- ═══════════════════════════════════════════════════════════
-- Migration 013 – Eigene Tracker-Typen (Symbol + Name)
-- Nutzer können eigene Wartungs-/Tracker-Vorlagen anlegen, die zusätzlich
-- zu den eingebauten SERVICE_TYPES im „Was hast du gemacht?"-Menü erscheinen.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS custom_service_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_id       text NOT NULL,
  title         text NOT NULL,
  icon          text NOT NULL DEFAULT '🔧',
  cat           text NOT NULL DEFAULT 'Eigene',
  interval      numeric NOT NULL DEFAULT 1000,
  interval_type text NOT NULL DEFAULT 'km',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_service_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own custom_service_types" ON custom_service_types
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS custom_service_types_user_idx ON custom_service_types (user_id);
