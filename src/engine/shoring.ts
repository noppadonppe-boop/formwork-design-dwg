// Shoring (เสาค้ำยัน / นั่งร้าน) for slab and beam forms — book §5.4, §6.4 step 5, Tables 6.10/6.11, §4.9.
// A shore is either a designed post (timber, round log or steel pipe; Fa from eq 5.15 / 5.17–5.18) or a
// rated product (scaffold-frame leg, adjustable steel prop) whose working load comes from the manufacturer, or a
// Ringlock system whose standards are checked at the ledger lift (./ringlock).
import { component, type ComponentResult } from './design'
import { getMaterial } from './materials'
import { type CheckRow, columnCapacity } from './member'
import { getSection } from './sections'
import { ringlockCapacity, ringlockSystem, RL_HEAD_MAX, RL_JACK_MAX, type RinglockParams } from './ringlock'
import { Trace } from './trace'
import { fmt } from './units'

export interface ShoreParams {
  kind: 'post' | 'rated' | 'ringlock'
  /** post: timber / round-log / pipe section */
  sectionId: string
  materialId: string
  /** rated product name and safe working load per leg, kg (manufacturer data) */
  ratedName: string
  swl: number
  /** intermediate lateral bracing levels: 0 = unbraced, 1 = mid-height (l/2), 2 = third points */
  braceLevels: number
  /** shore length, m — overrides clear height − form depth */
  lengthM?: number
  /** base plate / sole plate side, cm (0 = none) */
  baseCm: number
  /** Ringlock system and ledger lift (kind 'ringlock') */
  ringlock?: RinglockParams
  /** allowable bearing of the surface below, kg/m² (0 = not checked) */
  bearing: number
}

export const DEFAULT_SHORE: ShoreParams = {
  kind: 'post',
  sectionId: 'pipe-6.03',
  materialId: 'steel-a36',
  ratedName: 'นั่งร้านเหล็ก / Steel prop',
  swl: 1500,
  braceLevels: 0,
  baseCm: 15,
  bearing: 0,
}

/** Typical rated shoring products — working loads vary by maker: always confirm with the supplier's data. */
export const RATED_SHORES = [
  { name: 'นั่งร้านเหล็กโครงสำเร็จ (ต่อขา)', swl: 1000 },
  { name: 'ค้ำยันเหล็กปรับระดับ (Steel prop) ≤ 3.5 ม.', swl: 1500 },
  { name: 'ค้ำยันเหล็กปรับระดับ (Steel prop) ≤ 4.5 ม.', swl: 1000 },
  { name: 'นั่งร้านแบบ Ring-lock (ต่อขา)', swl: 2500 },
] as const

/**
 * Typical allowable bearing of the ground under the shores, kg/m² — a rough guide for a first check only (EIT /
 * common practice, factor of safety included); use the site's soil report or the engineer's value when there is one.
 */
export const GROUND_BEARING = [
  { name: 'ดินเหนียวอ่อน (เช่น กรุงเทพฯ)', bearing: 3000 },
  { name: 'ดินเหนียวแข็งปานกลาง / ดินถมบดอัด', bearing: 10000 },
  { name: 'ทรายแน่น / ลูกรัง / หินคลุกบดอัด', bearing: 20000 },
] as const

export function shoreLabel(s: ShoreParams): string {
  if (s.kind === 'ringlock') return `${ringlockSystem(s.ringlock).name} ระยะชั้น ${(s.ringlock?.liftM ?? 1.5).toFixed(1)} ม.`
  return s.kind === 'rated' ? `${s.ratedName} SWL ${fmt(s.swl)} กก./ขา` : getSection(s.sectionId).label
}

/** The shore's section in the model: a Ringlock standard, the designed post, or none for a rated product. */
export function shoreSectionId(s: ShoreParams): string | undefined {
  if (s.kind === 'ringlock') return ringlockSystem(s.ringlock).sectionId
  return s.kind === 'rated' ? undefined : s.sectionId
}

/** Safe load per leg the layout can count on before the detailed check (rated SWL / Ringlock at its lift). */
export function shoreSwl(s: ShoreParams, lengthM: number): number {
  return s.kind === 'ringlock' ? ringlockCapacity(s.ringlock ?? { system: 'asia48', liftM: 1.5 }, lengthM).swl : s.swl
}

/**
 * Check one shore point carrying P (kg) on `legs` posts of length `lengthM`.
 * `trace` usually already holds the load build-up; the capacity steps are appended to it.
 */
export function designShore(opts: { shore: ShoreParams; P: number; lengthM: number; legs?: number; trace: Trace; title?: string; layoutText?: string }): ComponentResult {
  const { shore, P, trace } = opts
  const legs = opts.legs ?? 1
  const perLeg = legs > 1 ? trace.add({ label: `น้ำหนักต่อต้น (${legs} ต้น)`, expr: `${fmt(P)} / ${legs}`, value: P / legs, unit: 'กก.' }) : P
  trace.add({ label: 'ความยาวเสาค้ำ', value: opts.lengthM, unit: 'ม.' })
  const rows: CheckRow[] = []
  let spec: string
  if (shore.kind === 'ringlock') {
    const rl = ringlockCapacity(shore.ringlock ?? { system: 'asia48', liftM: 1.5 }, opts.lengthM, trace)
    const maker = shore.ringlock?.swl !== undefined
    rows.push({ item: 'น้ำหนักต่อเสาตั้ง', demand: perLeg, capacity: rl.swl, ratio: perLeg / rl.swl, unit: 'กก.', ref: maker ? 'ข้อมูลผู้ผลิต' : 'AISC ASD E2' })
    rows.push({ item: 'เกลียวแจ็คฐาน / ยูเฮดที่โผล่', demand: rl.stack.jack * 100, capacity: RL_JACK_MAX * 100, ratio: rl.stack.jack / RL_JACK_MAX, unit: 'ซม.', ref: 'JGJ 231-2010 ข้อ 6.1.5' })
    rows.push({ item: 'ยูเฮดสูงเหนือคานนอนบนสุด a', demand: rl.stack.jack * 100, capacity: RL_HEAD_MAX * 100, ratio: rl.stack.jack / RL_HEAD_MAX, unit: 'ซม.', ref: 'JGJ 231-2010 ข้อ 6.1.5' })
    if (opts.lengthM < 0.7) trace.warn('เสาค้ำ Ringlock สั้นกว่า 0.70 ม. — ใช้แจ็คหรือไม้รองแทน')
    spec = `${rl.sys.name} ${rl.section.label} ระยะชั้น ${rl.stack.h.toFixed(1)} ม.`
  } else if (shore.kind === 'rated') {
    trace.add({ label: `กำลังรับน้ำหนักปลอดภัยต่อขา (${shore.ratedName})`, value: shore.swl, unit: 'กก.', ref: '§4.9 ข้อมูลผู้ผลิต' })
    rows.push({ item: 'น้ำหนักต่อขา', demand: perLeg, capacity: shore.swl, ratio: perLeg / shore.swl, unit: 'กก.', ref: 'ข้อมูลผู้ผลิต' })
    spec = shoreLabel(shore)
  } else {
    const s = getSection(shore.sectionId)
    const m = getMaterial(s.shape === 'pipe' && getMaterial(shore.materialId).kind !== 'steel' ? 'steel-a36' : shore.materialId)
    const lu = (opts.lengthM * 100) / (shore.braceLevels + 1)
    trace.add({
      label: 'ความยาวไม่ค้ำยัน',
      expr: shore.braceLevels ? `${(opts.lengthM * 100).toFixed(0)} / ${shore.braceLevels + 1} (ค้ำยันทางข้าง ${shore.braceLevels} ระดับ)` : 'ไม่มีค้ำยันทางข้าง',
      value: lu,
      unit: 'ซม.',
    })
    const cap = columnCapacity(s, m, lu, trace)
    rows.push({ item: 'แรงอัดในเสาค้ำ', demand: perLeg, capacity: cap.P, ratio: perLeg / cap.P, unit: 'กก.', ref: m.kind === 'timber' ? 'สมการ 5.15–5.16' : 'สมการ 5.17–5.19' })
    spec = `${s.label} (${m.name})`
  }
  if (shore.baseCm > 0 && shore.bearing > 0) {
    const area = (shore.baseCm / 100) ** 2
    const q = trace.add({ label: `แรงกดใต้แป้นรองฐาน ${shore.baseCm}×${shore.baseCm} ซม.`, expr: `${fmt(perLeg)} / ${area.toFixed(4)}`, value: perLeg / area, unit: 'กก./ม.²' })
    rows.push({ item: 'แรงแบกทานใต้แป้นรองฐาน', demand: q, capacity: shore.bearing, ratio: q / shore.bearing, unit: 'กก./ม.²' })
  }
  const legText = legs > 1 ? `${legs} ต้น/จุด ` : ''
  const braced = shore.kind === 'post' && shore.braceLevels
  return component('shore', opts.title ?? 'เสาค้ำยัน (Shores)', `${spec} ${legText}${opts.layoutText ?? ''}${braced ? ` ค้ำยันทางข้าง ${shore.braceLevels} ระดับ` : ''}`.trim(), rows, trace)
}

/** Number of shore bays a diagonal spans so that it is no steeper than 60° (narrow bays → longer diagonals). */
export const braceBays = (bay: number, height: number) => Math.max(1, Math.ceil(height / (bay * Math.tan(Math.PI / 3)) - 1e-9))

/**
 * First bay of each X-braced set along a row of `bays` bays, each set spanning `k` bays: both end bays, and sets
 * spread evenly so that no more than `gap` bays between sets are left unbraced.
 */
export function braceSets(bays: number, k: number, gap = 3): number[] {
  if (bays <= 0) return []
  const kk = Math.min(k, bays)
  if (bays <= kk) return [0]
  const n = Math.ceil((bays - kk) / (kk + gap) - 1e-9) + 1
  return [...new Set(Array.from({ length: n }, (_, i) => Math.round((i * (bays - kk)) / (n - 1))))]
}

/**
 * Lateral bracing of the shoring (ค้ำยันทางข้าง) — not computed in the book (Fig 6.1 only); design load taken from
 * ACI 347: the larger of 2 % of the dead load and 150 kg/m (100 lb/ft) of slab edge, per shore row, carried by one
 * diagonal per row in each direction. The diagonal is X-braced (unbraced length = half its length).
 */
export function designShoreBracing(opts: {
  sectionId: string
  materialId: string
  /** dead load (concrete + forms), kg/m² */
  dead: number
  /** row length and tributary width for each direction, m; bay = shore spacing in that direction; maxBays = bays in the row */
  dirs: { name: string; rowLength: number; tributary: number; bay: number; maxBays?: number }[]
  height: number
  /** ledger levels the diagonal is clamped to on its way up (tube-and-fitting): unbraced length l/(levels+1) */
  ledgers?: number
}): ComponentResult {
  const trace = new Trace()
  const s = getSection(opts.sectionId)
  const m = getMaterial(s.shape === 'pipe' && getMaterial(opts.materialId).kind !== 'steel' ? 'steel-a36' : opts.materialId)
  const rows: CheckRow[] = []
  for (const d of opts.dirs) {
    const byDead = 0.02 * opts.dead * d.rowLength * d.tributary
    const byEdge = 150 * d.tributary
    const H = trace.add({
      label: `${d.name}: แรงด้านข้างต่อแถว = max(2% DL, 150 กก./ม.)`,
      expr: `max(0.02×${fmt(opts.dead)}×${d.rowLength.toFixed(2)}×${d.tributary.toFixed(2)}, 150×${d.tributary.toFixed(2)})`,
      value: Math.max(byDead, byEdge),
      unit: 'กก.',
      ref: 'ACI 347',
    })
    const n = Math.min(braceBays(d.bay, opts.height), d.maxBays ?? Infinity)
    const run = n * d.bay
    const L = Math.hypot(run, opts.height)
    const cos = run / L
    const F = trace.add({ label: `${d.name}: แรงในค้ำยันทแยง (คร่อม ${n} ช่วงเสา)`, expr: `${fmt(H)} / cos(${((Math.acos(cos) * 180) / Math.PI).toFixed(0)}°)`, value: H / cos, unit: 'กก.' })
    const parts = Math.max(2, (opts.ledgers ?? 0) + 1)
    trace.add({
      label: `${d.name}: ความยาวค้ำยันทแยง (${parts > 2 ? `ยึดกับท่อแนวราบ ${parts - 1} ระดับ → l/${parts}` : 'ไขว้ X → l/2'})`,
      expr: `√(${run.toFixed(2)}² + ${opts.height.toFixed(2)}²)`,
      value: L * 100,
      unit: 'ซม.',
    })
    const cap = columnCapacity(s, m, (L * 100) / parts, trace, `${d.name}: `)
    rows.push({ item: `ค้ำยันทแยง ${d.name}`, demand: F, capacity: cap.P, ratio: F / cap.P, unit: 'กก.', ref: m.kind === 'timber' ? 'สมการ 5.15' : 'สมการ 5.17/5.18' })
  }
  return component('bracing', 'ค้ำยันทางข้างระบบเสาค้ำ', `${s.label} (${m.name}) ทแยงไขว้ 1 ชุด/แถว/ทิศทาง`, rows, trace)
}
