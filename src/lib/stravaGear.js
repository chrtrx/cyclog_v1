import { supabase } from './supabase'

// Strava-Ausrüstung des angemeldeten Nutzers über /api/strava-gear.
//
// Liefert je Eintrag { id, name, km, takenBy }. `takenBy` ist der Name des
// Rads, an dem diese Ausrüstung in Cyclog schon hängt – damit die Auswahl
// zeigen kann, was bereits vergeben ist, statt es doppelt anzulegen.
//
// Wirft nur bei echten Fehlern; ist Strava nicht verbunden, kommt eine leere
// Liste zurück. Die Auswahl ist eine Bequemlichkeit – von Hand anlegen muss
// immer möglich bleiben.
export async function fetchStravaGear() {
  const { data: s } = await supabase.auth.getSession()
  const token = s?.session?.access_token
  if (!token) return []
  const res = await fetch('/api/strava-gear', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => null)
  if (!json) throw new Error('Keine Antwort vom Server')
  if (!json.ok && !json.noStrava) throw new Error(json.error || 'Strava antwortet nicht')
  return json.gear || []
}
