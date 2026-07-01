import { useState, useEffect } from 'react'
import { CHANGELOG, APP_VERSION } from '../lib/changelog'

// Zeigt nach einem Update beim Öffnen der App kurz, was neu ist bzw. geändert
// wurde. Merkt sich die zuletzt gesehene Version in localStorage und blendet
// nur Einträge ein, die neuer sind.
const KEY = 'cyclog_seen_version'
const TYPE = { new: ['Neu', 'var(--ok)'], fix: ['Behoben', 'var(--acc)'], change: ['Geändert', 'var(--warn)'] }

export default function WhatsNew() {
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    const seen = parseInt(localStorage.getItem(KEY) || '0', 10) || 0
    if (APP_VERSION > seen) {
      const e = CHANGELOG.filter(c => c.v > seen)
      if (e.length) setEntries(e)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(KEY, String(APP_VERSION))
    setEntries(null)
  }

  if (!entries) return null
  const items = entries.flatMap(e => e.items)
  const date = entries[0].date

  return (
    <div className="wn-overlay" onClick={dismiss}>
      <div className="wn-card" onClick={(e) => e.stopPropagation()}>
        <div className="wn-head">
          <span className="wn-spark">✨</span>
          <div>
            <div className="wn-title">Was ist neu</div>
            <div className="wn-sub">Aktualisiert am {date}</div>
          </div>
        </div>
        <div className="wn-list">
          {items.map(([type, text], i) => {
            const [lbl, col] = TYPE[type] || TYPE.new
            return (
              <div className="wn-item" key={i}>
                <span className="wn-tag" style={{ color: col, borderColor: col }}>{lbl}</span>
                <span className="wn-text">{text}</span>
              </div>
            )
          })}
        </div>
        <button className="wn-btn" onClick={dismiss}>Alles klar</button>
      </div>
      <style>{`
        .wn-overlay {
          position: fixed; inset: 0; z-index: 1250; display: flex; align-items: center; justify-content: center;
          background: rgba(3,7,16,.72); backdrop-filter: blur(3px); padding: 20px;
          animation: wnFade .2s ease;
        }
        @keyframes wnFade { from { opacity: 0; } to { opacity: 1; } }
        .wn-card {
          width: min(460px, 100%); max-height: 82vh; display: flex; flex-direction: column;
          background: var(--panel2); border: 1px solid var(--line); border-radius: 16px;
          padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.6);
          animation: wnPop .28s cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes wnPop { from { transform: translateY(16px) scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }
        .wn-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .wn-spark { font-size: 26px; }
        .wn-title { font-family: var(--sans); font-size: 19px; font-weight: 900; letter-spacing: -.3px; color: var(--ink1); }
        .wn-sub { font-family: var(--mono); font-size: 11px; color: var(--ink3); margin-top: 2px; }
        .wn-list { overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
        .wn-item { display: flex; align-items: flex-start; gap: 10px; }
        .wn-tag {
          flex-shrink: 0; font-family: var(--mono); font-size: 9px; font-weight: 800; letter-spacing: .5px;
          text-transform: uppercase; padding: 3px 7px; border: 1px solid; border-radius: 6px; margin-top: 1px;
        }
        .wn-text { font-family: var(--sans); font-size: 14px; line-height: 1.45; color: var(--ink1); }
        .wn-btn {
          margin-top: 18px; width: 100%; background: var(--acc); color: #fff; border: none; border-radius: 10px;
          padding: 14px; font-family: var(--sans); font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}
