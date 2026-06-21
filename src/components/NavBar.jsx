import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path:'/',      icon:'▣', label:'Start' },
  { path:'/bikes', icon:'◫', label:'Räder' },
  { path:'/more',  icon:'⚙', label:'Mehr' },
]

export default function NavBar() {
  const loc = useLocation()
  const nav = useNavigate()

  if (loc.pathname === '/connect-strava') return null

  const isActive = (path) => {
    if (path === '/') return loc.pathname === '/'
    if (path === '/more') {
      return ['/more', '/setups', '/races', '/pressure', '/fit'].some(p => loc.pathname.startsWith(p))
    }
    return loc.pathname.startsWith(path)
  }

  return (
    <nav className="navbar">
      {TABS.map(t => (
        <button key={t.path} className={`nav-tab ${isActive(t.path) ? 'on' : ''}`} onClick={() => nav(t.path)}>
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}

      <style>{`
        .navbar {
          position: fixed; bottom: 0; left: 0; right: 0;
          max-width: 720px; margin: 0 auto; z-index: 150;
          background: var(--bg2);
          border-top: 1px solid var(--line);
          display: flex; justify-content: space-around;
          padding: 9px 8px max(env(safe-area-inset-bottom), 12px);
        }
        .nav-tab {
          flex: 1; background: none; border: none;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 6px 4px; margin-top: -1px; border-top: 2px solid transparent;
          transition: color 0.12s; cursor: pointer;
        }
        .nav-icon { font-size: 19px; color: var(--ink3); transition: color 0.15s; }
        .nav-label { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink3); transition: color 0.15s; }
        .nav-tab.on { border-top-color: var(--acc); }
        .nav-tab.on .nav-icon { color: var(--acc); }
        .nav-tab.on .nav-label { color: var(--acc); }
      `}</style>
    </nav>
  )
}
