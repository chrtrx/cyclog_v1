import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  getRaces, addRace, getBikes,
  getRaceCandidates, dismissRaceCandidate,
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
  const [packLoading, setPackLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [candidatePrefill, setCandidatePrefill] = useState(null)
  const [addItemSheet, setAddItemSheet] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [templateSheet, setTemplateSheet] = useState(false)
  const [tplLoading, setTplLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [searchParams] = useSearchParams()

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 3000) }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [r, b, c] = await Promise.all([getRaces(user.id), getBikes(user.id), getRaceCandidates(user.id).catch(() => [])])
      setRaces(r); setBikes(b); setCandidates(c)
      // Direkteinstieg aus dem "Wettkampf erkannt"-Fenster (/races?candidate=…)
      const wanted = searchParams.get('candidate')
      const cand = wanted && c.find(x => x.id === wanted)
      if (cand) { setCandidatePrefill(cand); setShowAdd(true) }
    } catch {}
    setLoading(false)
    // pack_items loaded separately — table may not exist yet
    loadPack()
  }

  async function loadPack() {
    setPackLoading(true)
    try {
      const p = await getPackItems(user.id)
      setPackItems(p)
    } catch (e) {
      setPackItems([])
      if (e?.message?.includes('does not exist') || e?.code === '42P01') {
        showToast('⚠ Packliste: Migration 004 im Supabase Dashboard ausführen')
      }
    }
    setPackLoading(false)
  }

  // Optimistisch: UI sofort flippen, DB im Hintergrund
  async function handleCheck(item) {
    const next = !item.checked
    setPackItems(ps => ps.map(p => p.id === item.id ? { ...p, checked: next } : p))
    try { await updatePackItem(item.id, { checked: next }) }
    catch { setPackItems(ps => ps.map(p => p.id === item.id ? { ...p, checked: !next } : p)) }
  }

  async function handleReset() {
    setResetting(true)
    const prev = packItems
    setPackItems(ps => ps.map(p => ({ ...p, checked: false })))
    try { await resetPackList(user.id) }
    catch { setPackItems(prev) }
    setResetting(false)
  }

  async function loadTemplate(type) {
    setTplLoading(true)
    try {
      const items = PACK_TEMPLATES[type] || []
      await Promise.all(
        items.map((item, i) => addPackItem(user.id, { ...item, checked: false, sort_order: i }))
      )
      await loadPack()
      showToast(`✓ Vorlage "${type}" geladen`)
    } catch (e) {
      showToast('⚠ Fehler: ' + (e?.message || 'Vorlage konnte nicht geladen werden'))
    }
    setTplLoading(false)
    setTemplateSheet(false)
  }

  function useCandidate(c) {
    setCandidatePrefill(c)
    setShowAdd(true)
  }
  async function discardCandidate(c) {
    setCandidates(cs => cs.filter(x => x.id !== c.id))
    try { await dismissRaceCandidate(c.id) } catch {}
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
          {total > 0 && critUnchecked > 0 && (
            <span className="rtab-badge">{critUnchecked}</span>
          )}
        </button>
      </div>

      {/* ── WETTKAMPF ERKANNT ── */}
      {tab === 'races' && candidates.map(c => (
        <div className="race-cand" key={c.id}>
          <div className="race-cand-top">
            <span className="race-cand-tag">🏁 Wettkampf erkannt</span>
          </div>
          <div className="race-cand-name">{c.event_name || 'Aktivität ohne Namen'}</div>
          <div className="race-cand-meta">
            {c.race_date && <span>📅 {new Date(c.race_date).toLocaleDateString('de-DE')}</span>}
            {c.distance_km && <span>{c.distance_km} km</span>}
          </div>
          <div className="race-cand-actions">
            <button className="race-cand-fill" onClick={() => useCandidate(c)}>Renntagebuch ausfüllen</button>
            <button className="race-cand-dismiss" onClick={() => discardCandidate(c)}>Verwerfen</button>
          </div>
        </div>
      ))}

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
                  {r.duration && <span className="rstat">⏱ {r.duration}</span>}
                  {r.distance_km && <span className="rstat">{r.distance_km} km</span>}
                  {r.elevation_m && <span className="rstat">{r.elevation_m} hm</span>}
                  {r.avg_power && <span className="rstat">{r.avg_power} W</span>}
                  {r.avg_speed && <span className="rstat">{r.avg_speed} km/h</span>}
                  {r.feeling && <span className="rstat">{r.feeling}</span>}
                </div>
                {(r.tyres || r.pressure_front) && (
                  <div className="race-setup">
                    {r.tyres && <span>🔵 {r.tyres}</span>}
                    {r.pressure_front && <span> · {r.pressure_front}/{r.pressure_rear} bar</span>}
                    {r.gearing && <span> · ⚙️ {r.gearing}</span>}
                  </div>
                )}
                {r.conditions && <div className="race-cond">🌦️ {r.conditions}</div>}
                {r.learnings && <div className="race-learn">💡 {r.learnings}</div>}
              </div>
            )
          })
        )
      )}

      {/* ── PACKLISTE ── */}
      {tab === 'pack' && (
        packLoading ? null : total === 0 ? (
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
              <button className="pa-btn reset" onClick={handleReset}
                disabled={resetting || checked === 0}>
                {resetting ? '…' : '↺ Reset'}
              </button>
            </div>

            {/* Items per Kategorie */}
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
                        {item.critical && !item.checked && <span className="pi-crit-tag">!</span>}
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )
      )}

      {/* Sheets */}
      {showAdd && (
        <AddRaceSheet user={user} bikes={bikes} prefill={candidatePrefill}
          onClose={() => { setShowAdd(false); setCandidatePrefill(null) }}
          onSaved={async () => {
            if (candidatePrefill) await discardCandidate(candidatePrefill)
            setShowAdd(false); setCandidatePrefill(null); load()
          }} />
      )}
      {(addItemSheet || editItem !== null) && (
        <PackItemSheet
          user={user} item={editItem}
          onClose={() => { setAddItemSheet(false); setEditItem(null) }}
          onSaved={() => { setAddItemSheet(false); setEditItem(null); loadPack() }} />
      )}
      {templateSheet && (
        <TemplateSheet loading={tplLoading} onClose={() => setTemplateSheet(false)} onSelect={loadTemplate} />
      )}
      {toast && <div className="ra-toast">{toast}</div>}

      <style>{`
        .rtabs { display:flex; border:1px solid var(--line); margin-bottom:16px; overflow:hidden; }
        .rtab { flex:1; padding:12px 8px; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); background:none; border:none; border-right:1px solid var(--line); transition:background .15s,color .15s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .rtab:last-child { border-right:none; }
        .rtab.on { background:color-mix(in srgb, var(--acc) 10%, transparent); color:var(--acc); }
        .rtab:active { background:var(--panel2); }
        .rtab-badge { background:var(--crit); color:white; border-radius:50%; width:16px; height:16px; font-size:9px; display:flex; align-items:center; justify-content:center; font-weight:900; flex-shrink:0; }

        .race-cand { border:1px solid color-mix(in srgb, var(--acc) 40%, transparent); background:color-mix(in srgb, var(--acc) 6%, transparent); padding:14px; margin-bottom:12px; }
        .race-cand-top { margin-bottom:6px; }
        .race-cand-tag { font-family:var(--mono); font-size:10.5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--acc); }
        .race-cand-name { font-family:var(--sans); font-size:15px; font-weight:800; color:var(--ink1); letter-spacing:.3px; margin-bottom:4px; }
        .race-cand-meta { display:flex; gap:12px; font-family:var(--mono); font-size:11px; color:var(--ink3); margin-bottom:10px; }
        .race-cand-actions { display:flex; gap:8px; }
        .race-cand-fill { flex:1; padding:11px; background:var(--acc); color: var(--on-acc); font-family:var(--sans); font-size:12px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; }
        .race-cand-dismiss { padding:11px 14px; background:none; border:1px solid var(--line); color:var(--ink3); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }

        .race-card { border:1px solid var(--line); padding:14px; margin-bottom:10px; }
        .race-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
        .race-name { font-family:var(--sans); font-size:16px; font-weight:800; color:var(--ink1); letter-spacing:.5px; }
        .race-place { background:color-mix(in srgb, var(--warn) 15%, transparent); color:var(--warn); font-family:var(--mono); font-weight:900; font-size:12px; padding:3px 10px; border:1px solid color-mix(in srgb, var(--warn) 35%, transparent); white-space:nowrap; }
        .race-meta { display:flex; gap:12px; font-family:var(--mono); font-size:11px; color:var(--ink3); margin-bottom:8px; }
        .race-stats { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
        .rstat { background:color-mix(in srgb, var(--acc) 8%, transparent); color:var(--acc); border:1px solid color-mix(in srgb, var(--acc) 25%, transparent); padding:4px 10px; font-family:var(--mono); font-size:11px; font-weight:700; }
        .race-setup { font-family:var(--mono); font-size:11px; color:var(--ink2); padding-top:8px; border-top:1px solid var(--line); }
        .race-learn { font-family:var(--mono); font-size:11px; color:var(--ink2); margin-top:6px; line-height:1.5; }
        .race-cond { font-family:var(--mono); font-size:11px; color:var(--ink3); margin-top:4px; }

        .pack-empty-state { display:flex; flex-direction:column; align-items:center; padding:40px 20px; text-align:center; }
        .pack-empty-ico { font-size:40px; margin-bottom:12px; }
        .pack-empty-title { font-family:var(--sans); font-size:18px; font-weight:900; color:var(--ink1); letter-spacing:1px; text-transform:uppercase; margin-bottom:6px; }
        .pack-empty-sub { font-family:var(--mono); font-size:12px; color:var(--ink3); margin-bottom:20px; }
        .pack-tpl-btn { background:color-mix(in srgb, var(--acc) 10%, transparent); border:1px solid color-mix(in srgb, var(--acc) 35%, transparent); color:var(--acc); font-family:var(--mono); font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:12px 24px; }
        .pack-tpl-btn:active { background:color-mix(in srgb, var(--acc) 20%, transparent); }

        .pack-progress { border:1px solid var(--line); padding:12px 14px; margin-bottom:10px; }
        .pp-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .pp-lbl { font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); }
        .pp-val { font-family:var(--sans); font-size:18px; font-weight:900; color:var(--ink1); }
        .pp-val.done { color:var(--ok); }
        .pp-val.crit { color:var(--crit); }
        .pp-track { height:6px; background:var(--panel2); border:1px solid var(--line); overflow:hidden; }
        .pp-fill { height:100%; width:100%; background:var(--acc); transform-origin:left center; transition:transform .3s ease-out; }
        .pp-fill.done { background:var(--ok); }
        .pp-crit { font-family:var(--mono); font-size:10.5px; color:var(--crit); font-weight:700; margin-top:7px; }

        .pack-actions { display:flex; gap:8px; margin-bottom:14px; }
        .pa-btn { flex:1; padding:10px 12px; background:var(--panel2); border:1px solid var(--line); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink2); }
        .pa-btn:active { background:var(--panel); }
        .pa-btn.reset { color:var(--ink3); }
        .pa-btn:disabled { opacity:.4; }

        .pack-cat { margin-bottom:14px; }
        .pc-hdr { display:flex; align-items:center; gap:8px; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid var(--line); }
        .pc-ico { font-size:13px; width:18px; text-align:center; }
        .pc-lbl { flex:1; font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink2); }
        .pc-count { font-family:var(--mono); font-size:10px; font-weight:700; color:var(--ink3); }

        .pack-item { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,.04); transition:opacity .15s; }
        .pack-item:last-child { border-bottom:none; }
        .pack-item.checked { opacity:.4; }
        .pi-cb { width:22px; height:22px; border:1.5px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; background:none; transition:background .1s,border-color .1s; }
        .pi-cb.on { background:var(--ok); border-color:var(--ok); }
        .pi-cb svg { width:12px; height:12px; }
        .pi-body { flex:1; display:flex; align-items:center; gap:8px; text-align:left; background:none; border:none; padding:0; cursor:pointer; min-width:0; }
        .pi-name { font-family:var(--sans); font-size:14px; font-weight:700; color:var(--ink1); }
        .pi-crit-tag { font-family:var(--mono); font-size:9px; font-weight:900; background:color-mix(in srgb, var(--crit) 15%, transparent); color:var(--crit); border:1px solid color-mix(in srgb, var(--crit) 35%, transparent); padding:1px 5px; letter-spacing:.5px; flex-shrink:0; }
        .ra-toast { position:fixed; bottom:140px; left:50%; transform:translateX(-50%); background:var(--panel); border:1px solid var(--acc); color:var(--ink1); padding:11px 22px; font-family:var(--mono); font-weight:500; font-size:13px; letter-spacing:.5px; z-index:1000; white-space:nowrap; }
      `}</style>
    </Page>
  )
}

// ─── Vorlage auswählen ────────────────────────────────────
function TemplateSheet({ loading, onClose, onSelect }) {
  return (
    <Sheet title="Vorlage laden" sub="Packliste aus Vorlage befüllen" onClose={onClose}>
      <div className="tpl-warn">Vorhandene Einträge bleiben erhalten. Neue Punkte werden hinzugefügt.</div>
      {loading ? (
        <div className="tpl-loading">Lädt…</div>
      ) : (
        Object.keys(PACK_TEMPLATES).map(type => (
          <button key={type} className="tpl-opt" onClick={() => onSelect(type)}>
            <span className="tpl-name">{type}</span>
            <span className="tpl-count">{PACK_TEMPLATES[type].length} Punkte</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ))
      )}
      <style>{`
        .tpl-warn { font-family:var(--mono); font-size:11px; color:var(--ink3); background:var(--panel2); border:1px solid var(--line); padding:10px 12px; margin-bottom:14px; line-height:1.5; }
        .tpl-loading { text-align:center; font-family:var(--mono); font-size:13px; color:var(--ink3); padding:20px; }
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
  const [name, setName]       = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || 'Sonstiges')
  const [critical, setCritical] = useState(item?.critical || false)
  const [saving, setSaving]   = useState(false)
  const [armed, setArmed]     = useState(false)
  const [err, setErr]         = useState('')

  async function save() {
    if (!name.trim()) return
    setSaving(true); setErr('')
    try {
      if (item?.id) {
        await updatePackItem(item.id, { name: name.trim(), category, critical })
      } else {
        await addPackItem(user.id, { name: name.trim(), category, critical, checked: false, sort_order: 0 })
      }
      onSaved()
    } catch (e) {
      setSaving(false)
      setErr(e?.message || 'Speichern fehlgeschlagen — Migration 004 ausführen?')
    }
  }

  async function remove() {
    if (item?.id) { await deletePackItem(item.id); onSaved() }
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
      <button className={`pi-crit-row ${critical ? 'on' : ''}`} onClick={() => setCritical(c => !c)}>
        <span className={`pi-crit-cb ${critical ? 'on' : ''}`}>
          {critical && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M5 13l4 4L19 7"/></svg>}
        </span>
        <span className="pi-crit-label">Als kritisch markieren</span>
      </button>
      {err && <div className="pi-err">{err}</div>}
      <BtnGreen onClick={save}>{saving ? 'Speichert…' : 'Speichern'}</BtnGreen>
      {item?.id && (
        <BtnDelete armed={armed} onClick={() => armed ? remove() : (setArmed(true), setTimeout(() => setArmed(false), 3000))} />
      )}
      <style>{`
        .pi-err { font-family:var(--mono); font-size:11px; color:var(--crit); background:color-mix(in srgb, var(--crit) 7%, transparent); border:1px solid color-mix(in srgb, var(--crit) 30%, transparent); padding:10px 12px; margin-bottom:12px; line-height:1.5; }
        .pi-field { margin-bottom:14px; }
        .pi-lbl { display:block; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); margin-bottom:6px; }
        .pi-sel { width:100%; background:var(--panel2); border:1px solid var(--line); padding:12px 14px; font-family:var(--mono); font-size:13px; font-weight:700; color:var(--ink1); outline:none; }
        .pi-crit-row { display:flex; align-items:center; gap:10px; width:100%; padding:13px 14px; background:var(--panel2); border:1px solid var(--line); margin-bottom:14px; }
        .pi-crit-row.on { background:color-mix(in srgb, var(--crit) 6%, transparent); border-color:color-mix(in srgb, var(--crit) 30%, transparent); }
        .pi-crit-row:active { background:var(--panel); }
        .pi-crit-cb { width:22px; height:22px; border:1.5px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; background:none; }
        .pi-crit-cb.on { background:var(--crit); border-color:var(--crit); }
        .pi-crit-cb svg { width:12px; height:12px; }
        .pi-crit-label { font-family:var(--mono); font-size:13px; font-weight:700; color:var(--ink1); }
      `}</style>
    </Sheet>
  )
}

// ─── Rennen hinzufügen ────────────────────────────────────
function AddRaceSheet({ user, bikes, prefill, onClose, onSaved }) {
  const [f, setF] = useState({
    event_name: prefill?.event_name || '', race_date: prefill?.race_date || '',
    bike_id: prefill?.bike_id || bikes[0]?.id || '', placement: '',
    distance_km: prefill?.distance_km ?? '', elevation_m: prefill?.elevation_m ?? '',
    avg_power: prefill?.avg_power ?? '', avg_speed: prefill?.avg_speed ?? '',
    duration:'', feeling:'', learnings:'',
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
      duration: f.duration || null,
      feeling: f.feeling || null,
      learnings: f.learnings || null,
      tyres: f.tyres || null,
      pressure_front: f.pressure_front ? Number(f.pressure_front) : null,
      pressure_rear: f.pressure_rear ? Number(f.pressure_rear) : null,
      gearing: f.gearing || null,
      conditions: f.conditions || null,
    })
    onSaved()
  }

  return (
    <Sheet title="Neues Rennen" sub={prefill ? 'Aus Strava-Aktivität vorausgefüllt – bitte ergänzen' : 'Setup und Ergebnis festhalten'} onClose={onClose}>
      <Field label="Veranstaltung" value={f.event_name} onChange={set('event_name')} placeholder="z.B. Arber Radmarathon" />
      <Field label="Datum" type="date" value={f.race_date} onChange={set('race_date')} />
      <div className="ar-field">
        <label className="ar-lbl">Fahrrad</label>
        <select className="ar-sel" value={f.bike_id} onChange={e => set('bike_id')(e.target.value)}>
          <option value="">— kein —</option>
          {bikes.filter(b => !b.archived).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="ar-g2">
        <Field label="Platzierung" value={f.placement} onChange={set('placement')} placeholder="z.B. P5" />
        <Field label="Zeit" value={f.duration} onChange={set('duration')} placeholder="z.B. 3:42:10" />
        <Field label="Distanz (km)" type="number" value={f.distance_km} onChange={set('distance_km')} />
        <Field label="Höhenmeter" type="number" value={f.elevation_m} onChange={set('elevation_m')} />
        <Field label="Ø Leistung (W)" type="number" value={f.avg_power} onChange={set('avg_power')} />
        <Field label="Ø Speed (km/h)" type="number" value={f.avg_speed} onChange={set('avg_speed')} />
      </div>
      <div className="ar-field">
        <label className="ar-lbl">Gefühl / Tagesform</label>
        <div className="ar-feel">
          {[['🚀','Stark'],['🙂','Gut'],['😐','Mittel'],['😣','Zäh']].map(([ico, l]) => (
            <button key={l} className={`ar-feel-opt ${f.feeling === `${ico} ${l}` ? 'on' : ''}`}
              onClick={() => set('feeling')(f.feeling === `${ico} ${l}` ? '' : `${ico} ${l}`)}>
              {ico} {l}
            </button>
          ))}
        </div>
      </div>
      <div className="ar-field">
        <label className="ar-lbl">Learnings</label>
        <textarea className="ar-area" value={f.learnings} onChange={e => set('learnings')(e.target.value)}
          placeholder="Was lief gut, was machst du nächstes Mal anders? Pacing, Verpflegung, Material…" />
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
        .ar-feel { display:flex; gap:6px; }
        .ar-feel-opt { flex:1; padding:11px 4px; background:var(--panel2); border:1px solid var(--line); font-family:var(--sans); font-size:12px; font-weight:700; color:var(--ink2); }
        .ar-feel-opt.on { background:color-mix(in srgb, var(--acc) 12%, transparent); border-color:var(--acc); color:var(--acc); }
        .ar-area { width:100%; min-height:84px; background:var(--panel2); border:1px solid var(--line); padding:12px 14px; font-family:var(--mono); font-size:13px; color:var(--ink1); outline:none; resize:vertical; }
      `}</style>
    </Sheet>
  )
}
