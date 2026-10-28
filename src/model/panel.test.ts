import { describe, expect, it } from 'vitest'
import { DEFAULT_CRITERIA, DEFAULT_PANEL, type PanelData } from '@/data/types'
import { newElement, runDesign } from '@/data/elements'
import { panelChecks, panelCodeFor, panelLayout, panelStatus, pickLay } from './panel'

const panel = (o: Partial<PanelData> = {}): PanelData => ({ ...DEFAULT_PANEL, ...o, edges: { ...DEFAULT_PANEL.edges, ...o.edges } })

describe('panel layout', () => {
  it('2.40 × 1.20 with end studs: one sheet, studs ≤ 40 cm, edge studs at both ends', () => {
    const L = panelLayout(panel())
    expect(L.ply).toHaveLength(1)
    expect(L.lay).toBe('long-width')
    expect(L.seams).toHaveLength(0)
    const studs = L.members.filter((m) => m.kind === 'edge' || m.kind === 'stud')
    expect(studs.filter((m) => m.kind === 'edge')).toHaveLength(2)
    expect(Math.max(...L.spacings)).toBeLessThanOrEqual(40)
    expect(studs).toHaveLength(Math.ceil((2.4 - 0.05) / 0.4) + 1)
    expect(studs.every((m) => m.length === 1.2)).toBe(true)
    expect(L.overhangs).toHaveLength(0)
  })

  it('steel studs: depth from the section, weight from its kg/m', () => {
    const L = panelLayout(panel({ stud: { ...DEFAULT_PANEL.stud, sectionId: 'rhs-100×50×2.3', materialId: 'steel-a36' } }))
    expect(L.studD).toBeCloseTo(0.1, 3)
    const metres = L.members.reduce((a, m) => a + m.length, 0)
    expect(L.weightKg).toBeCloseTo(2.4 * 1.2 * (DEFAULT_PANEL.plywood.thicknessMm / 1000) * 600 + metres * 5.14, 0)
  })

  it('top and bottom caps shorten the studs and run the full width', () => {
    const L = panelLayout(panel({ edges: { left: true, right: true, top: true, bottom: true } }))
    const caps = L.members.filter((m) => m.kind === 'cap')
    expect(caps).toHaveLength(2)
    expect(caps.every((c) => c.length === 2.4)).toBe(true)
    expect(L.members.find((m) => m.kind === 'stud')!.length).toBeCloseTo(1.2 - 2 * 0.05, 3)
  })

  it('a joint parallel to the studs gets a stud under it', () => {
    // 3.0 wide: sheets 2.44 + 0.56 → vertical joint at x = 2.44
    const L = panelLayout(panel({ width: 3, height: 1.2 }))
    expect(L.seams).toEqual([{ axis: 'x', at: 2.44 }])
    const centres = L.members.filter((m) => m.kind !== 'cap' && m.kind !== 'block').map((m) => m.x + m.w / 2)
    expect(centres.some((c) => Math.abs(c - 2.44) < 1e-6)).toBe(true)
    expect(Math.max(...L.spacings)).toBeLessThanOrEqual(40)
  })

  it('a joint across the studs gets blocking between every pair of studs', () => {
    // 1.20 × 3.00, studs vertical, sheets laid long-height: joint at y = 2.44
    const L = panelLayout(panel({ width: 1.2, height: 3, plywood: { ...DEFAULT_PANEL.plywood, lay: 'long-height' } }))
    expect(L.seams).toEqual([{ axis: 'y', at: 2.44 }])
    const studs = L.members.filter((m) => m.kind === 'edge' || m.kind === 'stud').length
    expect(L.members.filter((m) => m.kind === 'block')).toHaveLength(studs - 1)
  })

  it('a side without an edge stud keeps half a spacing so butted panels stay at spacing', () => {
    const L = panelLayout(panel({ edges: { left: false, right: true, top: false, bottom: false } }))
    expect(L.overhangs).toEqual([{ edge: 'left', cm: 17.5 }])
  })

  it('horizontal studs run along the width', () => {
    const L = panelLayout(panel({ stud: { ...DEFAULT_PANEL.stud, dir: 'horizontal' }, edges: { left: false, right: false, top: true, bottom: true } }))
    const studs = L.members.filter((m) => m.kind === 'edge' || m.kind === 'stud')
    expect(studs.every((m) => m.length === 2.4)).toBe(true)
    expect(studs.filter((m) => m.kind === 'edge')).toHaveLength(2)
  })

  it('filler 0.20 × 1.20 and plywood orientation', () => {
    expect(pickLay(0.2, 1.2, 'auto')).toBe('long-height')
    const L = panelLayout(panel({ width: 0.2, height: 1.2 }))
    expect(L.ply).toHaveLength(1)
    expect(L.members.filter((m) => m.kind === 'edge')).toHaveLength(2)
  })
})

describe('panel checks', () => {
  it('passes against a wall designed with the same plywood and studs', () => {
    const el = newElement('wall', DEFAULT_CRITERIA, [])
    const run = runDesign(el, DEFAULT_CRITERIA)
    const comp = run.design.components.find((c) => c.key === 'sheathing')!
    const wall = el.type === 'wall' ? el.input : undefined
    const p = panel({
      plywood: { materialId: wall!.sheathing.materialId, thicknessMm: wall!.sheathing.thicknessMm, lay: 'auto' },
      stud: { sectionId: wall!.stud.sectionId, materialId: wall!.stud.materialId, dir: 'vertical', spacingCm: comp.spacing!.value },
    })
    const checks = panelChecks(p, panelLayout(p), { el, run }, DEFAULT_CRITERIA)
    expect(panelStatus(checks)).not.toBe('fail')
    expect(checks.some((c) => c.label.includes('ไม่ด้อยกว่า'))).toBe(true)
  })

  it('fails when the plywood is too thin for the spacing', () => {
    const el = newElement('wall', DEFAULT_CRITERIA, [])
    const run = runDesign(el, DEFAULT_CRITERIA)
    const p = panel({ plywood: { materialId: 'ply-generic70', thicknessMm: 10, lay: 'auto' }, stud: { ...DEFAULT_PANEL.stud, spacingCm: 60 } })
    expect(panelStatus(panelChecks(p, panelLayout(p), { el, run }, DEFAULT_CRITERIA))).toBe('fail')
  })
})

describe('panel codes', () => {
  it('derives the code from the size and avoids taken ones', () => {
    expect(panelCodeFor(2.4, 1.2, [])).toBe('P-2412')
    expect(panelCodeFor(0.2, 1.2, [])).toBe('F-0212')
    expect(panelCodeFor(2.4, 1.2, ['P-2412'])).toBe('P-2412-A')
    expect(panelCodeFor(0.25, 1.2, [])).toBe('F-25x120')
  })
})
