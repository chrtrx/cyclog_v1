// Strava-Webhook: GET = Verifizierung, POST = Aktivitäts-Events.
// Bei neuer/aktualisierter Aktivität: km sofort syncen + ggf. Push schicken.

import {
  getAdmin, configureWebPush, pct, sendToSubscriptions,
  evaluateBucket, buildKmChanges, composePush, hoursByBike, syncStravaUser, updateNotifiedKm, logNotification,
} from './_due.js'

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

    const [{ data: bikes }, { data: trackers }, { data: subs }, { data: profile }] = await Promise.all([
      admin.from('bikes').select('id,user_id,name,km,archived,notified_km').eq('user_id', userId),
      admin.from('trackers').select('*').eq('user_id', userId),
      admin.from('push_subscriptions').select('endpoint,subscription').eq('user_id', userId),
      admin.from('profiles').select('notify_every_ride').eq('user_id', userId).maybeSingle(),
    ])
    if (!subs || !subs.length) return res.status(200).json({ ok: true, noSubs: true })

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
