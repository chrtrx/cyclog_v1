// Gemeinsame UI-Bausteine – Datenblatt-Stil (dunkelblau, Mono)
import { useNavigate } from 'react-router-dom'

// ─── Seiten-Hülle mit Header ───────────────────────────────
export function Page({ title, subtitle, action, children, back }) {
  const nav = useNavigate()
  return (
    <div className="page">
      <header className="page-hdr">
        {back && (
          <button className="page-back" onClick={() => nav(back)}>
            <svg viewBox="0 0 12 20" width="11" height="18" fill="none"><path d="M10 2L2 10l8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        <div className="page-titles">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="page-body">{children}</div>

      <style>{`
        .page { min-height: 100vh; padding-bottom: 90px; }
        .page-hdr {
          background: var(--bg2); border-bottom: 1px solid var(--line);
          padding: max(env(safe-area-inset-top),14px) 16px 14px;
          display: flex; align-items: center; gap: 12px;
          position: sticky; top: 0; z-index: 50;
        }
        .page-back {
          background: var(--panel2); border: 1px solid var(--line);
          padding: 9px 11px; color: var(--ink1); display: flex; flex-shrink: 0;
        }
        .page-back:active { background: var(--panel); }
        .page-titles { flex: 1; min-width: 0; }
        .page-title { font-family: var(--sans); font-size: 19px; font-weight: 900; color: var(--ink1); letter-spacing: 2px; text-transform: uppercase; }
        .page-sub { font-family: var(--mono); font-size: 11px; color: var(--ink3); letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
        .page-body { padding: 16px; }
      `}</style>
    </div>
  )
}

// ─── Plus-Button (Header-Action) ───────────────────────────
export function AddButton({ onClick, label = 'Neu' }) {
  return (
    <button className="add-btn" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="3"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="3"/></svg>
      {label}
      <style>{`
        .add-btn {
          background: var(--acc); color: white; border: none;
          padding: 10px 15px; flex-shrink: 0;
          display: flex; align-items: center; gap: 6px;
          font-family: var(--sans); font-size: 12px; font-weight: 800;
          letter-spacing: 1px; text-transform: uppercase; transition: background 0.12s;
        }
        .add-btn:active { background: var(--acc-d); }
      `}</style>
    </button>
  )
}

// ─── Bottom-Sheet ──────────────────────────────────────────
export function Sheet({ title, sub, onClose, children }) {
  return (
    <>
      <div className="sheet-ovl" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-hdl" />
        <div className="sheet-ttl">{title}</div>
        {sub && <div className="sheet-sub">{sub}</div>}
        <div className="sheet-content">{children}</div>
        <div style={{ height: 8 }} />
      </div>
      <style>{`
        .sheet-ovl { position: fixed; inset: 0; max-width: 720px; margin: 0 auto; background: rgba(0,0,0,0.6); z-index: 300; }
        .sheet-panel {
          position: fixed; bottom: 0; left: 0; right: 0; max-width: 720px; margin: 0 auto;
          z-index: 400; background: var(--panel); border-top: 1px solid var(--acc);
          padding-bottom: max(env(safe-area-inset-bottom),24px);
          max-height: 90vh; overflow-y: auto;
          animation: sheetUp 0.3s cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-hdl { width: 36px; height: 3px; background: var(--line); margin: 12px auto 0; }
        .sheet-ttl { font-family: var(--sans); font-size: 17px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 18px 4px; color: var(--ink1); }
        .sheet-sub { font-family: var(--mono); font-size: 11px; color: var(--ink3); letter-spacing: 1px; text-transform: uppercase; padding: 0 18px 14px; }
        .sheet-content { padding: 0 16px; }
      `}</style>
    </>
  )
}

// ─── Eingabefeld ───────────────────────────────────────────
export function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="field">
      <label className="field-lbl">{label}</label>
      <input
        className="field-input" type={type} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder || '—'}
      />
      <style>{`
        .field { margin-bottom: 12px; }
        .field-lbl { display: block; font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink3); margin-bottom: 6px; }
        .field-input {
          width: 100%; background: var(--panel2); border: 1px solid var(--line);
          padding: 12px 14px; font-size: 15px; color: var(--ink1);
          font-family: var(--mono); outline: none; transition: border-color 0.15s;
        }
        .field-input:focus { border-color: var(--acc); }
        .field-input::placeholder { color: var(--ink3); }
      `}</style>
    </div>
  )
}

// ─── Buttons ───────────────────────────────────────────────
export function BtnGreen({ onClick, children }) {
  return (
    <button className="bg-btn" onClick={onClick}>{children}
      <style>{`.bg-btn{display:block;width:100%;margin:8px 0;background:var(--acc);color:white;border:none;padding:15px;font-family:var(--sans);font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;transition:background .12s;}.bg-btn:active{background:var(--acc-d);}`}</style>
    </button>
  )
}

export function BtnDelete({ onClick, armed }) {
  return (
    <button className={`del-btn ${armed ? 'armed' : ''}`} onClick={onClick}>
      {armed ? 'Wirklich löschen?' : 'Löschen'}
      <style>{`.del-btn{display:block;width:100%;margin:0 0 8px;background:rgba(224,86,110,.08);color:var(--crit);border:1px solid rgba(224,86,110,.4);padding:13px;font-family:var(--sans);font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;transition:all .12s;}.del-btn.armed{background:var(--crit);color:white;border-color:var(--crit);}`}</style>
    </button>
  )
}

// ─── Empty State ───────────────────────────────────────────
export function Empty({ emoji, title, sub, action }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
      <style>{`
        .empty { background: linear-gradient(160deg, rgba(255,255,255,.04), rgba(255,255,255,.01)); border: 1px solid var(--line); padding: 38px 22px; text-align: center; }
        .empty-emoji { font-size: 44px; margin-bottom: 12px; opacity: .85; }
        .empty-title { font-family: var(--sans); font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; color: var(--ink1); }
        .empty-sub { font-family: var(--mono); font-size: 12px; color: var(--ink3); line-height: 1.6; }
      `}</style>
    </div>
  )
}
