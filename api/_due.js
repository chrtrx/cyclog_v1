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
