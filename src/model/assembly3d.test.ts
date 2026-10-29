import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { type AssemblyData, DEFAULT_CRITERIA, DEFAULT_PANEL, type ElementData, emptyFaces, type FormPanel, type PanelData } from '@/data/types'
import { analyzeAssembly } from './assembly'
import { assembly3d } from './assembly3d'
import { panelChecks, panelLayout } from './panel'

const mk = (id: string, o: Partial<PanelData>): FormPanel => ({ ...DEFAULT_PANEL, code: id, stock: 10, ...o, id, projectId: 'p', createdAt: 0, updatedAt: 0 })
const stock = [mk('P-2412', { width: 2.4, height: 1.2 }), mk('P-2012', { width: 2, height: 1.2 }), mk('F-0212', { width: 0.2, height: 1.2 }), mk('S', { width: 2.4, height: 0.3 })]

function element(type: ElementData['type'], input: object): ElementData {
  const el = newElement(type, DEFAULT_CRITERIA, [])
  return { ...el, input: { ...el.input, ...input } } as ElementData
}

function setup(through: 'x' | 'y') {
  const el = element('footing', { lengthX: 5, lengthY: 2, height: 2, support: 'tied' })
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
  return { r: analyzeAssembly(a, el, runDesign(el, DEFAULT_CRITERIA), stock, DEFAULT_CRITERIA)!, el }
}

describe('assembly in 3D', () => {
  it('puts the plywood of each face against the concrete, through faces past the corners', () => {
    const { r, el } = setup('y')
    const m = assembly3d(r, el)
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
    const { r, el } = setup('x')
    const m = assembly3d(r, el)
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
    const { r, el } = setup('y')
    expect(assembly3d(r, el).parts.some((p) => p.kind === 'ply' && p.filler)).toBe(true)
  })

  it('beam: the soffit goes first and lies under the concrete, the sides stand on it', () => {
    const el = element('beam', { b: 0.3, h: 0.6, slabT: 0, type: 'isolated', length: 2.4 })
    const faces = emptyFaces()
    faces.B = { courses: [{ panels: ['S'] }] }
    faces.A = { courses: [{ panels: ['P-2412'] }] }
    const a: AssemblyData = { code: 'B1', name: '', elementId: 'e', through: 'y', linked: true, faces, note: '' }
    const r = analyzeAssembly(a, el, runDesign(el, DEFAULT_CRITERIA), stock)!
    const m = assembly3d(r, el)
    expect(m.steps[0]).toContain('ท้องคาน')
    const soffit = m.parts.find((p) => p.kind === 'ply' && p.face === 'B')!
    expect(soffit.step).toBe(0)
    // plywood just below the concrete (y = 0), the full beam length along x
    expect(soffit.center[1] + soffit.size[1] / 2).toBeCloseTo(0, 6)
    expect(soffit.size[0]).toBeCloseTo(2.4, 6)
    const side = m.parts.find((p) => p.kind === 'ply' && p.face === 'A')!
    expect(side.step).toBeGreaterThan(0)
    // the side stands on the soffit: from the concrete underside up; the soffit is wider than the web by the sides
    expect(side.center[1] - side.size[1] / 2).toBeCloseTo(0, 6)
    expect(r.specs.B!.reqHeight).toBeGreaterThan(0.3)
  })

  it('wall: ties run through both faces', () => {
    const el = element('wall', { length: 4.8, thickness: 0.2, height: 2.4 })
    const faces = emptyFaces()
    faces.A = { courses: [{ panels: ['P-2412', 'P-2412'] }, { panels: ['P-2412', 'P-2412'] }] }
    const a: AssemblyData = { code: 'W1', name: '', elementId: 'e', through: 'x', linked: true, faces, note: '' }
    const r = analyzeAssembly(a, el, runDesign(el, DEFAULT_CRITERIA), stock)!
    const ties = assembly3d(r, el).parts.filter((p) => p.kind === 'tie')
    expect(ties.length).toBeGreaterThan(0)
    // each tie spans more than the wall thickness, along z
    expect(ties.every((t) => Math.abs(t.from![2] - t.to![2]) > 0.2 && Math.abs(t.from![0] - t.to![0]) < 1e-9)).toBe(true)
    // a bearing plate on the wales at both ends of every tie, outside the forms on either side of the wall
    const plates = assembly3d(r, el).parts.filter((p) => p.kind === 'plate')
    expect(plates).toHaveLength(2 * ties.length)
    for (const t of ties) {
      const at = plates.filter((p) => Math.abs(p.center[0] - t.from![0]) < 1e-9 && Math.abs(p.center[1] - t.from![1]) < 1e-9)
      expect(at).toHaveLength(2)
      expect(Math.sign(at[0].center[2])).toBe(-Math.sign(at[1].center[2]))
      expect(at.every((p) => Math.abs(p.center[2]) > 0.1 && Math.abs(p.center[2]) < Math.abs(t.from![2]))).toBe(true)
    }
  })
})

describe('wall with horizontal studs on vertical wales', () => {
  const H = (id: string, w: number) => mk(id, { width: w, height: 1.2, stud: { ...DEFAULT_PANEL.stud, dir: 'horizontal' } })
  const hs = [H('H-2412', 2.4), H('H-4812', 4.8)]
  const el = element('wall', { length: 4.8, thickness: 0.2, height: 2.4, system: 'horizontal' })
  const run = runDesign(el, DEFAULT_CRITERIA)
  const wall = (ids: string[], panels: FormPanel[]) => {
    const faces = emptyFaces()
    faces.A = { courses: [{ panels: ids }, { panels: ids }] }
    return analyzeAssembly({ code: 'W1', name: '', elementId: 'e', through: 'y', linked: true, faces, note: '' }, el, run, panels)!
  }

  it('faces A and C carry the vertical wales of the design (C mirrored), no horizontal wales', () => {
    // one panel the full length: no joints, the strongbacks stay as designed
    const r = wall(['H-4812'], hs)
    const x = run.type === 'wall' ? run.design.layout.waleX : []
    expect(r.specs.A!.wales).toEqual([])
    expect(r.specs.A!.waleU).toEqual(x)
    expect(r.specs.C!.waleU).toEqual(x.map((u) => Math.round((4.8 - u) * 1000) / 1000).reverse())
    expect(r.geom.waleLabel).toBe('คานตั้ง')
  })

  it('3D: double wales stand the full height; plates bridge the side-by-side pair', () => {
    const r = wall(['H-4812'], hs)
    const parts = assembly3d(r, el).parts
    const wales = parts.filter((p) => p.kind === 'wale')
    expect(wales).toHaveLength(2 * 2 * r.specs.A!.waleU!.length)
    for (const w of wales) expect(w.size[1]).toBeCloseTo(2.4, 6)
    const plate = parts.find((p) => p.kind === 'plate')!
    expect(plate.size[0]).toBeGreaterThan(plate.size[1])
    expect(r.wales).toEqual([{ faces: 'A/C', length: 2.4, count: 4 * r.specs.A!.waleU!.length }])
  })

  it('panel ends within the stud cantilever of a wale pass', () => {
    const one = wall(['H-4812'], hs)
    expect(one.faces.A!.checks.some((c) => c.status === 'ok' && c.label.includes('ช่วงยื่นของเคร่านอน'))).toBe(true)
  })

  it('strongbacks are set out at the panel joints: within the stud cantilever, clear of the tie, ≤ design c/c', () => {
    // the joint of two 2.40 m panels falls between the designed strongbacks (0.25 m from the nearest)
    const design = run.type === 'wall' ? run.design.layout.waleX : []
    expect(Math.min(...design.map((w) => Math.abs(w - 2.4)))).toBeGreaterThan(0.2)
    const r = wall(['H-2412', 'H-2412'], hs)
    const x = r.specs.A!.waleU!
    const reach = r.specs.A!.studReach!
    const near = Math.min(...x.map((w) => Math.abs(w - 2.4)))
    expect(near).toBeLessThanOrEqual(reach + 1e-9)
    expect(near).toBeGreaterThanOrEqual(0.1 - 1e-9)
    expect(x[0]).toBe(design[0])
    expect(x.at(-1)).toBe(design.at(-1))
    expect(Math.max(...x.slice(1).map((w, i) => w - x[i]))).toBeLessThanOrEqual(r.specs.A!.waleMax! + 1e-9)
    // the same strongbacks on the back face, ties at every one of them on the design's tie rows
    expect(r.specs.C!.waleU).toEqual(x.map((u) => Math.round((4.8 - u) * 1000) / 1000).reverse())
    const rows = run.type === 'wall' ? run.design.layout.tieLevels : []
    expect(r.faces.A!.ties).toHaveLength(x.length * rows.length)
    expect(r.faces.A!.ties.some((t) => t.clash)).toBe(false)
    expect(r.faces.A!.checks.some((c) => c.status === 'ok' && c.label.includes('ช่วงยื่นของเคร่านอน'))).toBe(true)
    expect(r.faces.A!.checks.some((c) => c.label.startsWith('คานตั้งจัดตามรอยต่อแผง'))).toBe(true)
    expect(r.wales).toEqual([{ faces: 'A/C', length: 2.4, count: 2 * 2 * x.length }])
  })

  it('a through face: the end strongbacks keep the design offset from the panel ends, past the concrete', () => {
    const faces = emptyFaces()
    faces.A = { courses: [{ panels: ['H-2412', 'H-2412'] }, { panels: ['H-2412', 'H-2412'] }] }
    const r = analyzeAssembly({ code: 'W1', name: '', elementId: 'e', through: 'x', linked: true, faces, note: '' }, el, run, hs)!
    expect(r.relaid).toBe(true)
    const x = r.specs.A!.waleU!
    const e = run.type === 'wall' ? run.design.layout.waleX[0] : 0
    expect(x[0]).toBeCloseTo(Math.min(e, r.specs.A!.studReach!), 3) // face coordinates start at the panel end
    expect(r.faces.A!.checks.some((c) => c.status === 'ok' && c.label.includes('ช่วงยื่นของเคร่านอน'))).toBe(true)
  })

  it('panels with vertical studs keep the designed strongbacks', () => {
    const r = wall(['P-2412', 'P-2412'], stock)
    expect(r.specs.A!.waleU).toEqual(run.type === 'wall' ? run.design.layout.waleX : [])
  })

  it('panels with vertical studs on a horizontal-stud wall are flagged', () => {
    const flag = (r: ReturnType<typeof wall>, id: string) => {
      const p = r.usage.find((u) => u.panel.id === id)!.panel
      return panelChecks(p, panelLayout(p), { el, run }).some((c) => c.status === 'warn' && c.label.includes('แผงนี้วางเคร่าตั้ง'))
    }
    expect(flag(wall(['P-2412', 'P-2412'], stock), 'P-2412')).toBe(true)
    expect(flag(wall(['H-2412', 'H-2412'], hs), 'H-2412')).toBe(false)
  })
})
