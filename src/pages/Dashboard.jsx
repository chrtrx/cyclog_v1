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
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const [b, t, s, p] = await Promise.all([
        getBikes(user.id), getTrackers(user.id), getStravaStatus(user.id), getProfile(user.id),
      ])
      setBikes(b); setTrackers(t); setStravaStatus(s); setProfile(p)
      if (b.length && !activeBikeId) setActiveBikeId(b[0].id)
    } catch (e) { showToast('Fehler beim Laden') }
    setLoading(false)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2400) }

  const activeBike = bikes.find(b => b.id === activeBikeId)
  const bikeTrackers = trackers.filter(t => t.bike_id === activeBikeId)

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

  if (loading) return <div className="loading"><div className="spinner" />Lade…</div>

  return (
    <div className="dash">
      <header className="hdr">
        <div className="logo">
          <div className="logo-icon">🚴</div>
          <span className="logo-text">Cyclog</span>
        </div>
        <div className="hdr-right">
          {profile?.streak > 0 && <div className="streak">🔥 {profile.streak}</div>}
          <button className="strava-btn" onClick={stravaStatus ? handleSync : () => nav('/connect-strava')} disabled={syncing}>
            <span className={`sdot ${syncing ? 'spin' : ''}`} />
            {syncing ? 'Sync…' : stravaStatus ? 'Strava' : 'Verbinden'}
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
                {dueCount > 0 && <div className="sb-item crit"><span className="sb-num">{dueCount}</span> überfällig</div>}
                {soonCount > 0 && <div className="sb-item warn"><span className="sb-num">{soonCount}</span> bald fällig</div>}
              </div>
            )}

            {/* Bike Selector */}
            <div className="bike-chips">
              {bikes.map(b => (
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
                <TrackerCard key={t.id} tracker={t} bikeKm={activeBike.km} onClick={() => setEditTracker(t)} />
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
      {editTracker && (
        <EditTrackerSheet tracker={editTracker} bikeKm={activeBike.km}
          onSave={async (u) => { await updateTracker(editTracker.id, u); setEditTracker(null); await load() }}
          onDelete={async () => { await deleteTracker(editTracker.id); setEditTracker(null); await load(); showToast('Gelöscht') }}
          onClose={() => setEditTracker(null)} />
      )}
      {toast && <div className="toast">{toast}</div>}

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
        .svc-sec { margin-bottom: 10px; }
        .svc-sec-lbl { font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 800; color: var(--t3); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 7px; padding: 0 2px; }
        .svc-row { display: flex; align-items: center; gap: 11px; padding: 12px 13px; background: var(--white); border-radius: var(--r-md); border: 2px solid var(--border); margin-bottom: 6px; box-shadow: 0 3px 0 var(--border); width: 100%; cursor: pointer; }
        .svc-row:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--border); }
        .svc-ico { width: 36px; height: 36px; border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center; font-size: 19px; background: var(--bg); flex-shrink: 0; }
        .svc-nm { font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; color: var(--t1); }
        .svc-int { font-size: 12px; color: var(--t3); font-weight: 600; margin-top: 1px; }
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
        .lblx { display:block;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:var(--t2);margin-bottom:5px; }
        .type-grid { display:flex;gap:6px;flex-wrap:wrap; }
        .type-opt { padding:8px 14px;border-radius:50px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;background:var(--bg);border:2px solid var(--border);color:var(--t2);box-shadow:0 2px 0 var(--border); }
        .type-opt.on { background:var(--green);border-color:var(--green-d);color:white;box-shadow:0 2px 0 var(--green-d); }
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
        <div className="ib-val">{interval.toLocaleString('de')} <small>km</small></div>
        <input type="range" min="100" max="10000" step="100" value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
        <div className="presets">
          {[500, 1000, 2000, 3000, 5000].map(v => (
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
        .ib { margin-bottom: 11px; background: var(--bg); border-radius: var(--r-lg); border: 2px solid var(--border); padding: 15px; }
        .ib-lbl { font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 800; color: var(--t3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 9px; }
        .ib-val { font-family: 'Nunito', sans-serif; font-size: 34px; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 12px; color: var(--t1); }
        .ib-val small { font-size: 15px; color: var(--t2); font-weight: 700; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 8px; border-radius: 50px; background: var(--border); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: white; border: 3px solid var(--green); box-shadow: 0 3px 0 var(--green-d); }
        .presets { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 11px; }
        .preset { padding: 6px 12px; border-radius: 50px; font-size: 12px; font-weight: 800; font-family: 'Nunito', sans-serif; background: white; border: 2px solid var(--border); color: var(--t2); box-shadow: 0 2px 0 var(--border); }
        .ib-note { width: 100%; background: none; border: none; outline: none; font-size: 14px; font-family: 'Nunito Sans', sans-serif; font-weight: 600; resize: none; line-height: 1.6; min-height: 56px; }
      `}</style>
    </Sheet>
  )
}

// ─── STYLES ────────────────────────────────────────────────
function DashStyles() {
  return <style>{`
    .loading { display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px;font-family:'Nunito',sans-serif;font-weight:800;color:var(--t2); }
    .spinner { width:40px;height:40px;border:4px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .dash { min-height:100vh;padding-bottom:80px; }
    .hdr { background:var(--white);border-bottom:2px solid var(--border);padding:max(env(safe-area-inset-top),14px) 18px 12px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50; }
    .logo { display:flex;align-items:center;gap:8px; }
    .logo-icon { width:36px;height:36px;background:var(--green);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 0 var(--green-d); }
    .logo-text { font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:var(--green);letter-spacing:-.5px; }
    .hdr-right { display:flex;align-items:center;gap:10px; }
    .streak { font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;color:var(--orange); }
    .strava-btn { display:flex;align-items:center;gap:6px;background:var(--strava-l);border:2px solid #ffcbb8;border-radius:50px;padding:7px 14px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;color:var(--strava);box-shadow:0 2px 0 #ffcbb8; }
    .sdot { width:8px;height:8px;border-radius:50%;background:var(--strava); }
    .sdot.spin { animation:pulse 1s infinite; }
    @keyframes pulse { 50% { opacity:.3; } }
    .main { padding:16px 15px 0; }
    .status-banner { display:flex;gap:8px;margin-bottom:14px; }
    .sb-item { flex:1;border-radius:14px;padding:12px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;display:flex;align-items:center;gap:6px;justify-content:center; }
    .sb-item.crit { background:var(--red-l);color:var(--red-d); }
    .sb-item.warn { background:var(--orange-l);color:var(--orange-d); }
    .sb-num { font-size:20px;font-weight:900; }
    .bike-chips { display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px; }
    .bchip { flex-shrink:0;padding:8px 16px;background:var(--white);border:2px solid var(--border);border-radius:50px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:var(--t2);box-shadow:0 3px 0 var(--border);white-space:nowrap; }
    .bchip.on { background:var(--green);border-color:var(--green-d);color:white;box-shadow:0 3px 0 var(--green-d); }
    .bchip.add { font-size:18px;padding:8px 16px;color:var(--t3); }
    .bike-hero { background:var(--white);border-radius:var(--r-xl);border:2px solid var(--border);box-shadow:0 4px 0 var(--border);padding:20px;margin-bottom:16px;cursor:pointer;transition:transform .12s; }
    .bike-hero:active { transform:scale(.98) translateY(2px);box-shadow:0 2px 0 var(--border); }
    .bh-top { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px; }
    .bh-type { background:var(--green-l);color:var(--green-d);font-family:'Nunito',sans-serif;font-weight:800;font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:4px 10px;border-radius:50px; }
    .bh-detail { font-family:'Nunito',sans-serif;font-size:12px;font-weight:800;color:var(--blue); }
    .bh-name { font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;letter-spacing:-.5px;margin-bottom:10px;color:var(--t1); }
    .bh-km-row { display:flex;align-items:flex-end;gap:6px; }
    .bh-km { font-family:'Nunito',sans-serif;font-size:46px;font-weight:900;letter-spacing:-2px;line-height:1;color:var(--t1); }
    .bh-km-u { font-size:15px;font-weight:700;color:var(--t2);padding-bottom:5px; }
    .bh-strava { font-size:12px;color:var(--strava);font-weight:800;margin-top:8px; }
    .sec-hdr { display:flex;align-items:center;gap:10px;margin-bottom:12px; }
    .sec-icon { width:30px;height:30px;border-radius:var(--r-sm);background:var(--green-l);display:flex;align-items:center;justify-content:center;font-size:16px; }
    .sec-title { font-family:'Nunito',sans-serif;font-size:16px;font-weight:900;color:var(--t1); }
    .empty-actions { display:flex;flex-direction:column;gap:8px;margin-top:16px; }
    .ea-green { background:var(--green);color:white;border:none;border-radius:14px;padding:14px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;box-shadow:0 4px 0 var(--green-d); }
    .ea-strava { background:var(--strava);color:white;border:none;border-radius:14px;padding:14px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;box-shadow:0 4px 0 var(--strava-d); }
    .fab-wrap { position:fixed;bottom:76px;left:50%;transform:translateX(-50%);z-index:160; }
    .fab { background:var(--green);border:none;border-radius:50px;padding:14px 24px;display:flex;align-items:center;gap:8px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;color:white;box-shadow:0 5px 0 var(--green-d); }
    .fab svg { width:20px;height:20px;stroke:white;stroke-width:2.5; }
    .fab:active { transform:translateY(3px);box-shadow:0 2px 0 var(--green-d); }
    .toast { position:fixed;bottom:140px;left:50%;transform:translateX(-50%);background:var(--t1);color:white;padding:10px 22px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:800;font-size:14px;z-index:1000;box-shadow:0 4px 0 rgba(0,0,0,.3); }
  `}</style>
}
