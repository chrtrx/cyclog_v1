// Schriftzug als Punktraster mit weichem Leuchten – nach dem Vorbild der
// Ziffern-Darstellung aus dem Referenzbild. Bewusst als SVG mit echten
// Kreisen statt als Bild: bleibt bei jeder Größe scharf, nimmt die
// Textfarbe an und braucht keine zusätzliche Schriftdatei.

// 5x7-Raster je Buchstabe. '#' = Punkt.
const GLYPHS = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
}

// Leichte, aber feste Größen-Variation je Punkt – das nimmt dem Raster die
// technische Gleichförmigkeit, ohne bei jedem Rendern zu flackern.
function jitter(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return 0.82 + (n - Math.floor(n)) * 0.36   // 0.82 … 1.18
}

export default function DotLogo({
  text = 'CYCLOG',
  cell = 6,          // Rasterabstand in px
  gap = 2,           // Leerspalten zwischen den Buchstaben
  color = 'currentColor',
  glow = true,
  fluid = false,     // true: passt sich der Containerbreite an (z. B. Anmeldeseite)
  className = '',
}) {
  const letters = [...text.toUpperCase()].filter(c => GLYPHS[c])
  const cols = letters.length * 5 + Math.max(0, letters.length - 1) * gap
  const w = cols * cell
  const h = 7 * cell
  const r = cell * 0.30

  const dots = []
  let ox = 0
  for (const ch of letters) {
    const rows = GLYPHS[ch]
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== '#') continue
        const gx = ox + x
        dots.push(
          <circle key={`${gx}-${y}`}
            cx={(gx + 0.5) * cell} cy={(y + 0.5) * cell}
            r={r * jitter(gx, y)} />
        )
      }
    }
    ox += 5 + gap
  }

  // Feste Groesse ist der Normalfall (etwa in der Kopfzeile, wo ein
  // prozentualer Wert im Flex-Layout zusammenfallen wuerde). Nur wo der
  // Schriftzug die Breite ausfuellen soll, skaliert er mit – sonst liefe er
  // auf schmalen Geraeten aus dem Bild.
  const svgStyle = fluid
    ? { display: 'block', overflow: 'visible', width: '100%', height: 'auto', maxWidth: w }
    : { display: 'block', overflow: 'visible', width: w, height: h, flexShrink: 0 }
  const id = `dl-${cols}-${cell}`
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`}
      role="img" aria-label={text} style={svgStyle}>
      {glow && (
        <defs>
          <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={cell * 0.42} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g fill={color} filter={glow ? `url(#${id})` : undefined}>{dots}</g>
    </svg>
  )
}
