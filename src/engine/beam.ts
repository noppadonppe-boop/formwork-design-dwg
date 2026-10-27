// Beam formwork design — book Chapter 7 (§7.4, Examples 7.1–7.4).
// Sides act like a low wall (hydrostatic pressure γh → side sheathing → studs [→ wales + ties for deep beams]);
// the bottom acts like a slab (bottom board/stiffeners → cross-beams (heads) → shores).
import { component, type ComponentResult, type DesignResult, governingLabel, summarize } from './design'
import { getMaterial, getTie } from './materials'
import { type CheckRow, checkBeam, columnCapacity, type DeflectionCriteria, maxSpan, type MemberInput, shearCapacity } from './member'
import type { PressureResult } from './pressure'
import { flat, getSection, multiple, rect, type Section } from './sections'
import { type DeckSheathing, deckSection, deckThicknessM, spread, type VerticalLoads } from './slab'
import { DEFAULT_SHORE, designShore, type ShoreParams } from './shoring'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'

/** isolated (คานเดี่ยว), cast with the slab on both sides (คานร่วมพื้น), spandrel / edge beam (คานขอบ) */
export type BeamType = 'isolated' | 'slab' | 'spandrel'

export interface BeamInput {
  type: BeamType
  /** web width, m */
  b: number
  /** total depth including the slab, m */
  h: number
  /** slab thickness, m (0 for isolated beams) */
  slabT: number
  /** beam length (clear span), m */
  length: number
  /** floor to beam soffit, m */
  clearHeight: number
  /** slab width outside the web carried by the beam shores, m (both sides together) — Fig 7.7 */
  slabTribM: number
  /** formWeight = slab form kg/m²; beamFormWeight = beam form kg/m (book: 100) */
  loads: VerticalLoads & { beamFormWeight: number }
  sheathing: DeckSheathing
  /** side-form studs; spacingCm = stud spacing */
  stud: { sectionId: string; materialId: string; spacingCm?: number }
  /** bottom edge stiffeners (ไม้เสริมขอบท้องแบบ); count 0 = the bottom board/plywood spans alone */
  bottom: { count: number; sectionId: string; materialId: string; flat: boolean }
  /** cross-beam / T-head (คานขวางรับท้องแบบ); spacingCm = head spacing = shore spacing */
  head: { sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number }
  shore: ShoreParams & { layout: 'single' | 'double'; postSpacingM: number }
  /** through-ties with horizontal wales for deep beams (Fig 7.8) */
  tie: { enabled: boolean; tieId: string; rows: number; waleSectionId: string; waleMaterialId: string }
  /** top-of-form diagonal braces (ค้ำยันปากแบบ) for isolated / spandrel beams */
  brace: { sectionId: string; materialId: string; angleDeg: number }
  deflection?: DeflectionCriteria
  checkTimberShear?: boolean
}

export interface BeamLayout {
  studSpacing: number // cm
  headSpacing: number // cm
  studX: number[] // m along the beam
  headX: number[] // m
  /** side form heights (outer = +z, inner = −z), m */
  sideOuter: number
  sideInner: number
  tieLevels: number[] // m above soffit
  shoreLength: number
}

export interface BeamQuantities {
  plywoodArea: number
  studs: number
  studLength: number
  bottomLength: number
  heads: number
  shores: number
  braces: number
  ties: number
}

export interface BeamDesign extends DesignResult {
  layout: BeamLayout
  quantities: BeamQuantities
}

export const DEFAULT_BEAM: BeamInput = {
  type: 'slab',
  b: 0.3,
  h: 0.6,
  slabT: 0.12,
  length: 6,
  clearHeight: 2.6,
  slabTribM: 1.2,
  loads: { liveLoad: 150, formWeight: 50, gamma: 2400, beamFormWeight: 100 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
  bottom: { count: 2, sectionId: 'timber-1.5x3', materialId: 'timber-yang', flat: true },
  head: { sectionId: 'timber-2x4', materialId: 'timber-yang', count: 1 },
  shore: { ...DEFAULT_SHORE, layout: 'single', postSpacingM: 0.6 },
  tie: { enabled: false, tieId: 'tie-3/8', rows: 1, waleSectionId: 'timber-2x4', waleMaterialId: 'timber-yang' },
  brace: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', angleDeg: 45 },
}

export const BEAM_TYPE_LABEL: Record<BeamType, string> = { isolated: 'คานเดี่ยว', slab: 'คานหล่อร่วมพื้น', spandrel: 'คานขอบอาคาร' }

/** Bottom member spanning between heads: n stiffeners (flat or on edge) or the bottom sheathing alone. */
export function beamBottomSection(inp: BeamInput): { section: Section; materialId: string } {
  if (inp.bottom.count > 0) {
    const s = getSection(inp.bottom.sectionId)
    return { section: multiple(inp.bottom.flat ? flat(s) : s, inp.bottom.count), materialId: inp.bottom.materialId }
  }
  const t = deckThicknessM(inp.sheathing) * 100
  return { section: rect(inp.b * 100, t, 'bottom', `ท้องแบบกว้าง ${Math.round(inp.b * 100)} ซม. หนา ${t.toFixed(1)} ซม.`), materialId: inp.sheathing.materialId }
}

export function beamSides(inp: BeamInput) {
  const below = inp.h - inp.slabT
  return { outer: inp.type === 'slab' ? below : inp.h, inner: inp.type === 'isolated' ? inp.h : below }
}

export function designBeam(inp: BeamInput): BeamDesign {
  const gamma = inp.loads.gamma
  const timberShear = inp.checkTimberShear ?? true
  const defl = inp.deflection
  const sides = beamSides(inp)
  const hs = Math.max(sides.outer, sides.inner)

  // lateral pressure on the sides: fluid pressure over the full depth (§7.4)
  const pTrace = new Trace()
  const p = pTrace.add({ label: 'แรงดันด้านข้าง (ของเหลว) p = γh', expr: `${fmt(gamma)} × ${inp.h}`, value: gamma * inp.h, unit: 'กก./ม.²', ref: '§7.4' })
  pTrace.add({ label: 'ความสูงแบบข้างที่ออกแบบ', value: hs, unit: 'ม.' })
  const pressure: PressureResult = { Pmax: p, hCrit: inp.h, gamma, trace: pTrace }

  // 1) side sheathing → stud spacing
  const tSh = new Trace()
  const sh: MemberInput = { section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: 'continuous', deflection: defl }
  const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', expr: `${fmt(p)} × 1.00 / 100`, value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
  const shLim = maxSpan(sh, wSh, tSh)
  const a = inp.stud.spacingCm ?? floorTo(shLim.max, 5)
  tSh.add({ label: 'ระยะเคร่าข้างที่ใช้', value: a, unit: 'ซม.' })
  const shChk = checkBeam(sh, wSh, a, tSh)
  const cSheathing = component('sheathing', 'แผ่นผิวแบบข้างคาน', `${sh.section.label} (${sh.material.name})`, shChk.rows, tSh, {
    label: 'ระยะเคร่าข้าง',
    value: a,
    max: shLim.max,
    governing: governingLabel(shLim.governing),
    fixed: inp.stud.spacingCm !== undefined,
  })

  // 2) bottom → head (cross-beam) spacing; heads land on multiples of the stud spacing (Ex 7.1, 7.4)
  const tBo = new Trace()
  const bot = beamBottomSection(inp)
  const boMat = getMaterial(bot.materialId)
  const bo: MemberInput = { section: bot.section, material: boMat, support: 'continuous', deflection: defl, checkShear: true }
  const wBo = tBo.add({ label: 'น้ำหนักคอนกรีตบนท้องแบบ', expr: `${fmt(gamma)} × ${inp.b} × ${inp.h} / 100`, value: (gamma * inp.b * inp.h) / 100, unit: 'กก./ซม.', ref: 'ตัวอย่าง 7.4' })
  const boLim = maxSpan(bo, wBo, tBo)
  const s = inp.head.spacingCm ?? (boLim.max >= a ? Math.floor(boLim.max / a + 1e-9) * a : floorTo(boLim.max, 5))
  tBo.add({ label: 'ระยะคานขวางที่ใช้', expr: inp.head.spacingCm === undefined && boLim.max >= a ? `ทวีคูณของระยะเคร่า ${a} ซม.` : undefined, value: s, unit: 'ซม.' })
  const boChk = checkBeam(bo, wBo, s, tBo)
  const cBottom = component('bottom', inp.bottom.count > 0 ? 'ท้องแบบ + ไม้เสริมขอบ' : 'ท้องแบบคาน', `${bot.section.label} (${boMat.name})`, boChk.rows, tBo, {
    label: 'ระยะคานขวาง',
    value: s,
    max: boLim.max,
    governing: governingLabel(boLim.governing),
    fixed: inp.head.spacingCm !== undefined,
  })

  // 3) side studs: simple span between kicker and top restraint, or over the tie rows
  const tSt = new Trace()
  const stMat = getMaterial(inp.stud.materialId)
  const rows = inp.tie.enabled ? Math.max(1, Math.round(inp.tie.rows)) : 0
  const spans = rows + 1
  const span = (hs * 100) / spans
  const st: MemberInput = {
    section: getSection(inp.stud.sectionId),
    material: stMat,
    support: spans >= 3 ? 'continuous' : 'simple',
    deflection: defl,
    checkShear: stMat.kind === 'steel' || timberShear,
    shearReduction: true,
  }
  let stRows: CheckRow[]
  if (rows) {
    // between tie rows: maximum pressure taken uniform (as for walls)
    const wSt = tSt.add({ label: 'น้ำหนักแผ่บนเคร่าข้าง (แรงดันสูงสุดคงที่)', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, a / 100), unit: 'กก./ซม.' })
    tSt.add({ label: `ช่วงเคร่าระหว่างแนวไทร์ (${spans} ช่วง)`, expr: `${(hs * 100).toFixed(0)} / ${spans}`, value: span, unit: 'ซม.' })
    stRows = checkBeam(st, wSt, span, tSt).rows
  } else {
    // simple span kicker → top restraint under the fluid (triangular) pressure: 0 at the top, γ·hs·a at the foot
    const L = span
    const W = tSt.add({ label: 'แรงรวมบนเคร่า (แรงดันสามเหลี่ยม) W = γ·hs²/2 · a', expr: `${fmt(gamma)} × ${hs}² / 2 × ${(a / 100).toFixed(2)}`, value: ((gamma * hs * hs) / 2) * (a / 100), unit: 'กก.' })
    tSt.add({ label: 'ช่วงเคร่า (ขอบเตะแบบ → ปากแบบ)', value: L, unit: 'ซม.' })
    const M = tSt.add({ label: 'M = 2W·L/(9√3)', expr: `2 × ${fmt(W)} × ${L.toFixed(0)} / 15.59`, value: (2 * W * L) / (9 * Math.sqrt(3)), unit: 'กก.-ซม.', ref: 'คานช่วงเดียว น้ำหนักสามเหลี่ยม' })
    const sec = st.section
    const fb = tSt.add({ label: 'fb = M/S', expr: `${fmt(M)} / ${sec.Sx.toFixed(2)} ≤ ${stMat.Fb}`, value: M / sec.Sx, unit: 'กก./ซม.²' })
    stRows = [{ item: 'หน่วยแรงดัด fb', demand: fb, capacity: stMat.Fb, ratio: fb / stMat.Fb, unit: 'กก./ซม.²', ref: 'สมการ 5.2' }]
    const Vcap = shearCapacity(sec, stMat)
    if (st.checkShear && Vcap !== undefined) {
      const V = tSt.add({ label: 'V = 2W/3 (ที่ขอบเตะแบบ)', value: (2 * W) / 3, unit: 'กก.' })
      const fv = tSt.add({ label: 'fv', value: sec.Aweb ? V / sec.Aweb : (3 * V) / (2 * sec.B * sec.H), unit: 'กก./ซม.²' })
      stRows.push({ item: 'หน่วยแรงเฉือน fv', demand: fv, capacity: stMat.Fv!, ratio: fv / stMat.Fv!, unit: 'กก./ซม.²', ref: 'สมการ 5.11' })
    }
    const delta = tSt.add({ label: 'Δ = 0.01304·W·L³/EI', value: (0.01304 * W * L ** 3) / (stMat.E * sec.Ix), unit: 'ซม.' })
    const dAllow = L / (defl?.ratio ?? 360)
    stRows.push({ item: 'การแอ่นตัว Δ', demand: delta, capacity: dAllow, ratio: delta / dAllow, unit: 'ซม.' })
  }
  const cStud = component('stud', 'เคร่าข้างคาน (Studs)', `${st.section.label} @${a} ซม. (${stMat.name})`, stRows, tSt)

  // 4) deep beams: wales over the ties at each head, and the ties
  const tieComps: ComponentResult[] = []
  if (rows) {
    const tWa = new Trace()
    const waMat = getMaterial(inp.tie.waleMaterialId)
    const wa: MemberInput = { section: multiple(getSection(inp.tie.waleSectionId), 2), material: waMat, support: 'continuous', deflection: defl, checkShear: waMat.kind === 'steel' || timberShear, shearReduction: true }
    const wWa = tWa.add({ label: 'น้ำหนักแผ่บนคานรับเคร่า', expr: `${fmt(p)} × ${(span / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, span / 100), unit: 'กก./ซม.' })
    tWa.add({ label: 'ช่วงคานรับเคร่า = ระยะไทร์ = ระยะคานขวาง', value: s, unit: 'ซม.' })
    const waChk = checkBeam(wa, wWa, s, tWa)
    tieComps.push(component('wale', 'คานรับเคร่า (Wales)', `${wa.section.label} ${rows} แนว (${waMat.name})`, waChk.rows, tWa))
    const tTi = new Trace()
    const tie = getTie(inp.tie.tieId)
    const T = tTi.add({ label: 'แรงดึงในไทร์ = p × พื้นที่รับแรง', expr: `${fmt(p)} × ${(span / 100).toFixed(2)} × ${(s / 100).toFixed(2)}`, value: (p * span * s) / 1e4, unit: 'กก.', ref: 'รูป 7.8' })
    tieComps.push(component('tie', 'เหล็กยึดรั้ง (Form tie)', `${tie.name} ${rows} แนว @${s} ซม.`, [{ item: 'แรงดึง', demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref }], tTi))
  }

  // 5) head (cross-beam)
  const tHe = new Trace()
  const heMat = getMaterial(inp.head.materialId)
  const he = multiple(getSection(inp.head.sectionId), inp.head.count)
  const double = inp.shore.layout === 'double'
  let M: number
  let V: number
  if (double) {
    const q = tHe.add({ label: 'น้ำหนักแผ่บนคานขวาง (สองเสา)', expr: `${fmt(gamma)} × ${inp.h} × ${(s / 100).toFixed(2)}`, value: gamma * inp.h * (s / 100), unit: 'กก./ม.', ref: 'ตัวอย่าง 7.3' })
    const e = inp.shore.postSpacingM
    M = tHe.add({ label: 'M = ql²/8 (ช่วงระหว่างเสาคู่)', expr: `${fmt(q)} × ${e}² / 8 × 100`, value: ((q * e * e) / 8) * 100, unit: 'กก.-ซม.' })
    V = tHe.add({ label: 'V = ql/2', expr: `${fmt(q)} × ${e} / 2`, value: (q * e) / 2, unit: 'กก.' })
  } else {
    const Q = tHe.add({ label: 'น้ำหนักท้องคานต่อคานขวาง', expr: `(${fmt(gamma)} × ${inp.b} × ${inp.h} + ${inp.loads.beamFormWeight}) × ${(s / 100).toFixed(2)}`, value: (gamma * inp.b * inp.h + inp.loads.beamFormWeight) * (s / 100), unit: 'กก.' })
    M = tHe.add({ label: 'M = Q·b/8 (ยื่นสองข้างจากเสาตัวที)', expr: `${fmt(Q)} × ${inp.b} / 8 × 100`, value: ((Q * inp.b) / 8) * 100, unit: 'กก.-ซม.', ref: '§7.4' })
    V = tHe.add({ label: 'V = Q/2', value: Q / 2, unit: 'กก.' })
  }
  const fb = tHe.add({ label: 'fb = M/S', expr: `${fmt(M)} / ${he.Sx.toFixed(1)} ≤ ${heMat.Fb}`, value: M / he.Sx, unit: 'กก./ซม.²' })
  const heRows: CheckRow[] = [{ item: 'หน่วยแรงดัด fb', demand: fb, capacity: heMat.Fb, ratio: fb / heMat.Fb, unit: 'กก./ซม.²', ref: 'สมการ 5.2' }]
  const Vcap = shearCapacity(he, heMat)
  if (Vcap !== undefined) {
    const fv = tHe.add({ label: 'fv', expr: he.Aweb ? `${fmt(V)} / ${he.Aweb.toFixed(2)}` : `3×${fmt(V)} / (2×${he.B.toFixed(1)}×${he.H.toFixed(1)})`, value: he.Aweb ? V / he.Aweb : (3 * V) / (2 * he.B * he.H), unit: 'กก./ซม.²' })
    heRows.push({ item: 'หน่วยแรงเฉือน fv', demand: fv, capacity: heMat.Fv!, ratio: fv / heMat.Fv!, unit: 'กก./ซม.²', ref: 'สมการ 5.11' })
  }
  const cHead = component('head', 'คานขวางรับท้องแบบ (Head)', `${he.label} @${s} ซม. ${double ? `บนเสาคู่ห่าง ${inp.shore.postSpacingM.toFixed(2)} ม.` : 'บนเสาตัวที'} (${heMat.name})`, heRows, tHe)

  // 6) shores
  const tSo = new Trace()
  const sM = s / 100
  const slabOut = inp.type === 'isolated' ? 0 : inp.slabTribM
  const cBeam = tSo.add({ label: 'คอนกรีตคาน', expr: `${fmt(gamma)} × ${inp.b} × ${inp.h} × ${sM.toFixed(2)}`, value: gamma * inp.b * inp.h * sM, unit: 'กก.' })
  const cSlab = slabOut ? tSo.add({ label: 'คอนกรีตพื้นที่ถ่ายลงคาน', expr: `${fmt(gamma)} × ${inp.slabT} × ${slabOut} × ${sM.toFixed(2)}`, value: gamma * inp.slabT * slabOut * sM, unit: 'กก.', ref: 'รูป 7.7' }) : 0
  const forms = tSo.add({ label: 'น้ำหนักแบบหล่อ', expr: `${inp.loads.beamFormWeight} × ${sM.toFixed(2)}${slabOut ? ` + ${inp.loads.formWeight} × ${slabOut} × ${sM.toFixed(2)}` : ''}`, value: inp.loads.beamFormWeight * sM + inp.loads.formWeight * slabOut * sM, unit: 'กก.' })
  const ll = tSo.add({ label: 'น้ำหนักจร', expr: `${inp.loads.liveLoad} × ${(inp.b + slabOut).toFixed(2)} × ${sM.toFixed(2)}`, value: inp.loads.liveLoad * (inp.b + slabOut) * sM, unit: 'กก.' })
  const P = tSo.add({ label: 'น้ำหนักลงเสาค้ำต่อคานขวาง', value: cBeam + cSlab + forms + ll, unit: 'กก.' })
  const bottomDepth = inp.bottom.count > 0 ? bot.section.H / 100 : 0
  const formDepth = deckThicknessM(inp.sheathing) + bottomDepth + he.H / 100
  const shoreLength = inp.shore.lengthM ?? inp.clearHeight - formDepth
  if (inp.shore.lengthM === undefined)
    tSo.add({ label: 'ความยาวเสา = ความสูงใต้ท้องคาน − ความลึกแบบ', expr: `${inp.clearHeight.toFixed(2)} − ${formDepth.toFixed(3)}`, value: shoreLength, unit: 'ม.' })
  const cShore = designShore({ shore: inp.shore, P, lengthM: shoreLength, legs: double ? 2 : 1, trace: tSo, layoutText: `@${s} ซม.` })

  // 7) top-of-form braces for isolated / spandrel beams (Fig 7.9); beams with slab are held by the slab joists
  const braceSides = inp.type === 'isolated' ? 2 : inp.type === 'spandrel' ? 1 : 0
  const braceComps: ComponentResult[] = []
  if (braceSides && !rows) {
    const tBr = new Trace()
    const hTop = sides.outer
    const Rt = tBr.add({ label: 'แรงที่ปากแบบต่อเมตร (แรงดันสามเหลี่ยม, คานช่วงเดียว) γh²/6', expr: `${fmt(gamma)} × ${hTop}² / 6`, value: (gamma * hTop * hTop) / 6, unit: 'กก./ม.' })
    const th = (inp.brace.angleDeg * Math.PI) / 180
    const F = tBr.add({ label: 'แรงในค้ำยันปากแบบ', expr: `${fmt(Rt)} × ${sM.toFixed(2)} / cos${inp.brace.angleDeg}°`, value: (Rt * sM) / Math.cos(th), unit: 'กก.', ref: 'รูป 7.9' })
    const L = tBr.add({ label: 'ความยาวค้ำยัน', expr: `${hTop} / sin${inp.brace.angleDeg}°`, value: (hTop / Math.sin(th)) * 100, unit: 'ซม.' })
    const bs = getSection(inp.brace.sectionId)
    const bm = getMaterial(inp.brace.materialId)
    const cap = columnCapacity(bs, bm, L, tBr)
    braceComps.push(component('brace', 'ค้ำยันปากแบบ (ค้ำยันทแยง)', `${bs.label} (${bm.name}) ${braceSides === 2 ? 'ทั้งสองข้าง' : 'ด้านนอก'} @${s} ซม. มุม ${inp.brace.angleDeg}°`, [{ item: 'แรงอัดในค้ำยัน', demand: F, capacity: cap.P, ratio: F / cap.P, unit: 'กก.', ref: 'สมการ 5.15' }], tBr))
  }

  const warnings: string[] = []
  if (double && inp.shore.postSpacingM < inp.b) warnings.push('ระยะเสาคู่แคบกว่าความกว้างคาน — ควรวางเสาให้คร่อมท้องคาน')
  if (inp.h > 0.9 && !rows) warnings.push('คานลึกเกิน 0.90 ม. — พิจารณาใช้ Form tie ยึดแบบข้าง (รูป 7.8)')
  if (inp.type !== 'slab' && rows === 0 && braceSides === 0) warnings.push('ปากแบบไม่มีการยึด')
  if (inp.type === 'slab') warnings.push('ปากแบบยึดด้วยตงพื้นที่ตอกยึดกับเคร่าข้าง (ตัวอย่าง 7.2) — ไม่คำนวณค้ำยันปากแบบ')

  const studX = spread(inp.length, a / 100)
  const headX = spread(inp.length, s / 100, Math.min(0.1, s / 200))
  const tieLevels = Array.from({ length: rows }, (_, k) => Math.round(((k + 1) * hs * 1000) / spans) / 1000)
  const legs = double ? 2 : 1
  return {
    ...summarize(pressure, [cSheathing, cStud, ...tieComps, cBottom, cHead, cShore, ...braceComps], warnings),
    layout: { studSpacing: a, headSpacing: s, studX, headX, sideOuter: sides.outer, sideInner: sides.inner, tieLevels, shoreLength },
    quantities: {
      plywoodArea: (sides.outer + sides.inner + inp.b) * inp.length,
      studs: 2 * studX.length,
      studLength: studX.length * (sides.outer + sides.inner),
      bottomLength: inp.bottom.count * inp.length,
      heads: headX.length * inp.head.count,
      shores: headX.length * legs,
      braces: rows ? 0 : headX.length * braceSides,
      ties: rows * headX.length,
    },
  }
}
