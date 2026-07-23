// Strava-Webhook: GET = Verifizierung, POST = Aktivitäts-Events.
// Bei neuer/aktualisierter Aktivität: km sofort syncen + ggf. Push schicken.

import {
  getAdmin, configureWebPush, pct, sendToSubscriptions,
  evaluateBucket, buildKmChanges, composePush, hoursByBike, syncStravaUser, updateNotifiedKm, logNotification,
} from './_due.js'
import { fetchActivityDetail, isRaceActivity, isRideType } from './_strava.js'

// Rad zur Strava-Ausrüstung der Aktivität finden.
async function bikeIdForActivity(admin, userId, activity) {
  if (!activity?.gear_id) return null
  const { data: bike } = await admin.from('bikes').select('id').eq('user_id', userId).eq('strava_gear_id', activity.gear_id).maybeSingle()
  return bike?.id || null
}

// Leistungsdaten der Fahrt ablegen (Watt/Puls/Tempo) – Grundlage für die
// Intensitäts-Erkennung der "Wie war die Fahrt?"-Abfrage und die Ø-Watt-
// Statistik. Upsert je Aktivität: Ein Update-Event (z. B. Rad nachträglich
// gewechselt) schreibt bike_id & Werte einfach neu.
async function recordRideMetrics(admin, userId, activity) {
  try {
    if (!isRideType(activity)) return
    const bikeId = await bikeIdForActivity(admin, userId, activity)
    await admin.from('ride_metrics').upsert({
      user_id: userId,
      strava_activity_id: activity.id,
      bike_id: bikeId,
      distance_km: activity.distance ? Math.round(activity.distance / 100) / 10 : null,
      moving_time_s: activity.moving_time || null,
      elevation_m: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null,
      avg_watts: activity.average_watts ? Math.round(activity.average_watts) : null,
      device_watts: !!activity.device_watts,
      avg_hr: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      avg_speed_kmh: activity.average_speed ? Math.round(activity.average_speed * 3.6 * 10) / 10 : null,
      ride_date: activity.start_date || new Date().toISOString(),
    }, { onConflict: 'strava_activity_id' })
  } catch (e) {
    console.error('recordRideMetrics error:', e?.message)
  }
}

// Prüft eine neu erstellte Aktivität auf das Renn-Flag und legt bei Treffer
// einen Renntagebuch-Vorschlag an (Anzeige/Bestätigung passiert in der App).
async function checkRaceCandidate(admin, userId, activity) {
  try {
    if (!isRaceActivity(activity)) return null
    const activityId = activity.id

    // Schon bekannt (z. B. Strava-Retry des Webhooks)? → kein erneuter Push.
    const { data: existing } = await admin.from('race_candidates')
      .select('id').eq('user_id', userId).eq('strava_activity_id', activityId).maybeSingle()
    if (existing) return null

    const bikeId = await bikeIdForActivity(admin, userId, activity)
    const { data: row, error } = await admin.from('race_candidates')
      .insert({
        user_id: userId,
        strava_activity_id: activityId,
        event_name: activity.name || null,
        race_date: activity.start_date_local ? activity.start_date_local.slice(0, 10) : null,
        bike_id: bikeId,
        distance_km: activity.distance ? Math.round(activity.distance / 100) / 10 : null,
        elevation_m: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null,
        avg_power: activity.average_watts ? Math.round(activity.average_watts) : null,
        avg_speed: activity.average_speed ? Math.round(activity.average_speed * 3.6 * 10) / 10 : null,
      })
      .select().single()
    if (error) throw error
    return row
  } catch (e) {
    console.error('checkRaceCandidate error:', e?.message)
    return null
  }
}

export default async function handler(req, res) {
  // 1) Verifizierungs-Handshake von Strava
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token && token === process.env.STRAVA_VERIFY_TOKEN) {
      return res.status(200).json({ 'hub.challenge': challenge })
    }
    return res.status(403).json({ error: 'verify failed' })
  }
  if (req.method !== 'POST') return res.status(405).end()

  const event = req.body || {}
  try {
    if (event.object_type !== 'activity' || (event.aspect_type !== 'create' && event.aspect_type !== 'update')) {
      return res.status(200).json({ ok: true, ignored: true })
    }

    const admin = getAdmin()
    const { data: tok } = await admin
      .from('strava_tokens').select('*').eq('athlete_id', event.owner_id).maybeSingle()
    if (!tok) return res.status(200).json({ ok: true, unmapped: true })
    const userId = tok.user_id

    // km sofort auffrischen
    await syncStravaUser(userId)

    // Aktivitätsdetails einmal holen und daraus Fahrt-Metriken (Watt/Puls/
    // Tempo für die Intensitäts-Erkennung) sowie den Renntagebuch-Vorschlag
    // ableiten. Update-Events aktualisieren die Metriken (z. B. Rad-Wechsel).
    // Scheitert der Strava-Abruf, dürfen km-/Fällig-Pushes trotzdem laufen.
    let raceCandidate = null
    const activity = await fetchActivityDetail(admin, tok, event.object_id)
      .catch((e) => { console.error('fetchActivityDetail error:', e?.message); return null })
    if (activity) {
      await recordRideMetrics(admin, userId, activity)
      if (event.aspect_type === 'create') {
        raceCandidate = await checkRaceCandidate(admin, userId, activity)
      }
    }

    const [{ data: bikes }, { data: trackers }, { data: subs }, { data: profile }] = await Promise.all([
      admin.from('bikes').select('id,user_id,name,km,archived,notified_km').eq('user_id', userId),
      admin.from('trackers').select('*').eq('user_id', userId),
      admin.from('push_subscriptions').select('endpoint,subscription').eq('user_id', userId),
      admin.from('profiles').select('notify_every_ride').eq('user_id', userId).maybeSingle(),
    ])
    if (!subs || !subs.length) return res.status(200).json({ ok: true, noSubs: true, raceCandidate: !!raceCandidate })

    if (raceCandidate) {
      const wp0 = configureWebPush()
      const racePayload = { title: '🏁 Wettkampf erkannt', body: `${raceCandidate.event_name || 'Aktivität'} – Renntagebuch ausfüllen?`, url: '/races', tag: 'cyclog-race' }
      await sendToSubscriptions(wp0, admin, subs, racePayload)
      await logNotification(admin, userId, racePayload)
    }

    const hours = await hoursByBike(admin)
    const bikeById = {}
    for (const b0 of bikes || []) bikeById[b0.id] = b0
    const items = (trackers || [])
      .filter((t) => bikeById[t.bike_id] && !bikeById[t.bike_id].archived)
      .map((t) => ({ t, bike: bikeById[t.bike_id], p: pct(t, bikeById[t.bike_id].km, hours[t.bike_id] || 0) }))

    const b = evaluateBucket(items, Date.now())
    const kmChanges = buildKmChanges(bikes)
    const payload = composePush(b, kmChanges, !!profile?.notify_every_ride)

    // Basislinie nachziehen, damit Wiederholungen/Folge-Syncs nicht doppelt melden
    await updateNotifiedKm(admin, bikes)

    if (!payload) return res.status(200).json({ ok: true, nothing: true })

    const wp = configureWebPush()
    const sent = await sendToSubscriptions(wp, admin, subs, payload)
    await logNotification(admin, userId, payload)
    const nowIso = new Date().toISOString()
    if (b.due.length) await admin.from('trackers').update({ last_notified_at: nowIso }).in('id', b.due.map((i) => i.t.id))
    if (b.soon.length) await admin.from('trackers').update({ warn_notified_at: nowIso }).in('id', b.soon.map((i) => i.t.id))

    return res.status(200).json({ ok: true, sent })
  } catch (e) {
    // Trotzdem 200, damit Strava nicht endlos wiederholt.
    console.error('strava-webhook error:', e?.message)
    return res.status(200).json({ ok: false, error: e?.message })
  }
}
