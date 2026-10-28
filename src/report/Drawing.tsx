// Orthographic SVG drawing of a formwork model (elevation / end view / plan) with dimension lines.
// Painter's algorithm: parts are drawn far → near along the view direction.
import { type BoxPart, boxPoints, type FormModel, type Part, type Vec3 } from '@/model/formModel'

export type OrthoView = 'front' | 'side' | 'top'

/** Dimension line in model coordinates of the view: along u (horizontal) or v (vertical). */
export interface Dim {
  dir: 'h' | 'v'
  a: number
  b: number
  /** position of the dimension line on the other axis, model units */
  at: number
  text?: string
}

export const FILL: Record<string, string> = { concrete: '#e9ebee', plywood: '#e7b77f', timber: '#f3dcb5', steel: '#b9c4d3', tie: '#2b2f36' }
export const STROKE: Record<string, string> = { concrete: '#8a94a3', plywood: '#8c5a22', timber: '#8c6a36', steel: '#4b5b70', tie: '#2b2f36' }

// view → [u, v, depth] as functions of a point; v up; depth increases towards the viewer
export const PROJ: Record<OrthoView, (p: Vec3) => [number, number, number]> = {
  front: ([x, y, z]) => [x, y, z],
  side: ([x, y, z]) => [-z, y, x],
  top: ([x, y, z]) => [x, -z, y],
}

/** Bounding corners of a part (min, max), or the ends of a bar. */
export function corners(p: Part): Vec3[] {
  if (p.shape === 'bar') return [p.from, p.to]
  if (p.yaw || p.plan) {
    const q = boxPoints(p)
    return [[0, 1, 2].map((k) => Math.min(...q.map((v) => v[k]))) as Vec3, [0, 1, 2].map((k) => Math.max(...q.map((v) => v[k]))) as Vec3]
  }
  const [cx, cy, cz] = p.center
  const [sx, sy, sz] = p.size.map((s) => s / 2)
  return [
    [cx - sx, cy - sy, cz - sz],
    [cx + sx, cy + sy, cz + sz],
  ]
}

export type Pt = [number, number]

/** Convex hull (monotone chain), counter-clockwise. */
export function hull(points: Pt[]): Pt[] {
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

/** Outline of a turned box or prism in a view: a prism's plan as it is in the top view (it may be re-entrant, an L or a U), else the hull of its corners. */
export function boxOutline(p: BoxPart, P: (v: Vec3) => [number, number, number], top: boolean): Pt[] {
  const q = boxPoints(p)
  if (p.plan && top) return q.slice(0, p.plan.length).map((v) => P(v).slice(0, 2) as Pt)
  return hull(q.map((v) => P(v).slice(0, 2) as Pt))
}

export function Drawing({ model, view, width = 640, height = 360, dims = [], title, scaleNote }: { model: FormModel; view: OrthoView; width?: number; height?: number; dims?: Dim[]; title: string; scaleNote?: string }) {
  const P = PROJ[view]
  const items = model.parts.map((p) => {
    const pts = corners(p).map(P)
    const depth = Math.max(...pts.map((q) => q[2]))
    return { p, pts, depth }
  })
  items.sort((a, b) => a.depth - b.depth)

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
  const pad = 28
  const s = Math.min((width - 2 * pad) / (u1 - u0 || 1), (height - 2 * pad) / (v1 - v0 || 1))
  const ox = (width - s * (u1 - u0)) / 2
  const oy = (height - s * (v1 - v0)) / 2
  const X = (u: number) => ox + (u - u0) * s
  const Y = (v: number) => height - oy - (v - v0) * s

  return (
    <figure className="m-0 break-inside-avoid">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
        <defs>
          <pattern id={`hatch-${view}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={FILL.concrete} />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#c3c9d2" strokeWidth="1" />
          </pattern>
        </defs>
        {view !== 'top' && <line x1={0} x2={width} y1={Y(0)} y2={Y(0)} stroke="#64748b" strokeWidth={1} />}
        {items.map(({ p, pts }) => {
          if (p.shape === 'box' && (p.yaw || p.plan)) {
            const q = boxOutline(p, P, view === 'top')
            return <polygon key={p.id} points={q.map(([u, v]) => `${X(u).toFixed(2)},${Y(v).toFixed(2)}`).join(' ')} fill={p.kind === 'concrete' ? `url(#hatch-${view})` : FILL[p.kind]} stroke={STROKE[p.kind]} strokeWidth={0.5} />
          }
          if (p.shape === 'box') {
            const [a, b] = pts
            const x = X(Math.min(a[0], b[0]))
            const y = Y(Math.max(a[1], b[1]))
            const w = Math.abs(a[0] - b[0]) * s
            const h = Math.abs(a[1] - b[1]) * s
            return <rect key={p.id} x={x} y={y} width={Math.max(w, 0.6)} height={Math.max(h, 0.6)} fill={p.kind === 'concrete' ? `url(#hatch-${view})` : FILL[p.kind]} stroke={STROKE[p.kind]} strokeWidth={0.5} />
          }
          const [a, b] = pts
          const len = Math.hypot(a[0] - b[0], a[1] - b[1])
          if (len * s < 1) return <circle key={p.id} cx={X(a[0])} cy={Y(a[1])} r={Math.max((p.b * s) / 2, 1.6)} fill={FILL[p.kind]} />
          return <line key={p.id} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke={p.kind === 'tie' ? FILL.tie : STROKE[p.kind]} strokeWidth={Math.max(p.b * s, p.kind === 'tie' ? 1 : 1.5)} strokeLinecap="butt" opacity={p.kind === 'tie' ? 1 : 0.85} />
        })}
        {dims.map((d, i) => (
          <DimLine key={i} d={d} X={X} Y={Y} />
        ))}
      </svg>
      <figcaption className="mt-1 text-center text-[11px] text-slate-600">
        <b className="text-ink">{title}</b>
        {scaleNote && <span> · {scaleNote}</span>}
      </figcaption>
    </figure>
  )
}

function DimLine({ d, X, Y }: { d: Dim; X: (u: number) => number; Y: (v: number) => number }) {
  const text = d.text ?? `${Math.round(Math.abs(d.b - d.a) * 100)}`
  const c = '#b9470b'
  if (d.dir === 'h') {
    const y = Y(d.at)
    const x1 = X(d.a)
    const x2 = X(d.b)
    return (
      <g stroke={c} strokeWidth={0.7} fill={c}>
        <line x1={x1} x2={x2} y1={y} y2={y} />
        <line x1={x1 - 3} x2={x1 + 3} y1={y + 3} y2={y - 3} />
        <line x1={x2 - 3} x2={x2 + 3} y1={y + 3} y2={y - 3} />
        {Math.abs(x2 - x1) > 14 && (
          <text x={(x1 + x2) / 2} y={y - 3} fontSize={9} textAnchor="middle" stroke="none" className="font-mono">
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
    <g stroke={c} strokeWidth={0.7} fill={c}>
      <line x1={x} x2={x} y1={y1} y2={y2} />
      <line x1={x - 3} x2={x + 3} y1={y1 + 3} y2={y1 - 3} />
      <line x1={x - 3} x2={x + 3} y1={y2 + 3} y2={y2 - 3} />
      {Math.abs(y2 - y1) > text.length * 5.5 && (
        <text x={x - 3} y={(y1 + y2) / 2} transform={`rotate(-90 ${x - 3} ${(y1 + y2) / 2})`} fontSize={9} textAnchor="middle" stroke="none" className="font-mono">
          {text}
        </text>
      )}
    </g>
  )
}

/** Chain of dimensions through consecutive positions. */
export function chain(dir: Dim['dir'], positions: number[], at: number): Dim[] {
  const out: Dim[] = []
  for (let i = 1; i < positions.length; i++) out.push({ dir, a: positions[i - 1], b: positions[i], at })
  return out
}
