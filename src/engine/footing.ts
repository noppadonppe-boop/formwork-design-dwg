// Footing formwork design — book Chapter 10 (§10.4, Examples 10.1–10.3).
// Side forms like a low wall; studs held in one of three ways (§10.4):
//   cantilever — studs/stakes driven into the ground;
//   braced     — studs span between a bottom stake and diagonal braces to stakes in the soil (Ex 10.1),
//                braced at every stud, or through wales at the brace levels (fewer braces and stakes);
//   tied       — studs continuous over wales running round the footing (Ex 10.2, 10.3). The wales work
//                like column yokes (§9.4, Ex 9.1): bending + axial tension from the perpendicular side,
//                spanning corner to corner (no ties) or continuous over ties across one or both directions.
// Plan shapes (planShape.ts): the studs, braces and stakes work per metre of face whatever the shape; round and
// polygonal footings keep D / F in lengthX = lengthY. Tied wales: a polygon's ring along its faces (M = w·a²/8,
// T = w·F/2, no ties); an L/T/U's wales along the faces with ties through each leg at the inner corners (as the
// L/T/U column). A round footing is formed in plywood bent to its radius on cantilever or braced studs only.
import { type AdviceOption, component, type ComponentResult, DEFAULT_BRACE, type DesignAdvice, type DesignResult, governingLabel, pickModule, type PressureParams, statusOf, STUD_MODULES, summarize, TIE_MODULES } from './design'
import { getMaterial, getTie, type Material } from './materials'
import { BEAM_COEF, type CheckRow, checkBeam, columnCapacity, combinedTensionBending, type DeflectionCriteria, maxSpan, type MemberInput, type Support } from './member'
import { lateralPressure } from './pressure'
import { getSection, multiple, type Section } from './sections'
import { type DeckSheathing, deckSection, deckThicknessM } from './slab'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'
import { checkLegYokes, checkRingYokes } from './column'
import { type FootingShape, footingPlan, footingShapeOf, isLegShape, legLayout, legTieForces, legTiesPerLevel, plywoodBendRadius, polygonDims, SHAPE_NAME, studsOnFaces } from './planShape'
import { designWall, type WallSystem } from './wall'

export type FootingSupport = 'cantilever' | 'braced' | 'tied'
/** tied: where the ties go — none (wales tie round the corners), across the short side, or both ways */
export type FootingTieLayout = 'auto' | 'none' | 'short' | 'both'
/** braced: braces at every stud, or at wales running round the footing at the brace levels */
export type FootingBraceAt = 'stud' | 'wale'
/**
 * How the wales meet at the corners:
 *   cross — every wale runs full length past the corners (no cutting, stock reused); the short-side
 *           wales sit one wale-set higher or lower so they cross over the long-side wales;
 *   butt  — all wales at one level; the short-side wales are cut to butt against the long-side ones.
 */
export type FootingWaleCorner = 'cross' | 'butt'
export type FootingWaleShift = 'auto' | 'down' | 'up'

export interface FootingInput {
  /** plan size, m — round: D; hexagon / octagon: F (lengthY = lengthX); L/T/U: its box */
  lengthX: number
  lengthY: number
  /** plan shape; absent = rectangle lengthX × lengthY */
  shape?: FootingShape
  /** footing depth = side form height, m */
  height: number
  /** tied rectangular footings: 'horizontal' = horizontal studs on vertical wales (strongbacks), ties both ways */
  system?: WallSystem
  pressure: PressureParams
  sheathing: DeckSheathing
  stud: { sectionId: string; materialId: string; spacingCm?: number }
  support: FootingSupport
  /** braced: spacingCm = support spacing along the stud; at 'wale': alongCm = brace spacing along the wale */
  brace: { sectionId: string; materialId: string; angleDeg: number; spacingCm?: number; topOverhangM: number; at?: FootingBraceAt; alongCm?: number }
  /** wales round the footing — tied, or braced at 'wale' */
  wale: { sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number; addCm?: number; bottomOffsetM: number; corner?: FootingWaleCorner; shift?: FootingWaleShift }
  tie: { tieId: string; spacingCm?: number; layout?: FootingTieLayout }
  /** stakes (หลัก) at every stud; embedM = embedment provided; boardCm = board behind the brace stake */
  stake: { sectionId: string; embedM: number; boardCm: number }
  /** allowable soil bearing for stakes, kg/m² (Ex 10.1: 10 t/m²) */
  soilBearing: number
  /** lean concrete thickness, m */
  leanM: number
  deflection?: DeflectionCriteria
  checkTimberShear?: boolean
}

export interface FootingLayout {
  studSpacing: number // cm
  /** braced: brace levels above the base, m; tied: wale levels */
  braceLevels: number[]
  waleLevels: number[]
  supportSpacing?: number // cm
  waleSpacing?: number // cm
  /** tied: tie module used, cm (undefined without ties) */
  tieSpacing?: number // cm
  /** tied: resolved tie layout */
  tieLayout?: Exclude<FootingTieLayout, 'auto'>
  /** ties per level through the long faces / through the short faces */
  tiesLong?: number
  tiesShort?: number
  /** braced at wales: brace spacing along the wale, cm */
  braceAlong?: number
  /** wale corner detail and the vertical offset of the short-side wales, m (− down, + up) */
  waleCorner?: FootingWaleCorner
  waleShift?: number
  /** steel bearing plate at each tie end: width along the wale × height, cm; thickness, mm */
  tiePlate?: { wCm: number; hCm: number; tMm: number }
  /** L/T/U tied: spans each leg is split into by its ties (1 = inner-corner ties only) */
  legSpans?: number
  /** tied rectangle with horizontal studs on vertical wales: stud rows and tie rows (m above base), the strongbacks
   *  along a long face and along a short face (m from its end) */
  system?: WallSystem
  studLevels?: number[]
  tieLevels?: number[]
  waleXLong?: number[]
  waleXShort?: number[]
}

export interface FootingDesign extends DesignResult {
  layout: FootingLayout
  quantities: { plywoodArea: number; studs: number; studLength: number; braces: number; stakes: number; waleLength: number; ties: number }
}

export const DEFAULT_FOOTING: FootingInput = {
  lengthX: 2.4,
  lengthY: 2.4,
  height: 1.0,
  pressure: { method: 'CEB', R: 2, T: 30, slump: 10 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
  support: 'braced',
  brace: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', angleDeg: 45, topOverhangM: 0.2, at: 'stud' },
  wale: { sectionId: 'timber-2x4', materialId: 'timber-yang', count: 2, addCm: 10, bottomOffsetM: 0.15, corner: 'cross', shift: 'auto' },
  tie: { tieId: 'tie-1/2', layout: 'auto' },
  stake: { sectionId: 'timber-1.5x3', embedM: 0.7, boardCm: 25 },
  soilBearing: 10000,
  leanM: 0.05,
}

export const FOOTING_SUPPORT_LABEL: Record<FootingSupport, string> = { cantilever: 'เคร่าปลายยื่น (ตอกลงดิน)', braced: 'ค้ำยันทแยงลงหลัก', tied: 'คานรับเคร่ารอบฐาน (+ Form tie)' }
/** The arrangement actually designed, in full — for reports and drawings (the support label alone is generic). */
export function footingSystemLabel(inp: FootingInput, d?: FootingDesign): string {
  const shape = footingShapeOf(inp)
  if (inp.support === 'tied' && shape.kind === 'polygon') return 'คานรับเคร่ารัดรอบฐาน (วงแหวนตามรูป ไม่ใช้ไทร์)'
  if (inp.support === 'tied' && isLegShape(shape)) return `คานรับเคร่าตามหน้า + Form tie มุมใน${(d?.layout.legSpans ?? 1) > 1 ? ` และกลางขา` : ''}`
  if (inp.support === 'tied' && inp.system === 'horizontal' && shape.kind === 'rect') return 'เคร่านอน + คานตั้ง + Form tie สองทิศทาง'
  if (inp.support === 'cantilever') return 'เคร่าปลายยื่น (ตอกลงดิน)'
  if (inp.support === 'braced') return inp.brace.at === 'wale' ? 'ค้ำยันทแยงผ่านคานรับเคร่าลงหลัก' : 'ค้ำยันทแยงทุกเคร่าลงหลัก'
  const lay = d?.layout.tieLayout
  if (lay === 'none') return 'คานรับเคร่ารัดรอบฐาน (ไม่ใช้ไทร์)'
  if (lay === 'short') return 'คานรับเคร่ารอบฐาน + Form tie ขวางด้านสั้น'
  if (lay === 'both') return 'คานรับเคร่ารอบฐาน + Form tie สองทิศทาง'
  return FOOTING_SUPPORT_LABEL.tied
}
export const FOOTING_TIE_LAYOUT_LABEL: Record<FootingTieLayout, string> = {
  auto: 'อัตโนมัติ — ใช้ไทร์น้อยที่สุดที่ผ่าน',
  none: 'ไม่ใช้ไทร์ — คานรับเคร่ารัดรอบฐาน',
  short: 'ไทร์ขวางด้านสั้น',
  both: 'ไทร์ทั้งสองทิศทาง',
}
export const FOOTING_WALE_CORNER_LABEL: Record<FootingWaleCorner, string> = { cross: 'วางไขว้ — ยาวเต็มท่อน ไม่ต้องตัด', butt: 'ตัดชน — ระดับเดียวกัน' }
export const FOOTING_WALE_SHIFT_LABEL: Record<FootingWaleShift, string> = { auto: 'อัตโนมัติ', down: 'เลื่อนลง', up: 'เลื่อนขึ้น' }
/** Gap between the two members of a double wale (tie passes through) — as drawn in the 3D model. */
export const WALE_PAIR_GAP = 0.015
/** Height of one wale set (single, or the double pair with its gap), m. */
export const waleSetHeight = (inp: FootingInput) => {
  const b = getSection(inp.wale.sectionId).B / 100
  return inp.wale.count === 2 ? 2 * b + WALE_PAIR_GAP : b
}
export const FOOTING_BRACE_AT_LABEL: Record<FootingBraceAt, string> = { stud: 'ค้ำยันทุกเคร่า', wale: 'ค้ำยันผ่านคานรับเคร่า' }

/** Soil weaker than this is unsuitable for stakes (book note to Ex 10.1). */
export const SOFT_SOIL = 5000

export const studsAround = (Lx: number, Ly: number, aCm: number) => 2 * (Math.ceil((Lx * 100) / aCm) + 1) + 2 * (Math.ceil((Ly * 100) / aCm) + 1)

/** Ties per level for a side of length L (cm) at spacing ≤ s: interior points only — the corners hold themselves. */
export const tiesAlong = (L: number, s: number) => Math.max(Math.ceil(L / s - 1e-9) - 1, 1)

type Ring = { layout: Exclude<FootingTieLayout, 'auto'>; tieSp?: number; nL: number; nS: number; segL: number; segS: number; rows: CheckRow[]; ratio: number; corner: number }

/**
 * Wales round the footing at spacing s (cm), checked like column yokes (§9.4, Ex 9.1 step 4):
 * each side spans between ties (or corner to corner) and carries the end reaction of the
 * perpendicular side as axial tension, σ = T/A ± M/S.
 */
function checkRing(p: number, s: number, longCm: number, shortCm: number, layout: Ring['layout'], tieSp: number | undefined, wale: { section: MemberInput['section']; material: MemberInput['material'] }, defl?: DeflectionCriteria, trace?: Trace): Ring {
  const w = pressureToLineLoad(p, s / 100)
  const nL = layout === 'none' ? 0 : tiesAlong(longCm, tieSp!)
  const nS = layout === 'both' ? tiesAlong(shortCm, tieSp!) : 0
  // spans taken at the tie module (book Ex 10.2) — the drawn ties are spread evenly at ≤ that spacing
  const segL = nL ? Math.min(tieSp!, longCm) : longCm
  const segS = nS ? Math.min(tieSp!, shortCm) : shortCm
  trace?.add({ label: 'น้ำหนักแผ่บนคานรับเคร่า w = P × ระยะคานรับเคร่า', expr: `${fmt(p)} × ${(s / 100).toFixed(2)} / 100`, value: w, unit: 'กก./ซม.' })
  if (layout !== 'none') trace?.add({ label: `ไทร์ผ่านด้านยาว ${nL} ตัว/ระดับ (ยาว ${longCm.toFixed(0)} ซม.) → ช่วงคานด้านยาว`, value: segL, unit: 'ซม.' })
  if (layout === 'both') trace?.add({ label: `ไทร์ผ่านด้านสั้น ${nS} ตัว/ระดับ (ยาว ${shortCm.toFixed(0)} ซม.) → ช่วงคานด้านสั้น`, value: segS, unit: 'ซม.' })
  const rows: CheckRow[] = []
  // [name, span, number of spans, tension = end reaction of the perpendicular side]
  const sides: [string, number, number, number][] = [
    ['คานรับเคร่าด้านยาว', segL, nL + 1, (w * segS) / 2],
    ['คานรับเคร่าด้านสั้น', segS, nS + 1, (w * segL) / 2],
  ]
  for (const [name, span, n, T] of sides) {
    const support: Support = n >= 3 ? 'continuous' : 'simple'
    const c = BEAM_COEF[support]
    const M = c.m * w * span * span
    const ct = combinedTensionBending(wale.section, wale.material, T, M)
    trace?.add({ label: `${name}: แรงดึง T = w × ช่วงด้านตั้งฉาก / 2`, value: T, unit: 'กก.', ref: 'ตัวอย่าง 9.1' })
    trace?.add({ label: `${name}: M = ${c.mLabel} (${n} ช่วง × ${span.toFixed(0)} ซม.)`, value: M, unit: 'กก.-ซม.' })
    trace?.add({
      label: `${name}: σ = T/A ± M/S`,
      expr: `${ct.ft.toFixed(1)} ± ${ct.fb.toFixed(1)} → ดึง ${ct.tension.toFixed(1)} ≤ ${ct.Ft}, อัด ${ct.compression.toFixed(1)} ≤ ${ct.Fc}`,
      value: ct.ratio,
      ref: '§9.4',
      status: ct.ratio <= 1 ? 'ok' : 'fail',
    })
    rows.push({ item: `${name} – ดึง+ดัด`, demand: ct.tension, capacity: ct.Ft, ratio: ct.tension / ct.Ft, unit: 'กก./ซม.²', ref: '§9.4' })
    rows.push({ item: `${name} – อัด+ดัด`, demand: ct.compression, capacity: ct.Fc, ratio: ct.compression / ct.Fc, unit: 'กก./ซม.²', ref: '§9.4' })
    const delta = (c.d * w * span ** 4) / (wale.material.E * wale.section.Ix)
    const allow = Math.min(span / (defl?.ratio ?? 360), defl?.absCm ?? Infinity)
    trace?.add({ label: `${name}: Δ = ${c.dLabel}`, expr: `≤ ${allow.toFixed(3)}`, value: delta, unit: 'ซม.', status: delta <= allow ? 'ok' : 'fail' })
    rows.push({ item: `${name} – การแอ่นตัว`, demand: delta, capacity: allow, ratio: delta / allow, unit: 'ซม.', ref: support === 'continuous' ? 'สมการ 5.28' : 'สมการ 5.27' })
  }
  const corner = Math.max(...sides.map((x) => x[3]))
  return { layout, tieSp, nL, nS, segL, segS, rows, ratio: Math.max(...rows.map((r) => r.ratio)), corner }
}

const PLATE_W = [8, 10, 12, 15, 20, 25] as const // cm
const PLATE_T = [6, 9, 12, 16, 19, 25] as const // mm
const PLATE_FB = 1500 // kg/cm², A36 0.6Fy

/**
 * Steel plate (เหล็กประกับ) under the tie nut/wedge, bridging the wale set. Width from bearing across the
 * grain of the timber wales, T ≤ Fc⊥ × n·b × w (§3, Table 3.4); thickness from bending as a simple beam
 * between the two wale members, M = T·L/4 with L = b + gap (single wale: L = b/2, washer action).
 */
export function tiePlate(T: number, wale: Section, mat: Material, count: 1 | 2, trace?: Trace) {
  const b = wale.B // cm, vertical face of one member
  const gap = WALE_PAIR_GAP * 100
  const hCm = Math.ceil(count * b + (count === 2 ? gap : 0) + 2)
  const rows: CheckRow[] = []
  let wCm: number = PLATE_W[0]
  if (mat.Fcp !== undefined) {
    const need = T / (mat.Fcp * count * b)
    wCm = PLATE_W.find((x) => x >= need) ?? PLATE_W[PLATE_W.length - 1]
    const f = T / (count * b * wCm)
    trace?.add({ label: 'แรงกดตั้งฉากเสี้ยนใต้เหล็กประกับ = T / (n·b·w)', expr: `${fmt(T)} / (${count} × ${b} × ${wCm}) ≤ ${mat.Fcp}`, value: f, unit: 'กก./ซม.²', ref: 'ตาราง 3.4', status: f <= mat.Fcp ? 'ok' : 'fail' })
    rows.push({ item: 'แรงกดบนคานรับเคร่า (ใต้เหล็กประกับ)', demand: f, capacity: mat.Fcp, ratio: f / mat.Fcp, unit: 'กก./ซม.²', ref: 'ตาราง 3.4' })
  } else wCm = 10
  const L = count === 2 ? b + gap : b / 2
  const M = (T * L) / 4
  const tNeed = Math.sqrt((6 * M) / (wCm * PLATE_FB)) * 10 // mm
  const tMm = PLATE_T.find((x) => x >= tNeed) ?? PLATE_T[PLATE_T.length - 1]
  const fb = (6 * M) / (wCm * (tMm / 10) ** 2)
  trace?.add({ label: 'เหล็กประกับ: M = T·L/4', expr: `${fmt(T)} × ${L.toFixed(2)} / 4`, value: M, unit: 'กก.-ซม.' })
  trace?.add({ label: `เหล็กประกับ ${wCm}×${hCm} ซม. หนา ${tMm} มม.: fb = 6M/(w·t²)`, expr: `≤ ${PLATE_FB}`, value: fb, unit: 'กก./ซม.²', status: fb <= PLATE_FB ? 'ok' : 'fail' })
  rows.push({ item: 'เหล็กประกับรับแรงดัด', demand: fb, capacity: PLATE_FB, ratio: fb / PLATE_FB, unit: 'กก./ซม.²' })
  return { wCm, hCm, tMm, rows }
}

export function designFooting(inp: FootingInput, opts: { advise?: boolean } = {}): FootingDesign {
  const shape = footingShapeOf(inp)
  const plan = footingPlan(inp)
  const rect = shape.kind === 'rect'
  const warnings: string[] = []
  // a round form has no straight wales: cantilever studs, or braces at every stud
  if (plan.round && (inp.support === 'tied' || (inp.support === 'braced' && inp.brace.at === 'wale'))) {
    warnings.push('ฐานรากกลมไม่มีคานรับเคร่าตรง ใช้ค้ำยันทุกเคร่าแทน')
    inp = { ...inp, support: 'braced', brace: { ...inp.brace, at: 'stud' } }
  }
  if (plan.round && inp.sheathing.type === 'plywood') {
    const need = plywoodBendRadius(inp.sheathing.thicknessMm)
    const R = inp.lengthX / 2
    if (R < need) warnings.push(`ไม้อัด ${inp.sheathing.thicknessMm} มม. ดัดโค้งที่รัศมี ${R.toFixed(2)} ม. ไม่ได้ (ต้อง ≥ ${need} ม.) — ใช้ไม้อัดบางลงซ้อน 2 ชั้น หรือไม้กระดานแนวตั้ง`)
  }
  const H = inp.height
  const d = plan.d
  const pres = lateralPressure({ ...inp.pressure, element: 'wall', H, d })
  const p = pres.Pmax
  const defl = inp.deflection
  const timberShear = inp.checkTimberShear ?? true
  const shearOn = (materialId: string) => getMaterial(materialId).kind === 'steel' || timberShear
  const components: ComponentResult[] = []

  // 1) sheathing → stud spacing
  const tSh = new Trace()
  const sh: MemberInput = { section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: 'continuous', deflection: defl }
  const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', expr: `${fmt(p)} × 1.00 / 100`, value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
  const shLim = maxSpan(sh, wSh, tSh)
  const a = inp.stud.spacingCm ?? pickModule(shLim.max, STUD_MODULES)
  tSh.add({ label: 'ระยะเคร่าที่ใช้', value: a, unit: 'ซม.' })
  components.push(
    component('sheathing', 'แผ่นผิวข้างแบบ', `${sh.section.label} (${sh.material.name})`, checkBeam(sh, wSh, a, tSh).rows, tSh, {
      label: 'ระยะเคร่า',
      value: a,
      max: shLim.max,
      governing: governingLabel(shLim.governing),
      fixed: inp.stud.spacingCm !== undefined,
    }),
  )

  // tied rectangle with horizontal studs on vertical wales (other shapes keep the wales round the footing)
  const hz = inp.support === 'tied' && inp.system === 'horizontal' && footingShapeOf(inp).kind === 'rect'
  const stMat = getMaterial(inp.stud.materialId)
  const stSec = getSection(inp.stud.sectionId)
  const stake = getSection(inp.stake.sectionId)
  const q = inp.soilBearing
  const layout: FootingLayout = { studSpacing: a, braceLevels: [], waleLevels: [] }
  let braces = 0
  let stakes = 0
  let waleLength = 0
  let ties = 0
  const nStuds = studsOnFaces(plan.faces, a, plan.round)
  const wSt = pressureToLineLoad(p, a / 100)
  // wales round the footing: corner detail, short-side offset and the drawn length
  const corner: FootingWaleCorner = inp.wale.corner ?? 'cross'
  const placeWales = (levels: number[]) => {
    const lap = deckThicknessM(inp.sheathing) + stSec.H / 100
    const wd = getSection(inp.wale.sectionId).H / 100
    if (!rect) {
      // along every face, butted at the corners
      waleLength = plan.faces.reduce((t, f) => t + f + 2 * (lap + wd), 0) * inp.wale.count * levels.length
      layout.waleCorner = 'butt'
      layout.waleShift = 0
      warnings.push('มุมคานรับเคร่า: คานแต่ละหน้าต่อชนที่มุม ยึดด้วยไม้ประกับ/เหล็กประกับและสลักเกลียว')
      return
    }
    const long = Math.max(inp.lengthX, inp.lengthY)
    const short = Math.min(inp.lengthX, inp.lengthY)
    const run = (L: number) => L + 2 * (lap + wd + 0.1)
    waleLength = (2 * run(long) + 2 * (corner === 'cross' ? run(short) : short + 2 * lap)) * inp.wale.count * levels.length
    layout.waleCorner = corner
    layout.waleShift = 0
    if (corner === 'butt') {
      warnings.push('มุมคานรับเคร่า: คานด้านสั้นตัดชนผิวในของคานด้านยาว (ระดับเดียวกัน) — ยึดด้วยไม้ประกับ/สลักเกลียว (รูป 8.11)')
      return
    }
    // the short-side set sits one set height below (preferred: nearer the peak pressure) or above
    const h = waleSetHeight(inp)
    const lo = Math.min(...levels) - 1.5 * h // bottom of the lowest shifted set
    const hi = Math.max(...levels) + 1.5 * h // top of the highest shifted set
    const downOk = lo >= 0.03
    const upOk = hi <= H
    const want = inp.wale.shift ?? 'auto'
    const dir = want === 'auto' ? (downOk || !upOk ? 'down' : 'up') : want
    layout.waleShift = Math.round((dir === 'down' ? -h : h) * 1000) / 1000
    warnings.push(
      `มุมคานรับเคร่า: วางไขว้ — คานด้านสั้นยาวเต็มท่อนเลยมุม ${dir === 'down' ? 'เลื่อนลง' : 'เลื่อนขึ้น'} ${(h * 100).toFixed(1)} ซม. วางซ้อนคานด้านยาว ยึดจุดไขว้ด้วยสลักเกลียว/ไม้ประกับ`,
    )
    if (dir === 'down' && !downOk) warnings.push(`คานรับเคร่าด้านสั้นตัวล่างต่ำเกินไป (ขอบล่าง ${(lo * 100).toFixed(0)} ซม. จากฐาน) — เลือกเลื่อนขึ้น หรือเพิ่มระยะคานตัวแรกจากฐาน`)
    if (dir === 'up' && !upOk) warnings.push(`คานรับเคร่าด้านสั้นตัวบนเลยขอบแบบ (${(hi * 100).toFixed(0)} > ${(H * 100).toFixed(0)} ซม.) — เลือกเลื่อนลง หรือใช้แบบตัดชน`)
  }
  const waleMember = { section: multiple(getSection(inp.wale.sectionId), inp.wale.count), material: getMaterial(inp.wale.materialId) }

  if (inp.support === 'cantilever') {
    // 2) studs as cantilevers from the ground (Table 10.2ก): M = wL²/2, Δ = wL⁴/8EI
    const t = new Trace()
    t.add({ label: 'น้ำหนักแผ่บนเคร่า', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: wSt, unit: 'กก./ซม.' })
    const L = H * 100
    const M = t.add({ label: 'M = wL²/2 (ปลายยื่น)', expr: `${wSt.toFixed(2)} × ${L.toFixed(0)}² / 2`, value: (wSt * L * L) / 2, unit: 'กก.-ซม.', ref: 'ตาราง 10.2ก' })
    const fb = t.add({ label: 'fb = M/S', value: M / stSec.Sx, unit: 'กก./ซม.²' })
    const delta = t.add({ label: 'Δ = wL⁴/8EI', value: (wSt * L ** 4) / (8 * stMat.E * stSec.Ix), unit: 'ซม.' })
    const dAllow = L / (defl?.ratio ?? 360)
    const rows: CheckRow[] = [
      { item: 'หน่วยแรงดัด fb', demand: fb, capacity: stMat.Fb, ratio: fb / stMat.Fb, unit: 'กก./ซม.²' },
      { item: 'การแอ่นตัวปลายเคร่า', demand: delta, capacity: dAllow, ratio: delta / dAllow, unit: 'ซม.' },
    ]
    components.push(component('stud', 'เคร่า (ปลายยื่นจากดิน)', `${stSec.label} @${a} ซม. (${stMat.name})`, rows, t))
    const tk = new Trace()
    const F = tk.add({ label: 'แรงดันดินที่ต้องรับต่อหลัก', expr: `${fmt(p)} × ${H} × ${(a / 100).toFixed(2)}`, value: p * H * (a / 100), unit: 'กก.' })
    const need = tk.add({ label: 'ความลึกหลักที่ต้องการ = F / (q·b)', expr: `${fmt(F)} / (${fmt(q)} × ${(stake.dMin / 100).toFixed(3)})`, value: F / (q * (stake.dMin / 100)), unit: 'ม.', ref: 'ตัวอย่าง 10.1' })
    components.push(component('stake', 'หลักยึดเคร่า (Stakes)', `${stake.label} ฝังลึก ${inp.stake.embedM.toFixed(2)} ม. @${a} ซม.`, [{ item: 'ความลึกฝังหลัก', demand: need, capacity: inp.stake.embedM, ratio: need / inp.stake.embedM, unit: 'ม.' }], tk))
    stakes = nStuds
    warnings.push('เคร่าปลายยื่นเหมาะกับฐานรากตื้นบนดินแข็งเท่านั้น (§10.4)')
  } else if (inp.support === 'braced') {
    // 2) studs between supports — single/two-span, M = wl²/8 (Ex 10.1 step 3)
    const t = new Trace()
    const st: MemberInput = { section: stSec, material: stMat, support: 'simple', deflection: defl, checkShear: shearOn(inp.stud.materialId), shearReduction: true }
    t.add({ label: 'น้ำหนักแผ่บนเคร่า', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: wSt, unit: 'กก./ซม.' })
    const lim = maxSpan(st, wSt, t)
    const l = inp.brace.spacingCm ?? floorTo(lim.max, 5)
    t.add({ label: 'ระยะจุดค้ำยันที่ใช้', value: l, unit: 'ซม.' })
    // support levels: top brace below the top edge by the overhang, then every l down to the bottom stake
    const ov = Math.min(inp.brace.topOverhangM, H)
    const levels: number[] = []
    for (let y = H - ov; y > 0.05; y -= l / 100) levels.push(Math.round(y * 1000) / 1000)
    if (!levels.length) levels.push(Math.round(H * 500) / 1000)
    const gaps = [...levels.slice(1).map((y, i) => levels[i] - y), levels[levels.length - 1]]
    const span = Math.max(...gaps) * 100
    const chk = checkBeam(st, wSt, span, t)
    const ovRow: CheckRow = { item: 'ระยะยื่นปลายบน ≤ ช่วง/2', demand: ov * 100, capacity: l / 2, ratio: (ov * 100) / (l / 2), unit: 'ซม.' }
    components.push(
      component('stud', 'เคร่า (ค้ำยันเป็นช่วง)', `${stSec.label} @${a} ซม. (${stMat.name})`, [...chk.rows, ovRow], t, {
        label: 'ระยะจุดค้ำยัน',
        value: l,
        max: lim.max,
        governing: governingLabel(lim.governing),
        fixed: inp.brace.spacingCm !== undefined,
      }),
    )
    layout.supportSpacing = l
    layout.braceLevels = levels

    // horizontal line load at each support level, kg/m of form (tributary half-gaps above and below)
    const qLevel = levels.map((y, i) => p * ((i === 0 ? ov : (levels[i - 1] - y) / 2) + gaps[i] / 2))
    const th = (inp.brace.angleDeg * Math.PI) / 180
    const bs = getSection(inp.brace.sectionId)
    const bm = getMaterial(inp.brace.materialId)
    const viaWale = inp.brace.at === 'wale'
    const capAt = (y: number, tr?: Trace) => columnCapacity(bs, bm, (y / Math.sin(th)) * 100, tr, `ระดับ +${y.toFixed(2)}: `).P

    // spacing of the braces along the form: every stud, or along a wale at each level
    let along = a
    if (viaWale) {
      const tw = new Trace()
      const wl: MemberInput = { ...waleMember, support: 'continuous', deflection: defl, checkShear: shearOn(inp.wale.materialId), shearReduction: true }
      const wMax = Math.max(...qLevel) / 100
      tw.add({ label: 'แรงแนวราบบนคานรับเคร่า (ระดับที่มากที่สุด)', expr: `${fmt(Math.max(...qLevel))} / 100`, value: wMax, unit: 'กก./ซม.' })
      const wLim = maxSpan(wl, wMax, tw)
      const byBrace = Math.min(...levels.map((y, i) => (capAt(y) * Math.cos(th)) / (qLevel[i] / 100)))
      tw.add({ label: 'ระยะค้ำยันสูงสุดจากกำลังค้ำยัน = P·cosθ / w', value: byBrace, unit: 'ซม.' })
      const maxAlong = Math.min(wLim.max, byBrace)
      along = inp.brace.alongCm ?? Math.max(floorTo(maxAlong, 5), 5)
      tw.add({ label: 'ระยะค้ำยันตามแนวคานรับเคร่าที่ใช้', value: along, unit: 'ซม.' })
      components.push(
        component('wale', 'คานรับเคร่า (รับค้ำยัน)', `${waleMember.section.label} (${waleMember.material.name}) ${levels.length} ระดับ รอบฐาน`, checkBeam(wl, wMax, along, tw).rows, tw, {
          label: 'ระยะค้ำยัน',
          value: along,
          max: maxAlong,
          governing: byBrace < wLim.max ? 'กำลังค้ำยัน' : governingLabel(wLim.governing),
          fixed: inp.brace.alongCm !== undefined,
        }),
      )
      layout.braceAlong = along
      layout.waleLevels = levels
      placeWales(levels)
    }

    // 3) braces, one per level (Ex 10.1 step 4)
    const tb = new Trace()
    const brRows: CheckRow[] = []
    let sumH = 0
    levels.forEach((y, i) => {
      const Fh = tb.add({ label: `ระดับ +${y.toFixed(2)}: แรงแนวราบ`, expr: `${fmt(qLevel[i])} × ${(along / 100).toFixed(2)}`, value: (qLevel[i] * along) / 100, unit: 'กก.' })
      sumH += Fh
      const F = tb.add({ label: `ระดับ +${y.toFixed(2)}: แรงตามแนวค้ำยัน`, expr: `${fmt(Fh)} / cos${inp.brace.angleDeg}°`, value: Fh / Math.cos(th), unit: 'กก.' })
      tb.add({ label: `ระดับ +${y.toFixed(2)}: ความยาวค้ำยัน`, expr: `${y.toFixed(2)} / sin${inp.brace.angleDeg}°`, value: (y / Math.sin(th)) * 100, unit: 'ซม.' })
      const cap = capAt(y, tb)
      brRows.push({ item: `ค้ำยันระดับ +${y.toFixed(2)} ม.`, demand: F, capacity: cap, ratio: F / cap, unit: 'กก.', ref: 'สมการ 5.15' })
    })
    const nBraceLines = viaWale ? studsOnFaces(plan.faces, along, plan.round) : nStuds
    components.push(component('brace', 'ค้ำยันทแยง (Braces)', `${bs.label} (${bm.name}) ${viaWale ? `@${along} ซม. ตามคานรับเคร่า` : 'ทุกเคร่า'} ${levels.length} ระดับ มุม ${inp.brace.angleDeg}°`, brRows, tb))
    braces = nBraceLines * levels.length

    // 4) stakes: bottom kicker stake at every stud, and the stake behind the brace feet (Ex 10.1 steps 5–6)
    const tk = new Trace()
    const Fk = tk.add({ label: 'แรงที่หลักตีนเคร่า', expr: `${fmt(p)} × ${(gaps[gaps.length - 1] / 2).toFixed(3)} × ${(a / 100).toFixed(2)}`, value: p * (gaps[gaps.length - 1] / 2) * (a / 100), unit: 'กก.', ref: 'ตัวอย่าง 10.1 ข้อ 6' })
    const needK = tk.add({ label: 'ความลึกหลักตีนเคร่า = F/(q·b)', expr: `${fmt(Fk)} / (${fmt(q)} × ${(stake.dMin / 100).toFixed(3)})`, value: Fk / (q * (stake.dMin / 100)), unit: 'ม.' })
    const needB = tk.add({ label: 'ความลึกหลักรับค้ำยัน (แผ่นไม้กว้าง ' + inp.stake.boardCm + ' ซม.)', expr: `${fmt(sumH)} / (${fmt(q)} × ${(inp.stake.boardCm / 100).toFixed(2)})`, value: sumH / (q * (inp.stake.boardCm / 100)), unit: 'ม.', ref: 'ตัวอย่าง 10.1 ข้อ 5' })
    components.push(
      component('stake', 'หลักยึด (Stakes) และแรงแบกทานดิน', `${stake.label} ฝังลึก ${inp.stake.embedM.toFixed(2)} ม. · ดินรับได้ ${fmt(q)} กก./ม.²`, [
        { item: 'หลักตีนเคร่า', demand: needK, capacity: inp.stake.embedM, ratio: needK / inp.stake.embedM, unit: 'ม.' },
        { item: 'หลักรับค้ำยัน', demand: needB, capacity: inp.stake.embedM, ratio: needB / inp.stake.embedM, unit: 'ม.' },
      ], tk),
    )
    stakes = nStuds + nBraceLines
    warnings.push('ค้ำยันและหลักลงดินใช้ได้กับดินแข็งเท่านั้น — ตรวจสภาพดินที่หน้างานให้รับแรงได้ตามที่ออกแบบ (หมายเหตุตัวอย่าง 10.1)')
  } else if (hz) {
    // 2–4) horizontal studs on vertical wales (strongbacks), as a wall of thickness d on each pair of faces: the
    // strongbacks cannot wrap the corners, so every one of them is tied through the footing — both ways
    const wall = (length: number) =>
      designWall({
        system: 'horizontal',
        thickness: d,
        height: H,
        length,
        pressure: inp.pressure,
        sheathing: { materialId: 'ply-apa1', thicknessMm: 15 },
        stud: { ...inp.stud, spacingCm: a },
        wale: inp.wale,
        tie: inp.tie,
        brace: DEFAULT_BRACE,
        bottomWaleOffsetM: inp.wale.bottomOffsetM,
        deflection: defl,
        checkTimberShear: inp.checkTimberShear,
      })
    const long = Math.max(inp.lengthX, inp.lengthY)
    const short = Math.min(inp.lengthX, inp.lengthY)
    const wL = wall(long)
    const wS = wall(short)
    for (const k of ['stud', 'stud-end', 'wale', 'wale-top']) {
      const c = wL.components.find((x) => x.key === k)!
      components.push(k === 'stud-end' ? { ...c, title: 'เคร่านอน — ช่วงยื่นที่มุมฐาน' } : c)
    }
    // ties through the long faces span the short side, through the short faces the long side; same force (P × c/c × gap)
    const tieComp = wL.components.find((c) => c.key === 'tie')!
    const T = tieComp.rows[0].demand
    const tTi = new Trace()
    const tie = getTie(inp.tie.tieId)
    tTi.add({ label: 'แรงดึงในไทร์ = P × พื้นที่รับแรง', value: T, unit: 'กก.', ref: 'รูป 8.4' })
    const plate = tiePlate(T, getSection(inp.wale.sectionId), waleMember.material, inp.wale.count, tTi)
    const nL = wL.layout.waleX.length
    const nS = wS.layout.waleX.length
    components.push(
      component('tie', 'เหล็กยึดรั้ง (Form tie) + เหล็กประกับ', `${tie.name} SWL ${fmt(tie.swl)} กก. · ${nL + nS} ตัว/ระดับ · เหล็กประกับ ${plate.wCm}×${plate.hCm} ซม. หนา ${plate.tMm} มม.`, [...tieComp.rows, ...plate.rows], tTi),
    )
    warnings.push(...wL.warnings.filter((x) => !x.startsWith('กำแพงสูง')))
    warnings.push(`Form tie ทะลุฐานยาว ${short.toFixed(2)} ม. (ผ่านด้านยาว) และ ${long.toFixed(2)} ม. (ผ่านด้านสั้น) — ฝังในคอนกรีต ใช้ซ้ำไม่ได้`)
    Object.assign(layout, {
      system: 'horizontal',
      waleSpacing: wL.layout.waleSpacing,
      tieSpacing: wL.layout.tieSpacing,
      tieLayout: 'both',
      tiesLong: nL,
      tiesShort: nS,
      studLevels: wL.layout.studLevels,
      tieLevels: wL.layout.tieLevels,
      waleXLong: wL.layout.waleX,
      waleXShort: wS.layout.waleX,
      tiePlate: { wCm: plate.wCm, hCm: plate.hCm, tMm: plate.tMm },
    } satisfies Partial<FootingLayout>)
    waleLength = 2 * (nL + nS) * inp.wale.count * H
    ties = wL.layout.tieLevels.length * (nL + nS)
  } else {
    // 2) studs → wale spacing, exactly as a wall form of thickness d (Ex 10.2, 10.3)
    const w = designWall({
      thickness: d,
      height: H,
      length: plan.perimeter,
      pressure: inp.pressure,
      sheathing: { materialId: 'ply-apa1', thicknessMm: 15 },
      stud: { ...inp.stud, spacingCm: a },
      wale: inp.wale,
      tie: inp.tie,
      brace: DEFAULT_BRACE,
      bottomWaleOffsetM: inp.wale.bottomOffsetM,
      deflection: defl,
      checkTimberShear: inp.checkTimberShear,
    })
    const studComp = w.components.find((c) => c.key === 'stud')!
    components.push(studComp)
    const s0 = w.layout.waleSpacing

    const waleSteps: number[] = []
    if (inp.wale.spacingCm !== undefined) waleSteps.push(s0)
    else for (let x = s0; x >= Math.min(25, s0); x -= 5) waleSteps.push(x)
    if (shape.kind === 'polygon') {
      // 3) a ring of wales along the faces, corner to corner: M = w·a²/8, T = w·F/2 — no ties
      const aCm = polygonDims(shape.n, inp.lengthX).a * 100
      const fCm = inp.lengthX * 100
      const ring = (sp: number, t?: Trace) => checkRingYokes(p, sp, aCm, fCm, shape.n, waleMember, t, defl, 'คานรับเคร่า')
      const s = waleSteps.find((x) => ring(x).ratio <= 1) ?? waleSteps[waleSteps.length - 1]
      const levels: number[] = []
      for (let z = inp.wale.bottomOffsetM; z < H - 0.05; z += s / 100) levels.push(Math.round(z * 1000) / 1000)
      layout.waleLevels = levels
      layout.waleSpacing = s
      if (s !== s0 && studComp.spacing) studComp.spacing = { ...studComp.spacing, value: s }
      const tWa = new Trace()
      if (s !== s0) tWa.add({ label: 'ลดระยะคานรับเคร่าจนคานรับเคร่าผ่าน (แบบคานรัดเสา §9.4)', expr: `${s0} → ${s}`, value: s, unit: 'ซม.' })
      const rr = ring(s, tWa)
      components.push(component('wale', 'คานรับเคร่ารอบฐาน (Wales)', `${waleMember.section.label} (${waleMember.material.name}) @${s} ซม. · วงแหวน${SHAPE_NAME[shape.n]} ไม่ใช้ไทร์`, rr.rows, tWa))
      warnings.push(`ยึดมุมคานรับเคร่าให้รับแรงดึงได้ไม่น้อยกว่า ${fmt((pressureToLineLoad(p, s / 100) * fCm) / 2)} กก. ต่อมุมต่อระดับ`)
      layout.tieLayout = 'none'
      placeWales(levels)
    } else if (isLegShape(shape)) {
      // 3) wales along the faces of an L/T/U, ties through every leg at the inner corners (as the L/T/U column):
      //    the fewest ties along the legs that pass, closing the wales up if they do not
      const lay = legLayout(shape)
      const tie = getTie(inp.tie.tieId)
      const forces = (sp: number, n: number) => legTieForces(lay, n, p, sp)
      const ok = (sp: number, n: number) => checkLegYokes(p, sp, lay, n, waleMember, undefined, defl, 'คานรับเคร่า').ratio <= 1 && Math.max(...forces(sp, n).map((f) => f.T)) <= tie.swl
      let s = s0
      let n = 1
      search: for (const x of waleSteps)
        for (const k of [1, 2, 3, 4])
          if (ok(x, k)) {
            s = x
            n = k
            break search
          }
      const levels: number[] = []
      for (let z = inp.wale.bottomOffsetM; z < H - 0.05; z += s / 100) levels.push(Math.round(z * 1000) / 1000)
      layout.waleLevels = levels
      layout.waleSpacing = s
      layout.legSpans = n
      if (s !== s0 && studComp.spacing) studComp.spacing = { ...studComp.spacing, value: s }
      const tWa = new Trace()
      if (s !== s0) tWa.add({ label: 'ลดระยะคานรับเคร่าจนคานรับเคร่าผ่าน (แบบคานรัดเสา §9.4)', expr: `${s0} → ${s}`, value: s, unit: 'ซม.' })
      const rl = checkLegYokes(p, s, lay, n, waleMember, tWa, defl, 'คานรับเคร่า')
      components.push(component('wale', 'คานรับเคร่ารอบฐาน (Wales)', `${waleMember.section.label} (${waleMember.material.name}) @${s} ซม. · ตามหน้า${n > 1 ? ` แบ่งขาละ ${n} ช่วง` : ''}`, rl.rows, tWa))
      // 4) the ties and their bearing plates
      const tTi = new Trace()
      const rows: CheckRow[] = forces(s, n).map((f) => {
        const what = f.kind === 'root' ? 'ไทร์มุมใน' : f.kind === 'leg' ? 'ไทร์กลางขา' : f.kind === 'core' ? 'ไทร์ผ่านมุม' : 'ไทร์ผ่านปลายขา'
        const T = tTi.add({ label: `แรงดึง${what} (${f.name})`, value: f.T, unit: 'กก.' })
        return { item: `${what} (${f.name})`, demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref }
      })
      const plate = tiePlate(Math.max(...rows.map((r) => r.demand)), getSection(inp.wale.sectionId), waleMember.material, inp.wale.count, tTi)
      rows.push(...plate.rows)
      layout.tiePlate = { wCm: plate.wCm, hCm: plate.hCm, tMm: plate.tMm }
      const perLevel = legTiesPerLevel(shape, n)
      components.push(component('tie', 'เหล็กยึดรั้ง (Form tie) + เหล็กประกับ', `${tie.name} SWL ${fmt(tie.swl)} กก. · ไทร์ ${perLevel} ตัว/ระดับ · เหล็กประกับ ${plate.wCm}×${plate.hCm} ซม. หนา ${plate.tMm} มม.`, rows, tTi))
      placeWales(levels)
      ties = levels.length * perLevel
    } else {
      // 3) wales round the footing (§9.4 yokes) — pick the tie layout, tie spacing and, like column
      //    yokes, close the wales up in 5 cm steps (down to 25 cm) until they pass
      const longCm = Math.max(inp.lengthX, inp.lengthY) * 100
      const shortCm = Math.min(inp.lengthX, inp.lengthY) * 100
      const tieMax = w.layout.tieSpacing // wale continuous over ties + tie capacity (wall method)
      const spacings = inp.tie.spacingCm !== undefined ? [inp.tie.spacingCm] : [...TIE_MODULES.filter((m) => m <= tieMax).reverse(), ...(TIE_MODULES.some((m) => m <= tieMax) ? [] : [tieMax])]
      const best = (lay: Ring['layout'], closeUp = true): Ring & { s: number } => {
        for (const s of closeUp ? waleSteps : [s0])
          for (const sp of lay === 'none' ? [undefined] : spacings) {
            const r = checkRing(p, s, longCm, shortCm, lay, sp, waleMember, defl)
            if (r.ratio <= 1) return { ...r, s }
          }
        return { ...checkRing(p, s0, longCm, shortCm, lay, lay === 'none' ? undefined : spacings[0], waleMember, defl), s: s0 }
      }
      const want = inp.tie.layout ?? 'auto'
      let pick: Ring & { s: number }
      if (want === 'auto') {
        // no ties (closing the wales up if needed), then ties at the stud-governed wale spacing, then both
        const tries = [best('none'), best('short', false), best('both', false), best('short'), best('both')]
        pick = tries.find((r) => r.ratio <= 1) ?? tries.reduce((x, y) => (y.ratio < x.ratio ? y : x))
      } else pick = best(want)
      const s = pick.s
      const levels: number[] = []
      for (let z = inp.wale.bottomOffsetM; z < H - 0.05; z += s / 100) levels.push(Math.round(z * 1000) / 1000)
      layout.waleLevels = levels
      layout.waleSpacing = s
      if (s !== s0 && studComp.spacing) studComp.spacing = { ...studComp.spacing, value: s }

      const tWa = new Trace()
      if (s !== s0) tWa.add({ label: 'ลดระยะคานรับเคร่าจนคานรับเคร่าผ่าน (แบบคานรัดเสา §9.4)', expr: `${s0} → ${s}`, value: s, unit: 'ซม.' })
      tWa.add({ label: `การวางไทร์: ${FOOTING_TIE_LAYOUT_LABEL[pick.layout]}` })
      const rc = checkRing(p, s, longCm, shortCm, pick.layout, pick.tieSp, waleMember, defl, tWa)
      tWa.add({ label: 'แรงดึงที่รอยต่อมุมคานรับเคร่า', value: rc.corner, unit: 'กก.', ref: 'รูป 8.11' })
      components.push(
        component(
          'wale',
          'คานรับเคร่ารอบฐาน (Wales)',
          `${waleMember.section.label} (${waleMember.material.name}) @${s} ซม. · ${FOOTING_TIE_LAYOUT_LABEL[pick.layout]}`,
          rc.rows,
          tWa,
          pick.layout === 'none'
            ? undefined
            : { label: 'ระยะไทร์', value: pick.tieSp!, max: tieMax, governing: 'ดัด + ดึง และกำลังไทร์', fixed: inp.tie.spacingCm !== undefined },
        ),
      )
      warnings.push(`ยึดมุมคานรับเคร่าให้รับแรงดึงได้ไม่น้อยกว่า ${fmt(rc.corner)} กก. ต่อมุมต่อระดับ (รูป 8.11)`)

      // 4) form ties through the long faces (and the short faces when both ways)
      if (pick.layout !== 'none') {
        const tie = getTie(inp.tie.tieId)
        const tTi = new Trace()
        const rows: CheckRow[] = []
        const TL = tTi.add({ label: 'ไทร์ผ่านด้านยาว: T = P × ระยะคานรับเคร่า × ระยะไทร์', expr: `${fmt(p)} × ${(s / 100).toFixed(2)} × ${(rc.segL / 100).toFixed(2)}`, value: (p * s * rc.segL) / 1e4, unit: 'กก.', ref: 'รูป 8.4' })
        rows.push({ item: 'แรงดึง (ไทร์ผ่านด้านยาว)', demand: TL, capacity: tie.swl, ratio: TL / tie.swl, unit: 'กก.', ref: tie.ref })
        let T = TL
        if (pick.layout === 'both') {
          const TS = tTi.add({ label: 'ไทร์ผ่านด้านสั้น', expr: `${fmt(p)} × ${(s / 100).toFixed(2)} × ${(rc.segS / 100).toFixed(2)}`, value: (p * s * rc.segS) / 1e4, unit: 'กก.' })
          rows.push({ item: 'แรงดึง (ไทร์ผ่านด้านสั้น)', demand: TS, capacity: tie.swl, ratio: TS / tie.swl, unit: 'กก.', ref: tie.ref })
          T = Math.max(T, TS)
        }
        // steel bearing plate at each tie end, across the wale set
        const plate = tiePlate(T, getSection(inp.wale.sectionId), waleMember.material, inp.wale.count, tTi)
        rows.push(...plate.rows)
        layout.tiePlate = { wCm: plate.wCm, hCm: plate.hCm, tMm: plate.tMm }
        components.push(component('tie', 'เหล็กยึดรั้ง (Form tie) + เหล็กประกับ', `${tie.name} SWL ${fmt(tie.swl)} กก. · ${rc.nL + rc.nS} ตัว/ระดับ · เหล็กประกับ ${plate.wCm}×${plate.hCm} ซม. หนา ${plate.tMm} มม.`, rows, tTi))
      }
      layout.tieLayout = pick.layout
      layout.tieSpacing = pick.tieSp
      layout.tiesLong = rc.nL
      layout.tiesShort = rc.nS
      placeWales(levels)
      ties = levels.length * (rc.nL + rc.nS)
    }
  }

  const design: FootingDesign = {
    ...summarize(pres, components, warnings),
    layout,
    quantities: {
      plywoodArea: plan.perimeter * H,
      // horizontal studs: one row round the four faces at every stud level
      studs: hz ? 4 * layout.studLevels!.length : nStuds,
      studLength: hz ? layout.studLevels!.length * (plan.perimeter + 4 * (deckThicknessM(inp.sheathing) + stSec.H / 100)) : nStuds * (H + (inp.support === 'cantilever' ? inp.stake.embedM : 0.1)),
      braces,
      stakes,
      waleLength,
      ties,
    },
  }
  if (opts.advise) design.advice = footingAdvice(inp, design)
  return design
}

// ---------------------------------------------------------------- arrangement advice

interface Variant {
  key: string
  label: string
  /** stakes in the soil */
  soil: boolean
  patch: (i: FootingInput) => FootingInput
}

const VARIANTS: Variant[] = [
  { key: 'tied-none', label: 'คานรับเคร่ารัดรอบฐาน ไม่ใช้ไทร์', soil: false, patch: (i) => ({ ...i, support: 'tied', system: undefined, tie: { ...i.tie, layout: 'none' } }) },
  { key: 'cantilever', label: 'เคร่าปลายยื่นตอกลงดิน', soil: true, patch: (i) => ({ ...i, support: 'cantilever' }) },
  { key: 'braced-wale', label: 'ค้ำยันผ่านคานรับเคร่าลงหลัก', soil: true, patch: (i) => ({ ...i, support: 'braced', brace: { ...i.brace, at: 'wale' } }) },
  { key: 'braced-stud', label: 'ค้ำยันทุกเคร่าลงหลัก', soil: true, patch: (i) => ({ ...i, support: 'braced', brace: { ...i.brace, at: 'stud' } }) },
  { key: 'tied-short', label: 'คานรับเคร่ารอบฐาน + ไทร์ขวางด้านสั้น', soil: false, patch: (i) => ({ ...i, support: 'tied', system: undefined, tie: { ...i.tie, layout: 'short' } }) },
  { key: 'tied-both', label: 'คานรับเคร่ารอบฐาน + ไทร์สองทิศทาง', soil: false, patch: (i) => ({ ...i, support: 'tied', system: undefined, tie: { ...i.tie, layout: 'both' } }) },
  { key: 'tied-horizontal', label: 'เคร่านอน + คานตั้ง + ไทร์สองทิศทาง', soil: false, patch: (i) => ({ ...i, support: 'tied', system: 'horizontal' }) },
]

export const footingVariant = (key: string) => VARIANTS.find((v) => v.key === key)

/** Key of the arrangement a design actually uses. */
export function footingVariantKey(inp: FootingInput, d: FootingDesign): string {
  if (inp.support === 'tied') return footingShapeOf(inp).kind === 'rect' ? (inp.system === 'horizontal' ? 'tied-horizontal' : `tied-${d.layout.tieLayout ?? 'short'}`) : 'tied-none'
  if (inp.support === 'braced') return `braced-${inp.brace.at ?? 'stud'}`
  return 'cantilever'
}

/**
 * Check every arrangement with the same members and recommend the simplest one that passes:
 * no ties and no stakes first, then stakes (firm soil only), then ties one way, then both ways.
 */
export function footingAdvice(inp: FootingInput, current: FootingDesign): DesignAdvice {
  const soft = inp.soilBearing < SOFT_SOIL
  const cur = footingVariantKey(inp, current)
  // other shapes: one tied arrangement (a polygon's ring, an L/T/U's inner-corner ties); none for a round footing
  const shape = footingShapeOf(inp)
  const variants = VARIANTS.filter((v) => shape.kind === 'rect' || (shape.kind === 'circle' ? v.key === 'cantilever' || v.key === 'braced-stud' : v.key !== 'tied-short' && v.key !== 'tied-both' && v.key !== 'tied-horizontal')).map((v) =>
    v.key === 'tied-none' && shape.kind !== 'rect' ? { ...v, label: shape.kind === 'polygon' ? 'คานรับเคร่ารัดรอบ (วงแหวนตามรูป)' : 'คานรับเคร่าตามหน้า + ไทร์มุมใน' } : v,
  )
  const runs = variants.map((v) => ({ v, d: v.key === cur ? current : designFooting(v.patch(inp)) }))
  const usable = (r: (typeof runs)[number]) => r.d.maxRatio <= 1 && !(r.v.soil && soft) && !(r.v.key === 'cantilever' && inp.height > 0.6)
  const rec = runs.find(usable)
  const options: AdviceOption[] = runs.map(({ v, d }) => {
    const q = d.quantities
    const parts = [
      q.ties ? `ไทร์ ${q.ties} ตัว` : '',
      q.braces ? `ค้ำยัน ${q.braces} ตัว` : '',
      q.stakes ? `หลัก ${q.stakes} ต้น` : '',
      q.waleLength ? `คานรับเคร่า ${q.waleLength.toFixed(0)} ม.` : '',
      v.soil && soft ? 'ดินอ่อน — ไม่แนะนำหลักในดิน' : '',
      v.key === 'cantilever' && inp.height > 0.6 ? 'ฐานลึกเกิน 0.60 ม.' : '',
    ].filter(Boolean)
    return { key: v.key, label: v.label, ratio: d.maxRatio, status: statusOf(d.maxRatio), note: parts.join(' · ') || '—', current: v.key === cur, recommended: v.key === rec?.v.key }
  })

  const by = (k: string) => runs.find((r) => r.v.key === k)!.d
  const summary: string[] = []
  if (shape.kind !== 'rect') {
    if (shape.kind !== 'circle') summary.push(`${variants.find((v) => v.key === 'tied-none')!.label}: ratio ${by('tied-none').maxRatio.toFixed(2)}`)
  } else if (by('tied-none').maxRatio <= 1) summary.push(`ไม่จำเป็นต้องใช้ Form tie — คานรับเคร่ารัดรอบฐานรับแรงดันได้เอง (ratio ${by('tied-none').maxRatio.toFixed(2)})`)
  else if (by('tied-short').maxRatio <= 1) summary.push(`ถ้าใช้คานรับเคร่ารอบฐาน ต้องใช้ Form tie ขวางด้านสั้น ${by('tied-short').quantities.ties} ตัว (คานรัดรอบอย่างเดียว ratio ${by('tied-none').maxRatio.toFixed(2)} ไม่ผ่าน)`)
  else if (by('tied-both').maxRatio <= 1) summary.push(`ถ้าใช้คานรับเคร่ารอบฐาน ต้องใช้ Form tie ทั้งสองทิศทาง ${by('tied-both').quantities.ties} ตัว`)
  else summary.push('คานรับเคร่ารอบฐานยังไม่ผ่านแม้ใช้ไทร์สองทิศทาง — เพิ่มขนาดคานรับเคร่า/ใช้คานคู่ หรือใช้ไทร์ที่รับแรงได้มากขึ้น')
  if (soft) summary.push(`ดินรับแรงได้ ${fmt(inp.soilBearing)} กก./ม.² (< ${fmt(SOFT_SOIL)}) ถือเป็นดินอ่อน — ไม่ควรพึ่งหลักในดิน ใช้คานรับเคร่ารอบฐาน`)
  if (rec) summary.push(`แนะนำ: ${rec.v.label}${rec.v.key === cur ? ' (ตรงกับที่เลือกอยู่)' : ''}`)
  else summary.push('ยังไม่มีรูปแบบใดผ่านด้วยขนาดไม้ที่เลือก — ลองเพิ่มขนาดเคร่า/คานรับเคร่า หรือใช้ Optimizer')
  return { title: 'เปรียบเทียบรูปแบบการยึดแบบฐานราก', summary, options }
}
