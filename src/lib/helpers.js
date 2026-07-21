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

// Km-gewichtete Verschleiß-Auswertung: wie viel Prozent der gefahrenen km
// seit `sinceDate` unter welchem Wetter/welcher Intensität waren.
// rows: [{ km_delta, weather, intensity, ride_date }] aus ride_conditions.
export function summarizeConditions(rows, sinceDate) {
  if (!rows || !rows.length) return null
  const since = sinceDate ? new Date(sinceDate).getTime() : 0
  const relevant = rows.filter(r => new Date(r.ride_date).getTime() >= since)
  const totalKm = relevant.reduce((s, r) => s + (Number(r.km_delta) || 0), 0)
  if (!totalKm) return null
  const km = (list) => list.reduce((s, r) => s + (Number(r.km_delta) || 0), 0)
  const share = (pred) => Math.round(km(relevant.filter(pred)) / totalKm * 100)
  // km-gewichteter Watt-Schnitt über die Fahrten, für die Watt vorliegen
  const watts = (list) => {
    const withW = list.filter(r => Number(r.avg_watts) > 0)
    const wKm = km(withW)
    return wKm ? Math.round(withW.reduce((s, r) => s + Number(r.avg_watts) * (Number(r.km_delta) || 0), 0) / wKm) : null
  }
  // Tiefen-Info je Intensitäts-Stufe: km, Watt und Wetter-Anteile der Stufe
  const byIntensity = {}
  for (const lvl of ['easy', 'mixed', 'hard']) {
    const list = relevant.filter(r => r.intensity === lvl)
    const lvlKm = km(list)
    if (!lvlKm) continue
    byIntensity[lvl] = {
      km: Math.round(lvlKm),
      avgWatts: watts(list),
      weather: {
        dry: Math.round(km(list.filter(r => r.weather === 'dry')) / lvlKm * 100),
        wet: Math.round(km(list.filter(r => r.weather === 'wet')) / lvlKm * 100),
        rain: Math.round(km(list.filter(r => r.weather === 'rain')) / lvlKm * 100),
      },
    }
  }
  return {
    totalKm: Math.round(totalKm),
    avgWatts: watts(relevant),
    weather: { dry: share(r => r.weather === 'dry'), wet: share(r => r.weather === 'wet'), rain: share(r => r.weather === 'rain') },
    intensity: { easy: share(r => r.intensity === 'easy'), mixed: share(r => r.intensity === 'mixed'), hard: share(r => r.intensity === 'hard') },
    byIntensity,
  }
}

// Stuft die Intensität der noch unbeantworteten Fahrt(en) relativ zum
// persönlichen Schnitt ein. Prioritäts-Kette: Watt → Puls → Tempo.
// Absolute Werte taugen nicht als Maßstab (200 W sind je nach Fahrer locker
// oder hart), daher wird gegen den Median der letzten 90 Tage verglichen –
// erst ab 5 vergleichbaren Fahrten, damit die Basis belastbar ist.
export function suggestIntensity(pending, history) {
  if (!pending || !pending.length) return null
  const chains = [
    ['avg_watts', 0.12, 'W'],
    ['avg_hr', 0.06, 'bpm'],
    ['avg_speed_kmh', 0.08, 'km/h'],
  ]
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  }
  for (const [key, tol, unit] of chains) {
    const hist = history.filter(r => Number(r[key]) > 0)
    const pend = pending.filter(r => Number(r[key]) > 0)
    if (hist.length < 5 || !pend.length) continue
    const pendKm = pend.reduce((s, r) => s + (Number(r.distance_km) || 0), 0)
    const value = pendKm
      ? pend.reduce((s, r) => s + Number(r[key]) * (Number(r.distance_km) || 0), 0) / pendKm
      : Number(pend[pend.length - 1][key])
    const base = median(hist.map(r => Number(r[key])))
    if (!base) continue
    const rel = value / base
    const intensity = rel > 1 + tol ? 'hard' : rel < 1 - tol ? 'easy' : 'mixed'
    return {
      intensity,
      value: Math.round(value * 10) / 10,
      base: Math.round(base * 10) / 10,
      relPct: Math.round((rel - 1) * 100),
      unit,
      source: key === 'avg_watts'
        ? (pend.every(r => r.device_watts) ? 'power' : 'estimated')
        : key === 'avg_hr' ? 'hr' : 'speed',
    }
  }
  return null
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
