// Geteilte Helfer für die Push-Funktionen (Vercel Serverless, Node).
// Dateiname mit "_" → wird von Vercel nicht als eigener Endpunkt behandelt.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export function getAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function configureWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@cyclog.app'
  if (!pub || !priv) throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY fehlen')
  webpush.setVapidDetails(subject, pub, priv)
  return webpush
}

// Fortschritt 0..1 – Spiegel von src/lib/helpers.js (km / Stunden / Monate).
export function pct(t, bikeKm, bikeHours = 0) {
  if (t?.interval_type === 'date') {
    const months = Number(t?.interval_km)
    if (!months || months <= 0) return 0
    const start = new Date(t?.start_date)
    if (isNaN(start.getTime())) return 0
    const days = Math.max(0, (Date.now() - start.getTime()) / 86400000)
    const p = days / (months * 30.44)
    return isFinite(p) && p > 0 ? Math.min(p, 1) : 0
  }
  if (t?.interval_type === 'h') {
    const interval = Number(t?.interval_hours)
    if (!interval || interval <= 0) return 0
    const done = Math.max(0, (Number(bikeHours) || 0) - (Number(t?.hours_at_start) || 0))
    const p = done / interval
    return isFinite(p) && p > 0 ? Math.min(p, 1) : 0
  }
  const interval = Number(t?.interval_km)
  if (!interval || interval <= 0) return 0
  const done = Math.max(0, (Number(bikeKm) || 0) - (Number(t?.km_at_start) || 0))
  const p = done / interval
  return isFinite(p) && p > 0 ? Math.min(p, 1) : 0
}

export const WARN_THRESHOLD = 0.9
export const WEEK_MS = 7 * 86400000

// Teilt die Tracker eines Nutzers in „jetzt melden" (entprellt) und Gesamtzahlen.
// items: [{ t, bike, p }]
export function evaluateBucket(items, now) {
  const b = { due: [], soon: [], dueAll: 0, soonAll: 0 }
  for (const { t, bike, p } of items) {
    if (p >= 1) {
      b.dueAll++
      const last = t.last_notified_at ? new Date(t.last_notified_at).getTime() : 0
      if (!last || last <= now - WEEK_MS) b.due.push({ t, bike })
    } else if (p >= WARN_THRESHOLD) {
      b.soonAll++
      if (!t.warn_notified_at) b.soon.push({ t, bike })
    }
  }
  return b
}

// Baut die „fällig/bald fällig"-Nachricht (oder null, wenn nichts Neues).
export function buildDueMessage(b) {
  if (b.due.length) {
    const title = b.due.length === 1 ? `🔧 ${b.due[0].t.title} fällig` : `🔧 ${b.due.length} Wartungen fällig`
    const list = b.due.slice(0, 3).map((i) => `${i.t.title} (${i.bike.name})`).join(', ')
    const body = list + (b.due.length > 3 ? ' …' : '') + (b.soon.length ? ` · ${b.soon.length} bald fällig` : '')
    return { title, body, url: '/', tag: 'cyclog-due' }
  }
  if (b.soon.length) {
    const title = b.soon.length === 1 ? `🟡 ${b.soon[0].t.title} bald fällig` : `🟡 ${b.soon.length} bald fällig`
    const body = b.soon.slice(0, 3).map((i) => `${i.t.title} (${i.bike.name})`).join(', ') + (b.soon.length > 3 ? ' …' : '')
    return { title, body, url: '/', tag: 'cyclog-due' }
  }
  return null
}

// Stunden je Bike aus activities (defensiv – Tabelle evtl. leer/abweichend).
export async function hoursByBike(admin) {
  const map = {}
  try {
    const { data: acts } = await admin.from('activities').select('bike_id,moving_time')
    for (const a of acts || []) map[a.bike_id] = (map[a.bike_id] || 0) + (Number(a.moving_time) || 0) / 3600
  } catch (e) { /* ignorieren */ }
  return map
}

// Strava serverseitig für EINEN Nutzer synchronisieren (Edge Function).
export async function syncStravaUser(userId) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    await fetch(`${url}/functions/v1/strava-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ userId }),
    })
  } catch (e) { /* best effort */ }
}

// Sendet ein Payload an alle übergebenen Subscriptions; räumt tote Endpoints auf.
export async function sendToSubscriptions(wp, admin, subs, payload) {
  let sent = 0
  for (const row of subs) {
    try {
      await wp.sendNotification(row.subscription, JSON.stringify(payload))
      sent++
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
      }
    }
  }
  return sent
}
