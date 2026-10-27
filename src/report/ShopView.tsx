// A drawing view for the shop drawing sheet, in paper millimetres: orthographic views at a standard scale
// (1:5 … 1:500) or an isometric view, with dimension chains and numbered callout tags tied to the BOM marks.
import type { FormModel, Part, Vec3 } from '@/model/formModel'
import { corners, type Dim, FILL, type OrthoView, PROJ, STROKE } from './Drawing'

export type ShopViewKind = OrthoView | 'iso'
export const SCALES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500] as const

const R2 = Math.SQRT2
const R6 = Math.sqrt(6)
const R3 = Math.sqrt(3)
/** viewer at (+x, +y, +z): u right, v up, depth towards the viewer */
const iso = ([x, y, z]: Vec3): [number, number, number] => [(x - z) / R2, (-x + 2 * y - z) / R6, (x + y + z) / R3]

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (k: number) => Math.round(((n >> k) & 255) * f)
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

function boxCorners(p: Part & { shape: 'box' }): Vec3[] {
  const [cx, cy, cz] = p.center
  const [sx, sy, sz] = p.size.map((s) => s / 2)
  const out: Vec3[] = []
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) out.push([cx + dx * sx, cy + dy * sy, cz + dz * sz])
  return out
}

export interface Tag {
  mark: number
  partIds: string[]
}

/** Standard scale denominator that fits `extent` (m) into `room` (mm); undefined when even 1:500 is too large. */
export function pickScale(extentU: number, extentV: number, roomU: number, roomV: number): number | undefined {
  return SCALES.find((d) => (extentU * 1000) / d <= roomU && (extentV * 1000) / d <= roomV)
}

/** Margin round every view, mm (dimension text sits inside it). */
export const VIEW_PAD = 7

/** World-space bounding box of a part, m. */
function aabb(p: Part): [Vec3, Vec3] {
  if (p.shape === 'box') return [p.center.map((c, k) => c - p.size[k] / 2) as Vec3, p.center.map((c, k) => c + p.size[k] / 2) as Vec3]
  const r = Math.max(p.b, p.d) / 2
  return [[0, 1, 2].map((k) => Math.min(p.from[k], p.to[k]) - r) as Vec3, [0, 1, 2].map((k) => Math.max(p.from[k], p.to[k]) + r) as Vec3]
}

type Item = { p: Part; pts: [number, number, number][]; depth: number }
type Pt = [number, number]

/** Convex hull (monotone chain), counter-clockwise. */
function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Pt[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: Pt[] = []
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

const polyArea = (q: Pt[]) => Math.abs(q.reduce((s, a, i) => s + a[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * a[1], 0)) / 2

/** Area common to two convex polygons (Sutherland–Hodgman). */
function overlapArea(subject: Pt[], clip: Pt[]): number {
  let out = subject
  for (let i = 0; i < clip.length && out.length; i++) {
    const [a, b] = [clip[i], clip[(i + 1) % clip.length]]
    const side = (q: Pt) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])
    const inp = out
    out = []
    for (let j = 0; j < inp.length; j++) {
      const [c, d] = [inp[j], inp[(j + 1) % inp.length]]
      const [sc, sd] = [side(c), side(d)]
      if (sc >= 0) out.push(c)
      if (sc >= 0 !== sd >= 0) {
        const t = sc / (sc - sd)
        out.push([c[0] + t * (d[0] - c[0]), c[1] + t * (d[1] - c[1])])
      }
    }
  }
  return out.length >= 3 ? polyArea(out) : 0
}

/**
 * Painter's order for the isometric (viewer at +x, +y, +z). Sorting by centre depth fails for large panels —
 * a long plywood face would cover the studs and wales in front of it — so parts whose drawings overlap are
 * ordered by a separating axis: a box entirely on the low side of another along x, y or z is farther away.
 * Parts that interpenetrate (ties through the wales) fall back to centre depth.
 */
function isoOrder(items: Item[]): Item[] {
  const n = items.length
  const box = items.map((it) => aabb(it.p))
  // outline of each part on paper: hull of its bounding box's eight corners
  const shape = box.map(([lo, hi]) => {
    const pts: Pt[] = []
    for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) pts.push(iso([x, y, z]).slice(0, 2) as Pt)
    return hull(pts)
  })
  const scr = shape.map((q) => [Math.min(...q.map((r) => r[0])), Math.max(...q.map((r) => r[0])), Math.min(...q.map((r) => r[1])), Math.max(...q.map((r) => r[1]))])
  const eps = 1e-6
  const after: number[][] = Array.from({ length: n }, () => [])
  const before: number[][] = Array.from({ length: n }, () => [])
  const overlap = new Map<string, number>() // area two ordered parts share on paper
  const indeg = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const a = scr[i]
      const b = scr[j]
      if (a[1] <= b[0] + eps || b[1] <= a[0] + eps || a[3] <= b[2] + eps || b[3] <= a[2] + eps) continue
      const [ai, aj] = [box[i], box[j]]
      let ij = false
      let ji = false
      for (let k = 0; k < 3; k++) {
        if (ai[1][k] <= aj[0][k] + eps) ij = true
        else if (aj[1][k] <= ai[0][k] + eps) ji = true
      }
      if (ij === ji) {
        // interpenetrating: a tie runs through the panels and wales — draw it first so only its plates and
        // the ends show; anything else is left to centre depth
        const ti = items[i].p.kind === 'tie' && items[i].p.shape === 'bar'
        const tj = items[j].p.kind === 'tie' && items[j].p.shape === 'bar'
        if (ti === tj || ij) continue
        ;[ij, ji] = [ti, tj]
      }
      const area = overlapArea(shape[i], shape[j])
      if (area < 1e-9) continue // outlines only touch
      const [from, to] = ij ? [i, j] : [j, i]
      after[from].push(to)
      before[to].push(from)
      overlap.set(`${from}-${to}`, area)
      indeg[to]++
    }
  // Kahn's algorithm, farthest centre first among the free parts; a cycle falls back to centre depth
  const out: Item[] = []
  const done = new Array<boolean>(n).fill(false)
  const ready = items.map((_, i) => i).filter((i) => indeg[i] === 0)
  while (out.length < n) {
    if (!ready.length) {
      // a cycle (e.g. wales crossing at a corner over a panel): walk back through the parts still waiting
      // until one repeats, then drop the loop's constraint with the smallest overlap on paper (a corner lap)
      let k = done.indexOf(false)
      const seen = new Map<number, number>()
      while (!seen.has(k)) {
        seen.set(k, seen.size)
        k = before[k].find((j) => !done[j])!
      }
      // loop[x + 1] is a predecessor of loop[x]
      const loop = [...seen.keys()].slice(seen.get(k))
      const ov = (x: number) => overlap.get(`${loop[(x + 1) % loop.length]}-${loop[x]}`) ?? 0
      const m = loop.reduce((b, _, x) => (ov(x) < ov(b) ? x : b), 0)
      const [to, pred] = [loop[m], loop[(m + 1) % loop.length]]
      after[pred].splice(after[pred].indexOf(to), 1)
      before[to].splice(before[to].indexOf(pred), 1)
      if (--indeg[to] === 0) ready.push(to)
      continue
    }
    let best = 0
    for (let r = 1; r < ready.length; r++) if (items[ready[r]].depth < items[ready[best]].depth) best = r
    const i = ready.splice(best, 1)[0]
    if (done[i]) continue
    done[i] = true
    out.push(items[i])
    for (const j of after[i]) if (!done[j] && --indeg[j] === 0) ready.push(j)
  }
  return out
}

export function project(model: FormModel, view: ShopViewKind) {
  const P = view === 'iso' ? iso : PROJ[view]
  const items: Item[] = model.parts.map((p) => {
    const pts = (p.shape === 'box' && view === 'iso' ? boxCorners(p) : corners(p)).map(P)
    const depth = view === 'iso' ? P(p.shape === 'box' ? p.center : ([(p.from[0] + p.to[0]) / 2, (p.from[1] + p.to[1]) / 2, (p.from[2] + p.to[2]) / 2] as Vec3))[2] : Math.max(...pts.map((q) => q[2]))
    return { p, pts, depth }
  })
  if (view === 'iso') return isoOrder(items)
  items.sort((a, b) => a.depth - b.depth)
  return items
}

function extent(items: ReturnType<typeof project>, dims: Dim[]) {
  let u0 = Infinity
  let u1 = -Infinity
  let v0 = Infinity
  let v1 = -Infinity
  for (const it of items)
    for (const q of it.pts) {
      u0 = Math.min(u0, q[0])
      u1 = Math.max(u1, q[0])
      v0 = Math.min(v0, q[1])
      v1 = Math.max(v1, q[1])
    }
  for (const d of dims) {
    if (d.dir === 'h') {
      v0 = Math.min(v0, d.at)
      v1 = Math.max(v1, d.at)
    } else {
      u0 = Math.min(u0, d.at)
      u1 = Math.max(u1, d.at)
    }
  }
  return { u0, u1, v0, v1 }
}

/** Extent of a view (with its dimension lines), m — for laying views out on the sheet at one scale. */
export function viewExtent(model: FormModel, view: ShopViewKind, dims: Dim[] = []) {
  const e = extent(project(model, view), dims)
  return { du: e.u1 - e.u0, dv: e.v1 - e.v0 }
}

/** Paper size of an orthographic view at scale 1:denom, mm. */
export const viewSize = (e: { du: number; dv: number }, denom: number) => ({ w: (e.du * 1000) / denom + 2 * VIEW_PAD, h: (e.dv * 1000) / denom + 2 * VIEW_PAD })

export function ShopView({ model, view, w, h, dims = [], tags = [], title, denom: fixed }: { model: FormModel; view: ShopViewKind; w: number; h: number; dims?: Dim[]; tags?: Tag[]; title: string; denom?: number }) {
  const items = project(model, view)
  const { u0, u1, v0, v1 } = extent(items, dims)
  const pad = VIEW_PAD
  const tagW = tags.length ? 16 : 0
  const roomU = w - 2 * pad - tagW
  const roomV = h - 2 * pad
  const denom = view === 'iso' ? undefined : (fixed ?? pickScale(u1 - u0, v1 - v0, roomU, roomV))
  const s = denom ? 1000 / denom : Math.min(roomU / (u1 - u0 || 1), roomV / (v1 - v0 || 1))
  const ox = pad + (roomU - s * (u1 - u0)) / 2
  // orthographic views hang from the top of their frame so captions line up; the isometric is centred
  const oy = view === 'iso' ? pad + (roomV - s * (v1 - v0)) / 2 : h - pad - s * (v1 - v0)
  const X = (u: number) => ox + (u - u0) * s
  const Y = (v: number) => h - oy - (v - v0) * s
  const hatch = `hatch-${view}-${title.length}`
  const lw = 0.12

  const shapes = items.map(({ p, pts }) => {
    const conc = p.kind === 'concrete'
    if (p.shape === 'box' && view === 'iso') {
      // visible faces of the box: top (+y), front (+z), right (+x); corners ordered dx, dy, dz ∈ {−1, 1}
      const c = (dx: number, dy: number, dz: number) => pts[(dx > 0 ? 4 : 0) + (dy > 0 ? 2 : 0) + (dz > 0 ? 1 : 0)]
      const poly = (q: [number, number, number][]) => q.map((r) => `${X(r[0]).toFixed(2)},${Y(r[1]).toFixed(2)}`).join(' ')
      const base = FILL[p.kind]
      const faces: [string, [number, number, number][]][] = [
        [shade(base, 1), [c(-1, 1, -1), c(1, 1, -1), c(1, 1, 1), c(-1, 1, 1)]],
        [shade(base, 0.86), [c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)]],
        [shade(base, 0.72), [c(1, -1, -1), c(1, -1, 1), c(1, 1, 1), c(1, 1, -1)]],
      ]
      return (
        <g key={p.id} opacity={conc ? 0.35 : 1}>
          {faces.map(([fill, q], k) => (
            <polygon key={k} points={poly(q)} fill={fill} stroke={STROKE[p.kind]} strokeWidth={lw} strokeLinejoin="round" />
          ))}
        </g>
      )
    }
    if (p.shape === 'box') {
      const [a, b] = pts
      return (
        <rect
          key={p.id}
          x={X(Math.min(a[0], b[0]))}
          y={Y(Math.max(a[1], b[1]))}
          width={Math.max(Math.abs(a[0] - b[0]) * s, 0.2)}
          height={Math.max(Math.abs(a[1] - b[1]) * s, 0.2)}
          fill={conc ? `url(#${hatch})` : FILL[p.kind]}
          stroke={STROKE[p.kind]}
          strokeWidth={lw}
        />
      )
    }
    const [a, b] = pts
    const len = Math.hypot(a[0] - b[0], a[1] - b[1])
    if (len * s < 0.3) return <circle key={p.id} cx={X(a[0])} cy={Y(a[1])} r={Math.max((p.b * s) / 2, 0.4)} fill={FILL[p.kind]} stroke={STROKE[p.kind]} strokeWidth={lw} />
    return <line key={p.id} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke={p.kind === 'tie' ? FILL.tie : STROKE[p.kind]} strokeWidth={Math.max(p.b * s, p.kind === 'tie' ? 0.25 : 0.35)} />
  })

  // callout tags: leader from the nearest part of each BOM line to a numbered circle in the right margin
  const byId = new Map(items.map((it) => [it.p.id, it]))
  const anchors = tags
    .map((t) => {
      const cands = t.partIds.map((id) => byId.get(id)).filter((x): x is (typeof items)[number] => !!x)
      if (!cands.length) return undefined
      const best = cands.reduce((m, c) => (c.depth > m.depth ? c : m))
      const u = best.pts.reduce((a, q) => a + q[0], 0) / best.pts.length
      const v = best.pts.reduce((a, q) => a + q[1], 0) / best.pts.length
      return { mark: t.mark, x: X(u), y: Y(v) }
    })
    .filter((a): a is { mark: number; x: number; y: number } => !!a)
    .sort((a, b) => a.y - b.y)
  // tags in a column just right of the drawing, each as level with its part as the spacing allows
  const tx = Math.min(w - 3.5, X(u1) + 16)
  const gapY = Math.min(6.6, (h - 6) / Math.max(anchors.length - 1, 1))
  const tys = anchors.map((a) => Math.min(Math.max(a.y, 3), h - 3))
  for (let i = 1; i < tys.length; i++) tys[i] = Math.max(tys[i], tys[i - 1] + gapY)
  const over = tys.length ? tys[tys.length - 1] - (h - 3) : 0
  if (over > 0) for (let i = tys.length - 1; i >= 0; i--) tys[i] = Math.min(tys[i] - over, i < tys.length - 1 ? tys[i + 1] - gapY : Infinity)

  return (
    <figure className="m-0 flex flex-col items-center">
      <svg width={`${w}mm`} height={`${h}mm`} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
        <defs>
          <pattern id={hatch} width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="1.6" height="1.6" fill={FILL.concrete} />
            <line x1="0" y1="0" x2="0" y2="1.6" stroke="#c3c9d2" strokeWidth="0.25" />
          </pattern>
        </defs>
        {view !== 'top' && view !== 'iso' && <line x1={2} x2={w - 2 - tagW} y1={Y(0)} y2={Y(0)} stroke="#64748b" strokeWidth={0.2} />}
        {shapes}
        {dims.map((d, i) => (
          <ShopDim key={i} d={d} X={X} Y={Y} />
        ))}
        {anchors.map((a, i) => {
          const ty = tys[i]
          return (
            <g key={a.mark}>
              <polyline points={`${a.x},${a.y} ${tx - 7},${ty} ${tx - 2.8},${ty}`} fill="none" stroke="#0f172a" strokeWidth={0.15} />
              <circle cx={a.x} cy={a.y} r={0.5} fill="#0f172a" />
              <circle cx={tx} cy={ty} r={2.8} fill="white" stroke="#0f172a" strokeWidth={0.25} />
              <text x={tx} y={ty + 0.95} fontSize={2.7} fontWeight={700} textAnchor="middle" className="font-mono">
                {a.mark}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="text-center text-[8pt] leading-tight">
        <b>{title}</b>
        <span className="ml-2 font-mono text-slate-600">{view === 'iso' ? 'ISOMETRIC — ไม่ตามมาตราส่วน' : denom ? `SCALE 1:${denom}` : 'ไม่ตามมาตราส่วน'}</span>
      </figcaption>
    </figure>
  )
}

function ShopDim({ d, X, Y }: { d: Dim; X: (u: number) => number; Y: (v: number) => number }) {
  const text = d.text ?? `${Math.round(Math.abs(d.b - d.a) * 100)}`
  const c = '#b9470b'
  const t = 1
  if (d.dir === 'h') {
    const y = Y(d.at)
    const x1 = X(d.a)
    const x2 = X(d.b)
    return (
      <g stroke={c} strokeWidth={0.15} fill={c}>
        <line x1={x1} x2={x2} y1={y} y2={y} />
        <line x1={x1 - t} x2={x1 + t} y1={y + t} y2={y - t} />
        <line x1={x2 - t} x2={x2 + t} y1={y + t} y2={y - t} />
        {Math.abs(x2 - x1) > text.length * 1.3 && (
          <text x={(x1 + x2) / 2} y={y - 0.8} fontSize={2.3} textAnchor="middle" stroke="none" className="font-mono">
            {text}
          </text>
        )}
      </g>
    )
  }
  const x = X(d.at)
  const y1 = Y(d.a)
  const y2 = Y(d.b)
  return (
    <g stroke={c} strokeWidth={0.15} fill={c}>
      <line x1={x} x2={x} y1={y1} y2={y2} />
      <line x1={x - t} x2={x + t} y1={y1 + t} y2={y1 - t} />
      <line x1={x - t} x2={x + t} y1={y2 + t} y2={y2 - t} />
      {Math.abs(y2 - y1) > text.length * 1.3 && (
        <text x={x - 0.8} y={(y1 + y2) / 2} transform={`rotate(-90 ${x - 0.8} ${(y1 + y2) / 2})`} fontSize={2.3} textAnchor="middle" stroke="none" className="font-mono">
          {text}
        </text>
      )}
    </g>
  )
}
