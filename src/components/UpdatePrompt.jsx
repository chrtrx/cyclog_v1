import { useRegisterSW } from 'virtual:pwa-register/react'

// Zeigt oben einen Banner, sobald eine neue App-Version bereitsteht. Ein Tippen
// aktiviert den neuen Service Worker und lädt die App neu. Zusätzlich wird beim
// Öffnen und stündlich nach Updates gesucht, damit der Banner zuverlässig kommt.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return
      const check = () => { if (document.visibilityState === 'visible') r.update() }
      setInterval(check, 60 * 60 * 1000)          // stündlich
      document.addEventListener('visibilitychange', check)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="upd-banner" onClick={() => updateServiceWorker(true)}>
      <span className="upd-dot" />
      <span className="upd-txt">Neue Version verfügbar</span>
      <button className="upd-btn" onClick={(e) => { e.stopPropagation(); updateServiceWorker(true) }}>
        Neu laden
      </button>
      <style>{`
        .upd-banner {
          position: fixed; top: calc(env(safe-area-inset-top) + 10px); left: 50%; transform: translateX(-50%);
          width: min(440px, calc(100vw - 20px)); z-index: 1300;
          display: flex; align-items: center; gap: 10px;
          background: var(--panel2); border: 1px solid var(--acc);
          border-radius: 12px; padding: 11px 14px; cursor: pointer;
          box-shadow: 0 14px 38px rgba(0,0,0,.5);
          animation: updDrop .28s cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes updDrop { from { transform: translate(-50%, -120%); } to { transform: translate(-50%, 0); } }
        .upd-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--acc); flex-shrink: 0; }
        .upd-txt { flex: 1; font-family: var(--sans); font-size: 14px; font-weight: 800; letter-spacing: .3px; color: var(--ink1); }
        .upd-btn { flex-shrink: 0; background: var(--acc); color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
      `}</style>
    </div>
  )
}
