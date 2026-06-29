-- ═══════════════════════════════════════════════════════════
-- Migration 010 – Benachrichtigungs-Inbox
-- Speichert jede gesendete Push, damit sie in der App als Liste
-- angezeigt, gelesen-markiert und gelöscht werden kann.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text default '',
  read       boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'own notifications'
  ) THEN
    CREATE POLICY "own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
