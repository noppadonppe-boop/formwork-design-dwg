// Recognise a closed outline from a plan drawing as one of the special sections: a regular hexagon or octagon, or an
// L / T / U drawn with square corners at any rotation. Sizes in metres, read off the outline itself; the shapes are
// symmetric enough that their orientation and handedness do not matter to the design.
import type { LegShape } from '@/engine'
import type { Pt } from './dxfRead'

/** Plan of an imported element other than a rectangle; a polygon's F and a circle's D stay in the element's sizes. */
export type ImportPlan = { kind: 'circle' } | { kind: 'polygon'; n: 6 | 8 } | LegShape

const deg = Math.PI / 180

/** Outline without the closing point, repeated points and points along a straight side. */
function clean(raw: Pt[]): Pt[] {
  let p = raw.filter((q, i) => i === 0 || Math.hypot(q[0] - raw[i - 1][0], q[1] - raw[i - 1][1]) > 1e-4)
  if (p.length > 1 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-4) p = p.slice(0, -1)
  let changed = true
  while (changed && p.length > 3) {
    changed = false
    for (let i = 0; i < p.length; i++) {
      const a = p[(i - 1 + p.length) % p.length]
      const b = p[i]
      const c = p[(i + 1) % p.length]
      const u: Pt = [b[0] - a[0], b[1] - a[1]]
      const v: Pt = [c[0] - b[0], c[1] - b[1]]
      if (Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])) < 1 * deg) {
        p = p.filter((_, k) => k !== i)
        changed = true
        break
      }
    }
  }
  return p
}

/** Signed turn at every corner (radians) and the side lengths; turns of a counter-clockwise outline are positive. */
function turns(p: Pt[]): { turn: number[]; side: number[]; ccw: boolean } {
  const n = p.length
  const area2 = p.reduce((s, a, k) => s + a[0] * p[(k + 1) % n][1] - p[(k + 1) % n][0] * a[1], 0)
  const side = p.map((a, k) => Math.hypot(p[(k + 1) % n][0] - a[0], p[(k + 1) % n][1] - a[1]))
  const turn = p.map((b, k) => {
    const a = p[(k - 1 + n) % n]
    const c = p[(k + 1) % n]
    const u: Pt = [b[0] - a[0], b[1] - a[1]]
    const v: Pt = [c[0] - b[0], c[1] - b[1]]
    return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])
  })
  return { turn, side, ccw: area2 > 0 }
}

const r3 = (v: number) => Math.round(v * 1000) / 1000

/** The special section a closed outline draws, with a polygon's F (m); undefined for anything else. */
export function fitOutline(raw: Pt[]): { plan: Exclude<ImportPlan, { kind: 'circle' }>; f?: number } | undefined {
  const p = clean(raw)
  const n = p.length
  if (n < 5) return undefined
  const { turn, side, ccw } = turns(p)
  const mean = side.reduce((a, b) => a + b, 0) / n

  // regular hexagon / octagon: equal sides and equal turns of 360°/n
  if ((n === 6 || n === 8) && side.every((s) => Math.abs(s - mean) < 0.03 * mean) && turn.every((t) => Math.abs(Math.abs(t) - (2 * Math.PI) / n) < 2 * deg))
    return { plan: { kind: 'polygon', n }, f: r3(mean / Math.tan(Math.PI / n)) }

  // square corners only: turn the outline so its first side runs along x, then read the steps
  if (!turn.every((t) => Math.abs(Math.abs(t) - Math.PI / 2) < 2 * deg)) return undefined
  const th = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0])
  const q = p.map(([x, y]) => [r3(x * Math.cos(th) + y * Math.sin(th)), r3(-x * Math.sin(th) + y * Math.cos(th))] as Pt)
  const xs = q.map((v) => v[0])
  const ys = q.map((v) => v[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const W = r3(x1 - x0)
  const D = r3(y1 - y0)
  const near = (a: number, b: number) => Math.abs(a - b) < 2e-3
  const reent = q.filter((_, k) => (turn[k] > 0) !== ccw)
  const corners = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ].filter(([cx, cy]) => q.some((v) => near(v[0], cx) && near(v[1], cy)))

  if (n === 6 && reent.length === 1) {
    // L: the box corner missing from the outline is the notch; the legs run along the far sides
    const notch = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ].find(([cx, cy]) => !q.some((v) => near(v[0], cx) && near(v[1], cy)))
    if (!notch) return undefined
    const [r] = reent
    const ta = r3(Math.abs(r[1] - (near(notch[1], y1) ? y0 : y1)))
    const tb = r3(Math.abs(r[0] - (near(notch[0], x1) ? x0 : x1)))
    if (ta <= 0 || tb <= 0) return undefined
    return { plan: { kind: 'L', a: W, b: D, ta, tb, yoke: 'tied' } }
  }

  if (n === 8 && reent.length === 2) {
    const [r1, r2] = reent
    if (corners.length === 4) {
      // U: the open side carries four vertices; legs equal within 10 %
      const onBottom = q.filter((v) => near(v[1], y0)).length === 4
      const onTop = q.filter((v) => near(v[1], y1)).length === 4
      const onLeft = q.filter((v) => near(v[0], x0)).length === 4
      const onRight = q.filter((v) => near(v[0], x1)).length === 4
      const horizontal = onBottom || onTop
      if (!horizontal && !onLeft && !onRight) return undefined
      const [b, d] = horizontal ? [W, D] : [D, W]
      const open = horizontal ? (onBottom ? y0 : y1) : onLeft ? x0 : x1
      const along = (v: Pt) => (horizontal ? v[0] : v[1])
      const across = (v: Pt) => (horizontal ? v[1] : v[0])
      const lo = horizontal ? x0 : y0
      const hi = horizontal ? x1 : y1
      const [ta, tb2] = [Math.min(along(r1), along(r2)) - lo, hi - Math.max(along(r1), along(r2))]
      if (Math.abs(ta - tb2) > 0.1 * Math.max(ta, tb2)) return undefined
      const depth = Math.abs(across(r1) - open)
      return { plan: { kind: 'U', b, d, t: r3((ta + tb2) / 2), tb: r3(d - depth), yoke: 'tied' } }
    }
    if (corners.length === 2) {
      // T: the two corners present share the flange side; the web is centred within 5 % of the flange
      const [c1, c2] = corners
      const horizontal = near(c1[1], c2[1])
      if (!horizontal && !near(c1[0], c2[0])) return undefined
      const [bf, d] = horizontal ? [W, D] : [D, W]
      const flange = horizontal ? c1[1] : c1[0]
      const along = (v: Pt) => (horizontal ? v[0] : v[1])
      const across = (v: Pt) => (horizontal ? v[1] : v[0])
      const lo = horizontal ? x0 : y0
      const hi = horizontal ? x1 : y1
      const wl = Math.min(along(r1), along(r2)) - lo
      const wr = hi - Math.max(along(r1), along(r2))
      if (Math.abs(wl - wr) > 0.05 * bf) return undefined
      return { plan: { kind: 'T', bf, tf: r3(Math.abs(across(r1) - flange)), tw: r3(Math.abs(along(r1) - along(r2))), d, yoke: 'tied' } }
    }
  }
  return undefined
}
