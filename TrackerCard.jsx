import { kmSince, pct, statusOf, badgeText, fmtKm, fmtDate } from '../lib/helpers'

export default function TrackerCard({ tracker, bikeKm, onClick }) {
  const p = pct(tracker, bikeKm)
  const st = statusOf(p)
  const w = Math.round(p * 100)
  const done = kmSince(tracker, bikeKm)
  const rem = Math.max(0, tracker.interval_km - done)

  return (
    <div className={`tc tc-${st}`} onClick={onClick}>
      <div className="tc-inner">
        <div className="tc-top">
          <div className={`tc-ico-wrap ${st}`}>{tracker.icon}</div>
          <div className="tc-info">
            <div className="tc-title">{tracker.title}</div>
            <div className="tc-since">
              Seit {fmtDate(tracker.start_date)} · Start bei {fmtKm(tracker.km_at_start)} km
            </div>
          </div>
          <div className={`tc-badge ${st}`}>{badgeText(st)}</div>
        </div>
        <div className="tc-bar-track">
          <div className={`tc-bar-fill ${st}`} style={{ width: `${w}%` }} />
        </div>
        <div className="tc-labels">
          <div className={`tc-done ${st}`}>{fmtKm(done)} km seit Service</div>
          <div className="tc-rem">{fmtKm(rem)} km verbleibend</div>
        </div>
        {tracker.note && <div className="tc-note">📝 {tracker.note}</div>}
      </div>

      <style>{`
        .tc { background:var(--white);border-radius:var(--r-lg);border:2px solid var(--border);box-shadow:0 4px 0 var(--border);overflow:hidden;cursor:pointer;transition:transform .1s;margin-bottom:10px; }
        .tc:active { transform:scale(.98) translateY(2px);box-shadow:0 2px 0 var(--border); }
        .tc-inner { padding:15px 15px 13px; }
        .tc-top { display:flex;align-items:center;gap:12px;margin-bottom:12px; }
        .tc-ico-wrap { width:44px;height:44px;border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0; }
        .tc-ico-wrap.ok{background:var(--green-l)}.tc-ico-wrap.warn{background:var(--orange-l)}.tc-ico-wrap.crit{background:var(--red-l)}
        .tc-info { flex:1;min-width:0; }
        .tc-title { font-family:'Nunito',sans-serif;font-size:16px;font-weight:800;color:var(--t1);margin-bottom:2px; }
        .tc-since { font-size:12px;color:var(--t3);font-weight:600; }
        .tc-badge { font-family:'Nunito',sans-serif;font-weight:800;font-size:12px;padding:4px 10px;border-radius:50px;flex-shrink:0; }
        .tc-badge.ok{background:var(--green-l);color:var(--green-d)}.tc-badge.warn{background:var(--orange-l);color:var(--orange-d)}.tc-badge.crit{background:var(--red-l);color:var(--red-d)}
        .tc-bar-track { width:100%;height:16px;background:var(--bg);border-radius:50px;overflow:hidden;border:2px solid var(--border);margin-bottom:6px; }
        .tc-bar-fill { height:100%;border-radius:50px;transition:width .5s cubic-bezier(.34,1.1,.64,1); }
        .tc-bar-fill.ok{background:var(--green)}.tc-bar-fill.warn{background:var(--orange)}.tc-bar-fill.crit{background:var(--red)}
        .tc-labels { display:flex;justify-content:space-between; }
        .tc-done { font-family:'Nunito',sans-serif;font-size:13px;font-weight:800; }
        .tc-done.ok{color:var(--green-d)}.tc-done.warn{color:var(--orange-d)}.tc-done.crit{color:var(--red-d)}
        .tc-rem { font-size:12px;color:var(--t3);font-weight:600; }
        .tc-note { font-size:12px;color:var(--t2);font-weight:600;margin-top:8px;padding-top:8px;border-top:2px solid var(--bg); }
      `}</style>
    </div>
  )
}
