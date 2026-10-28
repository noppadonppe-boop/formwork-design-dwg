// Column formwork design — book Chapter 9 (§9.4, Examples 9.1 and 9.3).
// Load path (plywood): sheathing → vertical studs → yokes (bending + axial tension) [→ ties through the long faces, and optionally the short faces]
// Load path (boards):  boards spanning between yokes → yokes.
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
import { lateralPressure } from './pressure'
import { board, getSection, multiple, plywoodStrip, type Section } from './sections'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'

export type ColumnSheathing =
  | { type: 'plywood'; materialId: string; thicknessMm: number }
  | { type: 'board'; materialId: string; thicknessCm: number }

export interface ColumnInput {
  /** short side, m */
  b: number
  /** long side, m */
  h: number
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
}

export interface ColumnDesign extends DesignResult {
  layout: ColumnLayout
  quantities: { plywoodArea: number; yokes: number; studs: number; ties: number; braces: number }
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

export function designColumn(inp: ColumnInput): ColumnDesign {
  const bCm = Math.min(inp.b, inp.h) * 100
  const hCm = Math.max(inp.b, inp.h) * 100
  const pres = lateralPressure({ ...inp.pressure, element: 'column', H: inp.height, d: Math.min(inp.b, inp.h) })
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
    const sec = board(hCm, inp.sheathing.thicknessCm)
    const sh = { section: sec, material: getMaterial(inp.sheathing.materialId), support: 'continuous' as const, deflection: defl }
    const wSh = tSh.add({ label: `น้ำหนักแผ่บนแผ่นไม้กว้าง ${hCm} ซม.`, expr: `${fmt(p)} × ${(hCm / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, hCm / 100), unit: 'กก./ซม.' })
    const lim = maxSpan(sh, wSh, tSh)
    add = 0
    sFromSupport = floorTo(lim.max, 5)
    governing = governingLabel(lim.governing)
    const s0 = inp.yoke.spacingCm ?? sFromSupport
    const chk = checkBeam(sh, wSh, s0, tSh)
    components.push(component('sheathing', 'แผ่นผิวแบบ (ไม้กระดาน)', `ไม้หนา ${inp.sheathing.thicknessCm} ซม. (${sh.material.name})`, chk.rows, tSh, { label: 'ระยะคานรัด', value: s0, max: lim.max, governing, fixed: inp.yoke.spacingCm !== undefined }))
  }

  // yokes — auto: reduce spacing in 5 cm steps until the yoke passes
  let s = inp.yoke.spacingCm ?? sFromSupport
  if (inp.yoke.spacingCm === undefined) {
    while (s > 10 && checkYokes(p, s, bCm, hCm, yoke, inp.tie, undefined, defl).ratio > 1) s -= 5
  }
  const tYo = new Trace()
  tYo.add({ label: 'ระยะคานรัด (c/c)', value: s, unit: 'ซม.' })
  const yc = checkYokes(p, s, bCm, hCm, yoke, inp.tie, tYo, defl)
  components.push(
    component('yoke', 'คานรัดแบบ (Yokes)', `${yoke.section.label} @${s} ซม. (${yoke.material.name})`, yc.rows, tYo, {
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
  const spans = columnTieSpans(inp.tie)
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
  const Hb = tSi.add({ label: 'แรงที่ฐานแบบต่อด้าน (ด้านยาว)', expr: `${fmt(p)} × ${(s / 200).toFixed(2)} × ${(hCm / 100).toFixed(2)}`, value: p * (s / 200) * (hCm / 100), unit: 'กก.', ref: 'ตัวอย่าง 9.1' })
  const nails = Math.max(2, Math.ceil(Hb / CONCRETE_NAIL_SWL))
  tSi.add({ label: 'จำนวนตะปูคอนกรีต Ø4 มม. ต่อด้าน', value: nails, unit: 'ตัว' })
  components.push(component('sill', 'ฐานบังคับแบบ', `ตะปูคอนกรีต Ø4 มม. ${nails} ตัว/ด้าน`, [{ item: 'แรงต่อตะปู', demand: Hb / nails, capacity: CONCRETE_NAIL_SWL, ratio: Hb / nails / CONCRETE_NAIL_SWL, unit: 'กก.' }], tSi))

  // braces — face of the long side, level difference = short dimension
  const gamma = pres.gamma
  components.push(
    designBrace({
      brace: inp.brace,
      H: inp.height,
      widthM: hCm / 100,
      dh: bCm / 100,
      weightPerWidth: (gamma * (bCm / 100) * (hCm / 100) * inp.height) / (hCm / 100),
      ecc: 0.1 * (bCm / 100),
      gamma,
      tributary: 1 / inp.brace.perSide,
      layoutText: `${inp.brace.perSide} ตัว/ด้าน × ${inp.brace.sides} ด้าน`,
    }),
  )

  const yokeLevels: number[] = []
  for (let z = 0.2; z < inp.height - 0.05; z += s / 100) yokeLevels.push(Math.round(z * 1000) / 1000)
  const studsPerFace = studSpacing ? { short: Math.ceil(bCm / studSpacing) + 1, long: Math.ceil(hCm / studSpacing) + 1 } : { short: 0, long: 0 }
  return {
    ...summarize(pres, components),
    layout: { yokeSpacing: s, studSpacing, yokeLevels, studsPerFace },
    quantities: {
      plywoodArea: (2 * (bCm + hCm) * inp.height) / 100,
      yokes: yokeLevels.length * 4 * inp.yoke.count,
      studs: 2 * (studsPerFace.short + studsPerFace.long),
      ties: yokeLevels.length * (spans.long - 1 + spans.short - 1),
      braces: inp.brace.perSide * inp.brace.sides,
    },
  }
}
