-- ═══════════════════════════════════════════════════════════
-- Migration 026 – Rückmeldungen der Beta-Tester
--
-- Feedback soll dort entstehen, wo der Eindruck entsteht: in der App, in
-- dem Moment. Jeder Umweg über eine Nachricht an den Entwickler kostet
-- Rückmeldungen, und zwar genau die beiläufigen – also die ehrlichen.
--
-- Gerät und App-Version werden automatisch mitgeschrieben. Ohne sie ist
-- „geht bei mir nicht" nicht nachvollziehbar, und danach zu fragen heißt,
-- den Tester zum Zulieferer zu machen.
--
-- RLS wie überall: Jeder sieht ausschließlich seine eigenen Einträge. Die
-- Auswertung über alle Tester läuft über den SQL-Editor im Dashboard
-- (service_role) – NICHT über eine Admin-Ansicht in der App, die die
-- Abschottung aufweichen würde.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'idea',   -- 'bug' | 'idea' | 'like' | 'other'
  area        text,                            -- betroffener Bereich der App
  message     text NOT NULL,
  app_version integer,                         -- Changelog-Stand zum Zeitpunkt
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own feedback" ON feedback
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS feedback_user_date_idx ON feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_date_idx      ON feedback (created_at DESC);
