import { useState, useEffect, useRef } from 'react'
import { kmSince, hoursSince, daysSince, dueDateOf, daysUntilDue, pct, statusOf, fmtKm, fmtH, fmtDate, predictDue } from '../lib/helpers'

export default function TrackerCard({ tracker, bikeKm, bikeHours = 0, onClick, onPin }) {
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
        <div className="tc-bar-track">
          <div className={`tc-bar-fill tc-fill-${st}`} style={{ transform: `scaleX(${w / 100})` }} />
        </div>
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
        .tc-warn { border-color:rgba(224,168,77,.4); }
        .tc-crit { border-color:rgba(224,86,110,.4);background:rgba(224,86,110,.03); }
        .tc-row { display:flex;align-items:center;gap:10px;padding:11px 13px; }
        .tc-ico { font-size:17px;flex-shrink:0;width:24px;text-align:center; }
        .tc-name { flex:1;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--ink1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0; }
        .tc-bar-track { flex:0 0 72px;height:7px;background:var(--panel2);border:1px solid var(--line);overflow:hidden; }
        .tc-bar-fill { height:100%;width:100%;transform-origin:left center;transition:transform .4s ease-out; }
        .tc-fill-ok{background:var(--ok)}.tc-fill-warn{background:var(--warn)}.tc-fill-crit{background:var(--crit)}
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
        .tc-action { font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--acc);background:none;border:1px solid rgba(47,123,255,.3);padding:8px 13px;cursor:pointer; }
        .tc-action:active { background:rgba(47,123,255,.08); }
      `}</style>
    </div>
  )
}
