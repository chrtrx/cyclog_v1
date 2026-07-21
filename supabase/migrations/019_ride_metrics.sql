-- ═══════════════════════════════════════════════════════════
-- Migration 019 – Fahrt-Metriken aus Strava (Intensitäts-Erkennung)
-- Der Webhook legt je Radfahrt die Leistungsdaten ab (Watt, Puls, Tempo).
-- Die App stuft damit die Intensität relativ zum persönlichen 90-Tage-
-- Schnitt ein und füllt die "Wie war die Fahrt?"-Abfrage vor.
-- Zusätzlich merkt sich jede beantwortete Abfrage die Ø-Watt der Fahrt(en),
-- damit Tracker "Ø 205 W" über die Laufzeit anzeigen können.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ride_metrics (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id            uuid REFERENCES bikes(id) ON DELETE CASCADE,
  strava_activity_id bigint UNIQUE,
  distance_km        numeric,
  moving_time_s      numeric,
  elevation_m        numeric,
  avg_watts          numeric,
  device_watts       boolean NOT NULL DEFAULT false,  -- echte Powermeter-Daten?
  avg_hr             numeric,
  avg_speed_kmh      numeric,
  ride_date          timestamptz NOT NULL DEFAULT now(),
  consumed           boolean NOT NULL DEFAULT false,  -- in einer Abfrage verarbeitet
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ride_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own ride_metrics" ON ride_metrics
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS ride_metrics_bike_idx ON ride_metrics (bike_id, ride_date);

ALTER TABLE ride_conditions ADD COLUMN IF NOT EXISTS avg_watts numeric;
ALTER TABLE ride_conditions ADD COLUMN IF NOT EXISTS watts_source text;  -- 'power' | 'estimated' | 'hr' | 'speed'
