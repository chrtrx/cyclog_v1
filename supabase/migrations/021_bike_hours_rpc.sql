-- ═══════════════════════════════════════════════════════════
-- Migration 021 – Fahrstunden serverseitig aggregieren
--
-- Bisher wurden für die Stunden-Tracker ALLE Fahrt-Zeilen eines Rads zum
-- Client übertragen und dort aufsummiert. Das ist unnötig teuer und – weil
-- PostgREST standardmäßig nach 1000 Zeilen abschneidet – ab genügend
-- Fahrten sogar FALSCH (Stunden zu niedrig, Tracker springen nie an).
--
-- Die Funktion aggregiert stattdessen in der Datenbank und liefert eine
-- Zeile je Rad. SECURITY INVOKER: Die RLS von ride_metrics gilt weiterhin,
-- ein Nutzer sieht also ausschließlich seine eigenen Fahrten.
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS ride_metrics_user_bike_idx ON ride_metrics (user_id, bike_id);

CREATE OR REPLACE FUNCTION public.bike_hours(p_user_id uuid)
RETURNS TABLE (bike_id uuid, hours numeric, rides bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.bike_id,
         ROUND(COALESCE(SUM(m.moving_time_s), 0) / 3600.0, 2) AS hours,
         COUNT(*) AS rides
  FROM ride_metrics m
  WHERE m.user_id = p_user_id
    AND m.bike_id IS NOT NULL
  GROUP BY m.bike_id
$$;

GRANT EXECUTE ON FUNCTION public.bike_hours(uuid) TO authenticated, service_role;
