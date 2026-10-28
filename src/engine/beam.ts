// Beam formwork design — book Chapter 7 (§7.4, Examples 7.1–7.4).
// Sides act like a low wall (hydrostatic pressure γh → side sheathing → studs [→ wales + ties for deep beams]);
// the bottom acts like a slab (bottom board/stiffeners → cross-beams (heads) → shores).
import { component, type ComponentResult, type DesignResult, governingLabel, summarize } from './design'
import { getMaterial, getTie } from './materials'
import { type CheckRow, checkBeam, columnCapacity, type DeflectionCriteria, maxSpan, type MemberInput, shearCapacity } from './member'
import type { PressureResult } from './pressure'
import { flat, getSection, multiple, rect, type Section } from './sections'
import { type DeckSheathing, deckSection, deckThicknessM, spread, type VerticalLoads } from './slab'
import { isLedger, ledgerBelow, ledgerRow, ledgerText, ringlockSystem, snapToLedger } from './ringlock'
import { braceBays, braceSets, DEFAULT_SHORE, designShore, designShoreBracing, type ShoreParams, shoreSwl } from './shoring'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'

/** isolated (คานเดี่ยว), cast with the slab on both sides (คานร่วมพื้น), spandrel / edge beam (คานขอบ) */
export type BeamType = 'isolated' | 'slab' | 'spandrel'

export interface BeamInput {
  type: BeamType
  /** web width, m */
  b: number
  /** total depth including the slab, m */
  h: number
  /** slab thickness, m (0 for isolated beams) */
  slabT: number
  /** beam length (clear span), m */
  length: number
  /** floor to beam soffit, m */
  clearHeight: number
  /** slab width outside the web carried by the beam shores, m (both sides together) — Fig 7.7 */
  slabTribM: number
  /** formWeight = slab form kg/m²; beamFormWeight = beam form kg/m (book: 100) */
  loads: VerticalLoads & { beamFormWeight: number }
  sheathing: DeckSheathing
  /** side-form studs; spacingCm = stud spacing */
  stud: { sectionId: string; materialId: string; spacingCm?: number }
  /**
   * runners along the beam under the bottom (ไม้เสริมท้อง / คร่าวตามยาว); count 0 = the bottom board/plywood spans alone.
   * auto: the fewest runners whose span the sheathing (along) or the cross joists (across) can take — count is ignored.
   */
  bottom: { count: number; sectionId: string; materialId: string; flat: boolean; auto?: boolean }
  /** members right under the bottom sheathing: runners along the beam, or cross joists (ตงขวาง) on the runners */
  bottomDir?: 'along' | 'across'
  /** cross joists for bottomDir 'across'; spacingCm = joist spacing along the beam */
  crossJoist?: { sectionId: string; materialId: string; spacingCm?: number }
  /** cross-beam / T-head (คานขวางรับท้องแบบ); spacingCm = head spacing = shore spacing */
  head: { sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number }
  shore: ShoreParams & { layout: 'single' | 'double'; postSpacingM: number }
  /**
   * heads carried on longitudinal stringers (คานแนวยาว): 2 rows (3 for wide beams) postSpacingM apart (outer rows),
   * each on U-heads (ก้ามปู) and shores at their own spacing along the beam; spacingCm = shore spacing along the beam.
   * Posts get horizontal ledgers (ท่อแนวรอง) both ways at lifts of at most liftM. Off or missing = a shore under
   * every head (as before).
   */
  stringer?: { enabled: boolean; rows: 2 | 3; sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number; liftM?: number }
  /** through-ties with horizontal wales for deep beams (Fig 7.8) */
  tie: { enabled: boolean; tieId: string; rows: number; waleSectionId: string; waleMaterialId: string }
  /** top-of-form diagonal braces (ค้ำยันปากแบบ) for isolated / spandrel beams */
  brace: { sectionId: string; materialId: string; angleDeg: number }
  /** X-bracing of the shore rows along the beam (ACI 347); optional so projects saved before it load unchanged */
  bracing?: { enabled: boolean; sectionId: string; materialId: string }
  deflection?: DeflectionCriteria
  checkTimberShear?: boolean
}

export interface BeamLayout {
  studSpacing: number // cm
  headSpacing: number // cm
  studX: number[] // m along the beam
  headX: number[] // m
  /** side form heights (outer = +z, inner = −z), m */
  sideOuter: number
  sideInner: number
  tieLevels: number[] // m above soffit
  shoreLength: number
  /** runner centres across the beam (z), m */
  bottomZ: number[]
  /** cross-joist positions along the beam, m (bottomDir 'across') */
  crossJoistX: number[]
  crossJoistSpacing?: number // cm
  /** stringer system: row centres across the beam (z), shore positions along it, ledger levels above the base (m),
   *  first bay of each X-braced set along the rows (k bays each) and the post lines braced across the beam */
  stringer?: { z: number[]; shoreX: number[]; shoreSpacing: number; ledgerY: number[]; braceSets: number[]; braceBays: number; acrossLines: number[] }
}

export interface BeamQuantities {
  plywoodArea: number
  studs: number
  studLength: number
  bottomLength: number
  crossJoists: number
  heads: number
  stringerLength: number
  shores: number
  ledgerLength: number
  braces: number
  bracing: number
  ties: number
}

export interface BeamDesign extends DesignResult {
  layout: BeamLayout
  quantities: BeamQuantities
}

export const DEFAULT_BEAM: BeamInput = {
  type: 'slab',
  b: 0.3,
  h: 0.6,
  slabT: 0.12,
  length: 6,
  clearHeight: 2.6,
  slabTribM: 1.2,
  loads: { liveLoad: 150, formWeight: 50, gamma: 2400, beamFormWeight: 100 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
  bottom: { count: 2, sectionId: 'timber-1.5x3', materialId: 'timber-yang', flat: true, auto: true },
  bottomDir: 'along',
  crossJoist: { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
  head: { sectionId: 'timber-2x4', materialId: 'timber-yang', count: 1 },
  shore: { ...DEFAULT_SHORE, layout: 'single', postSpacingM: 0.6 },
  stringer: { enabled: false, rows: 2, sectionId: 'rhs-100×50×2.3', materialId: 'steel-a36', count: 1 },
  tie: { enabled: false, tieId: 'tie-3/8', rows: 1, waleSectionId: 'timber-2x4', waleMaterialId: 'timber-yang' },
  brace: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', angleDeg: 45 },
  bracing: { enabled: true, sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
}

/** Shore-row bracing of a beam input (off for projects saved before the option existed). */
export const beamBracing = (inp: BeamInput) => inp.bracing ?? { ...DEFAULT_BEAM.bracing!, enabled: false }

export const BEAM_TYPE_LABEL: Record<BeamType, string> = { isolated: 'คานเดี่ยว', slab: 'คานหล่อร่วมพื้น', spandrel: 'คานขอบอาคาร' }

/** Cross joists of a beam input (defaults for projects saved before the option existed). */
export const beamCrossJoist = (inp: BeamInput) => inp.crossJoist ?? DEFAULT_BEAM.crossJoist!

/** Longitudinal stringers under the heads (off for projects saved before the option existed). */
export const beamStringer = (inp: BeamInput) => inp.stringer ?? { ...DEFAULT_BEAM.stringer!, enabled: false }

/** Default lift between ledgers of tube-and-fitting falsework, m. */
export const LEDGER_LIFT = 2

/**
 * Share of the load per metre of beam taken by the middle of three stringer rows: the heads are continuous over two
 * equal spans, outer rows rowSpan apart. A band of width c centred on the middle row sends c·(1 − c²/2L² + c³/8L³)
 * of its load per unit width to it (L = rowSpan; 1 for a point load, 0.625 for a full uniform load). Load beyond the
 * outer rows goes to the outer rows.
 */
export function middleRowShare(inp: BeamInput, rowSpan: number): number {
  const slabOut = inp.type === 'isolated' ? 0 : inp.slabTribM
  const F = (c: number) => {
    const C = Math.min(c, rowSpan)
    return C * (1 - (C * C) / (2 * rowSpan * rowSpan) + C ** 3 / (8 * rowSpan ** 3))
  }
  const qBeam = (inp.loads.gamma * inp.b * inp.h + inp.loads.beamFormWeight + inp.loads.liveLoad * inp.b) / inp.b
  const qSlab = inp.loads.gamma * inp.slabT + inp.loads.formWeight + inp.loads.liveLoad
  const total = qBeam * inp.b + qSlab * slabOut
  return (qBeam * F(inp.b) + (slabOut ? qSlab * (F(inp.b + slabOut) - F(inp.b)) : 0)) / total
}

/** Whether there are runners along the beam under the bottom (always with cross joists or an automatic count). */
export const beamHasRunners = (inp: BeamInput) => inp.bottomDir === 'across' || !!inp.bottom.auto || inp.bottom.count > 0

/** Runners laid flat — timber only; steel tubes and channels are used as rolled. */
export const beamRunnerFlat = (inp: BeamInput) => inp.bottom.flat && getMaterial(inp.bottom.materialId).kind === 'timber'

/** One runner along the beam, flat or on edge. */
export function beamRunnerSection(inp: BeamInput): Section {
  const s = getSection(inp.bottom.sectionId)
  return inp.bottom.flat ? flat(s) : s
}

/** Bottom member spanning between heads: n stiffeners (flat or on edge) or the bottom sheathing alone. */
export function beamBottomSection(inp: BeamInput): { section: Section; materialId: string } {
  if (inp.bottom.count > 0) {
    const s = getSection(inp.bottom.sectionId)
    return { section: multiple(inp.bottom.flat ? flat(s) : s, inp.bottom.count), materialId: inp.bottom.materialId }
  }
  const t = deckThicknessM(inp.sheathing) * 100
  return { section: rect(inp.b * 100, t, 'bottom', `ท้องแบบกว้าง ${Math.round(inp.b * 100)} ซม. หนา ${t.toFixed(1)} ซม.`), materialId: inp.sheathing.materialId }
}

export function beamSides(inp: BeamInput) {
  const below = inp.h - inp.slabT
  return { outer: inp.type === 'slab' ? below : inp.h, inner: inp.type === 'isolated' ? inp.h : below }
}

export function designBeam(inp: BeamInput): BeamDesign {
  const gamma = inp.loads.gamma
  const timberShear = inp.checkTimberShear ?? true
  const defl = inp.deflection
  const sides = beamSides(inp)
  const hs = Math.max(sides.outer, sides.inner)

  // lateral pressure on the sides: fluid pressure over the full depth (§7.4)
  const pTrace = new Trace()
  const p = pTrace.add({ label: 'แรงดันด้านข้าง (ของเหลว) p = γh', expr: `${fmt(gamma)} × ${inp.h}`, value: gamma * inp.h, unit: 'กก./ม.²', ref: '§7.4' })
  pTrace.add({ label: 'ความสูงแบบข้างที่ออกแบบ', value: hs, unit: 'ม.' })
  const pressure: PressureResult = { Pmax: p, hCrit: inp.h, gamma, trace: pTrace }

  // 1) side sheathing → stud spacing
  const tSh = new Trace()
  const sh: MemberInput = { section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: 'continuous', deflection: defl }
  const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', expr: `${fmt(p)} × 1.00 / 100`, value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
  const shLim = maxSpan(sh, wSh, tSh)
  const a = inp.stud.spacingCm ?? floorTo(shLim.max, 5)
  tSh.add({ label: 'ระยะเคร่าข้างที่ใช้', value: a, unit: 'ซม.' })
  const shChk = checkBeam(sh, wSh, a, tSh)
  const cSheathing = component('sheathing', 'แผ่นผิวแบบข้างคาน', `${sh.section.label} (${sh.material.name})`, shChk.rows, tSh, {
    label: 'ระยะเคร่าข้าง',
    value: a,
    max: shLim.max,
    governing: governingLabel(shLim.governing),
    fixed: inp.stud.spacingCm !== undefined,
  })

  // 2) bottom. 'along': the bottom sheathing spans across the beam between n runners (ไม้เสริมท้อง/คร่าวตามยาว);
  //    'across': it spans along the beam between cross joists (ตงขวาง), which span across between the runners.
  //    The runners carry the concrete to the heads. Load = concrete γh only, as in Example 7.4.
  const q = gamma * inp.h // kg/m²
  const across = inp.bottomDir === 'across'
  const runnerSec = beamRunnerSection(inp)
  const runnerMat = getMaterial(inp.bottom.materialId)
  const bw = runnerSec.B / 100
  const fit = Math.max(2, Math.floor(inp.b / bw + 1e-9))
  const runnerSpan = (k: number) => ((inp.b - bw) / (k - 1)) * 100 // cm, centre to centre
  const supportFor = (k: number): MemberInput['support'] => (k > 2 ? 'continuous' : 'simple')
  const deckOver = (k: number): MemberInput => ({ section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: supportFor(k), deflection: defl })
  const bottomWarnings: string[] = []
  const bottomComps: ComponentResult[] = []
  /** number of runners: as given, or the fewest whose span the member above them can take */
  const pickCount = (over: (k: number) => MemberInput, w: number, trace: Trace, what: string): number => {
    if (!inp.bottom.auto) {
      const k = Math.max(across ? 2 : 1, Math.round(inp.bottom.count))
      if (k > fit) bottomWarnings.push(`ไม้เสริมท้อง ${k} ตัวกว้างรวมเกินความกว้างคาน — ลดจำนวนหรือใช้หน้าตัดเล็กลง`)
      return k
    }
    for (let k = 2; k <= fit; k++)
      if (runnerSpan(k) <= maxSpan(over(k), w).max) {
        trace.add({ label: `จำนวนคร่าวตามยาว (อัตโนมัติ) — ${what}รับช่วง ${runnerSpan(k).toFixed(1)} ซม. ได้`, value: k, unit: 'ตัว' })
        return k
      }
    bottomWarnings.push(`ใส่คร่าวตามยาวเต็มความกว้างคาน (${fit} ตัว) แล้ว${what}ยังรับช่วงไม่ได้ — ใช้${across ? 'ตงขวางหน้าตัดใหญ่ขึ้น' : 'ไม้อัดหนาขึ้น หรือเปลี่ยนเป็นคร่าวขวาง'}`)
    trace.add({ label: 'จำนวนคร่าวตามยาว (เต็มความกว้าง)', value: fit, unit: 'ตัว' })
    return fit
  }

  let n = 0
  let joistSpacing = 0
  let crossJoistH = 0
  if (across) {
    // 2a) sheathing → cross-joist spacing (strip 1.00 m along the beam, continuous over the joists)
    const tDe = new Trace()
    const de: MemberInput = { section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: 'continuous', deflection: defl }
    const wDe = tDe.add({ label: 'น้ำหนักคอนกรีตต่อแถบกว้าง 1 ม. = γh', expr: `${fmt(gamma)} × ${inp.h} / 100`, value: pressureToLineLoad(q, 1), unit: 'กก./ซม.', ref: 'ตัวอย่าง 7.4' })
    const deLim = maxSpan(de, wDe, tDe)
    const cj = beamCrossJoist(inp)
    joistSpacing = cj.spacingCm ?? floorTo(deLim.max, 5)
    tDe.add({ label: 'ระยะตงขวางที่ใช้', value: joistSpacing, unit: 'ซม.' })
    bottomComps.push(
      component('bottomDeck', 'แผ่นท้องแบบ (พาดตามยาวระหว่างตงขวาง)', `${de.section.label} (${de.material.name})`, checkBeam(de, wDe, joistSpacing, tDe).rows, tDe, {
        label: 'ระยะตงขวาง',
        value: joistSpacing,
        max: deLim.max,
        governing: governingLabel(deLim.governing),
        fixed: cj.spacingCm !== undefined,
      }),
    )
    // 2b) cross joists span across the beam between the runners
    const tJo = new Trace()
    const joMat = getMaterial(cj.materialId)
    const joOver = (k: number): MemberInput => ({ section: getSection(cj.sectionId), material: joMat, support: supportFor(k), deflection: defl, checkShear: joMat.kind === 'steel' || timberShear })
    const wJo = tJo.add({ label: 'น้ำหนักแผ่บนตงขวาง', expr: `${fmt(q)} × ${(joistSpacing / 100).toFixed(2)} / 100`, value: pressureToLineLoad(q, joistSpacing / 100), unit: 'กก./ซม.' })
    n = pickCount(joOver, wJo, tJo, 'ตงขวาง')
    const span = runnerSpan(n)
    tJo.add({ label: `ช่วงตงขวาง = (b − กว้างคร่าว) / (${n} − 1)`, expr: `(${(inp.b * 100).toFixed(0)} − ${runnerSec.B.toFixed(1)}) / ${n - 1}`, value: span, unit: 'ซม.' })
    const jo = joOver(n)
    crossJoistH = jo.section.H / 100
    bottomComps.push(component('crossJoist', 'ตงขวางใต้ท้องแบบ', `${jo.section.label} @${joistSpacing} ซม. (${joMat.name})`, checkBeam(jo, wJo, span, tJo).rows, tJo))
  } else if (beamHasRunners(inp)) {
    // 2a) sheathing spans across the beam between the runners (strip 1.00 m along the beam)
    const tDe = new Trace()
    const wDe = tDe.add({ label: 'น้ำหนักคอนกรีตต่อแถบกว้าง 1 ม. = γh', expr: `${fmt(gamma)} × ${inp.h} / 100`, value: pressureToLineLoad(q, 1), unit: 'กก./ซม.', ref: 'ตัวอย่าง 7.4' })
    n = pickCount(deckOver, wDe, tDe, 'แผ่นท้องแบบ')
    if (n >= 2) {
      const span = runnerSpan(n)
      tDe.add({ label: `ช่วงแผ่นท้องขวางคาน = (b − กว้างคร่าว) / (${n} − 1)`, expr: `(${(inp.b * 100).toFixed(0)} − ${runnerSec.B.toFixed(1)}) / ${n - 1}`, value: span, unit: 'ซม.' })
      const de = deckOver(n)
      bottomComps.push(component('bottomDeck', 'แผ่นท้องแบบ (พาดขวางระหว่างไม้เสริมท้อง)', `${de.section.label} (${de.material.name})`, checkBeam(de, wDe, span, tDe).rows, tDe))
    }
  }

  // 2c) runners (or the bottom board alone) → head spacing; heads land on multiples of the stud spacing (Ex 7.1, 7.4)
  const tBo = new Trace()
  let bo: MemberInput
  let wBo: number
  let boLabel: string
  if (n > 0) {
    // the most loaded runner: half the width when there are two, else an interior one — sheathing (or joists)
    // continuous over two spans puts 1.25·w·l on the middle support; 1.25 is kept for more spans (3 spans: 1.10)
    const trib = n === 1 ? inp.b : n === 2 ? inp.b / 2 : (1.25 * runnerSpan(n)) / 100
    tBo.add({
      label: n === 1 ? 'ความกว้างที่ไม้เสริมรับ (ตัวเดียว)' : n === 2 ? 'ความกว้างที่ไม้เสริมแต่ละตัวรับ = b/2' : 'ความกว้างที่ไม้เสริมตัวกลางรับ = 1.25 × ช่วง (แผ่นต่อเนื่อง)',
      expr: n > 2 ? `1.25 × ${runnerSpan(n).toFixed(1)} / 100` : undefined,
      value: trib,
      unit: 'ม.',
    })
    wBo = tBo.add({ label: 'น้ำหนักแผ่บนไม้เสริมท้อง', expr: `${fmt(gamma)} × ${inp.h} × ${trib.toFixed(3)} / 100`, value: (q * trib) / 100, unit: 'กก./ซม.', ref: 'ตัวอย่าง 7.4' })
    bo = { section: runnerSec, material: runnerMat, support: 'continuous', deflection: defl, checkShear: true }
    boLabel = `${n}–${runnerSec.label} (${runnerMat.name})`
  } else {
    const bot = beamBottomSection(inp)
    bo = { section: bot.section, material: getMaterial(bot.materialId), support: 'continuous', deflection: defl, checkShear: true }
    wBo = tBo.add({ label: 'น้ำหนักคอนกรีตบนท้องแบบ', expr: `${fmt(gamma)} × ${inp.b} × ${inp.h} / 100`, value: (gamma * inp.b * inp.h) / 100, unit: 'กก./ซม.', ref: 'ตัวอย่าง 7.4' })
    boLabel = `${bot.section.label} (${bo.material.name})`
  }
  const boLim = maxSpan(bo, wBo, tBo)

  // 3) side studs: simple span between kicker and top restraint, or over the tie rows
  const tSt = new Trace()
  const stMat = getMaterial(inp.stud.materialId)
  const rows = inp.tie.enabled ? Math.max(1, Math.round(inp.tie.rows)) : 0
  const spans = rows + 1
  const span = (hs * 100) / spans
  const st: MemberInput = {
    section: getSection(inp.stud.sectionId),
    material: stMat,
    support: spans >= 3 ? 'continuous' : 'simple',
    deflection: defl,
    checkShear: stMat.kind === 'steel' || timberShear,
    shearReduction: true,
  }
  let stRows: CheckRow[]
  if (rows) {
    // between tie rows: maximum pressure taken uniform (as for walls)
    const wSt = tSt.add({ label: 'น้ำหนักแผ่บนเคร่าข้าง (แรงดันสูงสุดคงที่)', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, a / 100), unit: 'กก./ซม.' })
    tSt.add({ label: `ช่วงเคร่าระหว่างแนวไทร์ (${spans} ช่วง)`, expr: `${(hs * 100).toFixed(0)} / ${spans}`, value: span, unit: 'ซม.' })
    stRows = checkBeam(st, wSt, span, tSt).rows
  } else {
    // simple span kicker → top restraint under the fluid (triangular) pressure: 0 at the top, γ·hs·a at the foot
    const L = span
    const W = tSt.add({ label: 'แรงรวมบนเคร่า (แรงดันสามเหลี่ยม) W = γ·hs²/2 · a', expr: `${fmt(gamma)} × ${hs}² / 2 × ${(a / 100).toFixed(2)}`, value: ((gamma * hs * hs) / 2) * (a / 100), unit: 'กก.' })
    tSt.add({ label: 'ช่วงเคร่า (ขอบเตะแบบ → ปากแบบ)', value: L, unit: 'ซม.' })
    const M = tSt.add({ label: 'M = 2W·L/(9√3)', expr: `2 × ${fmt(W)} × ${L.toFixed(0)} / 15.59`, value: (2 * W * L) / (9 * Math.sqrt(3)), unit: 'กก.-ซม.', ref: 'คานช่วงเดียว น้ำหนักสามเหลี่ยม' })
    const sec = st.section
    const fb = tSt.add({ label: 'fb = M/S', expr: `${fmt(M)} / ${sec.Sx.toFixed(2)} ≤ ${stMat.Fb}`, value: M / sec.Sx, unit: 'กก./ซม.²' })
    stRows = [{ item: 'หน่วยแรงดัด fb', demand: fb, capacity: stMat.Fb, ratio: fb / stMat.Fb, unit: 'กก./ซม.²', ref: 'สมการ 5.2' }]
    const Vcap = shearCapacity(sec, stMat)
    if (st.checkShear && Vcap !== undefined) {
      const V = tSt.add({ label: 'V = 2W/3 (ที่ขอบเตะแบบ)', value: (2 * W) / 3, unit: 'กก.' })
      const fv = tSt.add({ label: 'fv', value: sec.Aweb ? V / sec.Aweb : (3 * V) / (2 * sec.B * sec.H), unit: 'กก./ซม.²' })
      stRows.push({ item: 'หน่วยแรงเฉือน fv', demand: fv, capacity: stMat.Fv!, ratio: fv / stMat.Fv!, unit: 'กก./ซม.²', ref: 'สมการ 5.11' })
    }
    const delta = tSt.add({ label: 'Δ = 0.01304·W·L³/EI', value: (0.01304 * W * L ** 3) / (stMat.E * sec.Ix), unit: 'ซม.' })
    const dAllow = L / (defl?.ratio ?? 360)
    stRows.push({ item: 'การแอ่นตัว Δ', demand: delta, capacity: dAllow, ratio: delta / dAllow, unit: 'ซม.' })
  }
  const cStud = component('stud', 'เคร่าข้างคาน (Studs)', `${st.section.label} @${a} ซม. (${stMat.name})`, stRows, tSt)

  // 4) heads and shores at the head spacing; on long beams the spacing comes down (in stud-spacing steps) until the
  //    heads and shores carry their load, so the shores always sit at a spacing they can take
  const heMat = getMaterial(inp.head.materialId)
  const he = multiple(getSection(inp.head.sectionId), inp.head.count)
  // with stringers the heads span between the stringer rows and the shores stand under the stringers (5b)
  const sg = beamStringer(inp)
  const onStringers = sg.enabled
  const sgRows = Math.max(2, Math.min(3, Math.round(sg.rows)))
  const rowSpan = inp.shore.postSpacingM
  const sgSec = multiple(getSection(sg.sectionId), sg.count)
  const double = !onStringers && inp.shore.layout === 'double'
  const legs = double ? 2 : 1
  const slabOut = inp.type === 'isolated' ? 0 : inp.slabTribM
  const formDepth = deckThicknessM(inp.sheathing) + crossJoistH + (n > 0 ? runnerSec.H / 100 : 0) + he.H / 100 + (onStringers ? sgSec.H / 100 : 0)
  const shoreLength = inp.shore.lengthM ?? inp.clearHeight - formDepth
  const atSpacing = (s: number) => {
    const tHe = new Trace()
    let M: number
    let V: number
    if (onStringers) {
      const qh = tHe.add({ label: 'น้ำหนักแผ่บนคานขวาง', expr: `${fmt(gamma)} × ${inp.h} × ${(s / 100).toFixed(2)}`, value: gamma * inp.h * (s / 100), unit: 'กก./ม.', ref: 'ตัวอย่าง 7.3' })
      const l = rowSpan / (sgRows - 1)
      M = tHe.add({
        label: sgRows === 3 ? 'M = ql²/8 (ต่อเนื่อง 2 ช่วงบนคานแนวยาว 3 แถว)' : 'M = ql²/8 (ช่วงระหว่างคานแนวยาว)',
        expr: `${fmt(qh)} × ${l.toFixed(2)}² / 8 × 100`,
        value: ((qh * l * l) / 8) * 100,
        unit: 'กก.-ซม.',
      })
      V = tHe.add({ label: sgRows === 3 ? 'V = 0.625ql' : 'V = ql/2', expr: `${sgRows === 3 ? '0.625' : '0.5'} × ${fmt(qh)} × ${l.toFixed(2)}`, value: (sgRows === 3 ? 0.625 : 0.5) * qh * l, unit: 'กก.' })
    } else if (double) {
      const qh = tHe.add({ label: 'น้ำหนักแผ่บนคานขวาง (สองเสา)', expr: `${fmt(gamma)} × ${inp.h} × ${(s / 100).toFixed(2)}`, value: gamma * inp.h * (s / 100), unit: 'กก./ม.', ref: 'ตัวอย่าง 7.3' })
      const e = inp.shore.postSpacingM
      M = tHe.add({ label: 'M = ql²/8 (ช่วงระหว่างเสาคู่)', expr: `${fmt(qh)} × ${e}² / 8 × 100`, value: ((qh * e * e) / 8) * 100, unit: 'กก.-ซม.' })
      V = tHe.add({ label: 'V = ql/2', expr: `${fmt(qh)} × ${e} / 2`, value: (qh * e) / 2, unit: 'กก.' })
    } else {
      const Q = tHe.add({ label: 'น้ำหนักท้องคานต่อคานขวาง', expr: `(${fmt(gamma)} × ${inp.b} × ${inp.h} + ${inp.loads.beamFormWeight}) × ${(s / 100).toFixed(2)}`, value: (gamma * inp.b * inp.h + inp.loads.beamFormWeight) * (s / 100), unit: 'กก.' })
      M = tHe.add({ label: 'M = Q·b/8 (ยื่นสองข้างจากเสาตัวที)', expr: `${fmt(Q)} × ${inp.b} / 8 × 100`, value: ((Q * inp.b) / 8) * 100, unit: 'กก.-ซม.', ref: '§7.4' })
      V = tHe.add({ label: 'V = Q/2', value: Q / 2, unit: 'กก.' })
    }
    const fb = tHe.add({ label: 'fb = M/S', expr: `${fmt(M)} / ${he.Sx.toFixed(1)} ≤ ${heMat.Fb}`, value: M / he.Sx, unit: 'กก./ซม.²' })
    const heRows: CheckRow[] = [{ item: 'หน่วยแรงดัด fb', demand: fb, capacity: heMat.Fb, ratio: fb / heMat.Fb, unit: 'กก./ซม.²', ref: 'สมการ 5.2' }]
    if (shearCapacity(he, heMat) !== undefined) {
      const fv = tHe.add({ label: 'fv', expr: he.Aweb ? `${fmt(V)} / ${he.Aweb.toFixed(2)}` : `3×${fmt(V)} / (2×${he.B.toFixed(1)}×${he.H.toFixed(1)})`, value: he.Aweb ? V / he.Aweb : (3 * V) / (2 * he.B * he.H), unit: 'กก./ซม.²' })
      heRows.push({ item: 'หน่วยแรงเฉือน fv', demand: fv, capacity: heMat.Fv!, ratio: fv / heMat.Fv!, unit: 'กก./ซม.²', ref: 'สมการ 5.11' })
    }
    const on = onStringers ? `บนคานแนวยาว ${sgRows} แถว ห่าง ${rowSpan.toFixed(2)} ม.` : double ? `บนเสาคู่ห่าง ${inp.shore.postSpacingM.toFixed(2)} ม.` : 'บนเสาตัวที'
    const cHead = component('head', 'คานขวางรับท้องแบบ (Head)', `${he.label} @${s} ซม. ${on} (${heMat.name})`, heRows, tHe)
    if (onStringers) return { cHead, cShore: undefined, ok: heRows.every((r) => r.ratio <= 1) }

    const tSo = new Trace()
    const sM = s / 100
    const cBeam = tSo.add({ label: 'คอนกรีตคาน', expr: `${fmt(gamma)} × ${inp.b} × ${inp.h} × ${sM.toFixed(2)}`, value: gamma * inp.b * inp.h * sM, unit: 'กก.' })
    const cSlab = slabOut ? tSo.add({ label: 'คอนกรีตพื้นที่ถ่ายลงคาน', expr: `${fmt(gamma)} × ${inp.slabT} × ${slabOut} × ${sM.toFixed(2)}`, value: gamma * inp.slabT * slabOut * sM, unit: 'กก.', ref: 'รูป 7.7' }) : 0
    const forms = tSo.add({ label: 'น้ำหนักแบบหล่อ', expr: `${inp.loads.beamFormWeight} × ${sM.toFixed(2)}${slabOut ? ` + ${inp.loads.formWeight} × ${slabOut} × ${sM.toFixed(2)}` : ''}`, value: inp.loads.beamFormWeight * sM + inp.loads.formWeight * slabOut * sM, unit: 'กก.' })
    const ll = tSo.add({ label: 'น้ำหนักจร', expr: `${inp.loads.liveLoad} × ${(inp.b + slabOut).toFixed(2)} × ${sM.toFixed(2)}`, value: inp.loads.liveLoad * (inp.b + slabOut) * sM, unit: 'กก.' })
    const P = tSo.add({ label: 'น้ำหนักลงเสาค้ำต่อคานขวาง', value: cBeam + cSlab + forms + ll, unit: 'กก.' })
    if (inp.shore.lengthM === undefined)
      tSo.add({ label: 'ความยาวเสา = ความสูงใต้ท้องคาน − ความลึกแบบ', expr: `${inp.clearHeight.toFixed(2)} − ${formDepth.toFixed(3)}`, value: shoreLength, unit: 'ม.' })
    const cShore = designShore({ shore: inp.shore, P, lengthM: shoreLength, legs, trace: tSo, layoutText: `@${s} ซม.` })
    return { cHead, cShore, ok: [cHead, cShore].every((c) => c.rows.every((r) => r.ratio <= 1)) }
  }

  // Ringlock posts under the heads: the head spacing is the ledger between the standards along the beam
  const rl = inp.shore.kind === 'ringlock' ? ringlockSystem(inp.shore.ringlock) : undefined
  const rlHeads = rl && !onStringers ? rl : undefined
  const sFree = boLim.max >= a ? Math.floor(boLim.max / a + 1e-9) * a : floorTo(boLim.max, 5)
  const s0 = inp.head.spacingCm ?? (rlHeads ? snapToLedger(floorTo(boLim.max, 5), rlHeads) : sFree)
  let s = s0
  let fit0 = atSpacing(s)
  if (inp.head.spacingCm === undefined)
    while (!fit0.ok && s > 20) {
      if (rlHeads) {
        const next = ledgerBelow(s, rlHeads)
        if (next === undefined) break
        s = next
      } else s = s >= 2 * a && s % a === 0 ? s - a : Math.max(20, floorTo(s - 5, 5))
      fit0 = atSpacing(s)
    }
  const { cHead } = fit0
  tBo.add({
    label: 'ระยะคานขวางที่ใช้',
    expr:
      s < s0
        ? `ลดจาก ${s0} ซม. ${onStringers ? 'ให้คานขวางรับได้' : 'ให้คานขวางและเสาค้ำรับได้'}${rlHeads ? ' (ความยาวคานนอน Ringlock)' : ''}`
        : inp.head.spacingCm === undefined && rlHeads
          ? `ความยาวคานนอน Ringlock ไม่เกิน ${floorTo(boLim.max, 5)} ซม. (มี ${ledgerText(rlHeads)} ม.)`
          : inp.head.spacingCm === undefined && boLim.max >= a
            ? `ทวีคูณของระยะเคร่า ${a} ซม.`
            : undefined,
    value: s,
    unit: 'ซม.',
  })
  const cBottom = component('bottom', n > 0 ? (across ? 'คร่าวตามยาวรับตงขวาง' : 'ไม้เสริมท้องแบบ (คร่าวตามยาว)') : 'ท้องแบบคาน', boLabel, checkBeam(bo, wBo, s, tBo).rows, tBo, {
    label: 'ระยะคานขวาง',
    value: s,
    max: boLim.max,
    governing: governingLabel(boLim.governing),
    fixed: inp.head.spacingCm !== undefined,
  })

  // 4b) stringer system: the heads load the stringer rows (taken as uniform, the heads being close); each stringer is
  //     continuous over the shores, whose spacing is what the stringer and the post (with its ledgers) can take.
  //     Posts get ledgers both ways at lifts ≤ liftM, and more levels while the post still governs the spacing.
  let cStringer: ComponentResult | undefined
  let cShore = fit0.cShore
  let sgLayout: BeamLayout['stringer']
  let sgShareMax = 0.5
  let ledgerLevels = 0
  if (onStringers) {
    const tSg = new Trace()
    const sgMat = getMaterial(sg.materialId)
    const perM = tSg.add({
      label: 'น้ำหนักลงระบบค้ำยันต่อเมตรตามแนวคาน',
      expr: `${fmt(gamma)}×${inp.b}×${inp.h} + ${inp.loads.beamFormWeight} + ${inp.loads.liveLoad}×${inp.b}${slabOut ? ` + (${fmt(gamma)}×${inp.slabT} + ${inp.loads.formWeight} + ${inp.loads.liveLoad})×${slabOut}` : ''}`,
      value: gamma * inp.b * inp.h + inp.loads.beamFormWeight + inp.loads.liveLoad * inp.b + (gamma * inp.slabT + inp.loads.formWeight + inp.loads.liveLoad) * slabOut,
      unit: 'กก./ม.',
    })
    if (sgRows === 3) {
      const mid = tSg.add({ label: 'สัดส่วนน้ำหนักลงแถวกลาง (คานขวางต่อเนื่อง 2 ช่วง)', value: middleRowShare(inp, rowSpan), unit: '' })
      sgShareMax = tSg.add({ label: 'สัดส่วนที่แถวรับมากที่สุด', expr: `max(${mid.toFixed(3)}, (1 − ${mid.toFixed(3)}) / 2)`, value: Math.max(mid, (1 - mid) / 2), unit: '' })
    } else sgShareMax = tSg.add({ label: 'สัดส่วนน้ำหนักต่อแถว (2 แถว)', value: 0.5, unit: '' })
    const w = tSg.add({ label: 'น้ำหนักแผ่บนคานแนวยาว (แถวที่รับมากที่สุด)', expr: `${fmt(perM)} × ${sgShareMax.toFixed(3)} / 100`, value: (perM * sgShareMax) / 100, unit: 'กก./ซม.' })
    const stm: MemberInput = { section: sgSec, material: sgMat, support: 'continuous', deflection: defl, checkShear: true }
    const stLim = maxSpan(stm, w, tSg)
    const stMax = floorTo(stLim.max, 5)

    // post capacity with k ledger levels (or the rated SWL), limited by the bearing under the base plate
    const post = inp.shore.kind === 'post'
    const capAt = (k: number) => {
      let c = shoreSwl(inp.shore, shoreLength)
      if (post) {
        const ps = getSection(inp.shore.sectionId)
        const pm = getMaterial(ps.shape === 'pipe' && getMaterial(inp.shore.materialId).kind !== 'steel' ? 'steel-a36' : inp.shore.materialId)
        c = columnCapacity(ps, pm, (shoreLength * 100) / (k + 1), new Trace()).P
      }
      return inp.shore.baseCm > 0 && inp.shore.bearing > 0 ? Math.min(c, inp.shore.bearing * (inp.shore.baseCm / 100) ** 2) : c
    }
    const lift = sg.liftM ?? LEDGER_LIFT
    const nMin = post ? Math.max(inp.shore.braceLevels, Math.ceil(shoreLength / lift - 1e-9) - 1) : 0
    ledgerLevels = nMin
    if (post && sg.spacingCm === undefined) while (ledgerLevels < nMin + 3 && capAt(ledgerLevels) / w < stMax) ledgerLevels++
    const byShore = floorTo(capAt(ledgerLevels) / w, 5)
    const free = Math.max(20, Math.min(stMax, byShore))
    const L = sg.spacingCm ?? (rl ? snapToLedger(free, rl) : free)
    tSg.add({
      label: 'ระยะเสาค้ำที่ใช้ (ตามแนวคาน)',
      expr:
        sg.spacingCm === undefined && rl
          ? `ความยาวคานนอน Ringlock ไม่เกิน ${free} ซม. (มี ${ledgerText(rl)} ม.)`
          : sg.spacingCm === undefined && byShore < stMax
            ? `เสาค้ำรับได้ที่ ${byShore} ซม.`
            : undefined,
      value: L,
      unit: 'ซม.',
    })
    cStringer = component('stringer', 'คานแนวยาวรับคานขวาง (Stringers)', `${sgSec.label} ${sgRows} แถว ห่าง ${rowSpan.toFixed(2)} ม. (${sgMat.name})`, checkBeam(stm, w, L, tSg).rows, tSg, {
      label: 'ระยะเสาค้ำ',
      value: L,
      max: stLim.max,
      governing: governingLabel(stLim.governing),
      fixed: sg.spacingCm !== undefined,
    })

    const tSo = new Trace()
    tSo.add({ label: 'น้ำหนักแผ่บนคานแนวยาว', value: w * 100, unit: 'กก./ม.' })
    const P = tSo.add({ label: 'น้ำหนักลงเสาค้ำ P = w × L', expr: `${fmt(w * 100)} × ${(L / 100).toFixed(2)}`, value: w * L, unit: 'กก.' })
    if (inp.shore.lengthM === undefined)
      tSo.add({ label: 'ความยาวเสา = ความสูงใต้ท้องคาน − ความลึกแบบ', expr: `${inp.clearHeight.toFixed(2)} − ${formDepth.toFixed(3)}`, value: shoreLength, unit: 'ม.' })
    const ledgerY = Array.from({ length: ledgerLevels }, (_, k) => Math.round(((k + 1) * shoreLength * 1000) / (ledgerLevels + 1)) / 1000)
    if (post)
      tSo.add({
        label: `ท่อยึดแนวราบ (ท่อแนวรอง) ยึดเสาทั้งตามแนวคานและขวางคาน — ช่วงไม่เกิน ${lift} ม.${ledgerLevels > nMin ? ' และเพิ่มจนเสาไม่เป็นตัวกำหนดระยะ' : ''}`,
        expr: ledgerY.length ? `สูงจากฐาน ${ledgerY.map((y) => y.toFixed(2)).join(', ')} ม.` : 'ไม่ต้องใช้',
        value: ledgerLevels,
        unit: 'ระดับ',
      })
    cShore = designShore({ shore: { ...inp.shore, braceLevels: ledgerLevels }, P, lengthM: shoreLength, trace: tSo, layoutText: `@${L} ซม. × ${sgRows} แถว` })

    const shoreX = rl ? ledgerRow(inp.length, L, rl, Math.min(0.2, L / 200)) : spread(inp.length, L / 100, Math.min(0.2, L / 200))
    const bays = shoreX.length - 1
    const k = Math.max(1, Math.min(braceBays(L / 100, shoreLength), bays))
    const sets = braceSets(bays, k)
    sgLayout = {
      z: Array.from({ length: sgRows }, (_, r) => Math.round((-rowSpan / 2 + (r * rowSpan) / (sgRows - 1)) * 1000) / 1000),
      shoreX,
      shoreSpacing: L,
      ledgerY,
      braceSets: sets,
      braceBays: k,
      acrossLines: [...new Set([...sets, bays])].sort((p, q) => p - q),
    }
  }

  // 5) deep beams: wales over the ties at each head, and the ties
  const tieComps: ComponentResult[] = []
  if (rows) {
    const tWa = new Trace()
    const waMat = getMaterial(inp.tie.waleMaterialId)
    const wa: MemberInput = { section: multiple(getSection(inp.tie.waleSectionId), 2), material: waMat, support: 'continuous', deflection: defl, checkShear: waMat.kind === 'steel' || timberShear, shearReduction: true }
    const wWa = tWa.add({ label: 'น้ำหนักแผ่บนคานรับเคร่า', expr: `${fmt(p)} × ${(span / 100).toFixed(2)} / 100`, value: pressureToLineLoad(p, span / 100), unit: 'กก./ซม.' })
    tWa.add({ label: 'ช่วงคานรับเคร่า = ระยะไทร์ = ระยะคานขวาง', value: s, unit: 'ซม.' })
    const waChk = checkBeam(wa, wWa, s, tWa)
    tieComps.push(component('wale', 'คานรับเคร่า (Wales)', `${wa.section.label} ${rows} แนว (${waMat.name})`, waChk.rows, tWa))
    const tTi = new Trace()
    const tie = getTie(inp.tie.tieId)
    const T = tTi.add({ label: 'แรงดึงในไทร์ = p × พื้นที่รับแรง', expr: `${fmt(p)} × ${(span / 100).toFixed(2)} × ${(s / 100).toFixed(2)}`, value: (p * span * s) / 1e4, unit: 'กก.', ref: 'รูป 7.8' })
    tieComps.push(component('tie', 'เหล็กยึดรั้ง (Form tie)', `${tie.name} ${rows} แนว @${s} ซม.`, [{ item: 'แรงดึง', demand: T, capacity: tie.swl, ratio: T / tie.swl, unit: 'กก.', ref: tie.ref }], tTi))
  }

  // 6) lateral bracing along the beam (ACI 347): one X per row of posts, the row carrying its share of the width
  const bracing = beamBracing(inp)
  const headX = rlHeads ? ledgerRow(inp.length, s, rlHeads, Math.min(0.1, s / 200)) : spread(inp.length, s / 100, Math.min(0.1, s / 200))
  const bracingComps: ComponentResult[] = []
  if (sgLayout) {
    // stringer system: X-bracing along every stringer row and across the beam at the braced post lines
    const bays = sgLayout.shoreX.length - 1
    if (bracing.enabled && bays > 0) {
      const width = inp.b + slabOut
      const deadPerM = gamma * inp.b * inp.h + gamma * inp.slabT * slabOut + inp.loads.beamFormWeight + inp.loads.formWeight * slabOut
      const L = sgLayout.shoreSpacing / 100
      const c = designShoreBracing({
        sectionId: bracing.sectionId,
        materialId: bracing.materialId,
        dead: deadPerM / width,
        height: shoreLength,
        ledgers: sgLayout.ledgerY.length,
        dirs: [
          { name: 'ตามแนวคาน (ต่อแถวคานแนวยาว)', rowLength: inp.length, tributary: width * sgShareMax, bay: L },
          { name: 'ขวางคาน (ต่อแนวเสา)', rowLength: rowSpan, tributary: L, bay: rowSpan / (sgRows - 1), maxBays: sgRows - 1 },
        ],
      })
      const { braceSets: sets, braceBays: k, acrossLines, shoreX } = sgLayout
      c.trace.add({
        label: `ตำแหน่งค้ำยันทแยงตามแนวคาน ทุกแถว — ช่วงปลายทั้งสองข้าง และเว้นไม่เกิน 3 ช่วงเสา (ทแยงคร่อม ${k} ช่วง)`,
        expr: `ช่วงเสาที่ ${sets.map((j) => (k > 1 ? `${j + 1}–${j + k}` : `${j + 1}`)).join(', ')} จาก ${bays} ช่วง`,
        value: sets.length,
        unit: 'ชุด/แถว',
      })
      c.trace.add({
        label: 'ตำแหน่งค้ำยันทแยงขวางคาน (ยึดทุกแถวคานแนวยาว)',
        expr: `ที่แนวเสา x = ${acrossLines.map((j) => shoreX[j].toFixed(2)).join(', ')} ม.`,
        value: acrossLines.length,
        unit: 'แนว',
      })
      bracingComps.push(c)
    }
  } else if (bracing.enabled && headX.length > 1) {
    const width = inp.b + slabOut
    const deadPerM = gamma * inp.b * inp.h + gamma * inp.slabT * slabOut + inp.loads.beamFormWeight + inp.loads.formWeight * slabOut
    bracingComps.push(
      designShoreBracing({
        sectionId: bracing.sectionId,
        materialId: bracing.materialId,
        dead: deadPerM / width,
        height: shoreLength,
        dirs: [{ name: `ตามแนวคาน${double ? ' (ต่อแถวเสา)' : ''}`, rowLength: inp.length, tributary: width / legs, bay: s / 100 }],
      }),
    )
  }

  // 7) top-of-form braces for isolated / spandrel beams (Fig 7.9); beams with slab are held by the slab joists
  const braceSides = inp.type === 'isolated' ? 2 : inp.type === 'spandrel' ? 1 : 0
  const braceComps: ComponentResult[] = []
  if (braceSides && !rows) {
    const tBr = new Trace()
    const hTop = sides.outer
    const Rt = tBr.add({ label: 'แรงที่ปากแบบต่อเมตร (แรงดันสามเหลี่ยม, คานช่วงเดียว) γh²/6', expr: `${fmt(gamma)} × ${hTop}² / 6`, value: (gamma * hTop * hTop) / 6, unit: 'กก./ม.' })
    const th = (inp.brace.angleDeg * Math.PI) / 180
    const F = tBr.add({ label: 'แรงในค้ำยันปากแบบ', expr: `${fmt(Rt)} × ${(s / 100).toFixed(2)} / cos${inp.brace.angleDeg}°`, value: (Rt * s) / 100 / Math.cos(th), unit: 'กก.', ref: 'รูป 7.9' })
    const L = tBr.add({ label: 'ความยาวค้ำยัน', expr: `${hTop} / sin${inp.brace.angleDeg}°`, value: (hTop / Math.sin(th)) * 100, unit: 'ซม.' })
    const bs = getSection(inp.brace.sectionId)
    const bm = getMaterial(inp.brace.materialId)
    const cap = columnCapacity(bs, bm, L, tBr)
    braceComps.push(component('brace', 'ค้ำยันปากแบบ (ค้ำยันทแยง)', `${bs.label} (${bm.name}) ${braceSides === 2 ? 'ทั้งสองข้าง' : 'ด้านนอก'} @${s} ซม. มุม ${inp.brace.angleDeg}°`, [{ item: 'แรงอัดในค้ำยัน', demand: F, capacity: cap.P, ratio: F / cap.P, unit: 'กก.', ref: 'สมการ 5.15' }], tBr))
  }

  const warnings: string[] = [...bottomWarnings]
  if (onStringers) {
    if (inp.head.spacingCm === undefined && !fit0.ok) warnings.push('ลดระยะคานขวางถึง 20 ซม. แล้วยังรับไม่ได้ — ใช้คานขวางใหญ่ขึ้น หรือเพิ่มคานแนวยาวเป็น 3 แถว')
    else if (s < s0) warnings.push(`ระยะคานขวางลดจาก ${s0} เหลือ ${s} ซม. เพื่อให้คานขวางรับน้ำหนักได้`)
    if (sgRows === 2 && inp.b > 1) warnings.push('คานกว้างเกิน 1.00 ม. — พิจารณาคานแนวยาว 3 แถว')
  } else {
    if (inp.head.spacingCm === undefined && !fit0.ok) warnings.push('ลดระยะเสาค้ำถึง 20 ซม. แล้วยังรับไม่ได้ — ใช้เสาคู่ หน้าตัดเสา/คานขวางใหญ่ขึ้น หรือเพิ่มค้ำยันกลางความสูง')
    else if (s < s0) warnings.push(`ระยะคานขวาง/เสาค้ำลดจาก ${s0} เหลือ ${s} ซม. เพื่อให้คานขวางและเสาค้ำรับน้ำหนักได้${s < 50 ? ' — เสาถี่ ควรใช้เสาคู่หรือเสาหน้าตัดใหญ่ขึ้น' : ''}`)
    if (!double && inp.b > 0.6) warnings.push('คานกว้างเกิน 60 ซม. บนเสาตัวที — ควรใช้เสาคู่คร่อมท้องคาน')
  }
  if (!across && inp.b > 0.8) warnings.push('คานกว้างเกิน 80 ซม. — พิจารณาใช้คร่าวขวาง (ตงขวาง → คร่าวตามยาว)')
  if (rl) {
    const off = (cm: number) => !isLedger(Math.round(cm), rl)
    const lens = `(${ledgerText(rl)} ม.)`
    if (!onStringers && inp.head.spacingCm !== undefined && off(s)) warnings.push(`ระยะคานขวาง ${s} ซม. ไม่ตรงความยาวคานนอน Ringlock ${lens}`)
    if (double && off(inp.shore.postSpacingM * 100)) warnings.push(`ระยะเสาคู่ ${inp.shore.postSpacingM.toFixed(2)} ม. ไม่ตรงความยาวคานนอน Ringlock ${lens}`)
    if (onStringers && off((rowSpan * 100) / (sgRows - 1))) warnings.push(`ระยะแถวเสาขวางคาน ${(rowSpan / (sgRows - 1)).toFixed(2)} ม. ไม่ตรงความยาวคานนอน Ringlock ${lens}`)
    if (onStringers && sg.spacingCm !== undefined && off(sg.spacingCm)) warnings.push(`ระยะเสาค้ำตามแนวคาน ${sg.spacingCm} ซม. ไม่ตรงความยาวคานนอน Ringlock ${lens}`)
  }
  if (double && inp.shore.postSpacingM < inp.b) warnings.push('ระยะเสาคู่แคบกว่าความกว้างคาน — ควรวางเสาให้คร่อมท้องคาน')
  if (onStringers && rowSpan < inp.b) warnings.push('ระยะแถวคานแนวยาวแคบกว่าความกว้างคาน — ควรวางคร่อมท้องคาน')
  if (inp.h > 0.9 && !rows) warnings.push('คานลึกเกิน 0.90 ม. — พิจารณาใช้ Form tie ยึดแบบข้าง (รูป 7.8)')
  if (inp.type !== 'slab' && rows === 0 && braceSides === 0) warnings.push('ปากแบบไม่มีการยึด')
  if (inp.type === 'slab') warnings.push('ปากแบบยึดด้วยตงพื้นที่ตอกยึดกับเคร่าข้าง (ตัวอย่าง 7.2) — ไม่คำนวณค้ำยันปากแบบ')
  if (onStringers && inp.shore.lengthM !== undefined && Math.abs(inp.shore.lengthM - (inp.clearHeight - formDepth)) > 0.3)
    warnings.push(`ความยาวเสาที่กำหนด ${inp.shore.lengthM.toFixed(2)} ม. ไม่ตรงกับความสูงใต้ท้องคาน − ความลึกแบบ (${(inp.clearHeight - formDepth).toFixed(2)} ม.) — ตรวจสอบความยาวเสา หรือเว้นว่างให้คำนวณ`)
  if (onStringers) {
    if (inp.shore.kind === 'rated' && shoreLength > 3) warnings.push('เสาค้ำยาวเกิน 3 ม. — ยึดท่อแนวราบตามคำแนะนำผู้ผลิต')
    if (!bracing.enabled && sgLayout && sgLayout.shoreX.length > 1) warnings.push('ไม่ได้ออกแบบค้ำยันทางข้าง — ต้องยึดทแยงทั้งตามแนวคานและขวางคาน (ACI 347)')
  } else {
    if (inp.shore.kind === 'post' && inp.shore.braceLevels === 0 && shoreLength > 3) warnings.push('เสาค้ำยาวเกิน 3 ม. โดยไม่มีค้ำยันทางข้าง — ควรเพิ่มค้ำยันกลางความสูง')
    if (!bracing.enabled && headX.length > 1) warnings.push('ไม่ได้ออกแบบค้ำยันทางข้าง — แถวเสาค้ำใต้คานต้องยึดทแยงตามแนวคาน (ACI 347)')
  }

  const studX = spread(inp.length, a / 100)
  const crossJoistX = across ? spread(inp.length, joistSpacing / 100, 0.05) : []
  const tieLevels = Array.from({ length: rows }, (_, k) => Math.round(((k + 1) * hs * 1000) / spans) / 1000)
  return {
    ...summarize(pressure, [cSheathing, cStud, ...tieComps, ...bottomComps, cBottom, cHead, ...(cStringer ? [cStringer] : []), cShore!, ...bracingComps, ...braceComps], warnings),
    layout: {
      studSpacing: a,
      headSpacing: s,
      studX,
      headX,
      sideOuter: sides.outer,
      sideInner: sides.inner,
      tieLevels,
      shoreLength,
      bottomZ: n === 0 ? [] : n === 1 ? [0] : Array.from({ length: n }, (_, k) => Math.round((-inp.b / 2 + bw / 2 + (k * runnerSpan(n)) / 100) * 1000) / 1000),
      crossJoistX,
      crossJoistSpacing: across ? joistSpacing : undefined,
      stringer: sgLayout,
    },
    quantities: {
      plywoodArea: (sides.outer + sides.inner + inp.b) * inp.length,
      studs: 2 * studX.length,
      studLength: studX.length * (sides.outer + sides.inner),
      bottomLength: n * inp.length,
      crossJoists: crossJoistX.length,
      heads: headX.length * inp.head.count,
      stringerLength: sgLayout ? sgRows * sg.count * inp.length : 0,
      shores: sgLayout ? sgRows * sgLayout.shoreX.length : headX.length * legs,
      ledgerLength: sgLayout ? ledgerLevels * (sgRows * inp.length + sgLayout.shoreX.length * rowSpan) : 0,
      braces: rows ? 0 : headX.length * braceSides,
      bracing: !bracingComps.length
        ? 0
        : sgLayout
          ? 2 * (sgRows * sgLayout.braceSets.length + sgLayout.acrossLines.length)
          : legs * 2 * (headX.length - 1 > 2 * Math.min(braceBays(s / 100, shoreLength), headX.length - 1) ? 2 : 1),
      ties: rows * headX.length,
    },
  }
}
