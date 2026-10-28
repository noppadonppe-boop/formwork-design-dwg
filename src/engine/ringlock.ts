// Ringlock (ring / disk-lock) system scaffolding used as shores (นั่งร้านระบบ Ringlock). Standards carry the load;
// ledgers between them come in fixed lengths, so the shore grid snaps to a ledger length; the ledger lift sets the
// buckling length of the standard. Effective length per JGJ 231-2010 §5.3.2, the larger of l0 = η·h (η = 1.6 for
// 0.5 / 1.0 m lifts, 1.2 for 1.5 m) and l0 = h' + 2k·a (k = 0.7, a = U-head support to the top ledger); the U-head
// may stand at most 650 mm above the top ledger with at most 400 mm of screw showing (§6.1.5). The safe load is then
// AISC ASD (E2-1 / E2-2) for the tube; the maker's table governs when given.
import { getMaterial } from './materials'
import { getSection } from './sections'
import type { Trace } from './trace'
import { fmt } from './units'

export type RinglockSystemId = 'eu48' | 'asia48' | 'asia60'

export interface RinglockSystem {
  id: RinglockSystemId
  name: string
  /** standard tube */
  sectionId: string
  materialId: string
  /** ledger lengths, centre to centre of the standards, cm */
  ledgersCm: number[]
}

export const RINGLOCK_SYSTEMS: RinglockSystem[] = [
  { id: 'asia48', name: 'Ringlock Ø48 (เอเชีย)', sectionId: 'rl-48.3x3.2', materialId: 'steel-q345', ledgersCm: [60, 90, 120, 150, 180] },
  { id: 'asia60', name: 'Ringlock Ø60 งานหนัก (เอเชีย)', sectionId: 'rl-60.3x3.2', materialId: 'steel-q345', ledgersCm: [60, 90, 120, 150, 180] },
  { id: 'eu48', name: 'Ringlock Ø48 (ยุโรป)', sectionId: 'rl-48.3x3.2', materialId: 'steel-q345', ledgersCm: [73, 109, 140, 157, 207, 257, 307] },
]

/** ledger lifts: the rosettes are 0.50 m apart */
export const RINGLOCK_LIFTS = [0.5, 1.0, 1.5, 2.0]
/** standards come in 0.50 m steps */
const STANDARD_STEP = 0.5
/** η of l0 = η·h (JGJ 231-2010 §5.3.2): 1.6 for 0.5 / 1.0 m lifts, 1.2 for 1.5 m (2.0 m is outside the table) */
export const ringlockEta = (liftM: number) => (liftM <= 1.0 + 1e-9 ? 1.6 : 1.2)
/** k of l0 = h' + 2k·a */
export const RL_K = 0.7
/** largest screw showing on a base jack / U-head, m (JGJ 231-2010 §6.1.5) */
export const RL_JACK_MAX = 0.4
/** largest height of the U-head support above the top ledger, m (JGJ 231-2010 §6.1.5) */
export const RL_HEAD_MAX = 0.65

export interface RinglockParams {
  system: RinglockSystemId
  /** ledger lift, m */
  liftM: number
  /** safe working load per standard from the maker's table, kg — overrides the calculation */
  swl?: number
  /** η and k of the effective lengths, when the maker or the engineer gives other values */
  eta?: number
  k?: number
}

export const DEFAULT_RINGLOCK: RinglockParams = { system: 'asia48', liftM: 1.5 }

export const ringlockSystem = (p?: RinglockParams) => RINGLOCK_SYSTEMS.find((s) => s.id === p?.system) ?? RINGLOCK_SYSTEMS[0]

/** Largest ledger no longer than `cm` (the shortest when none is). */
export function snapToLedger(cm: number, sys: RinglockSystem): number {
  const fit = sys.ledgersCm.filter((l) => l <= cm + 1e-6)
  return fit.length ? fit[fit.length - 1] : sys.ledgersCm[0]
}

/** The next shorter ledger, if any. */
export const ledgerBelow = (cm: number, sys: RinglockSystem) => [...sys.ledgersCm].reverse().find((l) => l < cm - 1e-6)

export const isLedger = (cm: number, sys: RinglockSystem) => sys.ledgersCm.some((l) => Math.abs(l - cm) < 0.5)

/**
 * Standards along a row of length `len` (m) for ledgers of `spanCm`: as many full bays as fit inside the insets, one
 * shorter ledger for what is left when a ledger fits it, the group centred on the row. Positions in m.
 */
export function ledgerRow(len: number, spanCm: number, sys: RinglockSystem, inset = 0): number[] {
  const L = spanCm / 100
  const room = Math.max(len - 2 * inset, 0)
  const n = Math.floor(room / L + 1e-9)
  const bays = Array<number>(n).fill(L)
  const rest = room - n * L
  const fill = [...sys.ledgersCm].reverse().find((l) => l / 100 <= rest + 1e-9)
  if (fill !== undefined && rest > 1e-6) bays.push(fill / 100)
  if (!bays.length) return [Math.round((len / 2) * 1000) / 1000]
  const span = bays.reduce((a, b) => a + b, 0)
  const out = [(len - span) / 2]
  for (const b of bays) out.push(out[out.length - 1] + b)
  return out.map((x) => Math.round(x * 1000) / 1000)
}

export const ledgerText = (sys: RinglockSystem) => sys.ledgersCm.map((l) => (l / 100).toFixed(2)).join(' / ')

/**
 * How a shore of height H is built: standards in 0.50 m steps, the rest split between the base jack and the
 * U-head; ledgers every `lift` from the bottom of the standards, the last at their top.
 */
export function ringlockStack(H: number, liftM: number) {
  const standards = Math.max(STANDARD_STEP, Math.floor((H - 0.2) / STANDARD_STEP + 1e-9) * STANDARD_STEP)
  const jack = Math.max(0, (H - standards) / 2)
  const h = Math.min(liftM, standards)
  const n = Math.max(1, Math.ceil(standards / h - 1e-9))
  const ledgers = Array.from({ length: n + 1 }, (_, k) => Math.round((jack + Math.min(k * h, standards)) * 1000) / 1000)
  const topLift = Math.round((standards - (n - 1) * h) * 1000) / 1000
  return { standards, jack, h, lifts: n, ledgers, topLift }
}

/** AISC ASD allowable compression (E2-1 / E2-2), kg/cm². */
export function aiscFa(lr: number, E: number, Fy: number) {
  const Cc = Math.sqrt((2 * Math.PI ** 2 * E) / Fy)
  if (lr > Cc) return { Cc, Fa: (12 * Math.PI ** 2 * E) / (23 * lr ** 2), eq: 'E2-2' as const }
  const q = lr / Cc
  const FS = 5 / 3 + (3 * q) / 8 - q ** 3 / 8
  return { Cc, Fa: ((1 - q ** 2 / 2) * Fy) / FS, FS, eq: 'E2-1' as const }
}

/** Safe load of one standard of a shore H m high, kg, with the steps written to `trace`. */
export function ringlockCapacity(p: RinglockParams, H: number, trace?: Trace) {
  const sys = ringlockSystem(p)
  const s = getSection(sys.sectionId)
  const m = getMaterial(sys.materialId)
  const st = ringlockStack(H, p.liftM)
  trace?.add({ label: `ระบบ ${sys.name} เสาตั้ง ${s.label} (${m.name})`, expr: `A = ${s.A.toFixed(2)} ซม.², r = ${s.rMin.toFixed(2)} ซม.` })
  trace?.add({ label: 'ความยาวคานนอนมาตรฐาน (ระยะเสา)', expr: `${ledgerText(sys)} ม.` })
  trace?.add({
    label: 'ความสูงเสาค้ำ = แจ็คฐาน + เสาตั้ง + ยูเฮด',
    expr: `${st.jack.toFixed(2)} + ${st.standards.toFixed(2)} + ${st.jack.toFixed(2)}`,
    value: H,
    unit: 'ม.',
  })
  trace?.add({ label: `ระยะชั้นคานนอน h (${st.lifts} ชั้น)`, expr: `คานนอนที่ระดับ ${st.ledgers.map((y) => y.toFixed(2)).join(', ')} ม.`, value: st.h, unit: 'ม.' })
  const Fy = m.Fy ?? 2500
  const at = (label: string, expr: string, l0: number) => {
    trace?.add({ label: `${label}: ความยาวประสิทธิผล l₀`, expr, value: l0 * 100, unit: 'ซม.' })
    const lr = (l0 * 100) / s.rMin
    const f = aiscFa(lr, m.E, Fy)
    trace?.add({ label: `${label}: l₀/r`, expr: `${(l0 * 100).toFixed(0)} / ${s.rMin.toFixed(2)} (Cc = ${f.Cc.toFixed(0)})`, value: lr })
    trace?.add({
      label: `${label}: Fa`,
      expr: f.eq === 'E2-1' ? `[1 − (l₀/r)²/2Cc²]·Fy / FS, FS = ${f.FS!.toFixed(2)}` : '12π²E / 23(l₀/r)²',
      value: f.Fa,
      unit: 'กก./ซม.²',
      ref: `AISC ASD ${f.eq}`,
    })
    return trace ? trace.add({ label: `${label}: P = Fa·A`, expr: `${fmt(f.Fa)} × ${s.A.toFixed(2)}`, value: f.Fa * s.A, unit: 'กก.' }) : f.Fa * s.A
  }
  const eta = p.eta ?? ringlockEta(st.h)
  const k = p.k ?? RL_K
  const ref = p.eta === undefined && p.k === undefined ? 'JGJ 231-2010 ข้อ 5.3.2' : 'กำหนดเอง'
  trace?.add({ label: 'ค่าปรับความยาว η และ k', expr: `η = ${eta}, k = ${k}`, ref, status: p.eta === undefined && st.h > 1.5 + 1e-9 ? 'warn' : undefined })
  if (p.eta === undefined && st.h > 1.5 + 1e-9) trace?.warn('ระยะชั้น 2.0 ม. เกินช่วงที่ JGJ 231 ให้ค่า η (0.5–1.5 ม.) — ใช้ η = 1.2 ควรตรวจกับตารางผู้ผลิต')
  const mid = at('ช่วงระหว่างคานนอน', `η·h = ${eta} × ${st.h.toFixed(2)}`, eta * st.h)
  const top = at('ชั้นบนสุด (มียูเฮด)', `h' + 2k·a = ${st.topLift.toFixed(2)} + 2 × ${k} × ${st.jack.toFixed(2)}`, st.topLift + 2 * k * st.jack)
  const calc = Math.min(mid, top)
  const swl = p.swl ?? calc
  if (trace) {
    trace.add({ label: 'กำลังรับน้ำหนักปลอดภัยต่อเสาตั้ง (ค่าน้อย)', expr: `min(${fmt(mid)}, ${fmt(top)})`, value: calc, unit: 'กก.' })
    if (p.swl !== undefined) trace.add({ label: 'SWL ต่อเสาตั้งที่ใช้ (ตามตารางผู้ผลิต)', value: p.swl, unit: 'กก.', ref: 'ข้อมูลผู้ผลิต', status: p.swl > calc * 1.5 ? 'warn' : undefined })
  }
  return { sys, section: s, stack: st, mid, top, calc, swl }
}
