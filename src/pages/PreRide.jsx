import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getBikes, getTrackers, getActivities, getTyrePressures } from '../lib/data'
import {
  BIKE_ICONS, fmtKm, kmSince, statusOf, badgeText,
  calcWearFactor, pctAdjusted, describeWearFactor,
} from '../lib/helpers'

const CHECKLIST_KEY = 'cyclog_preride_check'
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
  const [bikes, setBikes]               = useState([])
  const [activeBikeId, setActiveBikeId] = useState(null)
  const [trackers, setTrackers]         = useState([])
  const [activities, setActivities]     = useState([])
  const [tyrePressures, setTyrePressures] = useState([])
  const [surface, setSurface]           = useState('Straße')
  const [checked, setChecked]           = useState({})
  const [loading, setLoading]           = useState(true)
  const [bikesLoading, setBikesLoading] = useState(false)

  // Checkliste täglich zurücksetzen
  useEffect(() => {
    const today = new Date().toDateString()
    const saved = localStorage.getItem(CHECKLIST_DATE_KEY)
    if (saved !== today) {
      localStorage.removeItem(CHECKLIST_KEY)
      localStorage.setItem(CHECKLIST_DATE_KEY, today)
    }
    try { setChecked(JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}')) } catch {}
  }, [])

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (activeBikeId) loadActivities(activeBikeId)
  }, [activeBikeId])

  async function load() {
    setLoading(true)
    try {
      const [b, t, tp] = await Promise.all([
        getBikes(user.id), getTrackers(user.id), getTyrePressures(user.id),
      ])
      setBikes(b); setTrackers(t); setTyrePressures(tp)
      if (b.length) setActiveBikeId(b[0].id)
    } catch {}
    setLoading(false)
  }

  async function loadActivities(bikeId) {
    setBikesLoading(true)
    try { setActivities(await getActivities(bikeId, 20)) }
    catch { setActivities([]) }
    setBikesLoading(false)
  }

  function toggleCheck(id) {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
  }

  const activeBike     = bikes.find(b => b.id === activeBikeId)
  const bikeTrackers   = trackers.filter(t => t.bike_id === activeBikeId)
  const wearFactor     = calcWearFactor(activities)
  const wearDesc       = describeWearFactor(wearFactor)
  const hasWearData    = activities.length > 0

  // Tracker nach angepasstem Fortschritt sortieren, schlimmste zuerst
  const sortedTrackers = [...bikeTrackers]
    .sort((a, b) =>
      pctAdjusted(b, activeBike?.km, wearFactor) -
      pctAdjusted(a, activeBike?.km, wearFactor)
    )
    .slice(0, 5)

  // Beste Reifendruck-Empfehlung für Oberfläche
  const pressureRecs = tyrePressures
    .filter(tp => tp.bike_id === activeBikeId && tp.surface === surface)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
  const bestPressure = pressureRecs[0]

  const checkCount = DEFAULT_ITEMS.filter(i => checked[i.id]).length
  const allDone    = checkCount === DEFAULT_ITEMS.length

  if (loading) return (
    <div className="pr-loading">
      <div className="spinner" />
      Lade…
    </div>
  )

  return (
    <div className="pre-ride">
      {/* Header */}
      <header className="pr-hdr">
        <button className="pr-back" onClick={() => nav(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="pr-hdr-title">VOR DER FAHRT</div>
          <div className="pr-hdr-sub">
            {new Date().toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long' })}
          </div>
        </div>
      </header>

      <main className="pr-main">
        {/* Bike Selector */}
        {bikes.length > 1 && (
          <div className="bike-chips">
            {bikes.map(b => (
              <button
                key={b.id}
                className={`bchip ${b.id === activeBikeId ? 'on' : ''}`}
                onClick={() => setActiveBikeId(b.id)}
              >
                {BIKE_ICONS[b.type] || '🚴'} {b.name}
              </button>
            ))}
          </div>
        )}

        {activeBike && (
          <div className="pr-bike-row">
            <span className="pr-bike-icon">{BIKE_ICONS[activeBike.type] || '🚴'}</span>
            <span className="pr-bike-name">{activeBike.name}</span>
            <span className="pr-bike-km">{(activeBike.km || 0).toLocaleString('de')} km</span>
          </div>
        )}

        {/* ── Verschleißfaktor ────────────────────────── */}
        <section className="pr-section">
          <SectionHeader icon="📊" title="Terrain-Faktor" />
          {hasWearData ? (
            <div className="wf-card">
              <div className="wf-badge" style={{ borderColor: wearDesc.color }}>
                <div className="wf-x">×</div>
                <div className="wf-num">{wearFactor.toFixed(2)}</div>
                <div className="wf-lbl" style={{ color: wearDesc.color }}>{wearDesc.label}</div>
              </div>
              <div className="wf-body">
                <div className="wf-text">{wearDesc.text}</div>
                <div className="wf-meta">Ø aus {activities.length} Strava-Fahrten</div>
                {wearFactor > 1.05 && (
                  <div className="wf-pill">
                    Komponenten verschleißen ~{Math.round((wearFactor - 1) * 100)}% schneller als Normalbetrieb
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pr-hint-card">
              <span className="pr-hint-ico">💡</span>
              <span>
                Sobald Strava synchronisiert ist, berechnet Cyclog deinen Terrain-Faktor aus den letzten Fahrten.
              </span>
            </div>
          )}
        </section>

        {/* ── Verschleiß-Check ───────────────────────── */}
        <section className="pr-section">
          <SectionHeader icon="🛠️" title="Verschleiß-Check" />
          {sortedTrackers.length === 0 ? (
            <div className="pr-empty">Noch keine Tracker für dieses Rad aktiv.</div>
          ) : (
            <>
              {sortedTrackers.map(t => {
                const p    = pctAdjusted(t, activeBike?.km, wearFactor)
                const st   = statusOf(p)
                const w    = Math.round(p * 100)
                const done = kmSince(t, activeBike?.km)
                const adj  = Math.round(done * wearFactor)
                const rem  = Math.max(0, t.interval_km - adj)
                const showAdj = wearFactor >= 1.05 && adj !== done

                return (
                  <div key={t.id} className={`pr-tc pr-tc-${st}`}>
                    <div className="pr-tc-top">
                      <div className={`pr-tc-ico ${st}`}>{t.icon}</div>
                      <div className="pr-tc-info">
                        <div className="pr-tc-title">{t.title}</div>
                        {showAdj && (
                          <div className="pr-tc-adj">
                            {fmtKm(done)} real&thinsp;→&thinsp;
                            <span style={{ color: wearDesc.color }}>{fmtKm(adj)} Verschleiß-km</span>
                            &thinsp;(×{wearFactor.toFixed(2)})
                          </div>
                        )}
                      </div>
                      <div className={`pr-badge ${st}`}>{badgeText(st)}</div>
                    </div>
                    <div className="pr-bar-track">
                      <div className={`pr-bar-fill ${st}`} style={{ transform: `scaleX(${w / 100})` }} />
                      <div className="pr-bar-ticks" />
                    </div>
                    <div className="pr-tc-foot">
                      <span className={`pr-pct ${st}`}>{w}%</span>
                      <span className="pr-rem">{fmtKm(rem)} km übrig</span>
                    </div>
                  </div>
                )
              })}
              {bikeTrackers.length > 5 && (
                <button className="pr-more-btn" onClick={() => nav('/')}>
                  +{bikeTrackers.length - 5} weitere auf dem Dashboard →
                </button>
              )}
            </>
          )}
        </section>

        {/* ── Reifendruck ─────────────────────────────── */}
        <section className="pr-section">
          <SectionHeader icon="🔵" title="Reifendruck" />
          <div className="surf-tabs">
            {SURFACES.map(s => (
              <button key={s} className={`surf-tab ${surface === s ? 'on' : ''}`} onClick={() => setSurface(s)}>
                {s}
              </button>
            ))}
          </div>
          {bestPressure ? (
            <div className="press-card">
              <div className="press-head">
                <div className="press-tire">{bestPressure.tyre_model || 'Reifen'}</div>
                <div className="press-stars">
                  {'★'.repeat(bestPressure.rating || 0)}{'☆'.repeat(5 - (bestPressure.rating || 0))}
                </div>
              </div>
              <div className="press-vals">
                <PressVal num={bestPressure.pressure_front} label="bar vorne" />
                <div className="press-sep" />
                <PressVal num={bestPressure.pressure_rear}  label="bar hinten" />
              </div>
              {bestPressure.notes && (
                <div className="press-note">📝 {bestPressure.notes}</div>
              )}
              {pressureRecs.length > 1 && (
                <div className="press-meta">{pressureRecs.length} Einträge für {surface} · bestes gezeigt</div>
              )}
            </div>
          ) : (
            <div className="pr-hint-card">
              <span className="pr-hint-ico">💡</span>
              <span>
                Noch keine {surface}-Einträge für dieses Rad.&nbsp;
                <span className="pr-link" onClick={() => nav('/pressure')}>
                  Jetzt in der Druckdatenbank eintragen →
                </span>
              </span>
            </div>
          )}
        </section>

        {/* ── Checkliste ──────────────────────────────── */}
        <section className="pr-section">
          <SectionHeader icon="✅" title="Checkliste">
            <span className="pr-check-count">{checkCount}/{DEFAULT_ITEMS.length}</span>
          </SectionHeader>
          <div className="checklist">
            {DEFAULT_ITEMS.map(item => (
              <button
                key={item.id}
                className={`cl-item ${checked[item.id] ? 'done' : ''}`}
                onClick={() => toggleCheck(item.id)}
              >
                <div className={`cl-box ${checked[item.id] ? 'done' : ''}`}>
                  {checked[item.id] ? '✓' : ''}
                </div>
                <span className="cl-label">{item.label}</span>
              </button>
            ))}
          </div>
          {allDone && (
            <div className="pr-ready">🚀 Alles bereit – gute Fahrt!</div>
          )}
        </section>
      </main>

      <PreRideStyles />
    </div>
  )
}

// ─── Kleine Hilfskomponenten ───────────────────────────────
function SectionHeader({ icon, title, children }) {
  return (
    <div className="pr-sec-hdr">
      <div className="pr-sec-ico">{icon}</div>
      <div className="pr-sec-title">{title}</div>
      {children}
    </div>
  )
}

function PressVal({ num, label }) {
  return (
    <div className="press-val">
      <div className="press-num">{num ?? '—'}</div>
      <div className="press-unit">{label}</div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────
function PreRideStyles() {
  return <style>{`
    .pre-ride { min-height:100vh; padding-bottom:100px; }
    .pr-loading { display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px;font-family:var(--mono);font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink2); }
    .spinner { width:38px;height:38px;border:3px solid var(--line);border-top-color:var(--acc);border-radius:50%;animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* Header */
    .pr-hdr { background:var(--bg2);border-bottom:1px solid var(--line);padding:max(env(safe-area-inset-top),14px) 16px 12px;display:flex;align-items:center;gap:13px;position:sticky;top:0;z-index:50; }
    .pr-back { width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--panel);border:1px solid var(--line);color:var(--ink2);flex-shrink:0; }
    .pr-back svg { width:18px;height:18px; }
    .pr-hdr-title { font-family:var(--sans);font-size:16px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:var(--ink1); }
    .pr-hdr-sub { font-family:var(--mono);font-size:11px;color:var(--ink3);margin-top:1px;letter-spacing:.3px; }

    /* Main */
    .pr-main { padding:16px 15px 0; }
    .pr-bike-row { display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:12px 14px;background:var(--panel2);border:1px solid var(--line); }
    .pr-bike-icon { font-size:20px; }
    .pr-bike-name { font-family:var(--sans);font-size:15px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--ink1);flex:1; }
    .pr-bike-km { font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink2); }

    .pr-section { margin-bottom:22px; }
    .pr-sec-hdr { display:flex;align-items:center;gap:9px;margin-bottom:10px; }
    .pr-sec-ico { width:26px;height:26px;background:rgba(47,123,255,.10);border:1px solid rgba(47,123,255,.3);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0; }
    .pr-sec-title { font-family:var(--sans);font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--ink1);flex:1; }
    .pr-check-count { font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink3);background:var(--panel2);border:1px solid var(--line);padding:2px 8px; }

    /* Wear Factor */
    .wf-card { background:var(--panel2);border:1px solid var(--line);padding:15px;display:flex;gap:14px;align-items:flex-start; }
    .wf-badge { flex-shrink:0;width:72px;text-align:center;background:var(--panel);border:2px solid;padding:10px 8px; }
    .wf-x { font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink3);margin-bottom:-2px; }
    .wf-num { font-family:var(--sans);font-size:28px;font-weight:900;letter-spacing:-1px;color:var(--ink1);line-height:1; }
    .wf-lbl { font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px; }
    .wf-body { flex:1;min-width:0; }
    .wf-text { font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--ink1);margin-bottom:4px;line-height:1.4; }
    .wf-meta { font-family:var(--mono);font-size:10.5px;color:var(--ink3);letter-spacing:.3px;margin-bottom:8px; }
    .wf-pill { font-family:var(--mono);font-size:10.5px;color:var(--acc);background:rgba(47,123,255,.07);border:1px solid rgba(47,123,255,.22);padding:5px 9px;letter-spacing:.3px;line-height:1.5; }

    /* Tracker Cards */
    .pr-tc { position:relative;background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.015));border:1px solid var(--line);padding:12px 14px 10px 17px;margin-bottom:8px;overflow:hidden; }
    .pr-tc::before { content:"";position:absolute;left:0;top:0;bottom:0;width:3px; }
    .pr-tc-ok::before { background:var(--ok); }
    .pr-tc-warn::before { background:var(--warn); }
    .pr-tc-crit::before { background:var(--crit); }
    .pr-tc-top { display:flex;align-items:center;gap:10px;margin-bottom:10px; }
    .pr-tc-ico { width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;border:1px solid var(--line); }
    .pr-tc-ico.ok { background:rgba(52,199,154,.10); }
    .pr-tc-ico.warn { background:rgba(224,168,77,.10); }
    .pr-tc-ico.crit { background:rgba(224,86,110,.10); }
    .pr-tc-info { flex:1;min-width:0; }
    .pr-tc-title { font-family:var(--sans);font-size:14px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--ink1); }
    .pr-tc-adj { font-family:var(--mono);font-size:10px;color:var(--ink3);letter-spacing:.3px;margin-top:2px; }
    .pr-badge { font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 8px;flex-shrink:0;border:1px solid transparent; }
    .pr-badge.ok  { background:rgba(52,199,154,.08);color:var(--ok);border-color:rgba(52,199,154,.3); }
    .pr-badge.warn{ background:rgba(224,168,77,.08);color:var(--warn);border-color:rgba(224,168,77,.3); }
    .pr-badge.crit{ background:rgba(224,86,110,.08);color:var(--crit);border-color:rgba(224,86,110,.3); }
    .pr-bar-track { position:relative;width:100%;height:8px;background:var(--panel2);overflow:hidden;border:1px solid var(--line);margin-bottom:6px; }
    .pr-bar-fill { height:100%;width:100%;transform-origin:left center;transition:transform .5s cubic-bezier(.34,1.1,.64,1); }
    .pr-bar-fill.ok { background:var(--ok); }
    .pr-bar-fill.warn { background:var(--warn); }
    .pr-bar-fill.crit { background:var(--crit); }
    .pr-bar-ticks { position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(90deg,transparent 0,transparent 9.5%,var(--line) 9.5%,var(--line) 10%); }
    .pr-tc-foot { display:flex;justify-content:space-between; }
    .pr-pct { font-family:var(--mono);font-size:11.5px;font-weight:700; }
    .pr-pct.ok{color:var(--ok)}.pr-pct.warn{color:var(--warn)}.pr-pct.crit{color:var(--crit)}
    .pr-rem { font-family:var(--mono);font-size:11px;color:var(--ink3); }
    .pr-more-btn { width:100%;padding:10px;background:transparent;border:1px dashed var(--line);font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink3);letter-spacing:.5px;text-transform:uppercase;cursor:pointer;margin-top:2px; }

    /* Surface Tabs */
    .surf-tabs { display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap; }
    .surf-tab { padding:8px 14px;background:var(--panel2);border:1px solid var(--line);font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px;color:var(--ink2); }
    .surf-tab.on { background:var(--acc);border-color:var(--acc);color:#fff; }

    /* Pressure Card */
    .press-card { background:var(--panel2);border:1px solid var(--line);padding:16px; }
    .press-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:14px; }
    .press-tire { font-family:var(--sans);font-size:14px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--ink1); }
    .press-stars { font-size:14px;color:var(--warn);letter-spacing:2px; }
    .press-vals { display:flex;align-items:center;margin-bottom:10px; }
    .press-val { flex:1;text-align:center; }
    .press-num { font-family:var(--sans);font-size:40px;font-weight:900;letter-spacing:-1.5px;color:var(--ink1);line-height:1; }
    .press-unit { font-family:var(--mono);font-size:10.5px;color:var(--ink3);letter-spacing:1px;text-transform:uppercase;margin-top:4px; }
    .press-sep { width:1px;height:52px;background:var(--line); }
    .press-note { font-family:var(--mono);font-size:11px;color:var(--ink2);border-top:1px solid var(--line);padding-top:8px; }
    .press-meta { font-family:var(--mono);font-size:10px;color:var(--ink3);margin-top:6px; }

    /* Hints */
    .pr-hint-card { background:var(--panel2);border:1px dashed var(--line);padding:14px 16px;display:flex;gap:11px;align-items:flex-start; }
    .pr-hint-ico { font-size:18px;flex-shrink:0;margin-top:1px; }
    .pr-hint-card span { font-family:var(--mono);font-size:12px;color:var(--ink3);line-height:1.65; }
    .pr-link { color:var(--acc);cursor:pointer; }
    .pr-empty { font-family:var(--mono);font-size:12px;color:var(--ink3);padding:14px;background:var(--panel2);border:1px dashed var(--line);text-align:center;letter-spacing:.3px; }

    /* Checklist */
    .checklist { display:flex;flex-direction:column;gap:6px; }
    .cl-item { display:flex;align-items:center;gap:12px;padding:13px 14px;background:var(--panel2);border:1px solid var(--line);text-align:left;width:100%;transition:border-color .12s,background .12s; }
    .cl-item.done { background:rgba(52,199,154,.05);border-color:rgba(52,199,154,.3); }
    .cl-box { width:24px;height:24px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--ok);flex-shrink:0;transition:background .12s,border-color .12s; }
    .cl-box.done { background:rgba(52,199,154,.15);border-color:rgba(52,199,154,.6); }
    .cl-label { font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink1);letter-spacing:.3px; }
    .cl-item.done .cl-label { color:var(--ink3);text-decoration:line-through; }
    .pr-ready { margin-top:10px;background:rgba(52,199,154,.08);border:1px solid rgba(52,199,154,.35);padding:15px;text-align:center;font-family:var(--sans);font-size:14px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--ok); }

    /* Bike chips */
    .bike-chips { display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px; }
    .bchip { flex-shrink:0;padding:9px 15px;background:var(--panel);border:1px solid var(--line);font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:.5px;color:var(--ink2);white-space:nowrap; }
    .bchip.on { background:var(--acc);border-color:var(--acc);color:#fff; }
  `}</style>
}
