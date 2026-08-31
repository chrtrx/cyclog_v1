import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Page, Sheet, Field, BtnGreen, Empty } from '../components/ui'
import {
  getBikes, getTrackers, getRaces, addRace, getEvents, addEvent, deleteEvent,
  getAllServiceLogs, addServiceLog, getHoursByBike,
} from '../lib/data'
import { predictDue, dueDateOf, BIKE_ICONS } from '../lib/helpers'

// Einträge des Kalenders. `due` entsteht rechnerisch aus den Trackern und
// lässt sich daher nicht von Hand anlegen.
const KINDS = {
  race:    { ico: '🏁', label: 'Rennen',  col: 'var(--acc)' },
  service: { ico: '🔧', label: 'Wartung', col: 'var(--ok)' },
  defect:  { ico: '⚠️', label: 'Defekt',  col: 'var(--crit)' },
  crash:   { ico: '💥', label: 'Sturz',   col: 'var(--crit)' },
  flat:    { ico: '🛞', label: 'Panne',   col: 'var(--crit)' },
  note:    { ico: '📝', label: 'Notiz',   col: 'var(--ink3)' },
  due:     { ico: '⏱',  label: 'Fällig',  col: 'var(--warn)' },
}
const ADD_KINDS = ['race', 'service', 'defect', 'crash', 'flat', 'note']
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// Lokaler Tagesschlüssel – bewusst NICHT toISOString(), das rechnet nach UTC
// um und verschiebt Einträge am Monatsrand auf den falschen Tag.
function dayKey(d) {
  const x = d instanceof Date ? d : new Date(d)
  if (isNaN(x.getTime())) return null
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export default function Calendar() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [bikes, setBikes] = useState([])
  const [trackers, setTrackers] = useState([])
  const [races, setRaces] = useState([])
  const [events, setEvents] = useState([])
  const [logs, setLogs] = useState([])
  const [hoursMap, setHoursMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(dayKey(today))
  const [addFor, setAddFor] = useState(null)   // Tagesschlüssel für das Anlegen

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [b, t, r, e, l, h] = await Promise.all([
        getBikes(user.id),
        getTrackers(user.id),
        getRaces(user.id).catch(() => []),
        getEvents(user.id).catch(() => []),
        getAllServiceLogs(user.id).catch(() => []),
        getHoursByBike(user.id).catch(() => ({})),
      ])
      setBikes(b.filter(x => !x.archived)); setTrackers(t)
      setRaces(r); setEvents(e); setLogs(l); setHoursMap(h)
    } catch (err) { showToast('Fehler beim Laden') }
    setLoading(false)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2200) }

  const bikeById = useMemo(() => Object.fromEntries(bikes.map(b => [b.id, b])), [bikes])

  // Alle Quellen auf einen gemeinsamen Nenner bringen: { key, kind, title, sub }
  const byDay = useMemo(() => {
    const map = {}
    const push = (key, entry) => { if (key) (map[key] ||= []).push(entry) }
    const bikeName = (id) => bikeById[id]?.name || ''

    for (const r of races) {
      push(dayKey(r.race_date), {
        id: `r-${r.id}`, kind: 'race', title: r.event_name || 'Rennen',
        sub: [bikeName(r.bike_id), r.placement && `Platz ${r.placement}`, r.duration]
          .filter(Boolean).join(' · '),
        onOpen: () => nav('/races'),
      })
    }
    for (const l of logs) {
      push(dayKey(l.service_date), {
        id: `s-${l.id}`, kind: 'service', title: l.title || 'Wartung', ico: l.icon,
        sub: [bikeName(l.bike_id), l.km_ridden != null && `${Math.round(l.km_ridden).toLocaleString('de')} km Laufzeit`]
          .filter(Boolean).join(' · '),
        onOpen: l.bike_id ? () => nav(`/bike/${l.bike_id}`) : null,
      })
    }
    for (const ev of events) {
      push(dayKey(ev.event_date), {
        id: `e-${ev.id}`, kind: KINDS[ev.kind] ? ev.kind : 'defect', title: ev.title,
        sub: [bikeName(ev.bike_id), ev.note].filter(Boolean).join(' · '),
        deletable: ev.id,
      })
    }
    // Prognostizierte Fälligkeiten aus den laufenden Trackern
    for (const t of trackers) {
      const bike = bikeById[t.bike_id]
      if (!bike) continue
      const due = t.interval_type === 'date'
        ? dueDateOf(t)
        : predictDue(t, bike.km, hoursMap[bike.id] || 0)?.dueDate
      if (!due) continue
      push(dayKey(due), {
        id: `d-${t.id}`, kind: 'due', title: `${t.title} fällig`, ico: t.icon,
        sub: `${bike.name} · voraussichtlich`,
        onOpen: () => nav('/'),
      })
    }
    return map
  }, [races, logs, events, trackers, bikeById, hoursMap, nav])

  // 6 Wochen × 7 Tage, beginnend am Montag – auch die Randtage der
  // Nachbarmonate werden gezeigt (abgeblendet), damit das Raster stabil bleibt.
  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth()
    const offset = (new Date(y, m, 1).getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(y, m, 1 - offset + i)
      return { date: d, key: dayKey(d), inMonth: d.getMonth() === m }
    })
  }, [cursor])

  const todayKey = dayKey(today)
  const dayEntries = byDay[selected] || []
  const selDate = selected ? new Date(selected) : null

  function shiftMonth(n) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1))
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(todayKey)
  }

  return (
    <Page title="Kalender" subtitle="Wartung · Rennen · Ereignisse" back="/more">
      {loading ? null : (
        <>
          <div className="cal-nav">
            <button className="cal-arrow" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat">‹</button>
            <div className="cal-month">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
            <button className="cal-today" onClick={goToday}>Heute</button>
            <button className="cal-arrow" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">›</button>
          </div>

          <div className="cal-grid cal-head">
            {WEEKDAYS.map(w => <div key={w} className="cal-wd">{w}</div>)}
          </div>
          <div className="cal-grid">
            {cells.map(c => {
              const list = byDay[c.key] || []
              const kinds = [...new Set(list.map(e => e.kind))].slice(0, 4)
              return (
                <button key={c.key}
                  className={`cal-day ${c.inMonth ? '' : 'out'} ${c.key === todayKey ? 'today' : ''} ${c.key === selected ? 'sel' : ''}`}
                  onClick={() => setSelected(c.key)}>
                  <span className="cal-num">{c.date.getDate()}</span>
                  <span className="cal-dots">
                    {kinds.map(k => <i key={k} style={{ background: KINDS[k].col }} />)}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="cal-legend">
            {['race', 'service', 'due', 'defect'].map(k => (
              <span key={k} className="cal-lg"><i style={{ background: KINDS[k].col }} />{KINDS[k].label}</span>
            ))}
          </div>

          <div className="cal-sec">
            <div className="cal-sec-t">
              {selDate ? selDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }) : '—'}
            </div>
            <button className="cal-add" onClick={() => setAddFor(selected)}>＋ Eintrag</button>
          </div>

          {dayEntries.length === 0 ? (
            <div className="cal-empty">Nichts eingetragen. Tippe auf „＋ Eintrag".</div>
          ) : dayEntries.map(e => {
            const k = KINDS[e.kind]
            return (
              <div key={e.id} className="cal-row" onClick={e.onOpen || undefined}
                style={{ cursor: e.onOpen ? 'pointer' : 'default' }}>
                <span className="cal-row-ico" style={{ borderColor: k.col }}>{e.ico || k.ico}</span>
                <span className="cal-row-body">
                  <span className="cal-row-t">{e.title}</span>
                  {e.sub && <span className="cal-row-s">{e.sub}</span>}
                </span>
                {e.deletable && (
                  <button className="cal-del" aria-label="Löschen" onClick={async (ev) => {
                    ev.stopPropagation()
                    setEvents(prev => prev.filter(x => x.id !== e.deletable))
                    try { await deleteEvent(e.deletable) } catch { showToast('Löschen fehlgeschlagen'); load() }
                  }}>✕</button>
                )}
              </div>
            )
          })}
        </>
      )}

      {addFor && (
        <AddEntrySheet
          user={user} bikes={bikes} date={addFor}
          onClose={() => setAddFor(null)}
          onSaved={async (msg) => { setAddFor(null); await load(); showToast(msg) }}
        />
      )}

      {toast && <div className="cal-toast">{toast}</div>}

      <style>{`
        .cal-nav { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
        .cal-arrow { width:38px; height:38px; flex-shrink:0; background:var(--panel2); border:1px solid var(--line); color:var(--ink1); font-size:20px; font-family:var(--sans); line-height:1; }
        .cal-arrow:active { background:var(--panel); }
        .cal-month { flex:1; font-family:var(--sans); font-size:15px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:var(--ink1); }
        .cal-today { flex-shrink:0; background:none; border:1px solid rgba(47,123,255,.35); color:var(--acc); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:9px 12px; }

        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
        .cal-head { margin-bottom:4px; }
        .cal-wd { text-align:center; font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); padding-bottom:2px; }
        .cal-day { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; background:var(--panel2); border:1px solid var(--line); padding:0; }
        .cal-day.out { opacity:.35; }
        .cal-day.today { border-color:var(--acc); }
        .cal-day.sel { background:rgba(47,123,255,.14); border-color:var(--acc); }
        .cal-num { font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--ink1); line-height:1; }
        .cal-day.today .cal-num { color:var(--acc); }
        .cal-dots { display:flex; gap:2px; height:5px; align-items:center; }
        .cal-dots i { width:5px; height:5px; border-radius:50%; display:block; }

        .cal-legend { display:flex; flex-wrap:wrap; gap:4px 12px; margin:12px 0 4px; }
        .cal-lg { display:flex; align-items:center; gap:5px; font-family:var(--mono); font-size:10.5px; color:var(--ink3); letter-spacing:.3px; }
        .cal-lg i { width:6px; height:6px; border-radius:50%; display:block; }

        .cal-sec { display:flex; align-items:center; gap:10px; margin:18px 0 10px; }
        .cal-sec-t { flex:1; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink2); }
        .cal-add { flex-shrink:0; background:var(--acc); color:#fff; border:none; font-family:var(--sans); font-size:12px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; padding:9px 13px; }
        .cal-add:active { background:var(--acc-d); }

        .cal-empty { padding:20px; text-align:center; font-family:var(--mono); font-size:11.5px; color:var(--ink3); border:1px dashed var(--line); }
        .cal-row { display:flex; align-items:flex-start; gap:11px; padding:11px 12px; border:1px solid var(--line); margin-bottom:6px; }
        .cal-row-ico { flex-shrink:0; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:14px; border:1px solid; }
        .cal-row-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
        .cal-row-t { font-family:var(--sans); font-size:13.5px; font-weight:800; letter-spacing:.3px; color:var(--ink1); }
        .cal-row-s { font-family:var(--mono); font-size:10.5px; color:var(--ink3); line-height:1.45; }
        .cal-del { flex-shrink:0; background:none; border:none; color:var(--ink3); font-size:13px; padding:2px 4px; }

        .cal-toast { position:fixed; left:50%; bottom:96px; transform:translateX(-50%); background:var(--panel2); border:1px solid var(--line); color:var(--ink1); font-family:var(--mono); font-size:12px; padding:11px 16px; z-index:1400; }
      `}</style>
    </Page>
  )
}

// ─── Eintrag anlegen ───────────────────────────────────────
// Speichert bewusst in die bestehenden Tabellen: Rennen landen im
// Renntagebuch, Wartungen in der Rad-Historie. So bleibt der Kalender eine
// gemeinsame Ansicht statt einer zweiten, konkurrierenden Datenhaltung.
function AddEntrySheet({ user, bikes, date, onClose, onSaved }) {
  const [kind, setKind] = useState('defect')
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(date)
  const [bikeId, setBikeId] = useState(bikes[0]?.id || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!title.trim() || saving) return
    setSaving(true); setErr('')
    try {
      if (kind === 'race') {
        await addRace(user.id, { event_name: title.trim(), race_date: when, bike_id: bikeId || null })
      } else if (kind === 'service') {
        const bike = bikes.find(b => b.id === bikeId)
        await addServiceLog(user.id, {
          bike_id: bikeId, service_type: 'manual', title: title.trim(), icon: '🔧',
          service_date: new Date(`${when}T12:00:00`).toISOString(),
          km_at_service: bike?.km ?? null,
        })
      } else {
        await addEvent(user.id, {
          bike_id: bikeId || null, event_date: when, kind,
          title: title.trim(), note: note.trim() || null,
        })
      }
      onSaved(`✓ ${KINDS[kind].label} eingetragen`)
    } catch (e) {
      setSaving(false)
      // Fehlt die Tabelle noch (Datenbank-Update nicht gelaufen), ist die
      // rohe Postgres-Meldung für Anwender wertlos – daher übersetzen.
      const raw = `${e?.code || ''} ${e?.message || ''}`
      const missing = /42P01|PGRST205|does not exist|schema cache/i.test(raw)
      setErr(missing
        ? 'Ereignisse lassen sich noch nicht speichern: Das Datenbank-Update steht aus. Rennen und Wartungen kannst du bereits eintragen.'
        : `Speichern fehlgeschlagen: ${e?.message || 'unbekannter Fehler'}`)
    }
  }

  const needsBike = kind === 'service'

  return (
    <Sheet title="Eintrag hinzufügen" sub={new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })} onClose={onClose}>
      <div className="ae-lbl">Art</div>
      <div className="ae-kinds">
        {ADD_KINDS.map(k => (
          <button key={k} className={`ae-kind ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            {KINDS[k].ico} {KINDS[k].label}
          </button>
        ))}
      </div>

      <Field label={kind === 'race' ? 'Renn-Name' : kind === 'service' ? 'Was wurde gemacht?' : 'Was ist passiert?'}
        value={title} onChange={setTitle}
        placeholder={kind === 'race' ? 'z. B. Ötztaler' : kind === 'service' ? 'z. B. Kette gewechselt' : 'z. B. Kettenriss am Berg'} />

      <Field label="Datum" value={when} onChange={setWhen} type="date" />

      {bikes.length > 0 && (
        <>
          <div className="ae-lbl">Rad {needsBike ? '' : '(optional)'}</div>
          <div className="ae-bikes">
            {!needsBike && (
              <button className={`ae-bike ${!bikeId ? 'on' : ''}`} onClick={() => setBikeId('')}>— keins</button>
            )}
            {bikes.map(b => (
              <button key={b.id} className={`ae-bike ${bikeId === b.id ? 'on' : ''}`} onClick={() => setBikeId(b.id)}>
                {BIKE_ICONS[b.type] || '🚲'} {b.name}
              </button>
            ))}
          </div>
        </>
      )}

      {kind !== 'race' && kind !== 'service' && (
        <>
          <div className="ae-lbl">Notiz (optional)</div>
          <textarea className="ae-note" value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Details, Kosten, Werkstatt …" />
        </>
      )}

      {err && <div className="ae-err">⚠ {err}</div>}

      <BtnGreen onClick={save} disabled={!title.trim() || (needsBike && !bikeId) || saving}>
        {saving ? 'Speichert…' : 'Speichern'}
      </BtnGreen>

      <style>{`
        .ae-lbl { font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink3); margin-bottom:8px; }
        .ae-kinds { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
        .ae-kind { background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--sans); font-size:12.5px; font-weight:700; padding:10px 12px; }
        .ae-kind.on { background:rgba(47,123,255,.12); border-color:var(--acc); color:var(--acc); }
        .ae-bikes { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
        .ae-bike { background:var(--panel2); border:1px solid var(--line); color:var(--ink2); font-family:var(--mono); font-size:11.5px; font-weight:700; padding:9px 11px; }
        .ae-bike.on { background:rgba(47,123,255,.12); border-color:var(--acc); color:var(--acc); }
        .ae-note { width:100%; background:var(--panel2); border:1px solid var(--line); color:var(--ink1); font-family:var(--mono); font-size:12.5px; padding:11px; margin-bottom:16px; resize:vertical; }
        .ae-note:focus { outline:none; border-color:var(--acc); }
        .ae-err { border:1px solid rgba(224,86,110,.45); background:rgba(224,86,110,.08); color:var(--ink2); font-family:var(--mono); font-size:11.5px; line-height:1.55; padding:10px 12px; margin-bottom:12px; }
      `}</style>
    </Sheet>
  )
}
