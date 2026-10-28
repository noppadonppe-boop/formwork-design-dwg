// 3D model and BOM of round and polygonal columns.
import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { DEFAULT_CRITERIA, type ElementData } from '@/data/types'
import { type ColumnShape, polygonDims } from '@/engine'
import { concreteVolume, elementBom } from './bom'
import { boxPoints, type BoxPart } from './formModel'

function column(shape: ColumnShape, patch: Partial<Extract<ElementData, { type: 'column' }>['input']> = {}) {
  const el = newElement('column', DEFAULT_CRITERIA, []) as Extract<ElementData, { type: 'column' }>
  el.input = { ...el.input, b: 0.6, h: 0.6, height: 3, shape, ...patch }
  const run = runDesign(el, DEFAULT_CRITERIA)
  if (run.type !== 'column') throw new Error()
  return { el, run, ...elementBom(el, run) }
}
const line = (lines: ReturnType<typeof elementBom>['lines'], text: string) => lines.find((l) => l.description.includes(text))

describe('round column model', () => {
  const c = column({ kind: 'circle', system: 'stave' }, { sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 } })

  it('concrete volume is πD²/4 × H (to the 36-gon)', () => {
    expect(concreteVolume(c.model)).toBeCloseTo((Math.PI * 0.36 * 3) / 4, 2)
  })

  it('one stave per design stave, each ring rib counted as two half-ring pieces', () => {
    expect(c.model.parts.filter((p) => p.id.startsWith('stave')).length).toBe(c.run.design.layout.staves)
    const rib = line(c.lines, 'ริบโค้งครึ่งวง')!
    expect(rib.qty).toBe(c.run.design.layout.yokeLevels.length * 2 * c.el.input.yoke.count)
    expect(rib.lengthM).toBeGreaterThan(Math.PI * 0.3)
  })

  it('steel form: two halves; tube: one piece', () => {
    const st = column({ kind: 'circle', system: 'steel' })
    expect(line(st.lines, 'แบบเหล็กเสากลม')!.qty).toBe(2)
    const tb = column({ kind: 'circle', system: 'tube' })
    expect(line(tb.lines, 'ท่อกระดาษ')!.qty).toBe(1)
    expect(tb.lines.find((l) => l.category === 'plywood')).toBeUndefined()
  })
})

describe('polygon column model', () => {
  it('octagon in a box: 8 plywood faces, 4 corner fillers, box yokes', () => {
    const c = column({ kind: 'polygon', n: 8, yoke: 'box' })
    expect(c.model.parts.filter((p) => p.id.startsWith('ply-')).length).toBe(8)
    expect(line(c.lines, 'ไม้อุดมุม')!.qty).toBe(4)
    expect(c.model.parts.some((p) => p.id.startsWith('yokeL'))).toBe(true)
    // regular octagon of F = 0.6: area 2(√2 − 1)F²
    expect(concreteVolume(c.model)).toBeCloseTo(2 * (Math.SQRT2 - 1) * 0.36 * 3, 4)
  })

  it('hexagon ring: yokes along the 6 faces, a bracket at every corner, no ties', () => {
    const c = column({ kind: 'polygon', n: 6, yoke: 'ring' })
    const levels = c.run.design.layout.yokeLevels.length
    expect(c.model.parts.filter((p) => p.id.startsWith('yokeR')).length).toBe(levels * 6 * c.el.input.yoke.count)
    expect(line(c.lines, 'เหล็กประกับมุม')!.qty).toBe(levels * 6)
    expect(c.model.parts.some((p) => p.id.startsWith('tie-'))).toBe(false)
  })

  it('a plywood face lies on its flat: inner face at F/2 from the centre', () => {
    const c = column({ kind: 'polygon', n: 8, yoke: 'ring' })
    const face = c.model.parts.find((p) => p.id === 'ply-0') as BoxPart
    const zs = boxPoints(face).map((q) => q[2])
    expect(Math.min(...zs)).toBeCloseTo(0.3, 6)
    const xs = boxPoints(face).map((q) => q[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(polygonDims(8, 0.6).a)
  })
})
