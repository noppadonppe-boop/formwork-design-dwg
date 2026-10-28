import { describe, expect, it } from 'vitest'
import { DEFAULT_PANEL, emptyFaces, type FormAssembly, type FormPanel, type PanelData } from '@/data/types'
import { panelBom, panelUsage } from './assemblyReport'
import { panelLayout } from './panel'

const mk = (id: string, o: Partial<PanelData>): FormPanel => ({ ...DEFAULT_PANEL, code: id, ...o, id, projectId: 'p', createdAt: 0, updatedAt: 0 })
const asm = (id: string, a: string[], b: string[], linked = true): FormAssembly => {
  const faces = emptyFaces()
  faces.A = { courses: [{ panels: a }] }
  faces.B = { courses: [{ panels: b }] }
  return { id, projectId: 'p', createdAt: 0, updatedAt: 0, code: id, name: '', elementId: 'e', through: 'x', linked, faces, note: '' }
}

describe('panel usage', () => {
  const P = mk('P', { stock: 6 })
  const F = mk('F', { width: 0.2, stock: 3 })
  const all = [asm('a1', ['P', 'F', 'P'], ['P']), asm('a2', ['P'], ['F'])].map((assembly) => ({ assembly }))
  it('counts the panels of every face (linked C and D repeat A and B) per set, the largest set and all sets', () => {
    const [p, f] = panelUsage([P, F], all)
    expect(p.perAssembly).toEqual({ a1: 6, a2: 2 })
    expect(p.maxSet).toBe(6)
    expect(p.allSets).toBe(8)
    expect(p.status).toBe('warn')
    expect(f.perAssembly).toEqual({ a1: 2, a2: 2 })
    expect(f.status).toBe('warn')
  })
  it('fails when one set alone needs more than the stock', () => {
    expect(panelUsage([{ ...P, stock: 5 }], all)[0].status).toBe('fail')
  })
})

describe('materials for the stock', () => {
  it('plywood pieces and sheets, studs by length, volume from nominal inches', () => {
    const P = mk('P', { stock: 4 })
    const bom = panelBom([P])
    expect(bom.plywood).toHaveLength(1)
    expect(bom.plywood[0].pieces).toBe(4)
    expect(bom.plywood[0].sheets).toBe(4)
    const studs = panelLayout(P).members.length
    expect(bom.timber.reduce((a, t) => a + t.qty, 0)).toBe(4 * studs)
    const tot = bom.timberTotals[0]
    expect(tot.lengthM).toBeCloseTo(4 * studs * 1.2, 6)
    expect(tot.volumeFt3).toBeCloseTo((2 * 3 * tot.lengthM * 3.2808) / 144, 6)
  })
  it('several fillers share sheets', () => {
    const F = mk('F', { width: 0.2, height: 1.2, stock: 6 })
    expect(panelBom([F]).plywood[0].sheets).toBe(1)
  })
})

describe('DXF of a panel', () => {
  it('writes the plywood, studs and the title as R12 entities', async () => {
    const { panelView, viewsToDxf } = await import('@/report/assemblyDxf')
    const P = mk('P-2412', {})
    const dxf = viewsToDxf([panelView(P, panelLayout(P))], ['T'])
    expect(dxf.startsWith('0\r\nSECTION')).toBe(true)
    expect(dxf).toContain('FA-PLYWOOD')
    expect(dxf).toContain('FA-STUD')
    expect(dxf.trim().endsWith('EOF')).toBe(true)
    // plywood outline 2400 mm wide
    expect(dxf).toContain('\r\n11\r\n2400\r\n')
  })
})
