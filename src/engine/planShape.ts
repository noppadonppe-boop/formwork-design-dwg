// Plan shape of a column section. The rectangle (b × h) is the default; a round column and the regular
// hexagon/octagon keep their one size in b = h (D, or F = distance across the flats).
//   circle  — vertical staves in a square frame of wide boards cut out to the circle (Ex 9.2: each board spans D,
//             F = w·D/2, M = w·D²/8 on the net section), a bolted steel form, or a cardboard tube; plywood bends
//             round only to large radii (APA, dry, across the face grain);
//   polygon — a square/rectangular box of yokes with corner fillers behind the sloping faces (the rectangle
//             design on the box), or a ring of yokes along the faces: span a, M = w·a²/8, T = w·F/2.
//   L, T, U — sizes in the shape; yokes along every face with ties through each leg at the inner corners (the
//             section splits into rectangular legs, each like a rectangular column whose root is held by the
//             tie), or a rectangular box of yokes with timber filler boxes in the re-entrant corners (Fig 9.2).

export type CircleSystem = 'stave' | 'steel' | 'tube'
export type PolygonYoke = 'box' | 'ring'
export type LegYoke = 'tied' | 'box'

export type ColumnShape =
  | { kind: 'rect' }
  | {
      kind: 'circle'
      system: CircleSystem
      /** steel form / tube: allowable pressure from the maker, kg/m² */
      ratedKgM2?: number
      /** staves: net depth of a yoke board at its cut-out, cm (default from the geometry) */
      netCm?: number
    }
  | { kind: 'polygon'; n: 6 | 8; yoke: PolygonYoke }
  /** L: overall a (x) × b (z), m; ta = thickness of the leg along a, tb = of the leg along b */
  | { kind: 'L'; a: number; b: number; ta: number; tb: number; yoke: LegYoke }
  /** T: flange bf × tf, web tw, overall depth d, m */
  | { kind: 'T'; bf: number; tf: number; tw: number; d: number; yoke: LegYoke }
  /** U: overall b × d, legs t, base tb (open side up), m */
  | { kind: 'U'; b: number; d: number; t: number; tb: number; yoke: LegYoke }

export type LegShape = Extract<ColumnShape, { kind: 'L' | 'T' | 'U' }>
export const isLegShape = (s: ColumnShape): s is LegShape => s.kind === 'L' || s.kind === 'T' || s.kind === 'U'

export const RECT_SHAPE: ColumnShape = { kind: 'rect' }
export const columnShapeOf = (inp: { shape?: ColumnShape }): ColumnShape => inp.shape ?? RECT_SHAPE

/** Default allowable pressure of a ready-made round form, kg/m² — replace with the maker's figure. */
export const RATED_PRESSURE: Record<Exclude<CircleSystem, 'stave'>, number> = { steel: 6000, tube: 3000 }
/** Widest stave across the face of a round column, cm (keeps the facets close to the circle). */
export const STAVE_WIDTH = 7.5

/**
 * Square frame of yoke boards round a circle of radius ro (outside of the staves), cm: the boards' inner edges
 * meet on the circle at 45°, so each board is cut ro(1 − cos 45°) deep at mid-length.
 */
export const cutYokeInnerCm = (roCm: number) => roCm * Math.SQRT1_2
export const cutYokeNetCm = (boardCm: number, roCm: number) => boardCm - (roCm - cutYokeInnerCm(roCm))

/** Smallest radius a dry plywood sheet bends to across the face grain, m (APA). */
export const PLY_BEND_RADIUS: [number, number][] = [
  [6, 0.6],
  [9, 0.9],
  [12, 1.8],
  [15, 2.4],
  [18, 3.6],
]
export function plywoodBendRadius(thicknessMm: number): number {
  return (PLY_BEND_RADIUS.find(([t]) => thicknessMm <= t) ?? PLY_BEND_RADIUS[PLY_BEND_RADIUS.length - 1])[1]
}

/** Regular n-gon of width F across the flats: circumradius R, side a. */
export function polygonDims(n: number, F: number): { R: number; a: number } {
  return { R: F / (2 * Math.cos(Math.PI / n)), a: F * Math.tan(Math.PI / n) }
}

/**
 * Faces of a regular n-gon centred at the origin of the x–z plan: outward normal angle φ (from +x towards +z),
 * centre and width. Flats face ±z (and ±x for the octagon).
 */
export function polygonFaces(n: number, F: number): { phi: number; c: [number, number]; a: number }[] {
  const { a } = polygonDims(n, F)
  return Array.from({ length: n }, (_, k) => {
    const phi = Math.PI / 2 + (2 * Math.PI * k) / n
    return { phi, c: [(F / 2) * Math.cos(phi), (F / 2) * Math.sin(phi)] as [number, number], a }
  })
}

/** Plan box (x × z, m) round a polygon: across the corners × across the flats for the hexagon, F × F for the octagon. */
export function polygonBox(n: number, F: number): [number, number] {
  return n === 6 ? [2 * polygonDims(n, F).R, F] : [F, F]
}

type P2 = [number, number]

/** Outline of an L/T/U section, m: x right, z down from the top-left corner of its box (an L's legs on top and left). */
export function legOutline(s: LegShape): P2[] {
  switch (s.kind) {
    case 'L':
      return [[0, 0], [s.a, 0], [s.a, s.ta], [s.tb, s.ta], [s.tb, s.b], [0, s.b]]
    case 'T': {
      const l = (s.bf - s.tw) / 2
      const r = l + s.tw
      return [[0, 0], [s.bf, 0], [s.bf, s.tf], [r, s.tf], [r, s.d], [l, s.d], [l, s.tf], [0, s.tf]]
    }
    case 'U':
      return [[0, 0], [s.t, 0], [s.t, s.d - s.tb], [s.b - s.t, s.d - s.tb], [s.b - s.t, 0], [s.b, 0], [s.b, s.d], [0, s.d]]
  }
}

/** Plan box of an L/T/U section (x × z), m. */
export function legBox(s: LegShape): P2 {
  return s.kind === 'L' ? [s.a, s.b] : s.kind === 'T' ? [s.bf, s.d] : [s.b, s.d]
}

/**
 * A rectangular leg of an L/T/U section, m. Its root is at the inner corner, where a tie through the leg holds its
 * two long-face yokes; `o` lies on one long face at the root, `dir` runs along the leg, `across` through it (length t).
 * far: 'free' — the far end is a short end face (end yoke); 'tied' — tied at both ends (the base of a U).
 * c: span of the outer yoke on the other side of the root tie (towards the corner).
 */
export interface Leg {
  name: string
  t: number
  L: number
  far: 'free' | 'tied'
  c: number
  o: P2
  dir: P2
  across: P2
}

export interface LegLayout {
  legs: Leg[]
  /** outer-yoke spans at the corners of the core: span c, with the perpendicular span cp giving the tension */
  core: { c: number; cp: number }[]
  /** box mode: filler boxes in the re-entrant corners [x, z, w (x), d (z)] in box coordinates, m */
  fillers: [number, number, number, number][]
  /** U: clear width between the legs, m */
  gap?: number
}

export function legLayout(s: LegShape): LegLayout {
  switch (s.kind) {
    case 'L':
      return {
        legs: [
          { name: 'ขาแนว a', t: s.ta, L: s.a - s.tb, far: 'free', c: s.tb, o: [s.tb, 0], dir: [1, 0], across: [0, 1] },
          { name: 'ขาแนว b', t: s.tb, L: s.b - s.ta, far: 'free', c: s.ta, o: [0, s.ta], dir: [0, 1], across: [1, 0] },
        ],
        core: [
          { c: s.tb, cp: s.ta },
          { c: s.ta, cp: s.tb },
        ],
        fillers: [[s.tb, s.ta, s.a - s.tb, s.b - s.ta]],
      }
    case 'T': {
      const l = (s.bf - s.tw) / 2
      const r = l + s.tw
      return {
        legs: [
          { name: 'ปีกซ้าย', t: s.tf, L: l, far: 'free', c: s.tw, o: [l, 0], dir: [-1, 0], across: [0, 1] },
          { name: 'ปีกขวา', t: s.tf, L: l, far: 'free', c: s.tw, o: [r, 0], dir: [1, 0], across: [0, 1] },
          { name: 'เอว', t: s.tw, L: s.d - s.tf, far: 'free', c: 0, o: [l, s.tf], dir: [0, 1], across: [1, 0] },
        ],
        core: [{ c: s.tw, cp: s.tf }],
        fillers: [
          [0, s.tf, l, s.d - s.tf],
          [r, s.tf, l, s.d - s.tf],
        ],
      }
    }
    case 'U':
      return {
        legs: [
          { name: 'ขาซ้าย', t: s.t, L: s.d - s.tb, far: 'free', c: s.tb, o: [0, s.d - s.tb], dir: [0, -1], across: [1, 0] },
          { name: 'ขาขวา', t: s.t, L: s.d - s.tb, far: 'free', c: s.tb, o: [s.b - s.t, s.d - s.tb], dir: [0, -1], across: [1, 0] },
          { name: 'ท้อง', t: s.tb, L: s.b - 2 * s.t, far: 'tied', c: s.t, o: [s.t, s.d - s.tb], dir: [1, 0], across: [0, 1] },
        ],
        core: [
          { c: s.t, cp: s.tb },
          { c: s.tb, cp: s.t },
        ],
        fillers: [[s.t, 0, s.b - 2 * s.t, s.d - s.tb]],
        gap: s.b - 2 * s.t,
      }
  }
}

/** Ties through a leg, as distances along it from the root: the root tie(s) `delta` in from the corner, and
 * n − 1 more splitting the leg into n spans. */
export function legTies(leg: Leg, n: number, delta: number): number[] {
  const out = [delta]
  for (let k = 1; k < n; k++) out.push((leg.L * k) / n)
  if (leg.far === 'tied') out.push(leg.L - delta)
  return out
}

/** Face lengths of an L/T/U, m; `outerOnly`: just the faces on its box (the others backed by filler boxes). */
export function legStudFaces(s: LegShape, outerOnly: boolean): number[] {
  const q = legOutline(s)
  const [bx, bz] = legBox(s)
  const on = (v: number, m: number) => Math.abs(v) < 1e-9 || Math.abs(v - m) < 1e-9
  return q.flatMap((a, k) => {
    const b = q[(k + 1) % q.length]
    const outer = (a[0] === b[0] && on(a[0], bx)) || (a[1] === b[1] && on(a[1], bz))
    return outerOnly && !outer ? [] : [Math.hypot(b[0] - a[0], b[1] - a[1])]
  })
}

/** Ties every L/T/U form needs at its inner corners (one per leg, two for a leg tied at both ends). */
export const requiredTies = (s: LegShape) => legLayout(s).legs.reduce((n, l) => n + (l.far === 'tied' ? 2 : 1), 0)

const shoelace = (q: P2[]) => Math.abs(q.reduce((a, p, k) => a + p[0] * q[(k + 1) % q.length][1] - q[(k + 1) % q.length][0] * p[1], 0)) / 2
const loop = (q: P2[]) => q.reduce((a, p, k) => a + Math.hypot(q[(k + 1) % q.length][0] - p[0], q[(k + 1) % q.length][1] - p[1]), 0)

/** Section of a column: area m², perimeter m, least thickness d for the lateral pressure, m. */
export function columnSection(inp: { b: number; h: number; shape?: ColumnShape }): { area: number; perimeter: number; d: number } {
  const s = columnShapeOf(inp)
  if (isLegShape(s)) {
    const q = legOutline(s)
    return { area: shoelace(q), perimeter: loop(q), d: Math.min(...legLayout(s).legs.map((l) => l.t)) }
  }
  if (s.kind === 'circle') return { area: (Math.PI * inp.b ** 2) / 4, perimeter: Math.PI * inp.b, d: inp.b }
  if (s.kind === 'polygon') {
    const { a } = polygonDims(s.n, inp.b)
    return { area: (s.n * a * inp.b) / 4, perimeter: s.n * a, d: inp.b }
  }
  return { area: inp.b * inp.h, perimeter: 2 * (inp.b + inp.h), d: Math.min(inp.b, inp.h) }
}

export const SHAPE_NAME: Record<string, string> = { rect: 'สี่เหลี่ยม', circle: 'กลม', 6: 'หกเหลี่ยม', 8: 'แปดเหลี่ยม', L: 'ตัว L', T: 'ตัว T', U: 'ตัว U' }
export const CIRCLE_SYSTEM_LABEL: Record<CircleSystem, string> = { stave: 'ไม้ระแนงตั้ง + คานรัดเจาะโค้ง', steel: 'แบบเหล็กสำเร็จรูป', tube: 'ท่อกระดาษ' }
export const POLYGON_YOKE_LABEL: Record<PolygonYoke, string> = { box: 'กรอบสี่เหลี่ยม + ไม้อุดมุม', ring: 'วงแหวนตามรูป' }
export const LEG_YOKE_LABEL: Record<LegYoke, string> = { tied: 'คานรัดตามหน้า + ไทร์มุมใน', box: 'กรอบสี่เหลี่ยม + กล่องไม้อุด' }

/** "กลม Ø50 ซม." / "หกเหลี่ยม F 60 ซม." / "ตัว L 80×80 หนา 25/25 ซม." / "30×60 ซม." */
export function columnSizeText(inp: { b: number; h: number; shape?: ColumnShape }): string {
  const s = columnShapeOf(inp)
  const cm = (v: number) => (v * 100).toFixed(0)
  if (s.kind === 'circle') return `กลม Ø${cm(inp.b)} ซม.`
  if (s.kind === 'polygon') return `${SHAPE_NAME[s.n]} F ${cm(inp.b)} ซม.`
  if (s.kind === 'L') return `ตัว L ${cm(s.a)}×${cm(s.b)} หนา ${cm(s.ta)}/${cm(s.tb)} ซม.`
  if (s.kind === 'T') return `ตัว T ${cm(s.bf)}×${cm(s.d)} ปีก ${cm(s.tf)} เอว ${cm(s.tw)} ซม.`
  if (s.kind === 'U') return `ตัว U ${cm(s.b)}×${cm(s.d)} ขา ${cm(s.t)} ท้อง ${cm(s.tb)} ซม.`
  return `${cm(inp.b)}×${cm(inp.h)} ซม.`
}

/** How the form is built, in words (empty for the rectangle). */
export function columnShapeSystem(shape: ColumnShape): string {
  if (shape.kind === 'circle') return CIRCLE_SYSTEM_LABEL[shape.system]
  if (shape.kind === 'polygon') return `คานรัด${POLYGON_YOKE_LABEL[shape.yoke]}`
  if (isLegShape(shape)) return shape.yoke === 'tied' ? `${LEG_YOKE_LABEL.tied} ${requiredTies(shape)} แถว` : LEG_YOKE_LABEL.box
  return ''
}
