// Book Chapter 10 worked examples 10.1–10.3 (method ก — direct calculation).
import { describe, expect, it } from 'vitest'
import { DEFAULT_FOOTING, designFooting, type FootingInput, footingSystemLabel } from './footing'

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
  it('steel studs @40 → wales @1.20 (bending 121, deflection 161)', () => expect(comp(d, 'stud').spacing!.max).toBeCloseTo(121, 0))
  it('ties across the short side @1.20 × 1.20: T = 5,213 kg (book: long faces only)', () => {
    const s = designFooting({ ...ex102, tie: { ...ex102.tie, layout: 'short' } })
    expect(s.layout.waleSpacing).toBe(120)
    expect(comp(s, 'tie').rows[0].demand).toBeCloseTo(5213, 0)
    // the 2.40 m short-side wales then span corner to corner — the book leaves them unchecked; they fail
    expect(comp(s, 'wale').maxRatio).toBeGreaterThan(1)
  })
  it('auto: ties both ways, wales closed up to 1.15 so the 2-span short-side wales pass', () => {
    expect(d.layout.tieLayout).toBe('both')
    expect(d.layout.waleSpacing).toBe(115)
    expect(comp(d, 'wale').maxRatio).toBeLessThanOrEqual(1)
  })
})

describe('wales round the footing (yokes, §9.4)', () => {
  const small = { ...DEFAULT_FOOTING, lengthX: 1.2, lengthY: 1.2, height: 0.6, support: 'tied' as const }
  it('small footing: no ties — wales closed up until the corner-to-corner span passes', () => {
    const d = designFooting(small)
    expect(d.layout.tieLayout).toBe('none')
    expect(d.quantities.ties).toBe(0)
    expect(d.layout.waleSpacing!).toBeLessThan(65)
    expect(d.maxRatio).toBeLessThanOrEqual(1)
    const rows = comp(d, 'wale').rows.map((r) => r.item)
    expect(rows).toContain('คานรับเคร่าด้านยาว – ดึง+ดัด')
    expect(rows).toContain('คานรับเคร่าด้านสั้น – ดึง+ดัด')
  })
  it('long-side wale carries the short-side end reaction as tension T = w·b/2', () => {
    const d = designFooting({ ...small, wale: { ...small.wale, spacingCm: 30 }, tie: { ...small.tie, layout: 'none' } })
    const t = comp(d, 'wale').trace.steps.find((s) => s.label.startsWith('คานรับเคร่าด้านยาว: แรงดึง'))!
    expect(t.value).toBeCloseTo((d.pressure.Pmax * 0.3 * 1.2) / 2, 3)
  })
  it('2.40 × 2.40: wales cannot span corner to corner → ties both ways', () => {
    const d = designFooting({ ...DEFAULT_FOOTING, support: 'tied' })
    expect(d.layout.tieLayout).toBe('both')
    expect(d.quantities.ties).toBe(d.layout.waleLevels.length * (d.layout.tiesLong! + d.layout.tiesShort!))
  })
})

describe('braces through wales', () => {
  it('fewer braces and stakes than bracing every stud', () => {
    const stud = designFooting(DEFAULT_FOOTING)
    const wale = designFooting({ ...DEFAULT_FOOTING, brace: { ...DEFAULT_FOOTING.brace, at: 'wale' } })
    expect(wale.layout.braceAlong!).toBeGreaterThan(stud.layout.studSpacing)
    expect(wale.quantities.braces).toBeLessThan(stud.quantities.braces)
    expect(wale.quantities.stakes).toBeLessThan(stud.quantities.stakes)
    expect(comp(wale, 'wale').spacing!.label).toBe('ระยะค้ำยัน')
  })
})

describe('arrangement advice', () => {
  it('recommends no ties for a small footing and flags soft soil', () => {
    const d = designFooting({ ...DEFAULT_FOOTING, lengthX: 1.2, lengthY: 1.2, height: 0.6, soilBearing: 3000 }, { advise: true })
    const rec = d.advice!.options.find((o) => o.recommended)!
    expect(rec.key).toBe('tied-none')
    expect(d.advice!.summary[0]).toContain('ไม่จำเป็นต้องใช้ Form tie')
    expect(d.advice!.options.find((o) => o.key === 'braced-stud')!.note).toContain('ดินอ่อน')
    expect(d.advice!.options.filter((o) => o.current)).toHaveLength(1)
  })
  it('advice is off unless asked for (optimizer runs)', () => expect(designFooting(DEFAULT_FOOTING).advice).toBeUndefined())
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

describe('system label for reports', () => {
  it('names the arrangement actually designed', () => {
    const tied = { ...DEFAULT_FOOTING, support: 'tied' as const }
    expect(footingSystemLabel(tied, designFooting(tied))).toBe('คานรับเคร่ารอบฐาน + Form tie สองทิศทาง')
    const small = { ...tied, lengthX: 1.2, lengthY: 1.2, height: 0.6 }
    expect(footingSystemLabel(small, designFooting(small))).toBe('คานรับเคร่ารัดรอบฐาน (ไม่ใช้ไทร์)')
    expect(footingSystemLabel({ ...DEFAULT_FOOTING, brace: { ...DEFAULT_FOOTING.brace, at: 'wale' } })).toBe('ค้ำยันทแยงผ่านคานรับเคร่าลงหลัก')
  })
})

describe('tied rectangle: horizontal studs on vertical wales, ties both ways', () => {
  const inp: FootingInput = { ...DEFAULT_FOOTING, lengthX: 3.6, lengthY: 2.4, height: 1.5, support: 'tied', system: 'horizontal' }
  const d = designFooting(inp)
  const L = d.layout

  it('designed as a horizontal-stud wall on each pair of faces; strongbacks evenly ≤ c/c from the end offset', () => {
    expect(L.system).toBe('horizontal')
    expect(L.waleLevels).toEqual([])
    expect(L.tieLayout).toBe('both')
    for (const [xs, len] of [[L.waleXLong!, 3.6], [L.waleXShort!, 2.4]] as const) {
      expect(xs[0]).toBeCloseTo(len - xs.at(-1)!, 3)
      expect(Math.max(...xs.slice(1).map((x, i) => x - xs[i]))).toBeLessThanOrEqual(L.waleSpacing! / 100 + 1e-9)
    }
    expect(d.components.map((c) => c.key)).toEqual(expect.arrayContaining(['stud', 'stud-end', 'wale', 'wale-top', 'tie']))
    expect(d.status).not.toBe('fail')
  })

  it('a tie at every strongback on every tie row; tie force P × c/c × gap', () => {
    expect(L.tiesLong).toBe(L.waleXLong!.length)
    expect(L.tiesShort).toBe(L.waleXShort!.length)
    expect(d.quantities.ties).toBe(L.tieLevels!.length * (L.tiesLong! + L.tiesShort!))
    const t = d.components.find((c) => c.key === 'tie')!
    expect(t.rows[0].demand).toBeCloseTo((d.pressure.Pmax * L.waleSpacing! * L.tieSpacing!) / 1e4, 0)
    expect(d.warnings.some((w) => w.includes('ทะลุฐาน'))).toBe(true)
  })

  it('label, advice key; ignored for other shapes and supports', () => {
    expect(footingSystemLabel(inp, d)).toBe('เคร่านอน + คานตั้ง + Form tie สองทิศทาง')
    const adv = designFooting(inp, { advise: true }).advice!
    expect(adv.options.find((o) => o.current)!.key).toBe('tied-horizontal')
    expect(adv.options.find((o) => o.key === 'tied-both')!.note).not.toBe(adv.options.find((o) => o.key === 'tied-horizontal')!.note)
    const braced = { ...inp, support: 'braced' as const }
    expect(designFooting(braced).layout).toEqual(designFooting({ ...braced, system: undefined }).layout)
    const poly = { ...inp, lengthY: 3.6, shape: { kind: 'polygon' as const, n: 8 as const } }
    expect(designFooting(poly).layout.system).toBeUndefined()
  })
})
