import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { DEFAULT_CRITERIA } from '@/data/types'
import { dxfText, toDxf } from './dxf'
import { elementViews } from './views'

describe('DXF export', () => {
  const el = newElement('wall', DEFAULT_CRITERIA, [])
  const v = elementViews(el, runDesign(el, DEFAULT_CRITERIA))
  const dxf = toDxf([v.a, v.b], ['Project'])
  const pairs = dxf.trim().split('\r\n')
  it('is a well-formed R12 file with sections and EOF', () => {
    expect(pairs.length % 2).toBe(0)
    expect(pairs.slice(0, 4)).toEqual(['0', 'SECTION', '2', 'HEADER'])
    expect(pairs.slice(-2)).toEqual(['0', 'EOF'])
    expect(dxf).toContain('FW-STUD')
  })
  it('draws the wall at full size in mm (L = 6 m → 6000)', () => {
    const xs: number[] = []
    for (let i = 0; i < pairs.length - 1; i += 2) if (pairs[i] === '10' || pairs[i] === '11') xs.push(Number(pairs[i + 1]))
    expect(Math.max(...xs)).toBeGreaterThan(6000)
  })
  it('adds numbered marks, the BOM table and the title block', () => {
    const marks = [{ mark: 1, partIds: v.a.model.parts.filter((p) => p.group === 'stud').map((p) => p.id) }]
    const out = toDxf([v.a, v.b], [], { marks, table: [['Mark', 'Item'], ['1', 'Stud']], titleBlock: [['Project', 'X']] })
    expect(out).toContain('CIRCLE')
    expect(out).toContain('FW-MARK')
    expect(out).toContain('FW-TABLE')
    expect(out).toContain('Stud')
  })
  it('escapes Thai text as \\U+XXXX', () => expect(dxfText('ก A')).toBe('\\U+0E01 A'))
})
