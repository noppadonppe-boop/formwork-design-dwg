// Geometric model of a designed formwork: a flat list of parts in metres (x right, y up, z out of the wall face).
// Shared by the 3D viewer and the 2D drawings in the calc report (and later the shop drawings).
import {
  type ColumnDesign,
  type ColumnInput,
  type ColumnShape,
  columnShapeOf,
  columnTieSpans,
  cutYokeInnerCm,
  getMaterial,
  getSection,
  legBox,
  legLayout,
  legOutline,
  legTies,
  coreTies,
  type MaterialKind,
  polygonBox,
  polygonDims,
  polygonFaces,
  type WallDesign,
  type WallInput,
} from '@/engine'

export type PartGroup = 'concrete' | 'sheathing' | 'stud' | 'wale' | 'yoke' | 'tie' | 'brace' | 'joist' | 'stringer' | 'shore' | 'bracing' | 'bottom' | 'head' | 'stake'
export type Vec3 = [number, number, number]

interface PartBase {
  id: string
  group: PartGroup
  kind: MaterialKind | 'concrete' | 'tie'
  /** one physical piece drawn as several parts (a round form's half in segments): the BOM counts it once at `lengthM` */
  piece?: { id: string; lengthM: number }
}
/** box, axis-aligned unless turned about the vertical axis */
export interface BoxPart extends PartBase {
  shape: 'box'
  center: Vec3
  size: Vec3
  /** turn about +y through the centre, radians (three.js rotation.y) */
  yaw?: number
  /** prism instead of a box: plan outline [x, z] about the centre (size = its bounding box); plan views draw it as
   * it is, other views its convex hull */
  plan?: [number, number][]
}
/** prismatic member between two points (braces, ties) */
export interface BarPart extends PartBase {
  shape: 'bar'
  from: Vec3
  to: Vec3
  /** section width / depth, m (round when `round`) */
  b: number
  d: number
  round?: boolean
}
export type Part = BoxPart | BarPart

/** Draggable dimension in the 3D view. `value` is in the unit the input stores. */
export interface Handle {
  key: HandleKey
  label: string
  position: Vec3
  axis: Vec3
  /** current value, m along the axis (drag delta is added to this) */
  value: number
  min: number
  max: number
  /** snapping step, m */
  step: number
}
export type HandleKey =
  | 'height'
  | 'length'
  | 'thickness'
  | 'b'
  | 'h'
  | 'studSpacing'
  | 'waleSpacing'
  | 'tieSpacing'
  | 'yokeSpacing'
  | 'lengthX'
  | 'lengthY'
  | 'clearHeight'
  | 'joistSpacing'
  | 'stringerSpacing'
  | 'shoreSpacing'
  | 'headSpacing'
  | 'supportSpacing'

export interface FormModel {
  parts: Part[]
  handles: Handle[]
  bounds: { min: Vec3; max: Vec3 }
}

export const cm = (v: number) => v / 100
export const GAP = 0.015 // gap between the two members of a double wale/yoke (tie passes through)

/** [x, z] turned about +y by `yaw` (as three.js rotation.y). */
export const rotY = ([x, z]: [number, number], yaw: number): [number, number] => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)]
/** Yaw that turns a box's local +z (its thickness) to the plan direction at angle φ from +x towards +z. */
export const yawFacing = (phi: number) => Math.PI / 2 - phi

/** Corners of a box part in world space: the 8 corners (dx, dy, dz ∈ {−1, 1}, dz fastest), or the prism's outline at the bottom then the top. */
export function boxPoints(p: BoxPart): Vec3[] {
  const [cx, cy, cz] = p.center
  const [sx, sy, sz] = p.size.map((s) => s / 2)
  const at = (u: [number, number], y: number): Vec3 => {
    const [x, z] = p.yaw ? rotY(u, p.yaw) : u
    return [cx + x, y, cz + z]
  }
  if (p.plan) return [...p.plan.map((u) => at(u, cy - sy)), ...p.plan.map((u) => at(u, cy + sy))]
  const out: Vec3[] = []
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) out.push(at([dx * sx, dz * sz], cy + dy * sy))
  return out
}

/** Plan outline points of a regular polygon (n sides, circumradius R) with a flat facing +z. */
export function regularPlan(n: number, R: number): [number, number][] {
  return Array.from({ length: n }, (_, k) => {
    const a = Math.PI / 2 + (2 * Math.PI * k) / n + Math.PI / n
    return [R * Math.cos(a), R * Math.sin(a)] as [number, number]
  })
}

/** Plan of a circle of radius r as an n-gon of the same area (so concrete volumes come out exact). */
export const roundPlan = (n: number, r: number) => regularPlan(n, r * Math.sqrt((2 * Math.PI) / (n * Math.sin((2 * Math.PI) / n))))

export function bounds(parts: Part[]): FormModel['bounds'] {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  const grow = (p: Vec3, r = 0) => {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p[i] - r)
      max[i] = Math.max(max[i], p[i] + r)
    }
  }
  for (const p of parts) {
    if (p.shape === 'box') {
      if (p.yaw || p.plan) boxPoints(p).forEach((q) => grow(q))
      else {
        grow([p.center[0] - p.size[0] / 2, p.center[1] - p.size[1] / 2, p.center[2] - p.size[2] / 2])
        grow([p.center[0] + p.size[0] / 2, p.center[1] + p.size[1] / 2, p.center[2] + p.size[2] / 2])
      }
    } else {
      grow(p.from, p.b)
      grow(p.to, p.b)
    }
  }
  return { min, max }
}

/** Offsets of the members in a set of `count` (1 or 2) members of width w, stacked vertically. */
export const pairOffsets = (count: number, w: number) => (count === 2 ? [-(w / 2 + GAP / 2), w / 2 + GAP / 2] : [0])

/** Steel bearing plate (เหล็กประกับ) under a tie nut, m: 8 cm along the wale; across a double wale it bridges the
 *  pair (the tie passes through the gap), on a single wale it is an 8 × 8 cm washer plate. */
export function tiePlate(count: number, waleB: number) {
  return { along: 0.08, across: count === 2 ? Math.round((2 * waleB + GAP + 0.02) * 100) / 100 : Math.max(0.08, waleB), t: 0.009 }
}

/** Plywood sheets 1.22 × 2.44 laid in a grid over a face (u along the face, v up). */
export function sheets(width: number, height: number): { u0: number; u1: number; v0: number; v1: number }[] {
  const out = []
  const j = 0.002
  for (let u = 0; u < width - 1e-6; u += 1.22)
    for (let v = 0; v < height - 1e-6; v += 2.44) out.push({ u0: u + j, u1: Math.min(u + 1.22, width) - j, v0: v + j, v1: Math.min(v + 2.44, height) - j })
  return out
}

// ---------------------------------------------------------------- wall

export function wallModel(inp: WallInput, d: WallDesign): FormModel {
  const parts: Part[] = []
  const { thickness: t, height: H, length: L } = inp
  const ply = inp.sheathing.thicknessMm / 1000
  const stud = getSection(inp.stud.sectionId)
  const studKind = getMaterial(inp.stud.materialId).kind
  const wale = getSection(inp.wale.sectionId)
  const waleKind = getMaterial(inp.wale.materialId).kind
  const sb = cm(stud.B)
  const sd = cm(stud.H)
  const wb = cm(wale.B)
  const wd = cm(wale.H)
  const z0 = t / 2 + ply // outer face of plywood
  const zW = z0 + sd // outer face of studs
  const zOut = zW + wd // outer face of wales
  const { studX, tieX, waleLevels } = d.layout

  parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [L / 2, H / 2, 0], size: [L, H, t] })
  for (const s of [1, -1]) {
    sheets(L, H).forEach((p, i) =>
      parts.push({ id: `ply${s}-${i}`, group: 'sheathing', kind: 'plywood', shape: 'box', center: [(p.u0 + p.u1) / 2, (p.v0 + p.v1) / 2, s * (t / 2 + ply / 2)], size: [p.u1 - p.u0, p.v1 - p.v0, ply] }),
    )
    studX.forEach((x, i) => {
      const xc = Math.min(Math.max(x, sb / 2), L - sb / 2)
      parts.push({ id: `stud${s}-${i}`, group: 'stud', kind: studKind, shape: 'box', center: [xc, H / 2, s * (z0 + sd / 2)], size: [sb, H, sd] })
    })
    waleLevels.forEach((y, i) =>
      pairOffsets(inp.wale.count, wb).forEach((o, k) =>
        parts.push({ id: `wale${s}-${i}-${k}`, group: 'wale', kind: waleKind, shape: 'box', center: [L / 2, y + o, s * (zW + wd / 2)], size: [L + 0.2, wb, wd] }),
      ),
    )
  }
  const tp = tiePlate(inp.wale.count, wb)
  waleLevels.forEach((y, i) =>
    tieX.forEach((x, j) => {
      parts.push({ id: `tie-${i}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: [x, y, -(zOut + 0.06)], to: [x, y, zOut + 0.06], b: 0.012, d: 0.012, round: true })
      for (const s of [1, -1])
        parts.push({ id: `tieplate${s}-${i}-${j}`, group: 'tie', kind: 'steel', shape: 'box', center: [x, y, s * (zOut + tp.t / 2)], size: [tp.along, tp.across, tp.t] })
    }),
  )

  // braces: top (and mid-height) on one or both faces, foot on the ground
  const br = getSection(inp.brace.sectionId)
  const brKind = getMaterial(inp.brace.materialId).kind
  const th = (inp.brace.angleDeg * Math.PI) / 180
  const hTop = inp.brace.heightM ?? H
  const levels = inp.brace.levels === 2 ? [hTop, hTop / 2] : [hTop]
  const n = Math.max(1, Math.floor(L / inp.brace.spacingM))
  const x0 = (L - (n - 1) * inp.brace.spacingM) / 2
  for (const s of inp.brace.oneSided ? [1] : [1, -1])
    for (let i = 0; i < n; i++)
      levels.forEach((h, k) => {
        const x = x0 + i * inp.brace.spacingM
        const round = br.shape === 'pipe'
        parts.push({ id: `brace${s}-${i}-${k}`, group: 'brace', kind: brKind, shape: 'bar', from: [x, h, s * zOut], to: [x, 0, s * (zOut + h / Math.tan(th))], b: cm(br.B), d: cm(br.H), round })
      })

  const s1 = studX[1] ?? L
  const handles: Handle[] = [
    { key: 'height', label: 'ความสูง H', position: [L / 2, H + 0.18, 0], axis: [0, 1, 0], value: H, min: 0.3, max: 15, step: 0.05 },
    { key: 'length', label: 'ความยาว L', position: [L + 0.3, H / 2, 0], axis: [1, 0, 0], value: L, min: 0.5, max: 200, step: 0.05 },
    { key: 'thickness', label: 'ความหนา t', position: [-0.3, H, t / 2], axis: [0, 0, 1], value: t / 2, min: 0.05, max: 1.5, step: 0.025 },
    { key: 'studSpacing', label: 'ระยะเคร่า', position: [s1, H + 0.1, zW], axis: [1, 0, 0], value: s1, min: 0.05, max: 1.2, step: 0.05 },
  ]
  if (waleLevels.length > 1)
    handles.push({ key: 'waleSpacing', label: 'ระยะคานรับเคร่า', position: [-0.3, waleLevels[1], zOut], axis: [0, 1, 0], value: waleLevels[1] - waleLevels[0], min: 0.2, max: 3, step: 0.05 })
  if (tieX.length && waleLevels.length)
    handles.push({ key: 'tieSpacing', label: 'ระยะไทร์', position: [tieX[0], waleLevels[0], zOut + 0.12], axis: [1, 0, 0], value: tieX[0], min: 0.2, max: 3, step: 0.05 })
  return { parts, handles, bounds: bounds(parts) }
}

// ---------------------------------------------------------------- column

/** Column: b along x, h (long side, tie direction splits it) along z, centred at the origin. */
export function columnModel(inp: ColumnInput, d: ColumnDesign): FormModel {
  const shape = columnShapeOf(inp)
  if (shape.kind !== 'rect') return shapedColumnModel(inp, d, shape)
  const parts: Part[] = []
  const { b, h, height: H } = inp
  const ply = inp.sheathing.type === 'plywood' ? inp.sheathing.thicknessMm / 1000 : inp.sheathing.thicknessCm / 100
  const shKind = inp.sheathing.type === 'plywood' ? 'plywood' : 'timber'
  const stud = inp.sheathing.type === 'plywood' && inp.stud ? getSection(inp.stud.sectionId) : undefined
  const studKind = inp.stud ? getMaterial(inp.stud.materialId).kind : 'timber'
  const sb = stud ? cm(stud.B) : 0
  const sd = stud ? cm(stud.H) : 0
  const yoke = getSection(inp.yoke.sectionId)
  const yKind = getMaterial(inp.yoke.materialId).kind
  const yb = cm(yoke.B)
  const yd = cm(yoke.H)
  const o = ply + sd // outward offset from concrete face to the yoke's inner face
  const xOut = b / 2 + o + yd
  const zOut = h / 2 + o + yd
  const { yokeLevels, studsPerFace } = d.layout
  const pairH = inp.yoke.count === 2 ? 2 * yb + GAP : yb

  parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, H / 2, 0], size: [b, H, h] })
  for (const s of [1, -1]) {
    // ±z faces overlap the ±x faces at the corners
    parts.push({ id: `plyz${s}`, group: 'sheathing', kind: shKind, shape: 'box', center: [0, H / 2, s * (h / 2 + ply / 2)], size: [b + 2 * ply, H, ply] })
    parts.push({ id: `plyx${s}`, group: 'sheathing', kind: shKind, shape: 'box', center: [s * (b / 2 + ply / 2), H / 2, 0], size: [ply, H, h] })
    if (stud) {
      const spread = (w: number, n: number) => (n <= 1 ? [0] : Array.from({ length: n }, (_, i) => -w / 2 + sb / 2 + (i * (w - sb)) / (n - 1)))
      spread(b + 2 * ply, studsPerFace.short).forEach((x, i) =>
        parts.push({ id: `studz${s}-${i}`, group: 'stud', kind: studKind, shape: 'box', center: [x, H / 2, s * (h / 2 + ply + sd / 2)], size: [sb, H, sd] }),
      )
      spread(h, studsPerFace.long).forEach((z, i) =>
        parts.push({ id: `studx${s}-${i}`, group: 'stud', kind: studKind, shape: 'box', center: [s * (b / 2 + ply + sd / 2), H / 2, z], size: [sd, H, sb] }),
      )
    }
    yokeLevels.forEach((y, i) =>
      pairOffsets(inp.yoke.count, yb).forEach((off, k) => {
        // long yokes (along z, on the ±x faces) at y; short yokes (along x) sit on top of them
        parts.push({ id: `yokeL${s}-${i}-${k}`, group: 'yoke', kind: yKind, shape: 'box', center: [s * (b / 2 + o + yd / 2), y + off, 0], size: [yd, yb, 2 * zOut + 0.2] })
        parts.push({ id: `yokeS${s}-${i}-${k}`, group: 'yoke', kind: yKind, shape: 'box', center: [0, y + pairH + off, s * (h / 2 + o + yd / 2)], size: [2 * xOut + 0.2, yb, yd] })
      }),
    )
  }
  // corner bolts through the yoke ends
  const spans = columnTieSpans(inp.tie)
  const tp = tiePlate(inp.yoke.count, yb)
  yokeLevels.forEach((y, i) => {
    for (const sx of [1, -1])
      for (const sz of [1, -1])
        parts.push({ id: `bolt-${i}-${sx}${sz}`, group: 'tie', kind: 'tie', shape: 'bar', from: [sx * (xOut + 0.05), y - 0.02, sz * (zOut + 0.05)], to: [sx * (xOut + 0.05), y + 2 * pairH + 0.02, sz * (zOut + 0.05)], b: 0.012, d: 0.012, round: true })
    // ties through the long faces at the long-yoke level, through the short faces at the short-yoke level
    for (let j = 1; j < spans.long; j++) {
      const z = -h / 2 + (j * h) / spans.long
      parts.push({ id: `tie-${i}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: [-(xOut + 0.06), y, z], to: [xOut + 0.06, y, z], b: 0.012, d: 0.012, round: true })
      for (const s of [1, -1]) parts.push({ id: `tieplate${s}-${i}-${j}`, group: 'tie', kind: 'steel', shape: 'box', center: [s * (xOut + tp.t / 2), y, z], size: [tp.t, tp.across, tp.along] })
    }
    for (let j = 1; j < spans.short; j++) {
      const x = -b / 2 + (j * b) / spans.short
      parts.push({ id: `tieS-${i}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: [x, y + pairH, -(zOut + 0.06)], to: [x, y + pairH, zOut + 0.06], b: 0.012, d: 0.012, round: true })
      for (const s of [1, -1]) parts.push({ id: `tieplateS${s}-${i}-${j}`, group: 'tie', kind: 'steel', shape: 'box', center: [x, y + pairH, s * (zOut + tp.t / 2)], size: [tp.along, tp.across, tp.t] })
    }
  })

  // braces: perSide on each braced face (2 sides → the ±x faces)
  const br = getSection(inp.brace.sectionId)
  const brKind = getMaterial(inp.brace.materialId).kind
  const th = (inp.brace.angleDeg * Math.PI) / 180
  const hTop = Math.min(inp.brace.heightM ?? H, H)
  const run = hTop / Math.tan(th)
  const faces: { n: Vec3; out: number; w: number }[] = [
    { n: [1, 0, 0], out: xOut, w: h },
    { n: [-1, 0, 0], out: xOut, w: h },
    { n: [0, 0, 1], out: zOut, w: b },
    { n: [0, 0, -1], out: zOut, w: b },
  ].slice(0, inp.brace.sides) as { n: Vec3; out: number; w: number }[]
  faces.forEach((f, fi) => {
    for (let i = 0; i < inp.brace.perSide; i++) {
      const u = inp.brace.perSide === 1 ? 0 : -f.w / 2 + (i * f.w) / (inp.brace.perSide - 1)
      const along: Vec3 = f.n[0] !== 0 ? [0, 0, u] : [u, 0, 0]
      const at = (r: number, y: number): Vec3 => [along[0] + f.n[0] * r, y, along[2] + f.n[2] * r]
      parts.push({ id: `brace${fi}-${i}`, group: 'brace', kind: brKind, shape: 'bar', from: at(f.out, hTop), to: at(f.out + run, 0), b: cm(br.B), d: cm(br.H), round: br.shape === 'pipe' })
    }
  })

  const handles: Handle[] = [
    { key: 'height', label: 'ความสูง H', position: [0, H + 0.2, 0], axis: [0, 1, 0], value: H, min: 0.3, max: 15, step: 0.05 },
    { key: 'b', label: 'ด้าน b', position: [b / 2, H + 0.05, 0], axis: [1, 0, 0], value: b / 2, min: 0.05, max: 1.5, step: 0.025 },
    { key: 'h', label: 'ด้าน h', position: [0, H + 0.05, h / 2], axis: [0, 0, 1], value: h / 2, min: 0.05, max: 1.5, step: 0.025 },
  ]
  if (yokeLevels.length > 1)
    handles.push({ key: 'yokeSpacing', label: 'ระยะคานรัด', position: [xOut + 0.15, yokeLevels[1], 0], axis: [0, 1, 0], value: yokeLevels[1] - yokeLevels[0], min: 0.1, max: 1.5, step: 0.05 })
  return { parts, handles, bounds: bounds(parts) }
}

/** Vertical box of plan width w × thickness t on the plan direction φ, its centre at radius r. */
function onFace(id: string, group: PartGroup, kind: Part['kind'], phi: number, r: number, along: number, y: number, size: Vec3): BoxPart {
  const n: [number, number] = [Math.cos(phi), Math.sin(phi)]
  const t: [number, number] = [-n[1], n[0]]
  return { id, group, kind, shape: 'box', center: [n[0] * r + t[0] * along, y, n[1] * r + t[1] * along], size, yaw: yawFacing(phi) }
}

/**
 * Round or polygonal column, centred at the origin; a polygon's flats face ±z (and ±x for the octagon).
 * Staves in a square frame of cut-out yoke boards, a steel form in two halves (one BOM piece each), or a tube;
 * a polygon in a box of yokes with corner fillers, or in a ring of yokes along its faces.
 */
function shapedColumnModel(inp: ColumnInput, d: ColumnDesign, shape: Exclude<ColumnShape, { kind: 'rect' }>): FormModel {
  const parts: Part[] = []
  const { b: F, height: H } = inp
  const ply = inp.sheathing.type === 'plywood' ? inp.sheathing.thicknessMm / 1000 : inp.sheathing.thicknessCm / 100
  const shKind = inp.sheathing.type === 'plywood' ? 'plywood' : 'timber'
  const yoke = getSection(inp.yoke.sectionId)
  const yKind = getMaterial(inp.yoke.materialId).kind
  const yb = cm(yoke.B)
  const yd = cm(yoke.H)
  const { yokeLevels } = d.layout
  const pairH = inp.yoke.count === 2 ? 2 * yb + GAP : yb
  const bolt = (id: string, from: Vec3, to: Vec3): BarPart => ({ id, group: 'tie', kind: 'tie', shape: 'bar', from, to, b: 0.012, d: 0.012, round: true })
  let xOut: number
  let zOut: number
  let faceW: [number, number] // width of the ±x / ±z faces for the braces

  /** Box of yokes round a plan box bx × bz, `o` out from it, as round a rectangular column; returns its outer extent. */
  const boxFrame = (bx: number, bz: number, o: number): [number, number] => {
    const xo = bx / 2 + o + yd
    const zo = bz / 2 + o + yd
    const spans = columnTieSpans(inp.tie)
    const longZ = bz >= bx
    yokeLevels.forEach((y, i) => {
      pairOffsets(inp.yoke.count, yb).forEach((off, k) => {
        for (const s of [1, -1]) {
          parts.push({ id: `yokeL${s}-${i}-${k}`, group: 'yoke', kind: yKind, shape: 'box', center: [s * (bx / 2 + o + yd / 2), y + off, 0], size: [yd, yb, 2 * zo + 0.2] })
          parts.push({ id: `yokeS${s}-${i}-${k}`, group: 'yoke', kind: yKind, shape: 'box', center: [0, y + pairH + off, s * (bz / 2 + o + yd / 2)], size: [2 * xo + 0.2, yb, yd] })
        }
      })
      for (const sx of [1, -1]) for (const sz of [1, -1]) parts.push(bolt(`bolt-${i}-${sx}${sz}`, [sx * (xo + 0.05), y - 0.02, sz * (zo + 0.05)], [sx * (xo + 0.05), y + 2 * pairH + 0.02, sz * (zo + 0.05)]))
      // ties split the long yokes (through the long faces), and the short ones when asked
      const [L, S] = longZ ? [bz, bx] : [bx, bz]
      for (let j = 1; j < spans.long; j++) {
        const u = -L / 2 + (j * L) / spans.long
        parts.push(longZ ? bolt(`tie-${i}-${j}`, [-(xo + 0.06), y, u], [xo + 0.06, y, u]) : bolt(`tie-${i}-${j}`, [u, y + pairH, -(zo + 0.06)], [u, y + pairH, zo + 0.06]))
      }
      for (let j = 1; j < spans.short; j++) {
        const u = -S / 2 + (j * S) / spans.short
        parts.push(longZ ? bolt(`tieS-${i}-${j}`, [u, y + pairH, -(zo + 0.06)], [u, y + pairH, zo + 0.06]) : bolt(`tieS-${i}-${j}`, [-(xo + 0.06), y, u], [xo + 0.06, y, u]))
      }
    })
    return [xo, zo]
  }

  if (shape.kind === 'circle') {
    const r = F / 2
    parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, H / 2, 0], size: [F, H, F], plan: roundPlan(36, r) })
    if (shape.system === 'stave') {
      const N = d.layout.staves ?? 24
      const w = 2 * (r + ply / 2) * Math.tan(Math.PI / N)
      for (let k = 0; k < N; k++) parts.push(onFace(`stave-${k}`, 'sheathing', shKind, (2 * Math.PI * k) / N, r + ply / 2, 0, H / 2, [w * 0.985, H, ply]))
      // square frame of wide boards cut out to the circle (Ex 9.2), the boards' inner edges meeting on it at 45°;
      // the staves show through the cut-outs in plan
      const e = cutYokeInnerCm((r + ply) * 100) / 100
      xOut = zOut = e + yd
      yokeLevels.forEach((y, i) => {
        pairOffsets(inp.yoke.count, yb).forEach((off, k) => {
          for (const s of [1, -1]) {
            parts.push({ id: `yokeC${s}-${i}-${k}`, group: 'yoke', kind: yKind, shape: 'box', center: [s * (e + yd / 2), y + off, 0], size: [yd, yb, 2 * zOut + 0.1] })
            parts.push({ id: `yokeCS${s}-${i}-${k}`, group: 'yoke', kind: yKind, shape: 'box', center: [0, y + pairH + off, s * (e + yd / 2)], size: [2 * xOut + 0.1, yb, yd] })
          }
        })
        for (const sx of [1, -1]) for (const sz of [1, -1]) parts.push(bolt(`bolt-${i}-${sx}${sz}`, [sx * (xOut + 0.03), y - 0.02, sz * (zOut + 0.03)], [sx * (xOut + 0.03), y + 2 * pairH + 0.02, sz * (zOut + 0.03)]))
      })
    } else if (shape.system === 'steel') {
      const t = 0.004
      const M = 12
      const seg = 2 * (r + t / 2) * Math.tan(Math.PI / (2 * M))
      for (let h = 0; h < 2; h++) {
        for (let k = 0; k < M; k++) parts.push({ ...onFace(`shell-${h}-${k}`, 'sheathing', 'steel', h * Math.PI + ((k + 0.5) * Math.PI) / M, r + t / 2, 0, H / 2, [seg * 1.01, H, t]), piece: { id: `shell-${h}`, lengthM: H } })
        // flanges along both seams (φ = 0 and π); half 0 lies on +z
        for (const sx of [1, -1]) parts.push({ id: `flange-${h}-${sx}`, group: 'sheathing', kind: 'steel', shape: 'box', center: [sx * (r + 0.03), H / 2, (h ? -1 : 1) * 0.004], size: [0.06, H, 0.006], piece: { id: `shell-${h}`, lengthM: H } })
      }
      const s = d.layout.yokeSpacing / 100
      let j = 0
      for (let y = s / 2; y < H; y += s) for (const sx of [1, -1]) parts.push(bolt(`flbolt-${j++}`, [sx * (r + 0.035), y, -0.025], [sx * (r + 0.035), y, 0.025]))
      xOut = r + 0.06
      zOut = r + t
    } else {
      const t = 0.008
      const M = 24
      const seg = 2 * (r + t / 2) * Math.tan(Math.PI / M)
      for (let k = 0; k < M; k++) parts.push({ ...onFace(`tube-${k}`, 'sheathing', 'timber', (2 * Math.PI * k) / M, r + t / 2, 0, H / 2, [seg * 1.01, H, t]), piece: { id: 'tube', lengthM: H } })
      xOut = zOut = r + t
    }
    faceW = [F, F]
  } else if (shape.kind === 'polygon') {
    const { n } = shape
    const { R, a } = polygonDims(n, F)
    const faces = polygonFaces(n, F)
    const [bx, bz] = polygonBox(n, F)
    const tanH = Math.tan(Math.PI / n)
    const stud = inp.sheathing.type === 'plywood' && inp.stud ? getSection(inp.stud.sectionId) : undefined
    const studKind = inp.stud ? getMaterial(inp.stud.materialId).kind : 'timber'
    const sb = stud ? cm(stud.B) : 0
    const sd = stud ? cm(stud.H) : 0
    const o = ply + sd
    const ring = shape.yoke === 'ring'
    parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, H / 2, 0], size: [bx, H, bz], plan: regularPlan(n, R) })
    faces.forEach((f, k) => {
      parts.push(onFace(`ply-${k}`, 'sheathing', shKind, f.phi, F / 2 + ply / 2, 0, H / 2, [a + 2 * ply * tanH, H, ply]))
      const flat = Math.abs(Math.cos(f.phi)) < 1e-6 || Math.abs(Math.sin(f.phi)) < 1e-6
      if (ring || flat) {
        const m = d.layout.faceStuds ?? 0
        if (stud && m) for (let j = 0; j < m; j++) parts.push(onFace(`stud-${k}-${j}`, 'stud', studKind, f.phi, F / 2 + ply + sd / 2, m === 1 ? 0 : -a / 2 + sb / 2 + (j * (a - sb)) / (m - 1), H / 2, [sb, H, sd]))
        return
      }
      // filler behind a sloping face, out to the box of yokes (both outer corners inside the box)
      const hx = bx / 2 + o
      const hz = bz / 2 + o
      const w = a / 2
      const nx = Math.abs(Math.cos(f.phi))
      const nz = Math.abs(Math.sin(f.phi))
      const rOut = Math.min(nx > 1e-6 ? (hx - (w / 2) * nz) / nx : Infinity, nz > 1e-6 ? (hz - (w / 2) * nx) / nz : Infinity)
      const rIn = F / 2 + ply
      parts.push(onFace(`filler-${k}`, 'stud', studKind, f.phi, (rIn + rOut) / 2, 0, H / 2, [w, H, rOut - rIn]))
    })
    if (ring) {
      const rr = F / 2 + o + yd / 2
      yokeLevels.forEach((y, i) => {
        pairOffsets(inp.yoke.count, yb).forEach((off, ko) => faces.forEach((f, k) => parts.push(onFace(`yokeR-${i}-${k}-${ko}`, 'yoke', yKind, f.phi, rr, 0, y + off, [a + 2 * (o + yd / 2) * tanH, yb, yd]))))
        // corner brackets
        const rc = (F / 2 + o + yd) / Math.cos(Math.PI / n)
        faces.forEach((f, k) => {
          const c = f.phi + Math.PI / n
          parts.push(bolt(`bracket-${i}-${k}`, [rc * Math.cos(c), y - 0.02 - yb, rc * Math.sin(c)], [rc * Math.cos(c), y + pairH + 0.02, rc * Math.sin(c)]))
        })
      })
      // the hexagon's ±x sides end in a corner
      xOut = n === 8 ? F / 2 + o + yd : (F / 2 + o + yd) / Math.cos(Math.PI / n)
      zOut = F / 2 + o + yd
    } else [xOut, zOut] = boxFrame(bx, bz, o)
    faceW = [bz, bx]
  } else {
    // L / T / U, centred on its box: x right, z as drawn (the outline runs down the page)
    const [bx, bz] = legBox(shape)
    const q = legOutline(shape).map(([x, z]) => [x - bx / 2, z - bz / 2] as [number, number])
    const stud = inp.sheathing.type === 'plywood' && inp.stud ? getSection(inp.stud.sectionId) : undefined
    const studKind = inp.stud ? getMaterial(inp.stud.materialId).kind : 'timber'
    const sb = stud ? cm(stud.B) : 0
    const sd = stud ? cm(stud.H) : 0
    const o = ply + sd
    const tied = shape.yoke === 'tied'
    parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, H / 2, 0], size: [bx, H, bz], plan: q })
    const nq = q.length
    const area2 = q.reduce((s, a, k) => s + a[0] * q[(k + 1) % nq][1] - q[(k + 1) % nq][0] * a[1], 0)
    const edges = q.map((a, k) => {
      const b = q[(k + 1) % nq]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      const dir: [number, number] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]
      const n: [number, number] = area2 > 0 ? [dir[1], -dir[0]] : [-dir[1], dir[0]]
      return { a, b, L, dir, n, phi: Math.atan2(n[1], n[0]), alongX: Math.abs(dir[1]) < 1e-9 }
    })
    // a corner is convex when the outline turns the way it winds
    const convex = edges.map((e, k) => {
      const p = edges[(k - 1 + nq) % nq].dir
      return (p[0] * e.dir[1] - p[1] * e.dir[0]) * area2 > 0
    })
    /** box along edge e, `off` out from the face, ends moved out by eA / eB (negative: in) */
    const along = (id: string, group: PartGroup, kind: Part['kind'], e: (typeof edges)[number], off: number, eA: number, eB: number, y: number, h: number, t: number): BoxPart => {
      const m = (eB - eA) / 2
      const c: [number, number] = [(e.a[0] + e.b[0]) / 2 + e.dir[0] * m + e.n[0] * off, (e.a[1] + e.b[1]) / 2 + e.dir[1] * m + e.n[1] * off]
      return { id, group, kind, shape: 'box', center: [c[0], y, c[1]], size: [e.L + eA + eB, h, t], yaw: yawFacing(e.phi) }
    }
    const onBox = (e: (typeof edges)[number]) => (e.alongX ? Math.abs(Math.abs(e.a[1]) - bz / 2) < 1e-9 : Math.abs(Math.abs(e.a[0]) - bx / 2) < 1e-9)
    edges.forEach((e, k) => {
      const j = (k + 1) % nq
      const end = (cv: boolean, x: number) => (cv ? x : -x)
      parts.push(along(`ply-${k}`, 'sheathing', shKind, e, ply / 2, end(convex[k], ply), end(convex[j], ply), H / 2, H, ply))
      // studs on every face; in a box only on the faces against it (the filler boxes back the others)
      if (stud && d.layout.studSpacing && (tied || onBox(e))) {
        const mA = convex[k] ? sb / 2 : o + sb / 2
        const mB = convex[j] ? sb / 2 : o + sb / 2
        const avail = Math.max(e.L - mA - mB, 0)
        const m = Math.ceil((avail * 100) / d.layout.studSpacing) + 1
        for (let i = 0; i < m; i++) {
          const u = m === 1 ? e.L / 2 : mA + (i * avail) / (m - 1)
          const c: [number, number] = [e.a[0] + e.dir[0] * u + e.n[0] * (ply + sd / 2), e.a[1] + e.dir[1] * u + e.n[1] * (ply + sd / 2)]
          parts.push({ id: `stud-${k}-${i}`, group: 'stud', kind: studKind, shape: 'box', center: [c[0], H / 2, c[1]], size: [sb, H, sd], yaw: yawFacing(e.phi) })
        }
      }
    })
    if (tied) {
      // a yoke along every face: past the convex corners (bolted where they cross), to the inner corners' mitre;
      // the faces along x sit one yoke set higher so the yokes cross as on a rectangular column
      const oy = o + yd / 2
      const ext = o + yd + 0.05
      yokeLevels.forEach((y, i) => {
        edges.forEach((e, k) => {
          const j = (k + 1) % nq
          const lift = e.alongX ? pairH : 0
          pairOffsets(inp.yoke.count, yb).forEach((off, ko) => parts.push(along(`yokeF-${i}-${k}-${ko}`, 'yoke', yKind, e, oy, convex[k] ? ext : -oy, convex[j] ? ext : -oy, y + lift + off, yb, yd)))
          if (convex[j]) {
            const n2 = edges[j].n
            const c: [number, number] = [e.b[0] + (e.n[0] + n2[0]) * (o + yd + 0.03), e.b[1] + (e.n[1] + n2[1]) * (o + yd + 0.03)]
            parts.push(bolt(`bolt-${i}-${k}`, [c[0], y - 0.02, c[1]], [c[0], y + 2 * pairH + 0.02, c[1]]))
          }
        })
        // ties through every leg at the inner corner(s), along the legs and across the core
        const nSp = Math.max(1, Math.round(inp.tie.spans))
        const lay = legLayout(shape)
        const runs = [
          ...lay.legs.flatMap((g) => legTies(g, nSp, Math.min(o + yd, g.L / 3)).map((u) => ({ o: g.o, dir: g.dir, across: g.across, len: g.t, u }))),
          ...[...lay.core, ...lay.ends].flatMap((k) => coreTies(k, nSp).map((u) => ({ o: k.o, dir: k.dir, across: k.across, len: k.len, u }))),
        ]
        runs.forEach((g, ti) => {
          const p0: [number, number] = [g.o[0] - bx / 2 + g.dir[0] * g.u, g.o[1] - bz / 2 + g.dir[1] * g.u]
          const xt = o + yd + 0.05
          const lift = Math.abs(g.across[0]) < 1e-9 ? pairH : 0
          parts.push(bolt(`tie-${i}-${ti}`, [p0[0] - g.across[0] * xt, y + lift, p0[1] - g.across[1] * xt], [p0[0] + g.across[0] * (g.len + xt), y + lift, p0[1] + g.across[1] * (g.len + xt)]))
        })
      })
      xOut = bx / 2 + o + yd
      zOut = bz / 2 + o + yd
    } else {
      // filler boxes from the inner faces' sheathing out to the box of yokes (Fig 9.2)
      legLayout(shape).fillers.forEach(([x, z, w, dd], k) => {
        const x0 = x - bx / 2 + (x < 1e-9 ? -o : ply)
        const x1 = x + w - bx / 2 + (Math.abs(x + w - bx) < 1e-9 ? o : -ply)
        const z0 = z - bz / 2 + (z < 1e-9 ? -o : ply)
        const z1 = z + dd - bz / 2 + (Math.abs(z + dd - bz) < 1e-9 ? o : -ply)
        parts.push({ id: `fillbox-${k}`, group: 'stud', kind: studKind, shape: 'box', center: [(x0 + x1) / 2, H / 2, (z0 + z1) / 2], size: [x1 - x0, H, z1 - z0] })
      })
      ;[xOut, zOut] = boxFrame(bx, bz, o)
    }
    faceW = [bz, bx]
  }

  // braces, as on a rectangular column: the ±x faces first
  const br = getSection(inp.brace.sectionId)
  const brKind = getMaterial(inp.brace.materialId).kind
  const th = (inp.brace.angleDeg * Math.PI) / 180
  const hTop = Math.min(inp.brace.heightM ?? H, H)
  const run = hTop / Math.tan(th)
  const sides: { n: Vec3; out: number; w: number }[] = [
    { n: [1, 0, 0], out: xOut, w: faceW[0] },
    { n: [-1, 0, 0], out: xOut, w: faceW[0] },
    { n: [0, 0, 1], out: zOut, w: faceW[1] },
    { n: [0, 0, -1], out: zOut, w: faceW[1] },
  ]
  sides.slice(0, inp.brace.sides).forEach((f, fi) => {
    for (let i = 0; i < inp.brace.perSide; i++) {
      // braces on a round or polygonal face bear near its middle
      const u = inp.brace.perSide === 1 ? 0 : (-f.w / 4 + (i * f.w) / 2 / (inp.brace.perSide - 1)) * (shape.kind === 'circle' ? 0.8 : 1)
      const along: Vec3 = f.n[0] !== 0 ? [0, 0, u] : [u, 0, 0]
      const at = (r: number, y: number): Vec3 => [along[0] + f.n[0] * r, y, along[2] + f.n[2] * r]
      parts.push({ id: `brace${fi}-${i}`, group: 'brace', kind: brKind, shape: 'bar', from: at(f.out, hTop), to: at(f.out + run, 0), b: cm(br.B), d: cm(br.H), round: br.shape === 'pipe' })
    }
  })

  const label = shape.kind === 'circle' ? 'เส้นผ่านศูนย์กลาง D' : 'ระยะข้ามด้านแบน F'
  const handles: Handle[] = [
    { key: 'height', label: 'ความสูง H', position: [0, H + 0.2, 0], axis: [0, 1, 0], value: H, min: 0.3, max: 15, step: 0.05 },
    // one size to drag on a round / polygonal column; an L/T/U is sized in the form
    ...(shape.kind === 'circle' || shape.kind === 'polygon' ? [{ key: 'b' as const, label, position: [F / 2, H + 0.05, 0] as Vec3, axis: [1, 0, 0] as Vec3, value: F / 2, min: 0.075, max: 1.5, step: 0.025 }] : []),
  ]
  if (yokeLevels.length > 1)
    handles.push({ key: 'yokeSpacing', label: 'ระยะคานรัด', position: [xOut + 0.15, yokeLevels[1], 0], axis: [0, 1, 0], value: yokeLevels[1] - yokeLevels[0], min: 0.1, max: 1.5, step: 0.05 })
  return { parts, handles, bounds: bounds(parts) }
}

// ---------------------------------------------------------------- editing through handles

export const snap = (v: number, step: number) => Math.round(v / step) * step
export const round3 = (v: number) => Math.round(v * 1000) / 1000

/** New wall input after dragging handle `key` to `value` (m along its axis). */
export function applyWallHandle(inp: WallInput, key: HandleKey, value: number): WallInput {
  const cmv = Math.round(snap(value, 0.05) * 100)
  switch (key) {
    case 'height':
      return { ...inp, height: round3(snap(value, 0.05)) }
    case 'length':
      return { ...inp, length: round3(snap(value, 0.05)) }
    case 'thickness':
      return { ...inp, thickness: round3(snap(value * 2, 0.05)) }
    case 'studSpacing':
      return { ...inp, stud: { ...inp.stud, spacingCm: cmv } }
    case 'waleSpacing':
      return { ...inp, wale: { ...inp.wale, spacingCm: cmv } }
    case 'tieSpacing':
      return { ...inp, tie: { ...inp.tie, spacingCm: cmv } }
    default:
      return inp
  }
}

export function applyColumnHandle(inp: ColumnInput, key: HandleKey, value: number): ColumnInput {
  switch (key) {
    case 'height':
      return { ...inp, height: round3(snap(value, 0.05)) }
    case 'b': {
      const b = round3(snap(value * 2, 0.05))
      // round / polygon: one size, b = h; an L/T/U keeps its sizes in the shape
      const k = columnShapeOf(inp).kind
      return k === 'rect' ? { ...inp, b } : k === 'circle' || k === 'polygon' ? { ...inp, b, h: b } : inp
    }
    case 'h':
      return { ...inp, h: round3(snap(value * 2, 0.05)) }
    case 'yokeSpacing':
      return { ...inp, yoke: { ...inp.yoke, spacingCm: Math.round(snap(value, 0.05) * 100) } }
    default:
      return inp
  }
}

/** Design component (engine `ComponentResult.key`) that a part group is checked by. */
export const GROUP_COMPONENT: Record<PartGroup, string | undefined> = {
  concrete: undefined,
  sheathing: 'sheathing',
  stud: 'stud',
  wale: 'wale',
  yoke: 'yoke',
  tie: 'tie',
  brace: 'brace',
  joist: 'joist',
  stringer: 'stringer',
  shore: 'shore',
  bracing: 'bracing',
  bottom: 'bottom',
  head: 'head',
  stake: 'stake',
}

export const GROUP_LABEL: Record<PartGroup, string> = {
  concrete: 'คอนกรีต',
  sheathing: 'แผ่นผิวแบบ',
  stud: 'เคร่าตั้ง',
  wale: 'คานรับเคร่า',
  yoke: 'คานรัดแบบ',
  tie: 'Form tie / สลักเกลียว',
  brace: 'ค้ำยัน',
  joist: 'ตง',
  stringer: 'คานรองรับ',
  shore: 'เสาค้ำ / นั่งร้าน',
  bracing: 'ค้ำยันทางข้าง',
  bottom: 'ท้องแบบ',
  head: 'คานขวาง',
  stake: 'หลักยึด',
}
