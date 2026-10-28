// Round, hexagonal and octagonal columns (planShape.ts + the shape paths of designColumn).
import { describe, expect, it } from 'vitest'
import { designColumn, type ColumnInput } from './column'
import { DEFAULT_BRACE } from './design'
import { getMaterial } from './materials'
import { type ColumnShape, columnSection, plywoodBendRadius, polygonBox, polygonDims, polygonFaces, requiredTies } from './planShape'
import { multiple, timber } from './sections'

const base: ColumnInput = {
  b: 0.6,
  h: 0.6,
  height: 3.5,
  pressure: { method: 'CEB', R: 5, T: 30, slump: 10 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 20 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', spacingCm: 30 },
  yoke: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', count: 2, addCm: 10 },
  tie: { enabled: true, tieId: 'tie-3/8', spans: 2 },
  brace: { ...DEFAULT_BRACE, heightM: 3.0, perSide: 2, sides: 4 },
}
const comp = (d: ReturnType<typeof designColumn>, key: string) => d.components.find((c) => c.key === key)

describe('polygon geometry', () => {
  it('side a = F·tan(π/n), circumradius R = F / 2cos(π/n)', () => {
    expect(polygonDims(8, 1).a).toBeCloseTo(0.4142, 4)
    expect(polygonDims(6, 1).a).toBeCloseTo(0.5774, 4)
    expect(polygonDims(6, 1).R).toBeCloseTo(0.5774, 4)
  })
  it('faces sit at F/2 from the centre, flats on ±z (and ±x for the octagon)', () => {
    const f = polygonFaces(8, 0.6)
    expect(f).toHaveLength(8)
    for (const x of f) expect(Math.hypot(...x.c)).toBeCloseTo(0.3, 6)
    expect(f[0].c[1]).toBeCloseTo(0.3, 6)
    expect(f[2].c[0]).toBeCloseTo(-0.3, 6)
  })
  it('box: across the corners × F for the hexagon, F × F for the octagon', () => {
    expect(polygonBox(6, 0.6)[0]).toBeCloseTo(0.6928, 4)
    expect(polygonBox(8, 0.6)).toEqual([0.6, 0.6])
  })
  it('area and perimeter of the section', () => {
    expect(columnSection({ b: 0.5, h: 0.5, shape: { kind: 'circle', system: 'stave' } }).area).toBeCloseTo((Math.PI * 0.25) / 4, 6)
    // regular octagon of F = 1: area = 2(√2 − 1)·F² ≈ 0.8284
    expect(columnSection({ b: 1, h: 1, shape: { kind: 'polygon', n: 8, yoke: 'box' } }).area).toBeCloseTo(0.8284, 4)
    expect(columnSection({ b: 0.3, h: 0.6 }).perimeter).toBeCloseTo(1.8, 6)
  })
  it('plywood bends to R ≥ 3.6 m at 18 mm, 0.9 m at 9 mm', () => {
    expect(plywoodBendRadius(18)).toBe(3.6)
    expect(plywoodBendRadius(9)).toBe(0.9)
  })
})

describe('octagon / hexagon column', () => {
  const box = designColumn({ ...base, shape: { kind: 'polygon', n: 8, yoke: 'box' } })
  const sq = designColumn(base)
  const ring = designColumn({ ...base, shape: { kind: 'polygon', n: 8, yoke: 'ring' } })

  it('in a box of yokes: the same yokes as the F × F square, fillers at the 4 sloping faces', () => {
    expect(box.layout.yokeSpacing).toBe(sq.layout.yokeSpacing)
    expect(comp(box, 'yoke')!.rows.map((r) => r.demand)).toEqual(comp(sq, 'yoke')!.rows.map((r) => r.demand))
    expect(box.quantities.fillers).toBe(4)
    expect(box.quantities.plywoodArea).toBeCloseTo(8 * polygonDims(8, 0.6).a * 3.5, 6)
  })

  it('ring: span a, M = w·a²/8 and T = w·F/2, no ties', () => {
    const s = ring.layout.yokeSpacing
    const w = (ring.pressure.Pmax * (s / 100)) / 100
    const a = polygonDims(8, 0.6).a * 100
    const y = multiple(timber(1.5, 3), 2)
    const m = getMaterial('timber-yang')
    const ft = (w * 60) / 2 / y.A
    const fb = (w * a * a) / 8 / y.Sx
    expect(comp(ring, 'yoke')!.rows[0].demand).toBeCloseTo(ft + fb, 6)
    expect(comp(ring, 'yoke')!.maxRatio).toBeLessThanOrEqual(1)
    expect(comp(ring, 'tie')).toBeUndefined()
    expect(ring.quantities.ties).toBe(0)
    expect(ring.quantities.yokes).toBe(ring.layout.yokeLevels.length * 8 * 2)
    expect(m.Ft ?? m.Fb).toBe(comp(ring, 'yoke')!.rows[0].capacity)
  })

  it('a hexagon in a box is designed on its 2R × F box', () => {
    const hex = designColumn({ ...base, shape: { kind: 'polygon', n: 6, yoke: 'box' } })
    const rect = designColumn({ ...base, b: 0.6, h: polygonBox(6, 0.6)[0] })
    expect(comp(hex, 'yoke')!.rows.map((r) => r.demand)).toEqual(comp(rect, 'yoke')!.rows.map((r) => r.demand))
  })
})

describe('round column', () => {
  const stave: ColumnInput = { ...base, b: 0.5, h: 0.5, shape: { kind: 'circle', system: 'stave' }, sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 }, yoke: { sectionId: 'timber-1x10', materialId: 'timber-yang', count: 1 } }
  const d = designColumn(stave)

  it('Example 9.2: D 0.60, H 3.0, staves 1", yokes 1"×10" cut to 17.5 cm — P 6,740, yokes @25, σ 71 / 48', () => {
    const ex92: ColumnInput = {
      ...stave,
      b: 0.6,
      h: 0.6,
      height: 3,
      pressure: { method: 'CEB', R: 4, T: 30, slump: 10 },
      shape: { kind: 'circle', system: 'stave', netCm: 17.5 },
      yoke: { sectionId: 'timber-1x10', materialId: 'timber-yang', count: 1 },
    }
    const r = designColumn(ex92)
    expect(r.pressure.Pmax).toBeCloseTo(6740, 0)
    // staves: bending a = 35 cm; the yokes bring it down to 25 (book: "use 25")
    expect(comp(r, 'sheathing')!.spacing!.max).toBeCloseTo(35, 0)
    expect(r.layout.yokeSpacing).toBe(25)
    const y = comp(r, 'yoke')!
    expect(y.rows[0].demand).toBeCloseTo(71.0, 0) // book 70.7 (11.5 + 59.2)
    expect(y.rows[1].demand).toBeCloseTo(47.9, 0) // book 48
    expect(y.maxRatio).toBeLessThanOrEqual(1)
    expect(comp(r, 'tie')).toBeUndefined()
  })

  it('yoke boards are cut ro(1 − cos 45°) deep by default', () => {
    const net = comp(d, 'yoke')!.trace.steps.find((s) => s.label.startsWith('ความลึกสุทธิ'))!.value
    const ro = 25 + 2.5
    expect(net).toBeCloseTo(25 - ro * (1 - Math.SQRT1_2), 6)
    expect(d.status).not.toBe('fail')
  })

  it('pressure uses D, staves no wider than 7.5 cm, a square frame of 4 yokes per level', () => {
    expect(d.layout.staves).toBe(Math.ceil((Math.PI * 50) / 7.5))
    expect(d.quantities.studs).toBe(0)
    expect(d.quantities.yokes).toBe(d.layout.yokeLevels.length * 4)
    expect(d.quantities.formArea).toBeCloseTo(Math.PI * 0.5 * 3.5, 6)
    expect(d.quantities.plywoodArea).toBe(0)
  })

  it('steel form: maker pressure and flange bolts', () => {
    const st = designColumn({ ...stave, shape: { kind: 'circle', system: 'steel', ratedKgM2: 8000 } })
    expect(comp(st, 'sheathing')!.rows[0].capacity).toBe(8000)
    const bolt = comp(st, 'tie')!
    expect(bolt.rows[0].demand).toBeCloseTo(st.pressure.Pmax * 0.25 * (st.layout.yokeSpacing / 100), 6)
    expect(bolt.maxRatio).toBeLessThanOrEqual(1)
    expect(st.quantities.formArea).toBeCloseTo(Math.PI * 0.5 * 3.5, 6)
    expect(st.quantities.plywoodArea).toBe(0)
  })

  it('tube: only the pressure check and the braces', () => {
    const tb = designColumn({ ...stave, shape: { kind: 'circle', system: 'tube' } })
    expect(tb.components.map((c) => c.key)).toEqual(['sheathing', 'brace'])
    expect(tb.layout.yokeLevels).toEqual([])
  })
})

describe('rectangle unchanged', () => {
  it('an explicit rect shape gives the same result as no shape', () => {
    const a = designColumn({ ...base, b: 0.3, h: 1.2 })
    const b = designColumn({ ...base, b: 0.3, h: 1.2, shape: { kind: 'rect' } })
    expect(JSON.stringify(b.components.map((c) => c.rows))).toBe(JSON.stringify(a.components.map((c) => c.rows)))
    expect(b.quantities).toEqual(a.quantities)
  })
})

describe('round column with a narrow yoke board', () => {
  it('warns that the board is too narrow for its cut-out', () => {
    const r = designColumn({ ...base, b: 0.5, h: 0.5, shape: { kind: 'circle', system: 'stave' }, sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 } })
    expect(r.warnings.some((w) => w.includes('แคบเกินไปสำหรับรอยเจาะโค้ง'))).toBe(true)
  })
})

describe('L / T / U columns', () => {
  const L: ColumnInput = { ...base, b: 0.8, h: 0.8, shape: { kind: 'L', a: 0.8, b: 0.8, ta: 0.25, tb: 0.25, yoke: 'tied' }, tie: { ...base.tie, spans: 1 } }

  it('inner-corner ties: L 2, T 3, U 4; section area and perimeter', () => {
    expect(requiredTies({ kind: 'L', a: 0.8, b: 0.8, ta: 0.25, tb: 0.25, yoke: 'tied' })).toBe(2)
    expect(requiredTies({ kind: 'T', bf: 0.9, tf: 0.25, tw: 0.25, d: 0.8, yoke: 'tied' })).toBe(3)
    expect(requiredTies({ kind: 'U', b: 1, d: 0.8, t: 0.25, tb: 0.25, yoke: 'tied' })).toBe(4)
    const s = columnSection(L)
    expect(s.area).toBeCloseTo(0.8 * 0.25 + 0.55 * 0.25, 9)
    expect(s.perimeter).toBeCloseTo(3.2, 9)
    expect(s.d).toBe(0.25)
  })

  it('L along the faces: each leg like a rectangular column held at its root by the tie', () => {
    const d = designColumn(L)
    const s = d.layout.yokeSpacing
    const P = d.pressure.Pmax
    const tie = comp(d, 'tie')!
    expect(tie.rows).toHaveLength(2)
    // root tie: P × s × (leg span / 2 + corner span / 2) = P × s × (0.55/2 + 0.25/2)
    expect(tie.rows[0].demand).toBeCloseTo(P * (s / 100) * (0.55 / 2 + 0.25 / 2), 6)
    // long yoke of a leg: span 55 cm, tension w·t/2
    const w = (P * (s / 100)) / 100
    const y = multiple(timber(1.5, 3), 2)
    expect(comp(d, 'yoke')!.rows[0].demand).toBeCloseTo((w * 25) / 2 / y.A + (w * 55 * 55) / 8 / y.Sx, 6)
    expect(d.quantities.yokes).toBe(d.layout.yokeLevels.length * 6 * 2)
    expect(d.quantities.ties).toBe(d.layout.yokeLevels.length * 2)
    expect(d.quantities.plywoodArea).toBeCloseTo(3.2 * 3.5, 6)
  })

  it('more ties along the legs split them and add their own rows', () => {
    const d = designColumn({ ...L, tie: { ...L.tie, spans: 2 } })
    expect(comp(d, 'tie')!.rows).toHaveLength(4)
    expect(d.quantities.ties).toBe(d.layout.yokeLevels.length * 4)
  })

  it('in a box of yokes: the rectangle of its box, one filler box', () => {
    // same pressure for both (the L takes d = 25 cm, the 80 × 80 rectangle d = 80 cm)
    const hydro = { ...L.pressure, method: 'HYDROSTATIC' as const }
    const box = designColumn({ ...L, pressure: hydro, shape: { ...(L.shape as Extract<ColumnShape, { kind: 'L' }>), yoke: 'box' }, tie: { ...L.tie, enabled: false } })
    const rect = designColumn({ ...L, pressure: hydro, shape: undefined, tie: { ...L.tie, enabled: false } })
    expect(comp(box, 'yoke')!.rows.map((r) => r.demand)).toEqual(comp(rect, 'yoke')!.rows.map((r) => r.demand))
    expect(box.quantities.fillerBoxes).toBe(1)
  })

  it('U: the base is tied at both ends; a narrow gap warns', () => {
    const U: ColumnInput = { ...base, b: 1, h: 0.8, shape: { kind: 'U', b: 1, d: 0.8, t: 0.25, tb: 0.25, yoke: 'tied' }, tie: { ...base.tie, spans: 1 } }
    const d = designColumn(U)
    expect(d.quantities.ties).toBe(d.layout.yokeLevels.length * 4)
    expect(d.warnings.some((w) => w.includes('ช่องในตัว U'))).toBe(false)
    const narrow = designColumn({ ...U, shape: { kind: 'U', b: 0.8, d: 0.8, t: 0.25, tb: 0.25, yoke: 'tied' } })
    expect(narrow.warnings.some((w) => w.includes('ช่องในตัว U'))).toBe(true)
  })

  it('T: three ties, eight faces', () => {
    const d = designColumn({ ...base, b: 0.9, h: 0.8, shape: { kind: 'T', bf: 0.9, tf: 0.25, tw: 0.25, d: 0.8, yoke: 'tied' }, tie: { ...base.tie, spans: 1 } })
    expect(comp(d, 'tie')!.rows).toHaveLength(3)
    expect(d.quantities.yokes).toBe(d.layout.yokeLevels.length * 8 * 2)
    expect(comp(d, 'yoke')!.maxRatio).toBeLessThanOrEqual(1)
    expect(comp(d, 'tie')!.maxRatio).toBeLessThanOrEqual(1)
  })
})
