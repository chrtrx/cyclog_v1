-- ═══════════════════════════════════════════════════════════
-- Migration 005 – Push-Benachrichtigungen (Web Push)
-- Speichert pro Gerät eine Push-Subscription.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  user_agent   text,
  created_at   timestamptz default now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'own push_subscriptions'
  ) THEN
    CREATE POLICY "own push_subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
