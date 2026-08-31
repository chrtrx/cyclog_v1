-- ═══════════════════════════════════════════════════════════
-- Migration 023 – Nutzungs-Statistik
--
-- Was du eintraegst (Wartungen, Rennen, Fit-Aenderungen ...) steht bereits in
-- den jeweiligen Tabellen und laesst sich rueckwirkend auswerten. Keine Spur
-- hinterlassen bisher reine Bedienschritte: welche Seiten du oeffnest, wie oft
-- du manuell synchronisierst, ob du die Bedingungs-Abfrage ueberspringst.
-- Genau dafuer ist diese Tabelle da – bewusst ohne Fremddienst, die Daten
-- bleiben in der eigenen Datenbank und unter RLS beim jeweiligen Nutzer.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_events (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event      text NOT NULL,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own usage_events" ON usage_events
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS usage_events_user_time_idx ON usage_events (user_id, created_at);

-- Zaehlt serverseitig, damit die Auswertung nicht saemtliche Ereignis-Zeilen
-- zum Client uebertragen muss (und nicht an der 1000-Zeilen-Grenze haengt).
CREATE OR REPLACE FUNCTION public.usage_summary(p_user_id uuid, p_since timestamptz)
RETURNS TABLE (label text, uses bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE WHEN u.event = 'page'
              THEN 'page:' || COALESCE(u.meta->>'path', '/')
              ELSE u.event END AS label,
         COUNT(*) AS uses
  FROM usage_events u
  WHERE u.user_id = p_user_id
    AND u.created_at >= p_since
  GROUP BY 1
$$;

GRANT EXECUTE ON FUNCTION public.usage_summary(uuid, timestamptz) TO authenticated, service_role;
