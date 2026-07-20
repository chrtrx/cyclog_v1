// Changelog für das „Was ist neu"-Fenster.
// Neueste Version oben. Bei jedem Release eine neue Gruppe mit höherem `v`
// voranstellen – Nutzer sehen beim Öffnen alle Einträge, die neuer sind als
// die zuletzt von ihnen gesehene Version.
// item = ['new' | 'fix' | 'change', 'Text']
export const CHANGELOG = [
  {
    v: 12,
    date: '09.07.2026',
    items: [
      ['new', 'Neue Frage „Wie war die Fahrt?" nach erkannten Ausfahrten: Wetter (Trocken/Nass/Regen) und Intensität (Locker/Gemischt/Hart) eintragen'],
      ['new', 'Tracker zeigen jetzt eine Verschleiß-Auswertung an, z.B. „🌧️ 22% Regen · 🔴 38% Hart", inkl. Fazit beim Abschließen'],
    ],
  },
  {
    v: 11,
    date: '09.07.2026',
    items: [
      ['new', 'Cyclog lernt aus deiner Wartungs-Historie: Beim Anlegen eines Trackers schlägt er dir dein tatsächliches Intervall vor, wenn es deutlich vom Standard abweicht'],
    ],
  },
  {
    v: 10,
    date: '09.07.2026',
    items: [
      ['new', 'Neuer Tab „Historie" bei jedem Rad: zeigt Wartungen und Bike-Fit-Änderungen chronologisch in einer gemeinsamen Zeitleiste'],
    ],
  },
  {
    v: 9,
    date: '09.07.2026',
    items: [
      ['new', 'Wettkampf-Erkennung: markierst du eine Strava-Aktivität als Wettkampf, schlägt Cyclog dir im Renntagebuch (Mehr → Rennen) ein vorausgefülltes Formular vor'],
    ],
  },
  {
    v: 8,
    date: '03.07.2026',
    items: [
      ['new', 'Eigene Tracker: Über „＋ Eigenen Tracker erstellen" kannst du jetzt eigene Wartungen mit Symbol, Name und Intervall anlegen'],
    ],
  },
  {
    v: 7,
    date: '02.07.2026',
    items: [
      ['new', 'Bike-Fit hat jetzt einen eigenen Tab „Fit" in der unteren Navigation'],
      ['new', 'Bike-Fit speichert automatisch – kein Speichern-Button mehr nötig'],
      ['new', 'Bike-Fit: kompakte Live-Vorschau bleibt beim Scrollen oben sichtbar'],
      ['change', 'Geometrie wird nur noch im Bike-Fit bearbeitet – die Rad-Details zeigen sie an und verlinken dorthin'],
      ['change', '„Mehr" ist in Werkzeuge und Einstellungen gegliedert; Bike-Fit startet aufgeräumt (nur Rahmen-Geometrie offen)'],
    ],
  },
  {
    v: 6,
    date: '02.07.2026',
    items: [
      ['change', 'Bike-Fit: MTB-Zeichnung näher an der Realität – Federgabel mit Standrohren & Casting, Dropper-Sattelstütze, Riser-Lenker mit Griff, Sitzrohr-Überstand'],
    ],
  },
  {
    v: 5,
    date: '02.07.2026',
    items: [
      ['new', 'Bike-Fit: Körpermaße eintragen (Größe, Innenbeinlänge, Rumpf, Arm) – die Fahrer-Silhouette nutzt deine echten Maße'],
      ['new', 'Bike-Fit: Sitzwinkel live – Rumpf-, Hüft-, Knie- (Kurbel unten) und Schulterwinkel mit Ideal-Hinweisen'],
    ],
  },
  {
    v: 4,
    date: '02.07.2026',
    items: [
      ['new', 'Bike-Fit: Fahrer-Silhouette einblendbar (🚴) – zeigt die Sitzposition direkt auf dem Rad, 1:1 aus deiner Geometrie berechnet'],
      ['new', 'Bike-Fit: Sitzhöhen-Empfehlung aus der Innenbeinlänge (LeMond-Formel) mit Abgleich zu deinem Wert'],
    ],
  },
  {
    v: 3,
    date: '01.07.2026',
    items: [
      ['change', 'Bike-Fit: Steuerrohr-Partie überarbeitet – Unterrohr setzt unten am Steuerrohr an (echte Rahmenform), Gabelkrone, Spacer & Ahead-Kappe sichtbar, Bremsgriff sitzt auf der Lenkerkurve'],
    ],
  },
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
