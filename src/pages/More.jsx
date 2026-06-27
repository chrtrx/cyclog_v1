import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Page } from '../components/ui'
import { getTheme, setTheme } from '../lib/theme'

export default function More() {
  const nav = useNavigate()
  const { signOut } = useAuth()
  const [theme, setThemeState] = useState(getTheme)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

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
      `}</style>
    </Page>
  )
}
