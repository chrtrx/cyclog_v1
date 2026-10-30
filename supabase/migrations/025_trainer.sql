-- ═══════════════════════════════════════════════════════════
-- Migration 025 – Rolle (Indoor-Trainer)
--
-- Ausgangslage: bikes.km gehört uns nicht. Der Wert wird bei jedem Sync aus
-- dem Strava-Odometer der zugehörigen Ausrüstung überschrieben
-- (supabase/functions/strava-sync). Rollenfahrten laufen bei Strava auf die
-- Rolle selbst, nicht auf das aufgesteckte Rad – wir können die Kilometer
-- also nicht einfach aufaddieren, der nächste Sync macht das zunichte.
--
-- Deshalb eine ZWEITE Zahl, die die App selbst führt: Rollen-Kilometer je
-- Rad, ermittelt aus den Fahrten der Rolle und dem Zeitraum, in dem das
-- jeweilige Rad daraufstand. Tracker, die das wollen, rechnen sie obendrauf.
-- ═══════════════════════════════════════════════════════════

-- 1) Ein Rad kann die Rolle sein. Die Rolle bleibt ein normales Rad: Sie
--    hat eine Strava-Ausrüstung, bekommt darüber ihre km und kann eigene
--    Tracker tragen (etwa "nach dem Schwitzen reinigen").
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS is_trainer boolean NOT NULL DEFAULT false;

-- 2) Welches Rad stand wann auf der Rolle. Eine Zeile je Zeitraum, die
--    laufende hat to_date = NULL.
CREATE TABLE IF NOT EXISTS trainer_mounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  bike_id    uuid NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  from_date  timestamptz NOT NULL DEFAULT now(),
  to_date    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trainer_mounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own trainer_mounts" ON trainer_mounts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS trainer_mounts_user_idx
  ON trainer_mounts (user_id, trainer_id, from_date);

-- Auf einer Rolle steht höchstens ein Rad gleichzeitig. Der Teilindex
-- erzwingt das in der Datenbank statt nur in der App.
CREATE UNIQUE INDEX IF NOT EXISTS trainer_mounts_one_open_idx
  ON trainer_mounts (trainer_id) WHERE to_date IS NULL;

-- 3) Je Tracker entscheiden, ob die Rolle mitzählt. Voreinstellung: nein –
--    Bremsen, Reifen und Fahrwerk verschleißen drinnen nicht. Die App setzt
--    den Schalter beim Anlegen für Antriebs-Tracker (Kette, Kassette) auf an.
--    indoor_km_at_start ist das Gegenstück zu km_at_start: der Rollen-Stand
--    bei der letzten Wartung.
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS counts_indoor      boolean NOT NULL DEFAULT false;
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS indoor_km_at_start numeric NOT NULL DEFAULT 0;

-- 4) Rollen-Kilometer je aufgestecktem Rad.
--    Gezählt werden Fahrten, die auf die ROLLE gebucht sind (r.bike_id =
--    mt.trainer_id) und in den Zeitraum des jeweiligen Rads fallen.
--    LEFT JOIN: Ein frisch aufgestecktes Rad ohne Fahrt liefert 0 statt zu
--    fehlen. SECURITY INVOKER, die RLS beider Tabellen gilt also weiter.
CREATE OR REPLACE FUNCTION public.indoor_km_by_bike(p_user_id uuid)
RETURNS TABLE (bike_id uuid, km numeric, rides bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT mt.bike_id,
         ROUND(COALESCE(SUM(r.distance_km), 0)::numeric, 1) AS km,
         COUNT(r.id) AS rides
  FROM trainer_mounts mt
  LEFT JOIN ride_metrics r
         ON r.user_id   = mt.user_id
        AND r.bike_id   = mt.trainer_id
        AND r.ride_date >= mt.from_date
        AND (mt.to_date IS NULL OR r.ride_date < mt.to_date)
  WHERE mt.user_id = p_user_id
  GROUP BY mt.bike_id
$$;

GRANT EXECUTE ON FUNCTION public.indoor_km_by_bike(uuid) TO authenticated, service_role;
