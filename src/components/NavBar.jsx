import { useLocation, useNavigate } from 'react-router-dom'

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="8" height="8"/>
    <rect x="13" y="3" width="8" height="8"/>
    <rect x="3" y="13" width="8" height="8"/>
    <rect x="13" y="13" width="8" height="8"/>
  </svg>
)

const IconBike = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="16.5" r="3.5"/>
    <circle cx="18.5" cy="16.5" r="3.5"/>
    <path d="M5.5 16.5 L9 9 h6 L18.5 16.5"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <path d="M12.5 9 L11 5"/>
    <line x1="9" y1="5" x2="13" y2="5"/>
  </svg>
)

const IconMore = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

const TABS = [
  { path: '/',      Icon: IconDashboard, label: 'Start'  },
  { path: '/bikes', Icon: IconBike,      label: 'Räder'  },
  { path: '/more',  Icon: IconMore,      label: 'Mehr'   },
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
      {TABS.map(({ path, Icon, label }) => (
        <button key={path} className={`nav-tab ${isActive(path) ? 'on' : ''}`} onClick={() => nav(path)}>
          <span className="nav-icon"><Icon /></span>
          <span className="nav-label">{label}</span>
        </button>
      ))}

      <style>{`
        .navbar {
          position: fixed; bottom: 0; left: 0; right: 0;
          max-width: 560px; margin: 0 auto; z-index: 150;
          background: var(--bg2);
          border-top: 1px solid var(--line);
          display: flex; justify-content: space-around;
          padding: 8px 8px max(env(safe-area-inset-bottom), 12px);
        }
        .nav-tab {
          flex: 1; background: none; border: none;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 5px 4px; margin-top: -1px; border-top: 2px solid transparent;
          transition: color 0.12s; cursor: pointer;
        }
        .nav-icon { display: flex; align-items: center; justify-content: center; color: var(--ink3); transition: color 0.15s; }
        .nav-label { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink3); transition: color 0.15s; }
        .nav-tab.on { border-top-color: var(--acc); }
        .nav-tab.on .nav-icon { color: var(--acc); }
        .nav-tab.on .nav-label { color: var(--acc); }
      `}</style>
    </nav>
  )
}
