import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSave() {
    setMsg(null)
    if (!password || password.length < 6) { setMsg('Passwort muss mindestens 6 Zeichen haben.'); return }
    if (password !== password2) { setMsg('Die Passwörter stimmen nicht überein.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setDone(true)
  }

  return (
    <div className="rp-wrap">
      <div className="rp-card">
        <div className="rp-logo">🔑</div>
        {!done ? (
          <>
            <h1 className="rp-title">Neues Passwort</h1>
            <p className="rp-sub">Vergib jetzt ein Passwort für deinen Account.</p>
            <input className="rp-input" type="password" placeholder="Neues Passwort"
              value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <input className="rp-input" type="password" placeholder="Passwort wiederholen"
              value={password2} onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()} autoComplete="new-password" />
            <button className="rp-btn" onClick={handleSave} disabled={loading}>
              {loading ? 'Speichere…' : 'Passwort speichern'}
            </button>
            {msg && <div className="rp-msg err">{msg}</div>}
          </>
        ) : (
          <>
            <h1 className="rp-title">Geschafft! ✅</h1>
            <p className="rp-sub">Dein Passwort ist gesetzt. Ab jetzt meldest du dich mit E-Mail + Passwort an.</p>
            <button className="rp-btn" onClick={() => onDone ? onDone() : (window.location.href = '/')}>
              Weiter zur App
            </button>
          </>
        )}
      </div>

      <style>{`
        .rp-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
        .rp-card { background:var(--white); border-radius:var(--r-xl); border:2px solid var(--border); box-shadow:0 6px 0 var(--border); padding:36px 28px; width:100%; max-width:380px; text-align:center; }
        .rp-logo { width:64px; height:64px; background:var(--blue,#1cb0f6); border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 18px; box-shadow:0 5px 0 #1899d6; }
        .rp-title { font-family:'Nunito',sans-serif; font-size:26px; font-weight:900; color:var(--t1); margin-bottom:8px; }
        .rp-sub { font-size:14px; color:var(--t2); font-weight:600; line-height:1.5; margin-bottom:22px; }
        .rp-input { width:100%; background:var(--bg); border:2px solid var(--border); border-radius:14px; padding:14px 16px; font-size:16px; color:var(--t1); font-weight:600; outline:none; margin-bottom:12px; font-family:'Nunito Sans',sans-serif; }
        .rp-input:focus { border-color:var(--blue,#1cb0f6); }
        .rp-btn { width:100%; background:var(--green); color:white; border:none; border-radius:14px; padding:15px; font-family:'Nunito',sans-serif; font-size:17px; font-weight:900; box-shadow:0 5px 0 var(--green-d); transition:all .1s; }
        .rp-btn:active { transform:translateY(3px); box-shadow:0 2px 0 var(--green-d); }
        .rp-btn:disabled { opacity:.6; }
        .rp-msg { margin-top:14px; padding:10px 12px; border-radius:12px; font-size:13px; font-weight:700; }
        .rp-msg.err { background:var(--red-l); color:var(--red-d); }
      `}</style>
    </div>
  )
}
