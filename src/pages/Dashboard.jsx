import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  getBikes, addBike, getTrackers, addTracker, updateTracker, deleteTracker,
  getServiceLogs, addServiceLog, syncStrava, getStravaStatus, getProfile,
  SERVICE_TYPES, BIKE_TYPES,
} from '../lib/data'
import { BIKE_ICONS, fmtKm, kmSince, pct, statusOf } from '../lib/helpers'
import { Sheet, Field, BtnGreen, BtnDelete, Empty } from '../components/ui'
import TrackerCard from '../components/TrackerCard'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [bikes, setBikes] = useState([])
  const [trackers, setTrackers] = useState([])
  const [activeBikeId, setActiveBikeId] = useState(null)
  const [stravaStatus, setStravaStatus] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sheet, setSheet] = useState(null) // 'log' | 'addBike' | null
  const [editTracker, setEditTracker] = useState(null)
  const [dueTracker, setDueTracker] = useState(null)  // Fällig-Dialog
  const [toast, setToast] = useState('')
  const [lastDeleted, setLastDeleted] = useState(null)  // für Rückgängig

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const [b, t, s, p] = await Promise.all([
        getBikes(user.id), getTrackers(user.id), getStravaStatus(user.id), getProfile(user.id),
      ])
      setBikes(b); setTrackers(t); setStravaStatus(s); setProfile(p)
      if (b.length && !activeBikeId) {
        // aktivstes Rad zuerst auswählen (zuletzt aktualisierter Tracker)
        const la = (bikeId) => {
          const ts = t.filter(x => x.bike_id === bikeId)
          return ts.length ? Math.max(...ts.map(x => new Date(x.start_date || 0).getTime())) : 0
        }
        const best = [...b].sort((x, y) => la(y.id) - la(x.id))[0]
        setActiveBikeId(best.id)
      }
    } catch (e) { showToast('Fehler beim Laden') }
    setLoading(false)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2400) }

  const activeBike = bikes.find(b => b.id === activeBikeId)
  const bikeTrackers = trackers.filter(t => t.bike_id === activeBikeId)

  // Räder nach Aktivität sortieren: das Rad mit dem zuletzt gestarteten/
  // aktualisierten Tracker zuerst. Räder ganz ohne Tracker hinten.
  function lastActivity(bikeId) {
    const ts = trackers.filter(t => t.bike_id === bikeId)
    if (!ts.length) return 0
    return Math.max(...ts.map(t => new Date(t.start_date || 0).getTime()))
  }
  const sortedBikes = [...bikes].sort((a, b) => lastActivity(b.id) - lastActivity(a.id))

  // Dashboard-Übersicht: alle fälligen/bald fälligen über alle Bikes
  const allStatuses = trackers.map(t => {
    const bike = bikes.find(b => b.id === t.bike_id)
    if (!bike) return null
    return { tracker: t, bike, status: statusOf(pct(t, bike.km)) }
  }).filter(Boolean)
  const dueCount = allStatuses.filter(s => s.status === 'crit').length
  const soonCount = allStatuses.filter(s => s.status === 'warn').length

  async function handleSync() {
    setSyncing(true)
    try { await syncStrava(user.id); await load(); showToast('✓ Strava synchronisiert') }
    catch (e) { showToast('⚠ ' + (e.message || 'Sync fehlgeschlagen')) }
    setSyncing(false)
  }

  async function handleAddTracker(svc) {
    if (!activeBike) return
    await addTracker(user.id, {
      bike_id: activeBike.id, type_id: svc.typeId, title: svc.title, icon: svc.icon,
      interval_type: 'km', interval_km: svc.interval, km_at_start: activeBike.km,
      note: '', start_date: new Date().toISOString(),
    })
    // Auch als Service-Log speichern
    await addServiceLog(user.id, {
      bike_id: activeBike.id, service_type: svc.typeId, title: svc.title,
      icon: svc.icon, km_at_service: activeBike.km, service_date: new Date().toISOString(),
    })
    setSheet(null); await load()
    showToast(`🎉 Tracker gestartet bei ${fmtKm(activeBike.km)} km!`)
  }

  // Gelöschten Tracker wiederherstellen
  async function handleUndo() {
    if (!lastDeleted) return
    const r = lastDeleted
    await addTracker(user.id, {
      bike_id: r.bike_id, type_id: r.type_id, title: r.title, icon: r.icon,
      interval_type: r.interval_type || 'km', interval_km: r.interval_km,
      km_at_start: r.km_at_start, note: r.note || '', start_date: r.start_date,
    })
    setLastDeleted(null); setToast(''); await load()
    showToast('✓ Wiederhergestellt')
  }

  // Fällig-Dialog: "Gewechselt" → Zähler startet neu beim aktuellen km-Stand
  async function handleServiceDone(t) {
    await updateTracker(t.id, {
      km_at_start: activeBike.km,
      start_date: new Date().toISOString(),
    })
    setDueTracker(null); await load()
    showToast(`✓ ${t.title}: Zähler neu gestartet`)
  }

  // Fällig-Dialog: "Hält noch" → Intervall um 1.000 km erhöhen
  async function handleExtend(t) {
    await updateTracker(t.id, { interval_km: t.interval_km + 1000 })
    setDueTracker(null); await load()
    showToast(`↗ Intervall auf ${fmtKm(t.interval_km + 1000)} km erhöht`)
  }

  if (loading) return <div className="loading"><div className="spinner" />Lade…</div>

  return (
    <div className="dash">
      <header className="hdr">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 100 100"><defs><linearGradient id="dgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee"/><stop offset="1" stopColor="#1466d6"/></linearGradient></defs><rect width="100" height="100" rx="14" fill="#0d2240"/><path d="M70 28 A29 29 0 1 0 70 72" fill="none" stroke="url(#dgg)" strokeWidth="11" strokeLinecap="round"/><g stroke="#22d3ee" strokeWidth="2.4" opacity="0.5"><line x1="50" y1="50" x2="50" y2="28"/><line x1="50" y1="50" x2="69" y2="39"/><line x1="50" y1="50" x2="69" y2="61"/><line x1="50" y1="50" x2="50" y2="72"/><line x1="50" y1="50" x2="31" y2="61"/><line x1="50" y1="50" x2="31" y2="39"/></g><circle cx="50" cy="50" r="5" fill="#22d3ee"/><circle cx="70" cy="28" r="5.5" fill="#22d3ee"/></svg>
          </div>
          <span className="logo-text">CYCLOG</span>
        </div>
        <div className="hdr-right">
          {profile?.streak > 0 && <div className="streak">🔥 {profile.streak}</div>}
          <button className="strava-btn" onClick={stravaStatus ? handleSync : () => nav('/connect-strava')} disabled={syncing}>
            <span className={`sdot ${syncing ? 'spin' : ''}`} />
            {syncing ? 'Sync…' : stravaStatus ? 'Sync' : 'Verbinden'}
          </button>
        </div>
      </header>

      <main className="main">
        {bikes.length === 0 ? (
          <Empty emoji="🚲" title="Willkommen bei Cyclog!"
            sub="Lege dein erstes Fahrrad an oder verbinde Strava."
            action={
              <div className="empty-actions">
                <button className="ea-green" onClick={() => setSheet('addBike')}>+ Fahrrad anlegen</button>
                <button className="ea-strava" onClick={() => nav('/connect-strava')}>Mit Strava verbinden</button>
              </div>
            } />
        ) : (
          <>
            {/* Dashboard-Status */}
            {(dueCount > 0 || soonCount > 0) && (
              <div className="status-banner">
                {dueCount > 0 && <button className="sb-item crit" onClick={() => {
                  const first = allStatuses.find(s => s.status === 'crit')
                  if (first) { setActiveBikeId(first.bike.id); setDueTracker(first.tracker) }
                }}><span className="sb-num">{dueCount}</span> überfällig</button>}
                {soonCount > 0 && <div className="sb-item warn"><span className="sb-num">{soonCount}</span> bald fällig</div>}
              </div>
            )}

            {/* Bike Selector */}
            <div className="bike-chips">
              {sortedBikes.map(b => (
                <button key={b.id} className={`bchip ${b.id === activeBikeId ? 'on' : ''}`} onClick={() => setActiveBikeId(b.id)}>
                  {BIKE_ICONS[b.type] || '🚴'} {b.name}
                </button>
              ))}
              <button className="bchip add" onClick={() => setSheet('addBike')}>+</button>
            </div>

            {/* Bike Hero */}
            {activeBike && (
              <div className="bike-hero" onClick={() => nav(`/bike/${activeBike.id}`)}>
                <div className="bh-top">
                  <div className="bh-type">{activeBike.type}</div>
                  <div className="bh-detail">Details ›</div>
                </div>
                <div className="bh-name">{activeBike.name}</div>
                <div className="bh-km-row">
                  <div className="bh-km">{(activeBike.km || 0).toLocaleString('de')}</div>
                  <div className="bh-km-u">km</div>
                </div>
                {stravaStatus && <div className="bh-strava">🟠 {stravaStatus.athlete_name}</div>}
              </div>
            )}

            {/* Tracker */}
            <div className="sec-hdr">
              <div className="sec-icon">🛠️</div>
              <div className="sec-title">Verschleiß-Tracker</div>
            </div>
            {bikeTrackers.length === 0 ? (
              <Empty emoji="🔧" title="Noch kein Tracker"
                sub='Tippe auf "Service starten" und der Balken zählt automatisch mit.' />
            ) : (
              bikeTrackers.map(t => (
                <TrackerCard key={t.id} tracker={t} bikeKm={activeBike.km} onClick={() => {
                  // Voller Tracker (>=100%) öffnet den Fällig-Dialog, sonst Bearbeiten
                  if (pct(t, activeBike.km) >= 1) setDueTracker(t)
                  else setEditTracker(t)
                }} />
              ))
            )}
          </>
        )}
      </main>

      {activeBike && (
        <div className="fab-wrap">
          <button className="fab" onClick={() => setSheet('log')}>
            <svg viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Service starten
          </button>
        </div>
      )}

      {sheet === 'log' && <LogSheet bike={activeBike} onAdd={handleAddTracker} onClose={() => setSheet(null)} />}
      {sheet === 'addBike' && <AddBikeSheet user={user} onClose={() => setSheet(null)} onSaved={(id) => { setSheet(null); setActiveBikeId(id); load() }} />}
      {dueTracker && (
        <Sheet title={dueTracker.title} sub="Wartung fällig" onClose={() => setDueTracker(null)}>
          <div className="due-msg">
            Dieser Tracker hat sein Intervall erreicht ({fmtKm(dueTracker.interval_km)} km).
            Was möchtest du tun?
          </div>
          <button className="due-opt due-done" onClick={() => handleServiceDone(dueTracker)}>
            <span className="due-ico">✓</span>
            <span className="due-txt"><b>Gewechselt / erledigt</b><small>Zähler startet neu bei {fmtKm(activeBike.km)} km</small></span>
          </button>
          <button className="due-opt due-extend" onClick={() => handleExtend(dueTracker)}>
            <span className="due-ico">↗</span>
            <span className="due-txt"><b>Hält noch (+1.000 km)</b><small>Intervall auf {fmtKm(dueTracker.interval_km + 1000)} km erhöhen</small></span>
          </button>
          <button className="due-opt due-later" onClick={() => setDueTracker(null)}>
            <span className="due-ico">⏱</span>
            <span className="due-txt"><b>Später</b><small>Nichts ändern</small></span>
          </button>
          <style>{`
            .due-msg { font-family:var(--mono); font-size:13px; color:var(--ink2); line-height:1.6; margin-bottom:16px; padding:0 2px; }
            .due-opt { display:flex; align-items:center; gap:13px; width:100%; background:var(--panel2); border:1px solid var(--line); padding:14px; margin-bottom:8px; text-align:left; transition:border-color .12s; }
            .due-opt:active { border-color:var(--acc); }
            .due-ico { width:34px; height:34px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px; border:1px solid var(--line); }
            .due-done .due-ico { color:var(--ok); border-color:rgba(52,199,154,.4); }
            .due-extend .due-ico { color:var(--acc); border-color:rgba(47,123,255,.4); }
            .due-later .due-ico { color:var(--ink3); }
            .due-txt { display:flex; flex-direction:column; gap:2px; }
            .due-txt b { font-family:var(--sans); font-size:14px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--ink1); }
            .due-txt small { font-family:var(--mono); font-size:11px; color:var(--ink3); letter-spacing:.3px; }
          `}</style>
        </Sheet>
      )}
      {editTracker && (
        <EditTrackerSheet tracker={editTracker} bikeKm={activeBike.km}
          onSave={async (u) => { await updateTracker(editTracker.id, u); setEditTracker(null); await load() }}
          onDelete={async () => {
            const removed = editTracker
            await deleteTracker(removed.id)
            setEditTracker(null)
            await load()
            // Tracker für Rückgängig merken (6 Sekunden)
            setLastDeleted(removed)
            setToast('__undo__')
            setTimeout(() => { setLastDeleted(null); setToast(t => t === '__undo__' ? '' : t) }, 6000)
          }}
          onClose={() => setEditTracker(null)} />
      )}
      {toast === '__undo__' ? (
        <div className="toast toast-undo">
          <span>Tracker gelöscht</span>
          <button className="undo-btn" onClick={handleUndo}>↺ Rückgängig</button>
        </div>
      ) : toast && <div className="toast">{toast}</div>}

      <DashStyles />
    </div>
  )
}

// ─── LOG SHEET ─────────────────────────────────────────────
function LogSheet({ bike, onAdd, onClose }) {
  const cats = [...new Set(SERVICE_TYPES.map(s => s.cat))]
  return (
    <Sheet title="Was hast du gemacht?" sub={`Tracker startet bei ${fmtKm(bike.km)} km (${bike.name})`} onClose={onClose}>
      {cats.map(cat => (
        <div className="svc-sec" key={cat}>
          <div className="svc-sec-lbl">{cat}</div>
          {SERVICE_TYPES.filter(s => s.cat === cat).map(s => (
            <button className="svc-row" key={s.typeId} onClick={() => onAdd(s)}>
              <div className="svc-ico">{s.icon}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="svc-nm">{s.title}</div>
                <div className="svc-int">Standard: {s.interval.toLocaleString('de')} km</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
      ))}
      <style>{`
        .svc-sec { margin-bottom: 12px; }
        .svc-sec-lbl { font-family: var(--mono); font-size: 10.5px; font-weight: 700; color: var(--ink3); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; padding: 0 2px; }
        .svc-row { display: flex; align-items: center; gap: 11px; padding: 12px 13px; background: var(--panel2); border: 1px solid var(--line); margin-bottom: 6px; width: 100%; cursor: pointer; transition: border-color .12s; }
        .svc-row:active { border-color: var(--acc); }
        .svc-ico { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: var(--panel); border: 1px solid var(--line); flex-shrink: 0; }
        .svc-nm { font-family: var(--sans); font-size: 14px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; color: var(--ink1); }
        .svc-int { font-family: var(--mono); font-size: 11px; color: var(--ink3); letter-spacing: .5px; text-transform: uppercase; margin-top: 2px; }
      `}</style>
    </Sheet>
  )
}

// ─── ADD BIKE SHEET ────────────────────────────────────────
function AddBikeSheet({ user, onClose, onSaved }) {
  const [f, setF] = useState({ name:'', type:'Rennrad', manufacturer:'', model:'', model_year:'', frame_size:'', km:'' })
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!f.name) return
    const bike = await addBike(user.id, {
      name: f.name, type: f.type, manufacturer: f.manufacturer || null, model: f.model || null,
      model_year: f.model_year ? Number(f.model_year) : null, frame_size: f.frame_size || null,
      km: f.km ? Number(f.km) : 0,
    })
    onSaved(bike.id)
  }
  return (
    <Sheet title="Neues Fahrrad" sub="Stammdaten anlegen." onClose={onClose}>
      <Field label="Name" value={f.name} onChange={set('name')} placeholder="z.B. Madone SL6" />
      <div className="field">
        <label className="lblx">Typ</label>
        <div className="type-grid">
          {BIKE_TYPES.map(t => (
            <button key={t} className={`type-opt ${f.type === t ? 'on' : ''}`} onClick={() => set('type')(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="g2">
        <Field label="Hersteller" value={f.manufacturer} onChange={set('manufacturer')} placeholder="Trek" />
        <Field label="Modell" value={f.model} onChange={set('model')} placeholder="Madone" />
        <Field label="Modelljahr" type="number" value={f.model_year} onChange={set('model_year')} placeholder="2024" />
        <Field label="Rahmengröße" value={f.frame_size} onChange={set('frame_size')} placeholder="56" />
      </div>
      <Field label="Aktueller km-Stand" type="number" value={f.km} onChange={set('km')} placeholder="0" />
      <BtnGreen onClick={save}>Fahrrad anlegen</BtnGreen>
      <style>{`
        .lblx { display:block;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:6px; }
        .type-grid { display:flex;gap:6px;flex-wrap:wrap; }
        .type-opt { padding:9px 14px;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px;background:var(--panel2);border:1px solid var(--line);color:var(--ink2); }
        .type-opt.on { background:var(--acc);border-color:var(--acc);color:white; }
        .g2 { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
      `}</style>
    </Sheet>
  )
}

// ─── EDIT TRACKER SHEET ────────────────────────────────────
function EditTrackerSheet({ tracker, bikeKm, onSave, onDelete, onClose }) {
  const [interval, setInterval] = useState(tracker.interval_km)
  const [note, setNote] = useState(tracker.note || '')
  const [armed, setArmed] = useState(false)
  return (
    <Sheet title={tracker.title} onClose={onClose}>
      <div className="ib">
        <div className="ib-lbl">Intervall</div>
        <div className="ib-edit">
          <input className="ib-num" type="number" inputMode="numeric" min="50" max="50000" step="50"
            value={interval} onChange={(e) => setInterval(Number(e.target.value) || 0)} />
          <span className="ib-unit">km</span>
        </div>
        <input type="range" min="100" max="20000" step="100" value={Math.min(interval, 20000)} onChange={(e) => setInterval(Number(e.target.value))} />
        <div className="presets">
          {[1000, 2000, 4000, 6000, 12000].map(v => (
            <button key={v} className="preset" onClick={() => setInterval(v)}>{v.toLocaleString('de')}</button>
          ))}
        </div>
      </div>
      <div className="ib">
        <div className="ib-lbl">Notiz</div>
        <textarea className="ib-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Produkt, Beobachtungen…" />
      </div>
      <BtnGreen onClick={() => onSave({ interval_km: interval, note })}>Speichern</BtnGreen>
      <BtnDelete armed={armed} onClick={() => armed ? onDelete() : (setArmed(true), setTimeout(() => setArmed(false), 3000))} />
      <style>{`
        .ib { margin-bottom: 11px; background: var(--panel2); border: 1px solid var(--line); padding: 15px; }
        .ib-lbl { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--ink3); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 9px; }
        .ib-edit { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
        .ib-num { background: none; border: none; outline: none; font-family: var(--sans); font-size: 34px; font-weight: 900; letter-spacing: -1px; color: var(--ink1); width: 100%; padding: 0; }
        .ib-num::-webkit-outer-spin-button, .ib-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .ib-unit { font-family: var(--mono); font-size: 13px; color: var(--ink2); font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 6px; background: var(--line); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 0; background: var(--acc); border: 2px solid var(--ink1); }
        .presets { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 11px; }
        .preset { padding: 7px 12px; font-family: var(--mono); font-size: 12px; font-weight: 700; background: var(--panel); border: 1px solid var(--line); color: var(--ink2); }
        .preset:active { border-color: var(--acc); color: var(--acc); }
        .ib-note { width: 100%; background: none; border: none; outline: none; font-size: 14px; font-family: var(--mono); color: var(--ink1); resize: none; line-height: 1.6; min-height: 56px; }
        .ib-note::placeholder { color: var(--ink3); }
      `}</style>
    </Sheet>
  )
}

// ─── STYLES ────────────────────────────────────────────────
function DashStyles() {
  return <style>{`
    .loading { display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px;font-family:var(--mono);font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink2); }
    .spinner { width:38px;height:38px;border:3px solid var(--line);border-top-color:var(--acc);border-radius:50%;animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .dash { min-height:100vh;padding-bottom:90px; }
    .hdr { background:var(--bg2);border-bottom:1px solid var(--line);padding:max(env(safe-area-inset-top),14px) 16px 12px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50; }
    .logo { display:flex;align-items:center;gap:10px; }
    .logo-icon { width:36px;height:36px;overflow:hidden;box-shadow:0 4px 12px rgba(34,211,238,.3); }
    .logo-icon svg { width:100%;height:100%;display:block; }
    .logo-text { font-family:var(--sans);font-size:20px;font-weight:900;color:var(--ink1);letter-spacing:4px; }
    .hdr-right { display:flex;align-items:center;gap:12px; }
    .streak { font-family:var(--mono);font-weight:700;font-size:14px;color:var(--warn); }
    .strava-btn { display:flex;align-items:center;gap:7px;background:var(--panel2);border:1px solid #5a3320;padding:8px 14px;font-family:var(--mono);font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#ff8a5c; }
    .sdot { width:6px;height:6px;background:var(--strava); }
    .sdot.spin { animation:pulse 1s infinite; }
    @keyframes pulse { 50% { opacity:.3; } }
    .main { padding:16px 15px 0; }
    .status-banner { display:flex;gap:8px;margin-bottom:14px; }
    .sb-item { flex:1;padding:12px;font-family:var(--mono);font-weight:700;font-size:12px;letter-spacing:.5px;text-transform:uppercase;display:flex;align-items:center;gap:7px;justify-content:center;border:1px solid;cursor:pointer; }
    button.sb-item { font-family:var(--mono); }
    .sb-item.crit { background:rgba(224,86,110,.08);color:var(--crit);border-color:rgba(224,86,110,.35); }
    .sb-item.warn { background:rgba(224,168,77,.08);color:var(--warn);border-color:rgba(224,168,77,.35); }
    .sb-num { font-family:var(--sans);font-size:18px;font-weight:900; }
    .bike-chips { display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px; }
    .bchip { flex-shrink:0;padding:9px 15px;background:var(--panel);border:1px solid var(--line);font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:.5px;color:var(--ink2);white-space:nowrap; }
    .bchip.on { background:var(--acc);border-color:var(--acc);color:#fff; }
    .bchip.add { font-size:16px;padding:9px 16px;color:var(--ink3); }
    .bike-hero { position:relative;background:linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02));border:1px solid var(--line);padding:20px;margin-bottom:16px;cursor:pointer;overflow:hidden;clip-path:polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%); }
    .bike-hero::before { content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:22px 22px; }
    .bike-hero:active { background:rgba(255,255,255,.02); }
    .bh-top { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;position:relative; }
    .bh-type { background:rgba(47,123,255,.10);color:var(--acc);font-family:var(--mono);font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border:1px solid rgba(47,123,255,.35); }
    .bh-detail { font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--acc-soft); }
    .bh-name { font-family:var(--sans);font-size:24px;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;color:var(--ink1);position:relative; }
    .bh-km-row { display:flex;align-items:flex-end;gap:7px;position:relative; }
    .bh-km { font-family:var(--sans);font-size:50px;font-weight:900;letter-spacing:-1px;line-height:.9;color:var(--ink1); }
    .bh-km-u { font-family:var(--mono);font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink2);padding-bottom:7px; }
    .bh-strava { font-family:var(--mono);font-size:11px;color:var(--strava);font-weight:700;letter-spacing:.5px;margin-top:10px;position:relative; }
    .sec-hdr { display:flex;align-items:center;gap:10px;margin-bottom:12px; }
    .sec-icon { width:28px;height:28px;background:rgba(52,199,154,.10);border:1px solid rgba(52,199,154,.3);display:flex;align-items:center;justify-content:center;font-size:14px; }
    .sec-title { font-family:var(--sans);font-size:15px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--ink1); }
    .empty-actions { display:flex;flex-direction:column;gap:8px;margin-top:16px; }
    .ea-green { background:var(--acc);color:white;border:none;padding:14px;font-family:var(--sans);font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase; }
    .ea-strava { background:var(--strava);color:white;border:none;padding:14px;font-family:var(--sans);font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase; }
    .fab-wrap { position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:160; }
    .fab { background:var(--acc);border:none;padding:14px 26px;display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:white; }
    .fab svg { width:18px;height:18px;stroke:white;stroke-width:2.5; }
    .fab:active { background:var(--acc-d); }
    .toast { position:fixed;bottom:140px;left:50%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--acc);color:var(--ink1);padding:11px 22px;font-family:var(--mono);font-weight:500;font-size:13px;letter-spacing:.5px;z-index:1000; }
    .toast-undo { display:flex;align-items:center;gap:16px;padding:11px 14px 11px 18px; }
    .undo-btn { background:var(--acc);border:none;color:#fff;font-family:var(--sans);font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:7px 12px;cursor:pointer; }
    .undo-btn:active { background:var(--acc-d); }
  `}</style>
}
