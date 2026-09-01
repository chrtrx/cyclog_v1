import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getBikes, getComponents, getComponentHistory, PART_CATEGORIES } from '../lib/data'
import { Page, Empty } from '../components/ui'

// Diese Seite hat genau eine Aufgabe: zeigen, welche Teile an einem Rad
// verbaut sind und was sich daran wann geändert hat. Bewusst kein Vergleich
// und keine von Hand gepflegten Momentaufnahmen – die Teile unter
// „Räder → Teile" sind die einzige Quelle, alles andere ergibt sich daraus.

const fmtDay = (d) => d
  ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
  : null
const fmtShort = (d) => d
  ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  : ''

export default function Setups() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [bikes, setBikes] = useState([])
  const [bikeId, setBikeId] = useState(null)
  const [parts, setParts] = useState([])
  const [hist, setHist] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getBikes(user.id)
      .then(b => {
        const active = b.filter(x => !x.archived)
        setBikes(active)
        setBikeId(active[0]?.id || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!bikeId) return
    setBusy(true)
    Promise.all([getComponents(bikeId).catch(() => []), getComponentHistory(bikeId).catch(() => [])])
      .then(([c, h]) => { setParts(c); setHist(h) })
      .finally(() => setBusy(false))
  }, [bikeId])

  // Einbaudatum: frühester „added"-Eintrag, sonst das Anlegedatum des Teils
  // (für alles, was es schon vor dem Verlauf gab).
  const addedAt = (p) => {
    const rows = hist.filter(h => h.component_id === p.id && h.action === 'added')
    return rows.length ? rows[rows.length - 1].changed_at : p.created_at
  }

  // Eine gemeinsame, zeitlich sortierte Liste der Änderungen. Bei ausgebauten
  // Teilen wird der Zeitraum ergänzt – das ist die eigentliche Frage
  // („welchen Reifen bin ich von … bis … gefahren?").
  const changes = hist
    .map(h => {
      if (h.action !== 'removed') return h
      const add = hist.find(x => x.component_id === h.component_id && x.action === 'added'
        && new Date(x.changed_at) <= new Date(h.changed_at))
      return { ...h, from: add?.changed_at || null }
    })
    .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))

  const label = (h) => h.action === 'added' ? 'eingebaut'
    : h.action === 'removed' ? 'ausgebaut' : 'geändert'

  if (loading) return <Page title="Setups" subtitle="Verbaute Teile & Änderungen" back="/more"><div /></Page>

  return (
    <Page title="Setups" subtitle="Verbaute Teile & Änderungen" back="/more">
      {bikes.length === 0 ? (
        <Empty emoji="🚲" title="Noch kein Rad"
          sub="Lege zuerst ein Rad an – die verbauten Teile erscheinen dann hier." />
      ) : (
        <>
          {bikes.length > 1 && (
            <div className="st-bikes">
              {bikes.map(b => (
                <button key={b.id} className={`st-bike ${b.id === bikeId ? 'on' : ''}`}
                  onClick={() => setBikeId(b.id)}>{b.name}</button>
              ))}
            </div>
          )}

          {busy ? null : parts.length === 0 && changes.length === 0 ? (
            <div className="st-empty">
              Für dieses Rad sind noch keine Teile eingetragen.
              <button className="st-link" onClick={() => nav(`/bike/${bikeId}`)}>Teile eintragen →</button>
            </div>
          ) : (
            <>
              <div className="st-hdr">
                <span>Aktuell verbaut</span>
                <button className="st-edit" onClick={() => nav(`/bike/${bikeId}`)}>Bearbeiten</button>
              </div>

              {PART_CATEGORIES.map(cat => {
                const list = parts.filter(p => p.category === cat.id)
                if (!list.length) return null
                return (
                  <div key={cat.id} className="st-cat">
                    <div className="st-cat-t">{cat.icon} {cat.label}</div>
                    {list.map(p => (
                      <div key={p.id} className="st-row">
                        <span className="st-main">
                          {p.name}
                          {(p.manufacturer || p.model) && (
                            <span className="st-sub">{[p.manufacturer, p.model].filter(Boolean).join(' ')}</span>
                          )}
                        </span>
                        <span className="st-date">{addedAt(p) ? `seit ${fmtDay(addedAt(p))}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )
              })}

              <div className="st-hdr st-hdr2"><span>Änderungen</span></div>
              {changes.length === 0 ? (
                <div className="st-empty">
                  Noch keine Änderungen erfasst. Sobald du unter „Räder → Teile" etwas
                  änderst, steht hier, was gewechselt wurde – und wann.
                </div>
              ) : changes.map(h => (
                <div key={h.id} className="st-chg">
                  <span className="st-when">{fmtShort(h.changed_at)}</span>
                  <span className="st-main">
                    <span className="st-chg-t">
                      {h.name} <em className={`st-tag ${h.action}`}>{label(h)}</em>
                    </span>
                    {h.action === 'removed' && h.from && (
                      <span className="st-sub">gefahren {fmtDay(h.from)} – {fmtDay(h.changed_at)}</span>
                    )}
                    {h.summary && h.action === 'changed' && <span className="st-sub">{h.summary}</span>}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <style>{`
        .st-bikes { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
        .st-bike { background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--mono); font-size:11.5px; font-weight:700; padding:9px 12px; }
        .st-bike.on { background:color-mix(in srgb, var(--acc) 12%, transparent); border-color:var(--acc); color:var(--acc); }

        .st-hdr { display:flex; align-items:center; justify-content:space-between; gap:10px; font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin:0 2px 12px; }
        .st-hdr2 { margin-top:26px; }
        .st-edit { background:none; border:1px solid color-mix(in srgb, var(--acc) 35%, transparent); color:var(--acc); font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:6px 10px; }

        .st-cat { margin-bottom:16px; }
        .st-cat-t { font-family:var(--mono); font-size:11px; font-weight:700; color:var(--ink3); letter-spacing:.5px; margin-bottom:7px; }
        .st-row { display:flex; align-items:flex-start; gap:12px; padding:10px 12px; border:1px solid var(--line); margin-bottom:5px; }
        .st-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; font-family:var(--sans); font-size:13.5px; font-weight:800; color:var(--ink1); letter-spacing:.2px; }
        .st-sub { font-family:var(--mono); font-size:10.5px; font-weight:400; color:var(--ink3); line-height:1.5; }
        .st-date { flex-shrink:0; font-family:var(--mono); font-size:10.5px; color:var(--ink2); white-space:nowrap; padding-top:3px; }

        .st-chg { display:flex; align-items:flex-start; gap:12px; padding:11px 12px; border:1px solid var(--line); margin-bottom:5px; }
        .st-when { flex-shrink:0; width:52px; font-family:var(--mono); font-size:10.5px; font-weight:700; color:var(--ink3); padding-top:3px; }
        .st-chg-t { font-family:var(--sans); font-size:13.5px; font-weight:800; color:var(--ink1); letter-spacing:.2px; }
        .st-tag { font-family:var(--mono); font-size:10px; font-weight:700; font-style:normal; letter-spacing:.5px; text-transform:uppercase; padding:2px 6px; margin-left:4px; border:1px solid var(--line); color:var(--ink3); }
        .st-tag.added { border-color:color-mix(in srgb, var(--ok) 40%, transparent); color:var(--ok); }
        .st-tag.removed { border-color:color-mix(in srgb, var(--warn) 45%, transparent); color:var(--warn); }
        .st-tag.changed { border-color:color-mix(in srgb, var(--acc) 40%, transparent); color:var(--acc); }

        .st-empty { border:1px dashed var(--line); padding:18px; font-family:var(--mono); font-size:11.5px; color:var(--ink3); line-height:1.75; }
        .st-link { display:block; margin-top:10px; background:none; border:none; padding:0; color:var(--acc); font-family:var(--mono); font-size:11.5px; font-weight:700; }
      `}</style>
    </Page>
  )
}
