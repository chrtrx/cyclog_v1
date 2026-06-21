import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getBikes, getTrackers } from '../lib/data'
import { BIKE_ICONS, pct, statusOf } from '../lib/helpers'
import { Page, Empty } from '../components/ui'

export default function Bikes() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [bikes, setBikes] = useState([])
  const [trackers, setTrackers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [b, t] = await Promise.all([getBikes(user.id), getTrackers(user.id)])
    setBikes(b); setTrackers(t); setLoading(false)
  }

  // Pro Rad: wie viele Tracker sind fällig / bald fällig?
  function statusFor(bikeId, bikeKm) {
    const ts = trackers.filter(t => t.bike_id === bikeId)
    let crit = 0, warn = 0
    ts.forEach(t => {
      const s = statusOf(pct(t, bikeKm))
      if (s === 'crit') crit++
      else if (s === 'warn') warn++
    })
    return { count: ts.length, crit, warn }
  }

  return (
    <Page title="Meine Räder" subtitle={bikes.length ? `${bikes.length} Räder` : null}>
      {loading ? null : bikes.length === 0 ? (
        <Empty emoji="🚲" title="Noch keine Räder"
          sub="Verbinde Strava auf der Start-Seite, um deine Räder zu importieren." />
      ) : (
        bikes.map(b => {
          const st = statusFor(b.id, b.km)
          return (
            <button key={b.id} className="bike-row" onClick={() => nav(`/bike/${b.id}`)}>
              <div className="br-icon">{BIKE_ICONS[b.type] || b.icon || '🚴'}</div>
              <div className="br-body">
                <div className="br-name">{b.name}</div>
                <div className="br-meta">
                  <span>{b.type}</span>
                  <span className="br-dot">·</span>
                  <span>{(b.km || 0).toLocaleString('de')} km</span>
                </div>
              </div>
              <div className="br-right">
                {st.crit > 0 && <span className="br-badge crit">{st.crit}</span>}
                {st.warn > 0 && <span className="br-badge warn">{st.warn}</span>}
                {st.count > 0 && st.crit === 0 && st.warn === 0 && <span className="br-badge ok">✓</span>}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </button>
          )
        })
      )}

      <style>{`
        .bike-row { display:flex; align-items:center; gap:14px; width:100%; background:linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.015)); border:1px solid var(--line); padding:15px; margin-bottom:10px; cursor:pointer; transition:background .12s; }
        .bike-row:active { background:rgba(255,255,255,.02); }
        .br-icon { width:46px; height:46px; background:var(--panel2); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; }
        .br-body { flex:1; min-width:0; text-align:left; }
        .br-name { font-family:var(--sans); font-size:16px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--ink1); }
        .br-meta { display:flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; color:var(--ink3); letter-spacing:.5px; text-transform:uppercase; margin-top:3px; }
        .br-dot { color:var(--line); }
        .br-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .br-badge { min-width:24px; height:24px; padding:0 7px; display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-weight:700; font-size:12px; border:1px solid transparent; }
        .br-badge.crit { background:rgba(224,86,110,.10); color:var(--crit); border-color:rgba(224,86,110,.35); }
        .br-badge.warn { background:rgba(224,168,77,.10); color:var(--warn); border-color:rgba(224,168,77,.35); }
        .br-badge.ok { background:rgba(52,199,154,.10); color:var(--ok); border-color:rgba(52,199,154,.35); }
      `}</style>
    </Page>
  )
}
