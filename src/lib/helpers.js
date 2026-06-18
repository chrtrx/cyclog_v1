// Berechnungen für Tracker-Status
export function kmSince(tracker, bikeKm) {
  return Math.max(0, bikeKm - tracker.km_at_start)
}

export function pct(tracker, bikeKm) {
  return Math.min(kmSince(tracker, bikeKm) / tracker.interval_km, 1)
}

export function statusOf(p) {
  return p >= 1 ? 'crit' : p >= 0.75 ? 'warn' : 'ok'
}

export function badgeText(status) {
  return status === 'crit' ? 'Fällig!' : status === 'warn' ? 'Bald fällig' : 'OK'
}

export function fmtKm(n) {
  return Math.round(n).toLocaleString('de')
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const BIKE_ICONS = {
  Mountainbike: '🏔️', Gravel: '🪨', Rennrad: '⚡', 'E-Bike': '🔋', Indoor: '🖥️',
}
