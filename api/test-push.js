// Test-Endpunkt: schickt eine Probe-Push an die Geräte des eingeloggten Nutzers.
// Authentifizierung über das Supabase-Access-Token im Authorization-Header.

import { getAdmin, configureWebPush, sendToSubscriptions, logNotification } from './_due.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const auth = req.headers['authorization'] || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'no token' })

  try {
    const admin = getAdmin()
    const { data: userData, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !userData?.user) {
      return res.status(401).json({
        error: 'invalid token',
        detail: uErr?.message || 'Token nicht verifizierbar – stimmt SUPABASE_URL mit der App-Projekt-URL überein?',
      })
    }
    const userId = userData.user.id

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint,subscription')
      .eq('user_id', userId)

    if (!subs || !subs.length) return res.status(200).json({ ok: true, sent: 0 })

    const payload = {
      title: '✅ Cyclog Test',
      body: 'Push-Benachrichtigungen funktionieren! 🚴',
      url: '/',
      tag: 'cyclog-test',
    }
    const wp = configureWebPush()
    const sent = await sendToSubscriptions(wp, admin, subs, payload)
    await logNotification(admin, userId, payload)
    return res.status(200).json({ ok: true, sent })
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'failed' })
  }
}
