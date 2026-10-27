// Shared types and helpers for element design (wall, column, …).
import { type CheckRow, columnCapacity } from './member'
import { getMaterial } from './materials'
import type { PressureMethod, PressureResult } from './pressure'
import { getSection, type Section } from './sections'
import { Trace } from './trace'
import { CONCRETE_NAIL_SWL } from './materials'
import { floorTo, fmt } from './units'

export type Status = 'ok' | 'warn' | 'fail'

export interface SpacingInfo {
  label: string
  /** spacing used, cm */
  value: number
  /** maximum allowed by the checks, cm */
  max: number
  governing: string
  /** true when the user fixed the value */
  fixed: boolean
}

export interface ComponentResult {
  key: string
  title: string
  spec: string
  spacing?: SpacingInfo
  rows: CheckRow[]
  maxRatio: number
  status: Status
  trace: Trace
}

export interface DesignResult {
  /** lateral concrete pressure (walls, columns, footings, beam sides) or the vertical deck load (slabs) */
  pressure: PressureResult
  /** what `pressure` holds — slabs use the vertical load (kg/m²); default lateral */
  loadKind?: 'lateral' | 'vertical'
  components: ComponentResult[]
  maxRatio: number
  status: Status
  warnings: string[]
}

export interface PressureParams {
  method: PressureMethod
  R: number
  T: number
  slump: number
  gamma?: number
  vibrationFactor?: number
}

export const WARN_RATIO = 0.9

export function statusOf(ratio: number): Status {
  if (!(ratio <= 1.0 + 1e-9)) return 'fail'
  return ratio >= WARN_RATIO ? 'warn' : 'ok'
}

export function component(key: string, title: string, spec: string, rows: CheckRow[], trace: Trace, spacing?: SpacingInfo): ComponentResult {
  const maxRatio = rows.length ? Math.max(...rows.map((r) => r.ratio)) : 0
  return { key, title, spec, spacing, rows, maxRatio, status: statusOf(maxRatio), trace }
}

export function summarize(pressure: PressureResult, components: ComponentResult[], extraWarnings: string[] = []): DesignResult {
  const maxRatio = Math.max(0, ...components.map((c) => c.maxRatio))
  const warnings = [...pressure.trace.warnings, ...components.flatMap((c) => c.trace.warnings), ...extraWarnings]
  return { pressure, components, maxRatio, status: statusOf(maxRatio), warnings }
}

/** Largest module ≤ max; falls back to flooring at 5 cm when max is below every module. */
export function pickModule(maxCm: number, modules: readonly number[]): number {
  const fit = modules.filter((m) => m <= maxCm + 1e-9)
  if (fit.length) return Math.max(...fit)
  return Math.max(floorTo(maxCm, 5), 5)
}

export const STUD_MODULES = [10, 15, 20, 25, 30, 40, 50, 60] as const
/** Tie spacings that fit 1.20 × 2.40 m plywood (book rounds 72 → 60 "to fit plywood"). */
export const TIE_MODULES = [30, 40, 60, 80, 120] as const

const GOVERNING_TH: Record<string, string> = { bending: 'แรงดัด', shear: 'แรงเฉือน', deflection: 'การแอ่นตัว', capacity: 'กำลังรับแรง' }
export const governingLabel = (g: string) => GOVERNING_TH[g] ?? g

// ---------------------------------------------------------------- sill (bottom plate) nailing

/** Bottom plate nailed to the slab — Ex 8.1 / 8.3: F = p × max(offset/2, 0.10 m) per metre. */
export function sillNails(p: number, bottomOffsetM: number, perLengthM = 1.0, title = 'ธรณีแบบ / ตะปูยึดพื้น'): ComponentResult {
  const trace = new Trace()
  const strip = Math.max(bottomOffsetM / 2, 0.1)
  const F = trace.add({ label: 'แรงเฉือนที่ฐานแบบ', expr: `${fmt(p)} × ${strip.toFixed(2)} × ${perLengthM}`, value: p * strip * perLengthM, unit: 'กก.' })
  const spacing = floorTo((100 * CONCRETE_NAIL_SWL * perLengthM) / F, 5)
  trace.add({ label: 'ระยะตะปูคอนกรีต Ø4 มม. (150 กก./ตัว)', expr: `150 / ${fmt(F / perLengthM)} ม.`, value: spacing, unit: 'ซม.', ref: 'ตัวอย่าง 8.1' })
  const nails = Math.ceil(F / CONCRETE_NAIL_SWL)
  const used = Math.max(spacing, 5)
  const demand = (F / perLengthM) * (used / 100)
  return component('sill', title, `ตะปูคอนกรีต Ø4 มม. @${used} ซม. (${nails} ตัว/${perLengthM} ม.)`, [
    { item: 'แรงต่อตะปู', demand, capacity: CONCRETE_NAIL_SWL, ratio: demand / CONCRETE_NAIL_SWL, unit: 'กก.' },
  ], trace)
}

// ---------------------------------------------------------------- lateral braces

export interface BraceParams {
  sectionId: string
  materialId: string
  /** angle to horizontal, degrees (book: 60°) */
  angleDeg: number
  /** brace spacing along the wall / number per column side */
  spacingM: number
  /** brace levels (Ex 8.3: top + mid-height = 2) */
  levels: 1 | 2
  /** brace restrained at mid-length */
  midBraced: boolean
  /** braced one side only → brace must take tension too */
  oneSided: boolean
  /** wind pressure, kg/m² (Thailand 50–100) */
  wind: number
  /** height of the top brace connection, m (default = form height) */
  heightM?: number
}

export const DEFAULT_BRACE: BraceParams = {
  sectionId: 'timber-1.5x3',
  materialId: 'timber-soft',
  angleDeg: 60,
  spacingM: 1.2,
  levels: 1,
  midBraced: true,
  oneSided: false,
  wind: 50,
}

/**
 * Brace design (book §8.4 p.282, Ex 8.1/8.3). Horizontal load per metre = max of
 * wind·H, unequal concrete level γ·Δh²/2, and 10 % eccentricity (W·0.1t)/H.
 * Brace force = horizontal × spacing / cos θ / levels.
 */
export function designBrace(opts: {
  brace: BraceParams
  H: number
  /** width loaded by wind / level difference per brace line, m (wall: 1 m strip; column: face width) */
  widthM: number
  /** level difference Δh, m (wall thickness / column dimension) */
  dh: number
  /** element weight per unit width, kg/m (for eccentricity) */
  weightPerWidth: number
  /** eccentricity lever, m (10 % of thickness) */
  ecc: number
  gamma: number
  /** spacing multiplier: walls → spacingM (per metre loads); columns → 1 / braces per side */
  tributary: number
  /** layout text, e.g. "@1.20 ม." for walls or "2 ตัว/ด้าน" for columns */
  layoutText?: string
}): ComponentResult {
  const { brace } = opts
  const trace = new Trace()
  const th = (brace.angleDeg * Math.PI) / 180
  const hTop = brace.heightM ?? opts.H
  const wind = trace.add({ label: 'กรณีที่ 1 แรงลม', expr: `${brace.wind} × ${opts.widthM} × ${opts.H}`, value: brace.wind * opts.widthM * opts.H, unit: 'กก.' })
  const level = trace.add({
    label: 'กรณีที่ 2 ระดับคอนกรีตต่างกัน',
    expr: `${fmt(opts.gamma)} × ${opts.widthM} × ${opts.dh}² / 2`,
    value: (opts.gamma * opts.widthM * opts.dh ** 2) / 2,
    unit: 'กก.',
  })
  const eccM = opts.weightPerWidth * opts.widthM * opts.ecc
  const ecc = trace.add({ label: 'กรณีที่ 3 การเยื้องศูนย์ 10%', expr: `(${fmt(opts.weightPerWidth * opts.widthM)} × ${opts.ecc.toFixed(3)}) / ${hTop}`, value: eccM / hTop, unit: 'กก.' })
  const Hmax = Math.max(wind, level, ecc)
  const F = trace.add({
    label: 'แรงในค้ำยัน',
    expr: `${fmt(Hmax, 1)} × ${opts.tributary.toFixed(2)} / cos${brace.angleDeg}° / ${brace.levels}`,
    value: (Hmax * opts.tributary) / Math.cos(th) / brace.levels,
    unit: 'กก.',
    ref: '§8.4 หน้า 282',
  })
  const section: Section = getSection(brace.sectionId)
  const mat = getMaterial(brace.materialId)
  const L = (hTop / Math.sin(th)) * 100
  trace.add({ label: 'ความยาวค้ำยัน', expr: `${hTop} / sin${brace.angleDeg}°`, value: L, unit: 'ซม.' })
  const lu = brace.midBraced ? L / 2 : L
  const cap = columnCapacity(section, mat, lu, trace, 'รับแรงอัด: ')
  const rows: CheckRow[] = [{ item: 'แรงอัดในค้ำยัน', demand: F, capacity: cap.P, ratio: F / cap.P, unit: 'กก.', ref: mat.kind === 'timber' ? 'สมการ 5.15' : 'สมการ 5.17/5.18' }]
  if (brace.oneSided) {
    const Pt = (mat.Ft ?? mat.Fb) * section.A
    trace.add({ label: 'กำลังรับแรงดึง (ค้ำด้านเดียว)', expr: `${mat.Ft ?? mat.Fb} × ${section.A.toFixed(1)}`, value: Pt, unit: 'กก.' })
    rows.push({ item: 'แรงดึงในค้ำยัน', demand: F, capacity: Pt, ratio: F / Pt, unit: 'กก.' })
  }
  return component(
    'brace',
    'ค้ำยันด้านข้าง',
    `${section.label} ${opts.layoutText ?? `@${brace.spacingM.toFixed(2)} ม.`} มุม ${brace.angleDeg}°${brace.levels === 2 ? ' 2 ระดับ' : ''}${brace.midBraced ? ' ยึดกลางช่วง' : ''}`,
    rows,
    trace,
  )
}
