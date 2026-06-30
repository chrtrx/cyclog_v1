-- ═══════════════════════════════════════════════════════════
-- Migration 011 – Bike-Fit: Geometrie + Cockpit-Werte
-- Speichert alle Eingaben des Bike-Fit-Tabs (Rahmen-Geometrie und
-- Cockpit/Sitzposition) als JSON pro Rad – Grundlage für die Zeichnung.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE bikes ADD COLUMN IF NOT EXISTS fit jsonb DEFAULT '{}'::jsonb;
