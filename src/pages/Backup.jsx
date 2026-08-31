import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Page } from '../components/ui'
import { collectBackup, toCsv, backupSummary, saveFile } from '../lib/backup'

const stamp = () => new Date().toISOString().slice(0, 10)

export default function Backup() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    collectBackup(user.id).then(setData).catch(() => setMsg('⚠ Daten konnten nicht vollständig geladen werden.')).finally(() => setBusy(false))
  }, [])

  async function save(kind) {
    if (!data) return
    setMsg('')
    try {
      const res = kind === 'csv'
        ? await saveFile(`cyclog-${stamp()}.csv`, toCsv(data), 'text/csv')
        : await saveFile(`cyclog-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json')
      if (res !== 'abgebrochen') setMsg(`✓ Sicherung ${res}`)
    } catch {
      setMsg('⚠ Sicherung fehlgeschlagen. Bitte erneut versuchen.')
    }
  }

  const rows = data ? backupSummary(data) : []
  const total = rows.reduce((s, r) => s + r.n, 0)

  return (
    <Page title="Datensicherung" subtitle="Alle Daten als Datei sichern" back="/more">
      <div className="bk-lead">
        Zieht alles aus deinem Konto in eine Datei: Räder mit Kilometerständen, verbaute Teile
        samt Verlauf, Tracker, Wartungen, Rennen, Ereignisse und Setups. Bewahre sie außerhalb
        der App auf – dann bleiben deine Daten auch dann lesbar, wenn die App einmal nicht läuft.
      </div>

      {busy ? (
        <div className="bk-empty">Daten werden zusammengestellt…</div>
      ) : (
        <>
          <div className="bk-list">
            {rows.map(r => (
              <div key={r.label} className={`bk-row ${r.n ? '' : 'zero'}`}>
                <span className="bk-lbl">{r.label}</span>
                <span className="bk-n">{r.n.toLocaleString('de')}</span>
              </div>
            ))}
            <div className="bk-row total">
              <span className="bk-lbl">Gesamt</span>
              <span className="bk-n">{total.toLocaleString('de')}</span>
            </div>
          </div>

          <button className="bk-btn primary" onClick={() => save('csv')}>
            📊 Als Tabelle sichern (CSV)
            <small>Öffnet sich direkt in Excel oder Numbers</small>
          </button>
          <button className="bk-btn" onClick={() => save('json')}>
            🗄 Als Volldatei sichern (JSON)
            <small>Enthält wirklich jedes Feld – für ein späteres Zurückspielen</small>
          </button>

          {msg && <div className="bk-msg">{msg}</div>}

          <div className="bk-hint">
            Auf dem iPhone öffnet sich das Teilen-Menü – dort „In Dateien sichern" wählen.
          </div>
        </>
      )}

      <style>{`
        .bk-lead { font-family:var(--mono); font-size:11.5px; color:var(--ink2); line-height:1.75; margin-bottom:18px; }
        .bk-empty { padding:20px; text-align:center; font-family:var(--mono); font-size:11.5px; color:var(--ink3); border:1px dashed var(--line); }
        .bk-list { border:1px solid var(--line); padding:4px 14px; margin-bottom:16px; }
        .bk-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 0; border-top:1px solid var(--line); }
        .bk-row:first-child { border-top:none; }
        .bk-row.zero { opacity:.4; }
        .bk-row.total { border-top:1px solid var(--acc); }
        .bk-lbl { font-family:var(--mono); font-size:11.5px; color:var(--ink2); letter-spacing:.3px; }
        .bk-n { font-family:var(--sans); font-size:13px; font-weight:900; color:var(--ink1); }
        .bk-row.total .bk-lbl, .bk-row.total .bk-n { color:var(--acc); }
        .bk-btn { width:100%; display:flex; flex-direction:column; align-items:flex-start; gap:3px; background:var(--panel2); border:1px solid var(--line); color:var(--ink1); font-family:var(--sans); font-size:14px; font-weight:800; letter-spacing:.3px; padding:14px; margin-bottom:10px; text-align:left; }
        .bk-btn small { font-family:var(--mono); font-size:10.5px; font-weight:400; color:var(--ink3); letter-spacing:.3px; }
        .bk-btn.primary { border-color:var(--acc); background:rgba(47,123,255,.10); }
        .bk-msg { margin-top:4px; font-family:var(--mono); font-size:11.5px; color:var(--ink2); padding:10px 12px; border:1px solid var(--line); }
        .bk-hint { margin-top:14px; font-family:var(--mono); font-size:10.5px; color:var(--ink3); line-height:1.6; }
      `}</style>
    </Page>
  )
}
