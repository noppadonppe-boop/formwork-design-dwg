import { describe, expect, it } from 'vitest'
import { DEFAULT_CRITERIA, type ElementData } from '@/data/types'
import { newElement } from '@/data/elements'
import { BS_TUBE, DEFAULT_BEAM, DEFAULT_FOOTING, DEFAULT_SLAB, deckThicknessM, designBeam, designFooting, designSlab, ringlockStack } from '@/engine'
import { modelBom } from './bom'
import { applyBeamHandle, applyFootingHandle, applySlabHandle, beamModel, footingModel, slabModel } from './slabBeamFootingModel'

const count = (parts: { group: string }[], g: string) => parts.filter((p) => p.group === g).length

describe('Ringlock in 3D', () => {
  const inp = { ...DEFAULT_SLAB, shore: { ...DEFAULT_SLAB.shore, kind: 'ringlock' as const, ringlock: { system: 'asia48' as const, liftM: 1.5 } } }
  const d = designSlab(inp)
  const parts = slabModel(inp, d).parts
  const nx = d.layout.shoreX.length
  const nz = d.layout.stringerY.length
  const levels = ringlockStack(d.layout.shoreTop, 1.5).ledgers.length
  it('ledgers between neighbouring standards both ways at every ledger level', () => {
    expect(parts.filter((p) => p.id.startsWith('rl-ledger-x'))).toHaveLength(nz * (nx - 1) * levels)
    expect(parts.filter((p) => p.id.startsWith('rl-ledger-z'))).toHaveLength(nx * (nz - 1) * levels)
    // every ledger is one bay long, a ledger length of the system, the longest the designed spacing
    const lens = parts.filter((q) => q.id.startsWith('rl-ledger') && q.shape === 'bar').map((q) => (q.shape === 'bar' ? Math.round(Math.hypot(q.to[0] - q.from[0], q.to[2] - q.from[2]) * 100) : 0))
    expect(lens.every((l) => [60, 90, 120, 150, 180].includes(l))).toBe(true)
    expect(Math.max(...lens.filter((_, i) => parts.filter((q) => q.id.startsWith('rl-ledger'))[i].id.startsWith('rl-ledger-x')))).toBe(d.layout.shoreSpacing)
  })
  it('diagonals in every lift of the braced bays, no separate bracing tubes', () => {
    expect(parts.some((p) => p.id.startsWith('rl-diag'))).toBe(true)
    expect(parts.some((p) => p.id.startsWith('brx') || p.id.startsWith('bry'))).toBe(false)
  })
  it('the BOM lists the ledgers and diagonals by length', () => {
    const el = { ...newElement('slab', DEFAULT_CRITERIA, []), input: inp } as ElementData
    const lines = modelBom(el, slabModel(inp, d))
    const ledgers = lines.filter((l) => l.description.startsWith('คานนอน'))
    expect(ledgers.reduce((a, l) => a + l.qty, 0)).toBe((nz * (nx - 1) + nx * (nz - 1)) * levels)
    expect(lines.some((l) => l.description.startsWith('ค้ำทแยง Ringlock'))).toBe(true)
  })
})

describe('slab model', () => {
  const d = designSlab(DEFAULT_SLAB)
  const m = slabModel(DEFAULT_SLAB, d)
  it('one joist per joist line, one shore per grid point', () => {
    expect(count(m.parts, 'joist')).toBe(d.layout.joistX.length)
    expect(m.parts.filter((p) => /^shore-\d+-\d+$/.test(p.id)).length).toBe(d.quantities.shores)
    expect(m.parts.filter((p) => p.id.endsWith('-jack')).length).toBe(d.quantities.shores)
  })
  it('stacks shores → stringers → joists → deck under the slab soffit', () => {
    expect(m.bounds.max[1]).toBeCloseTo(DEFAULT_SLAB.clearHeight + DEFAULT_SLAB.thickness, 6)
    expect(m.bounds.min[1]).toBeGreaterThan(-0.1) // bars are padded by their width
    // steel pipe shore: jack base on the floor, U-head (ก้ามปู) plate under the stringers
    const head = m.parts.find((p) => p.id === 'shore-0-0-head')!
    expect(head.shape === 'box' ? head.center[1] + head.size[1] / 2 : 0).toBeCloseTo(d.layout.shoreTop, 6)
    const arm = m.parts.find((p) => p.id === 'shore-0-0-head-a')!
    expect(arm.shape === 'box' ? arm.center[1] : 0).toBeGreaterThan(d.layout.shoreTop) // side plates hug the stringers
  })
  it('handles edit spacings and size', () => {
    expect(applySlabHandle(DEFAULT_SLAB, 'shoreSpacing', 1.12).shore.spacingCm).toBe(110)
    expect(applySlabHandle(DEFAULT_SLAB, 'thickness', 0.183).thickness).toBe(0.18)
  })
})

describe('beam model', () => {
  const d = designBeam(DEFAULT_BEAM)
  const m = beamModel(DEFAULT_BEAM, d)
  it('studs on both sides, a head and a shore at every head position', () => {
    expect(count(m.parts, 'stud')).toBe(2 * d.layout.studX.length)
    expect(count(m.parts, 'head')).toBe(d.layout.headX.length)
    expect(m.parts.some((p) => p.group === 'brace')).toBe(false) // beam with slab: held by the slab joists
  })
  it('isolated beams get top braces', () => {
    const inp = { ...DEFAULT_BEAM, type: 'isolated' as const }
    expect(count(beamModel(inp, designBeam(inp)).parts, 'brace')).toBe(2 * d.layout.headX.length)
  })
  it('X-bracing along every post row as designed, runners at the shore brace levels', () => {
    const inp = { ...DEFAULT_BEAM, length: 12, shore: { ...DEFAULT_BEAM.shore, layout: 'double' as const, kind: 'post' as const, braceLevels: 1 } }
    const bd = designBeam(inp)
    const parts = beamModel(inp, bd).parts
    expect(parts.filter((p) => p.id.startsWith('brx-')).length).toBe(bd.quantities.bracing)
    expect(parts.filter((p) => p.id.startsWith('run-')).length).toBe(2)
  })
  it('cross joists under the bottom, on the runners as designed; shores below them', () => {
    const inp = { ...DEFAULT_BEAM, b: 1.0, h: 0.8, bottomDir: 'across' as const, shore: { ...DEFAULT_BEAM.shore, layout: 'double' as const, postSpacingM: 1.2 } }
    const bd = designBeam(inp)
    const parts = beamModel(inp, bd).parts
    expect(parts.filter((p) => p.id.startsWith('cjoist-')).length).toBe(bd.layout.crossJoistX.length)
    expect(parts.filter((p) => p.id.startsWith('stiff-')).length).toBe(bd.layout.bottomZ.length)
    const top = (id: string) => {
      const p = parts.find((q) => q.id === id)!
      return p.shape === 'box' ? p.center[1] + p.size[1] / 2 : Math.max(p.from[1], p.to[1])
    }
    expect(top('cjoist-0')).toBeCloseTo(inp.clearHeight - deckThicknessM(inp.sheathing), 6)
    expect(top('stiff-0')).toBeLessThan(top('cjoist-0') - 0.01)
  })
  it('side-form ties get a bearing plate across the double wale at both ends', () => {
    const inp = { ...DEFAULT_BEAM, h: 1.2, tie: { ...DEFAULT_BEAM.tie, enabled: true } }
    const parts = beamModel(inp, designBeam(inp)).parts
    const ties = parts.filter((p) => /^tie-/.test(p.id))
    expect(ties.length).toBeGreaterThan(0)
    expect(parts.filter((p) => p.id.startsWith('tieplate'))).toHaveLength(2 * ties.length)
  })
  it('width handle drags one face (half width)', () => expect(applyBeamHandle(DEFAULT_BEAM, 'b', 0.2).b).toBe(0.4))
})

describe('footing model', () => {
  it('braced footing: a brace per stud per level and two stakes per stud', () => {
    const d = designFooting(DEFAULT_FOOTING)
    const m = footingModel(DEFAULT_FOOTING, d)
    const studs = count(m.parts, 'stud')
    expect(count(m.parts, 'brace')).toBe(studs * d.layout.braceLevels.length)
    expect(count(m.parts, 'stake')).toBe(2 * studs)
  })
  it('tied footing: wales on four faces and ties across the short side', () => {
    const inp = { ...DEFAULT_FOOTING, lengthX: 4, lengthY: 2, height: 2, support: 'tied' as const }
    const d = designFooting(inp)
    const m = footingModel(inp, d)
    expect(count(m.parts, 'wale')).toBe(4 * 2 * d.layout.waleLevels.length)
    const tie = m.parts.find((p) => p.group === 'tie')!
    expect(tie.shape === 'bar' && tie.from[0] === tie.to[0]).toBe(true) // runs along z (Ly is shorter)
  })
  it('corner wales do not clash: short sides butt between the long sides; length matches the quantity', () => {
    for (const [Lx, Ly] of [[5, 2], [2, 5], [2.4, 2.4]]) {
      const inp = { ...DEFAULT_FOOTING, lengthX: Lx, lengthY: Ly, height: 2, support: 'tied' as const }
      const d = designFooting(inp)
      const wales = footingModel(inp, d).parts.filter((p) => p.group === 'wale' && p.shape === 'box')
      const lo = (p: (typeof wales)[number], k: number) => (p.shape === 'box' ? p.center[k] - p.size[k] / 2 : 0)
      const hi = (p: (typeof wales)[number], k: number) => (p.shape === 'box' ? p.center[k] + p.size[k] / 2 : 0)
      for (const a of wales)
        for (const b of wales)
          if (a !== b) expect([0, 1, 2].every((k) => lo(a, k) < hi(b, k) - 1e-6 && lo(b, k) < hi(a, k) - 1e-6)).toBe(false)
      const total = wales.reduce((s, p) => s + (p.shape === 'box' ? Math.max(p.size[0], p.size[2]) : 0), 0)
      expect(total).toBeCloseTo(d.quantities.waleLength, 6)
    }
  })
  it('model ties match the design count for every tie layout', () => {
    for (const layout of ['none', 'short', 'both'] as const) {
      const inp = { ...DEFAULT_FOOTING, support: 'tied' as const, tie: { ...DEFAULT_FOOTING.tie, layout } }
      const d = designFooting(inp)
      const parts = footingModel(inp, d).parts.filter((p) => p.group === 'tie')
      expect(parts.filter((p) => p.shape === 'bar')).toHaveLength(d.quantities.ties)
      // a steel bearing plate at both ends of every tie
      expect(parts.filter((p) => p.id.startsWith('tieplate'))).toHaveLength(2 * d.quantities.ties)
    }
  })
  it('crossed corners: short-side wales run full length, one wale set lower; butt keeps one level', () => {
    // first wale 0.15 m up: one set lower would dig below the base → auto goes up
    const low = { ...DEFAULT_FOOTING, lengthX: 5, lengthY: 2, height: 2, support: 'tied' as const }
    expect(designFooting(low).layout.waleShift).toBeCloseTo(0.115, 6)
    const base = { ...low, wale: { ...low.wale, bottomOffsetM: 0.3 } }
    const cross = designFooting(base)
    expect(cross.layout.waleCorner).toBe('cross')
    expect(cross.layout.waleShift).toBeCloseTo(-(2 * 5 + 1.5) / 100, 6) // 2–2"×4": 2 × 5 cm + 1.5 cm gap, down
    const wales = footingModel(base, cross).parts.filter((p) => p.group === 'wale' && p.shape === 'box')
    const lens = new Set(wales.map((p) => (p.shape === 'box' ? Math.round(Math.max(p.size[0], p.size[2]) * 1000) : 0)))
    expect(lens.size).toBe(2) // long and short sides, both run past the corners
    const up = designFooting({ ...base, wale: { ...base.wale, shift: 'up' } })
    expect(up.layout.waleShift).toBeGreaterThan(0)
    const butt = designFooting({ ...base, wale: { ...base.wale, corner: 'butt' } })
    expect(butt.layout.waleShift).toBe(0)
    expect(butt.quantities.waleLength).toBeLessThan(cross.quantities.waleLength)
  })
  it('braced through wales: wales at every brace level, braces and stakes as designed', () => {
    const inp = { ...DEFAULT_FOOTING, brace: { ...DEFAULT_FOOTING.brace, at: 'wale' as const } }
    const d = designFooting(inp)
    const m = footingModel(inp, d)
    expect(count(m.parts, 'wale')).toBe(4 * 2 * d.layout.braceLevels.length)
    expect(count(m.parts, 'brace')).toBe(d.quantities.braces)
    expect(count(m.parts, 'stake')).toBe(d.quantities.stakes)
  })
  it('plan handles double the dragged half size', () => expect(applyFootingHandle(DEFAULT_FOOTING, 'lengthX', 1.5).lengthX).toBe(3))
})

describe('beam model on stringers', () => {
  const inp = { ...DEFAULT_BEAM, b: 0.4, h: 0.8, length: 8, clearHeight: 4.5, shore: { ...DEFAULT_BEAM.shore, sectionId: BS_TUBE, postSpacingM: 0.9 }, stringer: { ...DEFAULT_BEAM.stringer!, enabled: true } }
  const d = designBeam(inp)
  const m = beamModel(inp, d)
  const sg = d.layout.stringer!
  it('stringer rows under the heads, a shore with a U-head under every stringer at the designed spacing', () => {
    expect(count(m.parts, 'stringer')).toBe(sg.z.length)
    expect(m.parts.filter((p) => /^shore-\d+-\d+$/.test(p.id)).length).toBe(d.quantities.shores)
    const head = m.parts.find((p) => p.id === 'head-0-0')!
    const str = m.parts.find((p) => p.id === 'stringer-0-0')!
    const uh = m.parts.find((p) => p.id === 'shore-0-0-head')!
    const top = (p: typeof head) => (p.shape === 'box' ? p.center[1] + p.size[1] / 2 : 0)
    const bot = (p: typeof head) => (p.shape === 'box' ? p.center[1] - p.size[1] / 2 : 0)
    expect(top(str)).toBeCloseTo(bot(head), 6)
    expect(top(uh)).toBeCloseTo(bot(str), 6)
  })
  it('ledgers both ways at every designed level, X-bracing along the rows and across', () => {
    const ids = m.parts.map((p) => p.id)
    expect(ids.filter((id) => /^ledger-/.test(id)).length).toBe(sg.ledgerY.length * sg.z.length)
    expect(ids.filter((id) => /^ledgerx-/.test(id)).length).toBe(sg.ledgerY.length * sg.shoreX.length)
    expect(ids.filter((id) => /^br[xy]-/.test(id)).length).toBe(d.quantities.bracing)
  })
  it('ledgers stay on the posts as drawn when a longer shore length is entered', () => {
    const tall = { ...inp, clearHeight: 3, shore: { ...inp.shore, lengthM: 8 } }
    const dt = designBeam(tall)
    const mt = beamModel(tall, dt)
    const uh = mt.parts.find((p) => p.id === 'shore-0-0-head')!
    const top = uh.shape === 'box' ? uh.center[1] : 0
    const ledgers = mt.parts.filter((p) => p.id.startsWith('ledger'))
    expect(ledgers.length).toBeGreaterThan(0)
    ledgers.forEach((p) => p.shape === 'bar' && expect(Math.max(p.from[1], p.to[1])).toBeLessThan(top))
    expect(dt.warnings.some((w) => w.startsWith('ความยาวเสาที่กำหนด 8.00 ม.'))).toBe(true)
  })
  it('the shore spacing handle sets the stringer spacing', () => {
    expect(applyBeamHandle(inp, 'shoreSpacing', 1.2).stringer!.spacingCm).toBe(120)
  })
})
