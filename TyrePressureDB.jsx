import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getTyrePressures, addTyrePressure, deleteTyrePressure, getBikes, getProfile } from '../lib/data'
import { Page, AddButton, Sheet, Field, BtnGreen, Empty } from '../components/ui'

export default function TyrePressureDB() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [bikes, setBikes] = useState([])
  const [profile, setProfile] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [e, b, p] = await Promise.all([getTyrePressures(user.id), getBikes(user.id), getProfile(user.id)])
    setEntries(e); setBikes(b); setProfile(p); setLoading(false)
  }

  const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0))

  return (
    <Page title="Reifendruck-DB" subtitle="Deine persönliche Erfahrungsdatenbank"
      action={<AddButton onClick={() => setShowAdd(true)} />}>
      {loading ? null : entries.length === 0 ? (
        <Empty emoji="🔵" title="Noch keine Einträge"
          sub="Halte fest welcher Druck bei welchen Bedingungen am besten lief." />
      ) : (
        entries.map(e => (
          <div key={e.id} className="tp-card">
            <div className="tp-top">
              <div className="tp-tyre">{e.tyre_model || 'Reifen'} {e.tyre_width ? `${e.tyre_width}mm` : ''}</div>
              {e.rating != null && <div className="tp-rating">{stars(e.rating)}</div>}
            </div>
            <div className="tp-pressure">
              <div className="tp-p"><span className="tp-p-num">{e.pressure_front}</span><span className="tp-p-lbl">bar v.</span></div>
              <div className="tp-p-div">/</div>
              <div className="tp-p"><span className="tp-p-num">{e.pressure_rear}</span><span className="tp-p-lbl">bar h.</span></div>
            </div>
            <div className="tp-cond">
              {e.surface && <span className="tp-chip">{e.surface}</span>}
              {e.weather && <span className="tp-chip">{e.weather}</span>}
              {e.rider_weight && <span className="tp-chip">{e.rider_weight} kg</span>}
              {e.rim && <span className="tp-chip">{e.rim}</span>}
            </div>
            {e.notes && <div className="tp-notes">{e.notes}</div>}
          </div>
        ))
      )}
      {showAdd && <AddPressureSheet user={user} bikes={bikes} defaultWeight={profile?.weight_kg} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}

      <style>{`
        .tp-card { background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 16px; margin-bottom: 10px; }
        .tp-top { display: flex; align-items: center; justify-content: space-between; }
        .tp-tyre { font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 900; color: var(--t1); }
        .tp-rating { color: var(--orange); font-size: 13px; letter-spacing: 1px; }
        .tp-pressure { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
        .tp-p { display: flex; align-items: baseline; gap: 4px; }
        .tp-p-num { font-family: 'Nunito', sans-serif; font-size: 28px; font-weight: 900; color: var(--blue); letter-spacing: -1px; }
        .tp-p-lbl { font-size: 12px; color: var(--t3); font-weight: 700; }
        .tp-p-div { font-size: 22px; color: var(--t3); font-weight: 300; }
        .tp-cond { display: flex; gap: 6px; flex-wrap: wrap; }
        .tp-chip { background: var(--bg); border-radius: 50px; padding: 4px 10px; font-size: 12px; font-weight: 800; color: var(--t2); font-family: 'Nunito', sans-serif; }
        .tp-notes { font-size: 12px; color: var(--t3); font-weight: 600; margin-top: 8px; padding-top: 8px; border-top: 2px solid var(--bg); }
      `}</style>
    </Page>
  )
}

function AddPressureSheet({ user, bikes, defaultWeight, onClose, onSaved }) {
  const [f, setF] = useState({
    tyre_model:'', tyre_width:'', rim:'', rider_weight: defaultWeight || '',
    weather:'', surface:'Straße', pressure_front:'', pressure_rear:'', rating:0, notes:'',
  })
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.pressure_front) return
    await addTyrePressure(user.id, {
      tyre_model: f.tyre_model || null,
      tyre_width: f.tyre_width ? Number(f.tyre_width) : null,
      rim: f.rim || null,
      rider_weight: f.rider_weight ? Number(f.rider_weight) : null,
      weather: f.weather || null,
      surface: f.surface || null,
      pressure_front: Number(f.pressure_front),
      pressure_rear: f.pressure_rear ? Number(f.pressure_rear) : null,
      rating: f.rating || null,
      notes: f.notes || null,
    })
    onSaved()
  }

  const surfaces = ['Straße', 'Gravel', 'Trail', 'Indoor']

  return (
    <Sheet title="Reifendruck-Eintrag" sub="Festhalten was funktioniert hat." onClose={onClose}>
      <Field label="Reifenmodell" value={f.tyre_model} onChange={set('tyre_model')} placeholder="z.B. GP5000 S TR" />
      <div className="grid2">
        <Field label="Breite (mm)" type="number" value={f.tyre_width} onChange={set('tyre_width')} placeholder="28" />
        <Field label="Felge" value={f.rim} onChange={set('rim')} placeholder="z.B. 25mm" />
      </div>
      <div className="grid2">
        <Field label="Druck vorne (bar)" type="number" value={f.pressure_front} onChange={set('pressure_front')} placeholder="5.5" />
        <Field label="Druck hinten (bar)" type="number" value={f.pressure_rear} onChange={set('pressure_rear')} placeholder="6.0" />
      </div>
      <Field label="Fahrergewicht (kg)" type="number" value={f.rider_weight} onChange={set('rider_weight')} placeholder="76" />
      <div className="field">
        <label className="lblx">Untergrund</label>
        <div className="seg">
          {surfaces.map(s => (
            <button key={s} className={`seg-opt ${f.surface === s ? 'on' : ''}`} onClick={() => set('surface')(s)}>{s}</button>
          ))}
        </div>
      </div>
      <Field label="Wetter" value={f.weather} onChange={set('weather')} placeholder="z.B. trocken, 20°C" />
      <div className="field">
        <label className="lblx">Bewertung</label>
        <div className="star-row">
          {[1,2,3,4,5].map(n => (
            <button key={n} className="star-btn" onClick={() => set('rating')(n)}>
              {n <= f.rating ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
      <Field label="Notiz" value={f.notes} onChange={set('notes')} placeholder="Beobachtungen" />
      <BtnGreen onClick={save}>Eintrag speichern</BtnGreen>
      <style>{`
        .grid2 { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        .lblx { display:block;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:var(--t2);margin-bottom:5px; }
        .seg { display:flex;gap:6px;flex-wrap:wrap; }
        .seg-opt { padding:8px 14px;border-radius:50px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;background:var(--bg);border:2px solid var(--border);color:var(--t2);box-shadow:0 2px 0 var(--border); }
        .seg-opt.on { background:var(--blue);border-color:var(--blue-d);color:white;box-shadow:0 2px 0 var(--blue-d); }
        .star-row { display:flex;gap:4px; }
        .star-btn { background:none;border:none;font-size:30px;color:var(--orange);cursor:pointer;padding:0; }
      `}</style>
    </Sheet>
  )
}
