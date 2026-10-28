import { describe, expect, it } from 'vitest'
import { DEFAULT_CRITERIA } from '@/data/types'
import { candidateToElement, DEFAULT_DETECT, detect, dimsText, guessRole, parseLabel } from './detect'
import { cleanText, readDxf } from './dxfRead'

// tiny R12-style plan in millimetres
const P = (...pairs: (string | number)[]) => pairs.join('\n')
const rect = (layer: string, x: number, y: number, w: number, h: number) =>
  P(0, 'LWPOLYLINE', 8, layer, 90, 4, 70, 1, 10, x, 20, y, 10, x + w, 20, y, 10, x + w, 20, y + h, 10, x, 20, y + h)
const line = (layer: string, x1: number, y1: number, x2: number, y2: number) => P(0, 'LINE', 8, layer, 10, x1, 20, y1, 11, x2, 21, y2)
const text = (layer: string, x: number, y: number, t: string) => P(0, 'TEXT', 8, layer, 10, x, 20, y, 40, 200, 1, t)
const dxf = [
  P(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC'),
  P(0, 'SECTION', 2, 'BLOCKS', 0, 'BLOCK', 2, 'COL40', 70, 0, 10, 0, 20, 0), rect('0', -200, -200, 400, 400), P(0, 'ENDBLK', 0, 'ENDSEC'),
  P(0, 'SECTION', 2, 'ENTITIES'),
  rect('S-COLUMN', 0, 0, 400, 400), text('TEXT', 500, 0, 'C1'),
  rect('S-COLUMN', 6000, 0, 400, 400), text('TEXT', 6500, 0, 'C1'),
  P(0, 'INSERT', 8, 'S-COLUMN', 2, 'COL40', 10, 12200, 20, 200),
  // 4-line footing 2.4 × 2.4 m
  line('FOOTING', 20000, 0, 22400, 0), line('FOOTING', 22400, 0, 22400, 2400), line('FOOTING', 22400, 2400, 20000, 2400), line('FOOTING', 20000, 2400, 20000, 0),
  rect('WALL', 0, 5000, 5000, 200),
  text('TEXT', 3000, 3000, 'B1 30x60'), text('TEXT', 9000, 3000, 'B1 30x60'),
  P(0, 'ENDSEC', 0, 'EOF'),
].join('\n')

describe('DXF reading', () => {
  const d = readDxf(dxf)
  it('reads $INSUNITS = mm and converts to metres', () => {
    expect(d.unitsLabel).toBe('มม.')
    expect(d.bounds.max[0]).toBeCloseTo(22.4, 6)
  })
  it('expands block inserts onto the insert layer', () => expect(d.entities.filter((e) => e.kind === 'poly' && e.layer === 'S-COLUMN')).toHaveLength(3))
  it('cleans unicode escapes and MTEXT codes', () => expect(cleanText('\\U+0E40\\U+0E2A\\U+0E32 {\\fArial;C1}')).toBe('เสา C1'))
})

describe('element detection', () => {
  const d = readDxf(dxf)
  const { candidates } = detect(d, {}, DEFAULT_DETECT)
  const by = (t: string) => candidates.filter((c) => c.type === t)
  it('guesses roles from layer names', () => {
    expect(guessRole('S-COLUMN')).toBe('column')
    expect(guessRole('A-DIM')).toBe('ignore')
    expect(guessRole('ฐานราก')).toBe('footing')
  })
  it('groups identical columns and keeps the label code', () => {
    const cols = by('column')
    const c1 = cols.find((c) => c.code === 'C1')!
    expect(c1.qty).toBe(2)
    expect(c1.dims.b).toBe(0.4)
    expect(cols.reduce((a, c) => a + c.qty, 0)).toBe(3) // the unlabelled block insert gets its own group
  })
  it('finds a footing drawn with four lines, a wall, and beams from their labels', () => {
    expect(by('footing')[0].dims).toMatchObject({ lengthX: 2.4, lengthY: 2.4 })
    expect(by('wall')[0].dims).toMatchObject({ thickness: 0.2, length: 5 })
    expect(by('beam')[0]).toMatchObject({ code: 'B1', qty: 2, dims: { b: 0.3, depth: 0.6 } })
  })
  it('measures a labelled beam from the nearest beam line', () => {
    const plan = [P(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES'), line('S-BEAM', 0, 3000, 5600, 3000), text('TEXT', 2500, 3200, 'B1 30x60'), P(0, 'ENDSEC', 0, 'EOF')].join('\n')
    const b = detect(readDxf(plan), {}, DEFAULT_DETECT).candidates.filter((c) => c.type === 'beam')
    expect(b.some((c) => c.dims.length === 5.6)).toBe(true)
  })
  it('parses labels in cm or m', () => {
    expect(parseLabel('C-12A 40x60')).toMatchObject({ code: 'C12A', b: 0.4, h: 0.6 })
    expect(parseLabel('F3 2.40×1.80')).toMatchObject({ code: 'F3', b: 2.4, h: 1.8 })
  })
  it('converts candidates to elements with the detected sizes', () => {
    const el = candidateToElement(by('column')[0], DEFAULT_CRITERIA, [])
    expect(el.type).toBe('column')
    if (el.type === 'column') expect(el.input).toMatchObject({ b: 0.4, h: 0.4 })
    expect(el.qty).toBe(by('column')[0].qty)
  })
})

describe('special outlines in a plan', () => {
  const poly = (layer: string, pts: [number, number][]) => P(0, 'LWPOLYLINE', 8, layer, 90, pts.length, 70, 1, ...pts.flatMap(([x, y]) => [10, x, 20, y]))
  const oct = (cx: number, cy: number, F: number): [number, number][] => {
    const R = F / (2 * Math.cos(Math.PI / 8))
    return Array.from({ length: 8 }, (_, k) => [cx + R * Math.cos(Math.PI / 8 + (k * Math.PI) / 4), cy + R * Math.sin(Math.PI / 8 + (k * Math.PI) / 4)])
  }
  const plan = [
    P(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES'),
    // L column 80 × 70, legs 25 / 30, twice; a T column; an octagonal footing F 4.5 m; a round footing D 4 m
    poly('S-COLUMN', [[0, 0], [800, 0], [800, 250], [300, 250], [300, 700], [0, 700]]),
    poly('S-COLUMN', [[5000, 0], [5800, 0], [5800, 250], [5300, 250], [5300, 700], [5000, 700]]),
    poly('S-COLUMN', [[9000, 0], [9900, 0], [9900, 250], [9575, 250], [9575, 800], [9325, 800], [9325, 250], [9000, 250]]),
    poly('FOUNDATION', oct(20000, 20000, 4500)),
    P(0, 'CIRCLE', 8, 'FOUNDATION', 10, 30000, 20, 20000, 40, 2000),
    P(0, 'ENDSEC', 0, 'EOF'),
  ].join('\n')
  const { candidates } = detect(readDxf(plan), {}, DEFAULT_DETECT)

  it('recognises L and T columns, grouping identical ones', () => {
    const L = candidates.find((c) => c.plan?.kind === 'L')!
    expect(L).toMatchObject({ type: 'column', qty: 2, plan: { a: 0.8, b: 0.7, ta: 0.25, tb: 0.3 } })
    expect(candidates.find((c) => c.plan?.kind === 'T')).toMatchObject({ type: 'column', qty: 1 })
  })

  it('takes large polygons and circles as footings, with F or D as their size', () => {
    const o = candidates.find((c) => c.plan?.kind === 'polygon')!
    expect(o).toMatchObject({ type: 'footing', dims: { lengthX: 4.5, lengthY: 4.5 } })
    const r = candidates.find((c) => c.plan?.kind === 'circle')!
    expect(r).toMatchObject({ type: 'footing', dims: { lengthX: 4, lengthY: 4 } })
  })

  it('creates elements with the shape', () => {
    const L = candidateToElement(candidates.find((c) => c.plan?.kind === 'L')!, DEFAULT_CRITERIA, [])
    if (L.type !== 'column') throw new Error()
    expect(L.input.shape).toMatchObject({ kind: 'L', a: 0.8, ta: 0.25 })
    expect(L.input).toMatchObject({ b: 0.8, h: 0.7 })
    const r = candidateToElement(candidates.find((c) => c.plan?.kind === 'circle')!, DEFAULT_CRITERIA, [])
    if (r.type !== 'footing') throw new Error()
    expect(r.input.shape).toEqual({ kind: 'circle' })
    expect(r.input.support).not.toBe('tied')
    expect(dimsText(candidates.find((c) => c.plan?.kind === 'polygon')!)).toContain('แปดเหลี่ยม F 4.50 ม.')
  })
})
