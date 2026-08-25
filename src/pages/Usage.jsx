import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Page } from '../components/ui'
import { getUsageSummary, countSince } from '../lib/data'
import { isTrackingEnabled, setTrackingEnabled } from '../lib/track'

// Was du eintraegst, steht bereits in den Fach-Tabellen – das laesst sich
// rueckwirkend auswerten, auch fuer die Zeit vor dieser Auswertung.
const SOURCES = [
  { table: 'service_logs',         col: 'service_date', ico: '🔧', label: 'Wartung eingetragen' },
  { table: 'ride_conditions',      col: 'ride_date',    ico: '☀️', label: 'Fahrt bewertet' },
  { table: 'races',                col: 'race_date',    ico: '🏁', label: 'Rennen dokumentiert' },
  { table: 'fit_history',          col: 'created_at',   ico: '📐', label: 'Bike-Fit geändert' },
  { table: 'bike_events',          col: 'event_date',   ico: '⚠️', label: 'Ereignis notiert' },
  { table: 'setups',               col: 'created_at',   ico: '🔩', label: 'Setup gespeichert' },
  { table: 'tyre_pressures',       col: 'created_at',   ico: '🔵', label: 'Reifendruck notiert' },
  { table: 'custom_service_types', col: 'created_at',   ico: '✏️', label: 'Eigener Tracker erstellt' },
]

const PAGES = {
  '/': ['🏠', 'Startseite'], '/bikes': ['🚲', 'Räder'], '/fit': ['📐', 'Bike-Fit'],
  '/more': ['⋯', 'Mehr'], '/calendar': ['📅', 'Kalender'], '/races': ['🏁', 'Rennen'],
  '/setups': ['🔩', 'Setups'], '/pressure': ['🔵', 'Reifendruck'],
  '/inbox': ['🔔', 'Mitteilungen'], '/connect-strava': ['🟠', 'Strava'], '/usage': ['📊', 'Nutzung'],
}
const ACTIONS = {
  sync_manual:         ['🔄', 'Manueller Sync'],
  conditions_answered: ['✅', 'Bedingungen beantwortet'],
  conditions_skipped:  ['⏭', 'Bedingungen übersprungen'],
}
const RANGES = [[30, '30 Tage'], [90, '90 Tage'], [0, 'Gesamt']]

function Bars({ rows, empty }) {
  if (!rows.length) return <div className="us-empty">{empty}</div>
  const max = Math.max(...rows.map(r => r.n))
  return rows.map(r => (
    <div className="us-row" key={r.label}>
      <span className="us-ico">{r.ico}</span>
      <span className="us-body">
        <span className="us-top">
          <span className="us-label">{r.label}</span>
          <span className="us-n">{r.n.toLocaleString('de')}</span>
        </span>
        <span className="us-track"><i style={{ width: `${Math.max(3, r.n / max * 100)}%` }} /></span>
      </span>
    </div>
  ))
}

export default function Usage() {
  const { user } = useAuth()
  const [days, setDays] = useState(90)
  const [actions, setActions] = useState([])
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [on, setOn] = useState(isTrackingEnabled())

  useEffect(() => { load() }, [days])

  async function load() {
    setLoading(true)
    const since = days ? new Date(Date.now() - days * 86400e3).toISOString() : new Date(0).toISOString()

    const [counts, summary] = await Promise.all([
      Promise.all(SOURCES.map(s => countSince(s.table, user.id, s.col, days ? since : null))),
      getUsageSummary(user.id, since).catch(() => []),
    ])

    const acts = SOURCES
      .map((s, i) => ({ ico: s.ico, label: s.label, n: counts[i] || 0 }))
      .filter(r => r.n > 0)

    const pg = []
    for (const row of summary) {
      const n = Number(row.uses) || 0
      if (!n) continue
      if (row.label?.startsWith('page:')) {
        const path = row.label.slice(5)
        const known = PAGES[path] || (path.startsWith('/bike/') ? ['🚲', 'Rad-Details'] : null)
        if (!known) continue
        const hit = pg.find(x => x.label === known[1])
        if (hit) hit.n += n
        else pg.push({ ico: known[0], label: known[1], n })
      } else if (ACTIONS[row.label]) {
        acts.push({ ico: ACTIONS[row.label][0], label: ACTIONS[row.label][1], n })
      }
    }

    setActions(acts.sort((a, b) => b.n - a.n))
    setPages(pg.sort((a, b) => b.n - a.n))
    setLoading(false)
  }

  return (
    <Page title="Nutzung" subtitle="Welche Funktionen du wirklich brauchst" back="/more">
      <div className="us-range">
        {RANGES.map(([d, l]) => (
          <button key={d} className={`us-chip ${days === d ? 'on' : ''}`} onClick={() => setDays(d)}>{l}</button>
        ))}
      </div>

      {loading ? null : (
        <>
          <div className="us-hdr">Aktionen</div>
          <Bars rows={actions} empty="Noch nichts eingetragen." />

          <div className="us-hdr">Seitenaufrufe</div>
          <Bars rows={pages} empty="Seitenaufrufe werden ab jetzt erfasst – hier steht bald, welche Bereiche du am häufigsten öffnest." />

          <div className="us-note">
            Alle Zahlen bleiben in deiner eigenen Datenbank – kein Fremddienst, keine Weitergabe.
          </div>
          <button className="us-toggle" onClick={() => { const v = !on; setOn(v); setTrackingEnabled(v) }}>
            <span>Seitenaufrufe erfassen</span>
            <span className={`us-sw ${on ? 'on' : ''}`}><i /></span>
          </button>
        </>
      )}

      <style>{`
        .us-range { display:flex; gap:6px; margin-bottom:18px; }
        .us-chip { flex:1; background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--mono); font-size:11.5px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:10px 6px; }
        .us-chip.on { background:rgba(47,123,255,.12); border-color:var(--acc); color:var(--acc); }
        .us-hdr { font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin:20px 0 10px; }
        .us-hdr:first-of-type { margin-top:0; }
        .us-row { display:flex; align-items:center; gap:11px; margin-bottom:11px; }
        .us-ico { flex-shrink:0; width:26px; text-align:center; font-size:15px; }
        .us-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
        .us-top { display:flex; align-items:baseline; gap:8px; }
        .us-label { flex:1; font-family:var(--mono); font-size:12px; color:var(--ink1); letter-spacing:.3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .us-n { flex-shrink:0; font-family:var(--sans); font-size:13px; font-weight:900; letter-spacing:-.3px; color:var(--ink1); }
        .us-track { display:block; height:6px; background:var(--panel2); border:1px solid var(--line); overflow:hidden; }
        .us-track i { display:block; height:100%; background:var(--acc); }
        .us-empty { padding:16px; text-align:center; font-family:var(--mono); font-size:11px; color:var(--ink3); border:1px dashed var(--line); line-height:1.6; }
        .us-note { margin-top:24px; font-family:var(--mono); font-size:10.5px; color:var(--ink3); line-height:1.6; }
        .us-toggle { width:100%; margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--panel2); border:1px solid var(--line); padding:13px 14px; font-family:var(--mono); font-size:12px; font-weight:700; letter-spacing:.5px; color:var(--ink2); }
        .us-sw { width:40px; height:22px; flex-shrink:0; background:var(--panel); border:1px solid var(--line); display:flex; align-items:center; padding:2px; }
        .us-sw i { width:16px; height:16px; background:var(--ink3); display:block; transition:transform .15s, background .15s; }
        .us-sw.on { border-color:var(--acc); }
        .us-sw.on i { transform:translateX(18px); background:var(--acc); }
      `}</style>
    </Page>
  )
}
