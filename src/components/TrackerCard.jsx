import { kmSince, pct, statusOf, badgeText, fmtKm, fmtDate } from '../lib/helpers'

export default function TrackerCard({ tracker, bikeKm, onClick }) {
  const p = pct(tracker, bikeKm)
  const st = statusOf(p)
  const w = Math.round(p * 100)
  const done = kmSince(tracker, bikeKm)
  const rem = Math.max(0, tracker.interval_km - done)

  return (
    <div className={`tc tc-${st}`} onClick={onClick}>
      <div className="tc-idx" />
      <div className="tc-inner">
        <div className="tc-top">
          <div className={`tc-ico-wrap ${st}`}>{tracker.icon}</div>
          <div className="tc-info">
            <div className="tc-title">{tracker.title}</div>
            <div className="tc-since">
              seit {fmtDate(tracker.start_date)} · start {fmtKm(tracker.km_at_start)} km
            </div>
          </div>
          <div className={`tc-badge ${st}`}>{badgeText(st)}</div>
        </div>
        <div className="tc-bar-track">
          <div className={`tc-bar-fill ${st}`} style={{ width: `${w}%` }} />
          <div className="tc-bar-ticks" />
        </div>
        <div className="tc-labels">
          <div className={`tc-done ${st}`}>{fmtKm(done)} km gefahren</div>
          <div className="tc-rem">{fmtKm(rem)} km übrig</div>
        </div>
        {tracker.note && <div className="tc-note">📝 {tracker.note}</div>}
      </div>

      <style>{`
        .tc { position:relative;background:linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.015));border:1px solid var(--line);overflow:hidden;cursor:pointer;transition:background .12s;margin-bottom:10px; }
        .tc:active { background:rgba(255,255,255,.02); }
        .tc-idx { position:absolute;left:0;top:0;bottom:0;width:3px; }
        .tc-ok .tc-idx{background:var(--ok)}.tc-warn .tc-idx{background:var(--warn)}.tc-crit .tc-idx{background:var(--crit)}
        .tc-inner { padding:14px 15px 13px 17px; }
        .tc-top { display:flex;align-items:center;gap:12px;margin-bottom:12px; }
        .tc-ico-wrap { width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;border:1px solid var(--line); }
        .tc-ico-wrap.ok{background:rgba(52,199,154,.10)}.tc-ico-wrap.warn{background:rgba(224,168,77,.10)}.tc-ico-wrap.crit{background:rgba(224,86,110,.10)}
        .tc-info { flex:1;min-width:0; }
        .tc-title { font-family:var(--sans);font-size:16px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--ink1);margin-bottom:2px; }
        .tc-since { font-family:var(--mono);font-size:10.5px;color:var(--ink3);letter-spacing:.5px;text-transform:uppercase; }
        .tc-badge { font-family:var(--mono);font-weight:700;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;padding:5px 9px;flex-shrink:0;border:1px solid transparent; }
        .tc-badge.ok{background:rgba(52,199,154,.08);color:var(--ok);border-color:rgba(52,199,154,.3)}.tc-badge.warn{background:rgba(224,168,77,.08);color:var(--warn);border-color:rgba(224,168,77,.3)}.tc-badge.crit{background:rgba(224,86,110,.08);color:var(--crit);border-color:rgba(224,86,110,.3)}
        .tc-bar-track { position:relative;width:100%;height:10px;background:var(--panel2);overflow:hidden;border:1px solid var(--line);margin-bottom:8px; }
        .tc-bar-fill { height:100%;transition:width .5s cubic-bezier(.34,1.1,.64,1); }
        .tc-bar-fill.ok{background:var(--ok)}.tc-bar-fill.warn{background:var(--warn)}.tc-bar-fill.crit{background:var(--crit)}
        .tc-bar-ticks { position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(90deg,transparent 0,transparent 9.5%,var(--line) 9.5%,var(--line) 10%); }
        .tc-labels { display:flex;justify-content:space-between; }
        .tc-done { font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px; }
        .tc-done.ok{color:var(--ok)}.tc-done.warn{color:var(--warn)}.tc-done.crit{color:var(--crit)}
        .tc-rem { font-family:var(--mono);font-size:11.5px;color:var(--ink3);letter-spacing:.5px; }
        .tc-note { font-family:var(--mono);font-size:11px;color:var(--ink2);margin-top:9px;padding-top:9px;border-top:1px solid var(--line); }
      `}</style>
    </div>
  )
}
