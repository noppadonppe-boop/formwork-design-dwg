// Form Assembly — the faces of an element that panels are laid out on, per element type:
//   footing, column (rectangular, plywood): four sides A (front) B (right) C (back) D (left), pairs A/C and B/D;
//   wall: faces A and C along the wall, stop-ends B and D across its thickness;
//   beam: sides A (outer, +z) and C (inner, −z), soffit B seen from below.
// Each face has a frame at the concrete surface (origin, `e` along the face left → right seen from outside, `v` up the
// face, `n` outward) for the 3D view, and the wales / yokes and form ties of the design in face coordinates.
// Corner detail: when a pair "runs through", its faces are extended by the thickness of the other pair's panels —
// along the face at both ends (rectangles), or across it (beam: sides past the soffit, or a soffit under the sides).
import type { AnyDesign } from '@/data/elements'
import type { ElementData, ElementType, FaceKey } from '@/data/types'
import { columnShapeOf, columnTieSpans, deckThicknessM, getSection } from '@/engine'
import type { Vec3 } from './formModel'

export type Pair = 'x' | 'y'
/** how a through face is extended: along both ends, or across it at the start (beam side) / at both edges (soffit) */
export type Extend = 'u-both' | 'y-start' | 'y-both'

export interface FaceDef {
  key: FaceKey
  label: string
  pair: Pair
  /** concrete length along the face, m */
  concreteL: number
  /** pour height (vertical faces) or soffit width, m */
  height: number
  /** the height must be met exactly (soffit width); otherwise it is a minimum (pour height) */
  exactHeight?: boolean
  extend: Extend
  o: Vec3
  e: Vec3
  v: Vec3
  n: Vec3
  /** wale / yoke levels, m on the face from the concrete edge */
  wales: number[]
  /** vertical wales (wall with horizontal studs), m along the face from the concrete edge */
  waleU?: number[]
  /** horizontal studs: the longest stud cantilever past a vertical wale that passes, m */
  studReach?: number
  /** form ties, m on the face from the concrete edge */
  ties: { u: number; y: number }[]
}

export interface ElementGeom {
  type: ElementType
  faces: FaceDef[]
  /** opposite faces that can repeat each other: [face, its copy] */
  links: [FaceKey, FaceKey][]
  /** default pair running through the corners */
  through: Pair
  throughLabel: Record<Pair, string>
  /** the line the wales are called in the drawings */
  waleLabel: string
  /** concrete box for the 3D view */
  concrete: { center: Vec3; size: Vec3 }
  /** key diagram (plan, or the section of a beam): rectangle and the side each face sits on */
  diagram: { w: number; h: number; caption: string; side: Partial<Record<FaceKey, 'top' | 'right' | 'bottom' | 'left'>> }
  /** assembly order: face groups set course by course; `first` faces go in before everything (beam soffit) */
  first?: FaceKey[]
  /** fallback panel thickness for the corner allowance before any panel is placed, m */
  panelT: number
}

const evenly = (L: number, n: number) => Array.from({ length: n }, (_, j) => ((j + 1) * L) / (n + 1))
const r3 = (v: number) => Math.round(v * 1000) / 1000

/** four sides of a rectangle lx × ly (plan), height H, centred on the origin */
function box4(lx: number, ly: number, H: number, wales: number[], ties: Partial<Record<FaceKey, number[]>>, tieY: (k: FaceKey, y: number) => number = (_, y) => y): FaceDef[] {
  const mk = (key: FaceKey, label: string, pair: Pair, L: number, o: Vec3, e: Vec3, n: Vec3): FaceDef => ({
    key,
    label,
    pair,
    concreteL: L,
    height: H,
    extend: 'u-both',
    o,
    e,
    v: [0, 1, 0],
    n,
    wales,
    ties: wales.flatMap((y) => (ties[key] ?? []).map((u) => ({ u: r3(u), y: tieY(key, y) }))),
  })
  return [
    mk('A', 'ด้าน A (หน้า)', 'x', lx, [-lx / 2, 0, ly / 2], [1, 0, 0], [0, 0, 1]),
    mk('B', 'ด้าน B (ขวา)', 'y', ly, [lx / 2, 0, ly / 2], [0, 0, -1], [1, 0, 0]),
    mk('C', 'ด้าน C (หลัง)', 'x', lx, [lx / 2, 0, -ly / 2], [-1, 0, 0], [0, 0, -1]),
    mk('D', 'ด้าน D (ซ้าย)', 'y', ly, [-lx / 2, 0, -ly / 2], [0, 0, 1], [-1, 0, 0]),
  ]
}

const rectLabels = (lx: number, ly: number): Record<Pair, string> => ({ x: `A/C (${lx.toFixed(2)})`, y: `B/D (${ly.toFixed(2)})` })
const plan = (w: number, h: number, caption: string): ElementGeom['diagram'] => ({ w, h, caption, side: { A: 'bottom', B: 'right', C: 'top', D: 'left' } })
const isRect = (inp: object) => columnShapeOf(inp as Parameters<typeof columnShapeOf>[0]).kind === 'rect'

/** The faces of `el`, or undefined when assemblies do not cover it (slabs, round / shaped columns, board forms). */
export function elementGeom(el: ElementData, run?: AnyDesign): ElementGeom | undefined {
  switch (el.type) {
    case 'footing': {
      const inp = el.input
      if (!isRect(inp)) return undefined
      const { lengthX: lx, lengthY: ly, height: H } = inp
      const d = run?.type === 'footing' ? run.design : undefined
      const viaWale = inp.support === 'braced' && inp.brace.at === 'wale'
      const wales = d && (inp.support === 'tied' || viaWale) ? d.layout.waleLevels : []
      const longIsX = lx >= ly
      const nLong = d && inp.support === 'tied' ? (d.layout.tiesLong ?? 0) : 0
      const nShort = d && inp.support === 'tied' && d.layout.tieLayout === 'both' ? (d.layout.tiesShort ?? 0) : 0
      const tx = evenly(lx, longIsX ? nLong : nShort)
      const ty = evenly(ly, longIsX ? nShort : nLong)
      return {
        type: 'footing',
        faces: box4(lx, ly, H, wales, { A: tx, C: tx, B: ty, D: ty }),
        links: [
          ['A', 'C'],
          ['B', 'D'],
        ],
        through: longIsX ? 'x' : 'y',
        throughLabel: rectLabels(lx, ly),
        waleLabel: 'คานรับเคร่า',
        concrete: { center: [0, H / 2, 0], size: [lx, H, ly] },
        diagram: plan(lx, ly, 'ผัง'),
        panelT: deckThicknessM(inp.sheathing) + getSection(inp.stud.sectionId).H / 100,
      }
    }
    case 'column': {
      const inp = el.input
      if (!isRect(inp) || inp.sheathing.type !== 'plywood' || !inp.stud) return undefined
      const { b, h, height: H } = inp
      const d = run?.type === 'column' ? run.design : undefined
      const yokes = d?.layout.yokeLevels ?? []
      const spans = columnTieSpans(inp.tie)
      // ties through the long faces (B/D, along h) and through the short faces (A/C, along b)
      const along = (L: number, n: number) => Array.from({ length: Math.max(n - 1, 0) }, (_, j) => ((j + 1) * L) / n)
      return {
        type: 'column',
        faces: box4(b, h, H, yokes, { A: along(b, spans.short), C: along(b, spans.short), B: along(h, spans.long), D: along(h, spans.long) }),
        links: [
          ['A', 'C'],
          ['B', 'D'],
        ],
        // the wider pair wraps the narrower one
        through: h >= b ? 'y' : 'x',
        throughLabel: rectLabels(b, h),
        waleLabel: 'คานรัด (Yoke)',
        concrete: { center: [0, H / 2, 0], size: [b, H, h] },
        diagram: plan(b, h, 'ผังเสา'),
        panelT: inp.sheathing.thicknessMm / 1000 + getSection(inp.stud.sectionId).H / 100,
      }
    }
    case 'wall': {
      const inp = el.input
      const { thickness: t, height: H, length: L } = inp
      const d = run?.type === 'wall' ? run.design : undefined
      const wales = d?.layout.waleLevels ?? []
      const tieX = d?.layout.tieX ?? []
      const tieLevels = d?.layout.tieLevels ?? wales
      const tie = (us: number[]) => tieLevels.flatMap((y) => us.map((u) => ({ u: r3(u), y })))
      // horizontal studs: vertical wales along faces A and C, studs reaching past them by the end cantilever of the design
      const horizontal = inp.system === 'horizontal'
      const waleX = d?.layout.waleX ?? []
      const reach = d?.components.find((c) => c.key === 'stud-end')?.spacing?.max
      const side = (key: FaceKey, label: string, pair: Pair, len: number, o: Vec3, e: Vec3, n: Vec3, w: number[], ties: FaceDef['ties'], waleU?: number[]): FaceDef => ({
        key,
        label,
        pair,
        concreteL: len,
        height: H,
        extend: 'u-both',
        o,
        e,
        v: [0, 1, 0],
        n,
        wales: w,
        ties,
        ...(waleU?.length ? { waleU, studReach: reach !== undefined ? reach / 100 : undefined } : {}),
      })
      return {
        type: 'wall',
        faces: [
          side('A', 'ด้าน A (หน้าผนัง)', 'x', L, [0, 0, t / 2], [1, 0, 0], [0, 0, 1], wales, tie(tieX), horizontal ? waleX.map(r3) : undefined),
          side('B', 'ด้าน B (ปิดปลายขวา)', 'y', t, [L, 0, t / 2], [0, 0, -1], [1, 0, 0], [], []),
          side('C', 'ด้าน C (หลังผนัง)', 'x', L, [L, 0, -t / 2], [-1, 0, 0], [0, 0, -1], wales, tie(tieX.map((x) => L - x)), horizontal ? waleX.map((x) => r3(L - x)).reverse() : undefined),
          side('D', 'ด้าน D (ปิดปลายซ้าย)', 'y', t, [0, 0, -t / 2], [0, 0, 1], [-1, 0, 0], [], []),
        ],
        links: [
          ['A', 'C'],
          ['B', 'D'],
        ],
        through: 'x',
        throughLabel: { x: 'หน้าผนังทะลุ (ปิดปลายอยู่ระหว่าง)', y: 'ปิดปลายทะลุ' },
        waleLabel: horizontal ? 'คานตั้ง' : 'คานรับเคร่า',
        concrete: { center: [L / 2, H / 2, 0], size: [L, H, t] },
        diagram: { w: L, h: t, caption: 'ผังผนัง', side: { A: 'bottom', B: 'right', C: 'top', D: 'left' } },
        panelT: inp.sheathing.thicknessMm / 1000 + getSection(inp.stud.sectionId).H / 100,
      }
    }
    case 'beam': {
      const inp = el.input
      const d = run?.type === 'beam' ? run.design : undefined
      const { b, length: L } = inp
      const hsO = d?.layout.sideOuter ?? inp.h - (inp.type === 'isolated' ? 0 : inp.slabT)
      const hsI = d?.layout.sideInner ?? hsO
      const wales = d && inp.tie?.enabled ? d.layout.tieLevels : []
      const side = (key: FaceKey, label: string, hs: number, o: Vec3, e: Vec3, n: Vec3): FaceDef => ({ key, label, pair: 'x', concreteL: L, height: hs, extend: 'y-start', o, e, v: [0, 1, 0], n, wales: wales.filter((y) => y < hs), ties: [] })
      const faces: FaceDef[] = [
        side('A', 'ด้าน A (ข้างคานนอก)', hsO, [0, 0, b / 2], [1, 0, 0], [0, 0, 1]),
        { key: 'B', label: 'ด้าน B (ท้องคาน)', pair: 'y', concreteL: L, height: b, exactHeight: true, extend: 'y-both', o: [0, 0, -b / 2], e: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0], wales: [], ties: [] },
      ]
      if (hsI > 0.01) faces.push(side('C', 'ด้าน C (ข้างคานใน)', hsI, [L, 0, -b / 2], [-1, 0, 0], [0, 0, -1]))
      return {
        type: 'beam',
        faces,
        links: hsI > 0.01 && Math.abs(hsI - hsO) < 0.005 ? [['A', 'C']] : [],
        // as designed: the sides stand on the soffit
        through: 'y',
        throughLabel: { x: 'ข้างคานหนีบท้องคาน', y: 'ข้างคานตั้งบนท้องคาน' },
        waleLabel: 'คานรับเคร่า',
        concrete: { center: [L / 2, inp.h / 2, 0], size: [L, inp.h, b] },
        diagram: { w: b, h: Math.max(hsO, hsI), caption: 'รูปตัดคาน', side: { A: 'right', C: 'left', B: 'bottom' } },
        first: ['B'],
        panelT: deckThicknessM(inp.sheathing) + getSection(inp.stud.sectionId).H / 100,
      }
    }
    default:
      return undefined
  }
}

export const ASSEMBLY_TYPES: ElementType[] = ['footing', 'column', 'wall', 'beam']
