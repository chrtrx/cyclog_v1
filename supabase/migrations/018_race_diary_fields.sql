-- ═══════════════════════════════════════════════════════════
-- Migration 018 – Renntagebuch-Vorlage erweitern
-- Zusätzliche Felder für den vollständigen Rennbericht:
-- Zeit (Fahrzeit), Gefühl (Tagesform) und Learnings.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE races ADD COLUMN IF NOT EXISTS duration  text;
ALTER TABLE races ADD COLUMN IF NOT EXISTS feeling   text;
ALTER TABLE races ADD COLUMN IF NOT EXISTS learnings text;
