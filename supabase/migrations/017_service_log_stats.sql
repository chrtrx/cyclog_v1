-- ═══════════════════════════════════════════════════════════
-- Migration 017 – Statistik je Tracker-Durchlauf
-- Beim Abschließen eines Trackers werden Laufleistung und die km-gewichtete
-- Bedingungs-Auswertung (Wetter/Intensität) am service_log-Eintrag
-- festgehalten. Damit bleibt die Statistik in der Historie nachvollziehbar
-- und fließt in die Gesamt-Statistik je Rad und Tracker-Typ ein.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS km_ridden numeric;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS conditions jsonb;
