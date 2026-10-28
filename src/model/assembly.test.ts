import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { type AssemblyData, DEFAULT_CRITERIA, DEFAULT_PANEL, emptyFaces, type FormPanel, type PanelData } from '@/data/types'
import type { FootingInput } from '@/engine'
import { analyzeAssembly, analyzeFace, autoFace, faceSpecs, fillerLike } from './assembly'
import { panelLayout } from './panel'

const mk = (id: string, o: Partial<PanelData>): FormPanel => ({ ...DEFAULT_PANEL, code: id, stock: 10, ...o, id, projectId: 'p', createdAt: 0, updatedAt: 0 })
const P2412 = mk('P-2412', { width: 2.4, height: 1.2 })
const P2012 = mk('P-2012', { width: 2.0, height: 1.2 })
const F0212 = mk('F-0212', { width: 0.2, height: 1.2 })
const stock = [P2412, P2012, F0212]
const byId = new Map(stock.map((p) => [p.id, p]))

/** the user's example: footing 2 × 5 m, pour height 2 m */
function footing(o: Partial<FootingInput> = {}): FootingInput {
  const el = newElement('footing', DEFAULT_CRITERIA, [])
  if (el.type !== 'footing') throw new Error()
  return { ...el.input, lengthX: 5, lengthY: 2, height: 2, ...o }
}
const asm = (o: Partial<AssemblyData> = {}): AssemblyData => ({ code: 'ASM-F1', name: '', elementId: 'e', through: 'x', linked: true, faces: emptyFaces(), note: '', ...o })

describe('face sizes and corners', () => {
  it('the through pair is longer by the thickness of the other pair at both ends', () => {
    const a = asm({ faces: { ...emptyFaces(), B: { courses: [{ panels: ['P-2012'] }] } } })
    const s = faceSpecs(footing(), a, byId)
    const t = panelLayout(P2012).thickness
    expect(s.A.through).toBe(true)
    expect(s.A.length).toBeCloseTo(5 + 2 * t, 3)
    expect(s.B.through).toBe(false)
    expect(s.B.length).toBe(2)
    expect(s.A.long).toBe(true)
  })
})

describe('automatic layout', () => {
  it('long side 5.00 between the through faces: 2.40 + 0.20 + 2.40, two courses of 1.20 for a 2.00 pour, filler in the middle', () => {
    const r = autoFace({ length: 5, height: 2, through: false }, stock, { filler: 'middle', stagger: false })
    expect(r.missing).toBeUndefined()
    expect(r.layout.courses).toHaveLength(2)
    expect(r.layout.courses[0].panels).toEqual(['P-2412', 'F-0212', 'P-2412'])
  })

  it('short side 2.00: one 2.00 panel per course', () => {
    const r = autoFace({ length: 2, height: 2, through: false }, stock, { filler: 'middle', stagger: false })
    expect(r.layout.courses.map((c) => c.panels)).toEqual([['P-2012'], ['P-2012']])
  })

  it('fillers left or right, and staggered courses', () => {
    expect(autoFace({ length: 5, height: 2, through: false }, stock, { filler: 'left', stagger: false }).layout.courses[0].panels[0]).toBe('F-0212')
    const s = autoFace({ length: 5, height: 2, through: false }, stock, { filler: 'right', stagger: true }).layout.courses
    expect(s[0].panels.at(-1)).toBe('F-0212')
    expect(s[1].panels[0]).toBe('F-0212')
  })

  it('reports the filler still needed when nothing closes the length', () => {
    const r = autoFace({ length: 5.15, height: 2, through: false }, [P2412], { filler: 'middle', stagger: false })
    expect(r.missing?.width).toBeCloseTo(0.35, 3)
    expect(r.missing?.height).toBe(1.2)
  })

  it('a through face may run over the corner a little', () => {
    const r = autoFace({ length: 5.19, height: 1, through: true }, stock, { filler: 'middle', stagger: false })
    expect(r.missing).toBeUndefined()
    const len = r.layout.courses[0].panels.reduce((a, id) => a + byId.get(id)!.width, 0)
    expect(len).toBeGreaterThanOrEqual(5.19)
    expect(len - 5.19).toBeLessThanOrEqual(0.1)
  })
})

describe('face checks', () => {
  const inp = footing()
  const spec = { key: 'B' as const, axis: 'y' as const, concreteL: 2, through: false, offset: 0, length: 2, height: 2, long: false }
  it('closed, high enough → ok', () => {
    const r = analyzeFace(spec, { courses: [{ panels: ['P-2012'] }, { panels: ['P-2012'] }] }, byId, inp)
    expect(r.status).toBe('ok')
    expect(r.height).toBe(2.4)
  })
  it('short, too low and too long are reported', () => {
    expect(analyzeFace(spec, { courses: [{ panels: ['F-0212'] }] }, byId, inp).status).toBe('fail')
    expect(analyzeFace(spec, { courses: [{ panels: ['P-2412'] }, { panels: ['P-2412'] }] }, byId, inp).checks.some((c) => c.label.includes('เกิน'))).toBe(true)
  })
  it('form ties of a tied footing are checked against the panel joints', () => {
    const tied = footing({ support: 'tied' })
    const el = { ...newElement('footing', DEFAULT_CRITERIA, []), input: tied } as ReturnType<typeof newElement>
    const run = runDesign(el, DEFAULT_CRITERIA)
    if (run.type !== 'footing') throw new Error()
    const s = faceSpecs(tied, asm(), byId)
    const auto = autoFace(s.A, stock, { filler: 'middle', stagger: false })
    const r = analyzeFace(s.A, auto.layout, byId, tied, run.design)
    expect(r.ties.length).toBeGreaterThan(0)
    expect(r.wales.length).toBeGreaterThan(0)
    expect(r.checks.some((c) => c.label.startsWith('Form tie'))).toBe(true)
  })
})

describe('assembly', () => {
  it('counts the panels of all four faces (C and D repeat A and B) and lists the wales of the design', () => {
    const tied = footing({ support: 'tied' })
    const el = { ...newElement('footing', DEFAULT_CRITERIA, []), input: tied } as ReturnType<typeof newElement>
    const run = runDesign(el, DEFAULT_CRITERIA)
    const faces = emptyFaces()
    faces.A = { courses: [{ panels: ['P-2412', 'F-0212', 'P-2412'] }] }
    faces.B = { courses: [{ panels: ['P-2012'] }] }
    const r = analyzeAssembly(asm({ faces }), tied, run, stock, el, DEFAULT_CRITERIA)
    expect(r.usage.find((u) => u.panel.id === 'P-2412')?.used).toBe(4)
    expect(r.usage.find((u) => u.panel.id === 'P-2012')?.used).toBe(2)
    expect(r.wales.length).toBeGreaterThan(0)
  })

  it('a filler is made like the panel next to it', () => {
    const f = fillerLike(P2412, 0.35)
    expect(f.width).toBe(0.35)
    expect(f.height).toBe(1.2)
    expect(f.stud).toEqual(P2412.stud)
  })
})
