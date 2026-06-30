import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getBikes, updateBike } from '../lib/data'
import { Page, BtnGreen, Empty } from '../components/ui'

// key, Label, Einheit, Platzhalter, signed? (Minus erlaubt)
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

// Laufradgrößen (Zoll) → ungefährer Außendurchmesser in mm (für die Zeichnung).
const WHEELS = [
  ['road', '700c / 28″', 675],
  ['29',   '29″ MTB',    736],
  ['275',  '27,5″',      698],
  ['26',   '26″',        660],
]
const wheelDia = (key) => (WHEELS.find(w => w[0] === key) || WHEELS[0])[2]

function prefillGeo(bike) {
  return {
    reach: bike.geo_reach ?? '', stack: bike.geo_stack ?? '',
    head_angle: bike.geo_head_angle ?? '', seat_angle: bike.geo_seat_angle ?? '',
    top_tube: bike.geo_top_tube ?? '', seat_tube: bike.geo_seat_tube ?? '',
    head_tube: bike.geo_head_tube ?? '', chainstay: bike.geo_chainstay ?? '',
    bb_drop: bike.geo_bb_drop ?? '', wheelbase: bike.geo_wheelbase ?? '',
    standover: bike.geo_standover ?? '', wheel: 'road',
  }
}

// Zahl mit Fallback (greift auch bei leerem Feld → Zeichnung bleibt vollständig).
const n = (v, d = 0) => { const x = Number(v); return v !== '' && v != null && isFinite(x) ? x : d }

function computePoints(g, c) {
  const rad = (d) => (d * Math.PI) / 180
  const R = wheelDia(g.wheel) / 2
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
  const stemDir = {
    x: base.x * Math.cos(sAng) - base.y * Math.sin(sAng),
    y: base.x * Math.sin(sAng) + base.y * Math.cos(sAng),
  }
  const stemLen = n(c.stem_length, 100)
  const bar = { x: stemClamp.x + stemLen * stemDir.x, y: stemClamp.y + stemLen * stemDir.y }

  const barReach = n(c.bar_reach, 80)
  const barDrop = n(c.bar_drop, 125)
  const barRise = n(c.bar_rise, 0)
  const crankLen = n(c.crank_length, 172)
  const crankEnd = { x: crankLen * Math.cos(rad(-65)), y: crankLen * Math.sin(rad(-65)) }

  return { BB, rearAxle, frontAxle, headTop, headBot, seatTubeTop, saddle, stemClamp, bar, crankEnd, R, barReach, barDrop, barRise }
}

function BikeDrawing({ geo, cockpit, showDims }) {
  const p = computePoints(geo, cockpit)
  const hood = { x: p.bar.x + p.barReach, y: p.bar.y + p.barRise }
  const dropB = { x: hood.x - 30, y: hood.y - p.barDrop }
  const corners = [p.BB, p.rearAxle, p.frontAxle, p.headTop, p.headBot, p.seatTubeTop, p.saddle, p.stemClamp, p.bar, hood, dropB, p.crankEnd]
  const minX = Math.min(...corners.map(q => q.x)) - p.R, maxX = Math.max(...corners.map(q => q.x)) + p.R
  const minY = Math.min(...corners.map(q => q.y)) - p.R, maxY = Math.max(...corners.map(q => q.y)) + p.R
  const pad = 40
  const W = maxX - minX + pad * 2, H = maxY - minY + pad * 2
  const X = (q) => q.x - minX + pad
  const Y = (q) => maxY - q.y + pad
  const line = (a, b, w, col) => <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={col} strokeWidth={w} strokeLinecap="round" />

  // gebogene Gabel
  const fmid = { x: (p.headBot.x + p.frontAxle.x) / 2 + 18, y: (p.headBot.y + p.frontAxle.y) / 2 }
  const forkD = `M ${X(p.headBot)} ${Y(p.headBot)} Q ${X(fmid)} ${Y(fmid)} ${X(p.frontAxle)} ${Y(p.frontAxle)}`
  // gebogener Drop-Lenker
  const clamp = p.bar
  const topB = { x: clamp.x - 38, y: clamp.y - 4 }
  const cp1 = { x: clamp.x + p.barReach * 0.7, y: clamp.y + 12 }
  const dropF = { x: hood.x + 6, y: hood.y - p.barDrop * 0.6 }
  const dropMid = { x: dropF.x - 4, y: dropF.y - p.barDrop * 0.4 }
  const cp2 = { x: dropB.x + 18, y: dropB.y }
  const barD = `M ${X(topB)} ${Y(topB)} L ${X(clamp)} ${Y(clamp)} Q ${X(cp1)} ${Y(cp1)} ${X(hood)} ${Y(hood)} Q ${X(dropF)} ${Y(dropF)} ${X(dropMid)} ${Y(dropMid)} Q ${X(cp2)} ${Y(cp2)} ${X(dropB)} ${Y(dropB)}`
  // Sattel-Silhouette
  const sx = X(p.saddle), sy = Y(p.saddle)
  const saddleD = `M ${sx - 78} ${sy + 2} Q ${sx - 80} ${sy - 9} ${sx - 55} ${sy - 9} L ${sx + 18} ${sy - 9} Q ${sx + 40} ${sy - 9} ${sx + 34} ${sy + 2} Q ${sx + 5} ${sy + 6} ${sx - 78} ${sy + 2} Z`

  return (
    <div className="bd-draw">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="bgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="var(--line2)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#bgrid)" />
        {/* Räder: Reifen + Felge */}
        <circle cx={X(p.rearAxle)} cy={Y(p.rearAxle)} r={p.R} fill="none" stroke="var(--ink2)" strokeWidth="9" />
        <circle cx={X(p.rearAxle)} cy={Y(p.rearAxle)} r={p.R - 26} fill="none" stroke="var(--ink3)" strokeWidth="3" />
        <circle cx={X(p.frontAxle)} cy={Y(p.frontAxle)} r={p.R} fill="none" stroke="var(--ink2)" strokeWidth="9" />
        <circle cx={X(p.frontAxle)} cy={Y(p.frontAxle)} r={p.R - 26} fill="none" stroke="var(--ink3)" strokeWidth="3" />
        {/* Rahmen */}
        {line(p.BB, p.rearAxle, 9, 'var(--acc)')}
        {line(p.rearAxle, p.seatTubeTop, 9, 'var(--acc)')}
        {line(p.BB, p.seatTubeTop, 10, 'var(--acc)')}
        {line(p.seatTubeTop, p.headTop, 10, 'var(--acc)')}
        {line(p.BB, p.headTop, 11, 'var(--acc)')}
        {line(p.headTop, p.headBot, 12, 'var(--acc)')}
        {/* Gabel */}
        <path d={forkD} fill="none" stroke="var(--acc)" strokeWidth="8" strokeLinecap="round" />
        {/* Kettenblatt + Kurbel */}
        <circle cx={X(p.BB)} cy={Y(p.BB)} r="46" fill="none" stroke="var(--ink3)" strokeWidth="3" />
        {line(p.BB, p.crankEnd, 7, 'var(--ink1)')}
        <circle cx={X(p.crankEnd)} cy={Y(p.crankEnd)} r="6" fill="var(--ink1)" />
        {/* Sattelstütze + Sattel */}
        {line(p.seatTubeTop, p.saddle, 6, 'var(--acc)')}
        <path d={saddleD} fill="var(--ok)" />
        {/* Spacer + Vorbau + Lenker */}
        {line(p.headTop, p.stemClamp, 8, 'var(--ink2)')}
        {line(p.stemClamp, p.bar, 7, 'var(--warn)')}
        <path d={barD} fill="none" stroke="var(--warn)" strokeWidth="7" strokeLinecap="round" />
        {/* Tretlager */}
        <circle cx={X(p.BB)} cy={Y(p.BB)} r="6" fill="var(--acc)" />
        {/* Maße (umschaltbar): Stack senkrecht, Reach waagerecht */}
        {showDims && (
          <g>
            <line x1={X(p.BB)} y1={Y(p.BB)} x2={X({ x: p.BB.x, y: p.headTop.y })} y2={Y({ x: p.BB.x, y: p.headTop.y })} stroke="var(--ink3)" strokeWidth="2" strokeDasharray="7 7" />
            <line x1={X({ x: p.BB.x, y: p.headTop.y })} y1={Y({ x: p.BB.x, y: p.headTop.y })} x2={X(p.headTop)} y2={Y(p.headTop)} stroke="var(--ink3)" strokeWidth="2" strokeDasharray="7 7" />
            <text x={X(p.BB) - 12} y={(Y(p.BB) + Y({ x: p.BB.x, y: p.headTop.y })) / 2} fontSize="32" fontFamily="var(--mono)" fill="var(--acc)" textAnchor="end">Stack {Math.round(n(geo.stack))}</text>
            <text x={(X({ x: p.BB.x, y: p.headTop.y }) + X(p.headTop)) / 2} y={Y(p.headTop) - 14} fontSize="32" fontFamily="var(--mono)" fill="var(--acc)" textAnchor="middle">Reach {Math.round(n(geo.reach))}</text>
          </g>
        )}
      </svg>
      <style>{`
        .bd-draw { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 16px; }
        .bd-draw svg { width: 100%; height: 230px; display: block; }
      `}</style>
    </div>
  )
}

function NumField({ label, unit, value, placeholder, onChange, signed }) {
  return (
    <label className="nf">
      <span className="nf-lbl">{label}{unit ? ` (${unit})` : ''}</span>
      <input
        className="nf-in"
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
    <div className="metric">
      <div className="metric-val">{val}</div>
      <div className="metric-lbl">{label}</div>
    </div>
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

  useEffect(() => { load() }, [])
  useEffect(() => {
    const b = bikes.find(x => x.id === activeBikeId)
    if (!b) return
    const fit = b.fit || {}
    setGeo(fit.geo && Object.keys(fit.geo).length ? { wheel: 'road', ...fit.geo } : prefillGeo(b))
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

  const str = (n(geo.reach) > 0) ? (n(geo.stack) / n(geo.reach)).toFixed(2) : '—'
  // Fitting-Kennzahlen aus den aktuellen Werten
  const pp = computePoints(geo, cockpit)
  const hoodPt = { x: pp.bar.x + pp.barReach, y: pp.bar.y + pp.barRise }
  const saddleDrop = Math.round(pp.saddle.y - hoodPt.y)   // Sattel über Lenker
  const s2bar = Math.round(hoodPt.x - pp.saddle.x)         // Sattel → Lenker (horiz.)

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

          <BikeDrawing geo={geo} cockpit={cockpit} showDims={showDims} />
          <div className="bf-tools">
            <button className={`bf-dim ${showDims ? 'on' : ''}`} onClick={() => setShowDims(s => !s)}>
              📏 Maße {showDims ? 'an' : 'aus'}
            </button>
          </div>
          <div className="bf-metrics">
            <Metric label="STR" val={str} />
            <Metric label="Radstand" val={`${Math.round(n(geo.wheelbase))} mm`} />
            <Metric label="Sattelüberh." val={`${saddleDrop} mm`} />
            <Metric label="Sattel→Lenker" val={`${s2bar} mm`} />
          </div>

          <div className="bf-sec">Rahmen-Geometrie</div>
          <div className="bf-grid">
            {GEO_FIELDS.map(([k, l, u, ph, s]) => (
              <NumField key={k} label={l} unit={u} value={geo[k]} placeholder={ph} signed={s} onChange={setG(k)} />
            ))}
            <label className="nf">
              <span className="nf-lbl">Laufradgröße</span>
              <select className="nf-in" value={geo.wheel || 'road'} onChange={(e) => setG('wheel')(e.target.value)}>
                {WHEELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>

          <div className="bf-sec">Cockpit / Sitzposition</div>
          <div className="bf-grid">
            {COCKPIT_FIELDS.map(([k, l, u, ph, s]) => (
              <NumField key={k} label={l} unit={u} value={cockpit[k]} placeholder={ph} signed={s} onChange={setC(k)} />
            ))}
          </div>

          <BtnGreen onClick={save}>Speichern</BtnGreen>
        </>
      )}

      {toast && <div className="bf-toast">{toast}</div>}

      <style>{`
        .bf-chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px; }
        .bf-chip { flex-shrink: 0; padding: 9px 15px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mono); font-size: 13px; font-weight: 700; letter-spacing: .5px; color: var(--ink2); white-space: nowrap; }
        .bf-chip.on { background: var(--acc); border-color: var(--acc); color: #fff; }
        .bf-tools { display: flex; justify-content: flex-end; margin: -8px 0 10px; }
        .bf-dim { font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 7px 12px; background: var(--panel); border: 1px solid var(--line); color: var(--ink2); }
        .bf-dim.on { background: rgba(47,123,255,.12); border-color: rgba(47,123,255,.5); color: var(--acc); }
        .bf-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
        .metric { background: var(--panel2); border: 1px solid var(--line); padding: 10px 6px; text-align: center; }
        .metric-val { font-family: var(--sans); font-size: 15px; font-weight: 900; color: var(--ink1); letter-spacing: -.3px; }
        .metric-lbl { font-family: var(--mono); font-size: 8.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); margin-top: 3px; }
        .bf-sec { font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink3); margin: 4px 0 10px; }
        .bf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
        .nf { display: flex; flex-direction: column; gap: 5px; }
        .nf-lbl { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); }
        .nf-in { background: var(--panel2); border: 1px solid var(--line); padding: 11px 12px; font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--ink1); outline: none; }
        .nf-in:focus { border-color: var(--acc); }
        .nf-in::-webkit-outer-spin-button, .nf-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        select.nf-in { -webkit-appearance: none; appearance: none; }
        .bf-toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--acc); color: var(--ink1); padding: 11px 22px; font-family: var(--mono); font-size: 13px; z-index: 500; }
      `}</style>
    </Page>
  )
}
