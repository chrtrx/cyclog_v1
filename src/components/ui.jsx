// Gemeinsame UI-Bausteine für alle Modul-Seiten (Duolingo-Stil)
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
        .page { min-height: 100vh; padding-bottom: 80px; }
        .page-hdr {
          background: var(--white); border-bottom: 2px solid var(--border);
          padding: max(env(safe-area-inset-top),14px) 16px 14px;
          display: flex; align-items: center; gap: 12px;
          position: sticky; top: 0; z-index: 50;
        }
        .page-back {
          background: var(--bg); border: 2px solid var(--border);
          border-radius: 10px; padding: 8px 10px; color: var(--t1);
          box-shadow: 0 3px 0 var(--border); display: flex; flex-shrink: 0;
        }
        .page-back:active { transform: translateY(2px); box-shadow: none; }
        .page-titles { flex: 1; min-width: 0; }
        .page-title { font-family: 'Nunito', sans-serif; font-size: 20px; font-weight: 900; color: var(--t1); letter-spacing: -0.4px; }
        .page-sub { font-size: 12px; color: var(--t3); font-weight: 600; margin-top: 1px; }
        .page-body { padding: 16px; }
      `}</style>
    </div>
  )
}

// ─── Großer Plus-Button (Header-Action) ────────────────────
export function AddButton({ onClick, label = 'Neu' }) {
  return (
    <button className="add-btn" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="3"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="3"/></svg>
      {label}
      <style>{`
        .add-btn {
          background: var(--green); color: white; border: none;
          border-radius: 50px; padding: 9px 16px; flex-shrink: 0;
          display: flex; align-items: center; gap: 5px;
          font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 900;
          box-shadow: 0 4px 0 var(--green-d); transition: all 0.1s;
        }
        .add-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--green-d); }
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
        .sheet-ovl { position: fixed; inset: 0; max-width: 600px; margin: 0 auto; background: rgba(0,0,0,0.45); z-index: 300; }
        .sheet-panel {
          position: fixed; bottom: 0; left: 0; right: 0; max-width: 600px; margin: 0 auto;
          z-index: 400; background: var(--white); border-radius: 24px 24px 0 0;
          border-top: 2px solid var(--border); padding-bottom: max(env(safe-area-inset-bottom),24px);
          max-height: 90vh; overflow-y: auto;
          animation: sheetUp 0.32s cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-hdl { width: 40px; height: 4px; background: var(--border); border-radius: 2px; margin: 12px auto 0; }
        .sheet-ttl { font-family: 'Nunito', sans-serif; font-size: 20px; font-weight: 900; padding: 14px 18px 4px; color: var(--t1); }
        .sheet-sub { font-size: 13px; color: var(--t3); font-weight: 600; padding: 0 18px 14px; }
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
        .field { margin-bottom: 10px; }
        .field-lbl { display: block; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800; color: var(--t2); margin-bottom: 5px; }
        .field-input {
          width: 100%; background: var(--bg); border: 2px solid var(--border);
          border-radius: 12px; padding: 12px 14px; font-size: 15px; color: var(--t1);
          font-weight: 600; outline: none; transition: border-color 0.15s;
          font-family: 'Nunito Sans', sans-serif;
        }
        .field-input:focus { border-color: var(--blue); }
      `}</style>
    </div>
  )
}

// ─── Buttons ───────────────────────────────────────────────
export function BtnGreen({ onClick, children }) {
  return (
    <button className="bg-btn" onClick={onClick}>{children}
      <style>{`.bg-btn{display:block;width:100%;margin:8px 0;background:var(--green);color:white;border:none;border-radius:14px;padding:15px;font-family:'Nunito',sans-serif;font-size:17px;font-weight:900;box-shadow:0 5px 0 var(--green-d);transition:all .1s;}.bg-btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--green-d);}`}</style>
    </button>
  )
}

export function BtnDelete({ onClick, armed }) {
  return (
    <button className={`del-btn ${armed ? 'armed' : ''}`} onClick={onClick}>
      {armed ? 'Wirklich löschen?' : 'Löschen'}
      <style>{`.del-btn{display:block;width:100%;margin:0 0 8px;background:var(--red-l);color:var(--red-d);border:2px solid #ffb8b8;border-radius:14px;padding:13px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;box-shadow:0 3px 0 #ffb8b8;transition:all .1s;}.del-btn.armed{background:var(--red);color:white;border-color:var(--red-d);box-shadow:0 3px 0 var(--red-d);}`}</style>
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
        .empty { background: var(--white); border-radius: var(--r-xl); border: 2px solid var(--border); box-shadow: 0 4px 0 var(--border); padding: 38px 22px; text-align: center; }
        .empty-emoji { font-size: 48px; margin-bottom: 10px; }
        .empty-title { font-family: 'Nunito', sans-serif; font-size: 19px; font-weight: 900; margin-bottom: 5px; color: var(--t1); }
        .empty-sub { font-size: 14px; color: var(--t2); font-weight: 600; line-height: 1.5; }
      `}</style>
    </div>
  )
}
