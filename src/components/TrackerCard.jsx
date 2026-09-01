import { useState, useEffect, useRef } from 'react'
import DotBar from './DotBar'
import { kmSince, hoursSince, daysSince, dueDateOf, daysUntilDue, pct, statusOf, fmtKm, fmtH, fmtDate, predictDue } from '../lib/helpers'

// Anschauliche km-gewichtete Verschleiß-Statistik eines Trackers:
// zwei gestapelte Balken (Wetter + Intensität) mit Prozent-Legende.
export function CondStats({ conditions, compact = false }) {
  if (!conditions) return null
  const weather = [
    ['☀️', conditions.weather.dry, 'var(--warn)'],
    ['💧', conditions.weather.wet, 'var(--acc-soft)'],
    ['🌧️', conditions.weather.rain, 'var(--acc)'],
  ]
  const intensity = [
    ['🟢', conditions.intensity.easy, 'var(--ok)'],
    ['🟡', conditions.intensity.mixed, 'var(--warn)'],
    ['🔴', conditions.intensity.hard, 'var(--crit)'],
  ]
  const Row = ({ items }) => (
    <div className="cs-row">
      <div className="cs-bar">
        {items.filter(([, p]) => p > 0).map(([ico, p, col]) => (
          <div key={ico} style={{ width: `${p}%`, background: col }} />
        ))}
      </div>
      <div className="cs-leg">{items.filter(([, p]) => p > 0).map(([ico, p]) => `${ico} ${p}%`).join(' · ')}</div>
    </div>
  )
  return (
    <div className="cs">
      {!compact && <div className="cs-hdr">📊 Bedingungen · {conditions.totalKm.toLocaleString('de')} km erfasst</div>}
      <Row items={weather} />
      <Row items={intensity} />
      <style>{`
        .cs { margin-bottom: 10px; }
        .cs-hdr { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--ink3); margin-bottom: 6px; }
        .cs-row { margin-bottom: 6px; }
        .cs-bar { display: flex; height: 6px; background: var(--panel2); border: 1px solid var(--line); overflow: hidden; margin-bottom: 3px; }
        .cs-bar div { height: 100%; }
        .cs-leg { font-family: var(--mono); font-size: 10.5px; color: var(--ink2); letter-spacing: .3px; }
      `}</style>
    </div>
  )
}

// EIN Belastungs-Balken: gefüllt bis zum Tracker-Fortschritt, der gefüllte
// Teil ist nach Intensität unterteilt (hart → mittel → locker). Wetter steht
// als Satz darunter; ein Tipp auf ein Segment klappt die Tiefen-Info auf
// ("Hart: 620 km · Ø 262 W · davon 30 % Regen").
const LB_LEVELS = [
  ['hard', '🔴', 'hart', 'var(--crit)'],
  ['mixed', '🟡', 'mittel', 'var(--warn)'],
  ['easy', '🟢', 'locker', 'var(--ok)'],
]
const LB_WX = [['rain', '🌧️', 'im Regen'], ['wet', '💧', 'nass'], ['dry', '☀️', 'trocken']]

function wxLine(weather, withKm) {
  const parts = LB_WX.filter(([k]) => (weather[k] || 0) > 0)
    .map(([k, ico, lbl], i) => `${ico} ${weather[k]} %${i === 0 && withKm ? ' der km' : ''} ${lbl}`)
  return parts.join(' · ')
}

export function LoadBar({ conditions, progress }) {
  const [sel, setSel] = useState(null)
  if (!conditions || !conditions.totalKm) return null
  const fillPct = Math.min(100, Math.max(0, progress))
  const segs = LB_LEVELS
    .map(([k, ico, lbl, col]) => ({ k, ico, lbl, col, pct: conditions.intensity[k] || 0 }))
    .filter(s => s.pct > 0)
  const by = sel ? conditions.byIntensity?.[sel] : null
  const selSeg = sel ? segs.find(s => s.k === sel) : null
  return (
    <div className="lb">
      <div className="lb-hdr">
        <span>Belastung</span>
        {conditions.avgWatts ? <span className="lb-w">Ø {conditions.avgWatts} W</span> : null}
      </div>
      <div className="lb-bar">
        {segs.map(s => (
          <div key={s.k} className={sel && sel !== s.k ? 'lb-dim' : ''}
            style={{ width: `${s.pct * fillPct / 100}%`, background: s.col }}
            onClick={e => { e.stopPropagation(); setSel(sel === s.k ? null : s.k) }} />
        ))}
      </div>
      <div className="lb-leg">
        {segs.map(s => (
          <button key={s.k} className={`lb-lvl ${sel === s.k ? 'on' : ''}`}
            onClick={e => { e.stopPropagation(); setSel(sel === s.k ? null : s.k) }}>
            {s.ico} {s.pct} % {s.lbl}
          </button>
        ))}
      </div>
      <div className="lb-wx">{wxLine(conditions.weather, true)}</div>
      {by && selSeg && (
        <div className="lb-sub">
          ▾ <b style={{ color: selSeg.col }}>{selSeg.lbl.charAt(0).toUpperCase() + selSeg.lbl.slice(1)}</b>
          : {fmtKm(by.km)} km{by.avgWatts ? ` · Ø ${by.avgWatts} W` : ''} · davon {wxLine(by.weather, false)}
        </div>
      )}
      <style>{`
        .lb { margin-bottom: 10px; }
        .lb-hdr { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--ink3); }
        .lb-w { color:var(--ink2); }
        .lb-bar { display:flex; height:14px; background:var(--panel2); border:1px solid var(--line); overflow:hidden; }
        .lb-bar div { height:100%; transition:opacity .15s; }
        .lb-dim { opacity:.3; }
        .lb-leg { display:flex; flex-wrap:wrap; gap:2px 10px; margin-top:5px; }
        .lb-lvl { background:none; border:none; padding:0; font-family:var(--mono); font-size:10.5px; color:var(--ink2); letter-spacing:.3px; }
        .lb-lvl.on { color:var(--ink1); font-weight:700; }
        .lb-wx { font-family:var(--mono); font-size:10.5px; color:var(--ink3); letter-spacing:.3px; margin-top:3px; }
        .lb-sub { margin-top:7px; padding:7px 9px; background:var(--panel2); border:1px solid var(--line); font-family:var(--mono); font-size:10.5px; color:var(--ink2); line-height:1.55; }
        .lb-sub b { font-weight:700; }
      `}</style>
    </div>
  )
}

export default function TrackerCard({ tracker, bikeKm, bikeHours = 0, conditions, onClick, onPin }) {
  const isH    = tracker.interval_type === 'h'
  const isDate = tracker.interval_type === 'date'
  const p      = pct(tracker, bikeKm, bikeHours)
  const st     = statusOf(p)
  const w      = Math.round(p * 100)

  const [open, setOpen] = useState(st === 'crit')
  const rootRef = useRef(null)
  const mounted = useRef(false)

  // Beim Aufklappen die Karte in den sichtbaren Bereich rollen, damit auch die
  // unterste Karte nicht halb hinter der Navigationsleiste verschwindet.
  // Das anfängliche Auto-Öffnen kritischer Karten (beim Mount) wird übersprungen.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    if (open && rootRef.current) {
      const t = setTimeout(() => {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 60)
      return () => clearTimeout(t)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`tc tc-${st}`} onClick={() => setOpen(o => !o)}>

      {/* Kompakte Zeile */}
      <div className="tc-row">
        <span className="tc-ico">{tracker.icon}</span>
        <span className="tc-name">{tracker.title}</span>
        <DotBar value={p} dots={18} cell={4} color={`var(--${st})`} />
        <span className={`tc-pct tc-pct-${st}`}>{w}%</span>
        {onPin && (
          <button className={`tc-pin ${tracker.pinned ? 'on' : ''}`} onClick={e => { e.stopPropagation(); onPin() }}>
            {tracker.pinned ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Ausgeklappt: Details */}
      {open && (() => {
        if (isDate) {
          const due = dueDateOf(tracker)
          const remDays = daysUntilDue(tracker)
          const dueFmt = due
            ? due.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'
          const remLabel = remDays == null ? '' : remDays > 0
            ? `noch ${remDays} Tage`
            : remDays === 0 ? 'heute fällig'
            : `${Math.abs(remDays)} Tage überfällig`
          return (
            <div className="tc-detail" onClick={e => e.stopPropagation()}>
              <div className="tc-stats">
                <span>📅 Fällig: {dueFmt}</span>
              </div>
              <div className="tc-meta">{remLabel} · seit {fmtDate(tracker.start_date)}</div>
              {tracker.note && <div className="tc-note">📝 {tracker.note}</div>}
              <button className="tc-action" onClick={onClick}>
                {st === 'crit' ? 'Als erledigt markieren' : 'Bearbeiten'}
              </button>
            </div>
          )
        }

        const pred = predictDue(tracker, bikeKm, bikeHours)
        const fmt  = isH ? fmtH : fmtKm
        const unit = isH ? 'h' : 'km'
        const done = isH ? hoursSince(tracker, bikeHours) : kmSince(tracker, bikeKm)
        const interval = isH ? (tracker.interval_hours || 0) : (tracker.interval_km || 0)
        const rem  = Math.max(0, interval - done)

        return (
          <div className="tc-detail" onClick={e => e.stopPropagation()}>
            <div className="tc-stats">
              <span>{fmt(done)} {unit} gefahren</span>
              <span className="tc-dot">·</span>
              <span>{fmt(rem)} {unit} übrig</span>
            </div>
            <div className="tc-meta">
              seit {fmtDate(tracker.start_date)} · Start {fmtKm(tracker.km_at_start)} km
            </div>
            <LoadBar conditions={conditions} progress={w} />
            {pred && (
              <div className="tc-pred">
                <div className="tc-pred-hdr">
                  <span className="tc-pred-lbl">⏱ Prognose</span>
                  <span className="tc-pred-val">~{pred.weeks} Wo. · ca. {pred.dueDateStr}</span>
                </div>
                <div className="tc-pred-track">
                  <div className="tc-pred-fill" style={{ transform: `scaleX(${pred.timePct})` }} />
                </div>
              </div>
            )}
            {tracker.note && <div className="tc-note">📝 {tracker.note}</div>}
            <button className="tc-action" onClick={onClick}>
              {st === 'crit' ? 'Wartung eintragen' : 'Bearbeiten'}
            </button>
          </div>
        )
      })()}

      <style>{`
        .tc { border:1px solid var(--line);margin-bottom:6px;cursor:pointer;overflow:hidden; }
        .tc-warn { border-color:color-mix(in srgb, var(--warn) 40%, transparent); }
        .tc-crit { border-color:color-mix(in srgb, var(--crit) 40%, transparent);background:color-mix(in srgb, var(--crit) 3%, transparent); }
        .tc-row { display:flex;align-items:center;gap:10px;padding:11px 13px; }
        .tc-ico { font-size:17px;flex-shrink:0;width:24px;text-align:center; }
        .tc-name { flex:1;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--ink1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0; }
        .tc-pct { font-family:var(--sans);font-size:14px;font-weight:900;letter-spacing:-.5px;flex-shrink:0;width:36px;text-align:right; }
        .tc-pct-ok{color:var(--ink3)}.tc-pct-warn{color:var(--warn)}.tc-pct-crit{color:var(--crit)}
        .tc-pin { background:none;border:none;padding:0 2px 0 6px;font-size:14px;color:var(--ink3);flex-shrink:0;line-height:1; }
        .tc-pin.on { color:var(--warn); }
        .tc-detail { padding:0 13px 12px;border-top:1px solid var(--line); }
        .tc-stats { display:flex;align-items:center;gap:8px;padding-top:11px;margin-bottom:3px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--ink1); }
        .tc-dot { color:var(--ink3); }
        .tc-meta { font-family:var(--mono);font-size:10.5px;color:var(--ink3);margin-bottom:10px; }
        .tc-note { font-family:var(--mono);font-size:11px;color:var(--ink2);margin-bottom:10px; }
        .tc-pred { margin-bottom:10px; }
        .tc-pred-hdr { display:flex;justify-content:space-between;align-items:center;margin-bottom:5px; }
        .tc-pred-lbl { font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink3); }
        .tc-pred-val { font-family:var(--mono);font-size:11px;font-weight:700;color:var(--acc); }
        .tc-pred-track { height:4px;background:var(--panel2);border:1px solid var(--line);overflow:hidden; }
        .tc-pred-fill { height:100%;width:100%;background:var(--acc);opacity:.5;transform-origin:left center;transition:transform .4s ease-out; }
        .tc-action { font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--acc);background:none;border:1px solid color-mix(in srgb, var(--acc) 30%, transparent);padding:8px 13px;cursor:pointer; }
        .tc-action:active { background:color-mix(in srgb, var(--acc) 8%, transparent); }
      `}</style>
    </div>
  )
}
