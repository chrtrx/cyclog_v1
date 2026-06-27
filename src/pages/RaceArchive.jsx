import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import {
  getRaces, addRace, getBikes,
  getPackItems, addPackItem, updatePackItem, deletePackItem, resetPackList,
} from '../lib/data'
import { Page, AddButton, Sheet, Field, BtnGreen, BtnDelete, Empty } from '../components/ui'

const PACK_CATS = ['Rennen', 'Sicherheit', 'Kleidung', 'Verpflegung', 'Elektronik', 'Technik', 'Sonstiges']

const CAT_ICONS = {
  Rennen: '🏁', Sicherheit: '🛡️', Kleidung: '👕', Verpflegung: '🍌',
  Elektronik: '📱', Technik: '🔧', Sonstiges: '📦',
}

const PACK_TEMPLATES = {
  Rennrad: [
    { name: 'Helm', category: 'Sicherheit', critical: true },
    { name: 'Schuhe', category: 'Kleidung', critical: true },
    { name: 'Trikot', category: 'Kleidung', critical: true },
    { name: 'Trägerhose', category: 'Kleidung', critical: true },
    { name: 'Flaschen', category: 'Verpflegung', critical: true },
    { name: 'Gels / Riegel', category: 'Verpflegung', critical: true },
    { name: 'Fahrradcomputer', category: 'Elektronik', critical: false },
    { name: 'Herzfrequenzgurt', category: 'Elektronik', critical: false },
    { name: 'Ersatzschlauch', category: 'Technik', critical: true },
    { name: 'CO₂-Patronen', category: 'Technik', critical: true },
    { name: 'Multitool', category: 'Technik', critical: true },
    { name: 'Startnummer', category: 'Rennen', critical: true },
    { name: 'Zeitmessungsband', category: 'Rennen', critical: true },
    { name: 'Sonnencreme', category: 'Sonstiges', critical: false },
  ],
  Gravel: [
    { name: 'Helm', category: 'Sicherheit', critical: true },
    { name: 'Schuhe', category: 'Kleidung', critical: true },
    { name: 'Trikot', category: 'Kleidung', critical: true },
    { name: 'Regenjacke', category: 'Kleidung', critical: false },
    { name: 'Flaschen', category: 'Verpflegung', critical: true },
    { name: 'Verpflegung', category: 'Verpflegung', critical: true },
    { name: 'Fahrradcomputer', category: 'Elektronik', critical: false },
    { name: 'Powerbank', category: 'Elektronik', critical: false },
    { name: 'Ersatzschlauch', category: 'Technik', critical: true },
    { name: 'Reifenflickzeug', category: 'Technik', critical: true },
    { name: 'CO₂-Patronen / Pumpe', category: 'Technik', critical: true },
    { name: 'Multitool', category: 'Technik', critical: true },
    { name: 'Startnummer', category: 'Rennen', critical: true },
  ],
  MTB: [
    { name: 'Helm', category: 'Sicherheit', critical: true },
    { name: 'Knieprotektoren', category: 'Sicherheit', critical: false },
    { name: 'Schuhe', category: 'Kleidung', critical: true },
    { name: 'Trikot', category: 'Kleidung', critical: true },
    { name: 'Flaschen / Trinkrucksack', category: 'Verpflegung', critical: true },
    { name: 'Gels / Riegel', category: 'Verpflegung', critical: true },
    { name: 'Fahrradcomputer', category: 'Elektronik', critical: false },
    { name: 'Schlauch / Flickzeug', category: 'Technik', critical: true },
    { name: 'Pumpe', category: 'Technik', critical: true },
    { name: 'Multitool', category: 'Technik', critical: true },
    { name: 'Tubeless-Milch (Nachfüllung)', category: 'Technik', critical: false },
    { name: 'Startnummer', category: 'Rennen', critical: true },
  ],
}

export default function RaceArchive() {
  const { user } = useAuth()
  const [tab, setTab] = useState('races')
  const [races, setRaces] = useState([])
  const [bikes, setBikes] = useState([])
  const [packItems, setPackItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addItemSheet, setAddItemSheet] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [templateSheet, setTemplateSheet] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [r, b, p] = await Promise.all([
      getRaces(user.id), getBikes(user.id), getPackItems(user.id),
    ])
    setRaces(r); setBikes(b); setPackItems(p)
    setLoading(false)
  }

  async function handleCheck(item) {
    await updatePackItem(item.id, { checked: !item.checked })
    setPackItems(ps => ps.map(p => p.id === item.id ? { ...p, checked: !p.checked } : p))
  }

  async function handleReset() {
    setResetting(true)
    await resetPackList(user.id)
    setPackItems(ps => ps.map(p => ({ ...p, checked: false })))
    setResetting(false)
  }

  async function loadTemplate(type) {
    const items = PACK_TEMPLATES[type] || []
    for (let i = 0; i < items.length; i++) {
      await addPackItem(user.id, { ...items[i], checked: false, sort_order: i })
    }
    await load()
    setTemplateSheet(false)
  }

  const checked = packItems.filter(p => p.checked).length
  const total = packItems.length
  const critUnchecked = packItems.filter(p => p.critical && !p.checked).length

  const itemsByCat = PACK_CATS.reduce((acc, cat) => {
    const its = packItems.filter(p => p.category === cat)
    if (its.length) acc[cat] = its
    return acc
  }, {})

  return (
    <Page
      title={tab === 'races' ? 'Rennen' : 'Packliste'}
      subtitle={tab === 'races'
        ? `${races.length} Rennen dokumentiert`
        : total > 0 ? `${checked}/${total} gepackt${critUnchecked > 0 ? ` · ${critUnchecked} kritisch offen` : ''}` : 'Rennvorbereitung'}
      action={tab === 'races'
        ? <AddButton onClick={() => setShowAdd(true)} />
        : <AddButton onClick={() => setAddItemSheet(true)} label="Neu" />}
    >
      {/* Tab Bar */}
      <div className="rtabs">
        <button className={`rtab ${tab === 'races' ? 'on' : ''}`} onClick={() => setTab('races')}>
          🏁 Rennen
        </button>
        <button className={`rtab ${tab === 'pack' ? 'on' : ''}`} onClick={() => setTab('pack')}>
          🎒 Packliste
          {tab === 'pack' && total > 0 && critUnchecked > 0 && (
            <span className="rtab-badge">{critUnchecked}</span>
          )}
        </button>
      </div>

      {/* ── RENNEN ── */}
      {tab === 'races' && !loading && (
        races.length === 0 ? (
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
        )
      )}

      {/* ── PACKLISTE ── */}
      {tab === 'pack' && !loading && (
        <>
          {total === 0 ? (
            <div className="pack-empty-state">
              <div className="pack-empty-ico">🎒</div>
              <div className="pack-empty-title">Noch keine Einträge</div>
              <div className="pack-empty-sub">Lade eine Vorlage oder füge Punkte manuell hinzu.</div>
              <button className="pack-tpl-btn" onClick={() => setTemplateSheet(true)}>
                Vorlage laden
              </button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="pack-progress">
                <div className="pp-meta">
                  <span className="pp-lbl">Fortschritt</span>
                  <span className={`pp-val ${checked === total ? 'done' : critUnchecked > 0 ? 'crit' : ''}`}>
                    {checked}/{total}
                  </span>
                </div>
                <div className="pp-track">
                  <div className={`pp-fill ${checked === total ? 'done' : ''}`}
                    style={{ transform: `scaleX(${total > 0 ? checked / total : 0})` }} />
                </div>
                {critUnchecked > 0 && (
                  <div className="pp-crit">{critUnchecked} kritische {critUnchecked === 1 ? 'Position' : 'Positionen'} offen</div>
                )}
              </div>

              {/* Actions */}
              <div className="pack-actions">
                <button className="pa-btn" onClick={() => setTemplateSheet(true)}>+ Vorlage</button>
                <button className="pa-btn reset" onClick={handleReset} disabled={resetting || checked === 0}>
                  {resetting ? '…' : '↺ Reset'}
                </button>
              </div>

              {/* Items by category */}
              {PACK_CATS.map(cat => {
                const its = itemsByCat[cat]
                if (!its) return null
                const catChecked = its.filter(i => i.checked).length
                return (
                  <div key={cat} className="pack-cat">
                    <div className="pc-hdr">
                      <span className="pc-ico">{CAT_ICONS[cat]}</span>
                      <span className="pc-lbl">{cat}</span>
                      <span className="pc-count">{catChecked}/{its.length}</span>
                    </div>
                    {its.map(item => (
                      <div key={item.id} className={`pack-item ${item.checked ? 'checked' : ''}`}>
                        <button className={`pi-cb ${item.checked ? 'on' : ''}`} onClick={() => handleCheck(item)}>
                          {item.checked && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M5 13l4 4L19 7"/></svg>
                          )}
                        </button>
                        <button className="pi-body" onClick={() => setEditItem(item)}>
                          <span className="pi-name">{item.name}</span>
                          {item.critical && !item.checked && <span className="pi-crit">!</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </>
      )}

      {/* Sheets */}
      {showAdd && (
        <AddRaceSheet user={user} bikes={bikes}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }} />
      )}
      {(addItemSheet || editItem) && (
        <PackItemSheet
          user={user} item={editItem}
          onClose={() => { setAddItemSheet(false); setEditItem(null) }}
          onSaved={() => { setAddItemSheet(false); setEditItem(null); load() }} />
      )}
      {templateSheet && (
        <TemplateSheet onClose={() => setTemplateSheet(false)} onSelect={loadTemplate} />
      )}

      <style>{`
        .rtabs { display:flex; border:1px solid var(--line); margin-bottom:16px; overflow:hidden; }
        .rtab { flex:1; padding:12px 8px; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); background:none; border:none; border-right:1px solid var(--line); transition:background .15s,color .15s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .rtab:last-child { border-right:none; }
        .rtab.on { background:rgba(47,123,255,.1); color:var(--acc); }
        .rtab:active { background:var(--panel2); }
        .rtab-badge { background:var(--crit); color:white; border-radius:50%; width:16px; height:16px; font-size:9px; display:flex; align-items:center; justify-content:center; font-weight:900; }

        .race-card { border:1px solid var(--line); padding:14px; margin-bottom:10px; }
        .race-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
        .race-name { font-family:var(--sans); font-size:16px; font-weight:800; color:var(--ink1); letter-spacing:.5px; }
        .race-place { background:rgba(224,168,77,.15); color:var(--warn); font-family:var(--mono); font-weight:900; font-size:12px; padding:3px 10px; border:1px solid rgba(224,168,77,.35); white-space:nowrap; }
        .race-meta { display:flex; gap:12px; font-family:var(--mono); font-size:11px; color:var(--ink3); margin-bottom:8px; }
        .race-stats { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
        .rstat { background:rgba(47,123,255,.08); color:var(--acc); border:1px solid rgba(47,123,255,.25); padding:4px 10px; font-family:var(--mono); font-size:11px; font-weight:700; }
        .race-setup { font-family:var(--mono); font-size:11px; color:var(--ink2); padding-top:8px; border-top:1px solid var(--line); }
        .race-cond { font-family:var(--mono); font-size:11px; color:var(--ink3); margin-top:4px; }

        .pack-empty-state { display:flex; flex-direction:column; align-items:center; padding:40px 20px; text-align:center; }
        .pack-empty-ico { font-size:40px; margin-bottom:12px; }
        .pack-empty-title { font-family:var(--sans); font-size:18px; font-weight:900; color:var(--ink1); letter-spacing:1px; text-transform:uppercase; margin-bottom:6px; }
        .pack-empty-sub { font-family:var(--mono); font-size:12px; color:var(--ink3); margin-bottom:20px; }
        .pack-tpl-btn { background:rgba(47,123,255,.1); border:1px solid rgba(47,123,255,.35); color:var(--acc); font-family:var(--mono); font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:12px 24px; }
        .pack-tpl-btn:active { background:rgba(47,123,255,.2); }

        .pack-progress { border:1px solid var(--line); padding:12px 14px; margin-bottom:10px; }
        .pp-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .pp-lbl { font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); }
        .pp-val { font-family:var(--sans); font-size:18px; font-weight:900; color:var(--ink1); }
        .pp-val.done { color:var(--ok); }
        .pp-val.crit { color:var(--crit); }
        .pp-track { height:6px; background:var(--panel2); border:1px solid var(--line); overflow:hidden; }
        .pp-fill { height:100%; width:100%; background:var(--acc); transform-origin:left center; transition:transform .4s ease-out; }
        .pp-fill.done { background:var(--ok); }
        .pp-crit { font-family:var(--mono); font-size:10.5px; color:var(--crit); font-weight:700; margin-top:7px; }

        .pack-actions { display:flex; gap:8px; margin-bottom:14px; }
        .pa-btn { flex:1; padding:10px 12px; background:var(--panel2); border:1px solid var(--line); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink2); }
        .pa-btn:active { background:var(--panel); }
        .pa-btn.reset { color:var(--ink3); }
        .pa-btn:disabled { opacity:.4; }

        .pack-cat { margin-bottom:14px; }
        .pc-hdr { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .pc-ico { font-size:13px; width:18px; text-align:center; }
        .pc-lbl { flex:1; font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink2); }
        .pc-count { font-family:var(--mono); font-size:10px; font-weight:700; color:var(--ink3); }

        .pack-item { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--line); transition:opacity .15s; }
        .pack-item:last-child { border-bottom:none; }
        .pack-item.checked { opacity:.45; }
        .pi-cb { width:22px; height:22px; border:1.5px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; background:none; transition:background .12s,border-color .12s; }
        .pi-cb.on { background:var(--ok); border-color:var(--ok); }
        .pi-cb svg { width:12px; height:12px; }
        .pi-body { flex:1; display:flex; align-items:center; gap:8px; text-align:left; background:none; border:none; padding:0; cursor:pointer; }
        .pi-name { font-family:var(--sans); font-size:14px; font-weight:700; color:var(--ink1); }
        .pi-crit { font-family:var(--mono); font-size:9px; font-weight:900; background:rgba(224,86,110,.15); color:var(--crit); border:1px solid rgba(224,86,110,.35); padding:1px 5px; letter-spacing:.5px; }
      `}</style>
    </Page>
  )
}

// ─── Vorlage auswählen ────────────────────────────────────
function TemplateSheet({ onClose, onSelect }) {
  return (
    <Sheet title="Vorlage laden" sub="Packliste aus Vorlage befüllen" onClose={onClose}>
      <div className="tpl-warn">Vorhandene Einträge bleiben erhalten. Es werden nur neue Punkte hinzugefügt.</div>
      {Object.keys(PACK_TEMPLATES).map(type => (
        <button key={type} className="tpl-opt" onClick={() => onSelect(type)}>
          <span className="tpl-name">{type}</span>
          <span className="tpl-count">{PACK_TEMPLATES[type].length} Punkte</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      ))}
      <style>{`
        .tpl-warn { font-family:var(--mono); font-size:11px; color:var(--ink3); background:var(--panel2); border:1px solid var(--line); padding:10px 12px; margin-bottom:14px; line-height:1.5; }
        .tpl-opt { display:flex; align-items:center; gap:10px; width:100%; padding:14px; border:1px solid var(--line); margin-bottom:8px; background:var(--panel2); }
        .tpl-opt:active { background:var(--panel); }
        .tpl-name { flex:1; font-family:var(--sans); font-size:15px; font-weight:800; color:var(--ink1); letter-spacing:.5px; text-align:left; }
        .tpl-count { font-family:var(--mono); font-size:11px; color:var(--ink3); font-weight:700; }
      `}</style>
    </Sheet>
  )
}

// ─── Packpunkt hinzufügen / bearbeiten ───────────────────
function PackItemSheet({ user, item, onClose, onSaved }) {
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || 'Sonstiges')
  const [critical, setCritical] = useState(item?.critical || false)
  const [armed, setArmed] = useState(false)

  async function save() {
    if (!name.trim()) return
    if (item?.id) {
      await updatePackItem(item.id, { name: name.trim(), category, critical })
    } else {
      await addPackItem(user.id, { name: name.trim(), category, critical, checked: false, sort_order: 0 })
    }
    onSaved()
  }

  async function remove() {
    if (item?.id) await deletePackItem(item.id)
    onSaved()
  }

  return (
    <Sheet title={item?.id ? 'Punkt bearbeiten' : 'Punkt hinzufügen'} sub="Packliste" onClose={onClose}>
      <Field label="Name *" value={name} onChange={setName} placeholder="z.B. Helm" />
      <div className="pi-field">
        <label className="pi-lbl">Kategorie</label>
        <select className="pi-sel" value={category} onChange={e => setCategory(e.target.value)}>
          {PACK_CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
        </select>
      </div>
      <button className={`pi-crit-toggle ${critical ? 'on' : ''}`} onClick={() => setCritical(c => !c)}>
        <span className={`pi-crit-cb ${critical ? 'on' : ''}`}>
          {critical && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M5 13l4 4L19 7"/></svg>}
        </span>
        Als kritisch markieren
        <span className="pi-crit-hint">Kritische Punkte werden hervorgehoben</span>
      </button>
      <BtnGreen onClick={save}>Speichern</BtnGreen>
      {item?.id && (
        <BtnDelete armed={armed} onClick={() => armed ? remove() : (setArmed(true), setTimeout(() => setArmed(false), 3000))} />
      )}
      <style>{`
        .pi-field { margin-bottom:14px; }
        .pi-lbl { display:block; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); margin-bottom:6px; }
        .pi-sel { width:100%; background:var(--panel2); border:1px solid var(--line); padding:12px 14px; font-family:var(--mono); font-size:13px; font-weight:700; color:var(--ink1); outline:none; }
        .pi-crit-toggle { display:flex; align-items:center; gap:10px; width:100%; padding:13px 14px; background:var(--panel2); border:1px solid var(--line); margin-bottom:14px; text-align:left; }
        .pi-crit-toggle.on { background:rgba(224,86,110,.06); border-color:rgba(224,86,110,.3); }
        .pi-crit-toggle:active { background:var(--panel); }
        .pi-crit-cb { width:22px; height:22px; border:1.5px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; background:none; }
        .pi-crit-cb.on { background:var(--crit); border-color:var(--crit); }
        .pi-crit-cb svg { width:12px; height:12px; }
        .pi-crit-toggle span:not(.pi-crit-cb) { font-family:var(--mono); font-size:13px; font-weight:700; color:var(--ink1); flex:1; }
        .pi-crit-hint { font-size:10px; color:var(--ink3); font-weight:400; display:block; margin-top:1px; }
      `}</style>
    </Sheet>
  )
}

// ─── Rennen hinzufügen ────────────────────────────────────
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
    <Sheet title="Neues Rennen" sub="Setup und Ergebnis festhalten" onClose={onClose}>
      <Field label="Veranstaltung" value={f.event_name} onChange={set('event_name')} placeholder="z.B. Arber Radmarathon" />
      <Field label="Datum" type="date" value={f.race_date} onChange={set('race_date')} />
      <div className="ar-field">
        <label className="ar-lbl">Fahrrad</label>
        <select className="ar-sel" value={f.bike_id} onChange={e => set('bike_id')(e.target.value)}>
          <option value="">— kein —</option>
          {bikes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <Field label="Platzierung" value={f.placement} onChange={set('placement')} placeholder="z.B. P5" />
      <div className="ar-g2">
        <Field label="Distanz (km)" type="number" value={f.distance_km} onChange={set('distance_km')} />
        <Field label="Höhenmeter" type="number" value={f.elevation_m} onChange={set('elevation_m')} />
        <Field label="Ø Leistung (W)" type="number" value={f.avg_power} onChange={set('avg_power')} />
        <Field label="Ø Speed (km/h)" type="number" value={f.avg_speed} onChange={set('avg_speed')} />
      </div>
      <Field label="Reifen" value={f.tyres} onChange={set('tyres')} placeholder="z.B. GP5000 28mm" />
      <div className="ar-g2">
        <Field label="Druck v. (bar)" type="number" value={f.pressure_front} onChange={set('pressure_front')} />
        <Field label="Druck h. (bar)" type="number" value={f.pressure_rear} onChange={set('pressure_rear')} />
      </div>
      <Field label="Übersetzung" value={f.gearing} onChange={set('gearing')} placeholder="z.B. 52/36, 11-30" />
      <Field label="Bedingungen" value={f.conditions} onChange={set('conditions')} placeholder="Wetter, Untergrund" />
      <BtnGreen onClick={save}>Rennen speichern</BtnGreen>
      <style>{`
        .ar-field { margin-bottom:14px; }
        .ar-lbl { display:block; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); margin-bottom:6px; }
        .ar-sel { width:100%; background:var(--panel2); border:1px solid var(--line); padding:12px 14px; font-family:var(--mono); font-size:13px; font-weight:700; color:var(--ink1); outline:none; }
        .ar-g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      `}</style>
    </Sheet>
  )
}
