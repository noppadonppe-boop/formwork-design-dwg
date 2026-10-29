// Wall formwork design — book Chapter 8 (§8.4, Examples 8.1–8.3).
// Load path: sheathing → studs (vertical) → wales (horizontal, usually double) → form ties.
// Option system 'horizontal': sheathing → studs (horizontal, along the wall) → wales (vertical strongbacks) → form ties
// at the wales; the same member checks with the axes swapped, the strongbacks cantilevering above the top tie.
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
  sillNails,
  STUD_MODULES,
  summarize,
  TIE_MODULES,
} from './design'
import { getMaterial, getTie } from './materials'
import { type CheckRow, checkBeam, type DeflectionCriteria, maxSpan, type MemberInput, shearCapacity } from './member'
import { lateralPressure, pressureAt, type PressureResult } from './pressure'
import { getSection, multiple, plywoodStrip } from './sections'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'

/** 'vertical' = vertical studs on horizontal wales (book); 'horizontal' = horizontal studs on vertical wales (strongbacks) */
export type WallSystem = 'vertical' | 'horizontal'

export interface WallInput {
  /** stud / wale arrangement (absent = 'vertical') */
  system?: WallSystem
  /** wall thickness, m */
  thickness: number
  /** pour height, m */
  height: number
  /** wall length, m (quantities only) */
  length: number
  pressure: PressureParams
  sheathing: { materialId: string; thicknessMm: number }
  stud: { sectionId: string; materialId: string; spacingCm?: number }
  wale: {
    sectionId: string
    materialId: string
    count: 1 | 2
    /** c/c spacing, cm (auto when omitted) */
    spacingCm?: number
    /** book convention: c/c = net stud span + thickness of double wale (≈10 cm) */
    addCm?: number
  }
  tie: { tieId: string; spacingCm?: number }
  brace: BraceParams
  /** height of the lowest wale above the base, m (horizontal studs: of the lowest tie) */
  bottomWaleOffsetM: number
  /** distance from the top of the form down to the top wale, m (auto: the longest stud cantilever that passes;
   *  horizontal studs: down to the top tie, the longest wale cantilever) */
  topWaleOffsetM?: number
  /** horizontal studs: distance from each end of the wall to the end wale, m (auto: the longest stud cantilever ≤ 15 cm) */
  endWaleOffsetM?: number
  deflection?: DeflectionCriteria
  /** check shear on timber studs/wales (eq 5.13, l − 2d). Book's direct examples skip it; its tables include it. Default true. */
  checkTimberShear?: boolean
}

export interface WallLayout {
  system: WallSystem
  studSpacing: number // cm (horizontal studs: up the wall)
  waleSpacing: number // cm c/c (horizontal studs: along the wall)
  tieSpacing: number // cm (horizontal studs: up the wall)
  waleLevels: number[] // horizontal wales, m above base ([] with horizontal studs)
  studX: number[] // vertical studs, m along wall ([] with horizontal studs)
  studLevels: number[] // horizontal studs, m above base ([] with vertical studs)
  waleX: number[] // vertical wales, m along wall ([] with vertical studs)
  tieX: number[] // m along wall
  tieLevels: number[] // m above base
}

export interface WallQuantities {
  plywoodArea: number
  plywoodSheets: number
  studs: number
  studLength: number
  waleLength: number
  ties: number
  braces: number
}

export interface WallDesign extends DesignResult {
  layout: WallLayout
  quantities: WallQuantities
}

export const DEFAULT_WALL: WallInput = {
  thickness: 0.25,
  height: 2.5,
  length: 6.0,
  pressure: { method: 'CEB', R: 2, T: 30, slump: 10 },
  sheathing: { materialId: 'ply-apa1', thicknessMm: 15 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', spacingCm: 15 },
  wale: { sectionId: 'timber-2x4', materialId: 'timber-yang', count: 2, addCm: 10 },
  tie: { tieId: 'tie-3/8' },
  brace: { ...DEFAULT_BRACE },
  bottomWaleOffsetM: 0.1,
}

/** line load (kg/cm) at z cm from the free tip of a cantilever */
type TipLoad = (z: number) => number

/** load from the pressure growing down from the free surface at the form top (γz ≤ Pmax), tributary width a cm */
const fromTop =
  (pres: PressureResult, a: number): TipLoad =>
  (z) =>
    pressureToLineLoad(pressureAt(pres, z / 100), a / 100)

/**
 * Cantilever of c cm (stud above the top wale; with horizontal studs the wale above the top tie, or a stud beyond the
 * end wale). The load is integrated in slices: V = ΣF, M = ΣF·x, tip Δ = ΣF·x²(3c − x)/6EI.
 */
function cantilever(stud: MemberInput, load: TipLoad, c: number, defl?: DeflectionCriteria) {
  const n = 100
  const dz = c / n
  const EI = stud.material.E * stud.section.Ix
  let V = 0
  let M = 0
  let delta = 0
  for (let i = 0; i < n; i++) {
    const z = (i + 0.5) * dz // distance from the tip, cm
    const F = load(z) * dz
    const x = c - z // lever arm to the support, cm
    V += F
    M += F * x
    delta += (F * x * x * (3 * c - x)) / (6 * EI)
  }
  const { section: s, material: m } = stud
  const rows: CheckRow[] = [{ item: 'หน่วยแรงดัด fb', demand: M / s.Sx, capacity: m.Fb, ratio: M / s.Sx / m.Fb, unit: 'กก./ซม.²', ref: 'สมการ 5.2' }]
  const Vcap = stud.checkShear ? shearCapacity(s, m) : undefined
  if (Vcap !== undefined) {
    const fv = s.Aweb !== undefined ? V / s.Aweb : (3 * V) / (2 * s.B * s.H)
    rows.push({ item: 'หน่วยแรงเฉือน fv', demand: fv, capacity: m.Fv!, ratio: V / Vcap, unit: 'กก./ซม.²', ref: 'สมการ 5.11' })
  }
  let deltaAllow = c / (defl?.ratio ?? 360)
  if (defl?.absCm !== undefined) deltaAllow = Math.min(deltaAllow, defl.absCm)
  rows.push({ item: 'การแอ่นตัว Δ', demand: delta, capacity: deltaAllow, ratio: delta / deltaAllow, unit: 'ซม.' })
  return { V, M, delta, deltaAllow, rows, maxRatio: Math.max(...rows.map((r) => r.ratio)) }
}

const CANTILEVER_GOV: Record<string, string> = { 'หน่วยแรงดัด fb': 'bending', 'หน่วยแรงเฉือน fv': 'shear', 'การแอ่นตัว Δ': 'deflection' }

/** Longest cantilever (cm) that passes; the ratio grows with c, so bisect. */
function maxCantilever(stud: MemberInput, load: TipLoad, defl?: DeflectionCriteria): number {
  let lo = 0
  let hi = 500
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (cantilever(stud, load, mid, defl).maxRatio <= 1) lo = mid
    else hi = mid
  }
  return lo
}

function positions(length: number, spacing: number): number[] {
  const n = Math.ceil(length / spacing - 1e-9)
  return Array.from({ length: n + 1 }, (_, i) => Math.min(i * spacing, length))
}

/**
 * Levels from `bottom` up at `stepCm` (m above base); when that leaves more than `topOff` above the last one, spread
 * them evenly from the bottom to `H − topOff` instead (spacing ≤ step).
 */
function spreadLevels(bottom: number, H: number, stepCm: number, topOff: number, t: Trace, respaced: string): number[] {
  const topZ = Math.max(H - topOff, bottom)
  let levels: number[] = []
  for (let z = bottom; z < H - 0.05; z += stepCm / 100) levels.push(Math.round(z * 1000) / 1000)
  if (!levels.length) levels = [bottom]
  if (H - levels[levels.length - 1] > topOff + 1e-6) {
    const spans = Math.max(Math.ceil((topZ - bottom) / (stepCm / 100) - 1e-9), 1)
    const s = (topZ - bottom) / spans
    levels = Array.from({ length: spans + 1 }, (_, i) => Math.round((bottom + i * s) * 1000) / 1000)
    t.add({ label: respaced, expr: `(${topZ.toFixed(2)} − ${bottom.toFixed(2)}) / ${spans}`, value: s * 100, unit: 'ซม.' })
  }
  return levels
}

const governingOf = (member: MemberInput, load: TipLoad, c: number, defl?: DeflectionCriteria) =>
  governingLabel(CANTILEVER_GOV[cantilever(member, load, c, defl).rows.reduce((x, y) => (y.ratio > x.ratio ? y : x)).item])

/** Top cantilever of `member` above its top support at `levels`' last (studs above the top wale / wales above the top tie). */
function topCantilever(
  key: string,
  title: string,
  spec: (c: number) => string,
  member: MemberInput,
  load: TipLoad,
  H: number,
  levels: number[],
  t: Trace,
  defl: DeflectionCriteria | undefined,
  cMax: number,
  fixed: boolean,
  names: { moment: string; shear: string; tip: string; over: string },
): ComponentResult {
  const cUsed = (H - levels[levels.length - 1]) * 100
  t.add({ label: 'ช่วงยื่นที่ใช้', expr: `${H.toFixed(2)} − ${levels[levels.length - 1].toFixed(2)}`, value: cUsed, unit: 'ซม.' })
  const top = cantilever(member, load, cUsed, defl)
  t.add({ label: `${names.moment} M = ΣF·x`, value: top.M, unit: 'กก.-ซม.' })
  t.add({ label: 'fb = M/S', expr: `${fmt(top.M)} / ${member.section.Sx.toFixed(2)} ≤ ${member.material.Fb}`, value: top.M / member.section.Sx, unit: 'กก./ซม.²', status: top.rows[0].ratio <= 1 ? 'ok' : 'fail' })
  if (top.rows.length === 3) t.add({ label: `${names.shear} V = ΣF`, value: top.V, unit: 'กก.' })
  t.add({ label: `${names.tip} Δ = ΣF·x²(3c − x)/6EI`, expr: `≤ ${top.deltaAllow.toFixed(3)} ซม.`, value: top.delta, unit: 'ซม.', status: top.delta <= top.deltaAllow ? 'ok' : 'fail' })
  return component(key, title, spec(cUsed), top.rows, t, {
    label: names.over,
    value: Math.round(cUsed),
    max: cMax,
    governing: governingOf(member, load, cMax, defl),
    fixed,
  })
}

export function designWall(inp: WallInput): WallDesign {
  const pres = lateralPressure({ ...inp.pressure, element: 'wall', H: inp.height, d: inp.thickness })
  const p = pres.Pmax
  const defl = inp.deflection
  const components: ComponentResult[] = []
  const horizontal = inp.system === 'horizontal'

  // 1) sheathing → stud spacing (1 m strip, continuous ≥ 3 spans)
  const tSh = new Trace()
  const ply = { section: plywoodStrip(inp.sheathing.thicknessMm), material: getMaterial(inp.sheathing.materialId), support: 'continuous' as const, deflection: defl }
  const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', expr: `${fmt(p)} × 1.00 / 100`, value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
  const shLim = maxSpan(ply, wSh, tSh)
  const a = inp.stud.spacingCm ?? pickModule(shLim.max, STUD_MODULES)
  tSh.add({ label: 'ระยะเคร่าที่ใช้', value: a, unit: 'ซม.' })
  const shChk = checkBeam(ply, wSh, a, tSh)
  components.push(
    component('sheathing', 'แผ่นผิวแบบ', `${ply.section.label} (${ply.material.name})`, shChk.rows, tSh, {
      label: 'ระยะเคร่า',
      value: a,
      max: shLim.max,
      governing: governingLabel(shLim.governing),
      fixed: inp.stud.spacingCm !== undefined,
    }),
  )

  // 2) studs → wale spacing (horizontal studs: span along the wall between the vertical wales)
  const tSt = new Trace()
  const shearOn = (materialId: string) => getMaterial(materialId).kind === 'steel' || (inp.checkTimberShear ?? true)
  const stud = {
    section: getSection(inp.stud.sectionId),
    material: getMaterial(inp.stud.materialId),
    support: 'continuous' as const,
    deflection: defl,
    checkShear: shearOn(inp.stud.materialId),
    shearReduction: true,
  }
  const wSt = tSt.add({ label: 'น้ำหนักแผ่บนเคร่า', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, a / 100), unit: 'กก./ซม.' })
  const stLim = maxSpan(stud, wSt, tSt)
  const add = inp.wale.addCm ?? (inp.wale.count === 2 ? 10 : 0)
  const waleCC = inp.wale.spacingCm ?? floorTo(stLim.max, 5) + add
  const studSpan = waleCC - add
  tSt.add({ label: horizontal ? 'ระยะคานตั้ง (c/c)' : 'ระยะคานรับเคร่า (c/c)', expr: add ? `ช่วงสุทธิ ${studSpan} + ความหนาคานคู่ ${add}` : undefined, value: waleCC, unit: 'ซม.' })
  const stChk = checkBeam(stud, wSt, studSpan, tSt)
  components.push(
    component('stud', horizontal ? 'เคร่านอน (Studs)' : 'เคร่าตั้ง (Studs)', `${stud.section.label} @${a} ซม. (${stud.material.name})`, stChk.rows, tSt, {
      label: horizontal ? 'ระยะคานตั้ง' : 'ระยะคานรับเคร่า',
      value: waleCC,
      max: stLim.max + add,
      governing: governingLabel(stLim.governing),
      fixed: inp.wale.spacingCm !== undefined,
    }),
  )

  const wale = {
    section: multiple(getSection(inp.wale.sectionId), inp.wale.count),
    material: getMaterial(inp.wale.materialId),
    support: 'continuous' as const,
    deflection: defl,
    checkShear: shearOn(inp.wale.materialId),
    shearReduction: true,
  }
  const warnings: string[] = []
  let waleLevels: number[] = []
  let studX: number[] = []
  let studLevels: number[] = []
  let waleX: number[] = []

  if (!horizontal) {
    // 2b) stud cantilever above the top wale → top wale level
    const tTop = new Trace()
    const load = fromTop(pres, a)
    const cMax = maxCantilever(stud, load, defl)
    tTop.add({ label: 'แรงดันเพิ่มจากผิวคอนกรีต (γz ≤ Pmax)', expr: `น้ำหนักแผ่บนเคร่า = γz × ${(a / 100).toFixed(2)} / 100`, unit: 'กก./ซม.' })
    tTop.add({ label: 'ช่วงยื่นสูงสุดที่ผ่าน (แรงดัด แรงเฉือน การแอ่นตัว)', value: cMax, unit: 'ซม.' })
    const topOff = inp.topWaleOffsetM ?? Math.max(floorTo(cMax, 5), 5) / 100
    waleLevels = spreadLevels(inp.bottomWaleOffsetM, inp.height, waleCC, topOff, tTop, 'จัดระยะคานรับเคร่าใหม่ให้เท่ากัน')
    components.push(
      topCantilever('stud-top', 'เคร่าตั้ง — ช่วงยื่นด้านบน', (c) => `${stud.section.label} @${a} ซม. ยื่นเหนือคานบนสุด ${fmt(c)} ซม.`, stud, load, inp.height, waleLevels, tTop, defl, cMax, inp.topWaleOffsetM !== undefined, {
        moment: 'โมเมนต์ที่คานบนสุด',
        shear: 'แรงเฉือนที่คานบนสุด',
        tip: 'การแอ่นตัวปลายเคร่า',
        over: 'ช่วงยื่นเหนือคานบนสุด',
      }),
    )
  } else {
    // 2b) studs beyond the end wales (uniform load) → end wale offset; wales spread evenly between (≤ c/c)
    const tEnd = new Trace()
    const load: TipLoad = () => wSt
    const eMax = maxCantilever(stud, load, defl)
    tEnd.add({ label: 'น้ำหนักแผ่บนเคร่า', value: wSt, unit: 'กก./ซม.' })
    tEnd.add({ label: 'ช่วงยื่นสูงสุดที่ผ่าน (แรงดัด แรงเฉือน การแอ่นตัว)', value: eMax, unit: 'ซม.' })
    const e = Math.min(inp.endWaleOffsetM ?? Math.min(Math.max(floorTo(eMax, 5), 5), 15) / 100, inp.length / 2)
    const run = inp.length - 2 * e
    const spans = run > 1e-6 ? Math.max(Math.ceil(run / (waleCC / 100) - 1e-9), 1) : 0
    waleX = spans ? Array.from({ length: spans + 1 }, (_, i) => Math.round((e + (i * run) / spans) * 1000) / 1000) : [Math.round((inp.length / 2) * 1000) / 1000]
    if (spans) tEnd.add({ label: 'จัดระยะคานตั้งให้เท่ากัน', expr: `(${inp.length.toFixed(2)} − 2 × ${e.toFixed(2)}) / ${spans}`, value: (run / spans) * 100, unit: 'ซม.' })
    const end = cantilever(stud, load, e * 100, defl)
    tEnd.add({ label: 'ช่วงยื่นที่ใช้', value: e * 100, unit: 'ซม.' })
    tEnd.add({ label: 'โมเมนต์ที่คานตั้งริม M = wc²/2', value: end.M, unit: 'กก.-ซม.' })
    tEnd.add({ label: 'การแอ่นตัวปลายเคร่า Δ = wc⁴/8EI', expr: `≤ ${end.deltaAllow.toFixed(3)} ซม.`, value: end.delta, unit: 'ซม.', status: end.delta <= end.deltaAllow ? 'ok' : 'fail' })
    components.push(
      component('stud-end', 'เคร่านอน — ช่วงยื่นที่ปลายกำแพง', `${stud.section.label} @${a} ซม. ยื่นเลยคานตั้งริม ${fmt(e * 100)} ซม.`, end.rows, tEnd, {
        label: 'ช่วงยื่นเลยคานตั้งริม',
        value: Math.round(e * 100),
        max: eMax,
        governing: governingOf(stud, load, eMax, defl),
        fixed: inp.endWaleOffsetM !== undefined,
      }),
    )
    if (inp.length > 4 && stud.material.kind !== 'steel') warnings.push('เคร่านอนยาวเกินท่อนไม้ — ต่อทาบบนคานตั้ง และสลับแนวรอยต่อแต่ละแถว')
  }

  // 3) wales → tie spacing (continuous over ties; horizontal studs: up the wall)
  const tWa = new Trace()
  const tie = getTie(inp.tie.tieId)
  const wWa = tWa.add({ label: horizontal ? 'น้ำหนักแผ่บนคานตั้ง' : 'น้ำหนักแผ่บนคานรับเคร่า', expr: `${fmt(p)} × ${(waleCC / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, waleCC / 100), unit: 'กก./ซม.' })
  const waLim = maxSpan(wale, wWa, tWa)
  const tieByCapacity = (tie.swl / (p * (waleCC / 100))) * 100
  tWa.add({ label: 'ระยะไทร์สูงสุดจากกำลังไทร์', expr: `${fmt(tie.swl)} / (${fmt(p)} × ${(waleCC / 100).toFixed(2)})`, value: tieByCapacity, unit: 'ซม.', ref: 'ตาราง 4.6' })
  const tieMax = Math.min(waLim.max, tieByCapacity)
  const tieSp = inp.tie.spacingCm ?? pickModule(tieMax, TIE_MODULES)
  tWa.add({ label: 'ระยะไทร์ที่ใช้', value: tieSp, unit: 'ซม.' })
  const waChk = checkBeam(wale, wWa, tieSp, tWa)
  components.push(
    component('wale', horizontal ? 'คานตั้ง (Strongbacks)' : 'คานรับเคร่า (Wales)', `${wale.section.label}${horizontal ? ` @${waleCC} ซม.` : ''} (${wale.material.name})`, waChk.rows, tWa, {
      label: horizontal ? 'ระยะไทร์ตามแนวดิ่ง' : 'ระยะไทร์',
      value: tieSp,
      max: tieMax,
      governing: tieByCapacity < waLim.max ? 'กำลังไทร์' : governingLabel(waLim.governing),
      fixed: inp.tie.spacingCm !== undefined,
    }),
  )

  let tieLevels = waleLevels
  if (horizontal) {
    // 3b) wale cantilever above the top tie → top tie level
    const tTop = new Trace()
    const load = fromTop(pres, waleCC)
    const cMax = maxCantilever(wale, load, defl)
    tTop.add({ label: 'แรงดันเพิ่มจากผิวคอนกรีต (γz ≤ Pmax)', expr: `น้ำหนักแผ่บนคานตั้ง = γz × ${(waleCC / 100).toFixed(2)} / 100`, unit: 'กก./ซม.' })
    tTop.add({ label: 'ช่วงยื่นสูงสุดที่ผ่าน (แรงดัด แรงเฉือน การแอ่นตัว)', value: cMax, unit: 'ซม.' })
    const topOff = inp.topWaleOffsetM ?? Math.max(floorTo(cMax, 5), 5) / 100
    tieLevels = spreadLevels(inp.bottomWaleOffsetM, inp.height, tieSp, topOff, tTop, 'จัดระยะไทร์ใหม่ให้เท่ากัน')
    components.push(
      topCantilever('wale-top', 'คานตั้ง — ช่วงยื่นด้านบน', (c) => `${wale.section.label} ยื่นเหนือไทร์บนสุด ${fmt(c)} ซม.`, wale, load, inp.height, tieLevels, tTop, defl, cMax, inp.topWaleOffsetM !== undefined, {
        moment: 'โมเมนต์ที่ไทร์บนสุด',
        shear: 'แรงเฉือนที่ไทร์บนสุด',
        tip: 'การแอ่นตัวปลายคานตั้ง',
        over: 'ช่วงยื่นเหนือไทร์บนสุด',
      }),
    )
    studLevels = positions(inp.height, a / 100)
  } else studX = positions(inp.length, a / 100)
  const tieX = horizontal ? waleX : positions(inp.length, tieSp / 100).filter((x) => x > 0 && x < inp.length)

  // 4) form ties (horizontal studs: tributary width = wale c/c, height = the widest gap between the tie levels)
  const tTi = new Trace()
  const tieH = horizontal ? Math.max(tieSp / 100, ...tieLevels.slice(1).map((z, i) => z - tieLevels[i])) : tieSp / 100
  const T = tTi.add({
    label: 'แรงดึงในไทร์ = P × พื้นที่รับแรง',
    expr: `${fmt(p)} × ${(waleCC / 100).toFixed(2)} × ${tieH.toFixed(2)}`,
    value: p * (waleCC / 100) * tieH,
    unit: 'กก.',
    ref: 'รูป 8.4',
  })
  components.push(component('tie', 'เหล็กยึดรั้ง (Form tie)', `${tie.name} SWL ${fmt(tie.swl)} กก.`, [{ item: 'แรงดึง', demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref }], tTi))

  // 5) sill (horizontal studs: the bottom stud row carries the strip below it)
  components.push(sillNails(p, horizontal ? a / 100 : inp.bottomWaleOffsetM))

  // 6) braces (per metre of wall)
  const gamma = pres.gamma
  components.push(
    designBrace({
      brace: inp.brace,
      H: inp.height,
      widthM: 1,
      dh: inp.thickness,
      weightPerWidth: gamma * inp.thickness * inp.height,
      ecc: 0.1 * inp.thickness,
      gamma,
      tributary: inp.brace.spacingM,
    }),
  )

  // layout & quantities
  const sheet = 1.22 * 2.44
  const quantities: WallQuantities = {
    plywoodArea: 2 * inp.length * inp.height,
    plywoodSheets: Math.ceil((2 * inp.length * inp.height) / sheet),
    studs: 2 * (horizontal ? studLevels.length : studX.length),
    studLength: horizontal ? 2 * studLevels.length * inp.length : 2 * studX.length * inp.height,
    waleLength: horizontal ? 2 * waleX.length * inp.wale.count * inp.height : 2 * waleLevels.length * inp.wale.count * inp.length,
    ties: tieLevels.length * tieX.length,
    braces: (Math.ceil(inp.length / inp.brace.spacingM) + 1) * inp.brace.levels * (inp.brace.oneSided ? 1 : 2),
  }

  if (inp.height > 3 && inp.pressure.method !== 'HYDROSTATIC') warnings.unshift('กำแพงสูง: ใช้แรงดันสูงสุดคงที่ตลอดความสูง (ตามหนังสือ) — ปลอดภัยแต่อาจไม่ประหยัด')

  return {
    ...summarize(pres, components, warnings),
    layout: { system: horizontal ? 'horizontal' : 'vertical', studSpacing: a, waleSpacing: waleCC, tieSpacing: tieSp, waleLevels, studX, studLevels, waleX, tieX, tieLevels },
    quantities,
  }
}
