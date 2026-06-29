// Täglicher Cron (Vercel):
//  1) Strava serverseitig synchronisieren (km auffrischen)
//  2) Fällig/bald fällig + km-Änderungen je Rad melden (eine Push/Nutzer)
//  3) Montags zusätzlich ein kurzer Wochenüberblick
// Geschützt über CRON_SECRET.

import {
  getAdmin, configureWebPush, pct, sendToSubscriptions,
  evaluateBucket, buildKmChanges, composePush, hoursByBike, syncStravaUser, updateNotifiedKm, logNotification,
} from './_due.js'

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const admin = getAdmin()
    const wp = configureWebPush()

    const { data: toks } = await admin.from('strava_tokens').select('user_id')
    for (const tk of toks || []) await syncStravaUser(tk.user_id)

    const [{ data: bikes }, { data: trackers }, { data: subs }, { data: profiles }] = await Promise.all([
      admin.from('bikes').select('id,user_id,name,km,archived,notified_km'),
      admin.from('trackers').select('*'),
      admin.from('push_subscriptions').select('endpoint,subscription,user_id'),
      admin.from('profiles').select('user_id,notify_every_ride'),
    ])
    const hours = await hoursByBike(admin)

    const bikeById = {}
    const bikesByUser = {}
    for (const b of bikes || []) {
      bikeById[b.id] = b
      ;(bikesByUser[b.user_id] ||= []).push(b)
    }
    const subsByUser = {}
    for (const s of subs || []) (subsByUser[s.user_id] ||= []).push(s)
    const everyRideByUser = {}
    for (const p of profiles || []) everyRideByUser[p.user_id] = !!p.notify_every_ride
    const itemsByUser = {}
    for (const t of trackers || []) {
      const bike = bikeById[t.bike_id]
      if (!bike || bike.archived) continue
      ;(itemsByUser[t.user_id] ||= []).push({ t, bike, p: pct(t, bike.km, hours[bike.id] || 0) })
    }

    const now = Date.now()
    const isMonday = new Date().getUTCDay() === 1
    let pushesSent = 0
    const stampDue = []
    const stampWarn = []

    const userIds = new Set([...Object.keys(itemsByUser), ...Object.keys(bikesByUser)])
    for (const userId of userIds) {
      const userSubs = subsByUser[userId]
      if (!userSubs || !userSubs.length) continue
      const b = evaluateBucket(itemsByUser[userId] || [], now)
      const everyRide = everyRideByUser[userId]

      let payload = null
      if (isMonday && (b.dueAll > 0 || b.soonAll > 0)) {
        const parts = []
        if (b.dueAll > 0) parts.push(`${b.dueAll} fällig`)
        if (b.soonAll > 0) parts.push(`${b.soonAll} bald fällig`)
        payload = { title: '📋 Wochenüberblick', body: `Diese Woche: ${parts.join(' · ')}.`, url: '/', tag: 'cyclog-weekly' }
      } else {
        payload = composePush(b, buildKmChanges(bikesByUser[userId] || []), everyRide)
      }
      if (!payload) continue

      const sent = await sendToSubscriptions(wp, admin, userSubs, payload)
      await logNotification(admin, userId, payload)
      if (sent > 0) {
        pushesSent += sent
        for (const i of b.due) stampDue.push(i.t.id)
        for (const i of b.soon) stampWarn.push(i.t.id)
      }
    }

    const nowIso = new Date().toISOString()
    if (stampDue.length) await admin.from('trackers').update({ last_notified_at: nowIso }).in('id', stampDue)
    if (stampWarn.length) await admin.from('trackers').update({ warn_notified_at: nowIso }).in('id', stampWarn)
    await updateNotifiedKm(admin, bikes) // Basislinie für alle Räder nachziehen

    return res.status(200).json({ ok: true, users: userIds.size, pushesSent, monday: isMonday })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'failed' })
  }
}
