import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { Page, Empty } from '../components/ui'
import { getNotifications, markNotificationsRead, deleteNotification, clearNotifications } from '../lib/data'

function timeAgo(iso) {
  const d = new Date(iso)
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'gerade eben'
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min`
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std`
  if (s < 604800) return `vor ${Math.floor(s / 86400)} Tg`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function InboxRow({ n, onDelete }) {
  const [dx, setDx] = useState(0)
  const startX = useRef(0)
  const dragging = useRef(false)

  function onStart(e) { startX.current = e.touches[0].clientX; dragging.current = true }
  function onMove(e) {
    if (!dragging.current) return
    setDx(Math.max(0, e.touches[0].clientX - startX.current))
  }
  function onEnd() {
    dragging.current = false
    if (dx > 110) onDelete()
    else setDx(0)
  }

  return (
    <div className="nx-wrap">
      <div className="nx-behind"><span>🗑 Löschen</span></div>
      <div
        className="nx-row"
        style={{ transform: `translateX(${dx}px)`, transition: dragging.current ? 'none' : 'transform .2s' }}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      >
        <div className="nx-body">
          <div className="nx-title">{n.title}</div>
          {n.body && <div className="nx-text">{n.body}</div>}
          <div className="nx-time">{timeAgo(n.created_at)}</div>
        </div>
        <button className="nx-del" onClick={onDelete} aria-label="Löschen">✕</button>
      </div>
    </div>
  )
}

export default function Inbox() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await getNotifications(user.id)
        setItems(data)
        markNotificationsRead(user.id).catch(() => {})
      } catch (e) { /* leer lassen */ }
      setLoading(false)
    })()
  }, [])

  async function remove(id) {
    setItems(prev => prev.filter(n => n.id !== id))
    try { await deleteNotification(id) } catch (e) {}
  }
  async function clearAll() {
    if (!items.length) return
    const prev = items
    setItems([])
    try { await clearNotifications(user.id) } catch (e) { setItems(prev) }
  }

  return (
    <Page title="Benachrichtigungen" subtitle={items.length ? `${items.length} Nachrichten` : null} back="/"
      action={items.length > 0 && (
        <button className="nx-clear" onClick={clearAll}>Alle löschen</button>
      )}>
      {loading ? null : items.length === 0 ? (
        <Empty emoji="🔔" title="Keine Benachrichtigungen"
          sub="Hier landen Erinnerungen zu fälligen Trackern und km-Updates nach deinen Fahrten." />
      ) : (
        <>
          <div className="nx-hint">Eintrag nach rechts wischen zum Löschen →</div>
          {items.map(n => <InboxRow key={n.id} n={n} onDelete={() => remove(n.id)} />)}
        </>
      )}

      <style>{`
        .nx-clear { flex-shrink:0; background:rgba(224,86,110,.08); border:1px solid rgba(224,86,110,.4); color:var(--crit); font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:8px 12px; }
        .nx-hint { font-family:var(--mono); font-size:10px; color:var(--ink3); letter-spacing:.5px; margin-bottom:10px; text-align:center; }
        .nx-wrap { position:relative; margin-bottom:8px; overflow:hidden; }
        .nx-behind { position:absolute; inset:0; display:flex; align-items:center; padding-left:18px; background:rgba(224,86,110,.15); font-family:var(--mono); font-size:12px; font-weight:700; color:var(--crit); }
        .nx-row { position:relative; display:flex; align-items:flex-start; gap:10px; background:linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.015)), var(--panel); border:1px solid var(--line); padding:13px 14px; }
        .nx-body { flex:1; min-width:0; }
        .nx-title { font-family:var(--sans); font-size:14px; font-weight:800; letter-spacing:.3px; color:var(--ink1); }
        .nx-text { font-family:var(--mono); font-size:11.5px; color:var(--ink2); margin-top:4px; line-height:1.5; }
        .nx-time { font-family:var(--mono); font-size:10px; color:var(--ink3); margin-top:6px; letter-spacing:.5px; text-transform:uppercase; }
        .nx-del { flex-shrink:0; background:none; border:none; color:var(--ink3); font-size:14px; padding:2px 4px; }
      `}</style>
    </Page>
  )
}
