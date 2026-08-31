// Changelog für das „Was ist neu"-Fenster.
// Neueste Version oben. Bei jedem Release eine neue Gruppe mit höherem `v`
// voranstellen – Nutzer sehen beim Öffnen alle Einträge, die neuer sind als
// die zuletzt von ihnen gesehene Version.
// item = ['new' | 'fix' | 'change', 'Text']
export const CHANGELOG = [
  {
    v: 19,
    date: '31.08.2026',
    items: [
      ['fix', 'Tablet: Schrift und Bedienelemente waren für den großen Schirm zu klein – die Oberfläche wird jetzt passend hochskaliert (iPad quer +25 %, hoch +15 %); auf dem Handy ändert sich nichts'],
    ],
  },
  {
    v: 18,
    date: '13.08.2026',
    items: [
      ['change', 'Setups komplett vereinfacht: zeigt nur noch die verbauten Teile deines Rads und darunter, was sich wann geändert hat (inkl. Zeitraum bei ausgebauten Teilen). Vergleich und von Hand angelegte Setups sind entfallen'],
      ['new', 'Datensicherung (Mehr → Datensicherung): alle Daten als Excel-Tabelle oder Volldatei sichern'],
      ['change', '„Fit" ist von der unteren Leiste nach Mehr → Werkzeuge umgezogen; die Leiste hat jetzt drei klare Bereiche'],
      ['fix', 'Tablet im Querformat: Inhalt nutzt die Breite besser, Kopfzeilen sind flacher, Navigationsleiste und Seite laufen nicht mehr auseinander'],
    ],
  },
  {
    v: 17,
    date: '13.08.2026',
    items: [
      ['new', 'Neue Auswertung „Nutzung" (Mehr → Nutzung): zeigt, welche Funktionen du am häufigsten brauchst – Aktionen rückwirkend aus deinen Daten, Seitenaufrufe ab jetzt'],
      ['new', 'Zeitraum wählbar: 30 Tage, 90 Tage oder gesamt; Erfassung der Seitenaufrufe jederzeit abschaltbar'],
    ],
  },
  {
    v: 16,
    date: '23.07.2026',
    items: [
      ['new', 'Neuer Kalender (Mehr → Kalender): Wartungen, Rennen, Defekte und die voraussichtliche Fälligkeit deiner Tracker in einer Monatsübersicht'],
      ['new', 'Einträge direkt im Kalender anlegen – Rennen, Wartung, Defekt, Sturz, Panne oder Notiz; sie erscheinen automatisch auch im Renntagebuch bzw. in der Rad-Historie'],
    ],
  },
  {
    v: 15,
    date: '23.07.2026',
    items: [
      ['fix', 'Stunden-Tracker zählten bei „überfällig / bald fällig" oben auf der Startseite nie mit – jetzt fließen die Fahrstunden dort ein'],
      ['fix', 'Fahrstunden konnten bei vielen Fahrten zu niedrig sein (nur die letzten 1.000 Fahrten wurden gezählt) – die Summe kommt jetzt vollständig aus der Datenbank'],
      ['change', 'Startseite spürbar flotter: Verschleiß-Auswertung und Rad-Sortierung werden nur noch bei echten Datenänderungen neu berechnet, Fahrstunden aller Räder kommen in einer statt vieler Abfragen'],
    ],
  },
  {
    v: 14,
    date: '21.07.2026',
    items: [
      ['new', 'Neuer Belastungs-Balken am Tracker: EIN Balken zeigt Fortschritt + Intensitäts-Anteile (hart/mittel/locker), Wetter als Zeile darunter – Segment antippen für Details („Hart: 620 km · davon 30 % Regen")'],
      ['new', 'Intensität wird aus Strava erkannt (Watt, sonst Puls/Tempo, relativ zu deinem 90-Tage-Schnitt) – die „Wie war die Fahrt?"-Abfrage ist vorausgefüllt, du bestätigst nur noch'],
      ['new', 'Ø-Watt am Tracker, in der Historie und der Gesamt-Statistik („1.240 km · Ø 205 W")'],
      ['change', 'Intensitäts-Stufe „Gemischt" heißt jetzt „Mittel"'],
      ['fix', 'Stunden-Tracker zählen jetzt wirklich: Fahrzeiten kommen aus Strava (inkl. nachgeladener Historie) – z. B. „Powermeter-Batterie 380 h" läuft ab sofort mit'],
      ['fix', 'Bearbeiten eines Stunden-Trackers (z. B. Notiz ändern) setzt den Zähler nicht mehr ungewollt auf 0'],
      ['fix', 'Mitteilungs-Seite: Titel überlappte den „Alle löschen"-Knopf'],
      ['new', 'Wird eine Aktivität auf Strava nachträglich einem anderen Rad zugeordnet, wandert die Bedingungs-Abfrage (oder deine schon gegebene Antwort) automatisch mit aufs richtige Rad'],
    ],
  },
  {
    v: 13,
    date: '20.07.2026',
    items: [
      ['new', 'Tracker jederzeit zurücksetzen: „✓ Erledigt – Zähler neu starten" im Bearbeiten-Fenster (z. B. Schrauben nachgezogen)'],
      ['new', 'Statistik je Tracker-Durchlauf: Laufleistung + Bedingungen werden beim Abschließen gespeichert – sichtbar in der Historie und als Gesamt-Statistik je Rad'],
      ['new', 'Wettkampf-Fenster: Nach der „Wie war die Fahrt?"-Abfrage öffnet sich bei erkannten Rennen direkt der Renntagebuch-Dialog'],
      ['new', 'Renntagebuch-Vorlage erweitert: Zeit, Gefühl/Tagesform und Learnings'],
      ['fix', 'Überlappende Banner behoben: Mitteilungs-Toast rückt unter den „Neue Version"-Banner statt darüber zu liegen'],
    ],
  },
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
