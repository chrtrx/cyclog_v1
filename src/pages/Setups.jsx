import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getSetups, addSetup, deleteSetup, getBikes } from '../lib/data'
import { Page, AddButton, Sheet, Field, BtnGreen, BtnDelete, Empty } from '../components/ui'

export default function Setups() {
  const { user } = useAuth()
  const [setups, setSetups] = useState([])
  const [bikes, setBikes] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [compare, setCompare] = useState([]) // ausgewählte IDs zum Vergleich
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const [s, b] = await Promise.all([getSetups(user.id), getBikes(user.id)])
      setSetups(s); setBikes(b)
    } catch (e) {
      console.error('Setups laden fehlgeschlagen', e)
    } finally {
      setLoading(false)
    }
  }

  function toggleCompare(id) {
    setCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < 2 ? [...prev, id] : [prev[1], id]
    )
  }

  const compareSetups = compare.map(id => setups.find(s => s.id === id)).filter(Boolean)

  return (
    <Page
      title="Setups"
      subtitle="Komplette Bike-Konfigurationen speichern & vergleichen"
      action={<AddButton onClick={() => setShowAdd(true)} />}
    >
      {loading ? null : setups.length === 0 ? (
        <Empty emoji="🔧" title="Noch keine Setups"
          sub="Speichere komplette Konfigurationen wie 'Race Setup Frühjahr 2025'." />
      ) : (
        <>
          {compare.length === 2 && (
            <CompareView setups={compareSetups} onClose={() => setCompare([])} />
          )}
          <div className="hint-row">
            {compare.length > 0
              ? `${compare.length}/2 zum Vergleich gewählt`
              : 'Tippe zwei Setups an, um sie zu vergleichen'}
          </div>
          {setups.map(s => {
            const bike = bikes.find(b => b.id === s.bike_id)
            const sel = compare.includes(s.id)
            return (
              <div key={s.id} className={`setup-card ${sel ? 'sel' : ''}`} onClick={() => toggleCompare(s.id)}>
                <div className="setup-top">
                  <div className="setup-name">{s.name}</div>
                  {sel && <div className="setup-check">✓</div>}
                </div>
                {bike && <div className="setup-bike">🚲 {bike.name}</div>}
                {s.description && <div className="setup-desc">{s.description}</div>}
                <div className="setup-stats">
                  {s.total_weight_g && <span className="stat-chip">⚖️ {(s.total_weight_g/1000).toFixed(2)} kg</span>}
                  {s.tyre_pressure_front && <span className="stat-chip">🔵 {s.tyre_pressure_front}/{s.tyre_pressure_rear} bar</span>}
                </div>
              </div>
            )
          })}
        </>
      )}

      {showAdd && <AddSetupSheet user={user} bikes={bikes} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}

      <style>{`
        .hint-row { font-size: 12px; color: var(--t3); font-weight: 700; text-align: center; margin-bottom: 12px; }
        .setup-card { background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 16px; margin-bottom: 10px; cursor: pointer; transition: all 0.12s; }
        .setup-card:active { transform: scale(0.98); }
        .setup-card.sel { border-color: var(--green); box-shadow: 0 4px 0 var(--green); }
        .setup-top { display: flex; align-items: center; justify-content: space-between; }
        .setup-name { font-family: 'Nunito', sans-serif; font-size: 17px; font-weight: 900; color: var(--t1); }
        .setup-check { width: 24px; height: 24px; background: var(--green); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; }
        .setup-bike { font-size: 13px; color: var(--t2); font-weight: 700; margin-top: 4px; }
        .setup-desc { font-size: 13px; color: var(--t3); font-weight: 600; margin-top: 4px; }
        .setup-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .stat-chip { background: var(--bg); border-radius: 50px; padding: 4px 10px; font-size: 12px; font-weight: 800; color: var(--t2); font-family: 'Nunito', sans-serif; }
      `}</style>
    </Page>
  )
}

function CompareView({ setups, onClose }) {
  const [a, b] = setups
  const rows = [
    { label: 'Gewicht', a: a.total_weight_g ? `${(a.total_weight_g/1000).toFixed(2)} kg` : '—', b: b.total_weight_g ? `${(b.total_weight_g/1000).toFixed(2)} kg` : '—' },
    { label: 'Druck vorne', a: a.tyre_pressure_front ? `${a.tyre_pressure_front} bar` : '—', b: b.tyre_pressure_front ? `${b.tyre_pressure_front} bar` : '—' },
    { label: 'Druck hinten', a: a.tyre_pressure_rear ? `${a.tyre_pressure_rear} bar` : '—', b: b.tyre_pressure_rear ? `${b.tyre_pressure_rear} bar` : '—' },
    { label: 'Sattelhöhe', a: a.fit_saddle_height ? `${a.fit_saddle_height} mm` : '—', b: b.fit_saddle_height ? `${b.fit_saddle_height} mm` : '—' },
    { label: 'Vorbau', a: a.fit_stem_length ? `${a.fit_stem_length} mm` : '—', b: b.fit_stem_length ? `${b.fit_stem_length} mm` : '—' },
  ]
  return (
    <div className="compare">
      <div className="compare-hdr">
        <div className="compare-ttl">Vergleich</div>
        <button className="compare-close" onClick={onClose}>Schließen</button>
      </div>
      <div className="compare-names">
        <div className="cn cn-a">{a.name}</div>
        <div className="cn cn-b">{b.name}</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="compare-row">
          <div className="cr-val">{r.a}</div>
          <div className="cr-lbl">{r.label}</div>
          <div className="cr-val">{r.b}</div>
        </div>
      ))}
      <style>{`
        .compare { background: var(--white); border-radius: var(--r-xl); border: 2px solid var(--green); box-shadow: 0 4px 0 var(--green); padding: 16px; margin-bottom: 16px; }
        .compare-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .compare-ttl { font-family: 'Nunito', sans-serif; font-size: 17px; font-weight: 900; }
        .compare-close { background: var(--bg); border: 2px solid var(--border); border-radius: 10px; padding: 6px 12px; font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 800; color: var(--t2); }
        .compare-names { display: flex; margin-bottom: 8px; gap: 8px; }
        .cn { flex: 1; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 900; text-align: center; padding: 6px; border-radius: 8px; }
        .cn-a { background: var(--blue-l); color: var(--blue-d); }
        .cn-b { background: var(--orange-l); color: var(--orange-d); }
        .compare-row { display: flex; align-items: center; padding: 8px 0; border-top: 2px solid var(--bg); }
        .cr-val { flex: 1; text-align: center; font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 800; color: var(--t1); }
        .cr-lbl { flex: 1.2; text-align: center; font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 0.3px; }
      `}</style>
    </div>
  )
}

function AddSetupSheet({ user, bikes, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [bikeId, setBikeId] = useState(bikes[0]?.id || '')
  const [desc, setDesc] = useState('')
  const [weight, setWeight] = useState('')
  const [pf, setPf] = useState('')
  const [pr, setPr] = useState('')
  const [saddle, setSaddle] = useState('')

  async function save() {
    if (!name) return
    await addSetup(user.id, {
      name, bike_id: bikeId || null, description: desc,
      total_weight_g: weight ? Math.round(Number(weight) * 1000) : null,
      tyre_pressure_front: pf ? Number(pf) : null,
      tyre_pressure_rear: pr ? Number(pr) : null,
      fit_saddle_height: saddle ? Number(saddle) : null,
    })
    onSaved()
  }

  return (
    <Sheet title="Neues Setup" sub="Friere die aktuelle Konfiguration ein." onClose={onClose}>
      <Field label="Name" value={name} onChange={setName} placeholder="z.B. Race Setup Frühjahr 2025" />
      <div className="field">
        <label className="field-lbl-x">Fahrrad</label>
        <select className="select-x" value={bikeId} onChange={(e) => setBikeId(e.target.value)}>
          <option value="">— kein —</option>
          {bikes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <Field label="Beschreibung" value={desc} onChange={setDesc} placeholder="Notizen zum Setup" />
      <Field label="Gewicht (kg)" type="number" value={weight} onChange={setWeight} placeholder="7.80" />
      <Field label="Reifendruck vorne (bar)" type="number" value={pf} onChange={setPf} placeholder="5.5" />
      <Field label="Reifendruck hinten (bar)" type="number" value={pr} onChange={setPr} placeholder="6.0" />
      <Field label="Sattelhöhe (mm)" type="number" value={saddle} onChange={setSaddle} placeholder="740" />
      <BtnGreen onClick={save}>Setup speichern</BtnGreen>
      <style>{`
        .field-lbl-x { display: block; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800; color: var(--t2); margin-bottom: 5px; }
        .select-x { width: 100%; background: var(--bg); border: 2px solid var(--border); border-radius: 12px; padding: 12px 14px; font-size: 15px; font-weight: 600; color: var(--t1); outline: none; font-family: 'Nunito Sans', sans-serif; }
      `}</style>
    </Sheet>
  )
}
