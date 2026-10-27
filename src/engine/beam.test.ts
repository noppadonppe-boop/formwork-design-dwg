// Book Chapter 7 worked examples 7.1–7.4 (method I — direct calculation).
import { describe, expect, it } from 'vitest'
import { type BeamInput, DEFAULT_BEAM, designBeam } from './beam'
import { DEFAULT_SHORE } from './shoring'

const base: BeamInput = {
  ...DEFAULT_BEAM,
  loads: { liveLoad: 150, formWeight: 50, gamma: 2400, beamFormWeight: 100 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-soft' },
  head: { sectionId: 'timber-2x4', materialId: 'timber-soft', count: 1 },
  shore: { ...DEFAULT_SHORE, kind: 'post', sectionId: 'timber-1.5x3', materialId: 'timber-soft', braceLevels: 1, lengthM: 3, layout: 'single', postSpacingM: 0.6 },
  checkTimberShear: false,
}
const comp = (d: ReturnType<typeof designBeam>, k: string) => d.components.find((x) => x.key === k)!

describe('Example 7.1 — isolated beam 30 × 50 cm, plywood 15 mm', () => {
  const d = designBeam({ ...base, type: 'isolated', b: 0.3, h: 0.5, slabT: 0, slabTribM: 0, sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 } })
  it('side pressure γh = 1,200 kg/m²', () => expect(d.pressure.Pmax).toBe(1200))
  it('studs @45 (bending 65, deflection 45 governs)', () => {
    expect(comp(d, 'sheathing').spacing!.max).toBeCloseTo(45.9, 0)
    expect(d.layout.studSpacing).toBe(45)
  })
  it('1½"×3" shore braced at mid-height, 3.00 m: capacity ≈ 495 kg (Table 6.10 at 1.50 m)', () => {
    expect(comp(d, 'shore').rows[0].capacity).toBeCloseTo(496, -1)
  })
  it('isolated beam gets top-of-form braces on both sides', () => expect(comp(d, 'brace')).toBeDefined())
})

describe('Example 7.2 — T-beam with slab, boards ¾"×8"', () => {
  const d = designBeam({ ...base, type: 'slab', b: 0.2, h: 0.5, slabT: 0.1, slabTribM: 1.0, sheathing: { type: 'board', materialId: 'timber-soft', thicknessCm: 1.8 }, bottom: { ...base.bottom, count: 0 } })
  it('studs @50 (bending 60, deflection 51)', () => {
    expect(comp(d, 'sheathing').spacing!.max).toBeCloseTo(51.4, 0)
    expect(d.layout.studSpacing).toBe(50)
  })
  it('bottom board 20 × 1.8 → heads @50 (deflection 51)', () => {
    expect(comp(d, 'bottom').spacing!.max).toBeCloseTo(51.4, 0)
    expect(d.layout.headSpacing).toBe(50)
  })
  it('no top braces — slab joists hold the sides', () => expect(comp(d, 'brace')).toBeUndefined())
})

describe('Example 7.3 — spandrel beam 40 × 80 cm, 1" boards, double-post shores', () => {
  const inp: BeamInput = {
    ...base,
    type: 'spandrel',
    b: 0.4,
    h: 0.8,
    slabT: 0.15,
    slabTribM: 0.3,
    sheathing: { type: 'board', materialId: 'timber-soft', thicknessCm: 2.5 },
    bottom: { ...base.bottom, count: 0 },
    head: { sectionId: 'timber-2x4', materialId: 'timber-soft', count: 2 },
    shore: { ...base.shore, layout: 'double', postSpacingM: 0.6, braceLevels: 0, lengthM: 2 },
  }
  const d = designBeam(inp)
  it('p = 1,920 kg/m²; studs @60 (deflection 61)', () => {
    expect(d.pressure.Pmax).toBe(1920)
    expect(d.layout.studSpacing).toBe(60)
  })
  it('bottom 2 boards → heads @60', () => expect(d.layout.headSpacing).toBe(60))
  it('head 2-2"×4" on posts 0.60 apart: M = 52 kg-m, fb 31, fv 5.2', () => {
    const t = comp(d, 'head').trace.steps
    expect(t.find((s) => s.label.startsWith('M ='))!.value! / 100).toBeCloseTo(51.8, 0)
    expect(comp(d, 'head').rows[0].demand).toBeCloseTo(31.1, 0)
    expect(comp(d, 'head').rows[1].demand).toBeCloseTo(5.18, 1)
  })
  it('double 1½"×3" posts 2.00 m: unbraced ≈ 2×279 (book 530, d = 3.7) → braced ≈ 2×1,117 (book 2,140)', () => {
    expect(2 * comp(d, 'shore').rows[0].capacity).toBeCloseTo(558, -1)
    const braced = designBeam({ ...inp, shore: { ...inp.shore, braceLevels: 1 } })
    expect(2 * comp(braced, 'shore').rows[0].capacity).toBeCloseTo(2233, -1)
  })
})

describe('Example 7.4 — encased I-beam 30 × 60 cm, plywood 15 mm, bottom 2-2"×4" flat', () => {
  const inp: BeamInput = {
    ...base,
    type: 'slab',
    b: 0.3,
    h: 0.6,
    slabT: 0,
    slabTribM: 0,
    sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 },
    bottom: { count: 2, sectionId: 'timber-2x4', materialId: 'timber-soft', flat: true },
  }
  const d = designBeam(inp)
  it('studs @40 (bending 59, deflection 43)', () => {
    expect(comp(d, 'sheathing').spacing!.max).toBeCloseTo(43.2, 0)
    expect(d.layout.studSpacing).toBe(40)
  })
  it('bottom: bending 124, deflection 117 governs, shear 197', () => {
    const t = comp(d, 'bottom').trace.steps
    expect(t.find((s) => s.label.includes('แรงดัด'))!.value).toBeCloseTo(124.2, 0)
    expect(t.find((s) => s.label.includes('แรงเฉือน'))!.value).toBeCloseTo(197.5, 0)
    expect(comp(d, 'bottom').spacing!.max).toBeCloseTo(117.3, 0)
  })
  it('heads on a multiple of the stud spacing ≤ 117 → 80 (the book rounds up to 120, Δ +7 %)', () => {
    expect(d.layout.headSpacing).toBe(80)
    const at120 = designBeam({ ...inp, head: { ...inp.head, spacingCm: 120 } })
    expect(comp(at120, 'bottom').maxRatio).toBeCloseTo(1.07, 1)
  })
})

describe('deep beam with through-ties', () => {
  it('adds wales and ties, and drops the top braces', () => {
    const d = designBeam({ ...base, type: 'isolated', b: 0.4, h: 1.2, slabT: 0, slabTribM: 0, tie: { ...base.tie, enabled: true, rows: 2 } })
    expect(comp(d, 'wale')).toBeDefined()
    expect(comp(d, 'tie').rows[0].demand).toBeCloseTo((2880 * 0.4 * d.layout.headSpacing) / 100, 0)
    expect(comp(d, 'brace')).toBeUndefined()
    expect(d.layout.tieLevels).toEqual([0.4, 0.8])
  })
})

describe('side studs without ties — simple span under the fluid (triangular) pressure', () => {
  it('M = 2WL/(9√3), V = 2W/3, Δ = 0.01304·WL³/EI', () => {
    const d = designBeam({ ...base, type: 'spandrel', b: 0.3, h: 0.7, slabT: 0.15, slabTribM: 0.6, stud: { ...base.stud, spacingCm: 45 }, checkTimberShear: true })
    const W = (2400 * 0.7 * 0.7) / 2 * 0.45 // outer side 0.70 m, studs @45
    const t = comp(d, 'stud').trace.steps
    expect(t.find((s) => s.label.startsWith('M ='))!.value).toBeCloseTo((2 * W * 70) / (9 * Math.sqrt(3)), 3)
    expect(comp(d, 'stud').rows[0].demand).toBeCloseTo((2 * W * 70) / (9 * Math.sqrt(3)) / 35.16, 1)
  })
})
