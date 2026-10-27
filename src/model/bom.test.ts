import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { DEFAULT_CRITERIA, type ElementData } from '@/data/types'
import { concreteVolume, elementBom, SHEET_AREA, summarize, toCsv } from './bom'

const make = (t: ElementData['type']) => {
  const el = newElement(t, DEFAULT_CRITERIA, [])
  const run = runDesign(el, DEFAULT_CRITERIA)
  return { el, run, ...elementBom(el, run) }
}

describe('element BOM from the model', () => {
  it('wall: one stud line with every stud, plywood pieces cover both faces, ties counted', () => {
    const { el, run, lines } = make('wall')
    if (el.type !== 'wall' || run.type !== 'wall') throw new Error()
    const studs = lines.filter((l) => l.group === 'stud')
    expect(studs).toHaveLength(1)
    expect(studs[0].qty).toBe(2 * run.design.layout.studX.length)
    expect(studs[0].lengthM).toBeCloseTo(el.input.height, 2)
    const ply = lines.filter((l) => l.category === 'plywood').reduce((a, l) => a + l.areaM2! * l.qty, 0)
    expect(ply).toBeCloseTo(2 * el.input.length * el.input.height, 0)
    expect(lines.find((l) => l.category === 'tie')!.qty).toBe(run.design.layout.waleLevels.length * run.design.layout.tieX.length)
  })
  it('timber volume in ลบ.ฟ. = b"×h"×L(ft)/144', () => {
    const { lines } = make('wall')
    const s = lines.find((l) => l.group === 'stud')!
    expect(s.volumeFt3).toBeCloseTo((1.5 * 3 * s.lengthM! * 3.2808 * s.qty) / 144, 6)
  })
  it('marks run 1…n in group order (sheathing first)', () => {
    const { lines } = make('slab')
    expect(lines.map((l) => l.mark)).toEqual(lines.map((_, i) => i + 1))
    expect(lines[0].group).toBe('sheathing')
  })
  it('slab: shores and base plates match the shore count; steel pipe shores carry a weight', () => {
    const { run, lines } = make('slab')
    if (run.type !== 'slab') throw new Error()
    const shore = lines.find((l) => l.group === 'shore' && l.category === 'shore')!
    expect(shore.qty).toBe(run.design.quantities.shores)
    expect(shore.weightKg).toBeGreaterThan(0)
    expect(lines.find((l) => l.description.startsWith('แป้นรองฐาน'))!.qty).toBe(run.design.quantities.shores)
    expect(lines.find((l) => l.description.startsWith('แจ็คเบส'))!.qty).toBe(run.design.quantities.shores)
    expect(lines.find((l) => l.description.includes('ก้ามปู'))!.qty).toBe(run.design.quantities.shores)
  })
  it('every part except concrete is in exactly one line', () => {
    for (const t of ['wall', 'column', 'slab', 'beam', 'footing'] as const) {
      const { model, lines } = make(t)
      const ids = lines.flatMap((l) => l.partIds)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.length).toBe(model.parts.filter((p) => p.group !== 'concrete').length)
    }
  })
})

describe('project summary and CSV', () => {
  it('multiplies by element quantity and converts plywood area to sheets', () => {
    const w = make('wall')
    const s = summarize([{ lines: w.lines, qty: 3, concreteM3: concreteVolume(w.model) }])
    const area = w.lines.filter((l) => l.areaM2).reduce((a, l) => a + l.areaM2! * l.qty, 0) * 3
    expect(s.plywood[0].area).toBeCloseTo(area, 6)
    expect(s.plywood[0].sheets).toBe(Math.ceil(area / SHEET_AREA))
    expect(s.concreteM3).toBeCloseTo(0.25 * 2.5 * 6 * 3, 6)
  })
  it('CSV starts with a UTF-8 BOM and quotes commas', () => {
    expect(toCsv([['a,b', 1]])).toBe('﻿"a,b",1')
  })
})
