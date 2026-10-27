import { describe, expect, it } from 'vitest'
import { DEFAULT_FOOTING, designFooting } from '@/engine'
import { footingModel } from '@/model/slabBeamFootingModel'
import { project } from './ShopView'

describe('isometric draw order', () => {
  it('panels go behind the studs and wales in front of them, even with wales crossing at the corners', () => {
    const inp = { ...DEFAULT_FOOTING, lengthX: 5, lengthY: 2, height: 2, support: 'tied' as const, stud: { sectionId: 'box-50×50×1.6', materialId: 'steel-a36' } }
    const order = project(footingModel(inp, designFooting(inp)), 'iso').map((it) => it.p.id)
    expect(order).toHaveLength(new Set(order).size)
    // faces 0 (+z) and 2 (+x) face the viewer: their studs and wales must be drawn after the plywood
    for (const f of ['0', '2']) {
      const ply = order.indexOf(`ply-${f}`)
      expect(order.filter((id, i) => (id.startsWith(`stud-${f}-`) || id.startsWith(`wale-${f}-`)) && i < ply)).toEqual([])
    }
    // faces 1 (−z) and 3 (−x) face away: their studs are hidden behind their own plywood
    for (const f of ['1', '3']) {
      const ply = order.indexOf(`ply-${f}`)
      expect(order.filter((id, i) => id.startsWith(`stud-${f}-`) && i > ply)).toEqual([])
    }
  })
})
