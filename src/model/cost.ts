// Purchase quantities and cost estimate from the project BOM: need × (1 + waste) ÷ reuse, priced per unit.
// Plywood is counted in sheets from the cutting plans; form ties are consumed every pour (no reuse, no waste).
import { type ShopSettings, priceOf } from '@/data/types'
import type { BomSummary } from './bom'

export type CostGroup = 'plywood' | 'timber' | 'steel' | 'tie' | 'other'

export interface CostRow {
  group: CostGroup
  key: string
  /** quantity needed for all sets (before waste and reuse) */
  need: number
  wastePct: number
  reuse: number
  /** quantity to buy, in `unit` */
  buy: number
  unit: string
  price?: number
  amount?: number
  /** secondary info, e.g. plywood area or timber length */
  info?: string
}

const ceil = (x: number) => Math.ceil(x - 1e-9)

/**
 * `plywoodSheets` — sheets per plywood description from the cutting plans (× element quantity);
 * falls back to the area in the summary when a description has no cutting plan.
 */
export function costRows(sum: BomSummary, s: ShopSettings, plywoodSheets: Map<string, number>, tieKeys: Set<string>): CostRow[] {
  const reuse = Math.max(1, s.reuse)
  const row = (group: CostGroup, key: string, need: number, unit: string, wastePct: number, useReuse: boolean, round: boolean, info?: string): CostRow => {
    const r = useReuse ? reuse : 1
    const raw = (need * (1 + wastePct / 100)) / r
    const buy = round ? ceil(raw) : Math.round(raw * 100) / 100
    const price = priceOf(s, key)
    return { group, key, need, wastePct, reuse: r, buy, unit, price, amount: price !== undefined ? price * buy : undefined, info }
  }
  return [
    ...sum.plywood.map((p) => row('plywood', p.description, plywoodSheets.get(p.description) ?? p.sheets, 'แผ่น', s.waste.plywood, true, true, `${p.area.toFixed(1)} ม.²`)),
    ...sum.timber.map((t) => row('timber', t.description, t.volumeFt3, 'ลบ.ฟ.', s.waste.timber, true, false, `${t.length.toFixed(1)} ม.`)),
    ...sum.steel.map((t) => row('steel', t.description, t.weightKg, 'กก.', s.waste.steel, true, false, `${t.length.toFixed(1)} ม.`)),
    ...sum.counts.map((c) => (tieKeys.has(c.description) ? row('tie', c.description, c.qty, c.unit, 0, false, true) : row('other', c.description, c.qty, c.unit, 0, true, true))),
  ]
}

export const totalCost = (rows: CostRow[]) => rows.reduce((a, r) => a + (r.amount ?? 0), 0)
