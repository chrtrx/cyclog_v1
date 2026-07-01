-- ═══════════════════════════════════════════════════════════
-- Migration 012 – Rahmen-Geometrie-Spalten am Rad
-- Die geo_*-Spalten wurden bisher von der App genutzt (Geometrie-Tab in der
-- Rad-Detailansicht sowie Bike-Fit), aber nie in einer Migration angelegt.
-- Dadurch schlug das Speichern der Geometrie fehl. Hier idempotent nachgezogen.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_stack       numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_reach       numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_head_angle  numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_seat_angle  numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_head_tube   numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_top_tube    numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_seat_tube   numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_chainstay   numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_wheelbase   numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_bb_drop     numeric;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS geo_standover   numeric;
