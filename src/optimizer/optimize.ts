// Optimizer: tries combinations of sheathing thickness, member sections and support options for one element,
// lets the engine pick the largest safe spacings for each, keeps the designs that pass every check, and ranks
// them by material + handling cost per set (priced from the same BOM as the shop drawing).
import { type AnyDesign, layoutSummary, runDesign } from '@/data/elements'
import type { Criteria, ElementData } from '@/data/types'
import { beamRunnerFlat, columnShapeOf, columnShapeSystem, getMaterial, getSection, isLegShape, shoreLabel } from '@/engine'
import { elementBom, SHEET_AREA } from '@/model/bom'

export interface OptPrices {
  /** plywood sheet 1.22 × 2.44 by thickness, บาท/แผ่น */
  plywood: Record<number, number>
  /** sawn timber, บาท/ลบ.ฟ. */
  timberFt3: number
  /** steel members and pipe shores, บาท/กก. */
  steelKg: number
  /** form tie set (consumed), บาท/ชุด */
  tie: number
  /** rated prop / scaffold leg, บาท/ต้น */
  ratedShore: number
  /** washers, bolts, base plates…, บาท/ชิ้น */
  accessory: number
  /** handling + fixing per piece, บาท/ชิ้น */
  laborPerPiece: number
}

export const DEFAULT_PRICES: OptPrices = {
  plywood: { 10: 380, 12: 440, 15: 520, 18: 620, 20: 700, 25: 860 },
  timberFt3: 750,
  steelKg: 38,
  tie: 35,
  ratedShore: 900,
  accessory: 15,
  laborPerPiece: 6,
}

export interface OptOptions {
  prices: OptPrices
  /** highest acceptable check ratio (1.0 = at the limit) */
  target: number
  /** also try steel studs / wales / heads */
  allowSteel: boolean
}

export interface OptResult {
  el: ElementData
  cost: number
  /** cost per m² of formwork contact area */
  perM2: number
  maxRatio: number
  pieces: number
  choices: string[]
  layout: string
}

const PLY = [12, 15, 18, 20]
const STUDS = ['timber-1.5x3', 'timber-1.5x4', 'timber-2x3', 'timber-2x4', 'timber-2x6']
const BIG = ['timber-2x4', 'timber-2x6', 'timber-2x8', 'timber-3x4', 'timber-4x4']
/** wide boards cut out to a round column (Ex 9.2) */
const BOARDS = ['timber-1x8', 'timber-1x10', 'timber-1x12', 'timber-2x8']
const STEEL_LIGHT = ['lipC-100×50×20×2.3', 'rhs-100×50×2.3']
const STEEL_WALE = ['rhs-100×50×2.3', 'box-100×100×2.3']
const SHORE_PIPES = ['pipe-4.27', 'pipe-4.86', 'pipe-6.03', 'pipe-7.63']
const STEEL = 'steel-ss400'

const label = (id: string) => getSection(id).label
const plyName = (sh: { type?: string; thicknessMm?: number; thicknessCm?: number }) => (sh.type === 'board' ? `ไม้กระดาน ${sh.thicknessCm} ซม.` : `ไม้อัด ${sh.thicknessMm} มม.`)

/** Cost of one set of formwork for a design. */
export function costOf(el: ElementData, run: AnyDesign, p: OptPrices): { cost: number; pieces: number; area: number } {
  const { lines } = elementBom(el, run)
  let cost = 0
  let pieces = 0
  let area = 0
  const tMm = 'sheathing' in el.input && 'thicknessMm' in el.input.sheathing ? el.input.sheathing.thicknessMm : 18
  const plyPrice = p.plywood[tMm] ?? (p.plywood[18] * tMm) / 18
  for (const l of lines) {
    pieces += l.qty
    if (l.category === 'plywood') {
      area += l.areaM2! * l.qty
      cost += ((l.areaM2! * l.qty) / SHEET_AREA) * plyPrice
    } else if (l.category === 'board') {
      area += l.areaM2! * l.qty
      cost += (l.volumeFt3 ?? 0) * p.timberFt3
    } else if (l.weightKg !== undefined) cost += l.weightKg * p.steelKg
    else if (l.volumeFt3 !== undefined) cost += l.volumeFt3 * p.timberFt3
    else if (l.category === 'tie') cost += l.qty * p.tie
    else if (l.category === 'shore') cost += l.qty * p.ratedShore
    else cost += l.qty * p.accessory
  }
  cost += pieces * p.laborPerPiece
  return { cost, pieces, area }
}

/** Member choices of an element, in words. */
export function describe(el: ElementData): string[] {
  const i = el.input as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const sh = plyName(el.type === 'wall' ? { thicknessMm: i.sheathing.thicknessMm } : i.sheathing)
  const shore = (s: any) => (s.kind === 'ringlock' ? shoreLabel(s) : s.kind === 'rated' ? s.ratedName : `เสาค้ำ ${label(s.sectionId)}${s.braceLevels ? ` ค้ำกลาง ${s.braceLevels} ระดับ` : ''}`) // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (el.type) {
    case 'wall':
      return [sh, `เคร่า ${label(i.stud.sectionId)}`, `คานรับเคร่า ${i.wale.count === 2 ? '2-' : ''}${label(i.wale.sectionId)}`, `ไทร์ ${i.tie.tieId.replace('tie-', 'Ø')}`]
    case 'column': {
      const s = columnShapeOf(el.input)
      if (s.kind === 'circle') return s.system === 'stave' ? [sh, `คานรัดเจาะโค้ง ${i.yoke.count === 2 ? '2-' : ''}${label(i.yoke.sectionId)}`] : [columnShapeSystem(s)]
      const ring = s.kind === 'polygon' && s.yoke === 'ring'
      if (isLegShape(s) && s.yoke === 'tied') return [sh, ...(i.sheathing.type === 'plywood' && i.stud ? [`เคร่า ${label(i.stud.sectionId)}`] : []), `คานรัด ${i.yoke.count === 2 ? '2-' : ''}${label(i.yoke.sectionId)} ตามหน้า`, `ไทร์มุมใน${i.tie.spans > 1 ? ` + กลางขา ${i.tie.spans - 1}` : ''}`]
      return [sh, ...(i.sheathing.type === 'plywood' && i.stud ? [`เคร่า ${label(i.stud.sectionId)}`] : []), `คานรัด ${i.yoke.count === 2 ? '2-' : ''}${label(i.yoke.sectionId)}${ring ? ' วงแหวน' : ''}`, ring ? 'ไม่ใช้ไทร์' : i.tie.enabled ? `ไทร์ ${i.tie.spans - 1} แถว${(i.tie.shortSpans ?? 1) > 1 ? ` + ด้านสั้น ${i.tie.shortSpans - 1} แถว` : ''}` : 'ไม่ใช้ไทร์']
    }
    case 'slab':
      return [sh, `ตง ${label(i.joist.sectionId)}`, `คานรองรับ ${i.stringer.count === 2 ? '2-' : ''}${label(i.stringer.sectionId)}`, shore(i.shore)]
    case 'beam':
      return [sh, `เคร่าข้าง ${label(i.stud.sectionId)}`, i.bottom.count || i.bottom.auto ? `ท้อง ${i.bottom.auto ? 'n' : i.bottom.count}-${label(i.bottom.sectionId)}${beamRunnerFlat(el.input) ? ' นอน' : ''}` : 'ท้องแผ่นเดียว', `คานขวาง ${i.head.count === 2 ? '2-' : ''}${label(i.head.sectionId)}`, shore(i.shore)]
    case 'footing':
      return [sh, `เคร่า ${label(i.stud.sectionId)}`, i.support === 'tied' ? `คานรับเคร่า ${i.wale.count === 2 ? '2-' : ''}${label(i.wale.sectionId)} + ไทร์` : i.support === 'braced' ? `ค้ำยัน ${label(i.brace.sectionId)}` : 'เคร่าปลายยื่น']
  }
}

const timberOf = (materialId: string) => (getMaterial(materialId).kind === 'timber' ? materialId : 'timber-yang')

/** All design variants to try for an element (spacings left to the engine). */
export function variants(el: ElementData, o: Pick<OptOptions, 'allowSteel'>): ElementData[] {
  const out: ElementData[] = []
  const sheets = <S extends { type?: string }>(sh: S) => (sh.type === 'board' ? [1.8, 2.5, 3.75].map((t) => ({ ...sh, thicknessCm: t })) : PLY.map((t) => ({ ...sh, thicknessMm: t })))
  switch (el.type) {
    case 'wall': {
      const i = el.input
      const tm = timberOf(i.stud.materialId)
      const studs = [...STUDS.map((s) => [s, tm]), ...(o.allowSteel ? STEEL_LIGHT.map((s) => [s, STEEL]) : [])]
      const wales: [string, string, 1 | 2][] = [...BIG.flatMap((s) => [[s, tm, 1], [s, tm, 2]] as [string, string, 1 | 2][]), ...(o.allowSteel ? STEEL_WALE.map((s) => [s, STEEL, 2] as [string, string, 1 | 2]) : [])]
      for (const t of PLY)
        for (const [sid, sm] of studs)
          for (const [wid, wm, n] of wales)
            for (const tie of ['tie-3/8', 'tie-1/2'])
              out.push({ ...el, input: { ...i, sheathing: { ...i.sheathing, thicknessMm: t }, stud: { sectionId: sid, materialId: sm }, wale: { ...i.wale, sectionId: wid, materialId: wm, count: n, spacingCm: undefined, addCm: n === 2 ? 10 : 0 }, tie: { tieId: tie } } })
      break
    }
    case 'column': {
      const i = el.input
      const shape = columnShapeOf(i)
      // a ready-made round form has no members to choose
      if (shape.kind === 'circle' && shape.system !== 'stave') {
        out.push({ ...el, input: { ...i, yoke: { ...i.yoke, spacingCm: undefined } } })
        break
      }
      const tm = timberOf(i.yoke.materialId)
      // ties go through a rectangle or a polygon's box only; staves are bolted with the chosen tie
      const tied = shape.kind === 'rect' || ((shape.kind === 'polygon' || isLegShape(shape)) && shape.yoke === 'box')
      // an L/T/U along its faces always has its inner-corner ties; try them alone and with one more per leg
      const legTies = isLegShape(shape) && shape.yoke === 'tied' ? [{ ...i.tie, spans: 1 }, { ...i.tie, spans: 2 }] : undefined
      const ties = legTies ?? (tied
        ? [
            { ...i.tie, enabled: false },
            ...(Math.max(i.b, i.h) >= 0.6 ? [{ ...i.tie, enabled: true, spans: 2, shortSpans: undefined }] : []),
            ...(Math.min(i.b, i.h) >= 0.6 ? [{ ...i.tie, enabled: true, spans: 2, shortSpans: 2 }] : []),
          ]
        : [i.tie])
      for (const sh of sheets(i.sheathing))
        for (const sid of i.sheathing.type === 'plywood' && shape.kind !== 'circle' ? STUDS : [undefined])
          for (const yid of shape.kind === 'circle' ? BOARDS : BIG)
            for (const n of [1, 2] as const)
              for (const tie of ties)
                out.push({ ...el, input: { ...i, sheathing: sh, stud: sid ? { sectionId: sid, materialId: tm } : i.stud, yoke: { ...i.yoke, sectionId: yid, materialId: tm, count: n, spacingCm: undefined, addCm: n === 2 ? 10 : 0 }, tie } })
      break
    }
    case 'slab': {
      const i = el.input
      const tm = timberOf(i.joist.materialId)
      const shores = [...SHORE_PIPES.map((s) => ({ sectionId: s, materialId: 'steel-a36' })), { sectionId: 'timber-3x3', materialId: tm }, { sectionId: 'timber-4x4', materialId: tm }, { sectionId: 'log-4', materialId: tm }]
      for (const sh of sheets(i.sheathing))
        for (const jid of STUDS)
          for (const sid of BIG)
            for (const n of [1, 2] as const)
              for (const s of i.shore.kind !== 'post' ? [undefined] : shores)
                for (const lv of i.shore.kind !== 'post' ? [i.shore.braceLevels] : [0, 1])
                  out.push({
                    ...el,
                    input: { ...i, sheathing: sh, joist: { sectionId: jid, materialId: tm }, stringer: { sectionId: sid, materialId: tm, count: n }, shore: { ...i.shore, ...(s ?? {}), braceLevels: lv, spacingCm: undefined } },
                  })
      break
    }
    case 'beam': {
      const i = el.input
      const tm = timberOf(i.stud.materialId)
      const bottoms = [
        { count: 0, sectionId: 'timber-1.5x3', materialId: tm, flat: true },
        { count: 2, sectionId: 'timber-1.5x3', materialId: tm, flat: true },
        { count: 2, sectionId: 'timber-2x4', materialId: tm, flat: true },
        { count: 3, sectionId: 'timber-2x4', materialId: tm, flat: true },
      ]
      const heads: [string, string, 1 | 2][] = [
        ['timber-2x4', tm, 1],
        ['timber-2x4', tm, 2],
        ['timber-2x6', tm, 1],
        ['timber-3x4', tm, 1],
        ...(o.allowSteel ? ([['rhs-100×50×2.3', STEEL, 1]] as [string, string, 1 | 2][]) : []),
      ]
      const shores = i.shore.kind !== 'post' ? [undefined] : [...SHORE_PIPES.map((s) => ({ sectionId: s, materialId: 'steel-a36' })), { sectionId: 'timber-3x3', materialId: tm }]
      for (const sh of sheets(i.sheathing))
        for (const sid of STUDS)
          for (const b of bottoms)
            for (const [hid, hm, n] of heads)
              for (const s of shores)
                out.push({ ...el, input: { ...i, sheathing: sh, stud: { sectionId: sid, materialId: tm }, bottom: b, head: { sectionId: hid, materialId: hm, count: n }, shore: { ...i.shore, ...(s ?? {}) } } })
      break
    }
    case 'footing': {
      const i = el.input
      const tm = timberOf(i.stud.materialId)
      const supports = [...(i.height <= 0.6 ? (['cantilever'] as const) : []), 'braced', 'tied'] as const
      for (const sh of sheets(i.sheathing))
        for (const sid of [...STUDS, ...(o.allowSteel ? STEEL_LIGHT : [])])
          for (const sup of supports)
            for (const wid of sup === 'tied' ? ['timber-2x4', 'timber-2x6', ...(o.allowSteel ? STEEL_WALE : [])] : [i.wale.sectionId])
              out.push({
                ...el,
                input: {
                  ...i,
                  sheathing: sh,
                  stud: { sectionId: sid, materialId: sid.startsWith('timber') ? tm : STEEL },
                  support: sup,
                  brace: { ...i.brace, spacingCm: undefined },
                  wale: { ...i.wale, sectionId: wid, materialId: wid.startsWith('timber') ? tm : STEEL, count: 2, spacingCm: undefined, addCm: wid.startsWith('timber') ? 10 : 0 },
                  tie: { ...i.tie, spacingCm: undefined },
                },
              })
      break
    }
  }
  return out
}

export function evaluate(el: ElementData, criteria: Criteria, o: OptOptions): OptResult | undefined {
  let run: AnyDesign
  try {
    run = runDesign(el, criteria)
  } catch {
    return undefined
  }
  const d = run.design
  if (d.status === 'fail' || d.maxRatio > o.target + 1e-9) return undefined
  const { cost, pieces, area } = costOf(el, run, o.prices)
  return {
    el,
    cost,
    perM2: area ? cost / area : cost,
    maxRatio: d.maxRatio,
    pieces,
    choices: describe(el),
    layout: layoutSummary(run)
      .map((l) => `${l.label}${l.value}`)
      .join(' · '),
  }
}

/** Run the search; `onProgress` is called every few hundred designs. Returns the best `top` designs, cheapest first. */
export function optimize(el: ElementData, criteria: Criteria, o: OptOptions, onProgress?: (done: number, total: number) => void, top = 12): { results: OptResult[]; tried: number; passed: number } {
  const vs = variants(el, o)
  const results: OptResult[] = []
  let passed = 0
  vs.forEach((v, k) => {
    const r = evaluate(v, criteria, o)
    if (r) {
      passed++
      results.push(r)
    }
    if (onProgress && k % 100 === 0) onProgress(k, vs.length)
  })
  results.sort((a, b) => a.cost - b.cost || a.maxRatio - b.maxRatio)
  // drop designs that only differ in ways that do not change cost or layout
  const seen = new Set<string>()
  const unique = results.filter((r) => {
    const k = `${Math.round(r.cost)}|${r.layout}|${r.choices.join()}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  onProgress?.(vs.length, vs.length)
  return { results: unique.slice(0, top), tried: vs.length, passed }
}
