import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email) return
    setLoading(true)
    const { error } = await signInWithEmail(email)
    setLoading(false)
    if (!error) setSent(true)
    else alert('Fehler: ' + error.message)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🚴</div>
        <h1 className="login-title">Cyclog</h1>
        <p className="login-sub">Dein Verschleiß-Tracker mit Strava-Sync</p>

        {!sent ? (
          <>
            <input
              className="login-input"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button className="login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? 'Sende…' : 'Login-Link senden'}
            </button>
            <p className="login-hint">Du bekommst einen Magic-Link per Mail. Kein Passwort nötig.</p>
          </>
        ) : (
          <div className="login-sent">
            <div className="login-sent-icon">📬</div>
            <p className="login-sent-text">
              Check deine Mails!<br />Klick den Link um dich einzuloggen.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .login-wrap { min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px; }
        .login-card { background:var(--white);border-radius:var(--r-xl);border:2px solid var(--border);box-shadow:0 6px 0 var(--border);padding:36px 28px;width:100%;max-width:380px;text-align:center; }
        .login-logo { width:64px;height:64px;background:var(--green);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 18px;box-shadow:0 5px 0 var(--green-d); }
        .login-title { font-family:'Nunito',sans-serif;font-size:30px;font-weight:900;color:var(--green);letter-spacing:-1px;margin-bottom:6px; }
        .login-sub { font-size:14px;color:var(--t2);font-weight:600;margin-bottom:26px; }
        .login-input { width:100%;background:var(--bg);border:2px solid var(--border);border-radius:14px;padding:14px 16px;font-size:16px;color:var(--t1);font-weight:600;outline:none;margin-bottom:12px;transition:border-color .15s; }
        .login-input:focus { border-color:var(--blue); }
        .login-btn { width:100%;background:var(--green);color:white;border:none;border-radius:14px;padding:15px;font-family:'Nunito',sans-serif;font-size:17px;font-weight:900;box-shadow:0 5px 0 var(--green-d);transition:all .1s; }
        .login-btn:active { transform:translateY(3px);box-shadow:0 2px 0 var(--green-d); }
        .login-btn:disabled { opacity:.6; }
        .login-hint { font-size:12px;color:var(--t3);font-weight:600;margin-top:14px;line-height:1.5; }
        .login-sent-icon { font-size:48px;margin-bottom:14px; }
        .login-sent-text { font-size:16px;color:var(--t1);font-weight:700;line-height:1.6; }
      `}</style>
    </div>
  )
}
