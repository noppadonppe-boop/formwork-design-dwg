// Book Chapter 7 worked examples 7.1–7.4 (method I — direct calculation).
import { describe, expect, it } from 'vitest'
import { type BeamInput, DEFAULT_BEAM, designBeam, middleRowShare } from './beam'
import { BS_TUBE } from './sections'
import { braceSets, DEFAULT_SHORE } from './shoring'

const base: BeamInput = {
  ...DEFAULT_BEAM,
  loads: { liveLoad: 150, formWeight: 50, gamma: 2400, beamFormWeight: 100 },
  stud: { sectionId: 'timber-1.5x3', materialId: 'timber-soft' },
  head: { sectionId: 'timber-2x4', materialId: 'timber-soft', count: 1 },
  bottom: { ...DEFAULT_BEAM.bottom, auto: false }, // the book examples give the number of bottom stiffeners
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
  // the book braces the posts at mid-height (unbraced they cannot carry the heads @60)
  const d = designBeam({ ...inp, shore: { ...inp.shore, braceLevels: 1 } })
  const unbraced = designBeam(inp)
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
    expect(2 * comp(unbraced, 'shore').rows[0].capacity).toBeCloseTo(558, -1)
    expect(2 * comp(d, 'shore').rows[0].capacity).toBeCloseTo(2233, -1)
  })
  it('unbraced posts: heads/shores come closer (60 → 50) until the posts carry them', () => {
    expect(unbraced.layout.headSpacing).toBe(50)
    expect(comp(unbraced, 'shore').rows[0].ratio).toBeLessThanOrEqual(1)
    expect(unbraced.warnings.some((w) => w.startsWith('ระยะคานขวาง/เสาค้ำลดจาก 60 เหลือ 50'))).toBe(true)
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

describe('shore-row bracing along the beam (ACI 347) and long-shore warning', () => {
  // slab beam 30 × 60, slab 12 cm × 1.20 m: dead 432 + 345.6 + 100 + 60 = 937.6 kg/m over a 1.50 m width
  const H = (d: ReturnType<typeof designBeam>) => comp(d, 'bracing').trace.steps[0].value
  it('6 m beam: 2 % DL = 113 kg < 150 kg/m × 1.50 m = 225 kg governs', () => expect(H(designBeam(base))).toBeCloseTo(225, 6))
  it('double posts: each row takes half the width', () => expect(H(designBeam({ ...base, shore: { ...base.shore, layout: 'double' } }))).toBeCloseTo(112.5, 6))
  it('long beam: 2 % DL governs', () => expect(H(designBeam({ ...base, length: 20 }))).toBeCloseTo(0.02 * 937.6 * 20, 6))
  it('counts two diagonals per X, an X at each end of every post row', () => {
    const d = designBeam({ ...base, length: 12, shore: { ...base.shore, layout: 'double' } })
    expect(d.quantities.bracing).toBe(2 * 2 * 2)
  })
  it('projects saved without the option: no bracing, warned', () => {
    const { bracing: _b, ...old } = base
    const d = designBeam(old)
    expect(d.components.some((c) => c.key === 'bracing')).toBe(false)
    expect(d.warnings.some((w) => w.startsWith('ไม่ได้ออกแบบค้ำยันทางข้าง'))).toBe(true)
  })
  it('warns when a post longer than 3 m has no intermediate bracing', () => {
    const long = (braceLevels: number) => designBeam({ ...base, shore: { ...base.shore, lengthM: 3.5, braceLevels } }).warnings.some((w) => w.startsWith('เสาค้ำยาวเกิน 3 ม.'))
    expect(long(0)).toBe(true)
    expect(long(1)).toBe(false)
  })
})

describe('beam bottom: runners along the beam or cross joists, automatic runner count', () => {
  const auto: BeamInput = { ...base, bottom: { ...DEFAULT_BEAM.bottom, auto: true } }
  it('narrow beam: two runners, each carrying b/2 (same as the book)', () => {
    const d = designBeam(auto)
    expect(d.layout.bottomZ).toHaveLength(2)
    expect(comp(d, 'bottom').trace.steps[0].value).toBeCloseTo(auto.b / 2, 6)
  })
  it('wide beam: enough runners for the plywood span across, the middle one carrying 1.25 × span', () => {
    const d = designBeam({ ...auto, b: 0.9, h: 0.9 })
    const n = d.layout.bottomZ.length
    expect(n).toBeGreaterThan(2)
    expect(comp(d, 'bottomDeck').rows.every((r) => r.ratio <= 1)).toBe(true)
    const span = d.layout.bottomZ[1] - d.layout.bottomZ[0]
    expect(comp(d, 'bottom').trace.steps[0].value).toBeCloseTo(1.25 * span, 2)
    // one runner fewer would overstress the plywood
    const fewer = designBeam({ ...auto, b: 0.9, h: 0.9, bottom: { ...auto.bottom, auto: false, count: n - 1 } })
    expect(comp(fewer, 'bottomDeck').rows.some((r) => r.ratio > 1)).toBe(true)
  })
  it('a fixed count is kept and the plywood between the runners is checked', () => {
    const d = designBeam({ ...base, b: 0.9, h: 0.9 })
    expect(d.layout.bottomZ).toHaveLength(2)
    expect(comp(d, 'bottomDeck').rows.some((r) => r.ratio > 1)).toBe(true)
  })
  it('cross joists: sheathing → joist spacing, joists span across between the runners, runners → heads', () => {
    const d = designBeam({ ...auto, b: 1.2, h: 0.8, bottomDir: 'across' })
    expect(d.layout.crossJoistSpacing).toBe(comp(d, 'bottomDeck').spacing!.value)
    expect(d.layout.crossJoistX.length).toBe(d.quantities.crossJoists)
    expect(comp(d, 'crossJoist').rows.every((r) => r.ratio <= 1)).toBe(true)
    expect(d.layout.bottomZ.length).toBeGreaterThanOrEqual(2)
    expect(d.warnings.some((w) => w.startsWith('คานกว้างเกิน 80 ซม.'))).toBe(false)
  })
  it('steel runners: checked as steel, never laid flat, stiffer than timber so the heads can spread', () => {
    const steel = designBeam({ ...base, bottom: { ...base.bottom, sectionId: 'box-50×50×2.3', materialId: 'steel-a36', flat: true } })
    const timber = designBeam(base)
    expect(comp(steel, 'bottom').spec).toContain('□ 50×50×2.3')
    expect(comp(steel, 'bottom').spec).not.toContain('วางนอน')
    expect(comp(steel, 'bottom').spacing!.max).toBeGreaterThan(comp(timber, 'bottom').spacing!.max)
    expect(steel.layout.bottomZ).toHaveLength(2)
  })
  it('wide beams: advice for double posts and cross joists', () => {
    const d = designBeam({ ...auto, b: 1.0, h: 0.8 })
    expect(d.warnings.some((w) => w.startsWith('คานกว้างเกิน 60 ซม. บนเสาตัวที'))).toBe(true)
    expect(d.warnings.some((w) => w.startsWith('คานกว้างเกิน 80 ซม.'))).toBe(true)
  })
  it('long deep beam on light shores: spacing comes down until every head and shore passes', () => {
    const d = designBeam({ ...auto, length: 12, h: 1.2, shore: { ...base.shore, braceLevels: 1, lengthM: 3 } })
    expect(d.layout.headSpacing).toBeLessThan(comp(d, 'bottom').spacing!.max)
    expect(['head', 'shore'].every((k) => comp(d, k).rows.every((r) => r.ratio <= 1))).toBe(true)
    expect(d.layout.headX.every((x, i, xs) => i === 0 || x - xs[i - 1] <= d.layout.headSpacing / 100 + 1e-9)).toBe(true)
  })
  it('shores that fail even at 20 cm: told to use double / larger posts or bracing', () => {
    const d = designBeam({ ...auto, length: 12, h: 1.2, shore: { ...base.shore, braceLevels: 0, lengthM: 3 } })
    expect(d.layout.headSpacing).toBe(20)
    expect(d.warnings.some((w) => w.startsWith('ลดระยะเสาค้ำถึง 20 ซม. แล้วยังรับไม่ได้'))).toBe(true)
  })
})

describe('beam bottom on stringers: heads → stringer rows → U-heads and tube posts with ledgers', () => {
  const tube = { ...base.shore, sectionId: BS_TUBE, materialId: 'steel-a36', postSpacingM: 0.9 }
  const on: BeamInput = { ...base, b: 0.4, h: 0.8, length: 8, clearHeight: 4.5, shore: tube, stringer: { ...DEFAULT_BEAM.stringer!, enabled: true } }
  it('off or missing: the shores stay under the heads, exactly as before', () => {
    const old = designBeam(base)
    expect(designBeam({ ...base, stringer: { ...DEFAULT_BEAM.stringer!, enabled: false } })).toEqual(old)
    expect(old.layout.stringer).toBeUndefined()
    expect(old.quantities.shores).toBe(old.layout.headX.length)
  })
  it('the shore spacing comes from the stringer and the post, not from the heads', () => {
    const d = designBeam(on)
    const sg = d.layout.stringer!
    expect(sg.z).toEqual([-0.45, 0.45])
    expect(sg.shoreSpacing).toBe(comp(d, 'stringer').spacing!.value)
    expect(sg.shoreSpacing).toBeGreaterThan(d.layout.headSpacing)
    expect(d.quantities.shores).toBe(2 * sg.shoreX.length)
    expect(['head', 'stringer', 'shore'].every((k) => comp(d, k).rows.every((r) => r.ratio <= 1))).toBe(true)
  })
  it('ledgers both ways at lifts of at most 2 m (more when the post governs), their heights in the layout', () => {
    const d = designBeam(on)
    const { ledgerY } = d.layout.stringer!
    expect(ledgerY.length).toBeGreaterThanOrEqual(Math.ceil(d.layout.shoreLength / 2) - 1)
    const lifts = [0, ...ledgerY, d.layout.shoreLength].slice(1).map((y, i, ys) => y - (i ? ys[i - 1] : 0))
    expect(Math.max(...lifts)).toBeLessThanOrEqual(2 + 1e-9)
    expect(d.quantities.ledgerLength).toBeCloseTo(ledgerY.length * (2 * on.length + d.layout.stringer!.shoreX.length * 0.9), 6)
  })
  it('three rows: the middle row takes the larger share and the heads span half the width', () => {
    const d3 = designBeam({ ...on, stringer: { ...on.stringer!, rows: 3 } })
    expect(d3.layout.stringer!.z).toEqual([-0.45, 0, 0.45])
    expect(comp(d3, 'head').maxRatio).toBeLessThan(comp(designBeam(on), 'head').maxRatio)
    expect(middleRowShare({ ...on, type: 'isolated', b: 0.9 }, 0.9)).toBeCloseTo(0.625, 6) // uniform over the rows
    expect(middleRowShare({ ...on, type: 'isolated', b: 0.05 }, 0.9)).toBeGreaterThan(0.99) // ≈ point load on the middle
  })
  it('X-bracing at both ends of every row, no more than 3 unbraced bays between sets, and across at those lines', () => {
    expect(braceSets(10, 1)).toEqual([0, 3, 6, 9])
    expect(braceSets(3, 2)).toEqual([0, 1])
    const d = designBeam({ ...on, length: 15 })
    const { braceSets: sets, braceBays: k, shoreX, acrossLines } = d.layout.stringer!
    const bays = shoreX.length - 1
    expect(sets[0]).toBe(0)
    expect(sets[sets.length - 1] + k).toBe(bays)
    sets.slice(1).forEach((j, i) => expect(j - (sets[i] + k)).toBeLessThanOrEqual(3))
    expect(acrossLines).toEqual([...sets, bays])
    expect(comp(d, 'bracing').rows).toHaveLength(2)
  })
})

describe('deep beam: horizontal studs on vertical wales (strongbacks)', () => {
  const deep = { ...DEFAULT_BEAM, h: 1.2, b: 0.4, tie: { ...DEFAULT_BEAM.tie, enabled: true, rows: 1 } }
  const v = designBeam(deep)
  const h = designBeam({ ...deep, system: 'horizontal' })
  const comp = (k: string) => h.components.find((c) => c.key === k)!

  it('strongbacks at every head; ties at every strongback on the tie rows', () => {
    expect(h.layout.system).toBe('horizontal')
    expect(h.layout.studX).toEqual([])
    for (const x of h.layout.headX) expect(h.layout.waleX).toContain(x)
    expect(h.quantities.ties).toBe(h.layout.tieLevels.length * h.layout.waleX.length)
    expect(comp('stud').title).toBe('เคร่านอนข้างคาน (Studs)')
    expect(comp('wale').title).toBe('คานตั้ง (Strongbacks)')
  })

  it('the 1.20 m beam with one tie row: vertical studs fail over half the side, horizontal studs pass', () => {
    expect(v.components.find((c) => c.key === 'stud')!.status).toBe('fail')
    expect(h.status).not.toBe('fail')
  })

  it('a head spacing longer than the studs can span gets strongbacks between the heads', () => {
    const d = designBeam({ ...deep, system: 'horizontal', head: { ...deep.head, spacingCm: 120 }, stud: { ...deep.stud, spacingCm: 40 } })
    const s = d.components.find((c) => c.key === 'stud')!
    const gaps = d.layout.waleX.slice(1).map((x, i) => x - d.layout.waleX[i])
    expect(Math.max(...gaps) * 100).toBeLessThanOrEqual(s.spacing!.max + 1e-6)
    expect(d.layout.waleX.length).toBeGreaterThan(d.layout.headX.length)
    expect(d.warnings.some((w) => w.startsWith('เพิ่มคานตั้งระหว่างคานขวาง'))).toBe(true)
  })

  it('ignored without ties', () => {
    expect(designBeam({ ...DEFAULT_BEAM, system: 'horizontal' }).layout.system).toBe('vertical')
  })
})
