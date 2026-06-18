// ═══════════════════════════════════════════════════════════
// Supabase Edge Function: strava-sync
// Holt die aktuellen Bikes + km-Stände von Strava
// und aktualisiert die Datenbank.
// Erneuert automatisch den Access-Token wenn abgelaufen.
//
// Deploy: supabase functions deploy strava-sync
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1) Token laden
    const { data: tok } = await supabase
      .from('strava_tokens').select('*').eq('user_id', userId).single()
    if (!tok) throw new Error('Keine Strava-Verbindung')

    // 2) Token erneuern falls abgelaufen
    let accessToken = tok.access_token
    if (tok.expires_at < Math.floor(Date.now() / 1000)) {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: tok.refresh_token,
        }),
      })
      const fresh = await refreshRes.json()
      accessToken = fresh.access_token
      await supabase.from('strava_tokens').update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: fresh.expires_at,
      }).eq('user_id', userId)
    }

    // 3) Athlete + Gear holen (athlete enthält bikes mit Distanz)
    const athRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const athlete = await athRes.json()
    const bikes = (athlete.bikes || []).filter((b: any) => !b.retired)

    // 4) Für jedes Strava-Bike den km-Stand in DB aktualisieren
    //    (matched über strava_gear_id)
    for (const b of bikes) {
      // detaillierte Gear-Info für genaue Distanz
      const gearRes = await fetch(`https://www.strava.com/api/v3/gear/${b.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const gear = await gearRes.json()
      const km = Math.round((gear.distance || 0) / 1000)

      await supabase.from('bikes')
        .update({ km })
        .eq('user_id', userId)
        .eq('strava_gear_id', b.id)
    }

    await supabase.from('profiles')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', userId)

    return new Response(
      JSON.stringify({ ok: true, bikes: bikes.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
