// Täglicher Cron (Vercel):
//  1) Strava serverseitig synchronisieren (km auffrischen) – damit Push auch
//     für Leute funktioniert, die die App lange nicht öffnen
//  2) Fällige (100%) und bald fällige (>=90%) Tracker je Nutzer melden
//     – höchstens eine Push pro Nutzer/Tag, entprellt pro Tracker
//  3) Montags zusätzlich ein kurzer Wochenüberblick
// Geschützt über CRON_SECRET (Vercel sendet es automatisch mit).

import {
  getAdmin, configureWebPush, pct, sendToSubscriptions,
  evaluateBucket, buildDueMessage, hoursByBike, syncStravaUser,
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

    // 1) km serverseitig auffrischen (best effort, pro Nutzer)
    const { data: toks } = await admin.from('strava_tokens').select('user_id')
    for (const tk of toks || []) await syncStravaUser(tk.user_id)

    // 2) frische Daten
    const [{ data: bikes }, { data: trackers }, { data: subs }] = await Promise.all([
      admin.from('bikes').select('id,user_id,name,km,archived'),
      admin.from('trackers').select('*'),
      admin.from('push_subscriptions').select('endpoint,subscription,user_id'),
    ])
    const hours = await hoursByBike(admin)

    const bikeById = {}
    for (const b of bikes || []) bikeById[b.id] = b
    const subsByUser = {}
    for (const s of subs || []) (subsByUser[s.user_id] ||= []).push(s)
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

    for (const [userId, items] of Object.entries(itemsByUser)) {
      const userSubs = subsByUser[userId]
      if (!userSubs || !userSubs.length) continue
      const b = evaluateBucket(items, now)

      let payload = null
      if (isMonday && (b.dueAll > 0 || b.soonAll > 0)) {
        const parts = []
        if (b.dueAll > 0) parts.push(`${b.dueAll} fällig`)
        if (b.soonAll > 0) parts.push(`${b.soonAll} bald fällig`)
        payload = { title: '📋 Wochenüberblick', body: `Diese Woche: ${parts.join(' · ')}.`, url: '/', tag: 'cyclog-weekly' }
      } else {
        payload = buildDueMessage(b)
      }
      if (!payload) continue

      const sent = await sendToSubscriptions(wp, admin, userSubs, payload)
      if (sent > 0) {
        pushesSent += sent
        for (const i of b.due) stampDue.push(i.t.id)
        for (const i of b.soon) stampWarn.push(i.t.id)
      }
    }

    const nowIso = new Date().toISOString()
    if (stampDue.length) await admin.from('trackers').update({ last_notified_at: nowIso }).in('id', stampDue)
    if (stampWarn.length) await admin.from('trackers').update({ warn_notified_at: nowIso }).in('id', stampWarn)

    return res.status(200).json({ ok: true, users: Object.keys(itemsByUser).length, pushesSent, monday: isMonday })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'failed' })
  }
}
