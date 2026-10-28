import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { type AssemblyData, DEFAULT_CRITERIA, DEFAULT_PANEL, emptyFaces, type FormPanel, type PanelData } from '@/data/types'
import { analyzeAssembly } from './assembly'
import { assembly3d } from './assembly3d'

const mk = (id: string, o: Partial<PanelData>): FormPanel => ({ ...DEFAULT_PANEL, code: id, stock: 10, ...o, id, projectId: 'p', createdAt: 0, updatedAt: 0 })
const stock = [mk('P-2412', { width: 2.4, height: 1.2 }), mk('P-2012', { width: 2, height: 1.2 }), mk('F-0212', { width: 0.2, height: 1.2 })]

function setup(through: 'x' | 'y') {
  const base = newElement('footing', DEFAULT_CRITERIA, [])
  if (base.type !== 'footing') throw new Error()
  const el = { ...base, input: { ...base.input, lengthX: 5, lengthY: 2, height: 2, support: 'tied' as const } }
  const run = runDesign(el, DEFAULT_CRITERIA)
  const faces = emptyFaces()
  const two = (ids: string[]) => ({ courses: [{ panels: ids }, { panels: ids }] })
  if (through === 'y') {
    faces.A = two(['P-2412', 'F-0212', 'P-2412'])
    faces.B = two(['P-2012', 'F-0212'])
  } else {
    faces.A = two(['P-2412', 'F-0212', 'F-0212', 'P-2412'])
    faces.B = two(['P-2012'])
  }
  const a: AssemblyData = { code: 'ASM', name: '', elementId: 'e', through, linked: true, faces, note: '' }
  const r = analyzeAssembly(a, el.input, run, stock, el, DEFAULT_CRITERIA)
  return { r, inp: el.input }
}

describe('assembly in 3D', () => {
  it('puts the plywood of each face against the concrete, through faces past the corners', () => {
    const { r, inp } = setup('y')
    const m = assembly3d(r, inp, 'y')
    const ply = m.parts.filter((p) => p.kind === 'ply')
    expect(ply).toHaveLength(2 * (3 + 2) * 2)
    // face A (front, +z) between the B/D faces: x from −2.5 to 2.5, plywood just outside z = 1
    const a = ply.filter((p) => p.face === 'A')
    const xs = a.flatMap((p) => [p.center[0] - p.size[0] / 2, p.center[0] + p.size[0] / 2])
    expect(Math.min(...xs)).toBeCloseTo(-2.5, 3)
    expect(Math.max(...xs)).toBeCloseTo(2.5, 3)
    expect(a.every((p) => Math.abs(p.center[2] - p.size[2] / 2 - 1) < 1e-6)).toBe(true)
    // face B (right, +x) runs past the corners: z beyond ±1
    const zs = ply.filter((p) => p.face === 'B').flatMap((p) => [p.center[2] - p.size[2] / 2, p.center[2] + p.size[2] / 2])
    expect(Math.min(...zs)).toBeLessThan(-1)
    expect(Math.max(...zs)).toBeGreaterThan(1)
  })

  it('steps: per course the through faces then the others, then wales, then ties', () => {
    const { r, inp } = setup('x')
    const m = assembly3d(r, inp, 'x')
    expect(m.steps).toHaveLength(2 * 2 + 2)
    expect(m.steps[0]).toContain('A/C')
    expect(m.steps[1]).toContain('B/D')
    const stepOf = (k: string, course: number) => m.parts.find((p) => p.kind === 'ply' && p.face === k && p.course === course)!.step
    expect(stepOf('A', 0)).toBe(0)
    expect(stepOf('B', 0)).toBe(1)
    expect(stepOf('C', 1)).toBe(2)
    expect(m.parts.filter((p) => p.kind === 'wale').every((p) => p.step === 4)).toBe(true)
    expect(m.parts.filter((p) => p.kind === 'tie').length).toBeGreaterThan(0)
    expect(m.parts.filter((p) => p.kind === 'tie').every((p) => p.step === 5)).toBe(true)
  })

  it('marks fillers', () => {
    const { r, inp } = setup('y')
    expect(assembly3d(r, inp, 'y').parts.some((p) => p.kind === 'ply' && p.filler)).toBe(true)
  })
})
