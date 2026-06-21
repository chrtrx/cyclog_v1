import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Page } from '../components/ui'

export default function More() {
  const nav = useNavigate()
  const { signOut } = useAuth()

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

      <button className="more-row logout" onClick={() => { if (confirm('Wirklich abmelden?')) signOut() }}>
        <div className="mr-icon">🚪</div>
        <div className="mr-body">
          <div className="mr-label">Abmelden</div>
          <div className="mr-sub">Von diesem Gerät ausloggen</div>
        </div>
      </button>

      <style>{`
        .more-row { display:flex; align-items:center; gap:14px; width:100%; background:var(--white); border:2px solid var(--border); box-shadow:0 4px 0 var(--border); border-radius:var(--r-lg); padding:16px; margin-bottom:10px; cursor:pointer; transition:transform .1s; }
        .more-row:active { transform:scale(.98) translateY(2px); box-shadow:0 2px 0 var(--border); }
        .mr-icon { width:44px; height:44px; border-radius:var(--r-md); background:var(--bg); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
        .mr-body { flex:1; min-width:0; text-align:left; }
        .mr-label { font-family:'Nunito',sans-serif; font-size:16px; font-weight:900; color:var(--t1); }
        .mr-sub { font-size:12px; color:var(--t3); font-weight:600; margin-top:2px; }
        .more-row.logout { margin-top:20px; }
        .more-row.logout .mr-label { color:var(--red-d); }
      `}</style>
    </Page>
  )
}
