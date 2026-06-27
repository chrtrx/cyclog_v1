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

// Wie viele Stunden seit dem Service gefahren wurden.
export function hoursSince(tracker, bikeHours) {
  const h = Number(bikeHours) || 0
  const start = Number(tracker?.hours_at_start) || 0
  return Math.max(0, h - start)
}

// Tage seit Service-Start (für datums-basierte Tracker).
export function daysSince(tracker) {
  const start = new Date(tracker?.start_date)
  if (isNaN(start.getTime())) return 0
  return Math.max(0, (Date.now() - start.getTime()) / 86400000)
}

// Fälligkeitsdatum für datums-basierte Tracker (interval_km = Monate).
export function dueDateOf(tracker) {
  if (tracker?.interval_type !== 'date') return null
  const months = Number(tracker?.interval_km) || 0
  const start = new Date(tracker?.start_date)
  if (isNaN(start.getTime())) return null
  const due = new Date(start)
  due.setMonth(due.getMonth() + months)
  return due
}

// Verbleibende Tage (negativ = überfällig).
export function daysUntilDue(tracker) {
  const due = dueDateOf(tracker)
  if (!due) return null
  return Math.ceil((due.getTime() - Date.now()) / 86400000)
}

// Fortschritt 0..1. Unterstützt km-, Stunden- und Datums-Intervalle.
export function pct(tracker, bikeKm, bikeHours = 0) {
  if (tracker?.interval_type === 'date') {
    const months = Number(tracker?.interval_km)
    if (!months || months <= 0) return 0
    const totalDays = months * 30.44
    const p = daysSince(tracker) / totalDays
    if (!isFinite(p) || p < 0) return 0
    return Math.min(p, 1)
  }
  if (tracker?.interval_type === 'h') {
    const interval = Number(tracker?.interval_hours)
    if (!interval || interval <= 0) return 0
    const done = hoursSince(tracker, bikeHours)
    const p = done / interval
    if (!isFinite(p) || p < 0) return 0
    return Math.min(p, 1)
  }
  const interval = Number(tracker?.interval_km)
  if (!interval || interval <= 0) return 0
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

export function fmtH(n) {
  const v = Number(n)
  if (!isFinite(v)) return '0'
  return v >= 10 ? Math.round(v).toString() : v.toFixed(1)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Vorhersage: wann wird der Tracker fällig? Unterstützt km und Stunden.
export function predictDue(tracker, bikeKm, bikeHours = 0) {
  if (tracker?.interval_type === 'h') {
    const done = hoursSince(tracker, bikeHours)
    if (done < 2) return null
    const startDate = new Date(tracker.start_date)
    const now = new Date()
    const daysElapsed = Math.max(1, (now - startDate) / 86400000)
    const hPerDay = done / daysElapsed
    if (hPerDay < 0.05) return null
    const interval = Number(tracker.interval_hours) || 0
    if (!interval) return null
    const hLeft = Math.max(0, interval - done)
    if (hLeft <= 0) return null
    const daysLeft = hLeft / hPerDay
    const dueDate = new Date(now.getTime() + daysLeft * 86400000)
    const timePct = Math.min(daysElapsed / (interval / hPerDay), 1)
    const weeks = Math.max(1, Math.round(daysLeft / 7))
    const dueDateStr = dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    return { dueDateStr, weeks, timePct }
  }

  const done = kmSince(tracker, bikeKm)
  if (done < 20) return null
  const startDate = new Date(tracker.start_date)
  const now = new Date()
  const daysElapsed = Math.max(1, (now - startDate) / 86400000)
  const kmPerDay = done / daysElapsed
  if (kmPerDay < 0.5) return null
  const interval = Number(tracker.interval_km) || 0
  if (!interval) return null
  const kmLeft = Math.max(0, interval - done)
  if (kmLeft <= 0) return null
  const daysLeft = kmLeft / kmPerDay
  const dueDate = new Date(now.getTime() + daysLeft * 86400000)
  const timePct = Math.min(daysElapsed / (interval / kmPerDay), 1)
  const weeks = Math.max(1, Math.round(daysLeft / 7))
  const dueDateStr = dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  return { dueDateStr, weeks, timePct }
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
