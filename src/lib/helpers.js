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

// ═══════════════════════════════════════════════════════════
// ADAPTIVER VERSCHLEISSFAKTOR (aus Strava-Aktivitäten)
// ═══════════════════════════════════════════════════════════

// Berechnet wie stark das Terrain die Komponenten beansprucht.
// Basis: Höhenmeter/km und optionale Durchschnittsleistung.
// Rückgabe: Faktor >= 1.0 (1.0 = flach/normal, 1.5 = alpin)
export function calcWearFactor(activities) {
  if (!activities || activities.length === 0) return 1.0
  const valid = activities.filter(a => (a.distance_m || 0) >= 2000)
  if (valid.length === 0) return 1.0

  const factors = valid.map(act => {
    const km = act.distance_m / 1000
    const elevPerKm = (act.elevation_m || 0) / km
    // +0.02 pro m/km über 5m (flach=1.0, Alpen 30m/km=1.5)
    let f = 1.0 + Math.max(0, (elevPerKm - 5) / 50)
    // Leistungsbonus: > 150W addiert bis zu 0.15 (bei 225W)
    if (act.avg_power > 0) f += Math.max(0, (act.avg_power - 150) / 500)
    return Math.min(f, 1.8)
  })

  const avg = factors.reduce((a, b) => a + b, 0) / factors.length
  return Math.round(avg * 100) / 100
}

// Fortschritt mit Terrain-Faktor (0..1). Flächendeckend abgesichert.
export function pctAdjusted(tracker, bikeKm, wearFactor = 1.0) {
  const interval = Number(tracker?.interval_km)
  if (!interval || interval <= 0) return 0
  const raw = Math.max(0, (Number(bikeKm) || 0) - (Number(tracker?.km_at_start) || 0))
  const adjusted = raw * Math.max(1.0, wearFactor)
  const p = adjusted / interval
  return !isFinite(p) || p < 0 ? 0 : Math.min(p, 1)
}

// Beschreibung des Faktors für die UI (Label, Text, Farbe)
export function describeWearFactor(factor) {
  if (factor >= 1.4) return { label: 'Alpin',   text: 'Sehr viele Höhenmeter',        color: 'var(--crit)' }
  if (factor >= 1.2) return { label: 'Bergig',  text: 'Überdurchschnittliche Steigung', color: 'var(--warn)' }
  if (factor >= 1.05) return { label: 'Hügelig', text: 'Leicht erhöhter Verschleiß',   color: 'var(--warn)' }
  return { label: 'Flach', text: 'Normales Terrain – kein Zuschlag', color: 'var(--ok)' }
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
