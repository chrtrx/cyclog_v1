import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getBikes, getTrackers, getActivities, getTyrePressures } from '../lib/data'
import { BIKE_ICONS, kmSince, statusOf, calcWearFactor, pctAdjusted } from '../lib/helpers'

const CHECKLIST_KEY      = 'cyclog_preride_check'
const CHECKLIST_DATE_KEY = 'cyclog_preride_date'
const DEFAULT_ITEMS = [
  { id: 'tyre',     label: 'Reifendruck geprüft' },
  { id: 'light',    label: 'Licht vorne & hinten' },
  { id: 'computer', label: 'Garmin / Wahoo geladen' },
  { id: 'bag',      label: 'Satteltasche vollständig' },
  { id: 'chain',    label: 'Kette gecheckt' },
]
const SURFACES = ['Straße', 'Gravel', 'Trail', 'Indoor']

export default function PreRide() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [bikes, setBikes]             = useState([])
  const [activeBikeId, setActiveBikeId] = useState(null)
  const [trackers, setTrackers]       = useState([])
  const [activities, setActivities]   = useState([])
  const [pressures, setPressures]     = useState([])
  const [surface, setSurface]         = useState('Straße')
  const [checked, setChecked]         = useState({})
  const [loading, setLoading]         = useState(true)

  // Checkliste täglich zurücksetzen
  useEffect(() => {
    const today = new Date().toDateString()
    if (localStorage.getItem(CHECKLIST_DATE_KEY) !== today) {
      localStorage.removeItem(CHECKLIST_KEY)
      localStorage.setItem(CHECKLIST_DATE_KEY, today)
    }
    try { setChecked(JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}')) } catch {}
  }, [])

  useEffect(() => { load() }, [])
  useEffect(() => { if (activeBikeId) loadActivities(activeBikeId) }, [activeBikeId])

  async function load() {
    setLoading(true)
    try {
      const [b, t, p] = await Promise.all([
        getBikes(user.id), getTrackers(user.id), getTyrePressures(user.id),
      ])
      setBikes(b); setTrackers(t); setPressures(p)
      if (b.length) setActiveBikeId(b[0].id)
    } catch {}
    setLoading(false)
  }

  async function loadActivities(bikeId) {
    try { setActivities(await getActivities(bikeId, 20)) }
    catch { setActivities([]) }
  }

  function toggle(id) {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
  }

  const activeBike   = bikes.find(b => b.id === activeBikeId)
  const wearFactor   = calcWearFactor(activities)   // läuft im Hintergrund
  const bikeTrackers = trackers.filter(t => t.bike_id === activeBikeId)

  // Fälligste Tracker zuerst, max. 5
  const topTrackers = [...bikeTrackers]
    .sort((a, b) =>
      pctAdjusted(b, activeBike?.km, wearFactor) -
      pctAdjusted(a, activeBike?.km, wearFactor)
    )
    .slice(0, 5)

  // Beste Druckempfehlung für aktuelle Oberfläche
  const bestPressure = pressures
    .filter(p => p.bike_id === activeBikeId && p.surface === surface)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]

  if (loading) return (
    <div className="pr-loading"><div className="pr-spinner" />Lade…</div>
  )

  const allDone = DEFAULT_ITEMS.every(i => checked[i.id])

  return (
    <div className="pr-wrap">
      {/* Header */}
      <header className="pr-hdr">
        <button className="pr-back" onClick={() => nav(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="pr-hdr-info">
          <div className="pr-hdr-title">Vor der Fahrt</div>
          <div className="pr-hdr-date">
            {new Date().toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long' })}
          </div>
        </div>
        {/* Bike Selector (nur wenn > 1 Rad) */}
        {bikes.length > 1 && (
          <select
            className="pr-bike-select"
            value={activeBikeId || ''}
            onChange={e => setActiveBikeId(e.target.value)}
          >
            {bikes.map(b => (
              <option key={b.id} value={b.id}>
                {BIKE_ICONS[b.type] || '🚴'} {b.name}
              </option>
            ))}
          </select>
        )}
      </header>

      <main className="pr-main">

        {/* ── Reifendruck ──────────────────────────────── */}
        <div className="pr-surf-tabs">
          {SURFACES.map(s => (
            <button key={s} className={`pr-surf ${surface === s ? 'on' : ''}`} onClick={() => setSurface(s)}>
              {s}
            </button>
          ))}
        </div>

        {bestPressure ? (
          <div className="pr-press-card">
            <div className="pr-press-vals">
              <PressVal num={bestPressure.pressure_front} label="vorne" />
              <div className="pr-press-sep" />
              <PressVal num={bestPressure.pressure_rear} label="hinten" />
            </div>
            <div className="pr-press-meta">
              {bestPressure.tyre_model && <span>{bestPressure.tyre_model}</span>}
              {bestPressure.rating > 0 && (
                <span className="pr-press-stars">{'★'.repeat(bestPressure.rating)}{'☆'.repeat(5 - bestPressure.rating)}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="pr-press-empty">
            <span>Noch keine {surface}-Daten.</span>
            <button className="pr-link" onClick={() => nav('/pressure')}>Eintragen →</button>
          </div>
        )}

        {/* ── Tracker ──────────────────────────────────── */}
        {topTrackers.length > 0 && (
          <div className="pr-trackers">
            {topTrackers.map(t => {
              const p  = pctAdjusted(t, activeBike?.km, wearFactor)
              const st = statusOf(p)
              const w  = Math.round(p * 100)
              const rem = Math.max(0, t.interval_km - Math.round(kmSince(t, activeBike?.km) * wearFactor))
              return (
                <div key={t.id} className={`pr-tc pr-tc-${st}`}>
                  <div className="pr-tc-row">
                    <span className="pr-tc-ico">{t.icon}</span>
                    <span className="pr-tc-name">{t.title}</span>
                    <span className={`pr-tc-pct pr-tc-pct-${st}`}>{w}%</span>
                  </div>
                  <div className="pr-tc-track">
                    <div className={`pr-tc-fill pr-tc-fill-${st}`} style={{ transform: `scaleX(${w / 100})` }} />
                  </div>
                  {st !== 'ok' && (
                    <div className={`pr-tc-rem pr-tc-rem-${st}`}>
                      {st === 'crit' ? 'Fällig!' : `${rem.toLocaleString('de')} km übrig`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Checkliste ───────────────────────────────── */}
        <div className="pr-checklist">
          {DEFAULT_ITEMS.map(item => (
            <button
              key={item.id}
              className={`pr-cl-item ${checked[item.id] ? 'done' : ''}`}
              onClick={() => toggle(item.id)}
            >
              <div className={`pr-cl-box ${checked[item.id] ? 'done' : ''}`}>
                {checked[item.id] && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="pr-cl-label">{item.label}</span>
            </button>
          ))}
        </div>

        {allDone && (
          <div className="pr-ready">Gute Fahrt 🚀</div>
        )}

      </main>

      <Styles />
    </div>
  )
}

function PressVal({ num, label }) {
  return (
    <div className="pr-pv">
      <div className="pr-pv-num">{num ?? '—'}</div>
      <div className="pr-pv-label">bar {label}</div>
    </div>
  )
}

function Styles() {
  return <style>{`
    .pr-loading { display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink3); }
    .pr-spinner { width:32px;height:32px;border:3px solid var(--line);border-top-color:var(--acc);border-radius:50%;animation:pr-spin .8s linear infinite; }
    @keyframes pr-spin { to { transform:rotate(360deg); } }

    .pr-wrap { min-height:100vh;padding-bottom:100px; }

    /* Header */
    .pr-hdr { background:var(--bg2);border-bottom:1px solid var(--line);padding:max(env(safe-area-inset-top),14px) 16px 12px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:50; }
    .pr-back { width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--panel);border:1px solid var(--line);color:var(--ink2);flex-shrink:0; }
    .pr-back svg { width:16px;height:16px; }
    .pr-hdr-info { flex:1;min-width:0; }
    .pr-hdr-title { font-family:var(--sans);font-size:16px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:var(--ink1); }
    .pr-hdr-date  { font-family:var(--mono);font-size:11px;color:var(--ink3);margin-top:1px; }
    .pr-bike-select { background:var(--panel2);border:1px solid var(--line);color:var(--ink1);font-family:var(--mono);font-size:12px;font-weight:700;padding:7px 10px;max-width:130px;flex-shrink:0; }

    .pr-main { padding:20px 15px 0; }

    /* Surface Tabs */
    .pr-surf-tabs { display:flex;gap:6px;margin-bottom:14px; }
    .pr-surf { flex:1;padding:9px 4px;background:var(--panel2);border:1px solid var(--line);font-family:var(--mono);font-size:12px;font-weight:700;color:var(--ink3);letter-spacing:.3px; }
    .pr-surf.on { background:var(--acc);border-color:var(--acc);color:#fff; }

    /* Pressure */
    .pr-press-card { background:var(--panel2);border:1px solid var(--line);padding:20px 16px 14px;margin-bottom:20px; }
    .pr-press-vals { display:flex;align-items:center;margin-bottom:10px; }
    .pr-pv { flex:1;text-align:center; }
    .pr-pv-num { font-family:var(--sans);font-size:52px;font-weight:900;letter-spacing:-2px;color:var(--ink1);line-height:1; }
    .pr-pv-label { font-family:var(--mono);font-size:11px;color:var(--ink3);letter-spacing:.8px;text-transform:uppercase;margin-top:5px; }
    .pr-press-sep { width:1px;height:60px;background:var(--line); }
    .pr-press-meta { display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px; }
    .pr-press-meta span { font-family:var(--mono);font-size:11px;color:var(--ink3); }
    .pr-press-stars { color:var(--warn);letter-spacing:2px; }
    .pr-press-empty { background:var(--panel2);border:1px dashed var(--line);padding:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; }
    .pr-press-empty span { font-family:var(--mono);font-size:12px;color:var(--ink3); }
    .pr-link { font-family:var(--mono);font-size:12px;font-weight:700;color:var(--acc);background:none;border:none;cursor:pointer;padding:0; }

    /* Trackers */
    .pr-trackers { display:flex;flex-direction:column;gap:8px;margin-bottom:20px; }
    .pr-tc { background:var(--panel2);border:1px solid var(--line);padding:12px 14px 10px; }
    .pr-tc-crit { border-color:rgba(224,86,110,.35);background:rgba(224,86,110,.04); }
    .pr-tc-warn { border-color:rgba(224,168,77,.3); }
    .pr-tc-row { display:flex;align-items:center;gap:10px;margin-bottom:8px; }
    .pr-tc-ico { font-size:16px;flex-shrink:0;width:24px;text-align:center; }
    .pr-tc-name { flex:1;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px;color:var(--ink1);text-transform:uppercase; }
    .pr-tc-pct { font-family:var(--sans);font-size:15px;font-weight:900;letter-spacing:-.5px; }
    .pr-tc-pct-ok   { color:var(--ok); }
    .pr-tc-pct-warn { color:var(--warn); }
    .pr-tc-pct-crit { color:var(--crit); }
    .pr-tc-track { position:relative;height:5px;background:var(--panel);overflow:hidden;margin-bottom:6px; }
    .pr-tc-fill { height:100%;width:100%;transform-origin:left center;transition:transform .4s ease-out; }
    .pr-tc-fill-ok   { background:var(--ok); }
    .pr-tc-fill-warn { background:var(--warn); }
    .pr-tc-fill-crit { background:var(--crit); }
    .pr-tc-rem { font-family:var(--mono);font-size:10.5px;letter-spacing:.3px; }
    .pr-tc-rem-warn { color:var(--warn); }
    .pr-tc-rem-crit { color:var(--crit);font-weight:700; }

    /* Checklist */
    .pr-checklist { display:flex;flex-direction:column;gap:1px;border:1px solid var(--line);overflow:hidden;margin-bottom:16px; }
    .pr-cl-item { display:flex;align-items:center;gap:12px;padding:13px 14px;background:var(--panel2);border:none;border-bottom:1px solid var(--line);text-align:left;width:100%;cursor:pointer;transition:background .1s; }
    .pr-cl-item:last-child { border-bottom:none; }
    .pr-cl-item.done { background:rgba(52,199,154,.04); }
    .pr-cl-item:active { background:var(--panel); }
    .pr-cl-box { width:22px;height:22px;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .1s,border-color .1s; }
    .pr-cl-box.done { background:var(--ok);border-color:var(--ok);color:#fff; }
    .pr-cl-box svg { width:13px;height:13px; }
    .pr-cl-label { font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink1);letter-spacing:.3px; }
    .pr-cl-item.done .pr-cl-label { color:var(--ink3); }

    .pr-ready { text-align:center;padding:16px;font-family:var(--sans);font-size:15px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:var(--ok);background:rgba(52,199,154,.07);border:1px solid rgba(52,199,154,.3); }
  `}</style>
}
