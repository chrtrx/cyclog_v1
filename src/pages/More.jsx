import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Page } from '../components/ui'
import { getTheme, setTheme } from '../lib/theme'
import { getPushState, enablePush, disablePush, sendTestPush } from '../lib/push'
import { getProfile, updateProfile } from '../lib/data'

// Blau ist der Ausgangszustand; „Schwarz-Weiß" nimmt die Farbe überall
// heraus, wo sie nur dekoriert – Marke und Zustandsbalken bleiben farbig.
const THEMES = [
  ['dark',  'Blau',         'Dunkelblaue Standard-Darstellung'],
  ['mono',  'Schwarz-Weiß', 'Einfarbig, roter Schriftzug, farbige Balken'],
  ['light', 'Hell',         'Helle Darstellung'],
]

export default function More() {
  const nav = useNavigate()
  const { user, signOut } = useAuth()
  const [theme, setThemeState] = useState(getTheme)
  const [push, setPush] = useState('off') // 'on'|'off'|'denied'|'unsupported'|'busy'
  const [everyRide, setEveryRide] = useState(false)

  useEffect(() => { getPushState().then(setPush).catch(() => setPush('off')) }, [])
  useEffect(() => { getProfile(user.id).then(p => setEveryRide(!!p?.notify_every_ride)).catch(() => {}) }, [])

  async function toggleEveryRide() {
    const next = !everyRide
    setEveryRide(next)
    try { await updateProfile(user.id, { notify_every_ride: next }) }
    catch (e) { setEveryRide(!next); alert('Konnte Einstellung nicht speichern.') }
  }

  function pickTheme(next) {
    setTheme(next)
    setThemeState(next)
  }

  async function togglePush() {
    if (push === 'busy') return
    const prev = push
    try {
      if (prev === 'on') {
        setPush('busy'); await disablePush(); setPush('off')
      } else if (prev === 'off') {
        setPush('busy'); await enablePush(user.id); setPush('on')
      } else if (prev === 'denied') {
        alert('Benachrichtigungen sind im Browser/den Einstellungen für Cyclog blockiert. Bitte dort wieder erlauben.')
      }
    } catch (e) {
      setPush(await getPushState().catch(() => 'off'))
      alert(e?.message || 'Push konnte nicht aktiviert werden.')
    }
  }

  async function handleTestPush() {
    try {
      const n = await sendTestPush()
      alert(n > 0 ? 'Test-Benachrichtigung gesendet 📬' : 'Kein Gerät registriert – Benachrichtigungen erst aktivieren.')
    } catch (e) {
      alert(e?.message || 'Test fehlgeschlagen.')
    }
  }

  const pushPill = push === 'on' ? 'AN' : push === 'busy' ? '…' : push === 'denied' ? 'BLOCKIERT' : push === 'unsupported' ? 'N/V' : 'AUS'
  const pushSub = push === 'unsupported'
    ? 'Auf dem iPhone zuerst „Zum Home-Bildschirm" hinzufügen'
    : push === 'denied'
      ? 'Im Browser für Cyclog wieder erlauben'
      : 'Erinnerung, wenn Wartung fällig ist'

  const items = [
    { path:'/calendar', icon:'📅', label:'Kalender',      sub:'Wartungen, Rennen, Defekte & fällige Tracker' },
    { path:'/fit',      icon:'📐', label:'Bike-Fit',      sub:'Geometrie, Sitzposition & Rad-Vergleich' },
    { path:'/setups',   icon:'🔧', label:'Setups',        sub:'Verbaute Teile & was sich geändert hat' },
    { path:'/races',    icon:'🏁', label:'Rennen',        sub:'Setup & Ergebnis dokumentieren' },
    { path:'/usage',    icon:'📊', label:'Nutzung',       sub:'Welche Funktionen du am meisten brauchst' },
  ]

  return (
    <Page title="Mehr" subtitle="Werkzeuge & Einstellungen">
      <div className="more-group">Werkzeuge</div>
      {items.map(it => (
        <button key={it.path} className="more-row" onClick={() => nav(it.path)}>
          <div className="mr-icon">{it.icon}</div>
          <div className="mr-body">
            <div className="mr-label">{it.label}</div>
            <div className="mr-sub">{it.sub}</div>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      ))}

      <div className="more-group">Einstellungen</div>
      <button className="more-row" onClick={togglePush} disabled={push === 'busy'}>
        <div className="mr-icon">🔔</div>
        <div className="mr-body">
          <div className="mr-label">Benachrichtigungen</div>
          <div className="mr-sub">{pushSub}</div>
        </div>
        <div className={`push-pill ${push}`}>{pushPill}</div>
      </button>

      {push === 'on' && (
        <button className="more-row" onClick={toggleEveryRide}>
          <div className="mr-icon">📈</div>
          <div className="mr-body">
            <div className="mr-label">Nach jeder Fahrt</div>
            <div className="mr-sub">{everyRide ? 'Zeigt, welches Rad sich um wie viele km änderte' : 'Nur bei fällig / bald fällig'}</div>
          </div>
          <div className={`push-pill ${everyRide ? 'on' : ''}`}>{everyRide ? 'AN' : 'AUS'}</div>
        </button>
      )}

      {push === 'on' && (
        <button className="more-row" onClick={handleTestPush}>
          <div className="mr-icon">📨</div>
          <div className="mr-body">
            <div className="mr-label">Test senden</div>
            <div className="mr-sub">Probe-Benachrichtigung an dieses Gerät</div>
          </div>
        </button>
      )}

      <div className="more-row theme-row">
        <div className="mr-icon">🎨</div>
        <div className="mr-body">
          <div className="mr-label">Darstellung</div>
          <div className="th-opts">
            {THEMES.map(([id, label, hint]) => (
              <button key={id} className={`th-opt ${theme === id ? 'on' : ''}`}
                onClick={() => pickTheme(id)} title={hint}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="more-row" onClick={() => nav('/backup')}>
        <div className="mr-icon">💾</div>
        <div className="mr-body">
          <div className="mr-label">Datensicherung</div>
          <div className="mr-sub">Alle Daten als Excel-Tabelle oder Volldatei sichern</div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      <button className="more-row logout" onClick={() => { if (confirm('Wirklich abmelden?')) signOut() }}>
        <div className="mr-icon">🚪</div>
        <div className="mr-body">
          <div className="mr-label">Abmelden</div>
          <div className="mr-sub">Von diesem Gerät ausloggen</div>
        </div>
      </button>

      <style>{`
        .more-group { font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--ink3); margin:18px 2px 9px; }
        .more-group:first-of-type { margin-top:2px; }
        .more-row { display:flex; align-items:center; gap:14px; width:100%; background:linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.015)); border:1px solid var(--line); padding:15px; margin-bottom:10px; cursor:pointer; transition:background .12s; }
        .more-row:active { background:rgba(255,255,255,.02); }
        .mr-icon { width:44px; height:44px; background:var(--panel2); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:21px; flex-shrink:0; }
        .mr-body { flex:1; min-width:0; text-align:left; }
        .mr-label { font-family:var(--sans); font-size:15px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--ink1); }
        .mr-sub { font-family:var(--mono); font-size:10.5px; color:var(--ink3); letter-spacing:.5px; margin-top:3px; }
        .more-row.logout { margin-top:20px; }
        .more-row.logout .mr-label { color:var(--crit); }
        .theme-row { cursor:default; }
        .th-opts { display:flex; gap:6px; margin-top:8px; }
        .th-opt { flex:1; background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:.3px; padding:9px 6px; }
        .th-opt.on { background:color-mix(in srgb, var(--acc) 12%, transparent); border-color:var(--acc); color:var(--acc); }
        .push-pill { font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;padding:4px 9px;border:1px solid var(--line);color:var(--ink3);flex-shrink:0; }
        .push-pill.on { border-color:color-mix(in srgb, var(--ok) 40%, transparent);color:var(--ok); }
        .push-pill.denied, .push-pill.unsupported { border-color:color-mix(in srgb, var(--crit) 30%, transparent);color:var(--crit); }
      `}</style>
    </Page>
  )
}
