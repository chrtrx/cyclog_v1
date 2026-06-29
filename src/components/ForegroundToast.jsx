import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Zeigt eingehende Push-Nachrichten als Banner an, während die App offen ist
// (der Service Worker schickt sie per postMessage an die offenen Fenster).
export default function ForegroundToast() {
  const [msg, setMsg] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (e) => {
      if (e.data?.type === 'cyclog-push') {
        setMsg({ title: e.data.title, body: e.data.body, url: e.data.url || '/' })
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => setMsg(null), 6000)
    return () => clearTimeout(id)
  }, [msg])

  if (!msg) return null

  return (
    <div className="fg-toast" onClick={() => { const u = msg.url; setMsg(null); nav(u || '/') }}>
      <div className="fg-icon">🔔</div>
      <div className="fg-body">
        <div className="fg-title">{msg.title}</div>
        {msg.body && <div className="fg-text">{msg.body}</div>}
      </div>
      <button className="fg-close" onClick={(e) => { e.stopPropagation(); setMsg(null) }} aria-label="Schließen">✕</button>
      <style>{`
        .fg-toast {
          position: fixed; top: calc(env(safe-area-inset-top) + 10px); left: 50%; transform: translateX(-50%);
          width: min(440px, calc(100vw - 20px)); z-index: 1200;
          display: flex; align-items: flex-start; gap: 11px;
          background: var(--panel2); border: 1px solid var(--acc);
          border-radius: 12px; padding: 12px 14px; cursor: pointer;
          box-shadow: 0 14px 38px rgba(0,0,0,.5);
          animation: fgDrop .28s cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes fgDrop { from { transform: translate(-50%, -120%); } to { transform: translate(-50%, 0); } }
        .fg-icon { font-size: 18px; flex-shrink: 0; }
        .fg-body { flex: 1; min-width: 0; }
        .fg-title { font-family: var(--sans); font-size: 14px; font-weight: 800; letter-spacing: .3px; color: var(--ink1); }
        .fg-text { font-family: var(--mono); font-size: 11px; color: var(--ink2); margin-top: 3px; line-height: 1.4; }
        .fg-close { flex-shrink: 0; background: none; border: none; color: var(--ink3); font-size: 13px; padding: 2px 4px; }
      `}</style>
    </div>
  )
}
