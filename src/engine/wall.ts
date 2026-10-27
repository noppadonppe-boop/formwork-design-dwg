// Wall formwork design — book Chapter 8 (§8.4, Examples 8.1–8.3).
// Load path: sheathing → studs (vertical) → wales (horizontal, usually double) → form ties.
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

export interface WallInput {
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
  /** height of the lowest wale above the base, m */
  bottomWaleOffsetM: number
  /** distance from the top of the form down to the top wale, m (auto: the longest stud cantilever that passes) */
  topWaleOffsetM?: number
  deflection?: DeflectionCriteria
  /** check shear on timber studs/wales (eq 5.13, l − 2d). Book's direct examples skip it; its tables include it. Default true. */
  checkTimberShear?: boolean
}

export interface WallLayout {
  studSpacing: number // cm
  waleSpacing: number // cm c/c
  tieSpacing: number // cm
  waleLevels: number[] // m above base
  studX: number[] // m along wall
  tieX: number[] // m along wall
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

/**
 * Stud cantilever of c cm above the top wale. Pressure grows from the free surface at the form top
 * (γz ≤ Pmax), so the load is integrated in slices: V = ΣF, M = ΣF·x, tip Δ = ΣF·x²(3c − x)/6EI.
 */
function studCantilever(stud: MemberInput, pres: PressureResult, a: number, c: number, defl?: DeflectionCriteria) {
  const n = 100
  const dz = c / n
  const EI = stud.material.E * stud.section.Ix
  let V = 0
  let M = 0
  let delta = 0
  for (let i = 0; i < n; i++) {
    const z = (i + 0.5) * dz // depth below the top, cm
    const F = pressureToLineLoad(pressureAt(pres, z / 100), a / 100) * dz
    const x = c - z // lever arm to the top wale, cm
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

/** Longest stud cantilever (cm) that passes; the ratio grows with c, so bisect. */
function maxStudCantilever(stud: MemberInput, pres: PressureResult, a: number, defl?: DeflectionCriteria): number {
  let lo = 0
  let hi = 500
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (studCantilever(stud, pres, a, mid, defl).maxRatio <= 1) lo = mid
    else hi = mid
  }
  return lo
}

function positions(length: number, spacing: number): number[] {
  const n = Math.ceil(length / spacing - 1e-9)
  return Array.from({ length: n + 1 }, (_, i) => Math.min(i * spacing, length))
}

export function designWall(inp: WallInput): WallDesign {
  const pres = lateralPressure({ ...inp.pressure, element: 'wall', H: inp.height, d: inp.thickness })
  const p = pres.Pmax
  const defl = inp.deflection
  const components: ComponentResult[] = []

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

  // 2) studs → wale spacing
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
  tSt.add({ label: 'ระยะคานรับเคร่า (c/c)', expr: add ? `ช่วงสุทธิ ${studSpan} + ความหนาคานคู่ ${add}` : undefined, value: waleCC, unit: 'ซม.' })
  const stChk = checkBeam(stud, wSt, studSpan, tSt)
  components.push(
    component('stud', 'เคร่าตั้ง (Studs)', `${stud.section.label} @${a} ซม. (${stud.material.name})`, stChk.rows, tSt, {
      label: 'ระยะคานรับเคร่า',
      value: waleCC,
      max: stLim.max + add,
      governing: governingLabel(stLim.governing),
      fixed: inp.wale.spacingCm !== undefined,
    }),
  )

  // 2b) stud cantilever above the top wale → top wale level
  const tTop = new Trace()
  const cMax = maxStudCantilever(stud, pres, a, defl)
  tTop.add({ label: 'แรงดันเพิ่มจากผิวคอนกรีต (γz ≤ Pmax)', expr: `น้ำหนักแผ่บนเคร่า = γz × ${(a / 100).toFixed(2)} / 100`, unit: 'กก./ซม.' })
  tTop.add({ label: 'ช่วงยื่นสูงสุดที่ผ่าน (แรงดัด แรงเฉือน การแอ่นตัว)', value: cMax, unit: 'ซม.' })
  const topOff = inp.topWaleOffsetM ?? Math.max(floorTo(cMax, 5), 5) / 100
  const topZ = Math.max(inp.height - topOff, inp.bottomWaleOffsetM)
  let waleLevels: number[] = []
  for (let z = inp.bottomWaleOffsetM; z < inp.height - 0.05; z += waleCC / 100) waleLevels.push(Math.round(z * 1000) / 1000)
  if (inp.height - waleLevels[waleLevels.length - 1] > topOff + 1e-6) {
    // top too long: spread the wales evenly from the bottom wale to the top wale (spacing ≤ waleCC)
    const spans = Math.max(Math.ceil((topZ - inp.bottomWaleOffsetM) / (waleCC / 100) - 1e-9), 1)
    const s = (topZ - inp.bottomWaleOffsetM) / spans
    waleLevels = Array.from({ length: spans + 1 }, (_, i) => Math.round((inp.bottomWaleOffsetM + i * s) * 1000) / 1000)
    tTop.add({ label: 'จัดระยะคานรับเคร่าใหม่ให้เท่ากัน', expr: `(${topZ.toFixed(2)} − ${inp.bottomWaleOffsetM.toFixed(2)}) / ${spans}`, value: s * 100, unit: 'ซม.' })
  }
  const cUsed = (inp.height - waleLevels[waleLevels.length - 1]) * 100
  tTop.add({ label: 'ช่วงยื่นที่ใช้', expr: `${inp.height.toFixed(2)} − ${waleLevels[waleLevels.length - 1].toFixed(2)}`, value: cUsed, unit: 'ซม.' })
  const top = studCantilever(stud, pres, a, cUsed, defl)
  tTop.add({ label: 'โมเมนต์ที่คานบนสุด M = ΣF·x', value: top.M, unit: 'กก.-ซม.' })
  tTop.add({ label: 'fb = M/S', expr: `${fmt(top.M)} / ${stud.section.Sx.toFixed(2)} ≤ ${stud.material.Fb}`, value: top.M / stud.section.Sx, unit: 'กก./ซม.²', status: top.rows[0].ratio <= 1 ? 'ok' : 'fail' })
  if (top.rows.length === 3) tTop.add({ label: 'แรงเฉือนที่คานบนสุด V = ΣF', value: top.V, unit: 'กก.' })
  tTop.add({ label: 'การแอ่นตัวปลายเคร่า Δ = ΣF·x²(3c − x)/6EI', expr: `≤ ${top.deltaAllow.toFixed(3)} ซม.`, value: top.delta, unit: 'ซม.', status: top.delta <= top.deltaAllow ? 'ok' : 'fail' })
  components.push(
    component('stud-top', 'เคร่าตั้ง — ช่วงยื่นด้านบน', `${stud.section.label} @${a} ซม. ยื่นเหนือคานบนสุด ${fmt(cUsed)} ซม.`, top.rows, tTop, {
      label: 'ช่วงยื่นเหนือคานบนสุด',
      value: Math.round(cUsed),
      max: cMax,
      governing: governingLabel(CANTILEVER_GOV[studCantilever(stud, pres, a, cMax, defl).rows.reduce((x, y) => (y.ratio > x.ratio ? y : x)).item]),
      fixed: inp.topWaleOffsetM !== undefined,
    }),
  )

  // 3) wales → tie spacing (continuous over ties)
  const tWa = new Trace()
  const wale = {
    section: multiple(getSection(inp.wale.sectionId), inp.wale.count),
    material: getMaterial(inp.wale.materialId),
    support: 'continuous' as const,
    deflection: defl,
    checkShear: shearOn(inp.wale.materialId),
    shearReduction: true,
  }
  const tie = getTie(inp.tie.tieId)
  const wWa = tWa.add({ label: 'น้ำหนักแผ่บนคานรับเคร่า', expr: `${fmt(p)} × ${(waleCC / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, waleCC / 100), unit: 'กก./ซม.' })
  const waLim = maxSpan(wale, wWa, tWa)
  const tieByCapacity = (tie.swl / (p * (waleCC / 100))) * 100
  tWa.add({ label: 'ระยะไทร์สูงสุดจากกำลังไทร์', expr: `${fmt(tie.swl)} / (${fmt(p)} × ${(waleCC / 100).toFixed(2)})`, value: tieByCapacity, unit: 'ซม.', ref: 'ตาราง 4.6' })
  const tieMax = Math.min(waLim.max, tieByCapacity)
  const tieSp = inp.tie.spacingCm ?? pickModule(tieMax, TIE_MODULES)
  tWa.add({ label: 'ระยะไทร์ที่ใช้', value: tieSp, unit: 'ซม.' })
  const waChk = checkBeam(wale, wWa, tieSp, tWa)
  components.push(
    component('wale', 'คานรับเคร่า (Wales)', `${wale.section.label} (${wale.material.name})`, waChk.rows, tWa, {
      label: 'ระยะไทร์',
      value: tieSp,
      max: tieMax,
      governing: tieByCapacity < waLim.max ? 'กำลังไทร์' : governingLabel(waLim.governing),
      fixed: inp.tie.spacingCm !== undefined,
    }),
  )

  // 4) form ties
  const tTi = new Trace()
  const T = tTi.add({
    label: 'แรงดึงในไทร์ = P × พื้นที่รับแรง',
    expr: `${fmt(p)} × ${(waleCC / 100).toFixed(2)} × ${(tieSp / 100).toFixed(2)}`,
    value: p * (waleCC / 100) * (tieSp / 100),
    unit: 'กก.',
    ref: 'รูป 8.4',
  })
  components.push(component('tie', 'เหล็กยึดรั้ง (Form tie)', `${tie.name} SWL ${fmt(tie.swl)} กก.`, [{ item: 'แรงดึง', demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref }], tTi))

  // 5) sill
  components.push(sillNails(p, inp.bottomWaleOffsetM))

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
  const studX = positions(inp.length, a / 100)
  const tieX = positions(inp.length, tieSp / 100).filter((x) => x > 0 && x < inp.length)
  const sheet = 1.22 * 2.44
  const quantities: WallQuantities = {
    plywoodArea: 2 * inp.length * inp.height,
    plywoodSheets: Math.ceil((2 * inp.length * inp.height) / sheet),
    studs: 2 * studX.length,
    studLength: 2 * studX.length * inp.height,
    waleLength: 2 * waleLevels.length * inp.wale.count * inp.length,
    ties: waleLevels.length * tieX.length,
    braces: (Math.ceil(inp.length / inp.brace.spacingM) + 1) * inp.brace.levels * (inp.brace.oneSided ? 1 : 2),
  }

  const warnings: string[] = []
  if (inp.height > 3 && inp.pressure.method !== 'HYDROSTATIC') warnings.push('กำแพงสูง: ใช้แรงดันสูงสุดคงที่ตลอดความสูง (ตามหนังสือ) — ปลอดภัยแต่อาจไม่ประหยัด')

  return {
    ...summarize(pres, components, warnings),
    layout: { studSpacing: a, waleSpacing: waleCC, tieSpacing: tieSp, waleLevels, studX, tieX },
    quantities,
  }
}
