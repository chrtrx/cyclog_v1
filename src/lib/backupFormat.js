// Reine Aufbereitung der Sicherung – bewusst ohne Datenbank-Zugriff,
// damit sich das Dateiformat isoliert pruefen laesst.

export const TABLES = [
  { key: 'raeder',        label: 'Räder' },
  { key: 'teile',         label: 'Teile (aktuell verbaut)' },
  { key: 'teile_verlauf', label: 'Teile-Verlauf' },
  { key: 'tracker',       label: 'Tracker' },
  { key: 'wartungen',     label: 'Wartungen' },
  { key: 'rennen',        label: 'Rennen' },
  { key: 'ereignisse',    label: 'Ereignisse' },
  { key: 'fahrten',       label: 'Fahrten (Bedingungen)' },
  { key: 'setups',        label: 'Gespeicherte Setups' },
  { key: 'bike_fits',     label: 'Bike-Fit' },
  { key: 'upgrades',      label: 'Upgrades' },
  { key: 'eigene_typen',  label: 'Eigene Tracker-Typen' },
  { key: 'reifendruck',   label: 'Reifendruck' },
]

// Technische Spalten, die in einer Excel-Tabelle nur stoeren.
const SKIP = new Set(['user_id', 'id', 'bike_id', 'component_id', 'strava_gear_id'])

function csvCell(v) {
  if (v == null) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function csvTable(label, rows) {
  if (!rows || !rows.length) return `${label}\n(keine Einträge)\n`
  const cols = [...new Set(rows.flatMap(Object.keys))].filter(c => !SKIP.has(c))
  const head = cols.join(';')
  const body = rows.map(r => cols.map(c => csvCell(r[c])).join(';')).join('\n')
  return `${label} (${rows.length})\n${head}\n${body}\n`
}

export function toCsv(data) {
  const head = `Cyclog Datensicherung;${new Date(data.erstellt).toLocaleString('de-DE')}\n`
  // BOM voran, sonst zeigt Excel Umlaute falsch an. Semikolon als Trenner,
  // weil deutsches Excel Komma-CSV nicht in Spalten aufteilt.
  return '﻿' + head + '\n' +
    TABLES.map(t => csvTable(t.label, data[t.key])).join('\n')
}

export function backupSummary(data) {
  return TABLES.map(t => ({ label: t.label, n: (data[t.key] || []).length }))
}

// Datei ausliefern. Auf dem iPhone ist das Teilen-Menue der zuverlaessige
// Weg (dort landet die Datei in "Dateien" oder iCloud); sonst normaler
// Download. Beides schlaegt fehl -> Datei in neuem Tab oeffnen.
export async function saveFile(filename, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  try {
    const file = new File([blob], filename, { type: mime })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename })
      return 'geteilt'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'abgebrochen'
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'gespeichert'
  } catch {
    window.open(URL.createObjectURL(blob), '_blank')
    return 'geöffnet'
  }
}
