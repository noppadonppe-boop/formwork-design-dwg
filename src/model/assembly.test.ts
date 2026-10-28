import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { type AssemblyData, DEFAULT_CRITERIA, DEFAULT_PANEL, type ElementData, emptyFaces, type FormPanel, type PanelData } from '@/data/types'
import { analyzeAssembly, analyzeFace, autoFace, faceSpecs, fillerLike } from './assembly'
import { elementGeom } from './assemblyGeom'
import { panelLayout } from './panel'

const mk = (id: string, o: Partial<PanelData>): FormPanel => ({ ...DEFAULT_PANEL, code: id, stock: 10, ...o, id, projectId: 'p', createdAt: 0, updatedAt: 0 })
const P2412 = mk('P-2412', { width: 2.4, height: 1.2 })
const P2012 = mk('P-2012', { width: 2.0, height: 1.2 })
const F0212 = mk('F-0212', { width: 0.2, height: 1.2 })
const stock = [P2412, P2012, F0212]
const byId = new Map(stock.map((p) => [p.id, p]))

function element<T extends ElementData['type']>(type: T, input: object): ElementData {
  const el = newElement(type, DEFAULT_CRITERIA, [])
  return { ...el, input: { ...el.input, ...input } } as ElementData
}
/** the user's example: footing 2 × 5 m, pour height 2 m */
const footing = (o: object = {}) => element('footing', { lengthX: 5, lengthY: 2, height: 2, ...o })
const asm = (o: Partial<AssemblyData> = {}): AssemblyData => ({ code: 'ASM-F1', name: '', elementId: 'e', through: 'x', linked: true, faces: emptyFaces(), note: '', ...o })

describe('face sizes and corners', () => {
  it('footing: the through pair is longer by the thickness of the other pair at both ends', () => {
    const g = elementGeom(footing())!
    const a = asm({ faces: { ...emptyFaces(), B: { courses: [{ panels: ['P-2012'] }] } } })
    const s = faceSpecs(g, a, byId)
    const t = panelLayout(P2012).thickness
    expect(s.A!.through).toBe(true)
    expect(s.A!.length).toBeCloseTo(5 + 2 * t, 3)
    expect(s.B!.through).toBe(false)
    expect(s.B!.length).toBe(2)
    expect(s.A!.reqHeight).toBe(2)
  })

  it('column: four faces b and h; the wider pair wraps the narrower by default', () => {
    const col = element('column', { b: 0.4, h: 0.6, height: 3 })
    const g = elementGeom(col, runDesign(col, DEFAULT_CRITERIA))!
    expect(g.faces.map((f) => f.key)).toEqual(['A', 'B', 'C', 'D'])
    expect(g.through).toBe('y')
    const s = faceSpecs(g, asm({ through: g.through }), byId)
    expect(s.A!.length).toBe(0.4)
    expect(s.B!.length).toBeCloseTo(0.6 + 2 * g.panelT, 3)
    expect(g.faces[0].wales.length).toBeGreaterThan(0)
  })

  it('wall: faces along the wall and stop-ends across its thickness, ties mirrored on the back face', () => {
    const el = element('wall', { length: 6, thickness: 0.25, height: 2.5 })
    const g = elementGeom(el, runDesign(el, DEFAULT_CRITERIA))!
    const [A, B, C] = g.faces
    expect([A.concreteL, B.concreteL, C.concreteL]).toEqual([6, 0.25, 6])
    expect(A.ties.length).toBeGreaterThan(0)
    expect(C.ties.map((t) => t.u).sort((x, y) => x - y)).toEqual(A.ties.map((t) => Math.round((6 - t.u) * 1000) / 1000).sort((x, y) => x - y))
    const s = faceSpecs(g, asm({ through: 'x' }), byId)
    expect(s.B!.length).toBe(0.25)
    expect(s.A!.length).toBeCloseTo(6 + 2 * g.panelT, 3)
  })

  it('beam: sides on the soffit as designed widen the soffit; sides clamping it make the sides taller', () => {
    const el = element('beam', { b: 0.3, h: 0.6, slabT: 0, type: 'isolated', length: 4.8 })
    const g = elementGeom(el, runDesign(el, DEFAULT_CRITERIA))!
    expect(g.faces.map((f) => f.key)).toEqual(['A', 'B', 'C'])
    const soffitOver = faceSpecs(g, asm({ through: 'y' }), byId)
    expect(soffitOver.B!.reqHeight).toBeCloseTo(0.3 + 2 * g.panelT, 3)
    expect(soffitOver.B!.exactHeight).toBe(true)
    expect(soffitOver.A!.reqHeight).toBeCloseTo(g.faces[0].height, 3)
    const sidesOver = faceSpecs(g, asm({ through: 'x' }), byId)
    expect(sidesOver.B!.reqHeight).toBe(0.3)
    expect(sidesOver.A!.reqHeight).toBeCloseTo(g.faces[0].height + g.panelT, 3)
    expect(sidesOver.A!.length).toBe(4.8)
  })

  it('slabs and round columns are not covered', () => {
    expect(elementGeom(newElement('slab', DEFAULT_CRITERIA, []))).toBeUndefined()
    expect(elementGeom(element('column', { shape: { kind: 'circle', d: 0.6, system: 'tube' } }))).toBeUndefined()
  })
})

describe('automatic layout', () => {
  const spec = (length: number, reqHeight: number, o: object = {}) => ({ length, reqHeight, canOverrun: false, ...o })
  it('long side 5.00 between the through faces: 2.40 + 0.20 + 2.40, two courses of 1.20 for a 2.00 pour, filler in the middle', () => {
    const r = autoFace(spec(5, 2), stock, { filler: 'middle', stagger: false })
    expect(r.missing).toBeUndefined()
    expect(r.layout.courses).toHaveLength(2)
    expect(r.layout.courses[0].panels).toEqual(['P-2412', 'F-0212', 'P-2412'])
  })

  it('short side 2.00: one 2.00 panel per course', () => {
    const r = autoFace(spec(2, 2), stock, { filler: 'middle', stagger: false })
    expect(r.layout.courses.map((c) => c.panels)).toEqual([['P-2012'], ['P-2012']])
  })

  it('fillers left or right, and staggered courses', () => {
    expect(autoFace(spec(5, 2), stock, { filler: 'left', stagger: false }).layout.courses[0].panels[0]).toBe('F-0212')
    const s = autoFace(spec(5, 2), stock, { filler: 'right', stagger: true }).layout.courses
    expect(s[0].panels.at(-1)).toBe('F-0212')
    expect(s[1].panels[0]).toBe('F-0212')
  })

  it('reports the filler still needed when nothing closes the length', () => {
    const r = autoFace(spec(5.15, 2), [P2412], { filler: 'middle', stagger: false })
    expect(r.missing?.width).toBeCloseTo(0.35, 3)
    expect(r.missing?.height).toBe(1.2)
  })

  it('a through face may run over the corner a little', () => {
    const r = autoFace(spec(5.19, 1, { canOverrun: true }), stock, { filler: 'middle', stagger: false })
    expect(r.missing).toBeUndefined()
    const len = r.layout.courses[0].panels.reduce((a, id) => a + byId.get(id)!.width, 0)
    expect(len).toBeGreaterThanOrEqual(5.19)
    expect(len - 5.19).toBeLessThanOrEqual(0.1)
  })

  it('an exact width (soffit) is made of course heights that add up to it', () => {
    const strips = [mk('S30', { width: 2.4, height: 0.3 }), mk('S20', { width: 2.4, height: 0.2 }), mk('S10', { width: 2.4, height: 0.1 })]
    const r = autoFace(spec(4.8, 0.5, { exactHeight: true }), strips, { filler: 'middle', stagger: false })
    expect(r.layout.courses.map((c) => c.panels[0])).toEqual(['S30', 'S20'])
    expect(r.layout.courses[0].panels).toEqual(['S30', 'S30'])
  })

  it('a narrow face is one panel of its width, not strips side by side', () => {
    const r = autoFace(spec(0.4, 1.2), stock, { filler: 'middle', stagger: false })
    expect(r.missing).toEqual({ width: 0.4, height: 1.2 })
    const col = mk('C40', { width: 0.4, height: 1.2 })
    expect(autoFace(spec(0.4, 1.2), [...stock, col], { filler: 'middle', stagger: false }).layout.courses[0].panels).toEqual(['C40'])
  })

  it('prefers fewer, taller courses over many thin ones', () => {
    const thin = mk('T', { width: 2.4, height: 0.486 })
    // 3.20 m: three courses of 1.20 rather than seven of 0.486
    expect(autoFace(spec(4.8, 3.2), [P2412, thin], { filler: 'middle', stagger: false }).layout.courses).toHaveLength(3)
    // a 0.48 m beam side: one course of 0.486 rather than one of 1.20
    expect(autoFace(spec(4.8, 0.48), [P2412, thin], { filler: 'middle', stagger: false }).layout.courses[0].panels[0]).toBe('T')
  })

  it('asks for a soffit panel when no panel heights add up to the exact width', () => {
    const r = autoFace(spec(6, 0.486, { exactHeight: true }), stock, { filler: 'middle', stagger: false })
    expect(r.layout.courses).toEqual([])
    // 6.00 m in equal panels no longer than the 2.40 m stock panels: 3 × 2.00
    expect(r.missing).toEqual({ width: 2, height: 0.486 })
  })
})

describe('face checks', () => {
  const g = elementGeom(footing())!
  const spec = faceSpecs(g, asm({ through: 'x' }), byId).B!
  it('closed, high enough → ok', () => {
    const r = analyzeFace(spec, { courses: [{ panels: ['P-2012'] }, { panels: ['P-2012'] }] }, byId)
    expect(r.status).toBe('ok')
    expect(r.height).toBe(2.4)
  })
  it('short, too low and too long are reported', () => {
    expect(analyzeFace(spec, { courses: [{ panels: ['F-0212'] }] }, byId).status).toBe('fail')
    expect(analyzeFace(spec, { courses: [{ panels: ['P-2412'] }, { panels: ['P-2412'] }] }, byId).checks.some((c) => c.label.includes('เกิน'))).toBe(true)
  })
  it('a soffit must be exactly as wide as required', () => {
    const el = element('beam', { b: 0.3, h: 0.6, slabT: 0, type: 'isolated', length: 2.4 })
    const s = faceSpecs(elementGeom(el)!, asm({ through: 'x' }), byId).B!
    const strip = mk('S', { width: 2.4, height: 0.3 })
    const wide = mk('W', { width: 2.4, height: 0.4 })
    const ids = new Map([strip, wide].map((p) => [p.id, p]))
    expect(analyzeFace(s, { courses: [{ panels: ['S'] }] }, ids).status).toBe('ok')
    expect(analyzeFace(s, { courses: [{ panels: ['W'] }] }, ids).status).toBe('fail')
  })
  it('form ties of a tied footing are checked against the panel joints', () => {
    const el = footing({ support: 'tied' })
    const g = elementGeom(el, runDesign(el, DEFAULT_CRITERIA))!
    const s = faceSpecs(g, asm(), byId).A!
    const r = analyzeFace(s, autoFace(s, stock, { filler: 'middle', stagger: false }).layout, byId)
    expect(r.ties.length).toBeGreaterThan(0)
    expect(r.wales.length).toBeGreaterThan(0)
    expect(r.checks.some((c) => c.label.startsWith('Form tie'))).toBe(true)
  })
})

describe('assembly', () => {
  it('counts the panels of all four faces (C and D repeat A and B) and lists the wales of the design', () => {
    const el = footing({ support: 'tied' })
    const faces = emptyFaces()
    faces.A = { courses: [{ panels: ['P-2412', 'F-0212', 'P-2412'] }] }
    faces.B = { courses: [{ panels: ['P-2012'] }] }
    const r = analyzeAssembly(asm({ faces }), el, runDesign(el, DEFAULT_CRITERIA), stock, DEFAULT_CRITERIA)!
    expect(r.usage.find((u) => u.panel.id === 'P-2412')?.used).toBe(4)
    expect(r.usage.find((u) => u.panel.id === 'P-2012')?.used).toBe(2)
    expect(r.wales.length).toBeGreaterThan(0)
  })

  it('a beam has three faces; its soffit is counted once', () => {
    const el = element('beam', { b: 0.3, h: 0.6, slabT: 0, type: 'isolated', length: 2.4 })
    const faces = emptyFaces()
    faces.A = { courses: [{ panels: ['P-2412'] }] }
    faces.B = { courses: [{ panels: ['P-2412'] }] }
    const r = analyzeAssembly(asm({ faces, linked: true }), el, runDesign(el, DEFAULT_CRITERIA), stock)!
    expect(r.keys).toEqual(['A', 'B', 'C'])
    expect(r.usage.find((u) => u.panel.id === 'P-2412')?.used).toBe(3)
  })

  it('a filler is made like the panel next to it', () => {
    const f = fillerLike(P2412, 0.35)
    expect(f.width).toBe(0.35)
    expect(f.height).toBe(1.2)
    expect(f.stud).toEqual(P2412.stud)
  })
})
