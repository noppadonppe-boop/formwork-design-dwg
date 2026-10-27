import { describe, expect, it } from 'vitest'
import { type AiSchedule, scheduleToCandidates } from './ai'
import { DEFAULT_DETECT } from './detect'

const base = { code: '', count: 1, b_cm: null, h_cm: null, length_m: null, plan_x_m: null, plan_y_m: null, depth_m: null, level: '', evidence: 'schedule' }

describe('AI schedule → candidates', () => {
  const s: AiSchedule = {
    drawing_title: 'Column schedule',
    storey_height_m: 3.5,
    slab_thickness_cm: 15,
    warnings: [],
    elements: [
      { ...base, type: 'column', code: 'C1', count: 8, b_cm: 40, h_cm: 60 },
      { ...base, type: 'column', code: 'c-1', count: 4, b_cm: 40, h_cm: 60 },
      { ...base, type: 'beam', code: 'B2', count: 3, b_cm: 30, h_cm: 70, length_m: 7.2 },
      { ...base, type: 'footing', code: 'F1', count: 6, plan_x_m: 2.4 },
    ],
  }
  const c = scheduleToCandidates(s, DEFAULT_DETECT)
  it('normalises codes and merges identical rows', () => {
    const c1 = c.find((x) => x.code === 'C1')!
    expect(c1.qty).toBe(12)
    expect(c1.dims).toMatchObject({ b: 0.4, h: 0.6, height: 3.35 })
  })
  it('uses the storey height for the beam soffit', () => expect(c.find((x) => x.code === 'B2')!.dims).toMatchObject({ b: 0.3, depth: 0.7, length: 7.2, height: 2.8 }))
  it('flags missing sizes and falls back to defaults', () => {
    const f = c.find((x) => x.code === 'F1')!
    expect(f.dims).toMatchObject({ lengthX: 2.4, lengthY: 2.4, height: DEFAULT_DETECT.footingH })
    expect(f.note).toContain('ไม่พบ')
  })
})
