import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  getBike, updateBike, getComponents, upsertComponent, deleteComponent,
  getServiceLogs, COMPONENT_CATEGORIES,
} from '../lib/data'
import { Page, Sheet, Field, BtnGreen, BtnDelete } from '../components/ui'
import { fmtDate } from '../lib/helpers'

export default function BikeDetail() {
  const { bikeId } = useParams()
  const { user } = useAuth()
  const [bike, setBike] = useState(null)
  const [components, setComponents] = useState([])
  const [logs, setLogs] = useState([])
  const [editCat, setEditCat] = useState(null)   // welche Kategorie bearbeitet wird
  const [editGeo, setEditGeo] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [bikeId])
  async function load() {
    setLoading(true)
    const [b, c, l] = await Promise.all([getBike(bikeId), getComponents(bikeId), getServiceLogs(bikeId)])
    setBike(b); setComponents(c); setLogs(l); setLoading(false)
  }

  if (loading || !bike) return <Page title="Lädt…" back="/"><div /></Page>

  // Komponenten nach Gruppe ordnen
  const groups = [...new Set(COMPONENT_CATEGORIES.map(c => c.group))]
  const compFor = (catId) => components.find(c => c.category === catId)

  const geoFields = [
    { k:'geo_stack', l:'Stack' }, { k:'geo_reach', l:'Reach' },
    { k:'geo_head_angle', l:'Lenkwinkel' }, { k:'geo_seat_angle', l:'Sitzwinkel' },
    { k:'geo_head_tube', l:'Steuerrohr' }, { k:'geo_top_tube', l:'Oberrohr' },
    { k:'geo_seat_tube', l:'Sitzrohr' }, { k:'geo_chainstay', l:'Kettenstrebe' },
    { k:'geo_wheelbase', l:'Radstand' }, { k:'geo_bb_drop', l:'Tretlagerabsenkung' },
    { k:'geo_standover', l:'Standover' },
  ]
  const hasGeo = geoFields.some(g => bike[g.k] != null)

  return (
    <Page title={bike.name} subtitle={`${bike.type}${bike.model_year ? ' · ' + bike.model_year : ''}`} back="/">
      {/* Bike Stammdaten */}
      <div className="id-card">
        <div className="id-km">{(bike.km || 0).toLocaleString('de')} <small>km</small></div>
        <div className="id-meta">
          {bike.manufacturer && <span>{bike.manufacturer}</span>}
          {bike.model && <span>{bike.model}</span>}
          {bike.frame_size && <span>Größe {bike.frame_size}</span>}
        </div>
      </div>

      {/* GEOMETRIE */}
      <div className="sect">
        <div className="sect-hdr">
          <div className="sect-title">📐 Geometrie</div>
          <button className="sect-edit" onClick={() => setEditGeo(true)}>{hasGeo ? 'Bearbeiten' : '+ Hinzufügen'}</button>
        </div>
        {hasGeo ? (
          <div className="geo-grid">
            {geoFields.filter(g => bike[g.k] != null).map(g => (
              <div key={g.k} className="geo-cell">
                <div className="geo-num">{bike[g.k]}</div>
                <div className="geo-lbl">{g.l}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sect-empty">Noch keine Geometriedaten</div>
        )}
      </div>

      {/* KOMPONENTEN nach Gruppe */}
      {groups.map(group => {
        const cats = COMPONENT_CATEGORIES.filter(c => c.group === group)
        return (
          <div className="sect" key={group}>
            <div className="sect-hdr"><div className="sect-title">{group}</div></div>
            <div className="comp-list">
              {cats.map(cat => {
                const comp = compFor(cat.id)
                const preview = comp
                  ? [comp.manufacturer, comp.model].filter(Boolean).join(' ') || 'Eingetragen'
                  : '—'
                return (
                  <button className="comp-row" key={cat.id} onClick={() => setEditCat(cat)}>
                    <div className="comp-ico">{cat.icon}</div>
                    <div className="comp-body">
                      <div className="comp-label">{cat.label}</div>
                      <div className="comp-preview">{preview}</div>
                    </div>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* WARTUNGSHISTORIE */}
      {logs.length > 0 && (
        <div className="sect">
          <div className="sect-hdr"><div className="sect-title">🔧 Wartungshistorie</div></div>
          <div className="log-list">
            {logs.slice(0, 8).map(l => (
              <div key={l.id} className="log-row">
                <div className="log-ico">{l.icon}</div>
                <div className="log-body">
                  <div className="log-title">{l.title}</div>
                  <div className="log-date">{fmtDate(l.service_date)}</div>
                </div>
                <div className="log-km">{l.km_at_service.toLocaleString('de')} km</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editCat && (
        <ComponentSheet
          user={user} bikeId={bikeId} cat={editCat} existing={compFor(editCat.id)}
          onClose={() => setEditCat(null)} onSaved={() => { setEditCat(null); load() }}
        />
      )}
      {editGeo && (
        <GeoSheet bike={bike} geoFields={geoFields} onClose={() => setEditGeo(false)} onSaved={() => { setEditGeo(false); load() }} />
      )}

      <style>{`
        .id-card { background: var(--white); border-radius: var(--r-xl); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 20px; margin-bottom: 16px; }
        .id-km { font-family: 'Nunito', sans-serif; font-size: 40px; font-weight: 900; color: var(--t1); letter-spacing: -2px; }
        .id-km small { font-size: 15px; color: var(--t2); }
        .id-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--t2); font-weight: 700; }
        .sect { margin-bottom: 20px; }
        .sect-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .sect-title { font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 900; color: var(--t1); }
        .sect-edit { background: var(--blue-l); color: var(--blue-d); border: none; border-radius: 50px; padding: 6px 14px; font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 800; }
        .sect-empty { background: var(--white); border-radius: var(--r-lg); border: 2px dashed var(--border); padding: 20px; text-align: center; color: var(--t3); font-size: 13px; font-weight: 700; }
        .geo-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 14px; }
        .geo-cell { background: var(--bg); border-radius: 10px; padding: 10px 8px; text-align: center; }
        .geo-num { font-family: 'Nunito', sans-serif; font-size: 17px; font-weight: 900; color: var(--t1); }
        .geo-lbl { font-size: 9px; color: var(--t3); font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; margin-top: 2px; }
        .comp-list { background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); overflow: hidden; }
        .comp-row { display: flex; align-items: center; gap: 12px; padding: 13px 14px; width: 100%; background: none; border: none; cursor: pointer; transition: background 0.1s; }
        .comp-row:active { background: var(--bg); }
        .comp-row:not(:last-child) { border-bottom: 2px solid var(--border); }
        .comp-ico { width: 34px; height: 34px; border-radius: 10px; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .comp-body { flex: 1; min-width: 0; text-align: left; }
        .comp-label { font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 800; color: var(--t1); }
        .comp-preview { font-size: 12px; color: var(--t3); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .log-list { background: var(--white); border-radius: var(--r-lg); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); overflow: hidden; }
        .log-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
        .log-row:not(:last-child) { border-bottom: 2px solid var(--border); }
        .log-ico { width: 32px; height: 32px; border-radius: 8px; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .log-body { flex: 1; }
        .log-title { font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; color: var(--t1); }
        .log-date { font-size: 11px; color: var(--t3); font-weight: 600; }
        .log-km { font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800; color: var(--t2); }
      `}</style>
    </Page>
  )
}

// ─── Komponenten-Edit-Sheet ────────────────────────────────
function ComponentSheet({ user, bikeId, cat, existing, onClose, onSaved }) {
  const [manufacturer, setManufacturer] = useState(existing?.manufacturer || '')
  const [model, setModel] = useState(existing?.model || '')
  const [weight, setWeight] = useState(existing?.weight_g || '')
  const [specs, setSpecs] = useState(existing?.specs || {})
  const [notes, setNotes] = useState(existing?.notes || '')
  const [armed, setArmed] = useState(false)
  const setSpec = (k) => (v) => setSpecs(p => ({ ...p, [k]: v }))

  async function save() {
    await upsertComponent(user.id, {
      ...(existing ? { id: existing.id } : {}),
      bike_id: bikeId, category: cat.id, name: cat.label,
      manufacturer: manufacturer || null, model: model || null,
      weight_g: weight ? Number(weight) : null,
      specs, notes: notes || '',
    })
    onSaved()
  }
  async function remove() {
    if (existing) await deleteComponent(existing.id)
    onSaved()
  }

  return (
    <Sheet title={cat.label} sub={cat.group} onClose={onClose}>
      <Field label="Hersteller" value={manufacturer} onChange={setManufacturer} placeholder="z.B. Shimano" />
      <Field label="Modell" value={model} onChange={setModel} placeholder="z.B. Dura-Ace" />
      {cat.fields.map(f => (
        <Field key={f.k} label={f.l} value={specs[f.k]} onChange={setSpec(f.k)} />
      ))}
      <Field label="Gewicht (g)" type="number" value={weight} onChange={setWeight} placeholder="optional" />
      <Field label="Notizen" value={notes} onChange={setNotes} />
      <BtnGreen onClick={save}>Speichern</BtnGreen>
      {existing && (
        <BtnDelete armed={armed} onClick={() => armed ? remove() : (setArmed(true), setTimeout(() => setArmed(false), 3000))} />
      )}
    </Sheet>
  )
}

// ─── Geometrie-Edit-Sheet ──────────────────────────────────
function GeoSheet({ bike, geoFields, onClose, onSaved }) {
  const [vals, setVals] = useState(() => {
    const o = {}; geoFields.forEach(g => o[g.k] = bike[g.k] ?? ''); return o
  })
  const set = (k) => (v) => setVals(p => ({ ...p, [k]: v }))

  async function save() {
    const updates = {}
    geoFields.forEach(g => { updates[g.k] = vals[g.k] ? Number(vals[g.k]) : null })
    await updateBike(bike.id, updates)
    onSaved()
  }

  return (
    <Sheet title="Geometrie" sub="Rahmendaten eintragen (mm bzw. °)." onClose={onClose}>
      <div className="geo-form-grid">
        {geoFields.map(g => (
          <Field key={g.k} label={g.l} type="number" value={vals[g.k]} onChange={set(g.k)} />
        ))}
      </div>
      <BtnGreen onClick={save}>Speichern</BtnGreen>
      <style>{`.geo-form-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }`}</style>
    </Sheet>
  )
}
