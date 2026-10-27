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

export function ShopView({ model, view, w, h, dims = [], tags = [], title }: { model: FormModel; view: ShopViewKind; w: number; h: number; dims?: Dim[]; tags?: Tag[]; title: string }) {
  const P = view === 'iso' ? iso : PROJ[view]
  const items = model.parts.map((p) => {
    const pts = (p.shape === 'box' && view === 'iso' ? boxCorners(p) : corners(p)).map(P)
    const depth = view === 'iso' ? P(p.shape === 'box' ? p.center : ([(p.from[0] + p.to[0]) / 2, (p.from[1] + p.to[1]) / 2, (p.from[2] + p.to[2]) / 2] as Vec3))[2] : Math.max(...pts.map((q) => q[2]))
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
  const pad = 7
  const tagW = tags.length ? 16 : 0
  const roomU = w - 2 * pad - tagW
  const roomV = h - 2 * pad
  const denom = view === 'iso' ? undefined : pickScale(u1 - u0, v1 - v0, roomU, roomV)
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
  const step = anchors.length > 1 ? Math.min(8, (h - 2 * pad) / (anchors.length - 1)) : 0
  const top = h / 2 - (step * (anchors.length - 1)) / 2
  const tx = w - tagW / 2 - 1

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
          const ty = top + i * step
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
      {Math.abs(y2 - y1) > 3 && (
        <text x={x - 0.8} y={(y1 + y2) / 2 + 0.8} fontSize={2.3} textAnchor="end" stroke="none" className="font-mono">
          {text}
        </text>
      )}
    </g>
  )
}
