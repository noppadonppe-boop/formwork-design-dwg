// Book Chapter 2 worked examples 2.1–2.3.
import { describe, expect, it } from 'vitest'
import { verticalLoad } from './loads'
import { aci347, ceb, cira, lateralPressure, type PressureInput, pressureAt } from './pressure'

const ex21: PressureInput = { method: 'ACI347', element: 'wall', R: 2, T: 30, H: 3.0, slump: 10, d: 0.3 }

describe('Example 2.1 — slump 10 cm, R 2 m/hr, 30 °C, H 3.00 m, d 0.30 m', () => {
  it('ACI-347 eq 2.7 → 4,080 kg/m²', () => {
    expect(aci347(ex21)).toBeCloseTo(4080, -1) // book rounds 836 psf × 4.882
  })
  it('CEB min(7,200, 3,620, 5,100) → 3,620 kg/m²', () => {
    expect(ceb(ex21)).toBeCloseTo(3620, 0)
  })
  it('CIRA min(7,500, 5,500, 5,000) → 5,000 kg/m²', () => {
    expect(cira(ex21)).toBeCloseTo(5000, 0)
  })
})

describe('Example 2.2 — R varied (T 30 °C, slump 10, d 0.30)', () => {
  const R = [1, 2, 3, 4, 5, 6]
  it('ACI-347 (eq 2.7 for R ≤ 7 ft/hr, eq 2.8 above)', () => {
    const book = [2406, 4080, 4758, 5280, 5802, 6324]
    R.forEach((r, i) => expect(aci347({ ...ex21, R: r })).toBeCloseTo(book[i], -1))
  })
  it('CEB — book takes H = R × 1 hr in this table', () => {
    const book = [2060, 3620, 5180, 5700, 6000, 6300]
    R.forEach((r, i) => expect(ceb({ ...ex21, method: 'CEB', R: r, H: r })).toBeCloseTo(book[i], 0))
  })
  it('CIRA — book takes H = R × 1 hr in this table', () => {
    const book = [2500, 5000, 5500, 6000, 6000, 6500]
    R.forEach((r, i) => expect(cira({ ...ex21, method: 'CIRA', R: r, H: r })).toBeCloseTo(book[i], 0))
  })
})

describe('ACI-347 caps and column formula', () => {
  it('caps at γH for a shallow pour', () => {
    expect(aci347({ ...ex21, H: 1.0 })).toBe(2400)
  })
  it('wall cap 9,760 kg/m²', () => {
    expect(aci347({ ...ex21, R: 9, T: 5, H: 10 })).toBe(9760)
  })
  it('column uses eq 2.9 even when R > 7 ft/hr', () => {
    const P = aci347({ ...ex21, element: 'column', R: 3, H: 4 })
    const Rft = 3 / 0.3048
    expect(P).toBeCloseTo((150 + (9000 * Rft) / 86) * 4.882, 3)
  })
})

describe('pressure envelope', () => {
  it('hydrostatic to h_crit then constant', () => {
    const res = lateralPressure({ ...ex21, method: 'CEB' })
    expect(res.hCrit).toBeCloseTo(3620 / 2400, 3)
    expect(pressureAt(res, 0.5)).toBe(1200)
    expect(pressureAt(res, 2.5)).toBeCloseTo(3620, 0)
  })
})

describe('Example 2.3 — 16 cm slab, formwork 50 kg/m²', () => {
  it('ACI 679 / CEB 534 / CIRA 550 kg/m²', () => {
    expect(verticalLoad({ method: 'ACI347', thickness: 0.16 }).total).toBeCloseTo(679, 0)
    expect(verticalLoad({ method: 'CEB', thickness: 0.16 }).total).toBeCloseTo(534, 0)
    expect(verticalLoad({ method: 'CIRA', thickness: 0.16 }).total).toBeCloseTo(550, 0)
  })
})
