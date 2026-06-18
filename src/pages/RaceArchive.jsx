import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getRaces, addRace, deleteRace, getBikes } from '../lib/data'
import { Page, AddButton, Sheet, Field, BtnGreen, Empty } from '../components/ui'

export default function RaceArchive() {
  const { user } = useAuth()
  const [races, setRaces] = useState([])
  const [bikes, setBikes] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [r, b] = await Promise.all([getRaces(user.id), getBikes(user.id)])
    setRaces(r); setBikes(b); setLoading(false)
  }

  return (
    <Page title="Race-Archiv" subtitle="Rennen, Setup & Ergebnis dokumentieren"
      action={<AddButton onClick={() => setShowAdd(true)} />}>
      {loading ? null : races.length === 0 ? (
        <Empty emoji="🏁" title="Noch keine Rennen"
          sub="Speichere Setup und Ergebnis jedes Rennens, um zu sehen was am besten funktioniert." />
      ) : (
        races.map(r => {
          const bike = bikes.find(b => b.id === r.bike_id)
          return (
            <div key={r.id} className="race-card">
              <div className="race-top">
                <div className="race-name">{r.event_name}</div>
                {r.placement && <div className="race-place">{r.placement}</div>}
              </div>
              <div className="race-meta">
                {r.race_date && <span>📅 {new Date(r.race_date).toLocaleDateString('de-DE')}</span>}
                {bike && <span>🚲 {bike.name}</span>}
              </div>
              <div className="race-stats">
                {r.distance_km && <span className="rstat">{r.distance_km} km</span>}
                {r.elevation_m && <span className="rstat">{r.elevation_m} hm</span>}
                {r.avg_power && <span className="rstat">{r.avg_power} W</span>}
                {r.avg_speed && <span className="rstat">{r.avg_speed} km/h</span>}
              </div>
              {(r.tyres || r.pressure_front) && (
                <div className="race-setup">
                  {r.tyres && <span>🔵 {r.tyres}</span>}
                  {r.pressure_front && <span> · {r.pressure_front}/{r.pressure_rear} bar</span>}
                  {r.gearing && <span> · ⚙️ {r.gearing}</span>}
                </div>
              )}
              {r.conditions && <div className="race-cond">🌦️ {r.conditions}</div>}
            </div>
          )
        })
      )}
      {showAdd && <AddRaceSheet user={user} bikes={bikes} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}

      <style>{`
        .race-card { background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 16px; margin-bottom: 10px; }
        .race-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .race-name { font-family: 'Nunito', sans-serif; font-size: 17px; font-weight: 900; color: var(--t1); }
        .race-place { background: var(--yellow-l, #fff9d9); color: #b8860b; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 13px; padding: 4px 10px; border-radius: 50px; white-space: nowrap; }
        .race-meta { display: flex; gap: 12px; font-size: 12px; color: var(--t2); font-weight: 700; margin-top: 5px; }
        .race-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .rstat { background: var(--blue-l); color: var(--blue-d); border-radius: 50px; padding: 4px 11px; font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 800; }
        .race-setup { font-size: 12px; color: var(--t2); font-weight: 600; margin-top: 8px; padding-top: 8px; border-top: 2px solid var(--bg); }
        .race-cond { font-size: 12px; color: var(--t3); font-weight: 600; margin-top: 4px; }
      `}</style>
    </Page>
  )
}

function AddRaceSheet({ user, bikes, onClose, onSaved }) {
  const [f, setF] = useState({
    event_name:'', race_date:'', bike_id:bikes[0]?.id||'', placement:'',
    distance_km:'', elevation_m:'', avg_power:'', avg_speed:'',
    tyres:'', pressure_front:'', pressure_rear:'', gearing:'', conditions:'',
  })
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.event_name) return
    await addRace(user.id, {
      event_name: f.event_name,
      race_date: f.race_date || null,
      bike_id: f.bike_id || null,
      placement: f.placement || null,
      distance_km: f.distance_km ? Number(f.distance_km) : null,
      elevation_m: f.elevation_m ? Number(f.elevation_m) : null,
      avg_power: f.avg_power ? Number(f.avg_power) : null,
      avg_speed: f.avg_speed ? Number(f.avg_speed) : null,
      tyres: f.tyres || null,
      pressure_front: f.pressure_front ? Number(f.pressure_front) : null,
      pressure_rear: f.pressure_rear ? Number(f.pressure_rear) : null,
      gearing: f.gearing || null,
      conditions: f.conditions || null,
    })
    onSaved()
  }

  return (
    <Sheet title="Neues Rennen" sub="Setup und Ergebnis festhalten." onClose={onClose}>
      <Field label="Veranstaltung" value={f.event_name} onChange={set('event_name')} placeholder="z.B. Arber Radmarathon" />
      <Field label="Datum" type="date" value={f.race_date} onChange={set('race_date')} />
      <div className="field">
        <label className="lblx">Fahrrad</label>
        <select className="selx" value={f.bike_id} onChange={(e) => set('bike_id')(e.target.value)}>
          <option value="">— kein —</option>
          {bikes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <Field label="Platzierung" value={f.placement} onChange={set('placement')} placeholder="z.B. P5" />
      <div className="grid2">
        <Field label="Distanz (km)" type="number" value={f.distance_km} onChange={set('distance_km')} />
        <Field label="Höhenmeter" type="number" value={f.elevation_m} onChange={set('elevation_m')} />
        <Field label="Ø Leistung (W)" type="number" value={f.avg_power} onChange={set('avg_power')} />
        <Field label="Ø Speed (km/h)" type="number" value={f.avg_speed} onChange={set('avg_speed')} />
      </div>
      <Field label="Reifen" value={f.tyres} onChange={set('tyres')} placeholder="z.B. GP5000 28mm" />
      <div className="grid2">
        <Field label="Druck v. (bar)" type="number" value={f.pressure_front} onChange={set('pressure_front')} />
        <Field label="Druck h. (bar)" type="number" value={f.pressure_rear} onChange={set('pressure_rear')} />
      </div>
      <Field label="Übersetzung" value={f.gearing} onChange={set('gearing')} placeholder="z.B. 52/36, 11-30" />
      <Field label="Bedingungen" value={f.conditions} onChange={set('conditions')} placeholder="Wetter, Untergrund" />
      <BtnGreen onClick={save}>Rennen speichern</BtnGreen>
      <style>{`
        .lblx { display:block;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:var(--t2);margin-bottom:5px; }
        .selx { width:100%;background:var(--bg);border:2px solid var(--border);border-radius:12px;padding:12px 14px;font-size:15px;font-weight:600;color:var(--t1);outline:none;font-family:'Nunito Sans',sans-serif; }
        .grid2 { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
      `}</style>
    </Sheet>
  )
}
