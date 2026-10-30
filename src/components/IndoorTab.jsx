import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getBikes, getTrackers, updateTracker, getTrainer, setTrainerFlag,
  getTrainerMounts, mountBikeOnTrainer, unmountTrainer, getIndoorKmByBike,
} from '../lib/data'
import { fmtKm, fmtDate } from '../lib/helpers'

// Indoor-Modus am Rad.
//
// Dieselbe Mechanik wie unter „Mehr → Rolle", nur von der anderen Seite
// gedacht: Dort steckt man ein Rad auf die Rolle, hier schaltet man am Rad
// ein, dass es gerade draufsteht. Beides schreibt in trainer_mounts, es gibt
// also nur eine Wahrheit – und weiterhin höchstens ein Rad gleichzeitig.
//
// Warum es das überhaupt braucht: Strava bucht Rollenfahrten auf die Rolle,
// nicht auf das Rad. Ohne diese Zuordnung wüsste niemand, wessen Kette die
// 30 km von heute abbekommen hat.

export default function IndoorTab({ bike, user, onChanged }) {
  const nav = useNavigate()
  const [trainer, setTrainer]   = useState(null)
  const [mounts, setMounts]     = useState([])
  const [indoor, setIndoor]     = useState({})
  const [trackers, setTrackers] = useState([])
  const [bikes, setBikes]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')

  async function load() {
    const t = await getTrainer(user.id).catch(() => null)
    setTrainer(t)
    const [m, ind, tr, bs] = await Promise.all([
      t ? getTrainerMounts(user.id, t.id).catch(() => []) : Promise.resolve([]),
      getIndoorKmByBike(user.id).catch(() => ({})),
      getTrackers(user.id).catch(() => []),
      getBikes(user.id).catch(() => []),
    ])
    setMounts(m)
    setIndoor(ind)
    setBikes(bs)
    setTrackers(tr.filter(x => x.bike_id === bike.id))
  }
  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)) }, [bike.id])

  const open    = mounts.find(m => !m.to_date) || null
  const isOn    = open?.bike_id === bike.id
  const myKm    = indoor[bike.id] || 0
  const kmTrack = trackers.filter(t => t.interval_type === 'km')
  const other   = trackers.filter(t => t.interval_type !== 'km')

  async function toggleMode() {
    setBusy(true); setErr('')
    try {
      if (isOn) await unmountTrainer(user.id, trainer.id)
      else await mountBikeOnTrainer(user.id, trainer.id, bike.id)
      await load()
    } catch (e) { setErr(e?.message || 'Konnte nicht gespeichert werden') }
    finally { setBusy(false) }
  }

  async function toggleTracker(t) {
    setBusy(true); setErr('')
    try {
      // Beim EINSCHALTEN den aktuellen Rollenstand als Basis setzen, sonst
      // zählten alle bisherigen Rollen-Kilometer rückwirkend mit und der
      // Tracker spränge schlagartig weiter.
      const on = !t.counts_indoor
      await updateTracker(t.id, on
        ? { counts_indoor: true, indoor_km_at_start: myKm }
        : { counts_indoor: false })
      await load()
      onChanged?.()
    } catch (e) { setErr(e?.message || 'Konnte nicht gespeichert werden') }
    finally { setBusy(false) }
  }

  async function makeTrainer() {
    setBusy(true); setErr('')
    try { await setTrainerFlag(bike.id, true); await load(); onChanged?.() }
    catch (e) { setErr(e?.message || 'Konnte nicht gespeichert werden') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="tab-body"><div className="in-note">Lade…</div></div>

  // ── Dieses Rad IST die Rolle ──────────────────────────────────────────
  if (bike.is_trainer) {
    return (
      <div className="tab-body">
        <div className="in-note">
          Dieses Rad ist als <strong>Rolle</strong> eingerichtet. Seine Fahrten werden
          dem Rad gutgeschrieben, das gerade daraufsteht.
        </div>
        <div className="in-card">
          <div className="in-card-l">Aktuell im Indoor-Modus</div>
          <div className="in-card-v">
            {open ? (bikes.find(b => b.id === open.bike_id)?.name || 'Unbekanntes Rad') : 'Kein Rad'}
          </div>
        </div>
        <button className="in-link" onClick={() => nav('/trainer')}>Verlauf ansehen →</button>
        <Styles />
      </div>
    )
  }

  // ── Noch keine Rolle eingerichtet ─────────────────────────────────────
  if (!trainer) {
    const looksLikeTrainer = bike.type === 'Indoor'
    return (
      <div className="tab-body">
        <div className="in-note">
          Für den Indoor-Modus muss erst feststehen, welches deiner Räder die
          Rolle ist. Strava bucht Rollenfahrten nämlich auf die Rolle, nicht auf
          das Rad, das daraufsteht.
        </div>
        {looksLikeTrainer ? (
          <button className="in-btn" disabled={busy} onClick={makeTrainer}>
            Dieses Rad ist meine Rolle
          </button>
        ) : (
          <button className="in-btn" onClick={() => nav('/trainer')}>Rolle einrichten</button>
        )}
        {err && <div className="in-err">{err}</div>}
        <Styles />
      </div>
    )
  }

  // ── Normales Rad, Rolle vorhanden ─────────────────────────────────────
  return (
    <div className="tab-body">
      <button className={`in-toggle ${isOn ? 'on' : ''}`} disabled={busy} onClick={toggleMode}>
        <span className="in-tg-box">{isOn ? '✓' : ''}</span>
        <span className="in-tg-txt">
          Indoor-Modus
          <em>
            {isOn
              ? `Steht seit ${fmtDate(open.from_date)} auf „${trainer.name}" · ${fmtKm(myKm)} km`
              : `Einschalten, wenn dieses Rad auf „${trainer.name}" steht`}
          </em>
        </span>
      </button>

      {!isOn && open && (
        <div className="in-warn">
          Aktuell steht ein anderes Rad auf der Rolle. Schaltest du hier ein,
          wird es dort automatisch abgemeldet – ab dann zählen die Kilometer hier.
        </div>
      )}

      <div className="in-lbl">Was soll im Indoor-Modus mitzählen?</div>
      {kmTrack.length === 0 ? (
        <div className="in-note">Dieses Rad hat keine km-Tracker.</div>
      ) : kmTrack.map(t => (
        <button key={t.id} className={`in-row ${t.counts_indoor ? 'on' : ''}`}
          disabled={busy} onClick={() => toggleTracker(t)}>
          <span className="in-box">{t.counts_indoor ? '✓' : ''}</span>
          <span className="in-main">
            {t.icon} {t.title}
            <em>alle {fmtKm(t.interval_km)} km</em>
          </span>
        </button>
      ))}

      {other.length > 0 && (
        <div className="in-note in-foot">
          Nicht aufgeführt: {other.map(t => t.title).join(', ')}. Diese laufen nach
          Kalender bzw. Fahrzeit und zählen ohnehin weiter – drinnen wie draußen.
        </div>
      )}
      {err && <div className="in-err">{err}</div>}
      <Styles />
    </div>
  )
}

function Styles() {
  return <style>{`
    .in-note { border:1px dashed var(--line); padding:14px; font-family:var(--mono); font-size:0.6875rem; color:var(--ink3); line-height:1.75; margin-bottom:16px; }
    .in-note strong { color:var(--ink2); }
    .in-foot { margin-top:18px; margin-bottom:0; }
    .in-warn { border:1px solid color-mix(in srgb, var(--warn) 45%, transparent); color:var(--warn); padding:12px; font-family:var(--mono); font-size:0.65625rem; line-height:1.7; margin-bottom:18px; }
    .in-lbl { font-family:var(--mono); font-size:0.65625rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin:22px 2px 10px; }
    .in-toggle { width:100%; display:flex; align-items:flex-start; gap:12px; text-align:left; background:var(--panel); border:1px solid var(--line); padding:14px; margin-bottom:16px; }
    .in-toggle.on { border-color:var(--acc); background:color-mix(in srgb, var(--acc) 10%, transparent); }
    .in-tg-box, .in-box { flex-shrink:0; width:22px; height:22px; border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:var(--on-acc); background:var(--panel2); }
    .in-toggle.on .in-tg-box, .in-row.on .in-box { background:var(--acc); border-color:var(--acc); }
    .in-tg-txt { display:flex; flex-direction:column; gap:4px; font-family:var(--sans); font-size:0.9375rem; font-weight:800; color:var(--ink1); letter-spacing:.2px; }
    .in-tg-txt em, .in-main em { font-family:var(--mono); font-size:0.65625rem; font-weight:400; font-style:normal; color:var(--ink3); line-height:1.6; }
    .in-row { width:100%; display:flex; align-items:center; gap:12px; text-align:left; background:var(--panel2); border:1px solid var(--line); padding:11px 12px; margin-bottom:5px; }
    .in-row.on { border-color:color-mix(in srgb, var(--acc) 45%, transparent); }
    .in-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; font-family:var(--sans); font-size:0.8125rem; font-weight:800; color:var(--ink1); letter-spacing:.2px; }
    .in-card { border:1px solid var(--line); background:var(--panel); padding:14px; margin-bottom:14px; }
    .in-card-l { font-family:var(--mono); font-size:0.625rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin-bottom:6px; }
    .in-card-v { font-family:var(--sans); font-size:1.125rem; font-weight:800; color:var(--ink1); }
    .in-btn { width:100%; background:var(--acc); border:none; color:var(--on-acc); font-family:var(--mono); font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:14px; }
    .in-link { background:none; border:none; padding:6px 0; color:var(--acc); font-family:var(--mono); font-size:0.71875rem; font-weight:700; }
    .in-err { margin-top:12px; border:1px solid var(--crit); color:var(--crit); padding:10px 12px; font-family:var(--mono); font-size:0.6875rem; }
  `}</style>
}
