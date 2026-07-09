-- ═══════════════════════════════════════════════════════════
-- Migration 014 – Wettkampf-Erkennung (Renntagebuch-Vorschläge)
-- Wird eine Strava-Aktivität mit gesetztem Renn-Flag (workout_type=1)
-- hochgeladen, legt der Webhook hier einen Vorschlag ab. Die App zeigt ihn
-- im Renntagebuch als vorausgefülltes Formular an.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS race_candidates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_activity_id  bigint NOT NULL,
  event_name          text,
  race_date           date,
  bike_id             uuid REFERENCES bikes(id) ON DELETE SET NULL,
  distance_km         numeric,
  elevation_m         numeric,
  avg_power           numeric,
  avg_speed           numeric,
  dismissed           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, strava_activity_id)
);

ALTER TABLE race_candidates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own race_candidates" ON race_candidates
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS race_candidates_user_idx ON race_candidates (user_id, dismissed);
