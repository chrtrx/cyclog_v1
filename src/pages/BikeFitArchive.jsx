import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { getBikes, updateBike } from '../lib/data'
import { Page, BtnGreen, Empty } from '../components/ui'

// key, Label, Einheit, Platzhalter, signed?
const GEO_FIELDS = [
  ['reach',      'Reach',          'mm', '390'],
  ['stack',      'Stack',          'mm', '560'],
  ['head_angle', 'Lenkwinkel',     '°',  '73'],
  ['seat_angle', 'Sitzwinkel',     '°',  '74'],
  ['top_tube',   'Oberrohr',       'mm', '560'],
  ['seat_tube',  'Sitzrohr',       'mm', '560'],
  ['head_tube',  'Steuerrohr',     'mm', '150'],
  ['chainstay',  'Kettenstrebe',   'mm', '410'],
  ['bb_drop',    'Tretlager-Abs.', 'mm', '70'],
  ['wheelbase',  'Radstand',       'mm', '995'],
  ['fork_offset','Gabel-Offset',   'mm', '45'],
  ['standover',  'Überstand',      'mm', '800'],
  ['tire_width', 'Reifenbreite',   'mm', '28'],
]
const COCKPIT_FIELDS = [
  ['saddle_height','Sitzhöhe',      'mm', '740'],
  ['saddle_offset','Sattel-Offset', 'mm', '70',  true],
  ['stem_length',  'Vorbaulänge',   'mm', '120'],
  ['stem_angle',   'Vorbauwinkel',  '°',  '-7',  true],
  ['spacer',       'Spacer/Steuersatz','mm','55'],
  ['bar_reach',    'Lenker-Reach',  'mm', '80'],
  ['bar_drop',     'Lenker-Drop',   'mm', '120'],
  ['bar_width',    'Lenker-Breite', 'mm', '420'],
  ['bar_rise',     'Lenker-Rise',   'mm', '0',   true],
  ['crank_length', 'Kurbel-Länge',  'mm', '172.5'],
]

// Laufradgrößen (Zoll) → Felgen-Innendurchmesser (ETRTO) in mm.
const WHEELS = [['road', '700c / 28″', 622], ['29', '29″ MTB', 622], ['275', '27,5″', 584], ['26', '26″', 559]]
const rimEtrto = (key) => (WHEELS.find(w => w[0] === key) || WHEELS[0])[2]

// Plausible Bereiche für die Validierung.
const RANGES = {
  reach: [330, 460], stack: [470, 700], head_angle: [60, 76], seat_angle: [68, 80],
  top_tube: [480, 650], seat_tube: [400, 680], head_tube: [80, 280], chainstay: [380, 470],
  bb_drop: [40, 95], wheelbase: [900, 1120], fork_offset: [30, 60], standover: [600, 920], tire_width: [18, 70],
  saddle_height: [600, 900], saddle_offset: [0, 130], stem_length: [50, 170], stem_angle: [-30, 30],
  spacer: [0, 140], bar_reach: [60, 120], bar_drop: [90, 170], bar_width: [340, 500], bar_rise: [-30, 80], crank_length: [150, 185],
}
const outOfRange = (k, v) => {
  const r = RANGES[k]; if (!r || v === '' || v == null) return false
  const x = Number(v); return isFinite(x) && (x < r[0] || x > r[1])
}

function prefillGeo(bike) {
  return {
    reach: bike.geo_reach ?? '', stack: bike.geo_stack ?? '',
    head_angle: bike.geo_head_angle ?? '', seat_angle: bike.geo_seat_angle ?? '',
    top_tube: bike.geo_top_tube ?? '', seat_tube: bike.geo_seat_tube ?? '',
    head_tube: bike.geo_head_tube ?? '', chainstay: bike.geo_chainstay ?? '',
    bb_drop: bike.geo_bb_drop ?? '', wheelbase: bike.geo_wheelbase ?? '',
    standover: bike.geo_standover ?? '', wheel: 'road', tire_width: 28, frame_type: 'road',
  }
}

const n = (v, d = 0) => { const x = Number(v); return v !== '' && v != null && isFinite(x) ? x : d }
// Zeichnungs-Palette im bike-stats-Stil: rote Linien auf hellem Raster.
const COL = { acc: '#e2382e', b: '#2f7bff', ink2: '#7a8598', ink3: '#aeb6c6', grid: '#dbe0ea', bg: '#f4f6fb' }

// Zeilen der Geometrie-Vergleichstabelle. dec = Nachkommastellen.
const CMP_ROWS = [
  ['reach', 'Reach', 'mm', 0], ['stack', 'Stack', 'mm', 0], ['str', 'STR', '', 2],
  ['head_angle', 'Lenkwinkel', '°', 1], ['seat_angle', 'Sitzwinkel', '°', 1],
  ['top_tube', 'Oberrohr', 'mm', 0], ['seat_tube', 'Sitzrohr', 'mm', 0],
  ['head_tube', 'Steuerrohr', 'mm', 0], ['chainstay', 'Kettenstrebe', 'mm', 1],
  ['bb_drop', 'Tretlager-Abs.', 'mm', 0], ['wheelbase', 'Radstand', 'mm', 0], ['standover', 'Überstand', 'mm', 0],
]

// Wert eines Rades für eine Vergleichszeile (STR wird berechnet, sonst direkt).
function cmpValue(g, k) {
  if (k === 'str') {
    const r = Number(g.reach), s = Number(g.stack)
    return isFinite(r) && r > 0 && isFinite(s) ? s / r : null
  }
  const x = Number(g[k])
  return g[k] !== '' && g[k] != null && isFinite(x) ? x : null
}
const roundDec = (x, dec) => { const f = Math.pow(10, dec); return Math.round(x * f) / f }
const fmtDelta = (d, u, dec) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(roundDec(d, dec))}${u === '°' ? '°' : u ? ' ' + u : ''}`

// Liefert Geometrie + Cockpit eines Rades (aus fit-JSON, sonst aus geo_*-Spalten).
function fitOf(bike) {
  const fit = bike?.fit || {}
  const geo = fit.geo && Object.keys(fit.geo).length
    ? { wheel: 'road', tire_width: 28, frame_type: 'road', ...fit.geo }
    : prefillGeo(bike)
  return { geo, cockpit: fit.cockpit || {} }
}

function computePoints(g, c) {
  const rad = (d) => (d * Math.PI) / 180
  const rimR = rimEtrto(g.wheel) / 2
  const R = rimR + n(g.tire_width, 28)
  const bbDrop = n(g.bb_drop, 70)
  const chain = n(g.chainstay, 410)
  const wb = n(g.wheelbase, 995)
  const ha = rad(n(g.head_angle, 73))
  const sa = rad(n(g.seat_angle, 74))
  const ht = n(g.head_tube, 150)
  const reach = n(g.reach, 390)
  const stack = n(g.stack, 560)

  const BB = { x: 0, y: 0 }
  const rearAxle = { x: -Math.sqrt(Math.max(0, chain * chain - bbDrop * bbDrop)), y: bbDrop }
  const frontAxle = { x: rearAxle.x + wb, y: bbDrop }
  const headTop = { x: reach, y: stack }
  const headBot = { x: reach + ht * Math.cos(ha), y: stack - ht * Math.sin(ha) }

  const seatDir = { x: -Math.cos(sa), y: Math.sin(sa) }
  const stLen = n(g.seat_tube, 560)
  const seatTubeTop = { x: stLen * seatDir.x, y: stLen * seatDir.y }
  const sh = n(c.saddle_height, Math.max(stLen, 700))
  const saddle = { x: sh * seatDir.x - n(c.saddle_offset, 0), y: sh * seatDir.y }

  const steerUp = { x: -Math.cos(ha), y: Math.sin(ha) }
  const spacer = n(c.spacer, 30)
  const stemClamp = { x: headTop.x + spacer * steerUp.x, y: headTop.y + spacer * steerUp.y }
  const sAng = rad(n(c.stem_angle, -7))
  const base = { x: Math.sin(ha), y: Math.cos(ha) }
  const stemDir = { x: base.x * Math.cos(sAng) - base.y * Math.sin(sAng), y: base.x * Math.sin(sAng) + base.y * Math.cos(sAng) }
  const stemLen = n(c.stem_length, 100)
  const bar = { x: stemClamp.x + stemLen * stemDir.x, y: stemClamp.y + stemLen * stemDir.y }

  const barReach = n(c.bar_reach, 80)
  const barDrop = n(c.bar_drop, 125)
  const barRise = n(c.bar_rise, 0)
  const crankLen = n(c.crank_length, 172)
  const crankEnd = { x: crankLen * Math.cos(rad(-65)), y: crankLen * Math.sin(rad(-65)) }

  return { BB, rearAxle, frontAxle, headTop, headBot, seatTubeTop, saddle, stemClamp, bar, crankEnd, R, rimR, barReach, barDrop, barRise, steerUp }
}

// Leitet aus Geometrie + Cockpit alle Zeichenpunkte eines Rades ab.
function deriveDraw(geo, cockpit) {
  const p = computePoints(geo, cockpit)
  const mtb = geo.frame_type === 'mtb'
  const hood = { x: p.bar.x + p.barReach, y: p.bar.y + p.barRise }
  const dropEnd = { x: hood.x - p.barDrop / 2 - 34, y: hood.y - p.barDrop }
  const riserTop = { x: p.bar.x, y: p.bar.y + p.barRise }
  const gripEnd = { x: p.bar.x - 105, y: riserTop.y - 8 }
  const barTip = mtb ? gripEnd : dropEnd
  const axisLen = p.barDrop + 150
  const axisTop = { x: p.headTop.x + p.steerUp.x * axisLen, y: p.headTop.y + p.steerUp.y * axisLen }
  return { p, mtb, hood, dropEnd, riserTop, gripEnd, barTip, axisTop }
}

// Zeichnet ein einzelnes Rad (Rahmen, Räder, Gabel, Lenker) in gemeinsamen Koordinaten.
function BikeFrame({ d, X, Y, col }) {
  const { p, mtb, hood, dropEnd, riserTop, gripEnd } = d
  const line = (a, b, w, dash) => <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={col} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} />
  const wheel = (c) => (
    <g>
      <circle cx={X(c)} cy={Y(c)} r={p.R} fill="none" stroke={col} strokeWidth="3" />
      <circle cx={X(c)} cy={Y(c)} r={p.rimR} fill="none" stroke={col} strokeWidth="3" />
      <circle cx={X(c)} cy={Y(c)} r={Math.max(p.rimR - 18, 8)} fill="none" stroke={col} strokeWidth="2" opacity="0.6" />
      <circle cx={X(c)} cy={Y(c)} r="13" fill="none" stroke={col} strokeWidth="3" />
    </g>
  )
  const fmid = { x: (p.headBot.x + p.frontAxle.x) / 2 + 18, y: (p.headBot.y + p.frontAxle.y) / 2 }
  const forkD = mtb
    ? `M ${X(p.headBot)} ${Y(p.headBot)} L ${X(p.frontAxle)} ${Y(p.frontAxle)}`
    : `M ${X(p.headBot)} ${Y(p.headBot)} Q ${X(fmid)} ${Y(fmid)} ${X(p.frontAxle)} ${Y(p.frontAxle)}`
  const rr = p.barDrop / 2
  const curveTop = { x: hood.x - rr, y: hood.y }
  const curveBot = { x: hood.x - rr, y: hood.y - p.barDrop }
  const dropD = `M ${X(p.bar)} ${Y(p.bar)} L ${X(curveTop)} ${Y(curveTop)}`
    + ` A ${rr} ${rr} 0 0 1 ${X(curveBot)} ${Y(curveBot)} L ${X(dropEnd)} ${Y(dropEnd)}`
  const saddleBack = { x: p.saddle.x - 72, y: p.saddle.y }
  const saddleFront = { x: p.saddle.x + 32, y: p.saddle.y }
  return (
    <g>
      {wheel(p.rearAxle)}{wheel(p.frontAxle)}
      {line(p.BB, p.rearAxle, 15)}
      {line(p.rearAxle, p.seatTubeTop, 15)}
      {line(p.BB, p.seatTubeTop, 16)}
      {line(p.seatTubeTop, p.headTop, 16)}
      {line(p.BB, p.headTop, 17)}
      {line(p.headTop, p.headBot, 18)}
      <path d={forkD} fill="none" stroke={col} strokeWidth={mtb ? 16 : 13} strokeLinecap="round" />
      <circle cx={X(p.BB)} cy={Y(p.BB)} r="46" fill="none" stroke={col} strokeWidth="3" />
      {line(p.BB, p.crankEnd, 9)}
      {line(p.seatTubeTop, p.saddle, 9)}
      {line(saddleBack, saddleFront, 11)}
      {line(p.headTop, p.stemClamp, 13)}
      {line(p.stemClamp, p.bar, 13)}
      {mtb ? (
        <>
          {line(riserTop, gripEnd, 13)}
          <circle cx={X(gripEnd)} cy={Y(gripEnd)} r="10" fill="none" stroke={col} strokeWidth="4" />
        </>
      ) : (
        <path d={dropD} fill="none" stroke={col} strokeWidth="13" strokeLinecap="round" />
      )}
      <circle cx={X(p.BB)} cy={Y(p.BB)} r="7" fill={col} />
    </g>
  )
}

function BikeDrawing({ bikes, showDims, svgRef }) {
  const ds = bikes.map(b => ({ ...deriveDraw(b.geo, b.cockpit), col: b.col, geo: b.geo }))
  const maxR = Math.max(...ds.map(d => d.p.R))
  const all = ds.flatMap(d => {
    const p = d.p
    return [p.BB, p.rearAxle, p.frontAxle, p.headTop, p.headBot, p.seatTubeTop, p.saddle, p.stemClamp, p.bar, d.hood, d.barTip, d.axisTop, p.crankEnd]
  })
  const minX = Math.min(...all.map(q => q.x)) - maxR, maxX = Math.max(...all.map(q => q.x)) + maxR
  const minY = Math.min(...all.map(q => q.y)) - maxR, maxY = Math.max(...all.map(q => q.y)) + maxR
  const pad = 46
  const W = maxX - minX + pad * 2, H = maxY - minY + pad * 2
  const X = (q) => q.x - minX + pad
  const Y = (q) => maxY - q.y + pad
  const primary = ds[0], p = primary.p, geo = primary.geo
  const corner = { x: p.BB.x, y: p.headTop.y }
  const scaleY = pad + 6, scaleX2 = W - pad, scaleX1 = scaleX2 - 100

  return (
    <div className="bd-draw">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="bgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke={COL.grid} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={COL.bg} />
        <rect width={W} height={H} fill="url(#bgrid)" />

        {/* Steuerachse des ersten Rades (gepunktet) */}
        <line x1={X(p.headBot)} y1={Y(p.headBot)} x2={X(primary.axisTop)} y2={Y(primary.axisTop)} stroke={COL.ink3} strokeWidth="2" strokeDasharray="3 9" />

        {/* Vergleichsrad zuerst (liegt hinten), dann das aktive Rad */}
        {ds.slice(1).map((d, i) => <BikeFrame key={i} d={d} X={X} Y={Y} col={d.col} />)}
        <BikeFrame d={primary} X={X} Y={Y} col={primary.col} />

        {/* Maßstab 100 mm */}
        <line x1={scaleX1} y1={scaleY} x2={scaleX2} y2={scaleY} stroke={COL.ink2} strokeWidth="2" />
        <line x1={scaleX1} y1={scaleY - 6} x2={scaleX1} y2={scaleY + 6} stroke={COL.ink2} strokeWidth="2" />
        <line x1={scaleX2} y1={scaleY - 6} x2={scaleX2} y2={scaleY + 6} stroke={COL.ink2} strokeWidth="2" />
        <text x={(scaleX1 + scaleX2) / 2} y={scaleY - 12} fontSize="24" fontFamily="monospace" fill={COL.ink2} textAnchor="middle">100 mm</text>

        {showDims && (
          <g>
            <line x1={X(p.BB)} y1={Y(p.BB)} x2={X(corner)} y2={Y(corner)} stroke={COL.ink2} strokeWidth="2" strokeDasharray="8 8" />
            <line x1={X(corner)} y1={Y(corner)} x2={X(p.headTop)} y2={Y(p.headTop)} stroke={COL.ink2} strokeWidth="2" strokeDasharray="8 8" />
            <line x1={X(p.headTop)} y1={Y(p.headTop)} x2={X({ x: p.headTop.x, y: 0 })} y2={Y({ x: p.headTop.x, y: 0 })} stroke={COL.ink2} strokeWidth="2" strokeDasharray="8 8" />
            <line x1={X({ x: p.headTop.x, y: 0 })} y1={Y({ x: p.headTop.x, y: 0 })} x2={X(p.BB)} y2={Y(p.BB)} stroke={COL.ink2} strokeWidth="2" strokeDasharray="8 8" />
            <text x={X(p.BB) - 12} y={(Y(p.BB) + Y(corner)) / 2} fontSize="30" fontFamily="monospace" fill={primary.col} textAnchor="end">Stack {Math.round(n(geo.stack))}</text>
            <text x={(X(corner) + X(p.headTop)) / 2} y={Y(p.headTop) - 14} fontSize="30" fontFamily="monospace" fill={primary.col} textAnchor="middle">Reach {Math.round(n(geo.reach))}</text>
          </g>
        )}
      </svg>
      <style>{`
        .bd-draw { background: ${COL.bg}; border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
        .bd-draw svg { width: 100%; height: 230px; display: block; }
      `}</style>
    </div>
  )
}

function NumField({ label, unit, value, placeholder, onChange, signed, invalid }) {
  return (
    <label className="nf">
      <span className="nf-lbl">{label}{unit ? ` (${unit})` : ''}</span>
      <input
        className={`nf-in ${invalid ? 'bad' : ''}`}
        type={signed ? 'text' : 'number'}
        inputMode={signed ? 'text' : 'decimal'}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Metric({ label, val }) {
  return (
    <div className="metric"><div className="metric-val">{val}</div><div className="metric-lbl">{label}</div></div>
  )
}

export default function BikeFitArchive() {
  const { user } = useAuth()
  const [bikes, setBikes] = useState([])
  const [activeBikeId, setActiveBikeId] = useState(null)
  const [geo, setGeo] = useState({})
  const [cockpit, setCockpit] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showDims, setShowDims] = useState(false)
  const [openGeo, setOpenGeo] = useState(true)
  const [openCockpit, setOpenCockpit] = useState(true)
  const [compareId, setCompareId] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => { load() }, [])
  useEffect(() => {
    const b = bikes.find(x => x.id === activeBikeId)
    if (!b) return
    const fit = b.fit || {}
    setGeo(fit.geo && Object.keys(fit.geo).length ? { wheel: 'road', tire_width: 28, frame_type: 'road', ...fit.geo } : prefillGeo(b))
    setCockpit(fit.cockpit || {})
  }, [activeBikeId, bikes])

  async function load() {
    setLoading(true)
    try {
      const b = (await getBikes(user.id)).filter(x => !x.archived)
      setBikes(b)
      if (b.length && !activeBikeId) setActiveBikeId(b[0].id)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2200) }
  const setG = (k) => (v) => setGeo(p => ({ ...p, [k]: v }))
  const setC = (k) => (v) => setCockpit(p => ({ ...p, [k]: v }))

  async function save() {
    try {
      await updateBike(activeBikeId, { fit: { geo, cockpit } })
      setBikes(prev => prev.map(b => b.id === activeBikeId ? { ...b, fit: { geo, cockpit } } : b))
      showToast('✓ Gespeichert')
    } catch (e) { showToast('⚠ Fehler beim Speichern') }
  }


  function exportPng() {
    const svg = svgRef.current
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))
    const img = new Image()
    img.onload = () => {
      const scale = 2, vb = svg.viewBox.baseVal
      const canvas = document.createElement('canvas')
      canvas.width = vb.width * scale; canvas.height = vb.height * scale
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'cyclog-geometrie.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Cyclog Geometrie' }); return } catch (e) {}
        }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cyclog-geometrie.png'; a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      }, 'image/png')
    }
    img.src = url
  }

  const str = (n(geo.reach) > 0) ? (n(geo.stack) / n(geo.reach)).toFixed(2) : '—'
  const pp = computePoints(geo, cockpit)
  const hoodPt = { x: pp.bar.x + pp.barReach, y: pp.bar.y + pp.barRise }
  const saddleDrop = Math.round(pp.saddle.y - hoodPt.y)
  const s2bar = Math.round(hoodPt.x - pp.saddle.x)

  const activeName = bikes.find(b => b.id === activeBikeId)?.name || 'Aktiv'
  const compareBike = bikes.find(b => b.id === compareId && b.id !== activeBikeId) || null
  const cmp = compareBike ? fitOf(compareBike) : null
  const drawBikes = [{ geo, cockpit, col: COL.acc }]
  if (cmp) drawBikes.push({ geo: cmp.geo, cockpit: cmp.cockpit, col: COL.b })

  return (
    <Page title="Bike-Fit" subtitle="Geometrie & Sitzposition – live gezeichnet" back="/">
      {loading ? null : bikes.length === 0 ? (
        <Empty emoji="📐" title="Keine Fahrräder" sub="Lege zuerst ein Fahrrad an." />
      ) : (
        <>
          <div className="bf-chips">
            {bikes.map(b => (
              <button key={b.id} className={`bf-chip ${b.id === activeBikeId ? 'on' : ''}`} onClick={() => setActiveBikeId(b.id)}>
                {b.name}
              </button>
            ))}
          </div>

          <div className="bf-type">
            <button className={`bf-tbtn ${geo.frame_type !== 'mtb' ? 'on' : ''}`} onClick={() => setG('frame_type')('road')}>🚴 Rennrad</button>
            <button className={`bf-tbtn ${geo.frame_type === 'mtb' ? 'on' : ''}`} onClick={() => setG('frame_type')('mtb')}>⛰️ MTB</button>
          </div>

          <BikeDrawing bikes={drawBikes} showDims={showDims} svgRef={svgRef} />

          {cmp && (
            <div className="bf-legend">
              <span className="bf-leg"><i style={{ background: COL.acc }} />{activeName}</span>
              <span className="bf-leg"><i style={{ background: COL.b }} />{compareBike.name}</span>
            </div>
          )}

          <div className="bf-tools">
            <button className={`bf-tbtn ${showDims ? 'on' : ''}`} onClick={() => setShowDims(s => !s)}>📏 Maße</button>
            <button className="bf-tbtn" onClick={exportPng}>⤓ Als Bild</button>
          </div>

          {bikes.length > 1 && (
            <label className="bf-compare">
              <span className="bf-cmp-lbl">⚖ Vergleichen</span>
              <select className="nf-in" value={compareId || ''} onChange={(e) => setCompareId(e.target.value || null)}>
                <option value="">— kein Vergleich —</option>
                {bikes.filter(b => b.id !== activeBikeId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}

          {cmp ? (
            <div className="bf-difftable">
              <div className="bf-diff-row bf-diff-head">
                <span>Geometrie</span>
                <span style={{ color: COL.acc }}>{activeName}</span>
                <span style={{ color: COL.b }}>{compareBike.name}</span>
              </div>
              {CMP_ROWS.map(([k, l, u, dec]) => {
                const a = cmpValue(geo, k), b = cmpValue(cmp.geo, k)
                const unit = (x) => x == null ? 'N/A' : `${roundDec(x, dec)}${u === '°' ? ' °' : u ? ' ' + u : ''}`
                const d = a != null && b != null ? b - a : null
                const dr = d == null ? 0 : roundDec(d, dec)
                return (
                  <div className="bf-diff-row" key={k}>
                    <span className="bf-diff-lbl">{l}</span>
                    <span>{unit(a)}</span>
                    <span>
                      {unit(b)}
                      {d != null && dr !== 0 && (
                        <em className={dr > 0 ? 'pos' : 'neg'}> ({fmtDelta(d, u, dec)})</em>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bf-metrics">
              <Metric label="STR" val={str} />
              <Metric label="Radstand" val={`${Math.round(n(geo.wheelbase))} mm`} />
              <Metric label="Sattelüberh." val={`${saddleDrop} mm`} />
              <Metric label="Sattel→Lenker" val={`${s2bar} mm`} />
            </div>
          )}

          <button className="bf-sec" onClick={() => setOpenGeo(o => !o)}>
            <span>Rahmen-Geometrie</span><span className="bf-caret">{openGeo ? '▾' : '▸'}</span>
          </button>
          {openGeo && (
            <div className="bf-grid">
              {GEO_FIELDS.map(([k, l, u, ph, s]) => (
                <NumField key={k} label={l} unit={u} value={geo[k]} placeholder={ph} signed={s} invalid={outOfRange(k, geo[k])} onChange={setG(k)} />
              ))}
              <label className="nf">
                <span className="nf-lbl">Laufradgröße</span>
                <select className="nf-in" value={geo.wheel || 'road'} onChange={(e) => setG('wheel')(e.target.value)}>
                  {WHEELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            </div>
          )}

          <button className="bf-sec" onClick={() => setOpenCockpit(o => !o)}>
            <span>Cockpit / Sitzposition</span><span className="bf-caret">{openCockpit ? '▾' : '▸'}</span>
          </button>
          {openCockpit && (
            <div className="bf-grid">
              {COCKPIT_FIELDS.map(([k, l, u, ph, s]) => (
                <NumField key={k} label={l} unit={u} value={cockpit[k]} placeholder={ph} signed={s} invalid={outOfRange(k, cockpit[k])} onChange={setC(k)} />
              ))}
            </div>
          )}

          <BtnGreen onClick={save}>Speichern</BtnGreen>
        </>
      )}

      {toast && <div className="bf-toast">{toast}</div>}

      <style>{`
        .bf-chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px; }
        .bf-chip { flex-shrink: 0; padding: 9px 15px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mono); font-size: 13px; font-weight: 700; letter-spacing: .5px; color: var(--ink2); white-space: nowrap; }
        .bf-chip.on { background: var(--acc); border-color: var(--acc); color: #fff; }
        .bf-type { display: flex; gap: 8px; margin-bottom: 12px; }
        .bf-legend { display: flex; gap: 16px; justify-content: center; margin-bottom: 10px; }
        .bf-leg { display: flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink1); }
        .bf-leg i { width: 14px; height: 4px; border-radius: 2px; display: inline-block; }
        .bf-compare { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .bf-cmp-lbl { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); }
        .bf-difftable { margin-bottom: 18px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
        .bf-diff-row { display: grid; grid-template-columns: 1fr 1fr 1.5fr; align-items: center; gap: 8px; padding: 9px 12px; font-family: var(--mono); font-size: 13px; color: var(--ink1); border-top: 1px solid var(--line); }
        .bf-diff-row:first-child { border-top: none; }
        .bf-diff-row > span { text-align: right; }
        .bf-diff-lbl { text-align: left !important; color: var(--ink2); font-size: 11px; letter-spacing: .3px; }
        .bf-diff-head { background: var(--panel2); font-size: 11px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); }
        .bf-diff-head > span { text-align: right; }
        .bf-diff-head > span:first-child { text-align: left; }
        .bf-diff-row em { font-style: normal; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .bf-diff-row .pos { color: var(--ok); }
        .bf-diff-row .neg { color: var(--crit); }
        .bf-tools { display: flex; gap: 8px; margin-bottom: 14px; }
        .bf-tbtn { flex: 1; font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 9px 6px; background: var(--panel); border: 1px solid var(--line); color: var(--ink2); }
        .bf-tbtn.on { background: rgba(47,123,255,.12); border-color: rgba(47,123,255,.5); color: var(--acc); }
        .bf-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
        .metric { background: var(--panel2); border: 1px solid var(--line); padding: 10px 6px; text-align: center; }
        .metric-val { font-family: var(--sans); font-size: 15px; font-weight: 900; color: var(--ink1); letter-spacing: -.3px; }
        .metric-lbl { font-family: var(--mono); font-size: 8.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); margin-top: 3px; }
        .bf-sec { display: flex; align-items: center; justify-content: space-between; width: 100%; font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink2); background: var(--panel2); border: 1px solid var(--line); padding: 11px 13px; margin-bottom: 10px; }
        .bf-caret { color: var(--ink3); }
        .bf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .nf { display: flex; flex-direction: column; gap: 5px; }
        .nf-lbl { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); }
        .nf-in { background: var(--panel2); border: 1px solid var(--line); padding: 11px 12px; font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--ink1); outline: none; }
        .nf-in:focus { border-color: var(--acc); }
        .nf-in.bad { border-color: var(--crit); color: var(--crit); }
        .nf-in::-webkit-outer-spin-button, .nf-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        select.nf-in { -webkit-appearance: none; appearance: none; }
        .bf-toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--acc); color: var(--ink1); padding: 11px 22px; font-family: var(--mono); font-size: 13px; z-index: 500; }
      `}</style>
    </Page>
  )
}
