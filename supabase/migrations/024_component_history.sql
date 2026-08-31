-- ═══════════════════════════════════════════════════════════
-- Migration 024 – Teile-Verlauf (automatische Setups)
--
-- Die Teile eines Rads stehen in components, dort aber immer nur im
-- AKTUELLEN Zustand. Damit laesst sich nicht beantworten, was die
-- eigentliche Frage ist: "Welchen Reifen bin ich von April bis Juni
-- gefahren?" Diese Tabelle haelt jede Aenderung fest, sodass sich aus
-- den Teilen automatisch ein Setup je Zeitraum ableiten laesst.
--
-- component_id bewusst OHNE Fremdschluessel: Der Verlauf soll ein
-- geloeschtes Teil ueberleben – sonst waere gerade die interessante
-- Vergangenheit (ausgebautes Teil) verschwunden.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS component_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id      uuid REFERENCES bikes(id) ON DELETE CASCADE,
  component_id uuid,
  category     text,
  name         text,
  action       text NOT NULL DEFAULT 'changed',   -- 'added' | 'changed' | 'removed'
  changes      jsonb,
  summary      text,
  changed_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE component_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own component_history" ON component_history
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS component_history_bike_idx ON component_history (bike_id, changed_at);
CREATE INDEX IF NOT EXISTS component_history_user_idx ON component_history (user_id, changed_at);
