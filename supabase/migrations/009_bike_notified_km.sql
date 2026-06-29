-- ═══════════════════════════════════════════════════════════
-- Migration 009 – km-Änderungen pro Rad benachrichtigen
-- Merkt sich den zuletzt gemeldeten km-Stand je Rad, um in der
-- Benachrichtigung zu zeigen, welches Rad sich um wie viel geändert
-- hat (auch bei nachträglichem Rad-Wechsel in Strava).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE bikes ADD COLUMN IF NOT EXISTS notified_km integer;
