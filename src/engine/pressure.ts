// Lateral pressure of fresh concrete on formwork — book Chapter 2 §2.10.
import { Trace } from './trace'
import { cToF, fmt, interp1, interp2, mPerHrToFtPerHr, psfToKgm2 } from './units'

export type PressureMethod = 'ACI347' | 'CEB' | 'CIRA' | 'HYDROSTATIC'
export type PressureElement = 'wall' | 'column'

export interface PressureInput {
  method: PressureMethod
  element: PressureElement
  /** rate of placement, m/hr */
  R: number
  /** concrete temperature at placing, °C */
  T: number
  /** height of fresh concrete / form height, m */
  H: number
  /** slump, cm */
  slump: number
  /** least form dimension (wall thickness / column side), m — CEB eq 2.14 and CIRA Table 2.5 */
  d: number
  /** concrete unit weight, kg/m³ (CIRA uses 2,500 by definition) */
  gamma?: number
  /** extra pressure for vibration, fraction (e.g. 0.1 = +10%) — ACI-622 §2.6 */
  vibrationFactor?: number
}

export interface PressureResult {
  /** design maximum lateral pressure, kg/m² */
  Pmax: number
  /** depth below the free surface at which Pmax is reached, m */
  hCrit: number
  gamma: number
  trace: Trace
}

const GAMMA_DEFAULT = 2400
const GAMMA_CIRA = 2500

/** ACI-347 (eq 2.7–2.9) with caps. */
export function aci347(inp: PressureInput, trace = new Trace()): number {
  const gamma = inp.gamma ?? GAMMA_DEFAULT
  const Rft = mPerHrToFtPerHr(inp.R)
  const TF = cToF(inp.T)
  trace.add({ label: 'อัตราการเท R', expr: `${inp.R} ม./ชม. ÷ 0.3048`, value: Rft, unit: 'ฟุต/ชม.' })
  trace.add({ label: 'อุณหภูมิคอนกรีต T', expr: `1.8 × ${inp.T} + 32`, value: TF, unit: '°F' })
  if (Rft > 10) trace.warn('ACI-347: R เกิน 10 ฟุต/ชม. (≈3 ม./ชม.) อยู่นอกขอบเขตสูตร')
  if (inp.slump > 10) trace.warn('ACI-347: ค่ายุบตัวเกิน 10 ซม. อยู่นอกขอบเขตสูตร')

  let psf: number
  if (inp.element === 'column') {
    psf = 150 + (9000 * Rft) / TF
    trace.add({ label: 'แรงดัน (เสา)', expr: `150 + 9000(${Rft.toFixed(2)})/${TF.toFixed(0)}`, value: psf, unit: 'psf', ref: 'ACI-347 สมการ 2.9' })
    if (inp.H > 6 || inp.d > 2) trace.warn('สูตรเสาใช้ได้เมื่อสูง < 6 ม. และด้านกว้าง ≤ 2 ม. — ควรใช้สูตรกำแพง')
  } else if (Rft <= 7) {
    psf = 150 + (9000 * Rft) / TF
    trace.add({ label: 'แรงดัน (กำแพง, R ≤ 7 ฟุต/ชม.)', expr: `150 + 9000(${Rft.toFixed(2)})/${TF.toFixed(0)}`, value: psf, unit: 'psf', ref: 'ACI-347 สมการ 2.7' })
  } else {
    psf = 150 + 43400 / TF + (2800 * Rft) / TF
    trace.add({ label: 'แรงดัน (กำแพง, R > 7 ฟุต/ชม.)', expr: `150 + 43400/${TF.toFixed(0)} + 2800(${Rft.toFixed(2)})/${TF.toFixed(0)}`, value: psf, unit: 'psf', ref: 'ACI-347 สมการ 2.8' })
  }
  const P = psfToKgm2(psf)
  trace.add({ label: 'แปลงหน่วย', expr: `${psf.toFixed(0)} × 4.882`, value: P, unit: 'กก./ม.²' })

  const cap = inp.element === 'column' ? 14640 : 9760
  const liquid = gamma * inp.H
  const Pd = Math.min(P, cap, liquid)
  trace.add({
    label: 'ค่าที่ใช้ออกแบบ',
    expr: `min(${fmt(P)}, ${fmt(cap)}, γH = ${fmt(gamma)}×${inp.H} = ${fmt(liquid)})`,
    value: Pd,
    unit: 'กก./ม.²',
    ref: 'ACI-347 ข้อจำกัดค่าสูงสุด',
  })
  return Pd
}

/** CEB Table 2.2 — k by slump (cm, rows) and temperature (°C, cols). */
export const CEB_K = {
  slump: [2.5, 5.0, 7.5, 10.0],
  temp: [5, 10, 15, 20, 25, 30],
  k: [
    [1.45, 1.1, 0.8, 0.6, 0.45, 0.35],
    [1.9, 1.45, 1.1, 0.8, 0.6, 0.45],
    [2.35, 1.8, 1.35, 1.0, 0.75, 0.55],
    [2.75, 2.1, 1.6, 1.15, 0.9, 0.65],
  ],
} as const

/** CEB — minimum of eq 2.12, 2.13, 2.14. */
export function ceb(inp: PressureInput, trace = new Trace()): number {
  const gamma = inp.gamma ?? GAMMA_DEFAULT
  const p1 = gamma * inp.H
  trace.add({ label: '(1) แรงดันของเหลว', expr: `${fmt(gamma)} × ${inp.H}`, value: p1, unit: 'กก./ม.²', ref: 'CEB สมการ 2.12' })
  const k = interp2(CEB_K.slump, CEB_K.temp, CEB_K.k, inp.slump, inp.T)
  trace.add({ label: 'ค่าปรับ k', expr: `slump ${inp.slump} ซม., T ${inp.T} °C`, value: k, ref: 'CEB ตาราง 2.2' })
  const p2 = 2400 * k * inp.R + 500
  trace.add({ label: '(2) พิจารณาการก่อตัว', expr: `2400(${k.toFixed(2)})(${inp.R}) + 500`, value: p2, unit: 'กก./ม.²', ref: 'CEB สมการ 2.13' })
  const p3 = 300 * inp.R + 10000 * inp.d + 1500
  trace.add({ label: '(3) ผลของขนาดด้านแคบ', expr: `300(${inp.R}) + 10000(${inp.d}) + 1500`, value: p3, unit: 'กก./ม.²', ref: 'CEB สมการ 2.14' })
  const P = Math.min(p1, p2, p3)
  trace.add({ label: 'ค่าที่ใช้ออกแบบ (ค่าต่ำสุด)', value: P, unit: 'กก./ม.²' })
  return P
}

/** CIRA Table 2.4 — setting pressure, kg/m². rows: [slump, temp]. */
const CIRA_R = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8]
const CIRA_T = [5, 10, 15, 20]
const CIRA_SLUMP = [5, 7.5, 10]
const CIRA_24: number[][][] = [
  [
    [5000, 7000, 9500, 11500, 13500, 15000, 15000, 15000, 15000, 15000],
    [4000, 5500, 7000, 8500, 10000, 13500, 15000, 15000, 15000, 15000],
    [4000, 4500, 5500, 6500, 7500, 10000, 12500, 15000, 15000, 15000],
    [3500, 4000, 4500, 5000, 5500, 7000, 9000, 10500, 12500, 15000],
  ],
  [
    [6000, 8500, 11000, 14000, 15000, 15000, 15000, 15000, 15000, 15000],
    [5000, 6500, 8500, 10500, 12500, 15000, 15000, 15000, 15000, 15000],
    [4000, 5000, 6500, 8000, 9500, 12500, 15000, 15000, 15000, 15000],
    [3500, 4000, 5000, 6000, 7000, 9000, 11500, 13500, 15000, 15000],
  ],
  [
    [7000, 10000, 13000, 15000, 15000, 15000, 15000, 15000, 15000, 15000],
    [5500, 7500, 10000, 12000, 15000, 15000, 15000, 15000, 15000, 15000],
    [4500, 6000, 7500, 9000, 11000, 15000, 15000, 15000, 15000, 15000],
    [3500, 4500, 5500, 7000, 8000, 11000, 13000, 15000, 15000, 15000],
  ],
]

/** CIRA Table 2.5 — thin sections, kg/m². rows: thickness cm, cols: R m/hr. */
const CIRA_25_THICK = [15, 20, 30, 40, 50]
const CIRA_25_R = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40]
const CIRA_25 = [
  [3500, 3500, 4000, 4500, 4500, 5000, 5500, 6000, 7500, 9000, 12000, 15000],
  [4000, 4000, 4500, 5000, 5000, 5500, 6000, 6500, 8000, 9500, 12500, 15000],
  [5000, 5000, 5500, 6000, 6000, 6500, 7000, 7500, 9000, 10500, 13500, 15000],
  [6000, 6000, 6500, 7000, 7000, 7500, 8000, 8500, 10000, 11500, 14500, 15000],
  [7000, 7000, 7500, 8000, 8000, 8500, 9000, 9500, 11000, 12500, 15000, 15000],
]

export function ciraSetting(slump: number, T: number, R: number): number {
  const perSlump = CIRA_24.map((byT) => interp2(CIRA_T, CIRA_R, byT, T, R))
  return interp1(CIRA_SLUMP, perSlump, slump)
}

export function ciraThin(dCm: number, R: number): number {
  return interp2(CIRA_25_THICK, CIRA_25_R, CIRA_25, dCm, R)
}

/** CIRA — minimum of Tables 2.3, 2.4, 2.5. Temperatures above 20 °C use the 20 °C row (as the book's examples do). */
export function cira(inp: PressureInput, trace = new Trace()): number {
  const p1 = GAMMA_CIRA * inp.H
  trace.add({ label: '(1) แรงดันของเหลว γ = 2,500', expr: `2500 × ${inp.H}`, value: p1, unit: 'กก./ม.²', ref: 'CIRA ตาราง 2.3' })
  if (inp.T > 20) trace.warn('CIRA: ตาราง 2.4 มีถึง 20 °C — ใช้ค่าที่ 20 °C (ตามตัวอย่างในหนังสือ)')
  const p2 = ciraSetting(inp.slump, inp.T, inp.R)
  trace.add({ label: '(2) พิจารณาการก่อตัว', expr: `slump ${inp.slump}, T ${Math.min(inp.T, 20)} °C, R ${inp.R}`, value: p2, unit: 'กก./ม.²', ref: 'CIRA ตาราง 2.4' })
  const p3 = ciraThin(inp.d * 100, inp.R)
  trace.add({ label: '(3) หน้าตัดบาง', expr: `หนา ${(inp.d * 100).toFixed(0)} ซม., R ${inp.R}`, value: p3, unit: 'กก./ม.²', ref: 'CIRA ตาราง 2.5' })
  const P = Math.min(p1, p2, p3)
  trace.add({ label: 'ค่าที่ใช้ออกแบบ (ค่าต่ำสุด)', value: P, unit: 'กก./ม.²' })
  return P
}

export function lateralPressure(inp: PressureInput): PressureResult {
  const trace = new Trace()
  const gamma = inp.method === 'CIRA' ? GAMMA_CIRA : (inp.gamma ?? GAMMA_DEFAULT)
  let P: number
  switch (inp.method) {
    case 'ACI347':
      P = aci347(inp, trace)
      break
    case 'CEB':
      P = ceb(inp, trace)
      break
    case 'CIRA':
      P = cira(inp, trace)
      break
    case 'HYDROSTATIC':
      P = trace.add({ label: 'แรงดันของเหลวเต็มความสูง', expr: `${fmt(gamma)} × ${inp.H}`, value: gamma * inp.H, unit: 'กก./ม.²' })
      break
  }
  const vib = inp.vibrationFactor ?? 0
  if (vib > 0) {
    P = Math.min(P * (1 + vib), gamma * inp.H)
    trace.add({ label: `เพิ่มผลการจี้เขย่า +${(vib * 100).toFixed(0)}%`, value: P, unit: 'กก./ม.²', ref: 'ACI-622 §2.6' })
  }
  const hCrit = Math.min(P / gamma, inp.H)
  trace.add({ label: 'ความลึกที่แรงดันถึงค่าสูงสุด', expr: `${fmt(P)} / ${fmt(gamma)}`, value: hCrit, unit: 'ม.' })
  return { Pmax: P, hCrit, gamma, trace }
}

/** Pressure at depth z (m) below the free surface — hydrostatic up to Pmax, then constant. */
export function pressureAt(res: Pick<PressureResult, 'Pmax' | 'gamma'>, z: number): number {
  return Math.min(res.gamma * Math.max(z, 0), res.Pmax)
}
