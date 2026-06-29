import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Page } from '../components/ui'
import { getTheme, setTheme } from '../lib/theme'
import { getPushState, enablePush, disablePush, sendTestPush } from '../lib/push'
import { getProfile, updateProfile } from '../lib/data'

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

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
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
    { path:'/setups',   icon:'🔧', label:'Setups',        sub:'Konfigurationen speichern & vergleichen' },
    { path:'/races',    icon:'🏁', label:'Rennen',        sub:'Setup & Ergebnis dokumentieren' },
    { path:'/pressure', icon:'🔵', label:'Reifendruck',   sub:'Deine Druck-Erfahrungsdatenbank' },
    { path:'/fit',      icon:'📐', label:'Bike-Fit',      sub:'Sitzpositionen archivieren' },
  ]

  return (
    <Page title="Mehr" subtitle="Weitere Bereiche">
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
            <div className="mr-sub">{everyRide ? 'Bestätigung nach jedem Strava-Upload' : 'Nur bei fällig / bald fällig'}</div>
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

      <button className="more-row" onClick={toggleTheme}>
        <div className="mr-icon">{theme === 'dark' ? '☀️' : '🌙'}</div>
        <div className="mr-body">
          <div className="mr-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</div>
          <div className="mr-sub">Design wechseln</div>
        </div>
        <div className={`theme-pill ${theme}`}>{theme === 'dark' ? 'DUNKEL' : 'HELL'}</div>
      </button>

      <button className="more-row logout" onClick={() => { if (confirm('Wirklich abmelden?')) signOut() }}>
        <div className="mr-icon">🚪</div>
        <div className="mr-body">
          <div className="mr-label">Abmelden</div>
          <div className="mr-sub">Von diesem Gerät ausloggen</div>
        </div>
      </button>

      <style>{`
        .more-row { display:flex; align-items:center; gap:14px; width:100%; background:linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.015)); border:1px solid var(--line); padding:15px; margin-bottom:10px; cursor:pointer; transition:background .12s; }
        .more-row:active { background:rgba(255,255,255,.02); }
        .mr-icon { width:44px; height:44px; background:var(--panel2); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:21px; flex-shrink:0; }
        .mr-body { flex:1; min-width:0; text-align:left; }
        .mr-label { font-family:var(--sans); font-size:15px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--ink1); }
        .mr-sub { font-family:var(--mono); font-size:10.5px; color:var(--ink3); letter-spacing:.5px; margin-top:3px; }
        .more-row.logout { margin-top:20px; }
        .more-row.logout .mr-label { color:var(--crit); }
        .theme-pill { font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;padding:4px 9px;border:1px solid var(--line);color:var(--ink3); }
        .theme-pill.dark { border-color:rgba(47,123,255,.3);color:var(--acc); }
        .theme-pill.light { border-color:rgba(180,140,0,.3);color:var(--warn); }
        .push-pill { font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;padding:4px 9px;border:1px solid var(--line);color:var(--ink3);flex-shrink:0; }
        .push-pill.on { border-color:rgba(52,199,154,.4);color:var(--ok); }
        .push-pill.denied, .push-pill.unsupported { border-color:rgba(224,86,110,.3);color:var(--crit); }
      `}</style>
    </Page>
  )
}
