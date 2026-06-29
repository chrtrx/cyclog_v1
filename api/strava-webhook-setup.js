// Einmalige Verwaltung des Strava-Webhooks (per Browser aufrufen).
// Schutz: ?secret=<CRON_SECRET>
//
//   action=status                          → aktuelle Subscription anzeigen
//   action=backfill                        → athlete_id für alle nachtragen
//   action=create&callback=<https-url>     → Subscription anlegen (+ backfill)
//   action=delete&id=<subId>               → Subscription löschen

import { getAdmin } from './_due.js'
import { backfillAthleteIds } from './_strava.js'

const clientId = () => process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID
const clientSecret = () => process.env.STRAVA_CLIENT_SECRET

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.query.secret !== secret) return res.status(401).json({ error: 'unauthorized' })

  const action = req.query.action || 'status'
  const cid = clientId()
  const csec = clientSecret()
  if (!cid || !csec) return res.status(500).json({ error: 'STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET fehlen in Vercel' })

  try {
    const admin = getAdmin()

    if (action === 'backfill') {
      return res.status(200).json({ ok: true, backfilled: await backfillAthleteIds(admin) })
    }

    if (action === 'status') {
      const r = await fetch(`https://www.strava.com/api/v3/push_subscriptions?client_id=${cid}&client_secret=${csec}`)
      return res.status(200).json({ ok: true, subscriptions: await r.json() })
    }

    if (action === 'create') {
      const callback = req.query.callback
      if (!callback) return res.status(400).json({ error: 'callback (https-URL zu /api/strava-webhook) fehlt' })
      if (!process.env.STRAVA_VERIFY_TOKEN) return res.status(500).json({ error: 'STRAVA_VERIFY_TOKEN fehlt in Vercel' })
      const backfilled = await backfillAthleteIds(admin)
      const form = new URLSearchParams({
        client_id: cid, client_secret: csec,
        callback_url: callback, verify_token: process.env.STRAVA_VERIFY_TOKEN,
      })
      const r = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
      })
      const result = await r.json()
      return res.status(r.ok ? 200 : 400).json({ ok: r.ok, backfilled, result })
    }

    if (action === 'delete') {
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'id fehlt' })
      const r = await fetch(`https://www.strava.com/api/v3/push_subscriptions/${id}?client_id=${cid}&client_secret=${csec}`, { method: 'DELETE' })
      return res.status(200).json({ ok: r.ok })
    }

    return res.status(400).json({ error: 'unbekannte action' })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'failed' })
  }
}
