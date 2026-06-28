// Täglicher Cron (Vercel): prüft fällige Tracker und schickt Push.
// Geplant in vercel.json. Geschützt über CRON_SECRET (Vercel sendet es mit).

import { getAdmin, configureWebPush, pct, sendToSubscriptions } from './_due.js'

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const admin = getAdmin()
    const wp = configureWebPush()

    const [{ data: bikes }, { data: trackers }, { data: subs }] = await Promise.all([
      admin.from('bikes').select('id,user_id,name,km,archived'),
      admin.from('trackers').select('*'),
      admin.from('push_subscriptions').select('endpoint,subscription,user_id'),
    ])

    // Stunden pro Bike (defensiv – activities-Tabelle evtl. leer/abweichend)
    const hoursByBike = {}
    try {
      const { data: acts } = await admin.from('activities').select('bike_id,moving_time')
      for (const a of acts || []) {
        hoursByBike[a.bike_id] = (hoursByBike[a.bike_id] || 0) + (Number(a.moving_time) || 0) / 3600
      }
    } catch (e) { /* ignorieren */ }

    const bikeById = {}
    for (const b of bikes || []) bikeById[b.id] = b
    const subsByUser = {}
    for (const s of subs || []) (subsByUser[s.user_id] ||= []).push(s)

    const weekAgo = Date.now() - 7 * 86400000
    const dueByUser = {} // userId -> [{ t, bike }]

    for (const t of trackers || []) {
      const bike = bikeById[t.bike_id]
      if (!bike || bike.archived) continue
      if (pct(t, bike.km, hoursByBike[bike.id] || 0) < 1) continue
      const last = t.last_notified_at ? new Date(t.last_notified_at).getTime() : 0
      if (last && last > weekAgo) continue // diese Woche schon erinnert
      ;(dueByUser[t.user_id] ||= []).push({ t, bike })
    }

    let usersNotified = 0
    let pushesSent = 0
    const stamped = []

    for (const [userId, items] of Object.entries(dueByUser)) {
      const userSubs = subsByUser[userId]
      if (!userSubs || !userSubs.length) continue

      const first = items[0]
      const title = items.length === 1 ? `🔧 ${first.t.title} fällig` : `🔧 ${items.length} Wartungen fällig`
      const body =
        items.length === 1
          ? `${first.bike.name}: ${first.t.title} ist dran.`
          : items.slice(0, 3).map((i) => `${i.t.title} (${i.bike.name})`).join(', ') + (items.length > 3 ? ' …' : '')

      const sent = await sendToSubscriptions(wp, admin, userSubs, { title, body, url: '/', tag: 'cyclog-due' })
      if (sent > 0) {
        usersNotified++
        pushesSent += sent
        for (const i of items) stamped.push(i.t.id)
      }
    }

    if (stamped.length) {
      await admin.from('trackers').update({ last_notified_at: new Date().toISOString() }).in('id', stamped)
    }

    return res.status(200).json({
      ok: true,
      dueUsers: Object.keys(dueByUser).length,
      usersNotified,
      pushesSent,
    })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'failed' })
  }
}
