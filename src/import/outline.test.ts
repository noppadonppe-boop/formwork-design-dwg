// Recognising special sections from closed outlines in a plan drawing.
import { describe, expect, it } from 'vitest'
import type { Pt } from './dxfRead'
import { fitOutline } from './outline'

const turn = (pts: Pt[], deg: number, dx = 3, dy = -2): Pt[] => {
  const t = (deg * Math.PI) / 180
  return pts.map(([x, y]) => [dx + x * Math.cos(t) - y * Math.sin(t), dy + x * Math.sin(t) + y * Math.cos(t)])
}
const ngon = (n: number, F: number, rot = 0): Pt[] => {
  const R = F / (2 * Math.cos(Math.PI / n))
  return Array.from({ length: n }, (_, k) => [R * Math.cos(rot + (2 * Math.PI * k) / n), R * Math.sin(rot + (2 * Math.PI * k) / n)] as Pt)
}

describe('outline recognition', () => {
  it('an L at any rotation and either hand', () => {
    const L: Pt[] = [[0, 0], [0.8, 0], [0.8, 0.25], [0.3, 0.25], [0.3, 0.7], [0, 0.7]]
    for (const deg of [0, 30, 90, 215]) expect(fitOutline(turn(L, deg))?.plan).toEqual({ kind: 'L', a: 0.8, b: 0.7, ta: 0.25, tb: 0.3, yoke: 'tied' })
    // mirrored, clockwise, closing point repeated
    const M: Pt[] = [...L.map(([x, y]) => [-x, y] as Pt), [-0, 0]]
    expect(fitOutline(M)?.plan).toMatchObject({ kind: 'L', ta: 0.25, tb: 0.3 })
  })

  it('a T with its flange on any side', () => {
    const T: Pt[] = [[0, 0], [0.9, 0], [0.9, 0.25], [0.575, 0.25], [0.575, 0.8], [0.325, 0.8], [0.325, 0.25], [0, 0.25]]
    for (const deg of [0, 90, 180, 45]) expect(fitOutline(turn(T, deg))?.plan).toEqual({ kind: 'T', bf: 0.9, tf: 0.25, tw: 0.25, d: 0.8, yoke: 'tied' })
  })

  it('a U open on any side', () => {
    const U: Pt[] = [[0, 0], [1, 0], [1, 0.8], [0.75, 0.8], [0.75, 0.25], [0.25, 0.25], [0.25, 0.8], [0, 0.8]]
    for (const deg of [0, 90, 270, 20]) expect(fitOutline(turn(U, deg))?.plan).toEqual({ kind: 'U', b: 1, d: 0.8, t: 0.25, tb: 0.25, yoke: 'tied' })
  })

  it('regular hexagons and octagons, with points along their sides ignored', () => {
    expect(fitOutline(ngon(6, 0.6, 0.3))).toEqual({ plan: { kind: 'polygon', n: 6 }, f: 0.6 })
    const oct = ngon(8, 4.5)
    const withMid = oct.flatMap((p, k) => [p, [(p[0] + oct[(k + 1) % 8][0]) / 2, (p[1] + oct[(k + 1) % 8][1]) / 2] as Pt])
    expect(fitOutline(withMid)).toEqual({ plan: { kind: 'polygon', n: 8 }, f: 4.5 })
  })

  it('leaves other outlines alone', () => {
    // Z shape (two corners on a diagonal), off-centre T, unequal U legs, irregular hexagon
    expect(fitOutline([[0, 0], [0.6, 0], [0.6, 0.2], [0.4, 0.2], [0.4, 0.6], [1, 0.6], [1, 0.8], [0.2, 0.8], [0.2, 0.2], [0, 0.2]] as Pt[])).toBeUndefined()
    expect(fitOutline([[0, 0], [0.9, 0], [0.9, 0.25], [0.7, 0.25], [0.7, 0.8], [0.45, 0.8], [0.45, 0.25], [0, 0.25]] as Pt[])).toBeUndefined()
    expect(fitOutline([[0, 0], [1, 0], [1, 0.8], [0.6, 0.8], [0.6, 0.25], [0.25, 0.25], [0.25, 0.8], [0, 0.8]] as Pt[])).toBeUndefined()
    expect(fitOutline([[0, 0], [1, 0], [1.3, 0.4], [1, 0.8], [0, 0.8], [-0.2, 0.4]] as Pt[])).toBeUndefined()
  })
})
