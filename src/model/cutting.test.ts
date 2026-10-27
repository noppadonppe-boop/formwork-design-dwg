import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { DEFAULT_CRITERIA } from '@/data/types'
import { elementBom, SHEET_AREA } from './bom'
import { packSheets, plywoodPieces, SHEET_H, SHEET_W, splitPiece } from './cutting'

describe('plywood cutting plan', () => {
  it('splits pieces longer than a sheet', () => {
    const parts = splitPiece({ mark: 1, w: 0.7, h: 6 })
    expect(parts.map((p) => p.h)).toEqual([2.44, 2.44, expect.closeTo(1.12, 6)])
  })
  it('packs small strips together and never overlaps or leaves the sheet', () => {
    const sheets = packSheets([
      { mark: 1, w: 0.3, h: 2.0 },
      { mark: 1, w: 0.3, h: 2.0 },
      { mark: 2, w: 0.5, h: 1.0 },
      { mark: 2, w: 0.5, h: 1.0 },
    ])
    expect(sheets).toHaveLength(1)
    const ps = sheets[0].pieces
    for (const p of ps) {
      expect(p.x + p.w).toBeLessThanOrEqual(SHEET_W + 1e-6)
      expect(p.y + p.h).toBeLessThanOrEqual(SHEET_H + 1e-6)
    }
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i]
        const b = ps[j]
        const overlap = a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9
        expect(overlap).toBe(false)
      }
  })
  it('a wall needs at least its area in sheets and keeps full sheets whole', () => {
    const el = newElement('wall', DEFAULT_CRITERIA, [])
    const { model, lines } = elementBom(el, runDesign(el, DEFAULT_CRITERIA))
    const pieces = plywoodPieces(model, lines)
    const sheets = packSheets(pieces)
    const area = pieces.reduce((a, p) => a + p.w * p.h, 0)
    expect(sheets.length).toBeGreaterThanOrEqual(Math.ceil(area / SHEET_AREA - 1e-9))
    expect(sheets.filter((s) => s.full).length).toBe(8) // 6.0 × 2.5 m, both faces → 4 full sheets per face
  })
})
