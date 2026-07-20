-- ═══════════════════════════════════════════════════════════
-- Migration 016 – Fahrbedingungen je Ausfahrt (Verschleiß-Kontext)
-- Erfasst pro erkanntem km-Zuwachs die Bedingungen (Wetter/Intensität),
-- damit Tracker eine km-gewichtete Verschleiß-Auswertung zeigen können
-- ("22 % Regen · 38 % Hart").
-- ═══════════════════════════════════════════════════════════

-- Basislinie je Rad, bis zu der km-Zuwächse bereits abgefragt/übersprungen
-- wurden. NULL beim ersten Lauf → wird still auf den aktuellen km-Stand
-- gesetzt, damit nicht rückwirkend nach der kompletten Fahrhistorie gefragt wird.
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS conditions_km_baseline numeric;

CREATE TABLE IF NOT EXISTS ride_conditions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id    uuid NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  km_delta   numeric NOT NULL,
  weather    text NOT NULL DEFAULT 'dry',    -- 'dry' | 'wet' | 'rain'
  intensity  text NOT NULL DEFAULT 'mixed',  -- 'easy' | 'mixed' | 'hard'
  ride_date  timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ride_conditions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own ride_conditions" ON ride_conditions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS ride_conditions_bike_idx ON ride_conditions (bike_id, ride_date);
