// Lädt die Strava-Aktivitäts-Historie des eingeloggten Nutzers in
// ride_metrics nach. Damit bekommen Stunden-Tracker ihre Fahrzeit-Basis
// (der Webhook erfasst nur NEUE Fahrten) und die Intensitäts-Erkennung
// sofort genug Vergleichsfahrten für den 90-Tage-Median.
//
// Nach dem Import wird für bestehende Stunden-Tracker die Basis
// (hours_at_start) auf die Fahrzeit VOR ihrem Start-Datum gesetzt –
// sonst würden die nachgeladenen Stunden rückwirkend als "seit dem
// Service gefahren" zählen und Tracker schlagartig überfällig machen.
//
// Authentifizierung über das Supabase-Access-Token; serverseitig auf
// einen Lauf pro 24 h gedrosselt (profiles.metrics_backfill_at).

import { getAdmin } from './_due.js'
import { getAccessToken, isRideType } from './_strava.js'

const PAGES = 2          // 2 × 200 = bis zu 400 jüngste Aktivitäten
const PER_PAGE = 200

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const auth = req.headers['authorization'] || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'no token' })

  try {
    const admin = getAdmin()
    const { data: userData, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !userData?.user) return res.status(401).json({ error: 'invalid token' })
    const userId = userData.user.id

    const { data: profile } = await admin.from('profiles')
      .select('metrics_backfill_at').eq('user_id', userId).maybeSingle()
    const last = profile?.metrics_backfill_at ? new Date(profile.metrics_backfill_at).getTime() : 0
    if (Date.now() - last < 24 * 3600e3) {
      return res.status(200).json({ ok: true, throttled: true })
    }

    const { data: tok } = await admin.from('strava_tokens').select('*').eq('user_id', userId).maybeSingle()
    if (!tok) return res.status(200).json({ ok: true, noStrava: true })

    const { data: bikes } = await admin.from('bikes')
      .select('id,strava_gear_id').eq('user_id', userId)
    const bikeByGear = {}
    for (const b of bikes || []) if (b.strava_gear_id) bikeByGear[b.strava_gear_id] = b.id

    const accessToken = await getAccessToken(admin, tok)
    let fetched = 0
    const rows = []
    for (let page = 1; page <= PAGES; page++) {
      const r = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=${PER_PAGE}&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!r.ok) break
      const acts = await r.json()
      if (!Array.isArray(acts) || !acts.length) break
      fetched += acts.length
      for (const a of acts) {
        if (!isRideType(a)) continue
        rows.push({
          user_id: userId,
          strava_activity_id: a.id,
          bike_id: a.gear_id ? (bikeByGear[a.gear_id] || null) : null,
          distance_km: a.distance ? Math.round(a.distance / 100) / 10 : null,
          moving_time_s: a.moving_time || null,
          elevation_m: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
          avg_watts: a.average_watts ? Math.round(a.average_watts) : null,
          device_watts: !!a.device_watts,
          avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
          avg_speed_kmh: a.average_speed ? Math.round(a.average_speed * 3.6 * 10) / 10 : null,
          ride_date: a.start_date || new Date().toISOString(),
          consumed: true,  // Historie soll keine "Wie war die Fahrt?"-Abfragen auslösen
        })
      }
      if (acts.length < PER_PAGE) break
    }

    // Insert-only: vorhandene Zeilen (v. a. frische Webhook-Einträge, deren
    // Abfrage noch offen ist) behalten ihren consumed-Status.
    if (rows.length) {
      const { error: insErr } = await admin.from('ride_metrics')
        .upsert(rows, { onConflict: 'strava_activity_id', ignoreDuplicates: true })
      if (insErr) throw insErr
    }

    // Rad-Zuordnung bestehender Zeilen nachziehen: Wird eine Fahrt in Strava
    // nachträglich einem anderen Rad zugeordnet, schickt Strava dafür kein
    // Webhook-Event – hier wandert die bike_id beim nächsten Lauf mit.
    let moved = 0
    if (rows.length) {
      const wanted = new Map(rows.map(r => [String(r.strava_activity_id), r.bike_id]))
      const { data: existing } = await admin.from('ride_metrics')
        .select('id,strava_activity_id,bike_id')
        .in('strava_activity_id', rows.map(r => r.strava_activity_id))
      for (const r of existing || []) {
        const want = wanted.get(String(r.strava_activity_id))
        if (want !== undefined && want !== r.bike_id) {
          await admin.from('ride_metrics').update({ bike_id: want }).eq('id', r.id)
          moved++
        }
      }
    }

    // Stunden-Basis bestehender h-Tracker korrigieren: Fahrzeit vor dem
    // jeweiligen Tracker-Start zählt nicht zum laufenden Intervall.
    let adjusted = 0
    const { data: hTrackers } = await admin.from('trackers')
      .select('id,bike_id,start_date').eq('user_id', userId).eq('interval_type', 'h')
    for (const t of hTrackers || []) {
      const { data: before } = await admin.from('ride_metrics')
        .select('moving_time_s').eq('bike_id', t.bike_id)
        .lt('ride_date', t.start_date || new Date().toISOString())
      const hoursBefore = (before || []).reduce((s, r) => s + (Number(r.moving_time_s) || 0), 0) / 3600
      await admin.from('trackers')
        .update({ hours_at_start: Math.round(hoursBefore * 10) / 10 }).eq('id', t.id)
      adjusted++
    }

    await admin.from('profiles')
      .update({ metrics_backfill_at: new Date().toISOString() }).eq('user_id', userId)

    return res.status(200).json({ ok: true, fetched, imported: rows.length, moved, adjusted })
  } catch (e) {
    console.error('strava-backfill error:', e?.message)
    return res.status(500).json({ error: e?.message || 'backfill failed' })
  }
}
