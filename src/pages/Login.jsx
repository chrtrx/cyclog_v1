import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('signin')
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
      if (error.message.includes('already registered')) setMsg('Diese E-Mail ist schon registriert. Wechsle zu „Anmelden".')
      else if (error.message.includes('Invalid login')) setMsg('E-Mail oder Passwort stimmt nicht.')
      else if (error.message.includes('Email not confirmed')) setInfo('Bitte bestätige zuerst die E-Mail, die wir dir geschickt haben.')
      else setMsg(error.message)
    } else if (mode === 'signup') {
      setInfo('Fast fertig! Falls eine Bestätigungs-Mail kommt, klick den Link. Danach kannst du dich anmelden.')
    }
  }

  async function handleReset() {
    if (!email) { setMsg('Gib zuerst deine E-Mail ein, dann auf „Passwort vergessen".'); return }
    const { error } = await resetPassword(email)
    if (error) setMsg(error.message)
    else setInfo('Wir haben dir eine Mail zum Zurücksetzen geschickt.')
  }

  return (
    <div className="lg-wrap">
      <div className="lg-card">
        <div className="lg-mark">
          <svg viewBox="0 0 100 100"><defs><linearGradient id="lgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee"/><stop offset="1" stopColor="#1466d6"/></linearGradient></defs><rect width="100" height="100" rx="14" fill="#0d2240"/><path d="M70 28 A29 29 0 1 0 70 72" fill="none" stroke="url(#lgg)" strokeWidth="11" strokeLinecap="round"/><g stroke="#22d3ee" strokeWidth="2.4" opacity="0.5"><line x1="50" y1="50" x2="50" y2="28"/><line x1="50" y1="50" x2="69" y2="39"/><line x1="50" y1="50" x2="69" y2="61"/><line x1="50" y1="50" x2="50" y2="72"/><line x1="50" y1="50" x2="31" y2="61"/><line x1="50" y1="50" x2="31" y2="39"/></g><circle cx="50" cy="50" r="5" fill="#22d3ee"/><circle cx="70" cy="28" r="5.5" fill="#22d3ee"/></svg>
        </div>
        <h1 className="lg-title">CYCLOG</h1>
        <p className="lg-sub">Dein digitales Fahrrad-Gedächtnis</p>

        <div className="lg-seg">
          <button className={`lg-seg-b ${mode === 'signin' ? 'on' : ''}`} onClick={() => { setMode('signin'); setMsg(null); setInfo(null) }}>Anmelden</button>
          <button className={`lg-seg-b ${mode === 'signup' ? 'on' : ''}`} onClick={() => { setMode('signup'); setMsg(null); setInfo(null) }}>Registrieren</button>
        </div>

        <input className="lg-input" type="email" placeholder="deine@email.de"
          value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="lg-input" type="password" placeholder="Passwort"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />

        <button className="lg-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Moment…' : mode === 'signup' ? 'Account erstellen' : 'Anmelden'}
        </button>

        {mode === 'signin' && (
          <button className="lg-link" onClick={handleReset}>Passwort vergessen?</button>
        )}

        {msg && <div className="lg-msg err">{msg}</div>}
        {info && <div className="lg-msg ok">{info}</div>}

        <p className="lg-hint">
          {mode === 'signup'
            ? 'Mit einem Account sind deine Bikes auf allen Geräten verfügbar.'
            : 'Melde dich an, um auf deine Bikes zuzugreifen.'}
        </p>
      </div>

      <style>{`
        .lg-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
        .lg-card { background:linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.015)); border:1px solid var(--line); padding:34px 26px; width:100%; max-width:380px; text-align:center; box-shadow:0 18px 40px rgba(0,0,0,.5); }
        .lg-mark { width:60px; height:60px; margin:0 auto 18px; box-shadow:0 6px 18px rgba(34,211,238,.3); }
        .lg-mark svg { width:100%; height:100%; display:block; }
        .lg-title { font-family:var(--sans); font-size:26px; font-weight:900; letter-spacing:6px; color:var(--ink1); margin-bottom:6px; }
        .lg-sub { font-family:var(--mono); font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); margin-bottom:22px; }
        .lg-seg { display:flex; gap:0; border:1px solid var(--line); margin-bottom:18px; }
        .lg-seg-b { flex:1; border:none; background:none; padding:11px; font-family:var(--mono); font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); }
        .lg-seg-b.on { background:var(--acc); color:#fff; }
        .lg-input { width:100%; background:var(--panel2); border:1px solid var(--line); padding:14px 14px; font-size:15px; color:var(--ink1); font-family:var(--mono); outline:none; margin-bottom:11px; }
        .lg-input:focus { border-color:var(--acc); }
        .lg-input::placeholder { color:var(--ink3); }
        .lg-btn { width:100%; background:var(--acc); color:#fff; border:none; padding:15px; font-family:var(--sans); font-size:14px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; transition:background .12s; }
        .lg-btn:active { background:var(--acc-d); }
        .lg-btn:disabled { opacity:.6; }
        .lg-link { background:none; border:none; color:var(--acc-soft); font-family:var(--mono); font-size:12px; font-weight:500; letter-spacing:.5px; margin-top:12px; }
        .lg-msg { margin-top:14px; padding:11px 12px; font-family:var(--mono); font-size:12px; font-weight:500; line-height:1.5; border:1px solid; text-align:left; }
        .lg-msg.err { color:var(--crit); border-color:rgba(224,86,110,.4); background:rgba(224,86,110,.06); }
        .lg-msg.ok { color:var(--ok); border-color:rgba(52,199,154,.4); background:rgba(52,199,154,.06); }
        .lg-hint { font-family:var(--mono); font-size:11px; color:var(--ink3); margin-top:16px; line-height:1.6; }
      `}</style>
    </div>
  )
}
