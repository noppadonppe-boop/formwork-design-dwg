// Book Chapter 8 worked examples 8.1 and 8.3 (direct-calculation method).
import { describe, expect, it } from 'vitest'
import { DEFAULT_BRACE } from './design'
import { getMaterial } from './materials'
import { maxSpan } from './member'
import { lateralPressure } from './pressure'
import { plywoodStrip, rect, timber } from './sections'
import { designWall, type WallInput } from './wall'

const soft = getMaterial('timber-yang')
const ply = getMaterial('ply-apa1')

/** Example 8.1: basement wall t 25 cm, H 2.50 m, plywood 15 mm, studs 1½"×3", wales 2-2"×4", ties Ø3/8". */
const ex81: WallInput = {
  thickness: 0.25,
  height: 2.5,
  length: 6,
  pressure: { method: 'CEB', R: 2, T: 30, slump: 10 },
  sheathing: { materialId: 'ply-apa1', thicknessMm: 15 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', spacingCm: 15 },
  wale: { sectionId: 'timber-2x4', materialId: 'timber-yang', count: 2, addCm: 10 },
  tie: { tieId: 'tie-3/8' },
  brace: { ...DEFAULT_BRACE, sectionId: 'timber-1.5x3', angleDeg: 60, spacingM: 1.2, midBraced: true, oneSided: true },
  bottomWaleOffsetM: 0.1,
  checkTimberShear: false, // book's direct method checks bending + deflection only
}

describe('Table 8.4 — timber stud wale spacing is shear-governed (Fv 10, l − 2d)', () => {
  const span = (b: number, h: number, spacing: number, p: number) =>
    Math.floor(maxSpan({ section: timber(b, h), material: soft, support: 'continuous', checkShear: true, shearReduction: true }, (p * spacing) / 10000).max / 5 + 1e-9) * 5
  it('1½"×3" @15: P 3,000 → 75, P 4,000 → 65', () => {
    expect(span(1.5, 3, 15, 3000)).toBe(75)
    expect(span(1.5, 3, 15, 4000)).toBe(65)
  })
  it('2"×4" @15: P 4,000 → 105', () => expect(span(2, 4, 15, 4000)).toBe(105))
})

describe('Example 8.1 with the timber shear check on (app default)', () => {
  const d = designWall({ ...ex81, checkTimberShear: true })
  it('studs @15 still give wales @80 c/c (≈ Table 8.4 → 70 + 10)', () => expect(d.layout.waleSpacing).toBe(80))
  it('2-2"×4" wale shear limits tie spacing to 40 cm (book method 1 ignores wale shear → 60)', () => {
    expect(d.layout.tieSpacing).toBe(40)
    expect(d.status).not.toBe('fail')
  })
})

describe('Example 8.1 — wall 25 cm × 2.50 m', () => {
  it('CEB pressure = 3,620 kg/m² (min of 6,000 / 3,620 / 4,600)', () => {
    const p = lateralPressure({ ...ex81.pressure, element: 'wall', H: 2.5, d: 0.25 })
    expect(p.Pmax).toBeCloseTo(3620, 0)
  })

  it('sheathing 15 mm: a = 37 cm (bending), 31 cm (deflection) → studs @30', () => {
    const lim = maxSpan({ section: plywoodStrip(15), material: ply, support: 'continuous' }, 36.2)
    expect(lim.bending).toBeCloseTo(37.4, 0)
    expect(Math.floor(lim.deflection)).toBe(31)
    const d = designWall({ ...ex81, stud: { ...ex81.stud, spacingCm: undefined } })
    expect(d.layout.studSpacing).toBe(30)
  })

  it('studs 1½"×3" @30: wale span 51 (bending) / 74 (deflection)', () => {
    const lim = maxSpan({ section: timber(1.5, 3), material: soft, support: 'continuous' }, 10.86)
    expect(lim.bending).toBeCloseTo(50.9, 0)
    expect(lim.deflection).toBeCloseTo(74, 0)
  })

  it('studs 1½"×3" (b 3.7) @15: 71 / 93 → wales @80 c/c', () => {
    const lim = maxSpan({ section: rect(3.7, 7.5), material: soft, support: 'continuous' }, 5.43)
    expect(lim.bending).toBeCloseTo(71.5, 0)
    expect(lim.deflection).toBeCloseTo(93, 0)
    expect(designWall(ex81).layout.waleSpacing).toBe(80)
  })

  it('ties Ø3/8" (2,100 kg): 0.58 m² → spacing 0.725 m → 60 cm', () => {
    const d = designWall(ex81)
    expect(d.layout.tieSpacing).toBe(60)
    const tie = d.components.find((c) => c.key === 'tie')!
    expect(tie.rows[0].demand).toBeCloseTo(3620 * 0.8 * 0.6, 0)
    expect(tie.status).not.toBe('fail')
  })

  it('wales 2-2"×4" pass (book S 166 > 162.5, I 833 > 233)', () => {
    const wale = designWall(ex81).components.find((c) => c.key === 'wale')!
    expect(wale.status).not.toBe('fail')
  })

  it('bottom plate: concrete nails Ø4 mm @40 cm', () => {
    const sill = designWall(ex81).components.find((c) => c.key === 'sill')!
    expect(sill.spec).toContain('@40')
  })

  it('braces 1½"×3" @1.20 m, 60°, mid-braced: force 300 kg, capacity 531 kg', () => {
    const brace = designWall(ex81).components.find((c) => c.key === 'brace')!
    const comp = brace.rows[0]
    expect(comp.demand).toBeCloseTo(300, 0)
    expect(comp.capacity).toBeCloseTo(531, -1)
  })

  it('whole design passes', () => {
    expect(designWall(ex81).status).not.toBe('fail')
  })
})

/** Example 8.3: wall 40 cm, H 5.00 m single pour, plywood 20 mm, studs 2"×4" @20, wales 2-C100×50×20×2.3, ties Ø1/2". */
const ex83: WallInput = {
  thickness: 0.4,
  height: 5.0,
  length: 6,
  pressure: { method: 'CEB', R: 2.5, T: 30, slump: 10 },
  sheathing: { materialId: 'ply-apa1', thicknessMm: 20 },
  stud: { sectionId: 'timber-2x4', materialId: 'timber-yang', spacingCm: 20 },
  wale: { sectionId: 'lipC-100×50×20×2.3', materialId: 'steel-ss400', count: 2, spacingCm: 90 },
  tie: { tieId: 'tie-1/2', spacingCm: 60 },
  brace: { ...DEFAULT_BRACE, sectionId: 'pipe-6.03', materialId: 'steel-a36', spacingM: 1.2, levels: 2, midBraced: true },
  bottomWaleOffsetM: 0.3,
  checkTimberShear: false,
}

describe('Example 8.3 — wall 40 cm × 5.00 m', () => {
  const d = designWall(ex83)
  it('CEB pressure = 4,400 kg/m²', () => expect(d.pressure.Pmax).toBeCloseTo(4400, 0))

  it('plywood 20 mm: 45 cm bending, 39 cm deflection', () => {
    const lim = maxSpan({ section: plywoodStrip(20), material: ply, support: 'continuous' }, 44)
    expect(lim.bending).toBeCloseTo(45.2, 0)
    expect(lim.deflection).toBeCloseTo(39.6, 0)
  })

  it('studs: 1½"×3"(3.7) @20 → 56/79 cm; 2"×4" @20 → 87/116.5 cm', () => {
    const a = maxSpan({ section: rect(3.7, 7.5), material: soft, support: 'continuous' }, 8.8)
    expect(a.bending).toBeCloseTo(56, 0)
    expect(a.deflection).toBeCloseTo(79, 0)
    const b = maxSpan({ section: timber(2, 4), material: soft, support: 'continuous' }, 8.8)
    expect(b.bending).toBeCloseTo(87, 0)
    expect(b.deflection).toBeCloseTo(116.5, 0)
  })

  it('wale shear v = 1,485/(2×0.23×10) = 322 kg/cm²', () => {
    const wale = d.components.find((c) => c.key === 'wale')!
    const v = wale.rows.find((r) => r.item.includes('เฉือน'))!
    expect(v.demand).toBeCloseTo(322.8, 0)
    expect(wale.status).toBe('ok')
  })

  it('tie load 0.90 × 0.60 × 4,400 = 2,376 kg ≤ 2,800', () => {
    const tie = d.components.find((c) => c.key === 'tie')!
    expect(tie.rows[0].demand).toBeCloseTo(2376, 0)
    expect(tie.rows[0].ratio).toBeLessThan(1)
  })

  it('bottom plate nails @20 cm (660 kg/m)', () => {
    expect(d.components.find((c) => c.key === 'sill')!.spec).toContain('@20')
  })

  it('braces: 500 kg/m wind case → 300 kg per brace (2 levels @1.20 m)', () => {
    const brace = d.components.find((c) => c.key === 'brace')!
    expect(brace.rows[0].demand).toBeCloseTo(300, 0)
    expect(brace.status).toBe('ok')
  })
})
