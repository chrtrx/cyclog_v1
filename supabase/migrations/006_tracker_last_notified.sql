-- ═══════════════════════════════════════════════════════════
-- Migration 006 – Push-Erinnerungen entprellen
-- Merkt sich, wann ein Tracker zuletzt per Push gemeldet wurde,
-- damit nicht täglich erneut erinnert wird (Wiederholung frühestens
-- nach 7 Tagen, solange er fällig bleibt).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE trackers ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;
