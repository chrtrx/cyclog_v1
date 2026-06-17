import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path:'/',         icon:'🏠', label:'Start' },
  { path:'/setups',   icon:'🔧', label:'Setups' },
  { path:'/races',    icon:'🏁', label:'Rennen' },
  { path:'/pressure', icon:'🔵', label:'Druck' },
  { path:'/fit',      icon:'📐', label:'Fit' },
]

export default function NavBar() {
  const loc = useLocation()
  const nav = useNavigate()

  // Auf bestimmten Seiten (Login, Connect) keine Navbar
  if (loc.pathname === '/connect-strava') return null

  const isActive = (path) =>
    path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path)

  return (
    <nav className="navbar">
      {TABS.map(t => (
        <button
          key={t.path}
          className={`nav-tab ${isActive(t.path) ? 'on' : ''}`}
          onClick={() => nav(t.path)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}

      <style>{`
        .navbar {
          position: fixed; bottom: 0; left: 0; right: 0;
          max-width: 600px; margin: 0 auto; z-index: 150;
          background: var(--white);
          border-top: 2px solid var(--border);
          display: flex; justify-content: space-around;
          padding: 8px 8px max(env(safe-area-inset-bottom), 8px);
        }
        .nav-tab {
          flex: 1; background: none; border: none;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 6px 4px; border-radius: 12px;
          transition: background 0.12s; cursor: pointer;
        }
        .nav-tab:active { background: var(--bg); }
        .nav-icon { font-size: 22px; filter: grayscale(1) opacity(0.5); transition: filter 0.15s; }
        .nav-label { font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 800; color: var(--t3); transition: color 0.15s; }
        .nav-tab.on .nav-icon { filter: none; }
        .nav-tab.on .nav-label { color: var(--green); }
      `}</style>
    </nav>
  )
}
