// Form Assembly — 3D parts of an assembly for the exploded view and the assembly sequence: every panel's plywood and
// studs on its face, the wales and form ties of the footing design, and the concrete. World axes as in formModel:
// x along the footing's X, y up from the base, z along Y; the concrete is centred on the origin.
// Each face has a frame: origin at u = 0 on the concrete side, `e` along the face (left → right seen from outside)
// and `n` outward. Steps: per course the through faces, then the faces between them; then wales, then ties.
import type { FaceKey, FormPanel } from '@/data/types'
import { FACE_KEYS } from '@/data/types'
import { type FootingInput, getSection, WALE_PAIR_GAP } from '@/engine'
import type { AssemblyResult } from './assembly'
import type { Vec3 } from './formModel'
import { panelLayout } from './panel'

export type AsmKind = 'concrete' | 'ply' | 'stud' | 'wale' | 'tie'

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
  /** outward direction used to pull the part away in the exploded view */
  n: Vec3
}

export interface Asm3D {
  parts: AsmPart[]
  steps: string[]
  bounds: { min: Vec3; max: Vec3 }
}

const FILLER_W = 0.3

interface Frame {
  o: Vec3
  e: Vec3
  n: Vec3
}

function frames(lx: number, ly: number, off: Record<FaceKey, number>): Record<FaceKey, Frame> {
  return {
    A: { o: [-lx / 2 - off.A, 0, ly / 2], e: [1, 0, 0], n: [0, 0, 1] },
    C: { o: [lx / 2 + off.C, 0, -ly / 2], e: [-1, 0, 0], n: [0, 0, -1] },
    B: { o: [lx / 2, 0, ly / 2 + off.B], e: [0, 0, -1], n: [1, 0, 0] },
    D: { o: [-lx / 2, 0, -ly / 2 - off.D], e: [0, 0, 1], n: [-1, 0, 0] },
  }
}

const at = (f: Frame, u: number, y: number, w: number): Vec3 => [f.o[0] + f.e[0] * u + f.n[0] * w, y, f.o[2] + f.e[2] * u + f.n[2] * w]

/** world box of the face-frame box u0…u1 × y0…y1 × w0…w1 */
function box(f: Frame, u0: number, u1: number, y0: number, y1: number, w0: number, w1: number) {
  const c = at(f, (u0 + u1) / 2, (y0 + y1) / 2, (w0 + w1) / 2)
  const du = Math.abs(u1 - u0)
  const dw = Math.abs(w1 - w0)
  const size: Vec3 = f.e[0] !== 0 ? [du, y1 - y0, dw] : [dw, y1 - y0, du]
  return { center: c, size }
}

export function assembly3d(r: AssemblyResult, inp: FootingInput, through: 'x' | 'y'): Asm3D {
  const lx = inp.lengthX
  const ly = inp.lengthY
  const off = Object.fromEntries(FACE_KEYS.map((k) => [k, r.specs[k].offset])) as Record<FaceKey, number>
  const F = frames(lx, ly, off)
  const parts: AsmPart[] = [{ id: 'concrete', kind: 'concrete', center: [0, inp.height / 2, 0], size: [lx, inp.height, ly], step: -1, course: 0, n: [0, 0, 0] }]

  const courses = Math.max(1, ...FACE_KEYS.map((k) => r.faces[k].courses.length))
  const isThrough = (k: FaceKey) => (k === 'A' || k === 'C' ? 'x' : 'y') === through
  const steps: string[] = []
  const [tk, ik] = through === 'x' ? ['A/C', 'B/D'] : ['B/D', 'A/C']
  for (let c = 0; c < courses; c++) {
    const pre = courses > 1 ? `ชั้นที่ ${c + 1}: ` : ''
    steps.push(`${pre}ตั้งแผงด้าน ${tk} (ทะลุมุม)`, `${pre}สอดแผงด้าน ${ik} ระหว่างด้าน ${tk}`)
  }

  // panels: plywood against the concrete, studs outside it
  let depth = 0
  for (const k of FACE_KEYS) {
    const f = F[k]
    for (const p of r.faces[k].placed) {
      if (!p.panel) continue
      const L = panelLayout(p.panel as FormPanel)
      const tp = p.panel.plywood.thicknessMm / 1000
      depth = Math.max(depth, L.thickness)
      const common = { step: p.course * 2 + (isThrough(k) ? 0 : 1), face: k, course: p.course, index: p.index, filler: p.w < FILLER_W, n: f.n }
      parts.push({ id: `${k}-${p.course}-${p.index}-ply`, kind: 'ply', ...box(f, p.x, p.x + p.w, p.y, p.y + p.h, 0, tp), ...common })
      L.members.forEach((m, i) => parts.push({ id: `${k}-${p.course}-${p.index}-m${i}`, kind: 'stud', ...box(f, p.x + m.x, p.x + m.x + m.w, p.y + m.y, p.y + m.y + m.h, tp, tp + L.studD), ...common }))
    }
  }

  // wales: along each face at the design levels, the pair stacked with the design gap
  const wales = r.faces.A.wales
  if (wales.length) {
    const wSec = getSection(inp.wale.sectionId)
    const wb = wSec.B / 100
    const wd = wSec.H / 100
    const n = inp.wale.count
    const step = steps.push('ใส่คานรับเคร่าตามระดับที่ออกแบบ') - 1
    for (const k of FACE_KEYS) {
      const f = F[k]
      const spec = r.specs[k]
      // wales of the through faces run past the corners to cross the others
      const ext = isThrough(k) ? depth + wd + 0.05 : 0.05
      const len = Math.max(spec.length, ...r.faces[k].courses.map((c) => c.length))
      for (const [i, y] of wales.entries())
        for (let j = 0; j < n; j++) {
          const yc = n === 2 ? y + (j ? 1 : -1) * (wb / 2 + WALE_PAIR_GAP / 2) : y
          parts.push({ id: `${k}-wale-${i}-${j}`, kind: 'wale', ...box(f, -ext, len + ext, yc - wb / 2, yc + wb / 2, depth, depth + wd), step, face: k, course: 0, n: f.n })
        }
    }
  }

  // form ties: through the concrete, drawn once per pair (from faces A and B)
  const tieFaces = (['A', 'B'] as FaceKey[]).filter((k) => r.faces[k].ties.length)
  if (tieFaces.length) {
    const step = steps.push('ร้อย Form tie ใส่แผ่นประกับ แล้วขันแน่น') - 1
    const reach = depth + 2 * (getSection(inp.wale.sectionId).H / 100) + 0.08
    for (const k of tieFaces) {
      const f = F[k]
      const across = k === 'A' ? ly : lx
      for (const [i, t] of r.faces[k].ties.entries()) {
        const a = at(f, t.u, t.y, reach)
        const b: Vec3 = [a[0] - f.n[0] * (across + 2 * reach), a[1], a[2] - f.n[2] * (across + 2 * reach)]
        parts.push({ id: `${k}-tie-${i}`, kind: 'tie', center: [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2], size: [0.014, 0.014, 0.014], from: a, to: b, step, course: 0, n: [0, 0, 0] })
      }
    }
  }

  const ext = Math.max(...FACE_KEYS.map((k) => r.specs[k].offset)) + depth + 0.3
  const top = Math.max(inp.height, ...FACE_KEYS.map((k) => r.faces[k].height))
  return { parts, steps, bounds: { min: [-lx / 2 - ext, 0, -ly / 2 - ext], max: [lx / 2 + ext, top, ly / 2 + ext] } }
}
