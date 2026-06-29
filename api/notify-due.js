// Täglicher Cron (Vercel):
//  1) Strava serverseitig synchronisieren (km auffrischen) – damit Push auch
//     für Leute funktioniert, die die App lange nicht öffnen
//  2) Fällige (100%) und bald fällige (>=90%) Tracker je Nutzer melden
//     – höchstens eine Push pro Nutzer/Tag, entprellt pro Tracker
//  3) Montags zusätzlich ein kurzer Wochenüberblick
// Geschützt über CRON_SECRET (Vercel sendet es automatisch mit).

import { getAdmin, configureWebPush, pct, sendToSubscriptions } from './_due.js'

const WARN_THRESHOLD = 0.9
const WEEK_MS = 7 * 86400000

async function syncAllStrava(admin) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const { data: toks } = await admin.from('strava_tokens').select('user_id')
  for (const tk of toks || []) {
    try {
      await fetch(`${url}/functions/v1/strava-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
        body: JSON.stringify({ userId: tk.user_id }),
      })
    } catch (e) { /* einzelnen Nutzer überspringen */ }
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const admin = getAdmin()
    const wp = configureWebPush()

    // 1) km serverseitig auffrischen
    await syncAllStrava(admin)

    // 2) frische Daten laden
    const [{ data: bikes }, { data: trackers }, { data: subs }] = await Promise.all([
      admin.from('bikes').select('id,user_id,name,km,archived'),
      admin.from('trackers').select('*'),
      admin.from('push_subscriptions').select('endpoint,subscription,user_id'),
    ])

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

    const now = Date.now()
    // pro Nutzer: zu meldende Items + alle für den Wochenüberblick
    const perUser = {} // userId -> { due:[], soon:[], dueAll:0, soonAll:0 }
    const u = (id) => (perUser[id] ||= { due: [], soon: [], dueAll: 0, soonAll: 0 })

    for (const t of trackers || []) {
      const bike = bikeById[t.bike_id]
      if (!bike || bike.archived) continue
      const p = pct(t, bike.km, hoursByBike[bike.id] || 0)
      const bucket = u(t.user_id)

      if (p >= 1) {
        bucket.dueAll++
        const last = t.last_notified_at ? new Date(t.last_notified_at).getTime() : 0
        if (!last || last <= now - WEEK_MS) bucket.due.push({ t, bike })
      } else if (p >= WARN_THRESHOLD) {
        bucket.soonAll++
        if (!t.warn_notified_at) bucket.soon.push({ t, bike })
      }
    }

    const isMonday = new Date().getUTCDay() === 1
    let pushesSent = 0
    const stampDue = []
    const stampWarn = []

    for (const [userId, b] of Object.entries(perUser)) {
      const userSubs = subsByUser[userId]
      if (!userSubs || !userSubs.length) continue

      // Montag: Wochenüberblick statt Einzel-Ping (wenn etwas ansteht)
      if (isMonday && (b.dueAll > 0 || b.soonAll > 0)) {
        const parts = []
        if (b.dueAll > 0) parts.push(`${b.dueAll} fällig`)
        if (b.soonAll > 0) parts.push(`${b.soonAll} bald fällig`)
        const sent = await sendToSubscriptions(wp, admin, userSubs, {
          title: '📋 Wochenüberblick',
          body: `Diese Woche: ${parts.join(' · ')}.`,
          url: '/',
          tag: 'cyclog-weekly',
        })
        if (sent > 0) {
          pushesSent += sent
          for (const i of b.due) stampDue.push(i.t.id)
          for (const i of b.soon) stampWarn.push(i.t.id)
        }
        continue
      }

      // Werktags: nur wenn neu zu melden
      if (!b.due.length && !b.soon.length) continue

      let title, body
      if (b.due.length) {
        title = b.due.length === 1 ? `🔧 ${b.due[0].t.title} fällig` : `🔧 ${b.due.length} Wartungen fällig`
        const list = b.due.slice(0, 3).map((i) => `${i.t.title} (${i.bike.name})`).join(', ')
        body = list + (b.due.length > 3 ? ' …' : '') + (b.soon.length ? ` · ${b.soon.length} bald fällig` : '')
      } else {
        title = b.soon.length === 1 ? `🟡 ${b.soon[0].t.title} bald fällig` : `🟡 ${b.soon.length} bald fällig`
        body = b.soon.slice(0, 3).map((i) => `${i.t.title} (${i.bike.name})`).join(', ') + (b.soon.length > 3 ? ' …' : '')
      }

      const sent = await sendToSubscriptions(wp, admin, userSubs, { title, body, url: '/', tag: 'cyclog-due' })
      if (sent > 0) {
        pushesSent += sent
        for (const i of b.due) stampDue.push(i.t.id)
        for (const i of b.soon) stampWarn.push(i.t.id)
      }
    }

    const nowIso = new Date().toISOString()
    if (stampDue.length) await admin.from('trackers').update({ last_notified_at: nowIso }).in('id', stampDue)
    if (stampWarn.length) await admin.from('trackers').update({ warn_notified_at: nowIso }).in('id', stampWarn)

    return res.status(200).json({ ok: true, users: Object.keys(perUser).length, pushesSent, monday: isMonday })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'failed' })
  }
}
