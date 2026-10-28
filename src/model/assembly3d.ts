// Form Assembly — 3D parts of an assembly for the exploded view and the assembly sequence: every panel's plywood and
// studs on its face, the wales / yokes and form ties of the design, and the concrete. Each face is placed by its frame
// (assemblyGeom): a point (u, y) on the face is o + e·(u − offset) + v·(y − yOffset), and w is the distance outward n.
// Steps: faces set first (beam soffit), then per course the through faces before the others; then wales, then ties.
import type { ElementData, FaceKey, FormPanel } from '@/data/types'
import { getSection, WALE_PAIR_GAP } from '@/engine'
import { type AssemblyResult, type FaceSpec, sectionDepth, waleSectionOf } from './assembly'
import { tiePlate, type Vec3 } from './formModel'
import { panelLayout } from './panel'

export type AsmKind = 'concrete' | 'ply' | 'stud' | 'wale' | 'tie' | 'plate'

export interface AsmPart {
  id: string
  kind: AsmKind
  center: Vec3
  size: Vec3
  /** ties: a bar between two points instead of a box */
  from?: Vec3
  to?: Vec3
  /** index into `steps`; −1 = always shown (concrete) */
  step: number
  face?: FaceKey
  course: number
  index?: number
  filler?: boolean
  /** outward direction and the face's up direction, for the exploded view */
  n: Vec3
  v: Vec3
}

export interface Asm3D {
  parts: AsmPart[]
  steps: string[]
  bounds: { min: Vec3; max: Vec3 }
}

const FILLER_W = 0.3
const ZERO: Vec3 = [0, 0, 0]

const at = (f: FaceSpec, u: number, y: number, w: number): Vec3 => {
  const a = u - f.offset
  const b = y - f.yOffset
  return [0, 1, 2].map((i) => f.o[i] + f.e[i] * a + f.v[i] * b + f.n[i] * w) as Vec3
}

/** world box of the face box u0…u1 × y0…y1 × w0…w1 */
function box(f: FaceSpec, u0: number, u1: number, y0: number, y1: number, w0: number, w1: number) {
  const center = at(f, (u0 + u1) / 2, (y0 + y1) / 2, (w0 + w1) / 2)
  const [du, dy, dw] = [Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(w1 - w0)]
  const size = [0, 1, 2].map((i) => Math.abs(f.e[i]) * du + Math.abs(f.v[i]) * dy + Math.abs(f.n[i]) * dw) as Vec3
  return { center, size }
}

export function assembly3d(r: AssemblyResult, el: ElementData): Asm3D {
  const g = r.geom
  const parts: AsmPart[] = [{ id: 'concrete', kind: 'concrete', center: g.concrete.center, size: g.concrete.size, step: -1, course: 0, n: ZERO, v: ZERO }]
  const specs = r.keys.map((k) => r.specs[k]!)
  const steps: string[] = []
  const stepOf = new Map<string, number>()

  const first = r.keys.filter((k) => g.first?.includes(k))
  if (first.length) stepOf.set('first', steps.push(`วางแผง${first.map((k) => r.specs[k]!.label).join(', ')}`) - 1)
  const rest = r.keys.filter((k) => !first.includes(k))
  const courses = Math.max(1, ...rest.map((k) => r.faces[k]!.courses.length))
  const groups = [rest.filter((k) => r.specs[k]!.through), rest.filter((k) => !r.specs[k]!.through)].filter((x) => x.length)
  for (let c = 0; c < courses; c++)
    groups.forEach((keys, gi) => {
      const pre = courses > 1 ? `ชั้นที่ ${c + 1}: ` : ''
      const verb = groups.length > 1 ? (gi === 0 ? 'ตั้งแผง' : 'สอดแผง') : 'ตั้งแผง'
      stepOf.set(`${c}-${gi}`, steps.push(`${pre}${verb}ด้าน ${keys.join('/')}${groups.length > 1 && gi === 0 ? ' (ทะลุมุม)' : ''}`) - 1)
    })
  const stepFor = (k: FaceKey, course: number) => (first.includes(k) ? stepOf.get('first')! : stepOf.get(`${course}-${groups.findIndex((x) => x.includes(k))}`)!)

  // panels: plywood against the concrete, studs outside it
  let depth = 0
  for (const f of specs) {
    for (const p of r.faces[f.key]!.placed) {
      if (!p.panel) continue
      const L = panelLayout(p.panel as FormPanel)
      const tp = p.panel.plywood.thicknessMm / 1000
      depth = Math.max(depth, L.thickness)
      const common = { step: stepFor(f.key, p.course), face: f.key, course: p.course, index: p.index, filler: p.w < FILLER_W, n: f.n, v: f.v }
      parts.push({ id: `${f.key}-${p.course}-${p.index}-ply`, kind: 'ply', ...box(f, p.x, p.x + p.w, p.y, p.y + p.h, 0, tp), ...common })
      L.members.forEach((m, i) => parts.push({ id: `${f.key}-${p.course}-${p.index}-m${i}`, kind: 'stud', ...box(f, p.x + m.x, p.x + m.x + m.w, p.y + m.y, p.y + m.y + m.h, tp, tp + L.studD), ...common }))
    }
  }

  // wales / yokes at the design levels, a pair stacked with the design gap
  const ws = waleSectionOf(el)
  const waleFaces = specs.filter((f) => f.wales.length)
  if (ws && waleFaces.length) {
    const sec = getSection(ws.sectionId)
    const wb = sec.B / 100
    const wd = sec.H / 100
    const step = steps.push(`ใส่${g.waleLabel}ตามระดับที่ออกแบบ`) - 1
    for (const f of waleFaces) {
      // wales of the through faces run past the corners to cross the others
      const ext = f.canOverrun ? depth + wd + 0.05 : 0.05
      const len = Math.max(f.length, ...r.faces[f.key]!.courses.map((c) => c.length))
      for (const [i, y] of f.wales.entries())
        for (let j = 0; j < ws.count; j++) {
          const yc = ws.count === 2 ? y + (j ? 1 : -1) * (wb / 2 + WALE_PAIR_GAP / 2) : y
          parts.push({ id: `${f.key}-wale-${i}-${j}`, kind: 'wale', ...box(f, -ext, len + ext, yc - wb / 2, yc + wb / 2, depth, depth + wd), step, face: f.key, course: 0, n: f.n, v: ZERO })
        }
    }
  }

  // form ties: through the concrete, drawn once per pair of opposite faces (from the original of each link), with a
  // steel bearing plate (เหล็กประกับ) on the wales at both ends
  const tieFaces = specs.filter((f) => f.ties.length && !g.links.some(([, copy]) => copy === f.key))
  if (tieFaces.length) {
    const step = steps.push('ร้อย Form tie ใส่แผ่นประกับ แล้วขันแน่น') - 1
    const reach = depth + 2 * (ws ? sectionDepth(ws.sectionId) : 0.05) + 0.08
    const out = depth + (ws ? sectionDepth(ws.sectionId) : 0) // outer face of the wales
    const tp = tiePlate(ws?.count ?? 1, ws ? getSection(ws.sectionId).B / 100 : 0.08)
    for (const f of tieFaces) {
      const across = [0, 1, 2].reduce((a, i) => a + Math.abs(f.n[i]) * g.concrete.size[i], 0)
      for (const [i, t] of r.faces[f.key]!.ties.entries()) {
        const a = at(f, t.u, t.y, reach)
        const b = [0, 1, 2].map((k) => a[k] - f.n[k] * (across + 2 * reach)) as Vec3
        parts.push({ id: `${f.key}-tie-${i}`, kind: 'tie', center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], size: [0.014, 0.014, 0.014], from: a, to: b, step, course: 0, n: ZERO, v: ZERO })
        // the plate on the opposite face is the same box moved across the concrete and both form depths
        const near = box(f, t.u - tp.along / 2, t.u + tp.along / 2, t.y - tp.across / 2, t.y + tp.across / 2, out, out + tp.t)
        const shift = across + 2 * out + tp.t
        const far = [0, 1, 2].map((k) => near.center[k] - f.n[k] * shift) as Vec3
        parts.push({ id: `${f.key}-tieplate-${i}-a`, kind: 'plate', ...near, step, course: 0, n: f.n, v: ZERO })
        parts.push({ id: `${f.key}-tieplate-${i}-b`, kind: 'plate', center: far, size: near.size, step, course: 0, n: f.n.map((x) => -x) as Vec3, v: ZERO })
      }
    }
  }

  // bounds round everything placed
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const p of parts)
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p.center[i] - p.size[i] / 2)
      max[i] = Math.max(max[i], p.center[i] + p.size[i] / 2)
    }
  return { parts, steps, bounds: { min, max } }
}
