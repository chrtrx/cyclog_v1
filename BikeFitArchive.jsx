import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getBikes, getBikeFits, addBikeFit } from '../lib/data'
import { Page, AddButton, Sheet, Field, BtnGreen, Empty } from '../components/ui'

export default function BikeFitArchive() {
  const { user } = useAuth()
  const [bikes, setBikes] = useState([])
  const [activeBikeId, setActiveBikeId] = useState(null)
  const [fits, setFits] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadBikes() }, [])
  useEffect(() => { if (activeBikeId) loadFits() }, [activeBikeId])

  async function loadBikes() {
    setLoading(true)
    const b = await getBikes(user.id)
    setBikes(b)
    if (b.length) setActiveBikeId(b[0].id)
    setLoading(false)
  }
  async function loadFits() {
    const f = await getBikeFits(activeBikeId)
    setFits(f)
  }

  const activeBike = bikes.find(b => b.id === activeBikeId)

  return (
    <Page title="Bike-Fit Archiv" subtitle="Jede Position reproduzierbar speichern"
      action={activeBike && <AddButton onClick={() => setShowAdd(true)} />}>
      {loading ? null : bikes.length === 0 ? (
        <Empty emoji="📐" title="Keine Fahrräder" sub="Lege zuerst ein Fahrrad an." />
      ) : (
        <>
          <div className="bchips">
            {bikes.map(b => (
              <button key={b.id} className={`bchip ${b.id === activeBikeId ? 'on' : ''}`} onClick={() => setActiveBikeId(b.id)}>
                {b.name}
              </button>
            ))}
          </div>
          {fits.length === 0 ? (
            <Empty emoji="📐" title="Noch kein Fit" sub="Speichere deine aktuelle Sitzposition als Referenz." />
          ) : (
            fits.map((fit, i) => (
              <div key={fit.id} className="fit-card">
                <div className="fit-top">
                  <div className="fit-date">📅 {new Date(fit.fit_date).toLocaleDateString('de-DE')}</div>
                  {i === 0 && <div className="fit-current">Aktuell</div>}
                </div>
                <div className="fit-grid">
                  <FitVal label="Sattelhöhe" val={fit.saddle_height} unit="mm" />
                  <FitVal label="Setback" val={fit.setback} unit="mm" />
                  <FitVal label="Vorbau" val={fit.stem_length} unit="mm" />
                  <FitVal label="Vorbauwinkel" val={fit.stem_angle} unit="°" />
                  <FitVal label="Spacer" val={fit.spacer_height} unit="mm" />
                  <FitVal label="Lenkerhöhe" val={fit.bar_height} unit="mm" />
                </div>
                {fit.fitter_notes && <div className="fit-notes">📝 {fit.fitter_notes}</div>}
              </div>
            ))
          )}
        </>
      )}
      {showAdd && <AddFitSheet user={user} bikeId={activeBikeId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadFits() }} />}

      <style>{`
        .bchips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px; }
        .bchip { flex-shrink: 0; padding: 8px 16px; background: var(--white); border: 2px solid var(--border); border-radius: 50px; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800; color: var(--t2); box-shadow: 0 3px 0 var(--border); white-space: nowrap; }
        .bchip.on { background: var(--green); border-color: var(--green-d); color: white; box-shadow: 0 3px 0 var(--green-d); }
        .fit-card { background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 16px; margin-bottom: 10px; }
        .fit-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .fit-date { font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; color: var(--t1); }
        .fit-current { background: var(--green-l); color: var(--green-d); font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 50px; }
        .fit-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .fit-notes { font-size: 12px; color: var(--t3); font-weight: 600; margin-top: 12px; padding-top: 10px; border-top: 2px solid var(--bg); }
      `}</style>
    </Page>
  )
}

function FitVal({ label, val, unit }) {
  return (
    <div className="fv">
      <div className="fv-num">{val != null ? val : '—'}<span className="fv-unit">{val != null ? unit : ''}</span></div>
      <div className="fv-lbl">{label}</div>
      <style>{`
        .fv { background: var(--bg); border-radius: 12px; padding: 10px; text-align: center; }
        .fv-num { font-family: 'Nunito', sans-serif; font-size: 18px; font-weight: 900; color: var(--t1); }
        .fv-unit { font-size: 11px; color: var(--t3); font-weight: 700; margin-left: 1px; }
        .fv-lbl { font-size: 10px; color: var(--t3); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }
      `}</style>
    </div>
  )
}

function AddFitSheet({ user, bikeId, onClose, onSaved }) {
  const [f, setF] = useState({
    fit_date: new Date().toISOString().slice(0,10),
    saddle_height:'', setback:'', stem_length:'', stem_angle:'', spacer_height:'', bar_height:'', fitter_notes:'',
  })
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    await addBikeFit(user.id, {
      bike_id: bikeId,
      fit_date: f.fit_date,
      saddle_height: f.saddle_height ? Number(f.saddle_height) : null,
      setback: f.setback ? Number(f.setback) : null,
      stem_length: f.stem_length ? Number(f.stem_length) : null,
      stem_angle: f.stem_angle ? Number(f.stem_angle) : null,
      spacer_height: f.spacer_height ? Number(f.spacer_height) : null,
      bar_height: f.bar_height ? Number(f.bar_height) : null,
      fitter_notes: f.fitter_notes || null,
    })
    onSaved()
  }

  return (
    <Sheet title="Neue Position" sub="Maße vom Bikefitting eintragen." onClose={onClose}>
      <Field label="Datum" type="date" value={f.fit_date} onChange={set('fit_date')} />
      <div className="grid2">
        <Field label="Sattelhöhe (mm)" type="number" value={f.saddle_height} onChange={set('saddle_height')} placeholder="740" />
        <Field label="Setback (mm)" type="number" value={f.setback} onChange={set('setback')} placeholder="75" />
        <Field label="Vorbaulänge (mm)" type="number" value={f.stem_length} onChange={set('stem_length')} placeholder="100" />
        <Field label="Vorbauwinkel (°)" type="number" value={f.stem_angle} onChange={set('stem_angle')} placeholder="-6" />
        <Field label="Spacer (mm)" type="number" value={f.spacer_height} onChange={set('spacer_height')} placeholder="20" />
        <Field label="Lenkerhöhe (mm)" type="number" value={f.bar_height} onChange={set('bar_height')} placeholder="540" />
      </div>
      <Field label="Notizen Bikefitter" value={f.fitter_notes} onChange={set('fitter_notes')} placeholder="Empfehlungen" />
      <BtnGreen onClick={save}>Position speichern</BtnGreen>
      <style>{`.grid2 { display:grid;grid-template-columns:1fr 1fr;gap:10px; }`}</style>
    </Sheet>
  )
}
