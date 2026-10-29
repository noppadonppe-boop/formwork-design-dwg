import { describe, expect, it } from 'vitest'
import { newElement, runDesign } from '@/data/elements'
import { DEFAULT_CRITERIA, type ElementType } from '@/data/types'
import { costOf, DEFAULT_PRICES, evaluate, optimize, variants } from './optimize'

const opts = { prices: DEFAULT_PRICES, target: 1, allowSteel: false }

describe('optimizer', () => {
  for (const t of ['wall', 'column', 'slab', 'beam', 'footing'] as ElementType[])
    it(`${t}: every result passes, cheapest first, never dearer than the default design`, () => {
      const el = newElement(t, DEFAULT_CRITERIA, [])
      const t0 = performance.now()
      const { results, tried, passed } = optimize(el, DEFAULT_CRITERIA, opts)
      const ms = performance.now() - t0
      expect(tried).toBeGreaterThan(50)
      expect(passed).toBeGreaterThan(0)
      expect(results.length).toBeGreaterThan(0)
      for (const r of results) expect(runDesign(r.el, DEFAULT_CRITERIA).design.status).not.toBe('fail')
      expect(results.map((r) => r.cost)).toEqual([...results.map((r) => r.cost)].sort((a, b) => a - b))
      const current = evaluate(el, DEFAULT_CRITERIA, opts)
      if (current) expect(results[0].cost).toBeLessThanOrEqual(current.cost + 1e-6)
      expect(ms).toBeLessThan(30000)
    })

  it('respects a stricter target ratio', () => {
    const el = newElement('wall', DEFAULT_CRITERIA, [])
    const { results } = optimize(el, DEFAULT_CRITERIA, { ...opts, target: 0.8 })
    for (const r of results) expect(r.maxRatio).toBeLessThanOrEqual(0.8 + 1e-9)
  })

  it('steel options add variants', () => {
    const el = newElement('wall', DEFAULT_CRITERIA, [])
    expect(variants(el, { allowSteel: true }).length).toBeGreaterThan(variants(el, { allowSteel: false }).length)
  })

  it('walls: bothSystems also tries horizontal studs on vertical wales', () => {
    const w = newElement('wall', DEFAULT_CRITERIA, [])
    const one = variants(w, { allowSteel: false })
    const two = variants(w, { allowSteel: false, bothSystems: true })
    expect(two).toHaveLength(2 * one.length)
    expect(new Set(two.map((v) => (v.input as { system?: string }).system))).toEqual(new Set(['vertical', 'horizontal']))
    const { results } = optimize(w, DEFAULT_CRITERIA, { ...opts, bothSystems: true })
    expect(results.length).toBeGreaterThan(0)
  })

  it('cost grows with the plywood price', () => {
    const el = newElement('wall', DEFAULT_CRITERIA, [])
    const run = runDesign(el, DEFAULT_CRITERIA)
    const a = costOf(el, run, DEFAULT_PRICES).cost
    const b = costOf(el, run, { ...DEFAULT_PRICES, plywood: { ...DEFAULT_PRICES.plywood, 18: 1000 } }).cost
    expect(b).toBeGreaterThan(a)
  })
})
