// Slab formwork design — book Chapter 6 (§6.4, Examples 6.1–6.2).
// Load path: sheathing → joists (ตง) → stringers (คานรองรับ) → shores (เสาค้ำ) → base plate, plus lateral bracing.
// All members continuous over > 3 spans (M = wl²/10, Δ = wl⁴/128EI); spacings rounded down to 5 cm as the book does.
import { component, type ComponentResult, type DesignResult, governingLabel, summarize } from './design'
import { getMaterial } from './materials'
import { checkBeam, type DeflectionCriteria, maxSpan, type MemberInput } from './member'
import type { PressureResult } from './pressure'
import { getSection, multiple, plywoodStrip, rect, type Section } from './sections'
import { isLedger, ledgerRow, ledgerText, ringlockSystem, snapToLedger } from './ringlock'
import { DEFAULT_SHORE, designShore, designShoreBracing, type ShoreParams } from './shoring'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'

export type DeckSheathing =
  | { type: 'plywood'; materialId: string; thicknessMm: number }
  | { type: 'board'; materialId: string; thicknessCm: number }

export interface VerticalLoads {
  /** live / construction load during placing, kg/m² (book examples: 150) */
  liveLoad: number
  /** formwork self-weight, kg/m² (book: 50) */
  formWeight: number
  /** concrete unit weight, kg/m³ */
  gamma: number
}

export interface SlabInput {
  /** slab thickness, m */
  thickness: number
  /** panel size, m (x = along stringers, y = along joists) */
  lengthX: number
  lengthY: number
  /** floor to slab soffit, m */
  clearHeight: number
  loads: VerticalLoads
  sheathing: DeckSheathing
  joist: { sectionId: string; materialId: string; spacingCm?: number }
  /** stringer spacing = joist span */
  stringer: { sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number }
  /** spacingCm = shore spacing along the stringer */
  shore: ShoreParams & { spacingCm?: number }
  bracing: { enabled: boolean; sectionId: string; materialId: string }
  deflection?: DeflectionCriteria
  /** shear check on timber joists (the book's slab examples check shear on stringers only). Default true. */
  checkTimberShear?: boolean
}

export interface SlabLayout {
  joistSpacing: number // cm
  stringerSpacing: number // cm
  shoreSpacing: number // cm
  joistX: number[] // m
  stringerY: number[] // m
  shoreX: number[] // m
  /** shore length, m */
  shoreLength: number
  /** top of shores = underside of stringers, m */
  shoreTop: number
}

export interface SlabQuantities {
  plywoodArea: number
  plywoodSheets: number
  joists: number
  joistLength: number
  stringerLength: number
  shores: number
  bracing: number
}

export interface SlabDesign extends DesignResult {
  layout: SlabLayout
  quantities: SlabQuantities
}

export const DEFAULT_SLAB: SlabInput = {
  thickness: 0.15,
  lengthX: 6,
  lengthY: 4,
  clearHeight: 3,
  loads: { liveLoad: 150, formWeight: 50, gamma: 2400 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 20 },
  joist: { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
  stringer: { sectionId: 'timber-2x6', materialId: 'timber-yang', count: 1 },
  shore: { ...DEFAULT_SHORE },
  bracing: { enabled: true, sectionId: 'pipe-4.86', materialId: 'steel-a36' },
}

/** Deck sheathing as a 100 cm strip (plywood or boards laid side by side). */
export function deckSection(sh: DeckSheathing, widthCm = 100): Section {
  if (sh.type === 'plywood') return plywoodStrip(sh.thicknessMm, widthCm)
  return { ...rect(widthCm, sh.thicknessCm, `board-${sh.thicknessCm}`, `ไม้กระดานหนา ${sh.thicknessCm} ซม.`), shape: 'plywood' }
}

export const deckThicknessM = (sh: DeckSheathing) => (sh.type === 'plywood' ? sh.thicknessMm / 1000 : sh.thicknessCm / 100)

/** Positions 0 … L at equal spacing ≤ s, optionally inset from both ends. */
export function spread(L: number, s: number, inset = 0): number[] {
  const len = Math.max(L - 2 * inset, 0)
  const n = Math.max(1, Math.ceil(len / s - 1e-9))
  return Array.from({ length: n + 1 }, (_, i) => Math.round((inset + (i * len) / n) * 1000) / 1000)
}

/** Vertical load on the deck (book §6.4 step 1): w = γt + LL + forms. */
export function slabLoad(t: number, loads: VerticalLoads): PressureResult & { dead: number } {
  const trace = new Trace()
  const conc = trace.add({ label: 'น้ำหนักคอนกรีต', expr: `${fmt(loads.gamma)} × ${t}`, value: loads.gamma * t, unit: 'กก./ม.²' })
  trace.add({ label: 'น้ำหนักจรระหว่างทำงาน', value: loads.liveLoad, unit: 'กก./ม.²', ref: '§6.4' })
  trace.add({ label: 'น้ำหนักแบบหล่อ', value: loads.formWeight, unit: 'กก./ม.²' })
  const w = trace.add({ label: 'น้ำหนักบรรทุกรวม w', expr: `${fmt(conc)} + ${loads.liveLoad} + ${loads.formWeight}`, value: conc + loads.liveLoad + loads.formWeight, unit: 'กก./ม.²', ref: 'ตัวอย่าง 6.1' })
  return { Pmax: w, hCrit: t, gamma: loads.gamma, trace, dead: conc + loads.formWeight }
}

export function designSlab(inp: SlabInput): SlabDesign {
  const load = slabLoad(inp.thickness, inp.loads)
  const W = load.Pmax
  const defl = inp.deflection
  const components: ComponentResult[] = []
  const timberShear = inp.checkTimberShear ?? true
  // Ringlock: the shore grid (stringer spacing × shore spacing) is built of ledgers, so both snap down to a ledger
  const rl = inp.shore.kind === 'ringlock' ? ringlockSystem(inp.shore.ringlock) : undefined
  const toLedger = (cm: number, trace: Trace, what: string) => {
    if (!rl) return cm
    const v = snapToLedger(cm, rl)
    trace.add({ label: `${what} ปัดลงเป็นความยาวคานนอน Ringlock`, expr: `${cm} ซม. → คานนอน ${(v / 100).toFixed(2)} ม. (มี ${ledgerText(rl)} ม.)`, value: v, unit: 'ซม.' })
    return v
  }

  // 1) sheathing → joist spacing (strip 1.00 m, continuous)
  const tSh = new Trace()
  const sh: MemberInput = { section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: 'continuous', deflection: defl }
  const wSh = tSh.add({ label: 'น้ำหนักต่อแถบกว้าง 1 ม.', expr: `${fmt(W)} × 1.00 / 100`, value: pressureToLineLoad(W, 1), unit: 'กก./ซม.' })
  const shLim = maxSpan(sh, wSh, tSh)
  const a = inp.joist.spacingCm ?? floorTo(shLim.max, 5)
  tSh.add({ label: 'ระยะตงที่ใช้', value: a, unit: 'ซม.' })
  const shChk = checkBeam(sh, wSh, a, tSh)
  components.push(
    component('sheathing', 'แผ่นพื้นแบบ (Sheathing)', `${sh.section.label} (${sh.material.name})`, shChk.rows, tSh, {
      label: 'ระยะตง',
      value: a,
      max: shLim.max,
      governing: governingLabel(shLim.governing),
      fixed: inp.joist.spacingCm !== undefined,
    }),
  )

  // 2) joists → stringer spacing
  const tJo = new Trace()
  const joMat = getMaterial(inp.joist.materialId)
  const jo: MemberInput = { section: getSection(inp.joist.sectionId), material: joMat, support: 'continuous', deflection: defl, checkShear: joMat.kind === 'steel' || timberShear }
  const wJo = tJo.add({ label: 'น้ำหนักแผ่บนตง', expr: `${fmt(W)} × ${(a / 100).toFixed(2)} / 100`, value: pressureToLineLoad(W, a / 100), unit: 'กก./ซม.' })
  const joLim = maxSpan(jo, wJo, tJo)
  const l = inp.stringer.spacingCm ?? toLedger(floorTo(joLim.max, 5), tJo, 'ระยะคานรองรับ')
  tJo.add({ label: 'ระยะคานรองรับที่ใช้ (ช่วงตง)', value: l, unit: 'ซม.' })
  const joChk = checkBeam(jo, wJo, l, tJo)
  components.push(
    component('joist', 'ตง (Joists)', `${jo.section.label} @${a} ซม. (${joMat.name})`, joChk.rows, tJo, {
      label: 'ระยะคานรองรับ',
      value: l,
      max: joLim.max,
      governing: governingLabel(joLim.governing),
      fixed: inp.stringer.spacingCm !== undefined,
    }),
  )

  // 3) stringers → shore spacing (shear always checked, eq 5.11 — Ex 6.1 step 4)
  const tSt = new Trace()
  const stMat = getMaterial(inp.stringer.materialId)
  const st: MemberInput = { section: multiple(getSection(inp.stringer.sectionId), inp.stringer.count), material: stMat, support: 'continuous', deflection: defl, checkShear: true }
  const wSt = tSt.add({ label: 'น้ำหนักแผ่บนคานรองรับ', expr: `${fmt(W)} × ${(l / 100).toFixed(2)} / 100`, value: pressureToLineLoad(W, l / 100), unit: 'กก./ซม.' })
  const stLim = maxSpan(st, wSt, tSt)
  const L = inp.shore.spacingCm ?? toLedger(floorTo(stLim.max, 5), tSt, 'ระยะเสาค้ำ')
  tSt.add({ label: 'ระยะเสาค้ำที่ใช้', value: L, unit: 'ซม.' })
  const stChk = checkBeam(st, wSt, L, tSt)
  components.push(
    component('stringer', 'คานรองรับ (Stringers)', `${st.section.label} @${l} ซม. (${stMat.name})`, stChk.rows, tSt, {
      label: 'ระยะเสาค้ำ',
      value: L,
      max: stLim.max,
      governing: governingLabel(stLim.governing),
      fixed: inp.shore.spacingCm !== undefined,
    }),
  )

  // 4) shores
  const formDepth = deckThicknessM(inp.sheathing) + jo.section.H / 100 + st.section.H / 100
  const shoreTop = inp.clearHeight - formDepth
  const shoreLength = inp.shore.lengthM ?? shoreTop
  const tSo = new Trace()
  tSo.add({ label: 'พื้นที่รับน้ำหนักต่อต้น', expr: `${(l / 100).toFixed(2)} × ${(L / 100).toFixed(2)}`, value: (l / 100) * (L / 100), unit: 'ม.²' })
  const P = tSo.add({ label: 'น้ำหนักลงเสาค้ำ P', expr: `${fmt(W)} × ${(l / 100).toFixed(2)} × ${(L / 100).toFixed(2)}`, value: W * (l / 100) * (L / 100), unit: 'กก.', ref: '§6.4 ขั้น 5' })
  if (inp.shore.lengthM === undefined)
    tSo.add({ label: 'ความยาวเสา = ความสูงใต้ท้องพื้น − ความลึกแบบ', expr: `${inp.clearHeight.toFixed(2)} − ${formDepth.toFixed(3)}`, value: shoreTop, unit: 'ม.' })
  components.push(designShore({ shore: inp.shore, P, lengthM: shoreLength, trace: tSo, layoutText: `@${l}×${L} ซม.` }))

  // 5) lateral bracing of the shoring
  const joistX = spread(inp.lengthX, a / 100)
  // Ringlock: whole ledgers between the standards, one shorter ledger for the rest
  const stringerY = rl ? ledgerRow(inp.lengthY, l, rl, Math.min(0.15, l / 200)) : spread(inp.lengthY, l / 100, Math.min(0.15, l / 200))
  const shoreX = rl ? ledgerRow(inp.lengthX, L, rl, Math.min(0.2, L / 200)) : spread(inp.lengthX, L / 100, Math.min(0.2, L / 200))
  if (inp.bracing.enabled)
    components.push(
      designShoreBracing({
        sectionId: inp.bracing.sectionId,
        materialId: inp.bracing.materialId,
        dead: load.dead,
        height: shoreLength,
        dirs: [
          { name: 'แนว X (ตามคานรองรับ)', rowLength: inp.lengthX, tributary: l / 100, bay: L / 100 },
          { name: 'แนว Y (ขวางคานรองรับ)', rowLength: inp.lengthY, tributary: L / 100, bay: l / 100 },
        ],
      }),
    )

  const warnings: string[] = []
  if (inp.shore.kind === 'post' && inp.shore.braceLevels === 0 && shoreLength > 3) warnings.push('เสาค้ำยาวเกิน 3 ม. โดยไม่มีค้ำยันทางข้าง — ควรเพิ่มค้ำยันกลางความสูง')
  if (rl)
    for (const [v, what, fixed] of [[l, 'ระยะคานรองรับ', inp.stringer.spacingCm], [L, 'ระยะเสาค้ำ', inp.shore.spacingCm]] as const)
      if (fixed !== undefined && !isLedger(v, rl)) warnings.push(`${what} ${v} ซม. ไม่ตรงความยาวคานนอน Ringlock (${ledgerText(rl)} ม.)`)
  if (!inp.bracing.enabled) warnings.push('ไม่ได้ออกแบบค้ำยันทางข้าง — ระบบเสาค้ำต้องยึดทางข้างทั้งสองทิศทาง (§6.2)')

  const area = inp.lengthX * inp.lengthY
  const rowsX = (inp.bracing.enabled ? 2 : 0) * stringerY.length
  const rowsY = (inp.bracing.enabled ? 2 : 0) * shoreX.length
  return {
    ...summarize(load, components, warnings),
    loadKind: 'vertical',
    layout: { joistSpacing: a, stringerSpacing: l, shoreSpacing: L, joistX, stringerY, shoreX, shoreLength, shoreTop },
    quantities: {
      plywoodArea: area,
      plywoodSheets: inp.sheathing.type === 'plywood' ? Math.ceil(area / (1.22 * 2.44)) : 0,
      joists: joistX.length,
      joistLength: joistX.length * inp.lengthY,
      stringerLength: stringerY.length * inp.stringer.count * inp.lengthX,
      shores: stringerY.length * shoreX.length,
      bracing: rowsX + rowsY,
    },
  }
}
