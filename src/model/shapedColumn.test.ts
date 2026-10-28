// 3D model and BOM of round and polygonal columns.
import { describe, expect, it } from 'vitest'
import { newElement, runDesign, withRoundForm } from '@/data/elements'
import { DEFAULT_CRITERIA, type ElementData } from '@/data/types'
import { type ColumnInput, type ColumnShape, polygonDims } from '@/engine'
import { concreteVolume, elementBom } from './bom'
import { boxOutline, PROJ } from '@/report/Drawing'
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
  const c = column({ kind: 'circle', system: 'stave' }, { yoke: withRoundForm(newElement('column', DEFAULT_CRITERIA, []).input as ColumnInput).yoke, sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 } })

  it('concrete volume is πD²/4 × H (to the 36-gon)', () => {
    expect(concreteVolume(c.model)).toBeCloseTo((Math.PI * 0.36 * 3) / 4, 6)
  })

  it('one stave per design stave, a square frame of 4 cut-out yoke boards per level', () => {
    expect(c.model.parts.filter((p) => p.id.startsWith('stave')).length).toBe(c.run.design.layout.staves)
    const yokes = line(c.lines, 'คานรัดเจาะโค้ง')!
    expect(yokes.qty).toBe(c.run.design.layout.yokeLevels.length * 4 * c.el.input.yoke.count)
    expect(yokes.description).toContain('1"×10"')
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

describe('L / T / U column model', () => {
  const Lshape: ColumnShape = { kind: 'L', a: 0.8, b: 0.8, ta: 0.25, tb: 0.25, yoke: 'tied' }

  it('L along the faces: concrete = section × H, a yoke on all 6 faces, 2 ties per level', () => {
    const c = column(Lshape, { b: 0.8, h: 0.8, tie: { enabled: true, tieId: 'tie-3/8', spans: 1 } })
    const levels = c.run.design.layout.yokeLevels.length
    expect(concreteVolume(c.model)).toBeCloseTo((0.8 * 0.25 + 0.55 * 0.25) * 3, 6)
    expect(c.model.parts.filter((p) => p.id.startsWith('yokeF-0-')).length).toBe(6 * c.el.input.yoke.count)
    expect(c.model.parts.filter((p) => p.id.startsWith('tie-')).length).toBe(levels * 2)
    expect(c.run.design.quantities.ties).toBe(levels * 2)
  })

  it('the plan view draws the L as it is, the side view its box', () => {
    const c = column(Lshape, { b: 0.8, h: 0.8 })
    const conc = c.model.parts.find((p) => p.id === 'concrete') as BoxPart
    expect(boxOutline(conc, PROJ.top, true)).toHaveLength(6)
    expect(boxOutline(conc, PROJ.front, false)).toHaveLength(4)
  })

  it('U in a box: one filler box in the opening, studs only on the faces against the box', () => {
    const c = column({ kind: 'U', b: 1, d: 0.8, t: 0.25, tb: 0.25, yoke: 'box' }, { b: 1, h: 0.8, tie: { enabled: false, tieId: 'tie-3/8', spans: 1 } })
    expect(line(c.lines, 'กล่องไม้อุด')!.qty).toBe(1)
    expect(c.model.parts.some((p) => p.id.startsWith('yokeL'))).toBe(true)
  })

  it('T: 3 ties per level, and more when the legs are split', () => {
    const t = (spans: number) => column({ kind: 'T', bf: 0.9, tf: 0.25, tw: 0.25, d: 0.8, yoke: 'tied' }, { b: 0.9, h: 0.8, tie: { enabled: true, tieId: 'tie-3/8', spans } })
    const one = t(1)
    expect(one.model.parts.filter((p) => p.id.startsWith('tie-0-')).length).toBe(3)
    // + 1 along each of the 3 legs, 1 across the core, 1 through each of the 2 end faces (both flange ends share one)
    expect(t(2).model.parts.filter((p) => p.id.startsWith('tie-0-')).length).toBe(9)
  })
})

describe('shaped footing model', () => {
  function footing(patch: Partial<Extract<ElementData, { type: 'footing' }>['input']>) {
    const el = newElement('footing', DEFAULT_CRITERIA, []) as Extract<ElementData, { type: 'footing' }>
    el.input = { ...el.input, height: 1, ...patch }
    const run = runDesign(el, DEFAULT_CRITERIA)
    if (run.type !== 'footing') throw new Error()
    return { el, run, ...elementBom(el, run) }
  }

  it('round: concrete πD²/4 × H, one stud per design stud, braces and stakes at every stud', () => {
    const f = footing({ lengthX: 4, lengthY: 4, shape: { kind: 'circle' }, support: 'braced' })
    expect(concreteVolume(f.model)).toBeCloseTo((Math.PI * 16 * 1) / 4, 6)
    expect(f.model.parts.filter((p) => p.id.startsWith('stud-')).length).toBe(f.run.design.quantities.studs)
    expect(f.model.parts.filter((p) => p.id.startsWith('stake-')).length).toBe(f.run.design.quantities.studs)
  })

  it('octagon tied: wales on all 8 faces at every level, no ties', () => {
    const f = footing({ lengthX: 3, lengthY: 3, shape: { kind: 'polygon', n: 8 }, support: 'tied' })
    const levels = f.run.design.layout.waleLevels.length
    expect(f.model.parts.filter((p) => p.id.startsWith('wale-')).length).toBe(8 * levels * f.el.input.wale.count)
    expect(f.model.parts.some((p) => p.id.startsWith('tie-'))).toBe(false)
  })

  it('L tied: the ties and their plates match the design', () => {
    const f = footing({ lengthX: 4.5, lengthY: 4, shape: { kind: 'L', a: 4.5, b: 4, ta: 1.5, tb: 1.5, yoke: 'tied' }, support: 'tied' })
    expect(f.model.parts.filter((p) => p.id.startsWith('tie-')).length).toBe(f.run.design.quantities.ties)
    expect(line(f.lines, 'เหล็กประกับไทร์')!.qty).toBe(2 * f.run.design.quantities.ties)
  })
})
