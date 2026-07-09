-- ═══════════════════════════════════════════════════════════
-- Migration 015 – Bike-Fit-Historie
-- Jede inhaltliche Änderung an Geometrie/Cockpit/Körpermaßen wird hier als
-- Snapshot mit kurzer Zusammenfassung abgelegt, damit sie zusammen mit den
-- Tracker-Einträgen (service_logs) in einer gemeinsamen Zeitleiste pro Rad
-- erscheinen kann ("Historie"-Tab in der Rad-Detailansicht).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fit_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id    uuid NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  fit        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Snapshot am Stand dieses Eintrags
  changes    jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{key,label,from,to,unit}] seit Sessionbeginn
  summary    text NOT NULL DEFAULT '',             -- aus changes gebaute Kurzfassung
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fit_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own fit_history" ON fit_history
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS fit_history_bike_idx ON fit_history (bike_id, created_at DESC);
