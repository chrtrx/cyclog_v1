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

  // Lenker (Drop-Bar): Reach nach vorn, dann Drop nach unten.
  const barReach = n(c.bar_reach, 80)
  const barDrop = n(c.bar_drop, 125)
  const barFwd = { x: bar.x + barReach, y: bar.y + n(c.bar_rise, 0) }
  const barLow = { x: barFwd.x, y: barFwd.y - barDrop }

  // Kurbel: vom Tretlager nach unten-vorn.
  const crankLen = n(c.crank_length, 172)
  const crank = { x: crankLen * Math.cos(rad(-65)), y: crankLen * Math.sin(rad(-65)) }

  return { BB, rearAxle, frontAxle, headTop, headBot, seatTubeTop, saddle, stemClamp, bar, barFwd, barLow, crank, R }
}

function BikeDrawing({ geo, cockpit }) {
  const p = computePoints(geo, cockpit)
  const pts = [p.BB, p.rearAxle, p.frontAxle, p.headTop, p.headBot, p.seatTubeTop, p.saddle, p.stemClamp, p.bar, p.barFwd, p.barLow, p.crank]
  const minX = Math.min(...pts.map(q => q.x)) - p.R, maxX = Math.max(...pts.map(q => q.x)) + p.R
  const minY = Math.min(...pts.map(q => q.y)) - p.R, maxY = Math.max(...pts.map(q => q.y)) + p.R
  const pad = 36
  const W = maxX - minX + pad * 2, H = maxY - minY + pad * 2
  const X = (q) => q.x - minX + pad
  const Y = (q) => maxY - q.y + pad
  const line = (a, b, w = 7, col = 'var(--acc)') =>
    <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={col} strokeWidth={w} strokeLinecap="round" />

  return (
    <div className="bd-draw">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <circle cx={X(p.rearAxle)} cy={Y(p.rearAxle)} r={p.R} fill="none" stroke="var(--ink3)" strokeWidth="6" />
        <circle cx={X(p.frontAxle)} cy={Y(p.frontAxle)} r={p.R} fill="none" stroke="var(--ink3)" strokeWidth="6" />
        {/* Rahmen */}
        {line(p.BB, p.rearAxle)}
        {line(p.rearAxle, p.seatTubeTop)}
        {line(p.BB, p.seatTubeTop)}
        {line(p.seatTubeTop, p.headTop)}
        {line(p.BB, p.headTop)}
        {line(p.headTop, p.headBot)}
        {line(p.headBot, p.frontAxle, 6)}
        {/* Kurbel */}
        {line(p.BB, p.crank, 6, 'var(--ink2)')}
        <circle cx={X(p.crank)} cy={Y(p.crank)} r="6" fill="var(--ink2)" />
        {/* Sattelstütze + Sattel */}
        {line(p.seatTubeTop, p.saddle, 5)}
        <line x1={X(p.saddle) - 30} y1={Y(p.saddle)} x2={X(p.saddle) + 22} y2={Y(p.saddle)} stroke="var(--ok)" strokeWidth="8" strokeLinecap="round" />
        {/* Spacer + Vorbau + Lenker (Reach + Drop) */}
        {line(p.headTop, p.stemClamp, 6, 'var(--ink2)')}
        {line(p.stemClamp, p.bar, 6, 'var(--warn)')}
        {line(p.bar, p.barFwd, 6, 'var(--warn)')}
        {line(p.barFwd, p.barLow, 6, 'var(--warn)')}
        <circle cx={X(p.barLow)} cy={Y(p.barLow)} r="6" fill="var(--warn)" />
        {/* Tretlager */}
        <circle cx={X(p.BB)} cy={Y(p.BB)} r="7" fill="var(--acc)" />
      </svg>
      <style>{`
        .bd-draw { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 16px; }
        .bd-draw svg { width: 100%; height: 210px; display: block; }
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

export default function BikeFitArchive() {
  const { user } = useAuth()
  const [bikes, setBikes] = useState([])
  const [activeBikeId, setActiveBikeId] = useState(null)
  const [geo, setGeo] = useState({})
  const [cockpit, setCockpit] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

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

          <BikeDrawing geo={geo} cockpit={cockpit} />
          <div className="bf-str">STR (Stack/Reach): <b>{str}</b></div>

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
        .bf-str { font-family: var(--mono); font-size: 11px; color: var(--ink3); letter-spacing: .5px; text-transform: uppercase; margin-bottom: 16px; }
        .bf-str b { color: var(--acc); }
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
