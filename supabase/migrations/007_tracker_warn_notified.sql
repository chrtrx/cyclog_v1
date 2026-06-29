-- ═══════════════════════════════════════════════════════════
-- Migration 007 – „Bald fällig"-Vorwarnung entprellen
-- Eigener Zeitstempel, damit die 90%-Vorwarnung nur EINMAL pro
-- Zyklus kommt (unabhängig von der „fällig"-Erinnerung).
-- Wird beim Zurücksetzen eines Trackers wieder geleert.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE trackers ADD COLUMN IF NOT EXISTS warn_notified_at timestamptz;
