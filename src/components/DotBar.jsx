// Fortschritt als Punktreihe statt als durchgezogener Balken.
//
// Der eigentliche Gewinn ist nicht die Optik: Eine Punktreihe ist ABZÄHLBAR.
// "17 von 20" liest man auch ohne Farbe – der Fortschritt bleibt damit
// erkennbar, wenn die Oberfläche einmal einfarbig ist oder jemand Farben
// schlecht unterscheidet.
export default function DotBar({
  value = 0,          // 0 … 1
  dots = 20,
  cell = 6,
  color = 'currentColor',
  glow = true,
  className = '',
}) {
  const v = Math.max(0, Math.min(1, Number(value) || 0))
  const filled = v >= 1 ? dots : Math.min(dots, Math.round(v * dots))
  const w = dots * cell
  const h = cell
  const r = cell * 0.30
  const id = `db-${dots}-${cell}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img"
      aria-label={`${Math.round(v * 100)} %`} className={className}
      style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      {glow && (
        <defs>
          <filter id={id} x="-30%" y="-200%" width="160%" height="500%">
            <feGaussianBlur stdDeviation={cell * 0.30} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      {/* offene Punkte zuerst, damit die gefüllten darüber leuchten */}
      <g fill={color} opacity="0.18">
        {Array.from({ length: dots }, (_, i) => (
          <circle key={`e${i}`} cx={(i + 0.5) * cell} cy={h / 2} r={r} />
        ))}
      </g>
      <g fill={color} filter={glow ? `url(#${id})` : undefined}>
        {Array.from({ length: filled }, (_, i) => (
          <circle key={`f${i}`} cx={(i + 0.5) * cell} cy={h / 2} r={r} />
        ))}
      </g>
    </svg>
  )
}
