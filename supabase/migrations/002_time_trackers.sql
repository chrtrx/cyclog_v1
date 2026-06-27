-- ═══════════════════════════════════════════════════════════
-- Migration 002 – Zeitbasierte Tracker
-- Ausführen im Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Startpunkt für Stunden-Tracker (analog zu km_at_start)
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS hours_at_start numeric DEFAULT 0;
