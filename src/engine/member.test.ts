// Book Chapter 5 worked examples.
import { describe, expect, it } from 'vitest'
import { getMaterial, type Material } from './materials'
import { checkBeam, columnCapacity, maxSpan, requiredProps } from './member'
import { getSection, pipe, rect, STEEL_SECTIONS } from './sections'

const yang: Material = { id: 'yang', kind: 'timber', name: 'ยาง', E: 113651, Fb: 80, Fc: 60, Fv: 10, ref: 'Ex 5.8' }

describe('Example 5.4 — plywood thickness from M', () => {
  it('bd² = 6M/Fb → d = 0.86 cm', () => {
    const bd2 = (6 * 8.6 * 100) / 70
    expect(bd2).toBeCloseTo(73.7, 1)
    expect(Math.sqrt(bd2 / 100)).toBeCloseTo(0.86, 2)
  })
})

describe('Example 5.6 — 2×6" joist shear, continuous, w = 276 kg/m, l = 2.40 m', () => {
  it('v = 8.3 kg/cm² without span reduction', () => {
    const m: Material = { ...yang, Fv: 10 }
    const chk = checkBeam({ section: rect(5, 15), material: m, support: 'continuous', checkShear: true }, 2.76, 240)
    expect(chk.V).toBeCloseTo(414, 0)
    const fv = chk.rows.find((r) => r.item.includes('เฉือน'))!.demand
    expect(fv).toBeCloseTo(8.3, 1)
  })
})

describe('Example 5.8 — Yang 1½"×3" timber shore, 2.40 m', () => {
  const s = rect(3.75, 7.5)
  it('unbraced: Fa 8.32, P 234 kg', () => {
    const c = columnCapacity(s, yang, 240)
    expect(c.Fa).toBeCloseTo(8.32, 2)
    expect(c.P).toBeCloseTo(234, 0)
  })
  it('braced at mid-height: P 936 kg', () => {
    const c = columnCapacity(s, yang, 120)
    expect(c.Fa).toBeCloseTo(33.3, 1)
    expect(c.P).toBeCloseTo(936, 0)
  })
})

describe('Example 5.9 — Ø2" steel pipe shore, 2.50 m', () => {
  const p = pipe(6.03, 5.45, 'Ø2"')
  const a36 = getMaterial('steel-a36')
  it('r = 2.03, A = 5.23', () => {
    expect(p.rMin).toBeCloseTo(2.03, 2)
    expect(p.A).toBeCloseTo(5.23, 2)
  })
  it('braced at mid-height: Fa ≈ 1,127 → capped 1,000 (Bangkok) → P 5,230 kg', () => {
    const c = columnCapacity(p, a36, 125)
    expect(c.P).toBeCloseTo(5230, -1)
  })
  it('unbraced l/r 123: Fa = 1250 − 0.033(l/r)² ≈ 751 → P ≈ 3,927 kg', () => {
    const c = columnCapacity(p, a36, 250)
    expect(c.Fa).toBeCloseTo(751, -1)
    expect(c.P).toBeCloseTo(3927, -1)
  })
})

describe('Example 5.14 — continuous joist critical span', () => {
  it('l_cr = ∛(128/360·EI/w) ≈ 137 cm, Δ(120) = 0.23 cm', () => {
    const m: Material = { ...yang, E: 1.1e5 }
    const inp = { section: rect(3.75, 10), material: m, support: 'continuous' as const }
    expect(maxSpan(inp, 4.8).deflection).toBeCloseTo(137, 0)
    expect(checkBeam(inp, 4.8, 120).delta).toBeCloseTo(0.23, 2)
  })
})

describe('Example 8.3 step 4 — wale required properties', () => {
  it('S_req 11.88 cm³, I_req 12.0 cm⁴', () => {
    const r = requiredProps(39.6, 60, getMaterial('steel-ss400'), 'continuous')
    expect(r.S).toBeCloseTo(11.88, 2)
    expect(r.I).toBeCloseTo(12.0, 1)
  })
})

describe('steel sections — I = Z·H/2 matches the values used by the book', () => {
  const find = (label: string) => STEEL_SECTIONS.find((s) => s.label === label)!
  it('C 100×50×20×2.3: Sx 16.1, Ix ≈ 80.7', () => {
    const s = find('C 100×50×20×2.3')
    expect(s.Sx).toBe(16.1)
    expect(s.Ix).toBeCloseTo(80.5, 0)
  })
  it('▭ 100×50×2.3: Ix ≈ 84.8', () => expect(find('▭ 100×50×2.3').Ix).toBeCloseTo(84.85, 1))
  it('□ 100×100×2.3: Ix ≈ 140', () => expect(find('□ 100×100×2.3').Ix).toBeCloseTo(139.75, 1))
  it('timber 1½"×3" uses 3.75 × 7.5 cm', () => {
    const t = getSection('timber-1.5x3')
    expect(t.B).toBe(3.75)
    expect(t.Sx).toBeCloseTo(35.16, 2)
  })
})
