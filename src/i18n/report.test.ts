// The calculation report must come out with no Thai left in English or Chinese: run every element type in
// many variants, gather every string the engine and the report sources produce, and translate them all.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as Elements from '@/data/elements'
import * as Types from '@/data/types'
import * as Engine from '@/engine'
import * as FM from '@/model/formModel'
import { translate } from './report'

type Patch = (i: any) => any // eslint-disable-line @typescript-eslint/no-explicit-any

const VARIANTS: [Types.ElementType, Patch][] = [
  ['wall', (i) => i],
  ['wall', (i) => ({ ...i, height: 4.5 })],
  ...(['ACI347', 'CIRA', 'HYDROSTATIC'] as const).map((m): [Types.ElementType, Patch] => ['wall', (i) => ({ ...i, pressure: { ...i.pressure, method: m } })]),
  ['wall', (i) => ({ ...i, thickness: 0.6, height: 6 })],
  ['wall', (i) => ({ ...i, system: 'horizontal', length: 6 })],
  ['wall', (i) => ({ ...i, system: 'horizontal', graded: true })],
  ['column', (i) => i],
  ['column', (i) => ({ ...i, tie: { ...i.tie, enabled: false } })],
  ['column', (i) => ({ ...i, b: 0.9, h: 1.2, tie: { ...i.tie, enabled: true, spans: 3, shortSpans: 2 } })],
  ['column', (i) => ({ ...i, sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 } })],
  ['column', (i) => ({ ...i, height: 6, b: 0.8, h: 1.2 })],
  ...([['stave', 'board'], ['stave', 'plywood'], ['steel', 'board'], ['tube', 'board']] as const).map(([sys, sh]): [Types.ElementType, Patch] => ['column', (i) => ({ ...i, b: 0.5, h: 0.5, shape: { kind: 'circle', system: sys }, sheathing: sh === 'board' ? { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 } : i.sheathing })]),
  ...([6, 8] as const).flatMap((n) => (['box', 'ring'] as const).map((y): [Types.ElementType, Patch] => ['column', (i) => ({ ...i, b: 0.6, h: 0.6, shape: { kind: 'polygon', n, yoke: y } })])),
  ['column', (i) => ({ ...i, b: 0.6, h: 0.6, shape: { kind: 'polygon', n: 8, yoke: 'box' }, sheathing: { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 } })],
  ...(['tied', 'box'] as const).flatMap((y): [Types.ElementType, Patch][] => [
    ['column', (i) => ({ ...i, shape: { kind: 'L', a: 0.8, b: 0.8, ta: 0.25, tb: 0.25, yoke: y }, tie: { ...i.tie, enabled: true, spans: 2 } })],
    ['column', (i) => ({ ...i, shape: { kind: 'T', bf: 0.9, tf: 0.25, tw: 0.25, d: 0.8, yoke: y }, tie: { ...i.tie, spans: 1 } })],
    ['column', (i) => ({ ...i, shape: { kind: 'U', b: 0.8, d: 0.8, t: 0.25, tb: 0.25, yoke: y }, tie: { ...i.tie, spans: 1 } })],
  ]),
  ['slab', (i) => i],
  ['slab', (i) => ({ ...i, shore: { ...i.shore, kind: 'rated' } })],
  ['slab', (i) => ({ ...i, shore: { ...i.shore, kind: 'ringlock', ringlock: Engine.DEFAULT_RINGLOCK } })],
  ['slab', (i) => ({ ...i, clearHeight: 0.6, shore: { ...i.shore, kind: 'ringlock', ringlock: { system: 'eu48', liftM: 2, swl: 2000 }, spacingCm: 100 }, stringer: { ...i.stringer, spacingCm: 95 } })],
  ['beam', (i) => ({ ...i, shore: { ...i.shore, kind: 'ringlock', ringlock: Engine.DEFAULT_RINGLOCK, layout: 'double', postSpacingM: 0.7 }, head: { ...i.head, spacingCm: 100 } })],
  ['beam', (i) => ({ ...i, length: 12, h: 1.2, clearHeight: 4, shore: { ...i.shore, kind: 'ringlock', ringlock: { system: 'asia60', liftM: 1 } } })],
  ['beam', (i) => ({ ...i, clearHeight: 4.5, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true }, shore: { ...i.shore, kind: 'ringlock', ringlock: Engine.DEFAULT_RINGLOCK, postSpacingM: 0.8 } })],
  ['beam', (i) => ({ ...i, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true, spacingCm: 100 }, shore: { ...i.shore, kind: 'ringlock', ringlock: Engine.DEFAULT_RINGLOCK, postSpacingM: 0.9 } })],
  ['slab', (i) => ({ ...i, shore: { ...i.shore, sectionId: 'timber-3x3', materialId: 'timber-yang', braceLevels: 1 } })],
  ['slab', (i) => ({ ...i, bracing: { ...i.bracing, enabled: false }, thickness: 0.3, clearHeight: 5 })],
  ['beam', (i) => i],
  ['beam', (i) => ({ ...i, type: 'isolated' })],
  ['beam', (i) => ({ ...i, type: 'spandrel' })],
  ['beam', (i) => ({ ...i, tie: { ...i.tie, enabled: true }, h: 1.2 })],
  ['beam', (i) => ({ ...i, bottom: { ...i.bottom, count: 0 } })],
  ['beam', (i) => ({ ...i, shore: { ...i.shore, layout: 'double' } })],
  ['beam', (i) => ({ ...i, bracing: { ...i.bracing, enabled: false }, clearHeight: 4.5 })],
  ['beam', (i) => ({ ...i, b: 1.0, h: 0.8, bottomDir: 'across' })],
  ['beam', (i) => ({ ...i, b: 1.2, h: 1.0, bottomDir: 'across', crossJoist: { ...i.crossJoist, sectionId: 'timber-1.5x3' } })],
  ['beam', (i) => ({ ...i, b: 0.9, h: 0.9, sheathing: { ...i.sheathing, thicknessMm: 10 } })],
  ['beam', (i) => ({ ...i, b: 0.4, bottom: { ...i.bottom, auto: false, count: 9 } })],
  ['beam', (i) => ({ ...i, length: 12, h: 1.2, clearHeight: 4, shore: { ...i.shore, sectionId: 'timber-1.5x3', materialId: i.stud.materialId } })],
  ['beam', (i) => ({ ...i, h: 1.5, b: 0.6, shore: { ...i.shore, sectionId: 'timber-1.5x3', materialId: i.stud.materialId, lengthM: 6 } })],
  ['beam', (i) => ({ ...i, clearHeight: 4.5, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true }, shore: { ...i.shore, sectionId: Engine.BS_TUBE, postSpacingM: 0.9 } })],
  ['beam', (i) => ({ ...i, b: 1.2, h: 1.0, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true, rows: 3, count: 2 }, shore: { ...i.shore, postSpacingM: 1.5 } })],
  ['beam', (i) => ({ ...i, b: 1.1, clearHeight: 5, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true }, shore: { ...i.shore, kind: 'rated', postSpacingM: 0.5 }, bracing: { ...i.bracing, enabled: false } })],
  ['beam', (i) => ({ ...i, clearHeight: 3, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true }, shore: { ...i.shore, lengthM: 8, postSpacingM: 1 } })],
  ['beam', (i) => ({ ...i, h: 1.5, stringer: { ...Engine.DEFAULT_BEAM.stringer, enabled: true, spacingCm: 300 }, head: { ...i.head, sectionId: 'timber-1.5x3' }, shore: { ...i.shore, postSpacingM: 1.2 } })],
  ...(['cantilever', 'braced', 'tied'] as const).flatMap((s): [Types.ElementType, Patch][] => [
    ['footing', (i) => ({ ...i, support: s })],
    ['footing', (i) => ({ ...i, support: s, lengthX: 1.2, lengthY: 1.2, height: 0.6, soilBearing: 3000 })],
  ]),
  ['footing', (i) => ({ ...i, support: 'braced', brace: { ...i.brace, at: 'wale' } })],
  ['footing', (i) => ({ ...i, support: 'tied', wale: { ...i.wale, corner: 'butt' } })],
  ['footing', (i) => ({ ...i, support: 'tied', lengthX: 5, lengthY: 2, height: 2 })],
  ['footing', (i) => ({ ...i, support: 'tied', wale: { ...i.wale, shift: 'down', bottomOffsetM: 0.05 } })],
  ['footing', (i) => ({ ...i, support: 'tied', tie: { ...i.tie, layout: 'short' } })],
  ['footing', (i) => ({ ...i, support: 'tied', height: 5, lengthX: 10, lengthY: 8 })],
  ...(['cantilever', 'braced', 'tied'] as const).flatMap((sup): [Types.ElementType, Patch][] => [
    ['footing', (i) => ({ ...i, support: sup, lengthX: 4, lengthY: 4, shape: { kind: 'circle' } })],
    ['footing', (i) => ({ ...i, support: sup, lengthX: 3, lengthY: 3, shape: { kind: 'polygon', n: 8 } })],
    ['footing', (i) => ({ ...i, support: sup, lengthX: 4.5, lengthY: 4, shape: { kind: 'L', a: 4.5, b: 4, ta: 1.5, tb: 1.5, yoke: 'tied' } })],
    ['footing', (i) => ({ ...i, support: sup, lengthX: 5, lengthY: 4.2, shape: { kind: 'T', bf: 5, tf: 1.5, tw: 1.6, d: 4.2, yoke: 'tied' } })],
    ['footing', (i) => ({ ...i, support: sup, lengthX: 5.2, lengthY: 4, shape: { kind: 'U', b: 5.2, d: 4, t: 1.5, tb: 1.5, yoke: 'tied' } })],
  ]),
  ['footing', (i) => ({ ...i, support: 'braced', brace: { ...i.brace, at: 'wale' }, lengthX: 3, lengthY: 3, shape: { kind: 'polygon', n: 6 } })],
]

const SOURCES = [
  'src/report/CalcReport.tsx',
  'src/pages/ReportPage.tsx',
  'src/components/design/PressureDiagram.tsx',
  'src/report/Drawing.tsx',
  'src/report/views.ts',
  'src/data/elements.ts',
  ...['wall', 'column', 'planShape', 'slab', 'beam', 'footing', 'design', 'member', 'pressure', 'shoring', 'ringlock', 'loads', 'materials', 'sections', 'units', 'trace'].map((x) => `src/engine/${x}.ts`),
]

function collect(): Set<string> {
  const out = new Set<string>()
  const walk = (v: unknown, seen = new Set<unknown>()) => {
    if (typeof v === 'string') return void (/[฀-๿]/.test(v) && out.add(v))
    if (!v || typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    for (const x of Object.values(v as object)) walk(x, seen)
  }
  const c = Types.DEFAULT_CRITERIA
  for (const [t, f] of VARIANTS) {
    const el = Elements.newElement(t, c, [])
    el.input = f(el.input)
    walk(Elements.runDesign(el, c, { advise: true }))
    walk(el)
    walk(Elements.elementSize(el))
  }
  walk(Engine)
  walk(Elements)
  walk(Types)
  walk(FM)
  // literal text in the report and engine sources (template pieces, JSX text)
  for (const f of SOURCES)
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const s = line.trim()
      if (s && !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*')) walk(s)
    }
  return out
}

describe('calculation report translation', () => {
  const strings = [...collect()]
  it('collects the report text', () => expect(strings.length).toBeGreaterThan(500))
  for (const lang of ['en', 'zh'] as const)
    it(`${lang}: no Thai left`, () => {
      const left = strings.map((s) => [s, translate(s, lang)]).filter(([, t]) => /[฀-๿]/.test(t))
      expect(left.slice(0, 20)).toEqual([])
    })
  it('units become SI symbols and numbers pass through', () => {
    expect(translate('แรงดัน 2,400 กก./ม.² ที่ความลึก 1.20 ม.', 'en')).toBe('Pressure 2,400 kg/m² at depth 1.20 m')
    expect(translate('ระยะเคร่าที่ใช้ 40 ซม.', 'zh')).toBe('采用竖楞间距 40 cm')
    expect(translate('แบบหล่อฐานราก', 'en')).toBe('Footing formwork')
    expect(translate('แบบหล่อฐานราก', 'zh')).toBe('基础模板')
    expect(translate('แรงดึงในไทร์สูงสุด', 'en')).toBe('Tie tension max.') // unknown run: split into dictionary words
    expect(translate('ทดสอบ ABC', 'th')).toBe('ทดสอบ ABC')
  })
})
