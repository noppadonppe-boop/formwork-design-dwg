import { describe, expect, it } from 'vitest'
import { DEFAULT_COLUMN, DEFAULT_WALL, designColumn, designWall } from '@/engine'
import { applyColumnHandle, applyWallHandle, columnModel, wallModel } from './formModel'

describe('wall model', () => {
  const d = designWall(DEFAULT_WALL)
  const m = wallModel(DEFAULT_WALL, d)
  const count = (g: string) => m.parts.filter((p) => p.group === g).length

  it('places studs on both faces and double wales at every level', () => {
    expect(count('stud')).toBe(2 * d.layout.studX.length)
    expect(count('wale')).toBe(2 * 2 * d.layout.waleLevels.length)
  })
  it('one tie (+2 plates) per wale level and tie position', () => {
    expect(count('tie')).toBe(3 * d.layout.waleLevels.length * d.layout.tieX.length)
  })
  it('bounds enclose the wall and the brace feet', () => {
    expect(m.bounds.min[0]).toBeLessThanOrEqual(0)
    expect(m.bounds.max[0]).toBeGreaterThanOrEqual(DEFAULT_WALL.length)
    expect(m.bounds.max[1]).toBeGreaterThanOrEqual(DEFAULT_WALL.height)
    expect(m.bounds.max[2]).toBeGreaterThan(DEFAULT_WALL.height / Math.tan(Math.PI / 3))
  })
  it('handles snap to 5 cm', () => {
    expect(applyWallHandle(DEFAULT_WALL, 'waleSpacing', 0.537).wale.spacingCm).toBe(55)
    expect(applyWallHandle(DEFAULT_WALL, 'thickness', 0.149).thickness).toBe(0.3)
    expect(applyWallHandle(DEFAULT_WALL, 'height', 3.01).height).toBe(3)
  })
})

describe('wall model — horizontal studs on vertical wales', () => {
  const inp = { ...DEFAULT_WALL, system: 'horizontal' as const }
  const d = designWall(inp)
  const m = wallModel(inp, d)
  const of = (g: string) => m.parts.filter((p) => p.group === g && p.shape === 'box') as Extract<(typeof m.parts)[number], { shape: 'box' }>[]

  it('studs run the length of the wall at every stud level on both faces', () => {
    const studs = of('stud')
    expect(studs.length).toBe(2 * d.layout.studLevels.length)
    for (const s of studs) expect(s.size[0]).toBe(DEFAULT_WALL.length)
  })
  it('double wales stand the full height at every wale position', () => {
    const wales = of('wale')
    expect(wales.length).toBe(2 * 2 * d.layout.waleX.length)
    for (const w of wales) expect(w.size[1]).toBe(DEFAULT_WALL.height)
  })
  it('one tie (+2 plates) per tie level and wale; plates bridge the side-by-side pair', () => {
    expect(m.parts.filter((p) => p.group === 'tie').length).toBe(3 * d.layout.tieLevels.length * d.layout.waleX.length)
    const plate = of('tie')[0]
    expect(plate.size[0]).toBeGreaterThan(plate.size[1])
  })
  it('handles: stud spacing up the wall, wale spacing along it', () => {
    expect(m.handles.find((h) => h.key === 'studSpacing')!.axis).toEqual([0, 1, 0])
    expect(m.handles.find((h) => h.key === 'waleSpacing')!.axis).toEqual([1, 0, 0])
  })
})

describe('column model', () => {
  const d = designColumn(DEFAULT_COLUMN)
  const m = columnModel(DEFAULT_COLUMN, d)
  const count = (g: string) => m.parts.filter((p) => p.group === g).length

  it('4 yoke sets × count per level', () => {
    expect(count('yoke')).toBe(4 * DEFAULT_COLUMN.yoke.count * d.layout.yokeLevels.length)
  })
  it('ties split the long side (+2 bearing plates each), plus 4 corner bolts per level', () => {
    const ties = d.layout.yokeLevels.length * (DEFAULT_COLUMN.tie.spans - 1)
    expect(count('tie')).toBe(4 * d.layout.yokeLevels.length + 3 * ties)
    const plates = columnModel(DEFAULT_COLUMN, d).parts.filter((p) => p.id.startsWith('tieplate'))
    expect(plates).toHaveLength(2 * ties)
  })
  it('braces per side × sides', () => {
    expect(count('brace')).toBe(DEFAULT_COLUMN.brace.perSide * DEFAULT_COLUMN.brace.sides)
  })
  it('ties through the short faces too when shortSpans > 1', () => {
    const inp = { ...DEFAULT_COLUMN, b: 0.9, tie: { ...DEFAULT_COLUMN.tie, shortSpans: 3 } }
    const d2 = designColumn(inp)
    const short = columnModel(inp, d2).parts.filter((p) => p.id.startsWith('tieS-'))
    expect(short).toHaveLength(d2.layout.yokeLevels.length * 2)
  })
  it('handles edit b/h as half-widths', () => {
    expect(applyColumnHandle(DEFAULT_COLUMN, 'b', 0.26).b).toBe(0.5)
    expect(applyColumnHandle(DEFAULT_COLUMN, 'yokeSpacing', 0.42).yoke.spacingCm).toBe(40)
  })
})
