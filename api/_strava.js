// Strava-Helfer (Node) – Token erneuern + athlete_id nachtragen.

const clientId = () => process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID
const clientSecret = () => process.env.STRAVA_CLIENT_SECRET

// Gültigen Access-Token liefern (bei Bedarf erneuern + persistieren).
export async function getAccessToken(admin, row) {
  const soon = Math.floor(Date.now() / 1000) + 60
  if (row.expires_at && Number(row.expires_at) > soon) return row.access_token

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }),
  })
  const fresh = await res.json()
  if (!fresh.access_token) throw new Error('Strava-Token-Refresh fehlgeschlagen')
  await admin.from('strava_tokens').update({
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: fresh.expires_at,
  }).eq('user_id', row.user_id)
  return fresh.access_token
}

// Für alle Verbindungen ohne athlete_id diese über /athlete nachtragen.
export async function backfillAthleteIds(admin) {
  const { data: toks } = await admin.from('strava_tokens').select('*').is('athlete_id', null)
  let n = 0
  for (const row of toks || []) {
    try {
      const at = await getAccessToken(admin, row)
      const res = await fetch('https://www.strava.com/api/v3/athlete', { headers: { Authorization: `Bearer ${at}` } })
      const ath = await res.json()
      if (ath?.id) {
        await admin.from('strava_tokens').update({ athlete_id: ath.id }).eq('user_id', row.user_id)
        n++
      }
    } catch (e) { /* einzelne überspringen */ }
  }
  return n
}
