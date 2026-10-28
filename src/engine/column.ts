// Column formwork design — book Chapter 9 (§9.4, Examples 9.1 and 9.3).
// Load path (plywood): sheathing → vertical studs → yokes (bending + axial tension) [→ ties through the long faces, and optionally the short faces]
// Load path (boards):  boards spanning between yokes → yokes.
// Round and polygonal sections (planShape.ts): a polygon in a box of yokes is the rectangle design on the box;
// a ring of yokes spans each face in bending + tension; a round column's staves span between ribs in hoop tension.
import {
  type BraceParams,
  component,
  type ComponentResult,
  DEFAULT_BRACE,
  designBrace,
  type DesignResult,
  governingLabel,
  pickModule,
  type PressureParams,
  STUD_MODULES,
  summarize,
} from './design'
import { CONCRETE_NAIL_SWL, getMaterial, getTie } from './materials'
import { BEAM_COEF, type CheckRow, checkBeam, combinedTensionBending, type DeflectionCriteria, maxSpan, type Support } from './member'
import { type ColumnShape, columnSection, columnShapeOf, polygonBox, polygonDims, RATED_PRESSURE, SHAPE_NAME, STAVE_WIDTH } from './planShape'
import { lateralPressure } from './pressure'
import { board, getSection, multiple, plywoodStrip, type Section } from './sections'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'

export type ColumnSheathing =
  | { type: 'plywood'; materialId: string; thicknessMm: number }
  | { type: 'board'; materialId: string; thicknessCm: number }

export interface ColumnInput {
  /** short side, m — round: D; hexagon / octagon: F across the flats (h = b) */
  b: number
  /** long side, m */
  h: number
  /** plan shape; absent = rectangle b × h */
  shape?: ColumnShape
  /** pour height, m */
  height: number
  pressure: PressureParams
  sheathing: ColumnSheathing
  /** vertical studs — plywood sheathing only */
  stud?: { sectionId: string; materialId: string; spacingCm?: number }
  yoke: { sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number; addCm?: number }
  /** ties through the long faces, splitting the long yokes into `spans` spans; `shortSpans` > 1 also ties through the short faces */
  tie: { enabled: boolean; tieId: string; spans: number; shortSpans?: number }
  brace: BraceParams & { perSide: number; sides: 2 | 4 }
  deflection?: DeflectionCriteria
  /** check shear on timber studs (eq 5.13, l − 2d). Default true. */
  checkTimberShear?: boolean
}

export interface ColumnLayout {
  yokeSpacing: number // cm
  studSpacing?: number // cm
  yokeLevels: number[] // m above base
  studsPerFace: { short: number; long: number }
  /** polygon: studs on each face that has them */
  faceStuds?: number
  /** round, staves: staves round the column, bolts at each rib joint */
  staves?: number
  boltsPerJoint?: number
}

export interface ColumnDesign extends DesignResult {
  layout: ColumnLayout
  quantities: { plywoodArea: number; yokes: number; studs: number; ties: number; braces: number; fillers?: number; staves?: number; formArea?: number; ribs?: number; bolts?: number }
}

export const DEFAULT_COLUMN: ColumnInput = {
  b: 0.3,
  h: 1.2,
  height: 3.5,
  pressure: { method: 'CEB', R: 5, T: 30, slump: 10 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 20 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', spacingCm: 30 },
  yoke: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', count: 2, addCm: 10 },
  tie: { enabled: true, tieId: 'tie-3/8', spans: 3 },
  brace: { ...DEFAULT_BRACE, heightM: 3.0, perSide: 2, sides: 4 },
}

/** Yoke spans per face: long yokes split by ties through the long faces, short yokes by ties through the short faces. */
export function columnTieSpans(tie: ColumnInput['tie']): { long: number; short: number } {
  if (!tie.enabled) return { long: 1, short: 1 }
  return { long: Math.max(Math.round(tie.spans), 1), short: Math.max(Math.round(tie.shortSpans ?? 1), 1) }
}

interface YokeCheck {
  rows: CheckRow[]
  ratio: number
}

/** Check both yoke directions at spacing s (cm). Faces in cm. */
function checkYokes(p: number, s: number, bCm: number, hCm: number, yoke: { section: Section; material: ReturnType<typeof getMaterial> }, tie: ColumnInput['tie'], trace?: Trace, defl?: DeflectionCriteria): YokeCheck {
  const w = pressureToLineLoad(p, s / 100) // kg/cm
  const spans = columnTieSpans(tie)
  const longSpan = hCm / spans.long
  const shortSpan = bCm / spans.short
  const support = (n: number): Support => (n >= 3 ? 'continuous' : 'simple')
  const rows: CheckRow[] = []
  trace?.add({ label: 'น้ำหนักแผ่บนคานรัด w = P × ระยะคานรัด', expr: `${fmt(p)} × ${(s / 100).toFixed(2)} / 100`, value: w, unit: 'กก./ซม.' })

  const sides: [string, number, Support, number][] = [
    // [name, span, support, tension from perpendicular yoke reactions]
    ['คานรัดด้านยาว', longSpan, support(spans.long), (w * shortSpan) / 2],
    ['คานรัดด้านสั้น', shortSpan, support(spans.short), (w * longSpan) / 2],
  ]
  for (const [name, span, support, T] of sides) {
    const c = BEAM_COEF[support]
    const M = c.m * w * span * span
    const ct = combinedTensionBending(yoke.section, yoke.material, T, M)
    trace?.add({ label: `${name}: แรงดึง T = w × ช่วงตั้งฉาก / 2`, value: T, unit: 'กก.' })
    trace?.add({ label: `${name}: M = ${c.mLabel} (ช่วง ${span.toFixed(0)} ซม.)`, value: M, unit: 'กก.-ซม.' })
    trace?.add({
      label: `${name}: σ = T/A ± M/S`,
      expr: `${ct.ft.toFixed(1)} ± ${ct.fb.toFixed(1)} → ดึง ${ct.tension.toFixed(1)} ≤ ${ct.Ft}, อัด ${ct.compression.toFixed(1)} ≤ ${ct.Fc}`,
      value: ct.ratio,
      ref: '§9.4',
      status: ct.ratio <= 1 ? 'ok' : 'fail',
    })
    rows.push({ item: `${name} – ดึง+ดัด`, demand: ct.tension, capacity: ct.Ft, ratio: ct.tension / ct.Ft, unit: 'กก./ซม.²' })
    rows.push({ item: `${name} – อัด+ดัด`, demand: ct.compression, capacity: ct.Fc, ratio: ct.compression / ct.Fc, unit: 'กก./ซม.²' })
    const delta = (c.d * w * span ** 4) / (yoke.material.E * yoke.section.Ix)
    const allow = Math.min(span / (defl?.ratio ?? 360), defl?.absCm ?? Infinity)
    trace?.add({ label: `${name}: Δ = ${c.dLabel}`, expr: `≤ ${allow.toFixed(3)}`, value: delta, unit: 'ซม.', status: delta <= allow ? 'ok' : 'fail' })
    rows.push({ item: `${name} – การแอ่นตัว`, demand: delta, capacity: allow, ratio: delta / allow, unit: 'ซม.' })
  }
  return { rows, ratio: Math.max(...rows.map((r) => r.ratio)) }
}

/** Ring of yokes round a regular n-gon at spacing s (cm): each member spans a face a, simply supported at the corners, in tension T = w·F/2. */
function checkRingYokes(p: number, s: number, aCm: number, fCm: number, n: number, yoke: { section: Section; material: ReturnType<typeof getMaterial> }, trace?: Trace, defl?: DeflectionCriteria): YokeCheck {
  const w = pressureToLineLoad(p, s / 100)
  const c = BEAM_COEF.simple
  const name = `คานรัดวงแหวน ${n} ด้าน`
  const T = (w * fCm) / 2
  const M = c.m * w * aCm * aCm
  const ct = combinedTensionBending(yoke.section, yoke.material, T, M)
  trace?.add({ label: 'น้ำหนักแผ่บนคานรัด w = P × ระยะคานรัด', expr: `${fmt(p)} × ${(s / 100).toFixed(2)} / 100`, value: w, unit: 'กก./ซม.' })
  trace?.add({ label: `${name}: แรงดึง T = w × F / 2`, expr: `F = ${fCm.toFixed(0)} ซม.`, value: T, unit: 'กก.' })
  trace?.add({ label: `${name}: M = ${c.mLabel} (ช่วง a ${aCm.toFixed(0)} ซม.)`, value: M, unit: 'กก.-ซม.' })
  trace?.add({ label: `${name}: σ = T/A ± M/S`, expr: `${ct.ft.toFixed(1)} ± ${ct.fb.toFixed(1)} → ดึง ${ct.tension.toFixed(1)} ≤ ${ct.Ft}, อัด ${ct.compression.toFixed(1)} ≤ ${ct.Fc}`, value: ct.ratio, status: ct.ratio <= 1 ? 'ok' : 'fail' })
  const delta = (c.d * w * aCm ** 4) / (yoke.material.E * yoke.section.Ix)
  const allow = Math.min(aCm / (defl?.ratio ?? 360), defl?.absCm ?? Infinity)
  trace?.add({ label: `${name}: Δ = ${c.dLabel}`, expr: `≤ ${allow.toFixed(3)}`, value: delta, unit: 'ซม.', status: delta <= allow ? 'ok' : 'fail' })
  const rows: CheckRow[] = [
    { item: `${name} – ดึง+ดัด`, demand: ct.tension, capacity: ct.Ft, ratio: ct.tension / ct.Ft, unit: 'กก./ซม.²' },
    { item: `${name} – อัด+ดัด`, demand: ct.compression, capacity: ct.Fc, ratio: ct.compression / ct.Fc, unit: 'กก./ซม.²' },
    { item: `${name} – การแอ่นตัว`, demand: delta, capacity: allow, ratio: delta / allow, unit: 'ซม.' },
  ]
  return { rows, ratio: Math.max(...rows.map((r) => r.ratio)) }
}

function yokeLevelsAt(H: number, s: number): number[] {
  const out: number[] = []
  for (let z = 0.2; z < H - 0.05; z += s / 100) out.push(Math.round(z * 1000) / 1000)
  return out
}

export function designColumn(inp: ColumnInput): ColumnDesign {
  const shape = columnShapeOf(inp)
  if (shape.kind === 'circle') return designRoundColumn(inp, shape)
  const poly = shape.kind === 'polygon' ? shape : undefined
  const ring = poly?.yoke === 'ring'
  // a polygon in a box of yokes is designed as the rectangle of its box
  const [boxX, boxZ] = poly ? polygonBox(poly.n, inp.b) : [inp.b, inp.h]
  const bCm = Math.min(boxX, boxZ) * 100
  const hCm = Math.max(boxX, boxZ) * 100
  const aCm = poly ? polygonDims(poly.n, inp.b).a * 100 : 0
  const fCm = inp.b * 100
  /** widest face of sheathing */
  const faceCm = poly ? aCm : hCm
  const tieIn = ring ? { ...inp.tie, enabled: false } : inp.tie
  const sec = columnSection(inp)
  const pres = lateralPressure({ ...inp.pressure, element: 'column', H: inp.height, d: sec.d })
  const p = pres.Pmax
  const defl = inp.deflection
  const components: ComponentResult[] = []
  const yoke = { section: multiple(getSection(inp.yoke.sectionId), inp.yoke.count), material: getMaterial(inp.yoke.materialId) }

  let sFromSupport: number // max yoke c/c from sheathing/studs, cm
  let add: number
  let governing: string
  let studSpacing: number | undefined

  if (inp.sheathing.type === 'plywood') {
    // sheathing → stud spacing
    const tSh = new Trace()
    const ply = { section: plywoodStrip(inp.sheathing.thicknessMm), material: getMaterial(inp.sheathing.materialId), support: 'continuous' as const, deflection: defl }
    const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
    const lim = maxSpan(ply, wSh, tSh)
    const a = inp.stud?.spacingCm ?? pickModule(lim.max, STUD_MODULES)
    studSpacing = a
    const chk = checkBeam(ply, wSh, a, tSh)
    components.push(component('sheathing', 'แผ่นผิวแบบ', `${ply.section.label} (${ply.material.name})`, chk.rows, tSh, { label: 'ระยะเคร่า', value: a, max: lim.max, governing: governingLabel(lim.governing), fixed: inp.stud?.spacingCm !== undefined }))

    // studs → yoke spacing
    if (!inp.stud) throw new Error('Plywood column sheathing needs studs')
    const tSt = new Trace()
    const studMat = getMaterial(inp.stud.materialId)
    const stud = {
      section: getSection(inp.stud.sectionId),
      material: studMat,
      support: 'continuous' as const,
      deflection: defl,
      checkShear: studMat.kind === 'steel' || (inp.checkTimberShear ?? true),
      shearReduction: true,
    }
    const wSt = tSt.add({ label: 'น้ำหนักแผ่บนเคร่า', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, a / 100), unit: 'กก./ซม.' })
    const sl = maxSpan(stud, wSt, tSt)
    add = inp.yoke.addCm ?? (inp.yoke.count === 2 ? 10 : 0)
    sFromSupport = floorTo(sl.max, 5) + add
    governing = governingLabel(sl.governing)
    const s0 = inp.yoke.spacingCm ?? sFromSupport
    const chkSt = checkBeam(stud, wSt, s0 - add, tSt)
    components.push(component('stud', 'เคร่าตั้ง (Studs)', `${stud.section.label} @${a} ซม. (${stud.material.name})`, chkSt.rows, tSt, { label: 'ระยะคานรัด', value: s0, max: sl.max + add, governing, fixed: inp.yoke.spacingCm !== undefined }))
  } else {
    // boards span directly between yokes: strip = widest face
    const tSh = new Trace()
    const face = Math.round(faceCm)
    const sh = { section: board(face, inp.sheathing.thicknessCm), material: getMaterial(inp.sheathing.materialId), support: 'continuous' as const, deflection: defl }
    const wSh = tSh.add({ label: `น้ำหนักแผ่บนแผ่นไม้กว้าง ${face} ซม.`, expr: `${fmt(p)} × ${(face / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, face / 100), unit: 'กก./ซม.' })
    const lim = maxSpan(sh, wSh, tSh)
    add = 0
    sFromSupport = floorTo(lim.max, 5)
    governing = governingLabel(lim.governing)
    const s0 = inp.yoke.spacingCm ?? sFromSupport
    const chk = checkBeam(sh, wSh, s0, tSh)
    components.push(component('sheathing', 'แผ่นผิวแบบ (ไม้กระดาน)', `ไม้หนา ${inp.sheathing.thicknessCm} ซม. (${sh.material.name})`, chk.rows, tSh, { label: 'ระยะคานรัด', value: s0, max: lim.max, governing, fixed: inp.yoke.spacingCm !== undefined }))
  }

  // yokes — auto: reduce spacing in 5 cm steps until the yoke passes
  const yokeCheck = (sp: number, t?: Trace) => (ring && poly ? checkRingYokes(p, sp, aCm, fCm, poly.n, yoke, t, defl) : checkYokes(p, sp, bCm, hCm, yoke, tieIn, t, defl))
  let s = inp.yoke.spacingCm ?? sFromSupport
  if (inp.yoke.spacingCm === undefined) {
    while (s > 10 && yokeCheck(s).ratio > 1) s -= 5
  }
  const tYo = new Trace()
  tYo.add({ label: 'ระยะคานรัด (c/c)', value: s, unit: 'ซม.' })
  if (poly && !ring) tYo.add({ label: `กรอบคานรัดรอบเสา${SHAPE_NAME[poly.n]} + ไม้อุดมุม 4 ด้าน`, expr: `${(boxX * 100).toFixed(0)} × ${(boxZ * 100).toFixed(0)} ซม.`, value: hCm, unit: 'ซม.' })
  const yc = yokeCheck(s, tYo)
  components.push(
    component('yoke', 'คานรัดแบบ (Yokes)', `${yoke.section.label} @${s} ซม. (${yoke.material.name})${ring && poly ? ` วงแหวน ${poly.n} ด้าน` : ''}`, yc.rows, tYo, {
      label: 'ระยะคานรัด',
      value: s,
      max: sFromSupport,
      governing: s < sFromSupport ? 'กำลังคานรัด' : governing,
      fixed: inp.yoke.spacingCm !== undefined,
    }),
  )
  // keep the stud/sheathing spacing info consistent with the final yoke spacing
  const last = components.find((c) => c.key === (inp.sheathing.type === 'plywood' ? 'stud' : 'sheathing'))
  if (last?.spacing && last.spacing.value !== s) last.spacing = { ...last.spacing, value: s }

  // ties: T = P × yoke spacing × tie spacing along the face it passes through
  const spans = columnTieSpans(tieIn)
  if (spans.long > 1 || spans.short > 1) {
    const tie = getTie(inp.tie.tieId)
    const tTi = new Trace()
    const rows: CheckRow[] = []
    const dirs: [string, number, number][] = [
      ['ไทร์ผ่านด้านยาว', hCm, spans.long],
      ['ไทร์ผ่านด้านสั้น', bCm, spans.short],
    ]
    for (const [name, face, n] of dirs) {
      if (n <= 1) continue
      const seg = face / n
      const T = tTi.add({ label: `แรงดึงในไทร์ (${name})`, expr: `${fmt(p)} × ${(s / 100).toFixed(2)} × ${(seg / 100).toFixed(2)}`, value: p * (s / 100) * (seg / 100), unit: 'กก.' })
      rows.push({ item: `แรงดึง (${name})`, demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref })
    }
    const layout = [spans.long > 1 ? `${spans.long - 1} แถว ผ่านด้านยาว` : '', spans.short > 1 ? `${spans.short - 1} แถว ผ่านด้านสั้น` : ''].filter(Boolean).join(' + ')
    components.push(component('tie', 'เหล็กยึดรั้ง (Form tie)', `${tie.name} ${layout}`, rows, tTi))
  }

  // base nails (Ex 9.1 step 4): H = p × (s/2) × face width per side
  const tSi = new Trace()
  const sillCm = ring ? fCm : hCm
  const Hb = tSi.add({ label: ring ? 'แรงที่ฐานแบบต่อด้าน (กว้าง F)' : 'แรงที่ฐานแบบต่อด้าน (ด้านยาว)', expr: `${fmt(p)} × ${(s / 200).toFixed(2)} × ${(sillCm / 100).toFixed(2)}`, value: p * (s / 200) * (sillCm / 100), unit: 'กก.', ref: 'ตัวอย่าง 9.1' })
  const nails = Math.max(2, Math.ceil(Hb / CONCRETE_NAIL_SWL))
  tSi.add({ label: 'จำนวนตะปูคอนกรีต Ø4 มม. ต่อด้าน', value: nails, unit: 'ตัว' })
  components.push(component('sill', 'ฐานบังคับแบบ', `ตะปูคอนกรีต Ø4 มม. ${nails} ตัว/ด้าน`, [{ item: 'แรงต่อตะปู', demand: Hb / nails, capacity: CONCRETE_NAIL_SWL, ratio: Hb / nails / CONCRETE_NAIL_SWL, unit: 'กก.' }], tSi))

  // braces — face of the long side, level difference = short dimension
  components.push(columnBrace(inp, pres.gamma, sec.area, ring ? fCm / 100 : hCm / 100, ring ? fCm / 100 : bCm / 100))

  const yokeLevels = yokeLevelsAt(inp.height, s)
  const studsPerFace = studSpacing ? { short: Math.ceil(bCm / studSpacing) + 1, long: Math.ceil(hCm / studSpacing) + 1 } : { short: 0, long: 0 }
  const faceStuds = poly && studSpacing ? Math.ceil(aCm / studSpacing) + 1 : undefined
  // in a box: studs on the flats against the box (2 on the hexagon, 4 on the octagon), fillers behind the 4 sloping faces
  const studdedFaces = poly ? (ring ? poly.n : poly.n === 6 ? 2 : 4) : 0
  return {
    ...summarize(pres, components),
    layout: { yokeSpacing: s, studSpacing, yokeLevels, studsPerFace, faceStuds },
    quantities: {
      plywoodArea: sec.perimeter * inp.height,
      yokes: yokeLevels.length * (ring && poly ? poly.n : 4) * inp.yoke.count,
      studs: poly ? studdedFaces * (faceStuds ?? 0) : 2 * (studsPerFace.short + studsPerFace.long),
      ties: yokeLevels.length * (spans.long - 1 + spans.short - 1),
      braces: inp.brace.perSide * inp.brace.sides,
      ...(poly && !ring ? { fillers: 4 } : {}),
    },
  }
}

/** Braces on a face of width `widthM`; level difference `dh` = the other plan dimension. */
function columnBrace(inp: ColumnInput, gamma: number, areaM2: number, widthM: number, dh: number): ComponentResult {
  return designBrace({
    brace: inp.brace,
    H: inp.height,
    widthM,
    dh,
    weightPerWidth: (gamma * areaM2 * inp.height) / widthM,
    ecc: 0.1 * dh,
    gamma,
    tributary: 1 / inp.brace.perSide,
    layoutText: `${inp.brace.perSide} ตัว/ด้าน × ${inp.brace.sides} ด้าน`,
  })
}

/**
 * Round column. Staves: vertical staves (boards or plywood strips) span between curved ribs (continuous); each rib
 * ring is in hoop tension T = w·D/2, w = P × rib spacing, bolted at its two joints. Steel form / tube: the maker's
 * allowable pressure; the steel form's flange bolts carry P × D/2 × bolt spacing.
 */
function designRoundColumn(inp: ColumnInput, shape: Extract<ColumnShape, { kind: 'circle' }>): ColumnDesign {
  const D = inp.b
  const dCm = D * 100
  const sec = columnSection(inp)
  const pres = lateralPressure({ ...inp.pressure, element: 'column', H: inp.height, d: D })
  const p = pres.Pmax
  const defl = inp.deflection
  const components: ComponentResult[] = []
  const tie = getTie(inp.tie.tieId)
  let s = 0 // rib / flange bolt spacing, cm (0: tube)
  let staves: number | undefined
  let boltsPerJoint: number | undefined

  if (shape.system === 'stave') {
    const tSh = new Trace()
    const sh = {
      section: inp.sheathing.type === 'plywood' ? plywoodStrip(inp.sheathing.thicknessMm) : board(100, inp.sheathing.thicknessCm),
      material: getMaterial(inp.sheathing.materialId),
      support: 'continuous' as const,
      deflection: defl,
    }
    const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
    const lim = maxSpan(sh, wSh, tSh)
    const sFromSheath = floorTo(lim.max, 5)
    const rib = { section: multiple(getSection(inp.yoke.sectionId), inp.yoke.count), material: getMaterial(inp.yoke.materialId) }
    const ribCheck = (sp: number, t?: Trace) => {
      const w = pressureToLineLoad(p, sp / 100)
      const T = (w * dCm) / 2
      const ct = combinedTensionBending(rib.section, rib.material, T, 0)
      // one or two bolts at each joint
      const nb = Math.min(2, Math.max(1, Math.ceil(T / tie.swl - 1e-9)))
      t?.add({ label: 'น้ำหนักแผ่บนริบ w = P × ระยะริบ', expr: `${fmt(p)} × ${(sp / 100).toFixed(2)} / 100`, value: w, unit: 'กก./ซม.' })
      t?.add({ label: 'แรงดึงห่วงในริบ T = w × D / 2', expr: `D = ${dCm.toFixed(0)} ซม.`, value: T, unit: 'กก.' })
      t?.add({ label: 'ริบ: σ = T/A', expr: `≤ ${ct.Ft}`, value: ct.tension, unit: 'กก./ซม.²', status: ct.tension <= ct.Ft ? 'ok' : 'fail' })
      const rows: CheckRow[] = [{ item: 'ริบ – แรงดึงห่วง', demand: ct.tension, capacity: ct.Ft, ratio: ct.tension / ct.Ft, unit: 'กก./ซม.²' }]
      return { T, nb, rows, ratio: Math.max(ct.tension / ct.Ft, T / (nb * tie.swl)) }
    }
    s = inp.yoke.spacingCm ?? sFromSheath
    if (inp.yoke.spacingCm === undefined) while (s > 10 && ribCheck(s).ratio > 1) s -= 5
    staves = Math.ceil((Math.PI * dCm) / STAVE_WIDTH)
    const chk = checkBeam(sh, wSh, s, tSh)
    tSh.add({ label: `จำนวนระแนงรอบเสา (กว้างไม่เกิน ${STAVE_WIDTH} ซม.)`, expr: `π × ${dCm.toFixed(0)} / ${STAVE_WIDTH}`, value: staves, unit: 'ชิ้น' })
    const what = inp.sheathing.type === 'plywood' ? `${sh.section.label} ตัดเป็นแถบ` : `ไม้หนา ${inp.sheathing.thicknessCm} ซม.`
    components.push(
      component('sheathing', 'แผ่นผิวแบบ (ไม้ระแนงตั้ง)', `${what} ${staves} ชิ้น (${sh.material.name})`, chk.rows, tSh, {
        label: 'ระยะริบ',
        value: s,
        max: lim.max,
        governing: s < sFromSheath ? 'กำลังริบ' : governingLabel(lim.governing),
        fixed: inp.yoke.spacingCm !== undefined,
      }),
    )
    const tRb = new Trace()
    tRb.add({ label: 'ระยะริบ (c/c)', value: s, unit: 'ซม.' })
    const rc = ribCheck(s, tRb)
    boltsPerJoint = rc.nb
    components.push(component('yoke', 'ริบโค้งรัดแบบ (Hoop ribs)', `${rib.section.label} ครึ่งวง 2 ชิ้น/ชุด @${s} ซม. (${rib.material.name})`, rc.rows, tRb))
    const tTi = new Trace()
    const Tb = tTi.add({ label: 'แรงดึงต่อสลักที่รอยต่อริบ', expr: `${rc.T.toFixed(0)} / ${rc.nb}`, value: rc.T / rc.nb, unit: 'กก.' })
    components.push(component('tie', 'สลักยึดรอยต่อริบ', `${tie.name} ${rc.nb} ตัว × 2 รอยต่อ/ชุด`, [{ item: 'แรงดึงต่อสลัก', demand: Tb, capacity: tie.swl, ratio: Tb / tie.swl, unit: 'กก.', ref: tie.ref }], tTi))
  } else {
    const steel = shape.system === 'steel'
    const rated = shape.ratedKgM2 ?? RATED_PRESSURE[shape.system]
    const tSh = new Trace()
    tSh.add({ label: 'แรงดันสูงสุดที่ผู้ผลิตรับรอง', value: rated, unit: 'กก./ม.²' })
    components.push(
      component('sheathing', steel ? 'แบบเหล็กสำเร็จรูป' : 'ท่อกระดาษหล่อเสา', `Ø${dCm.toFixed(0)} ซม. รับแรงดัน ${rated.toLocaleString()} กก./ม.² (ตามผู้ผลิต)`, [{ item: 'แรงดันคอนกรีต', demand: p, capacity: rated, ratio: p / rated, unit: 'กก./ม.²' }], tSh),
    )
    if (steel) {
      // flange bolts down the two seams
      const tTi = new Trace()
      s = inp.yoke.spacingCm ?? Math.max(10, Math.min(50, floorTo((tie.swl / (p * (D / 2))) * 100, 5)))
      const T = tTi.add({ label: 'แรงดึงต่อสลักปีกแบบ T = P × D/2 × ระยะสลัก', expr: `${fmt(p)} × ${(D / 2).toFixed(2)} × ${(s / 100).toFixed(2)}`, value: p * (D / 2) * (s / 100), unit: 'กก.' })
      components.push(component('tie', 'สลักเกลียวปีกแบบเหล็ก', `${tie.name} @${s} ซม. × 2 แนวรอยต่อ`, [{ item: 'แรงดึงต่อสลัก', demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref }], tTi))
    }
  }

  if (s > 0) {
    const tSi = new Trace()
    const Hb = tSi.add({ label: 'แรงที่ฐานแบบต่อด้าน (กว้าง D)', expr: `${fmt(p)} × ${(s / 200).toFixed(2)} × ${D.toFixed(2)}`, value: p * (s / 200) * D, unit: 'กก.', ref: 'ตัวอย่าง 9.1' })
    const nails = Math.max(2, Math.ceil(Hb / CONCRETE_NAIL_SWL))
    tSi.add({ label: 'จำนวนตะปูคอนกรีต Ø4 มม. ต่อด้าน', value: nails, unit: 'ตัว' })
    components.push(component('sill', 'ฐานบังคับแบบ', `ตะปูคอนกรีต Ø4 มม. ${nails} ตัว/ด้าน`, [{ item: 'แรงต่อตะปู', demand: Hb / nails, capacity: CONCRETE_NAIL_SWL, ratio: Hb / nails / CONCRETE_NAIL_SWL, unit: 'กก.' }], tSi))
  }
  components.push(columnBrace(inp, pres.gamma, sec.area, D, D))

  const yokeLevels = shape.system === 'stave' ? yokeLevelsAt(inp.height, s) : []
  const formArea = sec.perimeter * inp.height
  const bolts = shape.system === 'stave' ? yokeLevels.length * 2 * (boltsPerJoint ?? 1) : shape.system === 'steel' ? 2 * Math.ceil((inp.height * 100) / s) : 0
  // plywood only when the staves are cut from plywood; ribs and bolts under their own names
  const plyStaves = shape.system === 'stave' && inp.sheathing.type === 'plywood'
  return {
    ...summarize(pres, components),
    layout: { yokeSpacing: s, yokeLevels, studsPerFace: { short: 0, long: 0 }, staves, boltsPerJoint },
    quantities: {
      plywoodArea: plyStaves ? formArea : 0,
      ...(plyStaves ? {} : { formArea }),
      yokes: 0,
      ...(yokeLevels.length ? { ribs: yokeLevels.length * 2 * inp.yoke.count } : {}),
      studs: 0,
      ...(staves ? { staves } : {}),
      ties: 0,
      ...(bolts ? { bolts } : {}),
      braces: inp.brace.perSide * inp.brace.sides,
    },
  }
}
