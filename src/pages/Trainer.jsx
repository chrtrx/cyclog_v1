import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import {
  getBikes, addBike, updateBike, getTrainer, setTrainerFlag,
  getTrainerMounts, mountBikeOnTrainer, unmountTrainer, getIndoorKmByBike,
} from '../lib/data'
import { Page } from '../components/ui'
import { fmtKm, fmtDate } from '../lib/helpers'

// Rolle (Indoor-Trainer).
//
// Der Kern des Problems: bikes.km wird bei jedem Sync aus dem Strava-Odometer
// überschrieben, und bei Strava laufen Rollenfahrten auf die Rolle, nicht auf
// das aufgesteckte Rad. Die Kilometer lassen sich also nicht aufaddieren.
// Stattdessen führt die App eine zweite Zahl: Welches Rad stand wann auf der
// Rolle (trainer_mounts), und wie viele Rollen-Kilometer kommen dadurch auf
// welches Rad. Tracker mit „zählt auf der Rolle" rechnen sie obendrauf.

const fmtDay = (d) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

export default function Trainer() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [bikes, setBikes]     = useState([])
  const [trainer, setTrainer] = useState(null)
  const [mounts, setMounts]   = useState([])
  const [indoor, setIndoor]   = useState({})
  const [gear, setGear]       = useState(null)     // null = noch nicht geladen
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')

  async function load() {
    const [b, t] = await Promise.all([
      getBikes(user.id).catch(() => []),
      getTrainer(user.id).catch(() => null),
    ])
    setBikes(b.filter(x => !x.archived))
    setTrainer(t)
    const [m, ind] = await Promise.all([
      t ? getTrainerMounts(user.id, t.id).catch(() => []) : Promise.resolve([]),
      getIndoorKmByBike(user.id).catch(() => ({})),
    ])
    setMounts(m)
    setIndoor(ind)
  }

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)) }, [])

  // Strava-Ausrüstung erst auf Wunsch holen – ein Netzaufruf, der nur beim
  // Einrichten gebraucht wird.
  async function loadGear() {
    setBusy(true); setErr('')
    try {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch('/api/strava-gear', {
        headers: { Authorization: `Bearer ${s?.session?.access_token || ''}` },
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Strava antwortet nicht')
      setGear(json.gear || [])
    } catch (e) {
      setErr(e?.message || 'Ausrüstung konnte nicht geladen werden')
      setGear([])
    } finally { setBusy(false) }
  }

  // Ausgewählte Strava-Ausrüstung als Rolle übernehmen. Hängt sie schon an
  // einem Rad, wird dieses zur Rolle erklärt statt ein zweites anzulegen.
  async function useAsTrainer(g) {
    setBusy(true); setErr('')
    try {
      const existing = bikes.find(b => b.strava_gear_id === g.id)
      if (existing) {
        await updateBike(existing.id, { is_trainer: true })
      } else {
        await addBike(user.id, {
          name: g.name, type: 'Indoor', km: g.km,
          strava_gear_id: g.id, is_trainer: true,
        })
      }
      setGear(null)
      await load()
    } catch (e) {
      setErr(e?.message || 'Konnte nicht gespeichert werden')
    } finally { setBusy(false) }
  }

  async function mount(bikeId) {
    setBusy(true); setErr('')
    try { await mountBikeOnTrainer(user.id, trainer.id, bikeId); await load() }
    catch (e) { setErr(e?.message || 'Konnte nicht gespeichert werden') }
    finally { setBusy(false) }
  }

  async function unmount() {
    setBusy(true); setErr('')
    try { await unmountTrainer(user.id, trainer.id); await load() }
    catch (e) { setErr(e?.message || 'Konnte nicht gespeichert werden') }
    finally { setBusy(false) }
  }

  async function removeTrainer() {
    setBusy(true)
    try { await setTrainerFlag(trainer.id, false); await load() }
    finally { setBusy(false) }
  }

  const bikeName = (id) => bikes.find(b => b.id === id)?.name || 'Unbekanntes Rad'
  const current  = mounts.find(m => !m.to_date) || null
  const past     = mounts.filter(m => m.to_date)
  const mountable = bikes.filter(b => !b.is_trainer)

  if (loading) return <Page title="Rolle" back="/more"><div className="tr-note">Lade…</div></Page>

  // ── Noch keine Rolle eingerichtet ──────────────────────────────────────
  if (!trainer) {
    return (
      <Page title="Rolle" subtitle="Indoor-Training" back="/more">
        <div className="tr-note">
          Deine Rollenfahrten liegen bei Strava auf der Rolle selbst, nicht auf dem
          Rad, das daraufsteht. Ordne die Rolle hier einmal zu – danach kannst du
          festlegen, welches Rad gerade aufgesteckt ist, und die Kilometer landen
          auf dessen Kette.
        </div>

        {gear === null ? (
          <button className="tr-btn" disabled={busy} onClick={loadGear}>
            {busy ? 'Lade Ausrüstung…' : 'Strava-Ausrüstung laden'}
          </button>
        ) : gear.length === 0 ? (
          <div className="tr-note">Keine Ausrüstung gefunden. Ist Strava verbunden?</div>
        ) : (
          <>
            <div className="tr-hdr">Welche davon ist die Rolle?</div>
            {gear.map(g => (
              <button key={g.id} className="tr-pick" disabled={busy} onClick={() => useAsTrainer(g)}>
                <span className="tr-main">
                  {g.name}
                  <span className="tr-sub">
                    {fmtKm(g.km)} km bei Strava
                    {g.takenBy ? ` · in Cyclog als „${g.takenBy}"` : ''}
                  </span>
                </span>
                <span className="tr-arrow">›</span>
              </button>
            ))}
          </>
        )}
        {err && <div className="tr-err">{err}</div>}
        <Styles />
      </Page>
    )
  }

  // ── Rolle eingerichtet ─────────────────────────────────────────────────
  return (
    <Page title="Rolle" subtitle={trainer.name} back="/more">
      <div className="tr-card">
        <div className="tr-card-l">Aktuell aufgesteckt</div>
        {current ? (
          <>
            <div className="tr-card-v">{bikeName(current.bike_id)}</div>
            <div className="tr-card-s">
              seit {fmtDay(current.from_date)} · {fmtKm(indoor[current.bike_id] || 0)} km auf der Rolle
            </div>
          </>
        ) : (
          <div className="tr-card-s">Kein Rad aufgesteckt – Rollenfahrten zählen auf kein Rad.</div>
        )}
      </div>

      <div className="tr-hdr">Rad wechseln</div>
      <div className="tr-bikes">
        {mountable.map(b => (
          <button key={b.id} disabled={busy}
            className={`tr-bike ${current?.bike_id === b.id ? 'on' : ''}`}
            onClick={() => mount(b.id)}>{b.name}</button>
        ))}
      </div>
      {current && (
        <button className="tr-link" disabled={busy} onClick={unmount}>Rad runternehmen</button>
      )}

      <div className="tr-hdr tr-hdr2">Verlauf</div>
      {past.length === 0 && !current ? (
        <div className="tr-note">Noch kein Rad aufgesteckt.</div>
      ) : (
        <>
          {current && (
            <div className="tr-row">
              <span className="tr-when">seit {fmtDay(current.from_date)}</span>
              <span className="tr-main">
                {bikeName(current.bike_id)}
                <span className="tr-sub">{fmtKm(indoor[current.bike_id] || 0)} km · läuft</span>
              </span>
            </div>
          )}
          {past.map(m => (
            <div key={m.id} className="tr-row">
              <span className="tr-when">{fmtDay(m.from_date)}</span>
              <span className="tr-main">
                {bikeName(m.bike_id)}
                <span className="tr-sub">bis {fmtDay(m.to_date)}</span>
              </span>
            </div>
          ))}
        </>
      )}

      <div className="tr-note tr-foot">
        Welche Tracker die Rollen-Kilometer mitzählen, stellst du am Tracker selbst
        ein. Voreingestellt ist der Antrieb – Bremsen, Reifen und Fahrwerk
        verschleißen drinnen nicht.
      </div>
      <button className="tr-link tr-danger" disabled={busy} onClick={removeTrainer}>
        Dieses Rad ist doch nicht die Rolle
      </button>
      {err && <div className="tr-err">{err}</div>}
      <Styles />
    </Page>
  )
}

function Styles() {
  return <style>{`
    .tr-note { border:1px dashed var(--line); padding:16px; font-family:var(--mono); font-size:0.71875rem; color:var(--ink3); line-height:1.75; margin-bottom:16px; }
    .tr-foot { margin-top:26px; }
    .tr-hdr { font-family:var(--mono); font-size:0.65625rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin:0 2px 12px; }
    .tr-hdr2 { margin-top:26px; }

    .tr-card { border:1px solid var(--line); background:var(--panel); padding:16px; margin-bottom:22px; }
    .tr-card-l { font-family:var(--mono); font-size:0.625rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin-bottom:8px; }
    .tr-card-v { font-family:var(--sans); font-size:1.25rem; font-weight:800; color:var(--ink1); letter-spacing:.2px; }
    .tr-card-s { font-family:var(--mono); font-size:0.6875rem; color:var(--ink2); line-height:1.7; margin-top:5px; }

    .tr-btn { width:100%; background:var(--acc); border:none; color:var(--on-acc); font-family:var(--mono); font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:14px; }
    .tr-btn:disabled { opacity:.5; }

    .tr-pick { width:100%; display:flex; align-items:center; gap:12px; text-align:left; background:var(--panel2); border:1px solid var(--line); padding:12px; margin-bottom:6px; }
    .tr-arrow { color:var(--ink3); font-size:1.125rem; }

    .tr-bikes { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
    .tr-bike { background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--mono); font-size:0.71875rem; font-weight:700; padding:9px 12px; }
    .tr-bike.on { background:color-mix(in srgb, var(--acc) 12%, transparent); border-color:var(--acc); color:var(--acc); }

    .tr-row { display:flex; align-items:flex-start; gap:12px; padding:11px 12px; border:1px solid var(--line); margin-bottom:5px; }
    .tr-when { flex-shrink:0; width:84px; font-family:var(--mono); font-size:0.65625rem; font-weight:700; color:var(--ink3); padding-top:3px; }
    .tr-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; font-family:var(--sans); font-size:0.84375rem; font-weight:800; color:var(--ink1); letter-spacing:.2px; }
    .tr-sub { font-family:var(--mono); font-size:0.65625rem; font-weight:400; color:var(--ink3); line-height:1.5; }

    .tr-link { display:block; margin-top:4px; background:none; border:none; padding:6px 0; color:var(--acc); font-family:var(--mono); font-size:0.71875rem; font-weight:700; }
    .tr-danger { color:var(--ink3); margin-top:18px; }
    .tr-err { margin-top:12px; border:1px solid var(--crit); color:var(--crit); padding:10px 12px; font-family:var(--mono); font-size:0.6875rem; }
  `}</style>
}
