import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { connectStrava } from '../lib/data'

export default function ConnectStrava() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [status, setStatus] = useState('idle') // idle | connecting | done | error
  const [msg, setMsg] = useState('')

  const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID
  const REDIRECT = `${window.location.origin}/connect-strava`

  // Callback: ?code=... von Strava
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) { setStatus('error'); setMsg('Zugriff abgelehnt'); return }
    if (code) handleCallback(code)
  }, [])

  async function handleCallback(code) {
    setStatus('connecting')
    try {
      const res = await connectStrava(code, user.id)
      setStatus('done')
      setMsg(res.athlete ? `Verbunden als ${res.athlete.firstname} ${res.athlete.lastname}` : 'Verbunden!')
      setTimeout(() => nav('/'), 1800)
    } catch (e) {
      setStatus('error'); setMsg(e.message || 'Verbindung fehlgeschlagen')
    }
  }

  function startOAuth() {
    const scope = 'read,activity:read_all,profile:read_all'
    const url = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${scope}&approval_prompt=auto`
    window.location.href = url
  }

  return (
    <div className="cs-wrap">
      <div className="cs-card">
        <div className="cs-logo">🟠</div>
        <h1 className="cs-title">Strava verbinden</h1>

        {status === 'idle' && (
          <>
            <p className="cs-text">
              Importiere automatisch deine Fahrräder und km-Stände.
              Cyclog ordnet jede Aktivität dem richtigen Bike zu.
            </p>
            <button className="cs-btn" onClick={startOAuth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13.4 19L8 10l5.4-9L19 10z" /><path d="M17 19l-2.5-5" /></svg>
              Mit Strava autorisieren
            </button>
            <button className="cs-skip" onClick={() => nav('/')}>Später</button>
          </>
        )}

        {status === 'connecting' && (
          <div className="cs-loading">
            <div className="cs-spinner" />
            <p className="cs-text">Verbinde mit Strava…</p>
          </div>
        )}

        {status === 'done' && (
          <div className="cs-done">
            <div className="cs-check">✅</div>
            <p className="cs-text">{msg}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="cs-error">
            <div className="cs-err-icon">⚠️</div>
            <p className="cs-text">{msg}</p>
            <button className="cs-btn" onClick={startOAuth}>Erneut versuchen</button>
            <button className="cs-skip" onClick={() => nav('/')}>Zurück</button>
          </div>
        )}
      </div>

      <style>{`
        .cs-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .cs-card { background: var(--white); border-radius: var(--r-xl); border: 2px solid var(--border); box-shadow: 0 6px 0 var(--border); padding: 36px 28px; width: 100%; max-width: 380px; text-align: center; }
        .cs-logo { font-size: 56px; margin-bottom: 16px; }
        .cs-title { font-family: 'Nunito', sans-serif; font-size: 26px; font-weight: 900; color: var(--t1); margin-bottom: 12px; }
        .cs-text { font-size: 14px; color: var(--t2); font-weight: 600; line-height: 1.6; margin-bottom: 22px; }
        .cs-btn { width: 100%; background: var(--strava); color: white; border: none; border-radius: 14px; padding: 15px; font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 900; box-shadow: 0 5px 0 var(--strava-d); display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; }
        .cs-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--strava-d); }
        .cs-skip { width: 100%; background: none; border: none; color: var(--t3); font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; padding: 10px; }
        .cs-spinner { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--strava); border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cs-check, .cs-err-icon { font-size: 48px; margin-bottom: 14px; }
      `}</style>
    </div>
  )
}
