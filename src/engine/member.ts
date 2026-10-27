// Member checks — book Chapter 5.
// Units: w kg/cm, l cm, E kg/cm², I cm⁴, S cm³, stresses kg/cm².
import type { Material } from './materials'
import type { Section } from './sections'
import { Trace } from './trace'
import { fmt } from './units'

/**
 * Support condition (book §5.1): members with ≥3 spans are continuous; 2-span members may be
 * designed with single-span formulas.
 */
export type Support = 'simple' | 'continuous'

export const BEAM_COEF: Record<Support, { m: number; v: number; d: number; mLabel: string; vLabel: string; dLabel: string }> = {
  simple: { m: 1 / 8, v: 1 / 2, d: 5 / 384, mLabel: 'wl²/8', vLabel: 'wl/2', dLabel: '5wl⁴/384EI' },
  continuous: { m: 1 / 10, v: 5 / 8, d: 1 / 128, mLabel: 'wl²/10', vLabel: '5wl/8', dLabel: 'wl⁴/128EI' },
}

export interface DeflectionCriteria {
  /** l / ratio, book: 360 */
  ratio: number
  /** optional absolute cap, cm (book mentions 0.15 cm sheathing / 0.3 cm others) */
  absCm?: number
}

export const DEFAULT_DEFLECTION: DeflectionCriteria = { ratio: 360 }

export interface MemberInput {
  section: Section
  material: Material
  support: Support
  deflection?: DeflectionCriteria
  /** check shear (book checks shear for steel wales; not for plywood sheathing) */
  checkShear?: boolean
  /** timber: shear span reduced by 2d (eq 5.12/5.13) — reproduces book Table 8.4 */
  shearReduction?: boolean
}

/** Allowable shear force, kg. Rect (timber/plywood): v = 3V/2bd; steel web: v = V/(b_w·d). */
export function shearCapacity(s: Section, m: Material): number | undefined {
  if (m.Fv === undefined) return undefined
  if (s.Aweb !== undefined) return m.Fv * s.Aweb
  return (m.Fv * 2 * s.B * s.H) / 3
}

export interface SpanLimits {
  bending: number
  shear?: number
  deflection: number
  governing: 'bending' | 'shear' | 'deflection'
  max: number
}

/** Maximum span (cm) for a uniform load w (kg/cm). */
export function maxSpan(inp: MemberInput, w: number, trace?: Trace, label = ''): SpanLimits {
  const { section: s, material: m, support } = inp
  const c = BEAM_COEF[support]
  const dc = inp.deflection ?? DEFAULT_DEFLECTION
  const bending = Math.sqrt((m.Fb * s.Sx) / (c.m * w))
  trace?.add({
    label: `${label}ช่วงสูงสุดจากแรงดัด`,
    expr: `M = ${c.mLabel} ≤ Fb·S → l = √(${fmt(m.Fb)}×${s.Sx.toFixed(2)} / (${c.m === 0.1 ? '0.1' : '0.125'}×${w.toFixed(2)}))`,
    value: bending,
    unit: 'ซม.',
    ref: 'สมการ 5.2, 5.7 / ตาราง 5.3',
  })
  // Δ = k·w·l⁴/(EI) ≤ l/ratio → l³ = EI/(k·w·ratio)
  let deflection = Math.cbrt((m.E * s.Ix) / (c.d * w * dc.ratio))
  if (dc.absCm !== undefined) deflection = Math.min(deflection, Math.pow((dc.absCm * m.E * s.Ix) / (c.d * w), 0.25))
  trace?.add({
    label: `${label}ช่วงสูงสุดจากการแอ่นตัว (≤ l/${dc.ratio}${dc.absCm ? `, ≤ ${dc.absCm * 10} มม.` : ''})`,
    expr: `Δ = ${c.dLabel} → l = ∛(${fmt(m.E)}×${s.Ix.toFixed(1)} / (${c.d.toFixed(5)}×${w.toFixed(2)}×${dc.ratio}))`,
    value: deflection,
    unit: 'ซม.',
    ref: support === 'continuous' ? 'สมการ 5.28, 5.30' : 'สมการ 5.27, 5.29',
  })
  let shear: number | undefined
  if (inp.checkShear) {
    const Vcap = shearCapacity(s, m)
    if (Vcap !== undefined) {
      const reduce = inp.shearReduction && s.Aweb === undefined
      shear = Vcap / (c.v * w) + (reduce ? 2 * s.H : 0)
      trace?.add({
        label: `${label}ช่วงสูงสุดจากแรงเฉือน`,
        expr: `V = ${c.vLabel}${reduce ? ' (ลดช่วง l − 2d)' : ''} ≤ ${fmt(Vcap)} กก.`,
        value: shear,
        unit: 'ซม.',
        ref: reduce ? 'สมการ 5.12/5.13' : 'สมการ 5.8–5.14',
      })
    }
  }
  const cands: [SpanLimits['governing'], number][] = [
    ['bending', bending],
    ['deflection', deflection],
  ]
  if (shear !== undefined) cands.push(['shear', shear])
  cands.sort((a, b) => a[1] - b[1])
  return { bending, shear, deflection, governing: cands[0][0], max: cands[0][1] }
}

export interface CheckRow {
  item: string
  demand: number
  capacity: number
  ratio: number
  unit: string
  ref?: string
}

export interface BeamCheck {
  M: number // kg·cm
  V: number // kg
  delta: number // cm
  deltaAllow: number
  rows: CheckRow[]
  maxRatio: number
}

/** Check a member of span l (cm) under uniform load w (kg/cm). */
export function checkBeam(inp: MemberInput, w: number, l: number, trace?: Trace, label = ''): BeamCheck {
  const { section: s, material: m, support } = inp
  const c = BEAM_COEF[support]
  const dc = inp.deflection ?? DEFAULT_DEFLECTION
  const M = c.m * w * l * l
  const fb = M / s.Sx
  const rows: CheckRow[] = [{ item: 'หน่วยแรงดัด fb', demand: fb, capacity: m.Fb, ratio: fb / m.Fb, unit: 'กก./ซม.²', ref: 'สมการ 5.2' }]
  trace?.add({ label: `${label}โมเมนต์ M = ${c.mLabel}`, expr: `${c.m === 0.1 ? '0.1' : '0.125'}×${w.toFixed(2)}×${l.toFixed(0)}²`, value: M, unit: 'กก.-ซม.' })
  trace?.add({ label: `${label}fb = M/S`, expr: `${fmt(M)} / ${s.Sx.toFixed(2)} ≤ ${m.Fb}`, value: fb, unit: 'กก./ซม.²', status: fb <= m.Fb ? 'ok' : 'fail' })

  const V = c.v * w * l
  if (inp.checkShear) {
    const Vcap = shearCapacity(s, m)
    if (Vcap !== undefined) {
      const reduce = inp.shearReduction && s.Aweb === undefined
      const Vs = reduce ? c.v * w * Math.max(l - 2 * s.H, 0) : V
      const fv = s.Aweb !== undefined ? Vs / s.Aweb : (3 * Vs) / (2 * s.B * s.H)
      rows.push({ item: 'หน่วยแรงเฉือน fv', demand: fv, capacity: m.Fv!, ratio: fv / m.Fv!, unit: 'กก./ซม.²', ref: s.Aweb ? 'สมการ 5.14' : reduce ? 'สมการ 5.11, 5.13' : 'สมการ 5.11' })
      trace?.add({ label: `${label}แรงเฉือน V = ${c.vLabel}${reduce ? ' (ลดช่วง l − 2d)' : ''}`, value: Vs, unit: 'กก.' })
      trace?.add({ label: `${label}fv`, expr: `≤ ${m.Fv}`, value: fv, unit: 'กก./ซม.²', status: fv <= m.Fv! ? 'ok' : 'fail' })
    }
  }

  const delta = (c.d * w * l ** 4) / (m.E * s.Ix)
  let deltaAllow = l / dc.ratio
  if (dc.absCm !== undefined) deltaAllow = Math.min(deltaAllow, dc.absCm)
  rows.push({ item: 'การแอ่นตัว Δ', demand: delta, capacity: deltaAllow, ratio: delta / deltaAllow, unit: 'ซม.', ref: support === 'continuous' ? 'สมการ 5.28' : 'สมการ 5.27' })
  trace?.add({
    label: `${label}การแอ่นตัว Δ = ${c.dLabel}`,
    expr: `≤ ${deltaAllow.toFixed(3)} ซม.`,
    value: delta,
    unit: 'ซม.',
    status: delta <= deltaAllow ? 'ok' : 'fail',
  })
  return { M, V, delta, deltaAllow, rows, maxRatio: Math.max(...rows.map((r) => r.ratio)) }
}

/** Required S and I for a span (book step "S = M/Fb", "I from Δ = l/360"). */
export function requiredProps(w: number, l: number, m: Material, support: Support, ratio = 360) {
  const c = BEAM_COEF[support]
  const M = c.m * w * l * l
  return { M, S: M / m.Fb, I: (c.d * w * l ** 3 * ratio) / m.E }
}

// ---------------------------------------------------------------- compression (§5.4)

export interface ColumnCapacity {
  slenderness: number
  Fa: number
  P: number
  formula: string
}

/** Axial capacity of a shore / brace of unbraced length l (cm). */
export function columnCapacity(s: Section, m: Material, l: number, trace?: Trace, label = ''): ColumnCapacity {
  if (m.kind === 'timber') {
    const ld = l / s.dMin
    let Fa = (0.3 * m.E) / ld ** 2
    if (m.Fc !== undefined) Fa = Math.min(Fa, m.Fc)
    const P = Fa * s.A
    trace?.add({ label: `${label}l/d`, expr: `${l.toFixed(0)} / ${s.dMin}`, value: ld, status: ld <= 50 ? 'ok' : 'warn' })
    if (ld > 50) trace?.warn(`${label}l/d = ${ld.toFixed(0)} เกิน 50 (ข้อจำกัดสมการ 5.15)`)
    trace?.add({ label: `${label}Fa = 0.30E/(l/d)²`, value: Fa, unit: 'กก./ซม.²', ref: 'สมการ 5.15' })
    trace?.add({ label: `${label}P = Fa·A`, value: P, unit: 'กก.', ref: 'สมการ 5.16' })
    return { slenderness: ld, Fa, P, formula: '0.30E/(l/d)²' }
  }
  const lr = l / s.rMin
  const Fa0 = lr < 132 ? 1250 - 0.033 * lr ** 2 : 1e7 / lr ** 2
  const Fa = Math.min(Fa0, 1000) // Bangkok code cap for A36
  const P = Fa * s.A
  trace?.add({ label: `${label}l/r`, expr: `${l.toFixed(0)} / ${s.rMin.toFixed(2)}`, value: lr })
  trace?.add({ label: `${label}Fa`, expr: lr < 132 ? '1250 − 0.033(l/r)²' : '10⁷/(l/r)²', value: Fa, unit: 'กก./ซม.²', ref: lr < 132 ? 'สมการ 5.17' : 'สมการ 5.18' })
  trace?.add({ label: `${label}P = Fa·A`, value: P, unit: 'กก.', ref: 'สมการ 5.19' })
  return { slenderness: lr, Fa, P, formula: lr < 132 ? '1250 − 0.033(l/r)²' : '10⁷/(l/r)²' }
}

/** Combined axial tension + bending (column yokes, book §9.4): σ = T/A ± M/S. */
export function combinedTensionBending(s: Section, m: Material, T: number, M: number) {
  const ft = T / s.A
  const fb = M / s.Sx
  const tension = ft + fb
  const compression = fb - ft
  const Ft = m.Ft ?? m.Fb
  const Fc = m.kind === 'timber' ? (m.Fc ?? m.Fb) : m.Fb
  return { ft, fb, tension, compression, Ft, Fc, ratio: Math.max(tension / Ft, compression / Fc) }
}
