import { useRef, useState } from 'react'

// Vollbild-Ansicht mit Zoom (Pinch / Mausrad / +−) und Verschieben (Ziehen).
// Zum genauen Vergleich der Sitz-/Cockpit-Position zwischen zwei Rädern.
const clampS = (s) => Math.min(6, Math.max(1, s))

export default function ZoomView({ onClose, children }) {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const pts = useRef(new Map())
  const last = useRef(null)

  function onDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    last.current = null
  }
  function onMove(e) {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const arr = [...pts.current.values()]
    if (arr.length === 1) {
      if (last.current?.single) {
        const dx = arr[0].x - last.current.x, dy = arr[0].y - last.current.y
        setT(p => ({ ...p, x: p.x + dx, y: p.y + dy }))
      }
      last.current = { single: true, x: arr[0].x, y: arr[0].y }
    } else if (arr.length === 2) {
      const dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y)
      const mid = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 }
      if (last.current && !last.current.single) {
        const factor = dist / last.current.dist
        const dx = mid.x - last.current.x, dy = mid.y - last.current.y
        setT(p => ({ s: clampS(p.s * factor), x: p.x + dx, y: p.y + dy }))
      }
      last.current = { single: false, dist, x: mid.x, y: mid.y }
    }
  }
  function onUp(e) {
    pts.current.delete(e.pointerId)
    last.current = null
  }
  function onWheel(e) {
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setT(p => ({ ...p, s: clampS(p.s * factor) }))
  }
  const zoom = (f) => setT(p => ({ ...p, s: clampS(p.s * f) }))
  const reset = () => setT({ s: 1, x: 0, y: 0 })

  return (
    <div className="zv-overlay">
      <div
        className="zv-stage"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={onWheel}
        onDoubleClick={() => setT(p => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.4, x: 0, y: 0 }))}
      >
        <div className="zv-inner" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
          {children}
        </div>
      </div>

      <div className="zv-bar">
        <button onClick={() => zoom(1 / 1.4)} aria-label="Verkleinern">−</button>
        <button onClick={reset}>{Math.round(t.s * 100)}%</button>
        <button onClick={() => zoom(1.4)} aria-label="Vergrößern">+</button>
      </div>
      <button className="zv-close" onClick={onClose} aria-label="Schließen">✕</button>

      <style>{`
        .zv-overlay { position: fixed; inset: 0; z-index: 1400; background: #0a1426; display: flex; }
        .zv-stage { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; touch-action: none; }
        .zv-inner { transform-origin: center center; will-change: transform; width: 100%; }
        .zv-inner .bd-draw { margin: 0; }
        .zv-bar { position: fixed; bottom: calc(env(safe-area-inset-bottom) + 18px); left: 50%; transform: translateX(-50%);
          display: flex; gap: 2px; background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
        .zv-bar button { background: none; border: none; color: var(--ink1); font-family: var(--mono); font-size: 15px; font-weight: 700; padding: 11px 18px; min-width: 56px; }
        .zv-bar button:active { background: var(--panel); }
        .zv-close { position: fixed; top: calc(env(safe-area-inset-top) + 12px); right: 14px; width: 42px; height: 42px;
          background: var(--panel2); border: 1px solid var(--line); border-radius: 50%; color: var(--ink1); font-size: 16px; }
      `}</style>
    </div>
  )
}
