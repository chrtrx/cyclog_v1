// Listet die Strava-Ausrüstung des eingeloggten Nutzers, damit die Rolle in
// der App zugeordnet werden kann.
//
// Hintergrund: Räder werden in Cyclog über strava_gear_id mit Strava
// verknüpft, und genau diese Verknüpfung entscheidet, welchem Rad eine Fahrt
// gutgeschrieben wird (api/strava-webhook.js → bikeIdForActivity). Für die
// Rolle gab es bisher keinen Weg, diese ID einzutragen.
//
// Authentifizierung über das Supabase-Access-Token, wie bei strava-backfill.

import { getAdmin } from './_due.js'
import { getAccessToken } from './_strava.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })

  const auth = req.headers['authorization'] || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'no token' })

  try {
    const admin = getAdmin()
    const { data: userData, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !userData?.user) return res.status(401).json({ error: 'invalid token' })
    const userId = userData.user.id

    const { data: tok } = await admin.from('strava_tokens')
      .select('*').eq('user_id', userId).maybeSingle()
    if (!tok) return res.status(200).json({ ok: true, gear: [], noStrava: true })

    const at = await getAccessToken(admin, tok)
    const r = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${at}` },
    })
    if (!r.ok) return res.status(200).json({ ok: false, gear: [], error: `strava ${r.status}` })
    const ath = await r.json()

    // Schon vergebene Gear-IDs mitliefern, damit die Auswahl zeigt, welche
    // Ausrüstung bereits an einem Rad hängt.
    const { data: bikes } = await admin.from('bikes')
      .select('id,name,strava_gear_id').eq('user_id', userId)
    const takenBy = {}
    for (const b of bikes || []) if (b.strava_gear_id) takenBy[b.strava_gear_id] = b.name

    const gear = (ath.bikes || [])
      .filter((b) => !b.retired)
      .map((b) => ({
        id: b.id,
        name: b.name,
        km: Math.round((b.distance || 0) / 1000),
        takenBy: takenBy[b.id] || null,
      }))
      .sort((a, b) => b.km - a.km)

    return res.status(200).json({ ok: true, gear })
  } catch (e) {
    console.error('strava-gear error:', e?.message)
    return res.status(200).json({ ok: false, gear: [], error: e?.message })
  }
}
