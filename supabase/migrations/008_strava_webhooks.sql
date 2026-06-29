-- ═══════════════════════════════════════════════════════════
-- Migration 008 – Strava-Webhooks (Echtzeit-Sync nach Upload)
-- ═══════════════════════════════════════════════════════════

-- Strava-Athleten-ID, um Webhook-Events (owner_id) einem Nutzer zuzuordnen.
ALTER TABLE strava_tokens ADD COLUMN IF NOT EXISTS athlete_id bigint;
CREATE INDEX IF NOT EXISTS idx_strava_athlete ON strava_tokens(athlete_id);

-- Einstellung: nach JEDER Fahrt benachrichtigen (statt nur bei fällig/bald fällig).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_every_ride boolean DEFAULT false;

-- Verarbeitete Aktivitäten, um Doppel-Pushes bei Strava-Wiederholungen zu vermeiden.
CREATE TABLE IF NOT EXISTS processed_activities (
  object_id  bigint primary key,
  user_id    uuid,
  created_at timestamptz default now()
);
ALTER TABLE processed_activities ENABLE ROW LEVEL SECURITY;
-- keine Policy → nur Service Role (Server) hat Zugriff
