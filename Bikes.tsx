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
        .bike-row { display:flex; align-items:center; gap:14px; width:100%; background:var(--white); border:2px solid var(--border); box-shadow:0 4px 0 var(--border); border-radius:var(--r-lg); padding:16px; margin-bottom:10px; cursor:pointer; transition:transform .1s; }
        .bike-row:active { transform:scale(.98) translateY(2px); box-shadow:0 2px 0 var(--border); }
        .br-icon { width:48px; height:48px; border-radius:var(--r-md); background:var(--bg); display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0; }
        .br-body { flex:1; min-width:0; text-align:left; }
        .br-name { font-family:'Nunito',sans-serif; font-size:17px; font-weight:900; color:var(--t1); }
        .br-meta { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--t2); font-weight:700; margin-top:2px; }
        .br-dot { color:var(--t3); }
        .br-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .br-badge { min-width:24px; height:24px; padding:0 7px; border-radius:50px; display:flex; align-items:center; justify-content:center; font-family:'Nunito',sans-serif; font-weight:900; font-size:13px; }
        .br-badge.crit { background:var(--red-l); color:var(--red-d); }
        .br-badge.warn { background:var(--orange-l); color:var(--orange-d); }
        .br-badge.ok { background:var(--green-l); color:var(--green-d); }
      `}</style>
    </Page>
  )
}
