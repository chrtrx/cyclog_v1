import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  getBike, updateBike, archiveBike,
  getComponents, upsertComponent, deleteComponent,
  getUpgrades, addUpgrade, updateUpgrade, deleteUpgrade,
  getServiceLogs, getFitHistory,
  PART_CATEGORIES, BIKE_TYPES,
} from '../lib/data'
import { Page, Sheet, Field, BtnGreen, BtnDelete } from '../components/ui'
import { BIKE_ICONS } from '../lib/helpers'
import { CondStats } from '../components/TrackerCard'

const GEO_FIELDS = [
  { k: 'geo_stack',       l: 'Stack' },
  { k: 'geo_reach',       l: 'Reach' },
  { k: 'geo_head_angle',  l: 'Lenkwinkel' },
  { k: 'geo_seat_angle',  l: 'Sitzwinkel' },
  { k: 'geo_head_tube',   l: 'Steuerrohr' },
  { k: 'geo_top_tube',    l: 'Oberrohr' },
  { k: 'geo_seat_tube',   l: 'Sitzrohr' },
  { k: 'geo_chainstay',   l: 'Kettenstrebe' },
  { k: 'geo_wheelbase',   l: 'Radstand' },
  { k: 'geo_bb_drop',     l: 'Tretlager-Abs.' },
  { k: 'geo_standover',   l: 'Standover' },
]

// Kurzzeile "1.240 km · ☀️65% …" für einen abgeschlossenen Durchlauf.
function svcStatLine(l) {
  if (l.km_ridden == null) return null
  const parts = [`${Math.round(l.km_ridden).toLocaleString('de')} km Laufzeit`]
  const c = l.conditions
  if (c?.avgWatts) parts.push(`Ø ${c.avgWatts} W`)
  if (c?.weather) parts.push(`☀️${c.weather.dry}% 💧${c.weather.wet}% 🌧️${c.weather.rain}%`)
  if (c?.intensity) parts.push(`🟢${c.intensity.easy}% 🟡${c.intensity.mixed}% 🔴${c.intensity.hard}%`)
  return parts.join(' · ')
}

// Gesamt-Statistik je Tracker-Typ: Durchläufe, km, km-gewichtete Bedingungen.
function aggregateServiceStats(logs) {
  const byType = {}
  for (const l of logs) {
    if (l.km_ridden == null) continue
    const g = (byType[l.service_type] ||= {
      type: l.service_type, title: l.title, icon: l.icon || '🔧',
      runs: 0, km: 0, ckm: 0, wkm: 0, wsum: 0,
      w: { dry: 0, wet: 0, rain: 0 }, i: { easy: 0, mixed: 0, hard: 0 },
    })
    const km = Number(l.km_ridden) || 0
    g.runs++; g.km += km
    const c = l.conditions
    if (c?.weather && km > 0) {
      g.ckm += km
      for (const k of ['dry', 'wet', 'rain']) g.w[k] += (c.weather[k] || 0) / 100 * km
      for (const k of ['easy', 'mixed', 'hard']) g.i[k] += (c.intensity?.[k] || 0) / 100 * km
    }
    if (c?.avgWatts && km > 0) { g.wkm += km; g.wsum += c.avgWatts * km }
  }
  return Object.values(byType).map(g => ({
    ...g,
    avgKm: g.runs ? Math.round(g.km / g.runs) : 0,
    avgWatts: g.wkm > 0 ? Math.round(g.wsum / g.wkm) : null,
    conditions: g.ckm > 0 ? {
      totalKm: Math.round(g.ckm),
      weather: { dry: Math.round(g.w.dry / g.ckm * 100), wet: Math.round(g.w.wet / g.ckm * 100), rain: Math.round(g.w.rain / g.ckm * 100) },
      intensity: { easy: Math.round(g.i.easy / g.ckm * 100), mixed: Math.round(g.i.mixed / g.ckm * 100), hard: Math.round(g.i.hard / g.ckm * 100) },
    } : null,
  })).sort((a, b) => b.km - a.km)
}

export default function BikeDetail() {
  const { bikeId } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()

  const [bike, setBike] = useState(null)
  const [components, setComponents] = useState([])
  const [upgrades, setUpgrades] = useState([])
  const [history, setHistory] = useState(null)  // lazy: erst beim Öffnen des Tabs geladen
  const [svcStats, setSvcStats] = useState([])
  const [tab, setTab] = useState('parts')
  const [partSheet, setPartSheet] = useState(null)     // null | { cat, part }
  const [upgradeSheet, setUpgradeSheet] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [typeSheet, setTypeSheet] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => { setHistory(null); load() }, [bikeId])
  useEffect(() => {
    if (tab !== 'history' || history !== null) return
    Promise.all([getServiceLogs(bikeId).catch(() => []), getFitHistory(bikeId).catch(() => [])])
      .then(([logs, fits]) => {
        const items = [
          ...logs.map(l => ({ id: `s-${l.id}`, kind: 'service', date: l.service_date, icon: l.icon || '🔧', title: l.title, sub: svcStatLine(l) })),
          ...fits.map(f => ({ id: `f-${f.id}`, kind: 'fit', date: f.created_at, icon: '📐', title: 'Bike-Fit geändert', sub: f.summary })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
        setHistory(items)
        setSvcStats(aggregateServiceStats(logs))
      })
      .catch(() => setHistory([]))
  }, [tab, history, bikeId])

  async function load() {
    setLoading(true)
    try {
      const [b, c, u] = await Promise.all([
        getBike(bikeId),
        getComponents(bikeId),
        getUpgrades(bikeId).catch(() => []),
      ])
      setBike(b); setComponents(c); setUpgrades(u)
      setNotes(b.notes || '')
    } catch { showToast('Fehler beim Laden') }
    setLoading(false)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2200) }

  const totalWeight = components.reduce((s, c) => s + (Number(c.weight_g) || 0), 0)

  async function saveNotes() {
    await updateBike(bike.id, { notes })
    setNotesDirty(false)
    showToast('✓ Gespeichert')
  }

  async function toggleUpgradeDone(u) {
    await updateUpgrade(u.id, { done: !u.done })
    await load()
  }

  async function handleArchive() {
    try {
      await archiveBike(bike.id, !bike.archived)
      await load()
      showToast(bike.archived ? '✓ Rad reaktiviert' : '📦 Rad archiviert')
    } catch (e) {
      showToast('⚠ Fehler: ' + (e?.message || 'Archivieren fehlgeschlagen'))
    }
  }

  if (loading || !bike) return <Page title="Lädt…" back="/"><div /></Page>

  const TABS = [
    { id: 'parts',    label: 'Teile' },
    { id: 'notes',    label: 'Notizen' },
    { id: 'upgrades', label: 'Upgrades' },
    { id: 'geo',      label: 'Geometrie' },
    { id: 'history',  label: 'Historie' },
  ]

  return (
    <Page title={bike.name} subtitle={`${bike.type}${bike.model_year ? ' · ' + bike.model_year : ''}`} back="/">

      {/* Bike-Karte */}
      <div className="id-card">
        <div className="id-left">
          <div className="id-km">{(bike.km || 0).toLocaleString('de')} <span className="id-km-u">km</span></div>
          {totalWeight > 0 && (
            <div className="id-weight">⚖ {(totalWeight / 1000).toFixed(2)} kg</div>
          )}
        </div>
        <div className="id-right">
          <button className="id-type-btn" onClick={() => setTypeSheet(true)}>
            {BIKE_ICONS[bike.type] || '🚴'} {bike.type}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          {bike.manufacturer && <span>{bike.manufacturer}</span>}
          {bike.model && <span>{bike.model}</span>}
          {bike.frame_size && <span>Gr. {bike.frame_size}</span>}
          <button className={`id-archive-btn ${bike.archived ? 'on' : ''}`} onClick={e => { e.stopPropagation(); handleArchive() }}>
            {bike.archived ? '↩ Reaktivieren' : '📦 Archivieren'}
          </button>
        </div>
      </div>

      {/* Tab-Bar */}
      <div className="bd-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`bd-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TEILE ── */}
      {tab === 'parts' && (
        <div className="tab-body">
          {PART_CATEGORIES.map(cat => {
            const parts = components.filter(c => c.category === cat.id)
            return (
              <div key={cat.id} className="cat-sec">
                <div className="cat-hdr">
                  <span className="cat-ico">{cat.icon}</span>
                  <span className="cat-lbl">{cat.label}</span>
                  <button className="cat-add" onClick={() => setPartSheet({ cat, part: null })}>+</button>
                </div>
                {parts.length > 0 ? (
                  <div className="parts-list">
                    {parts.map(p => (
                      <button key={p.id} className="part-row"
                        onClick={() => setPartSheet({ cat: PART_CATEGORIES.find(c => c.id === p.category), part: p })}>
                        <div className="part-body">
                          <div className="part-name">{p.name}</div>
                          {(p.manufacturer || p.model) && (
                            <div className="part-sub">{[p.manufacturer, p.model].filter(Boolean).join(' · ')}</div>
                          )}
                          {p.specs?.details && (
                            <div className="part-sub">{p.specs.details}</div>
                          )}
                        </div>
                        <div className="part-right">
                          {p.weight_g && <span className="part-g">{p.weight_g}g</span>}
                          {p.price_eur && <span className="part-eur">{p.price_eur}€</span>}
                        </div>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="cat-empty" onClick={() => setPartSheet({ cat, part: null })}>
                    Tippe zum Hinzufügen
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── NOTIZEN ── */}
      {tab === 'notes' && (
        <div className="tab-body">
          <textarea
            className="notes-area"
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesDirty(true) }}
            placeholder="Gedanken, Besonderheiten, Setup-Notizen…"
          />
          {notesDirty && <BtnGreen onClick={saveNotes}>Speichern</BtnGreen>}
          {!notesDirty && notes.length === 0 && (
            <div className="notes-hint">Noch keine Notizen. Fang einfach an zu tippen.</div>
          )}
        </div>
      )}

      {/* ── UPGRADES ── */}
      {tab === 'upgrades' && (
        <div className="tab-body">
          {upgrades.length > 0 && (
            <div className="upgr-list">
              {upgrades.map(u => (
                <div key={u.id} className={`upgr-row ${u.done ? 'done' : ''}`}>
                  <button className={`upgr-cb ${u.done ? 'checked' : ''}`} onClick={() => toggleUpgradeDone(u)}>
                    {u.done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
                  </button>
                  <button className="upgr-body" onClick={() => setUpgradeSheet(u)}>
                    <div className="upgr-name">{u.name}</div>
                    {u.notes && <div className="upgr-note">{u.notes}</div>}
                  </button>
                  {u.price_eur != null && <span className="upgr-price">{Number(u.price_eur).toLocaleString('de')}€</span>}
                  <button className="upgr-edit" onClick={() => setUpgradeSheet(u)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {upgrades.length === 0 && (
            <div className="upgr-empty">Noch keine Wunschliste — leg los!</div>
          )}
          <button className="upgr-add" onClick={() => setUpgradeSheet(null)}>
            + Upgrade hinzufügen
          </button>
        </div>
      )}

      {/* ── GEOMETRIE ── */}
      {tab === 'geo' && (
        <div className="tab-body">
          <div className="geo-bar">
            <button className="geo-edit-btn" onClick={() => nav(`/fit?bike=${bike.id}`)}>
              {GEO_FIELDS.some(g => bike[g.k] != null) ? '📐 Im Bike-Fit bearbeiten' : '📐 Im Bike-Fit eintragen'}
            </button>
          </div>
          {GEO_FIELDS.some(g => bike[g.k] != null) ? (
            <div className="geo-grid">
              {GEO_FIELDS.filter(g => bike[g.k] != null).map(g => (
                <div key={g.k} className="geo-cell">
                  <div className="geo-num">{bike[g.k]}</div>
                  <div className="geo-lbl">{g.l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="geo-empty">Noch keine Geometriedaten eingetragen.</div>
          )}
        </div>
      )}

      {/* ── HISTORIE ── */}
      {tab === 'history' && (
        <div className="tab-body">
          {svcStats.length > 0 && (
            <div className="agg">
              <div className="agg-hdr">📊 Gesamt-Statistik</div>
              {svcStats.map(g => (
                <div className="agg-card" key={g.type}>
                  <div className="agg-top">
                    <span className="agg-ico">{g.icon}</span>
                    <span className="agg-title">{g.title}</span>
                    <span className="agg-meta">{g.runs}× · Ø {g.avgKm.toLocaleString('de')} km{g.avgWatts ? ` · ${g.avgWatts} W` : ''}</span>
                  </div>
                  {g.conditions && <CondStats conditions={g.conditions} compact />}
                </div>
              ))}
            </div>
          )}
          {history === null ? (
            <div className="hist-empty">Lädt…</div>
          ) : history.length === 0 ? (
            <div className="hist-empty">Noch nichts protokolliert. Wartungen und Bike-Fit-Änderungen erscheinen hier automatisch.</div>
          ) : (
            <div className="hist-list">
              {history.map(h => (
                <div className="hist-row" key={h.id}>
                  <div className={`hist-ico ${h.kind}`}>{h.icon}</div>
                  <div className="hist-body">
                    <div className="hist-title">{h.title}</div>
                    {h.sub && <div className="hist-sub">{h.sub}</div>}
                    <div className="hist-date">{new Date(h.date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sheets */}
      {partSheet && (
        <PartSheet
          user={user} bikeId={bikeId} cat={partSheet.cat} part={partSheet.part}
          onClose={() => setPartSheet(null)}
          onSaved={() => { setPartSheet(null); load(); showToast('✓ Gespeichert') }}
        />
      )}
      {upgradeSheet !== undefined && (
        <UpgradeSheet
          user={user} bikeId={bikeId} upgrade={upgradeSheet}
          onClose={() => setUpgradeSheet(undefined)}
          onSaved={() => { setUpgradeSheet(undefined); load(); showToast(upgradeSheet?.id ? '✓ Gespeichert' : '✓ Hinzugefügt') }}
        />
      )}
      {typeSheet && (
        <BikeTypeSheet bike={bike} onClose={() => setTypeSheet(false)} onSaved={() => { setTypeSheet(false); load(); showToast('✓ Typ geändert') }} />
      )}

      {toast && <div className="bd-toast">{toast}</div>}

      <style>{`
        .id-card { display:flex; align-items:center; justify-content:space-between; border:1px solid var(--line); padding:16px; margin-bottom:14px; }
        .id-left { flex:1; }
        .id-km { font-family:var(--sans); font-size:38px; font-weight:900; color:var(--ink1); letter-spacing:-1px; line-height:1; }
        .id-km-u { font-family:var(--mono); font-size:13px; color:var(--ink3); font-weight:700; }
        .id-weight { font-family:var(--mono); font-size:12px; color:var(--ink2); font-weight:700; margin-top:6px; }
        .id-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
        .id-right span { font-family:var(--mono); font-size:11px; color:var(--ink3); }
        .id-type-btn { display:flex; align-items:center; gap:5px; background:rgba(47,123,255,.08); border:1px solid rgba(47,123,255,.3); padding:5px 9px; font-family:var(--mono); font-size:11px; font-weight:700; color:var(--acc); letter-spacing:.5px; }
        .id-type-btn:active { background:rgba(47,123,255,.18); }
        .id-archive-btn { display:flex; align-items:center; gap:4px; background:rgba(255,255,255,.04); border:1px solid var(--line); padding:4px 8px; font-family:var(--mono); font-size:10px; font-weight:700; color:var(--ink3); letter-spacing:.5px; text-transform:uppercase; margin-top:2px; }
        .id-archive-btn:active { background:rgba(255,255,255,.08); }
        .id-archive-btn.on { background:rgba(52,199,154,.08); border-color:rgba(52,199,154,.35); color:var(--ok); }

        .bd-tabs { display:flex; border-bottom:1px solid var(--line); margin-bottom:16px; }
        .bd-tab { flex:1; padding:11px 6px; font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--ink3); background:none; border:none; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; }
        .bd-tab.on { color:var(--acc); border-bottom-color:var(--acc); }

        .tab-body { padding-bottom: 8px; }

        .cat-sec { margin-bottom:18px; }
        .cat-hdr { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .cat-ico { font-size:15px; width:20px; text-align:center; }
        .cat-lbl { flex:1; font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink2); }
        .cat-add { width:26px; height:26px; background:rgba(47,123,255,.1); border:1px solid rgba(47,123,255,.3); color:var(--acc); font-size:17px; font-weight:400; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cat-add:active { background:rgba(47,123,255,.2); }
        .cat-empty { padding:11px 12px; font-family:var(--mono); font-size:11px; color:var(--ink3); border:1px dashed var(--line); text-align:center; cursor:pointer; }
        .cat-empty:active { background:var(--panel2); }

        .parts-list { border:1px solid var(--line); overflow:hidden; }
        .part-row { display:flex; align-items:center; gap:10px; padding:11px 12px; width:100%; background:none; border:none; border-bottom:1px solid var(--line); cursor:pointer; text-align:left; }
        .part-row:last-child { border-bottom:none; }
        .part-row:active { background:var(--panel2); }
        .part-body { flex:1; min-width:0; }
        .part-name { font-family:var(--sans); font-size:14px; font-weight:700; color:var(--ink1); }
        .part-sub { font-family:var(--mono); font-size:11px; color:var(--ink3); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .part-right { display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0; }
        .part-g { font-family:var(--mono); font-size:11px; color:var(--ink2); font-weight:700; }
        .part-eur { font-family:var(--mono); font-size:11px; color:var(--warn); font-weight:700; }

        .notes-area { width:100%; min-height:220px; background:var(--panel); border:1px solid var(--line); padding:14px; font-family:var(--mono); font-size:14px; color:var(--ink1); resize:none; outline:none; line-height:1.7; }
        .notes-area:focus { border-color:var(--acc); }
        .notes-area::placeholder { color:var(--ink3); }
        .notes-hint { padding:16px; font-family:var(--mono); font-size:12px; color:var(--ink3); text-align:center; }

        .upgr-list { border:1px solid var(--line); overflow:hidden; margin-bottom:10px; }
        .upgr-row { display:flex; align-items:center; gap:10px; padding:12px 12px; border-bottom:1px solid var(--line); transition:opacity .15s; }
        .upgr-row:last-child { border-bottom:none; }
        .upgr-row.done { opacity:.5; }
        .upgr-cb { width:22px; height:22px; border:2px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; background:none; }
        .upgr-cb.checked { background:var(--ok); border-color:var(--ok); color:white; }
        .upgr-cb svg { width:13px; height:13px; }
        .upgr-body { flex:1; min-width:0; text-align:left; background:none; border:none; padding:0; cursor:pointer; }
        .upgr-name { font-family:var(--sans); font-size:14px; font-weight:700; color:var(--ink1); }
        .upgr-note { font-family:var(--mono); font-size:11px; color:var(--ink3); margin-top:2px; }
        .upgr-price { font-family:var(--mono); font-size:12px; color:var(--warn); font-weight:700; flex-shrink:0; }
        .upgr-edit { background:none; border:none; padding:4px; flex-shrink:0; }
        .upgr-empty { padding:20px; font-family:var(--mono); font-size:12px; color:var(--ink3); text-align:center; border:1px dashed var(--line); margin-bottom:10px; }
        .upgr-add { width:100%; padding:13px; background:rgba(47,123,255,.08); border:1px solid rgba(47,123,255,.25); color:var(--acc); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
        .upgr-add:active { background:rgba(47,123,255,.15); }

        .geo-bar { display:flex; justify-content:flex-end; margin-bottom:12px; }
        .geo-edit-btn { padding:9px 16px; background:rgba(47,123,255,.08); border:1px solid rgba(47,123,255,.25); color:var(--acc); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
        .geo-edit-btn:active { background:rgba(47,123,255,.18); }
        .geo-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
        .geo-cell { background:var(--panel); border:1px solid var(--line); padding:10px 8px; text-align:center; }
        .geo-num { font-family:var(--sans); font-size:17px; font-weight:900; color:var(--ink1); }
        .geo-lbl { font-family:var(--mono); font-size:8.5px; color:var(--ink3); text-transform:uppercase; letter-spacing:.5px; margin-top:3px; }
        .geo-empty { padding:24px; text-align:center; font-family:var(--mono); font-size:12px; color:var(--ink3); border:1px dashed var(--line); }

        .agg { margin-bottom:18px; }
        .agg-hdr { font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin-bottom:8px; }
        .agg-card { border:1px solid var(--line); background:var(--panel2); padding:11px 13px 5px; margin-bottom:8px; }
        .agg-top { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .agg-ico { font-size:15px; }
        .agg-title { flex:1; font-family:var(--mono); font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--ink1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .agg-meta { font-family:var(--mono); font-size:11px; font-weight:700; color:var(--acc); white-space:nowrap; }

        .hist-empty { padding:24px; text-align:center; font-family:var(--mono); font-size:12px; color:var(--ink3); border:1px dashed var(--line); }
        .hist-list { display:flex; flex-direction:column; gap:2px; }
        .hist-row { display:flex; align-items:flex-start; gap:12px; padding:12px 4px; border-bottom:1px solid var(--line); }
        .hist-row:last-child { border-bottom:none; }
        .hist-ico { width:34px; height:34px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px; background:var(--panel2); border:1px solid var(--line); }
        .hist-ico.fit { background:rgba(47,123,255,.1); border-color:rgba(47,123,255,.3); }
        .hist-body { flex:1; min-width:0; }
        .hist-title { font-family:var(--sans); font-size:14px; font-weight:800; color:var(--ink1); letter-spacing:.3px; }
        .hist-sub { font-family:var(--mono); font-size:11px; color:var(--ink2); margin-top:3px; line-height:1.5; }
        .hist-date { font-family:var(--mono); font-size:10.5px; color:var(--ink3); margin-top:4px; letter-spacing:.3px; }

        .bd-toast { position:fixed; bottom:110px; left:50%; transform:translateX(-50%); background:var(--panel); border:1px solid var(--acc); color:var(--ink1); padding:10px 20px; font-family:var(--mono); font-size:13px; font-weight:700; z-index:1000; white-space:nowrap; }
      `}</style>
    </Page>
  )
}

// ─── Teil bearbeiten / hinzufügen ─────────────────────────
function PartSheet({ user, bikeId, cat, part, onClose, onSaved }) {
  const [name, setName]           = useState(part?.name || '')
  const [manufacturer, setMfr]    = useState(part?.manufacturer || '')
  const [model, setModel]         = useState(part?.model || '')
  const [weight, setWeight]       = useState(part?.weight_g || '')
  const [price, setPrice]         = useState(part?.price_eur || '')
  const [specs, setSpecs]         = useState(part?.specs?.details || '')
  const [link, setLink]           = useState(part?.link || '')
  const [note, setNote]           = useState(part?.notes || '')
  const [armed, setArmed]         = useState(false)
  const [saving, setSaving]       = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await upsertComponent(user.id, {
        ...(part ? { id: part.id } : {}),
        bike_id: bikeId,
        category: cat.id,
        name: name.trim(),
        manufacturer: manufacturer || null,
        model: model || null,
        weight_g: weight ? Number(weight) : null,
        price_eur: price ? Number(price) : null,
        link: link || null,
        specs: specs ? { details: specs } : {},
        notes: note || '',
      })
      onSaved()
    } catch (e) {
      alert(e.message || 'Fehler beim Speichern')
    }
    setSaving(false)
  }

  async function remove() {
    if (part) await deleteComponent(part.id)
    onSaved()
  }

  return (
    <Sheet title={part ? 'Teil bearbeiten' : 'Teil hinzufügen'} sub={`${cat.icon} ${cat.label}`} onClose={onClose}>
      <Field label="Name *" value={name} onChange={setName} placeholder="z.B. Fox 36 Factory" />
      <div className="ps-g2">
        <Field label="Hersteller" value={manufacturer} onChange={setMfr} placeholder="z.B. Fox" />
        <Field label="Modell" value={model} onChange={setModel} placeholder="z.B. 36 Factory" />
      </div>
      <div className="ps-g2">
        <Field label="Gewicht (g)" type="number" value={weight} onChange={setWeight} placeholder="optional" />
        <Field label="Preis (€)" type="number" value={price} onChange={setPrice} placeholder="optional" />
      </div>
      <Field label="Maße / Specs" value={specs} onChange={setSpecs} placeholder="z.B. 29°, 51mm, 140mm" />
      <Field label="Link" value={link} onChange={setLink} placeholder="https://..." />
      <Field label="Notiz" value={note} onChange={setNote} placeholder="optional" />
      <BtnGreen onClick={save}>{saving ? 'Speichert…' : 'Speichern'}</BtnGreen>
      {part && (
        <BtnDelete armed={armed} onClick={() => armed ? remove() : (setArmed(true), setTimeout(() => setArmed(false), 3000))} />
      )}
      <style>{`.ps-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}`}</style>
    </Sheet>
  )
}

// ─── Upgrade bearbeiten / hinzufügen ──────────────────────
function UpgradeSheet({ user, bikeId, upgrade, onClose, onSaved }) {
  const [name, setName]   = useState(upgrade?.name || '')
  const [price, setPrice] = useState(upgrade?.price_eur ?? '')
  const [note, setNote]   = useState(upgrade?.notes || '')
  const [done, setDone]   = useState(upgrade?.done || false)
  const [armed, setArmed] = useState(false)

  async function save() {
    if (!name.trim()) return
    if (upgrade?.id) {
      await updateUpgrade(upgrade.id, {
        name: name.trim(),
        price_eur: price !== '' ? Number(price) : null,
        notes: note || '',
        done,
      })
    } else {
      await addUpgrade(user.id, {
        bike_id: bikeId,
        name: name.trim(),
        price_eur: price !== '' ? Number(price) : null,
        notes: note || '',
        done: false,
      })
    }
    onSaved()
  }

  async function remove() {
    if (upgrade?.id) await deleteUpgrade(upgrade.id)
    onSaved()
  }

  return (
    <Sheet title={upgrade?.id ? 'Upgrade bearbeiten' : 'Upgrade hinzufügen'} sub="Wunschliste" onClose={onClose}>
      <Field label="Name *" value={name} onChange={setName} placeholder="z.B. Fox 38 Factory" />
      <Field label="Preis (€)" type="number" value={price} onChange={setPrice} placeholder="optional" />
      <Field label="Notiz" value={note} onChange={setNote} placeholder="optional" />
      {upgrade?.id && (
        <button className="upgr-done-toggle" onClick={() => setDone(d => !d)}>
          <span className={`udt-cb ${done ? 'on' : ''}`}>
            {done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
          </span>
          {done ? 'Erledigt ✓' : 'Als erledigt markieren'}
        </button>
      )}
      <BtnGreen onClick={save}>Speichern</BtnGreen>
      {upgrade?.id && (
        <BtnDelete armed={armed} onClick={() => armed ? remove() : (setArmed(true), setTimeout(() => setArmed(false), 3000))} />
      )}
      <style>{`
        .upgr-done-toggle{display:flex;align-items:center;gap:10px;width:100%;background:var(--panel2);border:1px solid var(--line);padding:13px;margin-bottom:12px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink1);}
        .udt-cb{width:22px;height:22px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .udt-cb.on{background:var(--ok);border-color:var(--ok);}
        .udt-cb svg{width:13px;height:13px;}
      `}</style>
    </Sheet>
  )
}

// ─── Fahrradtyp ändern ───────────────────────────────────
function BikeTypeSheet({ bike, onClose, onSaved }) {
  const [type, setType] = useState(bike.type)

  async function save() {
    await updateBike(bike.id, { type })
    onSaved()
  }

  return (
    <Sheet title="Fahrradtyp" sub="Typ auswählen" onClose={onClose}>
      <div className="type-grid">
        {BIKE_TYPES.map(t => (
          <button key={t} className={`type-opt ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
            <span className="type-ico">{BIKE_ICONS[t] || '🚴'}</span>
            {t}
          </button>
        ))}
      </div>
      <BtnGreen onClick={save}>Speichern</BtnGreen>
      <style>{`
        .type-grid { display:flex; flex-direction:column; gap:7px; margin-bottom:14px; }
        .type-opt { display:flex; align-items:center; gap:11px; padding:13px 14px; font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:.5px; background:var(--panel2); border:1px solid var(--line); color:var(--ink2); text-align:left; }
        .type-opt.on { background:rgba(47,123,255,.1); border-color:rgba(47,123,255,.5); color:var(--acc); }
        .type-opt:active { border-color:var(--acc); }
        .type-ico { font-size:18px; width:24px; text-align:center; flex-shrink:0; }
      `}</style>
    </Sheet>
  )
}


