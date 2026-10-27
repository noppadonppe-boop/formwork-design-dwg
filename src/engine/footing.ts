// Footing formwork design — book Chapter 10 (§10.4, Examples 10.1–10.3).
// Side forms like a low wall; studs held in one of three ways (§10.4):
//   cantilever — studs/stakes driven into the ground;
//   braced     — studs span between a bottom stake and diagonal braces to stakes in the soil (Ex 10.1);
//   tied       — studs continuous over wales with through-ties, as a wall form (Ex 10.2, 10.3).
import { component, type ComponentResult, DEFAULT_BRACE, type DesignResult, governingLabel, pickModule, type PressureParams, STUD_MODULES, summarize } from './design'
import { getMaterial } from './materials'
import { type CheckRow, checkBeam, columnCapacity, type DeflectionCriteria, maxSpan, type MemberInput } from './member'
import { lateralPressure } from './pressure'
import { getSection } from './sections'
import { type DeckSheathing, deckSection } from './slab'
import { Trace } from './trace'
import { floorTo, fmt, pressureToLineLoad } from './units'
import { designWall } from './wall'

export type FootingSupport = 'cantilever' | 'braced' | 'tied'

export interface FootingInput {
  /** plan size, m */
  lengthX: number
  lengthY: number
  /** footing depth = side form height, m */
  height: number
  pressure: PressureParams
  sheathing: DeckSheathing
  stud: { sectionId: string; materialId: string; spacingCm?: number }
  support: FootingSupport
  /** braced: diagonal braces at every stud; spacingCm = support spacing along the stud */
  brace: { sectionId: string; materialId: string; angleDeg: number; spacingCm?: number; topOverhangM: number }
  /** tied: wales and through-ties (ties run across the shorter plan dimension) */
  wale: { sectionId: string; materialId: string; count: 1 | 2; spacingCm?: number; addCm?: number; bottomOffsetM: number }
  tie: { tieId: string; spacingCm?: number }
  /** stakes (หลัก) at every stud; embedM = embedment provided; boardCm = board behind the brace stake */
  stake: { sectionId: string; embedM: number; boardCm: number }
  /** allowable soil bearing for stakes, kg/m² (Ex 10.1: 10 t/m²) */
  soilBearing: number
  /** lean concrete thickness, m */
  leanM: number
  deflection?: DeflectionCriteria
  checkTimberShear?: boolean
}

export interface FootingLayout {
  studSpacing: number // cm
  /** braced: brace levels above the base, m; tied: wale levels */
  braceLevels: number[]
  waleLevels: number[]
  supportSpacing?: number // cm
  waleSpacing?: number // cm
  tieSpacing?: number // cm
}

export interface FootingDesign extends DesignResult {
  layout: FootingLayout
  quantities: { plywoodArea: number; studs: number; studLength: number; braces: number; stakes: number; waleLength: number; ties: number }
}

export const DEFAULT_FOOTING: FootingInput = {
  lengthX: 2.4,
  lengthY: 2.4,
  height: 1.0,
  pressure: { method: 'CEB', R: 2, T: 30, slump: 10 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
  support: 'braced',
  brace: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', angleDeg: 45, topOverhangM: 0.2 },
  wale: { sectionId: 'timber-2x4', materialId: 'timber-yang', count: 2, addCm: 10, bottomOffsetM: 0.15 },
  tie: { tieId: 'tie-1/2' },
  stake: { sectionId: 'timber-1.5x3', embedM: 0.7, boardCm: 25 },
  soilBearing: 10000,
  leanM: 0.05,
}

export const FOOTING_SUPPORT_LABEL: Record<FootingSupport, string> = { cantilever: 'เคร่าปลายยื่น (ตอกลงดิน)', braced: 'ค้ำยันทแยงลงหลัก', tied: 'คานรับเคร่า + Form tie' }

export const studsAround = (Lx: number, Ly: number, aCm: number) => 2 * (Math.ceil((Lx * 100) / aCm) + 1) + 2 * (Math.ceil((Ly * 100) / aCm) + 1)

export function designFooting(inp: FootingInput): FootingDesign {
  const H = inp.height
  const d = Math.min(inp.lengthX, inp.lengthY)
  const pres = lateralPressure({ ...inp.pressure, element: 'wall', H, d })
  const p = pres.Pmax
  const defl = inp.deflection
  const timberShear = inp.checkTimberShear ?? true
  const components: ComponentResult[] = []
  const warnings: string[] = []

  // 1) sheathing → stud spacing
  const tSh = new Trace()
  const sh: MemberInput = { section: deckSection(inp.sheathing), material: getMaterial(inp.sheathing.materialId), support: 'continuous', deflection: defl }
  const wSh = tSh.add({ label: 'น้ำหนักแผ่ต่อแถบกว้าง 1 ม.', expr: `${fmt(p)} × 1.00 / 100`, value: pressureToLineLoad(p, 1), unit: 'กก./ซม.' })
  const shLim = maxSpan(sh, wSh, tSh)
  const a = inp.stud.spacingCm ?? pickModule(shLim.max, STUD_MODULES)
  tSh.add({ label: 'ระยะเคร่าที่ใช้', value: a, unit: 'ซม.' })
  components.push(
    component('sheathing', 'แผ่นผิวข้างแบบ', `${sh.section.label} (${sh.material.name})`, checkBeam(sh, wSh, a, tSh).rows, tSh, {
      label: 'ระยะเคร่า',
      value: a,
      max: shLim.max,
      governing: governingLabel(shLim.governing),
      fixed: inp.stud.spacingCm !== undefined,
    }),
  )

  const stMat = getMaterial(inp.stud.materialId)
  const stSec = getSection(inp.stud.sectionId)
  const stake = getSection(inp.stake.sectionId)
  const q = inp.soilBearing
  const layout: FootingLayout = { studSpacing: a, braceLevels: [], waleLevels: [] }
  let braces = 0
  let stakes = 0
  let waleLength = 0
  let ties = 0
  const nStuds = studsAround(inp.lengthX, inp.lengthY, a)
  const wSt = pressureToLineLoad(p, a / 100)

  if (inp.support === 'cantilever') {
    // 2) studs as cantilevers from the ground (Table 10.2ก): M = wL²/2, Δ = wL⁴/8EI
    const t = new Trace()
    t.add({ label: 'น้ำหนักแผ่บนเคร่า', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: wSt, unit: 'กก./ซม.' })
    const L = H * 100
    const M = t.add({ label: 'M = wL²/2 (ปลายยื่น)', expr: `${wSt.toFixed(2)} × ${L.toFixed(0)}² / 2`, value: (wSt * L * L) / 2, unit: 'กก.-ซม.', ref: 'ตาราง 10.2ก' })
    const fb = t.add({ label: 'fb = M/S', value: M / stSec.Sx, unit: 'กก./ซม.²' })
    const delta = t.add({ label: 'Δ = wL⁴/8EI', value: (wSt * L ** 4) / (8 * stMat.E * stSec.Ix), unit: 'ซม.' })
    const dAllow = L / (defl?.ratio ?? 360)
    const rows: CheckRow[] = [
      { item: 'หน่วยแรงดัด fb', demand: fb, capacity: stMat.Fb, ratio: fb / stMat.Fb, unit: 'กก./ซม.²' },
      { item: 'การแอ่นตัวปลายเคร่า', demand: delta, capacity: dAllow, ratio: delta / dAllow, unit: 'ซม.' },
    ]
    components.push(component('stud', 'เคร่า (ปลายยื่นจากดิน)', `${stSec.label} @${a} ซม. (${stMat.name})`, rows, t))
    const tk = new Trace()
    const F = tk.add({ label: 'แรงดันดินที่ต้องรับต่อหลัก', expr: `${fmt(p)} × ${H} × ${(a / 100).toFixed(2)}`, value: p * H * (a / 100), unit: 'กก.' })
    const need = tk.add({ label: 'ความลึกหลักที่ต้องการ = F / (q·b)', expr: `${fmt(F)} / (${fmt(q)} × ${(stake.dMin / 100).toFixed(3)})`, value: F / (q * (stake.dMin / 100)), unit: 'ม.', ref: 'ตัวอย่าง 10.1' })
    components.push(component('stake', 'หลักยึดเคร่า (Stakes)', `${stake.label} ฝังลึก ${inp.stake.embedM.toFixed(2)} ม. @${a} ซม.`, [{ item: 'ความลึกฝังหลัก', demand: need, capacity: inp.stake.embedM, ratio: need / inp.stake.embedM, unit: 'ม.' }], tk))
    stakes = nStuds
    warnings.push('เคร่าปลายยื่นเหมาะกับฐานรากตื้นบนดินแข็งเท่านั้น (§10.4)')
  } else if (inp.support === 'braced') {
    // 2) studs between supports — single/two-span, M = wl²/8 (Ex 10.1 step 3)
    const t = new Trace()
    const st: MemberInput = { section: stSec, material: stMat, support: 'simple', deflection: defl, checkShear: stMat.kind === 'steel' || timberShear, shearReduction: true }
    t.add({ label: 'น้ำหนักแผ่บนเคร่า', expr: `${fmt(p)} × ${(a / 100).toFixed(2)} / 100`, value: wSt, unit: 'กก./ซม.' })
    const lim = maxSpan(st, wSt, t)
    const l = inp.brace.spacingCm ?? floorTo(lim.max, 5)
    t.add({ label: 'ระยะจุดค้ำยันที่ใช้', value: l, unit: 'ซม.' })
    // support levels: top brace below the top edge by the overhang, then every l down to the bottom stake
    const ov = Math.min(inp.brace.topOverhangM, H)
    const levels: number[] = []
    for (let y = H - ov; y > 0.05; y -= l / 100) levels.push(Math.round(y * 1000) / 1000)
    if (!levels.length) levels.push(Math.round(H * 500) / 1000)
    const gaps = [...levels.slice(1).map((y, i) => levels[i] - y), levels[levels.length - 1]]
    const span = Math.max(...gaps) * 100
    const chk = checkBeam(st, wSt, span, t)
    const ovRow: CheckRow = { item: 'ระยะยื่นปลายบน ≤ ช่วง/2', demand: ov * 100, capacity: l / 2, ratio: (ov * 100) / (l / 2), unit: 'ซม.' }
    components.push(
      component('stud', 'เคร่า (ค้ำยันเป็นช่วง)', `${stSec.label} @${a} ซม. (${stMat.name})`, [...chk.rows, ovRow], t, {
        label: 'ระยะจุดค้ำยัน',
        value: l,
        max: lim.max,
        governing: governingLabel(lim.governing),
        fixed: inp.brace.spacingCm !== undefined,
      }),
    )
    layout.supportSpacing = l
    layout.braceLevels = levels

    // 3) braces at every stud, one per level (Ex 10.1 step 4)
    const tb = new Trace()
    const bs = getSection(inp.brace.sectionId)
    const bm = getMaterial(inp.brace.materialId)
    const th = (inp.brace.angleDeg * Math.PI) / 180
    const brRows: CheckRow[] = []
    let sumH = 0
    levels.forEach((y, i) => {
      const above = i === 0 ? ov : (levels[i - 1] - y) / 2
      const below = gaps[i] / 2
      const Fh = tb.add({ label: `ระดับ +${y.toFixed(2)}: แรงแนวราบ`, expr: `${fmt(p)} × ${(a / 100).toFixed(2)} × (${above.toFixed(2)} + ${below.toFixed(2)})`, value: p * (a / 100) * (above + below), unit: 'กก.' })
      sumH += Fh
      const F = tb.add({ label: `ระดับ +${y.toFixed(2)}: แรงตามแนวค้ำยัน`, expr: `${fmt(Fh)} / cos${inp.brace.angleDeg}°`, value: Fh / Math.cos(th), unit: 'กก.' })
      const L = tb.add({ label: `ระดับ +${y.toFixed(2)}: ความยาวค้ำยัน`, expr: `${y.toFixed(2)} / sin${inp.brace.angleDeg}°`, value: (y / Math.sin(th)) * 100, unit: 'ซม.' })
      const cap = columnCapacity(bs, bm, L, tb, `ระดับ +${y.toFixed(2)}: `)
      brRows.push({ item: `ค้ำยันระดับ +${y.toFixed(2)} ม.`, demand: F, capacity: cap.P, ratio: F / cap.P, unit: 'กก.', ref: 'สมการ 5.15' })
    })
    components.push(component('brace', 'ค้ำยันทแยง (Braces)', `${bs.label} (${bm.name}) ทุกเคร่า ${levels.length} ระดับ มุม ${inp.brace.angleDeg}°`, brRows, tb))
    braces = nStuds * levels.length

    // 4) stakes: bottom kicker stake at every stud, and the stake behind the brace feet (Ex 10.1 steps 5–6)
    const tk = new Trace()
    const Fk = tk.add({ label: 'แรงที่หลักตีนเคร่า', expr: `${fmt(p)} × ${(gaps[gaps.length - 1] / 2).toFixed(3)} × ${(a / 100).toFixed(2)}`, value: p * (gaps[gaps.length - 1] / 2) * (a / 100), unit: 'กก.', ref: 'ตัวอย่าง 10.1 ข้อ 6' })
    const needK = tk.add({ label: 'ความลึกหลักตีนเคร่า = F/(q·b)', expr: `${fmt(Fk)} / (${fmt(q)} × ${(stake.dMin / 100).toFixed(3)})`, value: Fk / (q * (stake.dMin / 100)), unit: 'ม.' })
    const needB = tk.add({ label: 'ความลึกหลักรับค้ำยัน (แผ่นไม้กว้าง ' + inp.stake.boardCm + ' ซม.)', expr: `${fmt(sumH)} / (${fmt(q)} × ${(inp.stake.boardCm / 100).toFixed(2)})`, value: sumH / (q * (inp.stake.boardCm / 100)), unit: 'ม.', ref: 'ตัวอย่าง 10.1 ข้อ 5' })
    components.push(
      component('stake', 'หลักยึด (Stakes) และแรงแบกทานดิน', `${stake.label} ฝังลึก ${inp.stake.embedM.toFixed(2)} ม. · ดินรับได้ ${fmt(q)} กก./ม.²`, [
        { item: 'หลักตีนเคร่า', demand: needK, capacity: inp.stake.embedM, ratio: needK / inp.stake.embedM, unit: 'ม.' },
        { item: 'หลักรับค้ำยัน', demand: needB, capacity: inp.stake.embedM, ratio: needB / inp.stake.embedM, unit: 'ม.' },
      ], tk),
    )
    stakes = 2 * nStuds
    warnings.push('ค้ำยันลงดินเหมาะกับดินแข็ง — ดินอ่อนให้ใช้คานรับเคร่า + Form tie (หมายเหตุตัวอย่าง 10.1)')
  } else {
    // 2–4) studs → wales → ties, exactly as a wall form of thickness d (Ex 10.2, 10.3)
    const w = designWall({
      thickness: d,
      height: H,
      length: 2 * (inp.lengthX + inp.lengthY),
      pressure: inp.pressure,
      sheathing: { materialId: 'ply-apa1', thicknessMm: 15 },
      stud: { ...inp.stud, spacingCm: a },
      wale: inp.wale,
      tie: inp.tie,
      brace: DEFAULT_BRACE,
      bottomWaleOffsetM: inp.wale.bottomOffsetM,
      deflection: defl,
      checkTimberShear: inp.checkTimberShear,
    })
    for (const key of ['stud', 'wale', 'tie']) components.push(w.components.find((c) => c.key === key)!)
    layout.waleLevels = w.layout.waleLevels
    layout.waleSpacing = w.layout.waleSpacing
    layout.tieSpacing = w.layout.tieSpacing
    const long = Math.max(inp.lengthX, inp.lengthY)
    waleLength = 2 * (inp.lengthX + inp.lengthY + 0.6) * inp.wale.count * w.layout.waleLevels.length
    ties = w.layout.waleLevels.length * Math.max(Math.ceil((long * 100) / w.layout.tieSpacing) - 1, 1)
    warnings.push('ไทร์วางขวางด้านสั้น — คานรับเคร่าด้านสั้นยึดที่มุมด้วยไทร์/ค้ำยันทแยงมุม (รูป 10.2ค) ไม่ได้คำนวณในรายการนี้')
  }

  return {
    ...summarize(pres, components, warnings),
    layout,
    quantities: {
      plywoodArea: 2 * (inp.lengthX + inp.lengthY) * H,
      studs: nStuds,
      studLength: nStuds * (H + (inp.support === 'cantilever' ? inp.stake.embedM : 0.1)),
      braces,
      stakes,
      waleLength,
      ties,
    },
  }
}
