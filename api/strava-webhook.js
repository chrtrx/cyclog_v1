// Strava-Webhook: GET = Verifizierung, POST = Aktivitäts-Events.
// Bei neuer/aktualisierter Aktivität: km sofort syncen + ggf. Push schicken.

import {
  getAdmin, configureWebPush, pct, sendToSubscriptions,
  evaluateBucket, buildKmChanges, composePush, hoursByBike, syncStravaUser, updateNotifiedKm, logNotification,
} from './_due.js'
import { fetchActivityDetail, isRaceActivity } from './_strava.js'

// Prüft eine neu erstellte Aktivität auf das Renn-Flag und legt bei Treffer
// einen Renntagebuch-Vorschlag an (Anzeige/Bestätigung passiert in der App).
async function checkRaceCandidate(admin, userId, activityId) {
  try {
    // Schon bekannt (z. B. Strava-Retry des Webhooks)? → kein erneuter Push.
    const { data: existing } = await admin.from('race_candidates')
      .select('id').eq('user_id', userId).eq('strava_activity_id', activityId).maybeSingle()
    if (existing) return null

    const { data: tok } = await admin.from('strava_tokens').select('*').eq('user_id', userId).maybeSingle()
    if (!tok) return null
    const activity = await fetchActivityDetail(admin, tok, activityId)
    if (!isRaceActivity(activity)) return null

    let bikeId = null
    if (activity.gear_id) {
      const { data: bike } = await admin.from('bikes').select('id').eq('user_id', userId).eq('strava_gear_id', activity.gear_id).maybeSingle()
      bikeId = bike?.id || null
    }
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
      .from('strava_tokens').select('user_id').eq('athlete_id', event.owner_id).maybeSingle()
    if (!tok) return res.status(200).json({ ok: true, unmapped: true })
    const userId = tok.user_id

    // km sofort auffrischen
    await syncStravaUser(userId)

    // Neue Aktivität mit gesetztem Renn-Flag? → Renntagebuch-Vorschlag anlegen
    // (unabhängig von Push-Subscriptions, die App zeigt ihn im Renntagebuch an).
    let raceCandidate = null
    if (event.aspect_type === 'create') {
      raceCandidate = await checkRaceCandidate(admin, userId, event.object_id)
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
