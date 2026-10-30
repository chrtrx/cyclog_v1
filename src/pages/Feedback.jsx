import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { addFeedback, getMyFeedback, FEEDBACK_KINDS, FEEDBACK_AREAS } from '../lib/data'
import { CHANGELOG } from '../lib/changelog'
import { Page } from '../components/ui'

// Rückmeldungen der Beta-Tester.
//
// Bewusst kurz gehalten: Art antippen, schreiben, abschicken. Jedes
// Pflichtfeld mehr kostet Rückmeldungen – und zwar die beiläufigen, also die
// ehrlichen. Bereich und Gerät sind freiwillig bzw. automatisch.

const APP_VERSION = CHANGELOG[0]?.v || null
const fmt = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Feedback() {
  const { user } = useAuth()
  const [kind, setKind]   = useState('idea')
  const [area, setArea]   = useState('')
  const [msg, setMsg]     = useState('')
  const [mine, setMine]   = useState([])
  const [busy, setBusy]   = useState(false)
  const [sent, setSent]   = useState(false)
  const [err, setErr]     = useState('')

  useEffect(() => { getMyFeedback(user.id).then(setMine).catch(() => {}) }, [])

  async function send() {
    const text = msg.trim()
    if (!text) return
    setBusy(true); setErr('')
    try {
      await addFeedback(user.id, {
        kind, area: area || null, message: text,
        app_version: APP_VERSION,
        // Ohne Gerät ist „geht bei mir nicht" nicht nachvollziehbar. Danach
        // zu fragen hieße, den Tester zum Zulieferer zu machen.
        user_agent: navigator.userAgent.slice(0, 400),
      })
      setMsg(''); setArea(''); setSent(true)
      setMine(await getMyFeedback(user.id).catch(() => mine))
    } catch (e) {
      setErr(e?.message || 'Konnte nicht gesendet werden')
    } finally { setBusy(false) }
  }

  const kindOf = (id) => FEEDBACK_KINDS.find(k => k.id === id) || FEEDBACK_KINDS[3]

  return (
    <Page title="Feedback" subtitle="Was fehlt, was nervt, was gefällt" back="/more">
      <div className="fb-intro">
        Du testest eine Vorabfassung. Alles ist willkommen – besonders das, was
        dich aufgehalten hat. Gerät und App-Version schicke ich automatisch mit,
        damit ich einen Fehler auch nachstellen kann.
      </div>

      <div className="fb-lbl">Worum geht es?</div>
      <div className="fb-chips">
        {FEEDBACK_KINDS.map(k => (
          <button key={k.id} className={`fb-chip ${kind === k.id ? 'on' : ''}`}
            onClick={() => setKind(k.id)}>{k.icon} {k.label}</button>
        ))}
      </div>

      <div className="fb-lbl">Wo? <em>(freiwillig)</em></div>
      <div className="fb-chips">
        {FEEDBACK_AREAS.map(a => (
          <button key={a} className={`fb-chip sm ${area === a ? 'on' : ''}`}
            onClick={() => setArea(area === a ? '' : a)}>{a}</button>
        ))}
      </div>

      <div className="fb-lbl">Deine Rückmeldung</div>
      <textarea className="fb-text" rows={6} value={msg}
        onChange={e => { setMsg(e.target.value); setSent(false) }}
        placeholder={kind === 'bug'
          ? 'Was hast du gemacht, und was ist stattdessen passiert?'
          : 'Schreib einfach drauflos.'} />

      <button className="fb-send" disabled={busy || !msg.trim()} onClick={send}>
        {busy ? 'Sende…' : 'Abschicken'}
      </button>
      {sent && <div className="fb-ok">✓ Angekommen. Danke – das hilft wirklich.</div>}
      {err && <div className="fb-err">{err}</div>}

      {mine.length > 0 && (
        <>
          <div className="fb-lbl fb-lbl2">Von dir gesendet</div>
          {mine.map(f => (
            <div key={f.id} className="fb-row">
              <span className="fb-ico">{kindOf(f.kind).icon}</span>
              <span className="fb-main">
                {f.message}
                <span className="fb-meta">
                  {fmt(f.created_at)}{f.area ? ` · ${f.area}` : ''}
                </span>
              </span>
            </div>
          ))}
        </>
      )}

      <style>{`
        .fb-intro { border:1px dashed var(--line); padding:16px; font-family:var(--mono); font-size:0.71875rem; color:var(--ink3); line-height:1.75; margin-bottom:22px; }
        .fb-lbl { font-family:var(--mono); font-size:0.65625rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin:0 2px 10px; }
        .fb-lbl em { font-style:normal; font-weight:400; letter-spacing:.5px; text-transform:none; }
        .fb-lbl2 { margin-top:30px; }
        .fb-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:20px; }
        .fb-chip { background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--mono); font-size:0.75rem; font-weight:700; padding:10px 13px; }
        .fb-chip.sm { font-size:0.6875rem; padding:8px 11px; }
        .fb-chip.on { background:color-mix(in srgb, var(--acc) 12%, transparent); border-color:var(--acc); color:var(--acc); }
        .fb-text { width:100%; background:var(--panel2); border:1px solid var(--line); color:var(--ink1); font-family:var(--sans); font-size:0.875rem; line-height:1.6; padding:12px; resize:vertical; }
        .fb-text:focus { outline:none; border-color:var(--acc); }
        .fb-send { width:100%; margin-top:14px; background:var(--acc); border:none; color:var(--on-acc); font-family:var(--mono); font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:14px; }
        .fb-send:disabled { opacity:.45; }
        .fb-ok { margin-top:12px; border:1px solid var(--ok); color:var(--ok); padding:11px 12px; font-family:var(--mono); font-size:0.6875rem; }
        .fb-err { margin-top:12px; border:1px solid var(--crit); color:var(--crit); padding:11px 12px; font-family:var(--mono); font-size:0.6875rem; }
        .fb-row { display:flex; align-items:flex-start; gap:11px; padding:12px; border:1px solid var(--line); margin-bottom:5px; }
        .fb-ico { flex-shrink:0; font-size:0.875rem; padding-top:1px; }
        .fb-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; font-family:var(--sans); font-size:0.8125rem; color:var(--ink1); line-height:1.55; overflow-wrap:anywhere; }
        .fb-meta { font-family:var(--mono); font-size:0.625rem; color:var(--ink3); }
      `}</style>
    </Page>
  )
}
