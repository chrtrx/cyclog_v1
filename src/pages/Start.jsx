import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DotLogo from '../components/DotLogo'

// Öffentliche Einstiegsseite – das, was ein Beta-Tester über den Link zuerst
// sieht. Erreichbar ohne Anmeldung.
//
// Die eigentliche Hürde ist nicht die Registrierung, sondern „wo ist der
// Download". Cyclog ist eine Web-App: Es gibt keinen Store-Eintrag, man legt
// sie sich auf den Home-Bildschirm. Das weiß niemand von selbst, und auf
// iPhone und Android geht es unterschiedlich. Deshalb erkennt die Seite das
// Gerät und zeigt zuerst den passenden Weg – die anderen bleiben aufklappbar,
// weil die Erkennung über den User-Agent nie ganz sicher ist.

const isIOSDevice = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)   // iPad ab iPadOS 13

const STEPS = {
  ios: {
    label: 'iPhone / iPad',
    note: 'Wichtig: Das geht nur in Safari, nicht in Chrome oder im Instagram-Browser.',
    steps: [
      'Diese Seite in Safari öffnen',
      'Unten auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben)',
      'Nach unten wischen zu „Zum Home-Bildschirm"',
      'Oben rechts auf „Hinzufügen"',
    ],
  },
  android: {
    label: 'Android',
    note: 'Am einfachsten in Chrome.',
    steps: [
      'Diese Seite in Chrome öffnen',
      'Oben rechts auf die drei Punkte tippen',
      '„App installieren" bzw. „Zum Startbildschirm hinzufügen" wählen',
      'Bestätigen',
    ],
  },
  desktop: {
    label: 'Computer',
    note: 'Funktioniert auch einfach im Browser-Tab.',
    steps: [
      'In Chrome oder Edge öffnen',
      'Rechts in der Adresszeile auf das Installieren-Symbol klicken',
      'Bestätigen',
    ],
  },
}

export default function Start() {
  const nav = useNavigate()
  const [deferred, setDeferred] = useState(null)
  const [open, setOpen] = useState('')

  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  const guess = isIOSDevice() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop'

  useEffect(() => { setOpen(guess) }, [])

  // Android/Desktop-Chrome bieten echte Installation an – dann braucht es
  // keine Anleitung, sondern einen Knopf.
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    setDeferred(null)
  }

  return (
    <div className="sp">
      <div className="sp-head">
        <DotLogo cell={11} gap={2} fluid />
        <p className="sp-claim">Dein digitales Fahrrad-Gedächtnis</p>
      </div>

      <div className="sp-what">
        Cyclog merkt sich, wann du was an deinen Rädern gemacht hast – und sagt
        dir rechtzeitig, wann die Kette dran ist, die Bremsbeläge oder die
        Tubeless-Milch. Die Kilometer holt es sich selbst von Strava.
      </div>

      <div className="sp-beta">
        <strong>Beta-Test</strong>
        Du bist einer von wenigen Testern. Was fehlt, was nervt, was gefällt –
        in der App unter „Mehr → Feedback", direkt an mich.
      </div>

      {standalone ? (
        <div className="sp-done">✓ Die App ist schon installiert.</div>
      ) : (
        <>
          <h2 className="sp-h">So legst du sie dir aufs Handy</h2>
          {deferred && (
            <button className="sp-install" onClick={install}>App installieren</button>
          )}
          {Object.entries(STEPS).map(([id, s]) => (
            <div key={id} className={`sp-acc ${open === id ? 'on' : ''}`}>
              <button className="sp-acc-h" onClick={() => setOpen(open === id ? '' : id)}>
                <span>{s.label}{id === guess ? ' · dein Gerät' : ''}</span>
                <span className="sp-caret">{open === id ? '−' : '+'}</span>
              </button>
              {open === id && (
                <div className="sp-acc-b">
                  <ol>{s.steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
                  <p className="sp-note">{s.note}</p>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <button className="sp-go" onClick={() => nav('/login')}>
        {standalone ? 'Anmelden' : 'Weiter zur Anmeldung'}
      </button>
      <p className="sp-foot">
        Du kannst dich auch erst im Browser anmelden und die App später aufs
        Handy legen – es ist derselbe Zugang.
      </p>

      <style>{`
        .sp { max-width:520px; margin:0 auto; padding:calc(env(safe-area-inset-top) + 28px) 20px 60px; }
        .sp-head { text-align:center; margin-bottom:26px; color:var(--brand); }
        .sp-head svg { margin:0 auto; }
        .sp-claim { margin:14px 0 0; font-family:var(--mono); font-size:0.71875rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); }
        .sp-what { font-family:var(--sans); font-size:0.9375rem; line-height:1.7; color:var(--ink1); margin-bottom:20px; }
        .sp-beta { border:1px solid color-mix(in srgb, var(--acc) 35%, transparent); background:color-mix(in srgb, var(--acc) 8%, transparent); padding:14px; margin-bottom:30px; font-family:var(--mono); font-size:0.6875rem; line-height:1.75; color:var(--ink2); }
        .sp-beta strong { display:block; color:var(--acc); letter-spacing:1px; text-transform:uppercase; margin-bottom:6px; font-size:0.625rem; }
        .sp-h { font-family:var(--sans); font-size:1rem; font-weight:800; color:var(--ink1); letter-spacing:.2px; margin:0 0 12px; }
        .sp-install { width:100%; background:var(--acc); border:none; color:var(--on-acc); font-family:var(--mono); font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:14px; margin-bottom:14px; }
        .sp-acc { border:1px solid var(--line); margin-bottom:6px; }
        .sp-acc.on { border-color:color-mix(in srgb, var(--acc) 40%, transparent); }
        .sp-acc-h { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; background:var(--panel2); border:none; padding:13px; font-family:var(--mono); font-size:0.71875rem; font-weight:700; color:var(--ink1); text-align:left; }
        .sp-caret { color:var(--ink3); font-size:1rem; }
        .sp-acc-b { padding:4px 14px 14px; }
        .sp-acc-b ol { margin:0; padding-left:20px; }
        .sp-acc-b li { font-family:var(--sans); font-size:0.8125rem; line-height:1.75; color:var(--ink2); margin-bottom:4px; }
        .sp-note { margin:10px 0 0; font-family:var(--mono); font-size:0.625rem; color:var(--ink3); line-height:1.6; }
        .sp-done { border:1px solid var(--ok); color:var(--ok); padding:13px; font-family:var(--mono); font-size:0.71875rem; margin-bottom:22px; }
        .sp-go { width:100%; margin-top:26px; background:var(--panel2); border:1px solid var(--acc); color:var(--acc); font-family:var(--mono); font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:14px; }
        .sp-foot { margin:12px 2px 0; font-family:var(--mono); font-size:0.625rem; color:var(--ink3); line-height:1.7; text-align:center; }
      `}</style>
    </div>
  )
}
