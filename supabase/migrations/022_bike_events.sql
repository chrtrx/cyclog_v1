-- ═══════════════════════════════════════════════════════════
-- Migration 022 – Ereignisse rund ums Rad (Kalender)
--
-- Alles, was weder eine Wartung (service_logs) noch ein Rennen (races) ist:
-- Kettenriss, Defekt, Sturz, Reifenpanne, Notizen. Der Kalender zeigt diese
-- Einträge gemeinsam mit Wartungen, Rennen und den prognostizierten
-- Fälligkeiten der Tracker.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bike_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id    uuid REFERENCES bikes(id) ON DELETE SET NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  kind       text NOT NULL DEFAULT 'defect',  -- 'defect' | 'crash' | 'flat' | 'note'
  title      text NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bike_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own bike_events" ON bike_events
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS bike_events_user_date_idx ON bike_events (user_id, event_date);
