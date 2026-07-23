-- ═══════════════════════════════════════════════════════════
-- Migration 020 – Drossel für den Strava-Historien-Backfill
-- /api/strava-backfill lädt die Aktivitäts-Historie in ride_metrics nach
-- (Stunden-Basis + Intensitäts-Vergleichswerte) und merkt sich hier den
-- letzten Lauf, damit höchstens einmal pro 24 h importiert wird.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metrics_backfill_at timestamptz;
