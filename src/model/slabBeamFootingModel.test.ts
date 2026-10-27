import { describe, expect, it } from 'vitest'
import { DEFAULT_BEAM, DEFAULT_FOOTING, DEFAULT_SLAB, designBeam, designFooting, designSlab } from '@/engine'
import { applyBeamHandle, applyFootingHandle, applySlabHandle, beamModel, footingModel, slabModel } from './slabBeamFootingModel'

const count = (parts: { group: string }[], g: string) => parts.filter((p) => p.group === g).length

describe('slab model', () => {
  const d = designSlab(DEFAULT_SLAB)
  const m = slabModel(DEFAULT_SLAB, d)
  it('one joist per joist line, one shore per grid point', () => {
    expect(count(m.parts, 'joist')).toBe(d.layout.joistX.length)
    expect(m.parts.filter((p) => p.group === 'shore' && !p.id.endsWith('-base')).length).toBe(d.quantities.shores)
  })
  it('stacks shores → stringers → joists → deck under the slab soffit', () => {
    expect(m.bounds.max[1]).toBeCloseTo(DEFAULT_SLAB.clearHeight + DEFAULT_SLAB.thickness, 6)
    expect(m.bounds.min[1]).toBeGreaterThan(-0.1) // bars are padded by their width
    const shore = m.parts.find((p) => p.id === 'shore-0-0')!
    expect(shore.shape === 'bar' ? shore.to[1] : 0).toBeCloseTo(d.layout.shoreTop, 6)
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
  it('plan handles double the dragged half size', () => expect(applyFootingHandle(DEFAULT_FOOTING, 'lengthX', 1.5).lengthX).toBe(3))
})
