import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { getBikes, updateBike } from '../lib/data'
import { Page, BtnGreen, Empty } from '../components/ui'
import ZoomView from '../components/ZoomView'

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
// Körpermaße für Fahrer-Silhouette + Winkelberechnung. Fehlende Werte
// werden aus der Körpergröße geschätzt.
const BODY_FIELDS = [
  ['height', 'Körpergröße',    'mm', '1780'],
  ['inseam', 'Innenbeinlänge', 'mm', '820'],
  ['torso',  'Rumpflänge',     'mm', 'auto'],
  ['arm',    'Armlänge',       'mm', 'auto'],
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
  height: [1450, 2100], inseam: [650, 950], torso: [420, 700], arm: [480, 760],
}
const outOfRange = (k, v) => {
  const r = RANGES[k]; if (!r || v === '' || v == null) return false
  const x = Number(v); return isFinite(x) && (x < r[0] || x > r[1])
}

// Kern-Geometrie eines Rades aus den geo_*-Spalten (Quelle = Geometrie-Tab).
function coreGeo(bike) {
  return {
    reach: bike.geo_reach, stack: bike.geo_stack, head_angle: bike.geo_head_angle,
    seat_angle: bike.geo_seat_angle, top_tube: bike.geo_top_tube, seat_tube: bike.geo_seat_tube,
    head_tube: bike.geo_head_tube, chainstay: bike.geo_chainstay, bb_drop: bike.geo_bb_drop,
    wheelbase: bike.geo_wheelbase, standover: bike.geo_standover,
  }
}

// Lädt Geometrie + Cockpit eines Rades. Die Kern-Geometrie kommt aus den
// geo_*-Spalten (im Geometrie-Tab gepflegt) und hat Vorrang, damit dort
// eingegebene Werte direkt im Bike-Setup erscheinen. Bike-Fit-Extras
// (Laufrad, Reifen, Rahmentyp, Gabel-Offset) kommen aus dem fit-JSON.
function loadGeo(bike) {
  const fit = bike?.fit || {}
  const fg = fit.geo || {}
  const geo = { ...fg }
  for (const [k, v] of Object.entries(coreGeo(bike))) {
    if (v != null && v !== '') geo[k] = v          // geo_* überschreibt, wenn vorhanden
    else if (geo[k] == null) geo[k] = ''           // sonst leeres Eingabefeld
  }
  geo.wheel = fg.wheel ?? 'road'
  geo.tire_width = fg.tire_width ?? 28
  geo.frame_type = fg.frame_type ?? 'road'
  // Körpermaße; ältere Stände hatten die Innenbeinlänge im Cockpit.
  const body = fit.body || (fit.cockpit?.inseam ? { inseam: fit.cockpit.inseam } : {})
  return { geo, cockpit: fit.cockpit || {}, body }
}

const n = (v, d = 0) => { const x = Number(typeof v === 'string' ? v.replace(',', '.') : v); return v !== '' && v != null && isFinite(x) ? x : d }
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

// Wiederverwendbare Vergleichstabelle (Wert + Abweichung in Klammern).
function DiffTable({ title, rows, aVals, bVals, aName, bName }) {
  return (
    <div className="bf-difftable">
      <div className="bf-diff-row bf-diff-head">
        <span>{title}</span>
        <span style={{ color: COL.acc }}>{aName}</span>
        <span style={{ color: COL.b }}>{bName}</span>
      </div>
      {rows.map(([k, l, u, dec]) => {
        const a = aVals[k] == null || !isFinite(Number(aVals[k])) ? null : Number(aVals[k])
        const b = bVals[k] == null || !isFinite(Number(bVals[k])) ? null : Number(bVals[k])
        const fmt = (x) => x == null ? 'N/A' : `${roundDec(x, dec)}${u === '°' ? ' °' : u ? ' ' + u : ''}`
        const d = a != null && b != null ? b - a : null
        const dr = d == null ? 0 : roundDec(d, dec)
        return (
          <div className="bf-diff-row" key={k}>
            <span className="bf-diff-lbl">{l}</span>
            <span>{fmt(a)}</span>
            <span>{fmt(b)}{d != null && dr !== 0 && <em className={dr > 0 ? 'pos' : 'neg'}> ({fmtDelta(d, u, dec)})</em>}</span>
          </div>
        )
      })}
    </div>
  )
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

// Gelenkpunkt (Knie/Ellbogen/Schulter) als Schnittpunkt zweier Kreise um A
// und B mit Radien r1/r2; side wählt die Seite der Verbindungslinie.
function circleJoint(A, B, r1, r2, side) {
  const dx = B.x - A.x, dy = B.y - A.y
  const d = Math.hypot(dx, dy) || 1
  const dd = Math.min(d, r1 + r2 - 2)   // unerreichbar → fast gestreckt
  const a = (r1 * r1 - r2 * r2 + dd * dd) / (2 * dd)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const ux = dx / d, uy = dy / d
  return { x: A.x + a * ux - side * uy * h, y: A.y + a * uy + side * ux * h }
}

// Körpermaße → Segmentlängen. Fehlende Werte werden aus der Körpergröße
// geschätzt; ohne Angaben gilt ein Durchschnittsfahrer (Auto-Anpassung).
// Oberschenkel/Unterschenkel sind so kalibriert, dass bei Sitzhöhe nach
// LeMond (0,883 × Schrittlänge) ein Kniewinkel von ~142° entsteht.
function bodySegments(body = {}) {
  const H = n(body.height, 0)
  const I = n(body.inseam, 0) || (H ? H * 0.45 : 0)
  return {
    real: I > 0,
    thigh: I ? I * 0.63 : null,
    shank: I ? I * 0.645 : null,
    torso: n(body.torso, 0) || (H ? H * 0.31 : 565),
    arm: n(body.arm, 0) || (H ? H * 0.34 : 590),
  }
}

// Winkel (in Grad) am Punkt B zwischen den Strecken B→A und B→C.
const angleAt = (B, A, C) => {
  const v1 = { x: A.x - B.x, y: A.y - B.y }, v2 = { x: C.x - B.x, y: C.y - B.y }
  const m = (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1
  return Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / m))) * 180 / Math.PI
}

// Fahrer-Silhouette in Fahrposition: Hüfte auf dem Sattel, Hände an
// Bremsgriff (Rennrad) bzw. Griff (MTB), Fuß auf dem Pedal. Knie/Ellbogen
// werden per Zweigelenk-Kette bestimmt, die Schulter so gesetzt, dass
// Rumpf- und Armlänge zusammenpassen. Mit eingetragenen Körpermaßen werden
// zusätzlich Rumpf-, Hüft-, Knie- und Schulterwinkel berechnet.
function riderPoints(d, body) {
  const { p, mtb, hood, gripEnd } = d
  const seg = bodySegments(body)
  const rr = p.barDrop / 2
  const hand = mtb ? { x: gripEnd.x + 12, y: gripEnd.y + 6 } : { x: hood.x - rr * 0.43, y: hood.y - rr * 0.1 }
  const hip = { x: p.saddle.x - 12, y: p.saddle.y + 78 }
  const pedal = p.crankEnd
  const autoSeg = Math.hypot(pedal.x - hip.x, pedal.y - hip.y) * 0.55
  const thigh = seg.thigh || autoSeg
  const shank = seg.shank || autoSeg
  const knee = circleJoint(hip, pedal, thigh, shank, 1)
  const shoulder = circleJoint(hip, hand, seg.torso, seg.arm, 1)
  const armSeg = seg.arm * 0.53
  const elbow = circleJoint(shoulder, hand, armSeg, armSeg, -1)
  const tl = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) || 1
  const head = { x: shoulder.x + ((shoulder.x - hip.x) / tl) * 145, y: shoulder.y + ((shoulder.y - hip.y) / tl) * 145 }

  // Winkel nur mit echten Körpermaßen (sonst wären sie beliebig):
  // Knie/Hüfte am unteren Totpunkt (Kurbel senkrecht nach unten).
  let angles = null
  if (seg.real) {
    const crankLen = Math.hypot(p.crankEnd.x, p.crankEnd.y)
    const pedalBDC = { x: 0, y: -crankLen }
    const kneeB = circleJoint(hip, pedalBDC, thigh, shank, 1)
    angles = {
      torso: Math.round(Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x) * 180 / Math.PI),
      knee: Math.round(angleAt(kneeB, hip, pedalBDC)),
      hip: Math.round(angleAt(hip, shoulder, kneeB)),
      shoulder: Math.round(angleAt(shoulder, hip, elbow)),
    }
  }
  return { hip, knee, pedal, shoulder, elbow, hand, head, headR: 88, angles }
}

// Zeichnet die Fahrer-Silhouette (nur für das aktive Rad).
function Rider({ d, X, Y, body }) {
  const r = riderPoints(d, body)
  const col = '#4a5b78'
  const L = (a, b, w) => <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={col} strokeWidth={w} strokeLinecap="round" />
  const J = (q) => <circle cx={X(q)} cy={Y(q)} r="11" fill={col} />
  return (
    <g opacity="0.88">
      {L(r.hip, r.knee, 17)}{L(r.knee, r.pedal, 15)}
      {L(r.hip, r.shoulder, 19)}
      {L(r.shoulder, r.elbow, 14)}{L(r.elbow, r.hand, 13)}
      {J(r.hip)}{J(r.knee)}{J(r.shoulder)}{J(r.elbow)}
      <circle cx={X(r.head)} cy={Y(r.head)} r={r.headR} fill="none" stroke={col} strokeWidth="12" />
    </g>
  )
}

// Zeichnet ein einzelnes Rad in gemeinsamen Koordinaten – so realitätsnah wie
// möglich: Speichen, Reifen in echter Breite, Antrieb mit Kette, beide Kurbeln
// mit Pedalen, realistischer Sattel, Gabel mit echtem Vorlauf.
function BikeFrame({ d, X, Y, col }) {
  const { p, mtb, hood, dropEnd, riserTop, gripEnd } = d
  const line = (a, b, w, o) => <line x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={col} strokeWidth={w} strokeLinecap="round" opacity={o} />
  const tw = Math.max(p.R - p.rimR, 18)   // Reifenbreite (real, mm)

  // Laufrad: Reifen als Band in echter Breite, Felge, Speichen, Nabe.
  const Wheel = ({ c }) => {
    const spokes = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      spokes.push(<line key={i}
        x1={X(c) + 15 * Math.cos(a)} y1={Y(c) + 15 * Math.sin(a)}
        x2={X(c) + (p.rimR - 18) * Math.cos(a)} y2={Y(c) + (p.rimR - 18) * Math.sin(a)}
        stroke={col} strokeWidth="1.5" opacity="0.4" />)
    }
    return (
      <g>
        <circle cx={X(c)} cy={Y(c)} r={p.rimR + tw / 2} fill="none" stroke={col} strokeWidth={tw} opacity="0.2" />
        <circle cx={X(c)} cy={Y(c)} r={p.R} fill="none" stroke={col} strokeWidth="2.5" />
        <circle cx={X(c)} cy={Y(c)} r={p.rimR} fill="none" stroke={col} strokeWidth="2.5" />
        <circle cx={X(c)} cy={Y(c)} r={Math.max(p.rimR - 16, 10)} fill="none" stroke={col} strokeWidth="5" opacity="0.7" />
        {spokes}
        <circle cx={X(c)} cy={Y(c)} r="14" fill="none" stroke={col} strokeWidth="5" />
        {mtb && <circle cx={X(c)} cy={Y(c)} r="80" fill="none" stroke={col} strokeWidth="5" opacity="0.45" />}
      </g>
    )
  }

  // Steuerrohr-Partie: Oberrohr setzt knapp unter der Oberkante an, das
  // Unterrohr unten am Steuerrohr – dadurch entsteht die echte Rahmenform
  // (kein einfacher Dreiecks-Spitz). Unter dem Steuerrohr sitzt die
  // Gabelkrone, darüber Steuersatz, Spacer und Ahead-Kappe.
  const su = p.steerUp
  const perp = { x: su.y, y: -su.x }
  const htLen = Math.hypot(p.headTop.x - p.headBot.x, p.headTop.y - p.headBot.y) || 1
  const ttAttach = { x: p.headTop.x - su.x * Math.min(22, htLen * 0.2), y: p.headTop.y - su.y * Math.min(22, htLen * 0.2) }
  const dtAttach = { x: p.headBot.x + su.x * Math.min(32, htLen * 0.28), y: p.headBot.y + su.y * Math.min(32, htLen * 0.28) }
  const crownEnd = { x: p.headBot.x - su.x * 30, y: p.headBot.y - su.y * 30 }

  // Spacer als Querstriche auf dem Gabelschaft zwischen Steuerrohr und Vorbau.
  const spacerH = Math.hypot(p.stemClamp.x - p.headTop.x, p.stemClamp.y - p.headTop.y)
  const spacerTicks = []
  for (let s = 10; s < spacerH - 4; s += 11) {
    const cx = p.headTop.x + su.x * s, cy = p.headTop.y + su.y * s
    spacerTicks.push(
      <line key={s}
        x1={X({ x: cx - perp.x * 9, y: cy - perp.y * 9 })} y1={Y({ x: cx - perp.x * 9, y: cy - perp.y * 9 })}
        x2={X({ x: cx + perp.x * 9, y: cy + perp.y * 9 })} y2={Y({ x: cx + perp.x * 9, y: cy + perp.y * 9 })}
        stroke={col} strokeWidth="3" opacity="0.7" />
    )
  }
  const capA = { x: p.stemClamp.x - perp.x * 11, y: p.stemClamp.y - perp.y * 11 }
  const capB = { x: p.stemClamp.x + perp.x * 11, y: p.stemClamp.y + perp.y * 11 }

  // Gabel: Blatt startet an der Krone, folgt der Steuerachse und schwingt
  // mit echtem Vorlauf zur Achse (Rennrad). MTB: gerade Federgabel.
  const fl = Math.hypot(p.frontAxle.x - crownEnd.x, p.frontAxle.y - crownEnd.y)
  const fCtrl = { x: crownEnd.x - su.x * fl * 0.55, y: crownEnd.y - su.y * fl * 0.55 }
  const fMid = { x: crownEnd.x - su.x * fl * 0.42, y: crownEnd.y - su.y * fl * 0.42 }
  const forkD = mtb
    ? `M ${X(crownEnd)} ${Y(crownEnd)} L ${X(fMid)} ${Y(fMid)} L ${X(p.frontAxle)} ${Y(p.frontAxle)}`
    : `M ${X(crownEnd)} ${Y(crownEnd)} Q ${X(fCtrl)} ${Y(fCtrl)} ${X(p.frontAxle)} ${Y(p.frontAxle)}`

  // Antrieb in realen Größen: Kettenblatt (Rennrad ≈ 52 Z, MTB ≈ 32 Z),
  // Kassette, Kette oben/unten, beide Kurbeln + Pedale.
  const bigR = mtb ? 64 : 100
  const cogR = mtb ? 50 : 36
  const chainTopA = { x: p.BB.x, y: p.BB.y + bigR }
  const chainTopB = { x: p.rearAxle.x, y: p.rearAxle.y + cogR }
  const chainBotA = { x: p.BB.x, y: p.BB.y - bigR }
  const chainBotB = { x: p.rearAxle.x, y: p.rearAxle.y - cogR }
  const oppCrank = { x: -p.crankEnd.x, y: -p.crankEnd.y }
  const Pedal = ({ c, o }) => <line x1={X(c) - 45} y1={Y(c)} x2={X(c) + 45} y2={Y(c)} stroke={col} strokeWidth="7" strokeLinecap="round" opacity={o} />

  // Rennrad-Lenker: Oberseite, runder Bogen, Endstück + Bremsgriff (Hood).
  const rr = p.barDrop / 2
  const curveTop = { x: hood.x - rr, y: hood.y }
  const curveBot = { x: hood.x - rr, y: hood.y - p.barDrop }
  const dropD = `M ${X(p.bar)} ${Y(p.bar)} L ${X(curveTop)} ${Y(curveTop)}`
    + ` A ${rr} ${rr} 0 0 1 ${X(curveBot)} ${Y(curveBot)} L ${X(dropEnd)} ${Y(dropEnd)}`
  // Bremsgriff sitzt vorn-oben AUF der Lenkerkurve (nicht am rechnerischen
  // Hood-Punkt, der über dem Bogen liegt), Hebel zeigt nach vorn-unten.
  const hoodPt = { x: hood.x - rr * 0.43, y: hood.y - rr * 0.18 }
  const lever = { x: hoodPt.x + 26, y: hoodPt.y - 60 }
  const mtbLever = { x: gripEnd.x + 42, y: gripEnd.y - 16 }

  // Sitzstreben setzen etwas unterhalb der Sitzrohr-Oberkante an.
  const stl = Math.hypot(p.seatTubeTop.x, p.seatTubeTop.y) || 1
  const stayTop = { x: p.seatTubeTop.x * (1 - 32 / stl), y: p.seatTubeTop.y * (1 - 32 / stl) }

  // Sattel: realistische Seitensilhouette (Länge ≈ 260 mm, Nase nach vorn).
  const sx = X(p.saddle), sy = Y(p.saddle)
  const saddleD = `M ${sx - 125} ${sy - 2}`
    + ` C ${sx - 130} ${sy - 16}, ${sx - 92} ${sy - 18}, ${sx - 58} ${sy - 14}`
    + ` C ${sx - 8} ${sy - 10}, ${sx + 62} ${sy - 8}, ${sx + 124} ${sy - 4}`
    + ` C ${sx + 137} ${sy - 3}, ${sx + 137} ${sy + 4}, ${sx + 122} ${sy + 5}`
    + ` C ${sx + 58} ${sy + 9}, ${sx - 68} ${sy + 11}, ${sx - 114} ${sy + 7}`
    + ` C ${sx - 127} ${sy + 5}, ${sx - 123} ${sy + 1}, ${sx - 125} ${sy - 2} Z`

  return (
    <g>
      <Wheel c={p.rearAxle} />
      <Wheel c={p.frontAxle} />

      {/* Abgewandte Kurbel + Pedal (hinter dem Rahmen) */}
      {line(p.BB, oppCrank, 9, 0.35)}
      <Pedal c={oppCrank} o={0.35} />

      {/* Rahmen: Kettenstrebe, Sitzstrebe, Sitzrohr, Oberrohr, Unterrohr, Steuerrohr */}
      {line(p.BB, p.rearAxle, 13)}
      {line(p.rearAxle, stayTop, 12)}
      {line(p.BB, p.seatTubeTop, 16)}
      {line(p.seatTubeTop, ttAttach, 16)}
      {line(p.BB, dtAttach, 18)}
      {line(p.headTop, p.headBot, 21)}
      {/* Gabelkrone + Gabel */}
      {line(p.headBot, crownEnd, mtb ? 28 : 24)}
      <path d={forkD} fill="none" stroke={col} strokeWidth={mtb ? 16 : 13} strokeLinecap="round" />

      {/* Kassette, Kette, Kettenblatt */}
      <circle cx={X(p.rearAxle)} cy={Y(p.rearAxle)} r={cogR} fill="none" stroke={col} strokeWidth="2.5" opacity="0.8" />
      <circle cx={X(p.rearAxle)} cy={Y(p.rearAxle)} r={Math.max(cogR - 16, 12)} fill="none" stroke={col} strokeWidth="2" opacity="0.5" />
      {line(chainTopA, chainTopB, 4, 0.8)}
      {line(chainBotA, chainBotB, 4, 0.8)}
      <circle cx={X(p.BB)} cy={Y(p.BB)} r={bigR} fill="none" stroke={col} strokeWidth="3.5" />
      {!mtb && <circle cx={X(p.BB)} cy={Y(p.BB)} r="78" fill="none" stroke={col} strokeWidth="2" opacity="0.45" />}

      {/* Zugewandte Kurbel + Pedal */}
      {line(p.BB, p.crankEnd, 10)}
      <Pedal c={p.crankEnd} />

      {/* Sattelstütze + Sattel */}
      {line(p.seatTubeTop, p.saddle, 9)}
      <path d={saddleD} fill={col} />

      {/* Gabelschaft + Spacer + Ahead-Kappe, dann Vorbau + Lenker + Bremsgriff */}
      {line(p.headTop, p.stemClamp, 10)}
      {spacerTicks}
      {line(capA, capB, 5)}
      {line(p.stemClamp, p.bar, 13)}
      <circle cx={X(p.bar)} cy={Y(p.bar)} r="9" fill={col} />
      {mtb ? (
        <>
          {line(riserTop, gripEnd, 13)}
          {line(gripEnd, mtbLever, 5)}
          <circle cx={X(gripEnd)} cy={Y(gripEnd)} r="10" fill="none" stroke={col} strokeWidth="4" />
        </>
      ) : (
        <>
          <path d={dropD} fill="none" stroke={col} strokeWidth="13" strokeLinecap="round" />
          {line(hoodPt, lever, 8)}
        </>
      )}
      <circle cx={X(p.BB)} cy={Y(p.BB)} r="7" fill={col} />
    </g>
  )
}

function BikeDrawing({ bikes, showDims, showRider, body, svgRef, alignH = 'bb', alignV = 'bb', big = false, onExpand }) {
  const ds = bikes.map(b => ({ ...deriveDraw(b.geo, b.cockpit), col: b.col, geo: b.geo }))
  // Ausrichtung: Räder so verschieben, dass ihr Referenzpunkt auf dem des
  // aktiven Rades liegt (horizontal: Tretlager/Hinter-/Vorderrad, vertikal:
  // Tretlager/Boden).
  const cornersOf = (d) => {
    const p = d.p
    return [p.BB, p.rearAxle, p.frontAxle, p.headTop, p.headBot, p.seatTubeTop, p.saddle, p.stemClamp, p.bar, d.hood, d.barTip, d.axisTop, p.crankEnd]
  }
  const refX = (d) => alignH === 'rear' ? d.p.rearAxle.x : alignH === 'front' ? d.p.frontAxle.x : 0
  const refY = (d) => alignV === 'ground' ? d.p.rearAxle.y - d.p.R : 0
  const base = ds[0]
  ds.forEach(d => { d.ox = refX(base) - refX(d); d.oy = refY(base) - refY(d) })
  const sh = (d) => (q) => ({ x: q.x + d.ox, y: q.y + d.oy })

  const maxR = Math.max(...ds.map(d => d.p.R))
  const all = ds.flatMap(d => cornersOf(d).map(sh(d)))
  if (showRider) {
    const r = riderPoints(ds[0], body)
    all.push(r.hip, r.knee, r.shoulder, r.elbow, { x: r.head.x, y: r.head.y + r.headR }, { x: r.head.x + r.headR, y: r.head.y })
  }
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
    <div className={`bd-draw ${big ? 'big' : ''} ${onExpand ? 'clickable' : ''}`} onClick={onExpand}>
      {onExpand && <span className="bd-zoom-hint">🔍 Tippen zum Vergrößern</span>}
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

        {/* Vergleichsrad zuerst (liegt hinten), dann Fahrer, dann das aktive Rad */}
        {ds.slice(1).map((d, i) => {
          const Xo = (q) => X(sh(d)(q)), Yo = (q) => Y(sh(d)(q))
          return <BikeFrame key={i} d={d} X={Xo} Y={Yo} col={d.col} />
        })}
        {showRider && <Rider d={primary} X={X} Y={Y} body={body} />}
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
        .bd-draw { position: relative; background: ${COL.bg}; border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
        .bd-draw svg { width: 100%; height: 230px; display: block; }
        .bd-draw.clickable { cursor: zoom-in; }
        .bd-zoom-hint { position: absolute; top: 8px; left: 10px; z-index: 1; font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .3px; color: ${COL.ink2}; background: rgba(244,246,251,.85); padding: 3px 7px; border-radius: 6px; pointer-events: none; }
        .bd-draw.big { border: none; border-radius: 0; padding: 0; margin: 0; background: ${COL.bg}; }
        .bd-draw.big svg { height: 82vh; }
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
  const [body, setBody] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showDims, setShowDims] = useState(false)
  const [openGeo, setOpenGeo] = useState(true)
  const [openCockpit, setOpenCockpit] = useState(true)
  const [openBody, setOpenBody] = useState(false)
  const [compareId, setCompareId] = useState(null)
  const [alignH, setAlignH] = useState('bb')
  const [alignV, setAlignV] = useState('bb')
  const [zoomed, setZoomed] = useState(false)
  const [showRider, setShowRider] = useState(false)
  const svgRef = useRef(null)

  useEffect(() => { load() }, [])
  useEffect(() => {
    const b = bikes.find(x => x.id === activeBikeId)
    if (!b) return
    const { geo, cockpit, body } = loadGeo(b)
    setGeo(geo)
    setCockpit(cockpit)
    setBody(body)
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
  const setB = (k) => (v) => setBody(p => ({ ...p, [k]: v }))

  async function save() {
    try {
      // Bike-Fit-Geometrie zusätzlich in die geo_*-Spalten des Rades schreiben,
      // damit sie überall (Geometrie-Tab, Tracker) gleich mitgespeichert ist.
      const num = (v) => { const x = Number(typeof v === 'string' ? v.replace(',', '.') : v); return (v !== '' && v != null && isFinite(x) ? x : null) }
      const updates = {
        fit: { geo, cockpit, body },
        geo_reach: num(geo.reach), geo_stack: num(geo.stack),
        geo_head_angle: num(geo.head_angle), geo_seat_angle: num(geo.seat_angle),
        geo_top_tube: num(geo.top_tube), geo_seat_tube: num(geo.seat_tube),
        geo_head_tube: num(geo.head_tube), geo_chainstay: num(geo.chainstay),
        geo_bb_drop: num(geo.bb_drop), geo_wheelbase: num(geo.wheelbase),
        geo_standover: num(geo.standover),
      }
      await updateBike(activeBikeId, updates)
      setBikes(prev => prev.map(b => b.id === activeBikeId ? { ...b, ...updates } : b))
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
  const riderAngles = showRider ? riderPoints(deriveDraw(geo, cockpit), body).angles : null

  const activeName = bikes.find(b => b.id === activeBikeId)?.name || 'Aktiv'
  const compareBike = bikes.find(b => b.id === compareId && b.id !== activeBikeId) || null
  const cmp = compareBike ? loadGeo(compareBike) : null
  // Nur überlagern, wenn das Vergleichsrad überhaupt Geometrie hat – sonst
  // würde ein irreführendes Standard-Rad gezeichnet.
  const cmpHasGeo = cmp && ['reach', 'stack', 'wheelbase', 'head_angle'].some(k => cmp.geo[k] !== '' && cmp.geo[k] != null)
  const drawBikes = [{ geo, cockpit, col: COL.acc }]
  if (cmp && cmpHasGeo) drawBikes.push({ geo: cmp.geo, cockpit: cmp.cockpit, col: COL.b })

  return (
    <Page title="Bike-Fit" subtitle="Geometrie & Sitzposition – live gezeichnet" back="/">
      {loading ? null : bikes.length === 0 ? (
        <Empty emoji="📐" title="Keine Fahrräder" sub="Lege zuerst ein Fahrrad an." />
      ) : (
        <>
          <div className="bf-chips">
            {bikes.map(b => (
              <button key={b.id} className={`bf-chip ${b.id === activeBikeId ? 'on' : ''}`} onClick={() => { setActiveBikeId(b.id); if (b.id === compareId) setCompareId(null) }}>
                {b.name}
              </button>
            ))}
          </div>

          <div className="bf-type">
            <button className={`bf-tbtn ${geo.frame_type !== 'mtb' ? 'on' : ''}`} onClick={() => setG('frame_type')('road')}>🚴 Rennrad</button>
            <button className={`bf-tbtn ${geo.frame_type === 'mtb' ? 'on' : ''}`} onClick={() => setG('frame_type')('mtb')}>⛰️ MTB</button>
          </div>

          <BikeDrawing bikes={drawBikes} showDims={showDims} showRider={showRider} body={body} svgRef={svgRef} alignH={alignH} alignV={alignV} onExpand={() => setZoomed(true)} />

          {zoomed && (
            <ZoomView onClose={() => setZoomed(false)}>
              <BikeDrawing bikes={drawBikes} showDims={showDims} showRider={showRider} body={body} alignH={alignH} alignV={alignV} big />
            </ZoomView>
          )}

          {cmp && cmpHasGeo && (
            <>
              <div className="bf-legend">
                <span className="bf-leg"><i style={{ background: COL.acc }} />{activeName}</span>
                <span className="bf-leg"><i style={{ background: COL.b }} />{compareBike.name}</span>
              </div>
              <div className="bf-align">
                <label className="bf-al">
                  <span className="bf-al-lbl">Ausrichtung ⟷</span>
                  <select className="nf-in" value={alignH} onChange={(e) => setAlignH(e.target.value)}>
                    <option value="bb">Tretlager</option>
                    <option value="rear">Hinterrad</option>
                    <option value="front">Vorderrad</option>
                  </select>
                </label>
                <label className="bf-al">
                  <span className="bf-al-lbl">Ausrichtung ↕</span>
                  <select className="nf-in" value={alignV} onChange={(e) => setAlignV(e.target.value)}>
                    <option value="bb">Tretlager</option>
                    <option value="ground">Boden</option>
                  </select>
                </label>
              </div>
            </>
          )}

          <div className="bf-tools">
            <button className={`bf-tbtn ${showDims ? 'on' : ''}`} onClick={() => setShowDims(s => !s)}>📏 Maße</button>
            <button className={`bf-tbtn ${showRider ? 'on' : ''}`} onClick={() => setShowRider(s => !s)}>🚴 Fahrer</button>
            <button className="bf-tbtn" onClick={exportPng}>⤓ Als Bild</button>
          </div>

          {showRider && (riderAngles ? (
            <>
              <div className="bf-metrics">
                <Metric label="Rumpfwinkel" val={`${riderAngles.torso}°`} />
                <Metric label="Hüftwinkel" val={`${riderAngles.hip}°`} />
                <Metric label="Kniewinkel ↓" val={`${riderAngles.knee}°`} />
                <Metric label="Schulterw." val={`${riderAngles.shoulder}°`} />
              </div>
              <div className="bf-angle-hint">Kniewinkel (Kurbel unten) ideal ≈ 140–148° · Rumpfwinkel Rennrad ≈ 30–45°</div>
            </>
          ) : (
            <div className="bf-angle-hint">Trage unter „Körpermaße" mindestens die Innenbeinlänge ein, um Sitzwinkel (Hüfte, Knie, Rumpf) zu sehen.</div>
          ))}

          {bikes.length > 1 && (
            <label className="bf-compare">
              <span className="bf-cmp-lbl">⚖ Vergleichen</span>
              <select className="nf-in" value={compareId || ''} onChange={(e) => setCompareId(e.target.value || null)}>
                <option value="">— kein Vergleich —</option>
                {bikes.filter(b => b.id !== activeBikeId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}

          {cmp && !cmpHasGeo ? (
            <div className="bf-cmp-hint">„{compareBike.name}" hat noch keine Geometrie gespeichert. Wähle das Rad oben aus und speichere zuerst seine Geometrie.</div>
          ) : cmp ? (
            <DiffTable
              title="Geometrie" rows={CMP_ROWS} aName={activeName} bName={compareBike.name}
              aVals={Object.fromEntries(CMP_ROWS.map(([k]) => [k, cmpValue(geo, k)]))}
              bVals={Object.fromEntries(CMP_ROWS.map(([k]) => [k, cmpValue(cmp.geo, k)]))}
            />
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

          <button className="bf-sec" onClick={() => setOpenBody(o => !o)}>
            <span>Körpermaße (Fahrer & Winkel)</span><span className="bf-caret">{openBody ? '▾' : '▸'}</span>
          </button>
          {openBody && (
            <>
              <div className="bf-grid">
                {BODY_FIELDS.map(([k, l, u, ph]) => (
                  <NumField key={k} label={l} unit={u} value={body[k]} placeholder={ph} invalid={outOfRange(k, body[k])} onChange={setB(k)} />
                ))}
              </div>
              {n(body.inseam) > 0 && (() => {
                const rec = Math.round(n(body.inseam) * 0.883)
                const sh = n(cockpit.saddle_height)
                const diff = sh > 0 ? Math.round(sh - rec) : null
                const fits = diff != null && Math.abs(diff) <= 5
                return (
                  <div className="bf-lemond">
                    💡 Empfohlene Sitzhöhe (LeMond, 0,883 × Schrittlänge): <b>{rec} mm</b>
                    {diff != null && (
                      <span className={fits ? 'ok' : 'warn'}>
                        {' '}— deine {Math.round(sh)} mm ({diff > 0 ? '+' : ''}{diff} mm{fits ? ' ✓' : ''})
                      </span>
                    )}
                  </div>
                )
              })()}
            </>
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
        .bf-align { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .bf-al { display: flex; flex-direction: column; gap: 6px; }
        .bf-al-lbl { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); }
        .bf-leg { display: flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink1); }
        .bf-leg i { width: 14px; height: 4px; border-radius: 2px; display: inline-block; }
        .bf-compare { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .bf-cmp-lbl { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ink3); }
        .bf-angle-hint { margin: -6px 0 16px; font-family: var(--mono); font-size: 10.5px; line-height: 1.5; color: var(--ink3); text-align: center; }
        .bf-lemond { margin: -6px 0 16px; padding: 11px 13px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel2); font-family: var(--mono); font-size: 12px; line-height: 1.5; color: var(--ink2); }
        .bf-lemond b { color: var(--ink1); }
        .bf-lemond .ok { color: var(--ok); }
        .bf-lemond .warn { color: var(--warn); }
        .bf-cmp-hint { margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel2); font-family: var(--mono); font-size: 12px; line-height: 1.5; color: var(--ink2); }
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
