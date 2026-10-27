// Book Chapter 6 worked examples 6.1 and 6.2 (method ก — direct calculation).
import { describe, expect, it } from 'vitest'
import { DEFAULT_SHORE } from './shoring'
import { designSlab, type SlabInput } from './slab'

/** Example 6.1: flat slab 7.20 × 7.20 m, t 16 cm, storey 2.80 m; plywood 20 mm, joists 1½"×3", stringers 2"×6", shores Ø2" thin pipe. */
const ex61: SlabInput = {
  thickness: 0.16,
  lengthX: 7.2,
  lengthY: 7.2,
  clearHeight: 2.8,
  loads: { liveLoad: 150, formWeight: 50, gamma: 2400 },
  sheathing: { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 20 },
  joist: { sectionId: 'timber-1.5x3', materialId: 'timber-soft' },
  stringer: { sectionId: 'timber-2x6', materialId: 'timber-soft', count: 1 },
  shore: { ...DEFAULT_SHORE, kind: 'post', sectionId: 'pipe-6.03', materialId: 'steel-a36', braceLevels: 0, lengthM: 2.8 },
  bracing: { enabled: false, sectionId: 'timber-1.5x3', materialId: 'timber-soft' },
  checkTimberShear: false, // book checks shear on the stringers only
}

describe('Example 6.1 — flat slab t 16 cm', () => {
  const d = designSlab(ex61)
  const c = (k: string) => d.components.find((x) => x.key === k)!
  it('w = 384 + 150 + 50 = 584 kg/m²', () => expect(d.pressure.Pmax).toBeCloseTo(584, 6))
  it('plywood 20 mm → joists @75 (bending 124, deflection 77)', () => {
    expect(c('sheathing').spacing!.max).toBeCloseTo(77.7, 0)
    expect(d.layout.joistSpacing).toBe(75)
  })
  it('joists 1½"×3" @75 → stringers @80 (bending 80, deflection 100)', () => {
    expect(c('joist').spacing!.max).toBeCloseTo(80.1, 0)
    expect(d.layout.stringerSpacing).toBe(80)
  })
  it('stringers 2"×6" @80 → shores @135 (shear 137 governs; bending 179, deflection 216)', () => {
    expect(c('stringer').spacing!.max).toBeCloseTo(137, 0)
    expect(c('stringer').spacing!.governing).toBe('แรงเฉือน')
    expect(d.layout.shoreSpacing).toBe(135)
  })
  it('shore Ø2" thin, l = 2.80 m: P = 630 kg ≤ 2,745 kg (l/r 138, Fa 525)', () => {
    const r = c('shore').rows[0]
    expect(r.demand).toBeCloseTo(630.7, 0)
    expect(r.capacity).toBeGreaterThan(2700)
    expect(r.capacity).toBeLessThan(2800)
  })
})

/** Example 6.2: slab on beams 5.00 × 3.50 m, t 10 cm; boards ¾"×8" (1.8 cm), joists 1½"×3", stringers 2"×6", Ø4" timber posts 3.50 m. */
const ex62: SlabInput = {
  ...ex61,
  thickness: 0.1,
  lengthX: 5,
  lengthY: 3.5,
  clearHeight: 3.5,
  sheathing: { type: 'board', materialId: 'timber-soft', thicknessCm: 1.8 },
  shore: { ...ex61.shore, sectionId: 'log-4', materialId: 'timber-soft', lengthM: 3.5 },
}

describe('Example 6.2 — slab on beams t 10 cm', () => {
  const d = designSlab(ex62)
  const c = (k: string) => d.components.find((x) => x.key === k)!
  it('w = 440 kg/m²', () => expect(d.pressure.Pmax).toBeCloseTo(440, 6))
  it('boards ¾" → joists @70 (bending 99, deflection 71)', () => {
    expect(c('sheathing').spacing!.max).toBeCloseTo(71.8, 0)
    expect(d.layout.joistSpacing).toBe(70)
  })
  it('joists @70 → stringers @95 (bending 95)', () => expect(d.layout.stringerSpacing).toBe(95))
  it('stringers @95 → shores @150 (shear 153)', () => {
    expect(c('stringer').spacing!.max).toBeCloseTo(153, 0)
    expect(d.layout.shoreSpacing).toBe(150)
  })
  it('Ø4" post, 3.50 m: P = 627 kg ≤ 1,806 kg (Fa 23)', () => {
    const r = c('shore').rows[0]
    expect(r.demand).toBeCloseTo(627, 0)
    expect(r.capacity).toBeCloseTo(1810, -1)
  })
})

describe('slab layout, bracing and rated shores', () => {
  it('lays out joists, stringers and shores within the panel', () => {
    const d = designSlab(ex61)
    expect(d.layout.joistX[0]).toBe(0)
    expect(d.layout.joistX.at(-1)).toBe(7.2)
    expect(Math.max(...d.layout.joistX.slice(1).map((x, i) => x - d.layout.joistX[i]))).toBeLessThanOrEqual(0.75 + 1e-9)
    expect(d.quantities.shores).toBe(d.layout.stringerY.length * d.layout.shoreX.length)
  })
  it('adds the shoring lateral-bracing check (ACI 347: 2 % DL ≥ 150 kg/m)', () => {
    const d = designSlab({ ...ex61, bracing: { enabled: true, sectionId: 'timber-1.5x3', materialId: 'timber-soft' } })
    const b = d.components.find((x) => x.key === 'bracing')!
    expect(b.rows).toHaveLength(2)
    expect(b.rows[0].demand).toBeGreaterThan(0)
  })
  it('checks a rated scaffold leg against its SWL and the base-plate bearing', () => {
    const d = designSlab({ ...ex61, shore: { ...ex61.shore, kind: 'rated', swl: 1000, baseCm: 15, bearing: 50000 } })
    const rows = d.components.find((x) => x.key === 'shore')!.rows
    expect(rows[0].capacity).toBe(1000)
    expect(rows[1].demand).toBeCloseTo(630.7 / 0.0225, -1)
  })
})
