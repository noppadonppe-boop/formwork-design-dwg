// Book Chapter 10 worked examples 10.1–10.3 (method ก — direct calculation).
import { describe, expect, it } from 'vitest'
import { DEFAULT_FOOTING, designFooting, type FootingInput } from './footing'

const comp = (d: ReturnType<typeof designFooting>, k: string) => d.components.find((x) => x.key === k)!

/** Example 10.1: grade beam 0.40 × 1.20 m, boards ¾"×8" (t 1.9 cm), studs and braces 1½"×3", stakes to the soil (10 t/m²). */
const ex101: FootingInput = {
  ...DEFAULT_FOOTING,
  lengthX: 6,
  lengthY: 0.4,
  height: 1.2,
  pressure: { method: 'CEB', R: 2, T: 30, slump: 10 },
  sheathing: { type: 'board', materialId: 'timber-soft', thicknessCm: 1.9 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-soft' },
  support: 'braced',
  brace: { sectionId: 'timber-1.5x3', materialId: 'timber-soft', angleDeg: 45, topOverhangM: 0.3, spacingCm: 45 },
  checkTimberShear: false,
}

describe('Example 10.1 — grade beam, braced to stakes', () => {
  const d = designFooting(ex101)
  it('CEB pressure = 2,880 kg/m² (liquid governs over 3,620 / 6,100)', () => expect(d.pressure.Pmax).toBeCloseTo(2880, 6))
  it('boards ¾" (1.9 cm) → studs @40 (bending 41, deflection 41)', () => {
    expect(comp(d, 'sheathing').spacing!.max).toBeCloseTo(40.5, 0)
    expect(d.layout.studSpacing).toBe(40)
  })
  it('studs 1½"×3" @40, M = wl²/8 → bending limit 44 cm', () => {
    expect(comp(d, 'stud').trace.steps.find((s) => s.label.includes('แรงดัด'))!.value).toBeCloseTo(44.2, 0)
  })
  it('braces at +0.90 and +0.45 m; bottom stake 259 kg → 0.69 m deep (book 0.70)', () => {
    expect(d.layout.braceLevels).toEqual([0.9, 0.45])
    const t = comp(d, 'stake').trace.steps
    expect(t[0].value).toBeCloseTo(259.2, 0)
    expect(t[1].value).toBeCloseTo(0.69, 2)
  })
})

/** Example 10.2: pier footing 10.00 × 2.40 × 4.00 m, plywood 20 mm, steel studs ▭100×50×2.3, wales 2-□100×100×2.3, ties. */
const ex102: FootingInput = {
  ...DEFAULT_FOOTING,
  lengthX: 10,
  lengthY: 2.4,
  height: 4,
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 20 },
  stud: { sectionId: 'rhs-100×50×2.3', materialId: 'steel-a36' },
  support: 'tied',
  wale: { sectionId: 'box-100×100×2.3', materialId: 'steel-a36', count: 2, addCm: 0, bottomOffsetM: 0.3 },
  tie: { tieId: 'rb-19', spacingCm: 120 },
}

describe('Example 10.2 — pier footing, wales and ties', () => {
  const d = designFooting(ex102)
  it('CEB pressure = 3,620 kg/m²', () => expect(d.pressure.Pmax).toBeCloseTo(3620, 6))
  it('plywood 20 mm → studs @40 (deflection 42)', () => expect(d.layout.studSpacing).toBe(40))
  it('steel studs @40 → wales @1.20 (bending 121, deflection 161)', () => {
    expect(comp(d, 'stud').spacing!.max).toBeCloseTo(121, 0)
    expect(d.layout.waleSpacing).toBe(120)
  })
  it('ties @1.20 × 1.20: T = 5,213 kg', () => expect(comp(d, 'tie').rows[0].demand).toBeCloseTo(5213, 0))
})

describe('Example 10.3 — pile cap 2.40 × 3.60 × 2.00 m', () => {
  const d = designFooting({
    ...ex102,
    lengthX: 3.6,
    lengthY: 2.4,
    height: 2,
    pressure: { method: 'CEB', R: 1.5, T: 30, slump: 10 },
    sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 15 },
    stud: { sectionId: 'timber-1.5x3', materialId: 'timber-soft' },
    wale: { sectionId: 'rhs-100×50×2.3', materialId: 'steel-a36', count: 1, addCm: 0, bottomOffsetM: 0.3 },
    checkTimberShear: false,
  })
  it('CEB pressure = 2,840 kg/m²', () => expect(d.pressure.Pmax).toBeCloseTo(2840, 6))
  it('plywood 15 mm → studs @30 (deflection 34)', () => expect(d.layout.studSpacing).toBe(30))
  it('studs 1½"×3" @30 → wale spacing limit 57 cm (book rounds to 60)', () => expect(comp(d, 'stud').spacing!.max).toBeCloseTo(57.5, 0))
})

describe('cantilever studs', () => {
  it('checks the studs as cantilevers and the stake embedment', () => {
    const d = designFooting({ ...ex101, height: 0.5, support: 'cantilever' })
    expect(comp(d, 'stud').rows).toHaveLength(2)
    expect(comp(d, 'stake').rows[0].demand).toBeGreaterThan(0)
  })
})
