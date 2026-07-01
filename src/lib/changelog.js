// Changelog für das „Was ist neu"-Fenster.
// Neueste Version oben. Bei jedem Release eine neue Gruppe mit höherem `v`
// voranstellen – Nutzer sehen beim Öffnen alle Einträge, die neuer sind als
// die zuletzt von ihnen gesehene Version.
// item = ['new' | 'fix' | 'change', 'Text']
export const CHANGELOG = [
  {
    v: 2,
    date: '01.07.2026',
    items: [
      ['change', 'Bike-Fit: deutlich realistischere Zeichnung – Speichen, Reifen in echter Breite, Kette mit Kettenblatt & Kassette, beide Kurbeln mit Pedalen, realistischer Sattel, Gabel mit echtem Vorlauf, Bremsgriffe; MTB mit Bremsscheiben'],
    ],
  },
  {
    v: 1,
    date: '01.07.2026',
    items: [
      ['new', 'Bike-Fit: dein Rad wird maßstabsgetreu gezeichnet – Rennrad & MTB im bike-stats-Stil'],
      ['new', 'Zwei Räder vergleichen: überlagerte Zeichnung + Tabelle mit Abweichungen'],
      ['new', 'Vergleichs-Ansichten „Rahmen" und „Cockpit / Position" (Sattel & Lenker ab Tretlager)'],
      ['new', 'Ausrichtung des Vergleichs: Tretlager, Hinterrad, Vorderrad oder Boden'],
      ['new', 'Zeichnung als Bild teilen oder speichern'],
      ['fix', 'Geometrie speichern funktioniert wieder (Rad-Details & Bike-Fit)'],
      ['fix', 'Minus-Werte lassen sich in den Geometrie-Feldern eingeben'],
      ['new', '„Update verfügbar"-Hinweis, wenn eine neue Version bereitsteht'],
    ],
  },
]

export const APP_VERSION = CHANGELOG.length ? CHANGELOG[0].v : 0
