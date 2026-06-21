import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [info, setInfo] = useState(null)

  async function handleSubmit() {
    setMsg(null); setInfo(null)
    if (!email || !password) { setMsg('Bitte E-Mail und Passwort eingeben.'); return }
    if (password.length < 6) { setMsg('Passwort muss mindestens 6 Zeichen haben.'); return }
    setLoading(true)
    const fn = mode === 'signup' ? signUp : signIn
    const { error } = await fn(email, password)
    setLoading(false)
    if (error) {
      // häufige Fehler verständlich machen
      if (error.message.includes('already registered')) setMsg('Diese E-Mail ist schon registriert. Wechsle zu „Anmelden".')
      else if (error.message.includes('Invalid login')) setMsg('E-Mail oder Passwort stimmt nicht.')
      else if (error.message.includes('Email not confirmed')) setInfo('Bitte bestätige zuerst die E-Mail, die wir dir geschickt haben.')
      else setMsg(error.message)
    } else if (mode === 'signup') {
      setInfo('Fast fertig! Falls eine Bestätigungs-Mail kommt, klick den Link. Danach kannst du dich anmelden.')
    }
    // bei erfolgreichem signIn passiert der Rest automatisch (Session)
  }

  async function handleReset() {
    if (!email) { setMsg('Gib zuerst deine E-Mail ein, dann auf „Passwort vergessen".'); return }
    const { error } = await resetPassword(email)
    if (error) setMsg(error.message)
    else setInfo('Wir haben dir eine Mail zum Zurücksetzen geschickt.')
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🚴</div>
        <h1 className="login-title">Cyclog</h1>
        <p className="login-sub">Dein digitales Fahrrad-Gedächtnis</p>

        <div className="seg">
          <button className={`seg-btn ${mode === 'signin' ? 'on' : ''}`} onClick={() => { setMode('signin'); setMsg(null); setInfo(null) }}>Anmelden</button>
          <button className={`seg-btn ${mode === 'signup' ? 'on' : ''}`} onClick={() => { setMode('signup'); setMsg(null); setInfo(null) }}>Registrieren</button>
        </div>

        <input
          className="login-input" type="email" placeholder="deine@email.de"
          value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
        />
        <input
          className="login-input" type="password" placeholder="Passwort"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

        <button className="login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Moment…' : mode === 'signup' ? 'Account erstellen' : 'Anmelden'}
        </button>

        {mode === 'signin' && (
          <button className="login-link" onClick={handleReset}>Passwort vergessen?</button>
        )}

        {msg && <div className="login-msg err">{msg}</div>}
        {info && <div className="login-msg ok">{info}</div>}

        <p className="login-hint">
          {mode === 'signup'
            ? 'Mit einem Account sind deine Bikes auf allen Geräten verfügbar.'
            : 'Melde dich an, um auf deine Bikes zuzugreifen.'}
        </p>
      </div>

      <style>{`
        .login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
        .login-card { background:var(--white); border-radius:var(--r-xl); border:2px solid var(--border); box-shadow:0 6px 0 var(--border); padding:36px 28px; width:100%; max-width:380px; text-align:center; }
        .login-logo { width:64px; height:64px; background:var(--green); border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:34px; margin:0 auto 18px; box-shadow:0 5px 0 var(--green-d); }
        .login-title { font-family:'Nunito',sans-serif; font-size:30px; font-weight:900; color:var(--green); letter-spacing:-1px; margin-bottom:6px; }
        .login-sub { font-size:14px; color:var(--t2); font-weight:600; margin-bottom:22px; }
        .seg { display:flex; gap:6px; background:var(--bg); border-radius:50px; padding:4px; margin-bottom:18px; }
        .seg-btn { flex:1; border:none; background:none; padding:10px; border-radius:50px; font-family:'Nunito',sans-serif; font-size:14px; font-weight:800; color:var(--t2); cursor:pointer; }
        .seg-btn.on { background:var(--white); color:var(--green-d); box-shadow:0 2px 0 var(--border); }
        .login-input { width:100%; background:var(--bg); border:2px solid var(--border); border-radius:14px; padding:14px 16px; font-size:16px; color:var(--t1); font-weight:600; outline:none; margin-bottom:12px; transition:border-color .15s; font-family:'Nunito Sans',sans-serif; }
        .login-input:focus { border-color:var(--blue); }
        .login-btn { width:100%; background:var(--green); color:white; border:none; border-radius:14px; padding:15px; font-family:'Nunito',sans-serif; font-size:17px; font-weight:900; box-shadow:0 5px 0 var(--green-d); transition:all .1s; }
        .login-btn:active { transform:translateY(3px); box-shadow:0 2px 0 var(--green-d); }
        .login-btn:disabled { opacity:.6; }
        .login-link { background:none; border:none; color:var(--blue); font-family:'Nunito',sans-serif; font-size:13px; font-weight:800; margin-top:12px; cursor:pointer; }
        .login-msg { margin-top:14px; padding:10px 12px; border-radius:12px; font-size:13px; font-weight:700; line-height:1.4; }
        .login-msg.err { background:var(--red-l); color:var(--red-d); }
        .login-msg.ok { background:var(--green-l); color:var(--green-d); }
        .login-hint { font-size:12px; color:var(--t3); font-weight:600; margin-top:16px; line-height:1.5; }
      `}</style>
    </div>
  )
}
