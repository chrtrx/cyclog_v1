// Schriftzug als Punktraster mit weichem Schein und leichtem Schimmern –
// nach dem Vorbild der Ziffern-Darstellung aus dem Referenzbild. Bewusst als
// SVG mit echten Kreisen statt als Bild: bleibt bei jeder Größe scharf,
// nimmt die Textfarbe an und braucht keine zusätzliche Schriftdatei.

// 5x7-Raster je Buchstabe. '#' = Punkt.
const GLYPHS = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
}

const CYCLE = 4.2   // Sekunden für einen Schimmer-Durchlauf

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
  shimmer = true,    // wanderndes Aufhellen von links nach rechts
  fluid = false,     // true: passt sich der Containerbreite an (z. B. Anmeldeseite)
  className = '',
}) {
  const letters = [...text.toUpperCase()].filter(c => GLYPHS[c])
  const cols = letters.length * 5 + Math.max(0, letters.length - 1) * gap
  const w = cols * cell
  const h = 7 * cell
  const r = cell * 0.30

  // Einmal erzeugen, zweimal verwenden: als weicher Schein im Hintergrund
  // und als scharfe Punkte darüber.
  const build = (prefix) => {
    const out = []
    let ox = 0
    for (const ch of letters) {
      const rows = GLYPHS[ch]
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          if (rows[y][x] !== '#') continue
          const gx = ox + x
          out.push(
            <circle key={`${prefix}-${gx}-${y}`}
              className={shimmer ? 'dl-dot' : undefined}
              cx={(gx + 0.5) * cell} cy={(y + 0.5) * cell}
              r={r * jitter(gx, y)}
              // Verzögerung nach Spalte: das Aufhellen wandert über den
              // Schriftzug, statt dass alles gleichzeitig pulst.
              style={shimmer ? { animationDelay: `${(gx / cols) * CYCLE * 0.55}s` } : undefined} />
          )
        }
      }
      ox += 5 + gap
    }
    return out
  }

  // Feste Größe ist der Normalfall (etwa in der Kopfzeile, wo ein
  // prozentualer Wert im Flex-Layout zusammenfallen würde). Nur wo der
  // Schriftzug die Breite ausfüllen soll, skaliert er mit – sonst liefe er
  // auf schmalen Geräten aus dem Bild.
  const svgStyle = fluid
    ? { display: 'block', overflow: 'visible', width: '100%', height: 'auto', maxWidth: w }
    : { display: 'block', overflow: 'visible', width: w, height: h, flexShrink: 0 }

  const gid = `dlg-${cols}-${cell}`
  const bid = `dlb-${cols}-${cell}`

  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`}
      role="img" aria-label={text} style={svgStyle}>
      {glow && (
        <defs>
          <filter id={gid} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={cell * 0.38} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={bid} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={cell * 1.25} />
          </filter>
        </defs>
      )}
      {glow && <g fill={color} filter={`url(#${bid})`} opacity="0.5">{build('b')}</g>}
      <g fill={color} filter={glow ? `url(#${gid})` : undefined}>{build('d')}</g>
      {shimmer && (
        <style>{`
          @keyframes dl-shimmer { 0%, 100% { opacity: .68 } 50% { opacity: 1 } }
          .dl-dot { animation: dl-shimmer ${CYCLE}s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .dl-dot { animation: none; opacity: 1 } }
        `}</style>
      )}
    </svg>
  )
}
