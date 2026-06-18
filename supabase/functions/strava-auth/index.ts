// ═══════════════════════════════════════════════════════════
// Supabase Edge Function: strava-auth
// Tauscht den OAuth-Code gegen Access/Refresh Token
// und speichert ihn server-seitig in der Datenbank.
//
// Deploy:  supabase functions deploy strava-auth
// Secret:  supabase secrets set STRAVA_CLIENT_SECRET=xxx
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, userId } = await req.json()

    // 1) Code gegen Token tauschen
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })
    const token = await tokenRes.json()

    // 2) Token in DB speichern (mit Service Role Key)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('strava_tokens').upsert({
      user_id: userId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      athlete_name: `${token.athlete.firstname} ${token.athlete.lastname}`,
      updated_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ ok: true, athlete: token.athlete }),
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
