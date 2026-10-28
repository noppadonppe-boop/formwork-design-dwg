// Book Chapter 9 worked examples 9.1 and 9.3 (direct-calculation method).
import { describe, expect, it } from 'vitest'
import { designColumn, type ColumnInput } from './column'
import { DEFAULT_BRACE } from './design'
import { getMaterial } from './materials'
import { combinedTensionBending, maxSpan } from './member'
import { board, multiple, plywoodStrip, timber } from './sections'

const soft = getMaterial('timber-yang')

/** Example 9.1: column 0.40 × 0.40 m, H 3.50 m, boards ¾" (1.87 cm), yokes 1½"×3", no ties. */
const ex91: ColumnInput = {
  b: 0.4,
  h: 0.4,
  height: 3.5,
  pressure: { method: 'CEB', R: 3, T: 30, slump: 10 },
  sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 1.87 },
  yoke: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', count: 1 },
  tie: { enabled: false, tieId: 'tie-3/8', spans: 1 },
  brace: { ...DEFAULT_BRACE, heightM: 3.0, perSide: 2, sides: 4, midBraced: false },
}

describe('Example 9.1 — square column 40×40 cm, board sheathing', () => {
  it('CEB pressure = 5,180 kg/m² (min of 8,400 / 5,180 / 6,400)', () => {
    expect(designColumn(ex91).pressure.Pmax).toBeCloseTo(5180, 0)
  })

  it('boards ¾": yoke spacing ≈30 (bending) / ≈33 (deflection) — book prints 136/46 (arithmetic slip)', () => {
    const lim = maxSpan({ section: board(40, 1.87), material: soft, support: 'continuous' }, 20.72)
    expect(lim.bending).toBeCloseTo(30, 0)
    expect(lim.deflection).toBeCloseTo(32.8, 0)
  })

  it('yoke 1½"×3" @40: σ = 14.7 ± 118 → NG (133 > 80)', () => {
    const ct = combinedTensionBending(timber(1.5, 3), soft, 414.4, 4144)
    expect(ct.tension).toBeCloseTo(132.6, 0)
    expect(ct.compression).toBeCloseTo(103.1, 0)
    expect(ct.ratio).toBeGreaterThan(1)
  })

  it('yoke 2"×4" @40: σ = 58.0 / 41.4 → OK', () => {
    const ct = combinedTensionBending(timber(2, 4), soft, 414.4, 4144)
    expect(ct.tension).toBeCloseTo(58.0, 0)
    expect(ct.compression).toBeCloseTo(41.4, 0)
    expect(ct.ratio).toBeLessThan(1)
  })

  it('auto design reduces yoke spacing to 20 cm for 1½"×3" (book final: 16 @ 0.20)', () => {
    const d = designColumn(ex91)
    expect(d.layout.yokeSpacing).toBe(20)
    const yoke = d.components.find((c) => c.key === 'yoke')!
    const t = yoke.rows.find((r) => r.item.includes('ดึง'))!
    expect(t.demand).toBeCloseTo(66.3, 0) // book 66.6 with S = 35
    expect(yoke.status).not.toBe('fail')
  })

  it('base: 3 nails per side at yoke spacing 40', () => {
    const d = designColumn({ ...ex91, yoke: { ...ex91.yoke, spacingCm: 40 } })
    expect(d.components.find((c) => c.key === 'sill')!.spec).toContain('3 ตัว')
  })
})

/** Example 9.3: column 0.30 × 1.20 m, H 3.50 m, plywood 20 mm (E 110,000), studs 1½"×3" @30, yokes 2-1½"×3" @50, ties split long side in 3. */
const ex93: ColumnInput = {
  b: 0.3,
  h: 1.2,
  height: 3.5,
  pressure: { method: 'CEB', R: 5, T: 30, slump: 10 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 20 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', spacingCm: 30 },
  yoke: { sectionId: 'timber-1.5x3', materialId: 'timber-yang', count: 2, addCm: 10 },
  tie: { enabled: true, tieId: 'tie-3/8', spans: 3 },
  brace: { ...DEFAULT_BRACE, heightM: 3.0, perSide: 2, sides: 4 },
  checkTimberShear: false, // book's direct method
}

describe('Example 9.3 — rectangular column 30×120 cm, plywood + studs', () => {
  const d = designColumn(ex93)
  it('CEB pressure = 6,000 kg/m² (narrow-form governs)', () => expect(d.pressure.Pmax).toBeCloseTo(6000, 0))

  it('plywood 20 mm (E 110,000): 39 / 35 cm → studs @30', () => {
    const mat = { ...getMaterial('ply-apa1'), E: 110000 }
    const lim = maxSpan({ section: plywoodStrip(20), material: mat, support: 'continuous' }, 60)
    expect(lim.bending).toBeCloseTo(38.7, 0)
    expect(lim.deflection).toBeCloseTo(35.2, 0)
  })

  it('studs 1½"×3" @30: yoke span 40 (bending) / 62 (deflection) → yokes @50 c/c', () => {
    const lim = maxSpan({ section: timber(1.5, 3), material: soft, support: 'continuous' }, 18)
    expect(lim.bending).toBeCloseTo(39.5, 0)
    expect(lim.deflection).toBeCloseTo(62.6, 0)
    // engine floors 39.5 → 35 net + 10 = 45 c/c; the book rounds up to 40 net → 50 c/c (yoke then at ratio ≈ 1.00)
    expect(d.layout.yokeSpacing).toBe(45)
  })

  it('long yoke 2-1½"×3" @50 (3 spans of 40): σ = 8 ± 68 → 76 tension / 60 compression', () => {
    const ct = combinedTensionBending(multiple(timber(1.5, 3), 2), soft, 450, 4800)
    expect(ct.tension).toBeCloseTo(76.3, 0)
    expect(ct.compression).toBeCloseTo(60.3, 0)
  })

  it('short yoke @50 (span 30): σ = 10.7 ± 48 → 58.7 / 37.3', () => {
    const ct = combinedTensionBending(multiple(timber(1.5, 3), 2), soft, 600, 3375)
    expect(ct.tension).toBeCloseTo(58.7, 0)
    expect(ct.compression).toBeCloseTo(37.3, 0)
  })

  it('with the book spacing fixed at 50 cm the long yoke is at the limit (ratio ≈ 1.00)', () => {
    const fixed = designColumn({ ...ex93, yoke: { ...ex93.yoke, spacingCm: 50 } })
    expect(fixed.components.find((c) => c.key === 'yoke')!.maxRatio).toBeCloseTo(1.0, 1)
  })
})

describe('ties through both faces', () => {
  const sq: ColumnInput = { ...ex93, b: 1.0, h: 1.2, tie: { enabled: true, tieId: 'tie-1/2', spans: 3, shortSpans: 2 }, yoke: { ...ex93.yoke, spacingCm: 40 } }
  const both = designColumn(sq)
  const longOnly = designColumn({ ...sq, tie: { ...sq.tie, shortSpans: undefined } })
  const tie = both.components.find((c) => c.key === 'tie')!

  it('checks the tension in each tie direction: T = P × yoke spacing × tie spacing', () => {
    const P = both.pressure.Pmax
    expect(tie.rows).toHaveLength(2)
    expect(tie.rows[0].demand).toBeCloseTo(P * 0.4 * 0.4, 3)
    expect(tie.rows[1].demand).toBeCloseTo(P * 0.4 * 0.5, 3)
    expect(tie.spec).toContain('2 แถว ผ่านด้านยาว + 1 แถว ผ่านด้านสั้น')
  })

  it('short ties shorten the short-yoke span and lower the yoke ratio', () => {
    const yr = (d: typeof both) => d.components.find((c) => c.key === 'yoke')!.maxRatio
    expect(yr(both)).toBeLessThan(yr(longOnly))
  })

  it('counts ties in both directions per yoke level', () => {
    expect(both.quantities.ties).toBe(both.layout.yokeLevels.length * (2 + 1))
    expect(longOnly.quantities.ties).toBe(longOnly.layout.yokeLevels.length * 2)
  })

  it('short spans are ignored when ties are off', () => {
    const off = designColumn({ ...sq, tie: { ...sq.tie, enabled: false } })
    expect(off.components.find((c) => c.key === 'tie')).toBeUndefined()
    expect(off.quantities.ties).toBe(0)
  })
})
