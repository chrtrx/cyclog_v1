import { useState, useEffect } from 'react'

// Dezenter, einmal wegklickbarer Hinweis zum Installieren der App.
// - Android/Desktop-Chrome: nutzt das native beforeinstallprompt-Event → "Installieren"-Button
// - iOS Safari (kein beforeinstallprompt): zeigt den "Teilen → Zum Home-Bildschirm"-Tipp
// Erscheint nie, wenn die App bereits als PWA (standalone) läuft oder schon weggeklickt wurde.
export default function InstallHint() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    if (isStandalone) return
    if (localStorage.getItem('installHintDismissed') === '1') return

    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS feuert kein beforeinstallprompt → Tipp nach kurzer Verzögerung zeigen
    let t
    if (isIOS) t = setTimeout(() => setShow(true), 1200)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (t) clearTimeout(t)
    }
  }, [isStandalone, isIOS])

  function dismiss() {
    setShow(false)
    localStorage.setItem('installHintDismissed', '1')
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    setDeferred(null)
    dismiss()
  }

  if (!show || isStandalone) return null

  return (
    <div className="ih">
      <div className="ih-icon">📲</div>
      <div className="ih-body">
        <div className="ih-title">Cyclog installieren</div>
        <div className="ih-sub">
          {isIOS
            ? 'Teilen-Symbol antippen → „Zum Home-Bildschirm"'
            : 'Als App aufs Handy – schneller & offline nutzbar'}
        </div>
      </div>
      {!isIOS && deferred && (
        <button className="ih-btn" onClick={install}>Installieren</button>
      )}
      <button className="ih-close" onClick={dismiss} aria-label="Schließen">✕</button>

      <style>{`
        .ih {
          position: fixed; left: 50%; transform: translateX(-50%);
          bottom: calc(78px + env(safe-area-inset-bottom)); z-index: 200;
          width: min(440px, calc(100vw - 24px));
          display: flex; align-items: center; gap: 12px;
          background: var(--panel2); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px 14px;
          box-shadow: 0 12px 34px rgba(0,0,0,.45);
        }
        .ih-icon { font-size: 22px; flex-shrink: 0; }
        .ih-body { flex: 1; min-width: 0; }
        .ih-title { font-family: var(--sans); font-size: 13px; font-weight: 800; letter-spacing: .3px; color: var(--ink1); }
        .ih-sub { font-family: var(--mono); font-size: 10.5px; color: var(--ink3); margin-top: 2px; line-height: 1.35; }
        .ih-btn { flex-shrink: 0; font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
          color: #fff; background: var(--acc); border: none; padding: 9px 13px; border-radius: 8px; cursor: pointer; }
        .ih-btn:active { background: var(--acc-d); }
        .ih-close { flex-shrink: 0; background: none; border: none; color: var(--ink3); font-size: 13px; padding: 4px 6px; cursor: pointer; }
      `}</style>
    </div>
  )
}
