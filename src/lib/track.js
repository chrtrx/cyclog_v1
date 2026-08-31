import { supabase } from './supabase'

// Schlanke Nutzungs-Erfassung: schreibt Bedienschritte in die eigene
// Datenbank (kein Fremddienst). Bewusst "fire and forget" – ein Fehler beim
// Zaehlen darf niemals eine Aktion des Nutzers stoeren oder verzoegern.
const OFF_KEY = 'cyclog_track_off'

let userId = null
let lastKey = ''
let lastAt = 0

export function isTrackingEnabled() {
  try { return localStorage.getItem(OFF_KEY) !== '1' } catch { return true }
}
export function setTrackingEnabled(on) {
  try { on ? localStorage.removeItem(OFF_KEY) : localStorage.setItem(OFF_KEY, '1') } catch { /* egal */ }
}
export function initTracking(id) { userId = id }

export function track(event, meta) {
  if (!event || !userId || !isTrackingEnabled()) return
  // Doppelte Ausloesungen (React StrictMode, schnelles Hin-und-Her) verwerfen.
  const key = event + '|' + (meta ? JSON.stringify(meta) : '')
  const now = Date.now()
  if (key === lastKey && now - lastAt < 2000) return
  lastKey = key; lastAt = now
  try {
    supabase.from('usage_events')
      .insert({ user_id: userId, event, meta: meta || null })
      .then(() => {}, () => {})
  } catch { /* Zaehlen ist optional */ }
}
