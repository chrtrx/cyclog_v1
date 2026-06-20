// ═══════════════════════════════════════════════════════════
// Berechnungen für den Verschleiß-Tracker
// Abgesichert gegen fehlende / ungültige Werte.
// ═══════════════════════════════════════════════════════════

// Wie viele km seit dem Service gefahren wurden.
export function kmSince(tracker, bikeKm) {
  const km = Number(bikeKm) || 0
  const start = Number(tracker?.km_at_start) || 0
  return Math.max(0, km - start)
}

// Fortschritt 0..1. Sicher gegen Division durch 0 / fehlendes Intervall.
export function pct(tracker, bikeKm) {
  const interval = Number(tracker?.interval_km)
  if (!interval || interval <= 0) return 0   // kein gültiges Intervall → 0 %
  const done = kmSince(tracker, bikeKm)
  const p = done / interval
  if (!isFinite(p) || p < 0) return 0
  return Math.min(p, 1)
}

// Status aus dem Fortschritt.
export function statusOf(p) {
  const v = Number(p) || 0
  return v >= 1 ? 'crit' : v >= 0.75 ? 'warn' : 'ok'
}

export function badgeText(status) {
  return status === 'crit' ? 'Fällig!' : status === 'warn' ? 'Bald fällig' : 'OK'
}

export function fmtKm(n) {
  const v = Number(n)
  if (!isFinite(v)) return '0'
  return Math.round(v).toLocaleString('de')
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Icons für ALLE Rad-Typen – inkl. der Strava-Schreibweisen (MTB, Rennrad …)
export const BIKE_ICONS = {
  MTB: '🏔️',
  Mountainbike: '🏔️',
  Gravel: '🪨',
  Rennrad: '⚡',
  Road: '⚡',
  Zeitfahrrad: '🚀',
  Bikepacking: '🎒',
  'E-Bike': '🔋',
  Indoor: '🖥️',
}
