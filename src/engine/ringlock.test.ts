import { describe, expect, it } from 'vitest'
import { DEFAULT_BEAM, designBeam } from './beam'
import { aiscFa, ledgerRow, ringlockCapacity, ringlockEta, ringlockStack, ringlockSystem, RINGLOCK_LIFTS, snapToLedger } from './ringlock'
import { DEFAULT_SLAB, designSlab } from './slab'
import { Trace } from './trace'

const asia = ringlockSystem({ system: 'asia48', liftM: 1.5 })
const ringlock = (system: 'asia48' | 'asia60' | 'eu48' = 'asia48', liftM = 1.5, swl?: number) => ({ kind: 'ringlock' as const, ringlock: { system, liftM, swl } })

describe('Ringlock', () => {
  it('snaps a spacing down to a ledger length (the shortest when none fits)', () => {
    expect(snapToLedger(140, asia)).toBe(120)
    expect(snapToLedger(180, asia)).toBe(180)
    expect(snapToLedger(45, asia)).toBe(60)
    expect(snapToLedger(160, ringlockSystem({ system: 'eu48', liftM: 1.5 }))).toBe(157)
  })

  it('places standards at whole ledgers, one shorter ledger for the rest, centred', () => {
    const xs = ledgerRow(6.6, 180, asia, 0.2)
    const bays = xs.slice(1).map((x, i) => Math.round((x - xs[i]) * 100))
    expect(bays).toEqual([180, 180, 180, 60])
    expect(xs[0]).toBeCloseTo(6.6 - xs[xs.length - 1], 6)
    // less than the shortest ledger left over: wider edges instead
    expect(ledgerRow(6, 180, asia, 0.2).slice(1).map((x, i, a) => Math.round((x - (i ? a[i - 1] : ledgerRow(6, 180, asia, 0.2)[0])) * 100))).toEqual([180, 180, 180])
  })

  it('builds a shore from 0.50 m standards with the rest on the jacks', () => {
    const st = ringlockStack(3.0, 1.5)
    expect(st.standards).toBe(2.5)
    expect(st.jack).toBeCloseTo(0.25, 6)
    expect(st.lifts).toBe(2)
    expect(st.topLift).toBeCloseTo(1.0, 6)
    expect(st.ledgers).toEqual([0.25, 1.75, 2.75])
  })

  it('AISC ASD Fa is continuous at Cc', () => {
    const { Cc } = aiscFa(1, 2.0e6, 3450)
    expect(aiscFa(Cc - 1e-6, 2.0e6, 3450).Fa).toBeCloseTo(aiscFa(Cc + 1e-6, 2.0e6, 3450).Fa, 1)
  })

  it('safe load falls as the lift grows; the heavy-duty tube carries more', () => {
    const swl = RINGLOCK_LIFTS.map((h) => ringlockCapacity({ system: 'asia48', liftM: h }, 3.5).swl)
    for (let i = 1; i < swl.length; i++) expect(swl[i]).toBeLessThan(swl[i - 1])
    expect(ringlockCapacity({ system: 'asia60', liftM: 1.5 }, 3.5).swl).toBeGreaterThan(swl[2])
    // a sensible range for a Ø48.3×3.2 standard at 1.5 m lifts
    expect(swl[2]).toBeGreaterThan(2000)
    expect(swl[2]).toBeLessThan(6000)
  })

  it('η follows JGJ 231 by lift, and an entered η / k is used instead', () => {
    expect([0.5, 1.0, 1.5].map(ringlockEta)).toEqual([1.6, 1.6, 1.2])
    const base = ringlockCapacity({ system: 'asia48', liftM: 1.5 }, 3.5)
    expect(ringlockCapacity({ system: 'asia48', liftM: 1.5, eta: 1.6 }, 3.5).mid).toBeLessThan(base.mid)
    expect(ringlockCapacity({ system: 'asia48', liftM: 1.5, k: 1.0 }, 3.5).top).toBeLessThan(base.top)
  })

  it('checks the screw showing and the U-head height above the top ledger', () => {
    const d = designSlab({ ...DEFAULT_SLAB, shore: { ...DEFAULT_SLAB.shore, ...ringlock() } })
    const items = d.components.find((c) => c.key === 'shore')!.rows.map((r) => r.item)
    expect(items).toEqual(expect.arrayContaining(['เกลียวแจ็คฐาน / ยูเฮดที่โผล่', 'ยูเฮดสูงเหนือคานนอนบนสุด a']))
  })

  it("the maker's SWL replaces the calculation", () => {
    const t = new Trace()
    expect(ringlockCapacity({ system: 'asia48', liftM: 1.5, swl: 2500 }, 3, t).swl).toBe(2500)
    expect(t.steps.some((s) => s.ref === 'ข้อมูลผู้ผลิต')).toBe(true)
  })

  it('slab: stringer and shore spacing are ledger lengths, the shore checked per standard', () => {
    const d = designSlab({ ...DEFAULT_SLAB, shore: { ...DEFAULT_SLAB.shore, ...ringlock() } })
    expect(asia.ledgersCm).toContain(d.layout.stringerSpacing)
    expect(asia.ledgersCm).toContain(d.layout.shoreSpacing)
    const shore = d.components.find((c) => c.key === 'shore')!
    expect(shore.rows.map((r) => r.item)).toContain('น้ำหนักต่อเสาตั้ง')
  })

  it('slab: a spacing typed in that is not a ledger is warned about', () => {
    const d = designSlab({ ...DEFAULT_SLAB, shore: { ...DEFAULT_SLAB.shore, ...ringlock(), spacingCm: 100 } })
    expect(d.warnings.some((w) => w.includes('Ringlock'))).toBe(true)
  })

  it('beam on posts: the head spacing is a ledger length', () => {
    const d = designBeam({ ...DEFAULT_BEAM, length: 12, h: 1.2, shore: { ...DEFAULT_BEAM.shore, ...ringlock() } })
    expect(asia.ledgersCm).toContain(d.layout.headSpacing)
    const bays = d.layout.headX.slice(1).map((x, i) => Math.round((x - d.layout.headX[i]) * 100))
    expect(bays.every((b) => asia.ledgersCm.includes(b))).toBe(true)
  })

  it('beam on stringers: the shore spacing along the beam is a ledger length', () => {
    const inp = { ...DEFAULT_BEAM, clearHeight: 4.5, stringer: { ...DEFAULT_BEAM.stringer!, enabled: true }, shore: { ...DEFAULT_BEAM.shore, ...ringlock(), postSpacingM: 0.9 } }
    const d = designBeam(inp)
    expect(asia.ledgersCm).toContain(d.layout.stringer!.shoreSpacing)
    expect(d.warnings.some((w) => w.includes('ไม่ตรงความยาวคานนอน'))).toBe(false)
    const off = designBeam({ ...inp, shore: { ...inp.shore, postSpacingM: 0.8 } })
    expect(off.warnings.some((w) => w.includes('ไม่ตรงความยาวคานนอน'))).toBe(true)
  })
})
