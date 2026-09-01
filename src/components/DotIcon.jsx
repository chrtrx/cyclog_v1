import { ICONS, iconFor } from './dotGlyphs'

// Tracker-Piktogramm im selben Punktraster wie der Schriftzug.
// `type` ist die Tracker-Typ-Kennung (z. B. 'chain-wax'), `name` wählt
// direkt ein Motiv. Unbekanntes fällt auf das Werkzeug zurück.
function jitter(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return 0.84 + (n - Math.floor(n)) * 0.32
}

export default function DotIcon({ type, name, cell = 4, color = 'currentColor', glow = true }) {
  const rows = ICONS[name || iconFor(type)] || ICONS.tool
  const size = 7 * cell
  const r = cell * 0.30
  const id = `di-${name || type || 'x'}-${cell}`

  const dots = []
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== '#') continue
      dots.push(<circle key={`${x}-${y}`} cx={(x + 0.5) * cell} cy={(y + 0.5) * cell} r={r * jitter(x, y)} />)
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img"
      style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      {glow && (
        <defs>
          <filter id={id} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={cell * 0.34} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      <g fill={color} filter={glow ? `url(#${id})` : undefined}>{dots}</g>
    </svg>
  )
}
