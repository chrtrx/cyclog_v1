// Punktraster-Piktogramme für die Tracker – dieselbe Bildsprache wie der
// Schriftzug. Reine Daten, kein JSX: dadurch lassen sie sich unabhängig von
// React prüfen und in einer Vorschau rendern, ohne dass beides auseinanderläuft.
// Raster 7x7, '#' = Punkt.

export const ICONS = {
  // zwei ineinandergreifende Kettenglieder
  chain: ['.......', '.##.##.', '#..#..#', '#..#..#', '#..#..#', '.##.##.', '.......'],
  // Zahnkranz: Ring mit vier Zähnen
  gear:  ['..#.#..', '.#####.', '.#...#.', '##...##', '.#...#.', '.#####.', '..#.#..'],
  // Bremsscheibe: Ring mit Nabe
  disc:  ['.#####.', '#.....#', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '.#####.'],
  // Reifen: dicker Ring
  tyre:  ['.#####.', '##...##', '#.....#', '#.....#', '#.....#', '##...##', '.#####.'],
  // Tropfen (Dichtmilch)
  drop:  ['...#...', '...#...', '..###..', '.#####.', '#######', '#######', '.#####.'],
  // Sechskant-Schraube
  bolt:  ['..###..', '.#####.', '##.#.##', '#..#..#', '##.#.##', '.#####.', '..###..'],
  // Federgabel: Krone und zwei Holme
  fork:  ['.#####.', '...#...', '..###..', '.#...#.', '.#...#.', '.#...#.', '##...##'],
  // Dämpfer: Feder
  spring:['.#####.', '.#.....', '.#####.', '.....#.', '.#####.', '.#.....', '.#####.'],
  // Akku
  batt:  ['..###..', '.#####.', '.#...#.', '.#.#.#.', '.#.#.#.', '.#...#.', '.#####.'],
  // Speichen / Zentrieren
  spoke: ['#..#..#', '.#.#.#.', '..###..', '###.###', '..###..', '.#.#.#.', '#..#..#'],
  // Werkzeug – Rückfallmotiv für alles Übrige
  tool:  ['.##..##', '.######', '..####.', '...##..', '..##...', '.##....', '##.....'],
  // Kalender / Termin (datumsbasierte Tracker)
  cal:   ['.#...#.', '#######', '#.....#', '#.###.#', '#.###.#', '#.....#', '#######'],
}

// Zuordnung Tracker-Typ -> Piktogramm. Alles Unbekannte (auch eigene
// Tracker) fällt auf das Werkzeug zurück.
export const ICON_FOR_TYPE = {
  'chain-wax': 'chain', 'chain-new': 'chain',
  cassette: 'gear',
  'brake-pads': 'disc', rotors: 'disc',
  'tyre-f': 'tyre', 'tyre-r': 'tyre',
  tubeless: 'drop', 'tubeless-m': 'drop',
  bearings: 'gear', headset: 'gear',
  spokes: 'spoke',
  'fork-small': 'fork', 'fork-big': 'fork',
  'fork-small-h': 'fork', 'fork-big-h': 'fork', 'fork-oil-m': 'fork',
  shock: 'spring', 'shock-h': 'spring',
  dropper: 'spring', 'dropper-h': 'spring',
  torque: 'bolt',
  'battery-m': 'batt',
  'cable-m': 'spoke',
  'fullcheck-m': 'cal',
}

export const iconFor = (typeId) => ICON_FOR_TYPE[typeId] || 'tool'
