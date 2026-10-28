// Section properties. Units: cm, cm², cm³, cm⁴, kg/m.
// Timber uses the book's convention 1" = 2.5 cm (e.g. 1½"×3" = 3.75×7.5 cm, 2"×4" = 5×10 cm).
// Steel properties are from book Table 3.15 (A, w, Zx, Zy); Ix = Zx·H/2 for sections symmetric about x
// (matches the values the examples use: [100×50×20×2.3 Ix 80.7, □100×50×2.3 Ix 84.8).

export type SectionShape = 'rect' | 'box' | 'rhs' | 'lipC' | 'channel' | 'angle' | 'pipe' | 'plywood' | 'round'

export interface Section {
  id: string
  label: string
  shape: SectionShape
  /** depth in bending plane, cm */
  H: number
  /** width, cm */
  B: number
  /** wall thickness for steel, cm */
  t?: number
  A: number
  Ix: number
  Sx: number
  /** least radius of gyration, cm (for buckling) */
  rMin: number
  /** least dimension, cm (timber l/d) */
  dMin: number
  /** web area for steel shear v = V/(b_w·d), cm² */
  Aweb?: number
  /** weight kg/m (steel) */
  w?: number
}

export const INCH_BOOK = 2.5

export function rect(b: number, h: number, id = `rect-${b}x${h}`, label = `${b}×${h} ซม.`): Section {
  const A = b * h
  const Ix = (b * h ** 3) / 12
  const Iy = (h * b ** 3) / 12
  return {
    id,
    label,
    shape: 'rect',
    H: h,
    B: b,
    A,
    Ix,
    Sx: (b * h ** 2) / 6,
    rMin: Math.sqrt(Math.min(Ix, Iy) / A),
    dMin: Math.min(b, h),
  }
}

/** Nominal lumber "b×h" in inches using the book's 2.5 cm/inch convention. */
export function timber(bIn: number, hIn: number, inch = INCH_BOOK): Section {
  const name = (x: number) => (x === 1.5 ? '1½' : x === 0.75 ? '¾' : x === 2.5 ? '2½' : String(x))
  return rect(bIn * inch, hIn * inch, `timber-${bIn}x${hIn}`, `${name(bIn)}"×${name(hIn)}"`)
}

/** Board lying flat: width b_cm, thickness t_cm — used for column board sheathing. */
export function board(widthCm: number, tCm: number): Section {
  return rect(widthCm, tCm, `board-${widthCm}x${tCm}`, `แผ่นไม้ ${widthCm}×${tCm} ซม.`)
}

/** Plywood strip of width b (default 100 cm = 1 m strip as the book uses). t in mm. */
export function plywoodStrip(tMm: number, b = 100): Section {
  const t = tMm / 10
  return { ...rect(b, t, `ply-${tMm}`, `ไม้อัด ${tMm} มม.`), shape: 'plywood' }
}

export const TIMBER_SIZES: [number, number][] = [
  [1.5, 3],
  [1.5, 4],
  [2, 3],
  [2, 4],
  [2, 6],
  [2, 8],
  [3, 3],
  [3, 4],
  [4, 4],
  // wide boards — yokes of a round column, cut out to the circle (Ex 9.2)
  [1, 8],
  [1, 10],
  [1, 12],
]

export const PLYWOOD_THICKNESS = [10, 12, 15, 18, 20, 25]

interface SteelRow {
  shape: SectionShape
  H: number
  B: number
  C?: number
  t: number
  w: number
  A: number
  Zx: number
  Zy: number
}

/** Book Table 3.15 (selected rows). Dimensions mm, A cm², Z cm³. */
const STEEL_ROWS: SteelRow[] = [
  // square tubes (ค)
  { shape: 'box', H: 50, B: 50, t: 1.6, w: 2.38, A: 3.032, Zx: 4.68, Zy: 4.68 },
  { shape: 'box', H: 50, B: 50, t: 2.3, w: 3.34, A: 4.252, Zx: 6.34, Zy: 6.34 },
  { shape: 'box', H: 60, B: 60, t: 2.3, w: 4.06, A: 5.172, Zx: 9.44, Zy: 9.44 },
  { shape: 'box', H: 75, B: 75, t: 2.3, w: 5.14, A: 6.552, Zx: 15.23, Zy: 15.23 },
  { shape: 'box', H: 75, B: 75, t: 3.2, w: 7.01, A: 8.927, Zx: 20.14, Zy: 20.14 },
  { shape: 'box', H: 100, B: 100, t: 2.3, w: 6.95, A: 8.852, Zx: 27.95, Zy: 27.95 },
  { shape: 'box', H: 100, B: 100, t: 3.2, w: 9.52, A: 12.127, Zx: 37.46, Zy: 37.46 },
  // rectangular tubes (ง)
  { shape: 'rhs', H: 50, B: 25, t: 2.3, w: 2.44, A: 3.102, Zx: 3.72, Zy: 1.24 },
  { shape: 'rhs', H: 75, B: 45, t: 2.3, w: 4.06, A: 5.172, Zx: 10.36, Zy: 4.69 },
  { shape: 'rhs', H: 100, B: 50, t: 2.3, w: 5.14, A: 6.552, Zx: 16.97, Zy: 5.79 },
  { shape: 'rhs', H: 100, B: 50, t: 3.2, w: 7.01, A: 8.927, Zx: 22.46, Zy: 7.59 },
  { shape: 'rhs', H: 125, B: 75, t: 3.2, w: 9.52, A: 12.127, Zx: 41.11, Zy: 18.69 },
  { shape: 'rhs', H: 150, B: 100, t: 4.5, w: 16.62, A: 21.169, Zx: 87.74, Zy: 46.93 },
  // lipped channels / C (ข)
  { shape: 'lipC', H: 75, B: 45, C: 15, t: 2.3, w: 3.25, A: 4.137, Zx: 9.9, Zy: 4.24 },
  { shape: 'lipC', H: 100, B: 50, C: 20, t: 2.3, w: 4.06, A: 5.172, Zx: 16.1, Zy: 6.06 },
  { shape: 'lipC', H: 100, B: 50, C: 20, t: 3.2, w: 5.5, A: 7.007, Zx: 21.3, Zy: 7.81 },
  { shape: 'lipC', H: 125, B: 50, C: 20, t: 2.3, w: 4.41, A: 5.747, Zx: 21.9, Zy: 6.22 },
  { shape: 'lipC', H: 150, B: 50, C: 20, t: 2.3, w: 4.96, A: 6.322, Zx: 28.0, Zy: 6.33 },
  { shape: 'lipC', H: 150, B: 65, C: 20, t: 3.2, w: 7.51, A: 9.567, Zx: 44.3, Zy: 12.2 },
  // light channels — รางน้ำ (ก)
  { shape: 'channel', H: 60, B: 30, t: 2.3, w: 2.03, A: 2.59, Zx: 4.72, Zy: 1.06 },
  { shape: 'channel', H: 80, B: 40, t: 2.3, w: 2.75, A: 3.51, Zx: 8.73, Zy: 1.92 },
  { shape: 'channel', H: 100, B: 50, t: 2.3, w: 3.47, A: 4.43, Zx: 13.7, Zy: 3.02 },
  { shape: 'channel', H: 100, B: 50, t: 3.2, w: 4.76, A: 6.06, Zx: 18.7, Zy: 4.14 },
  { shape: 'channel', H: 150, B: 75, t: 4.0, w: 9.0, A: 11.47, Zx: 53.4, Zy: 11.8 },
]

const shapeLabel: Record<string, string> = { box: '□', rhs: '▭', lipC: 'C', channel: '[' }

function steelFromRow(r: SteelRow): Section {
  const H = r.H / 10
  const B = r.B / 10
  const t = r.t / 10
  const Ix = (r.Zx * H) / 2
  // least radius: Iy from Zy × (distance to extreme fibre); box/rhs symmetric so Iy = Zy·B/2,
  // channels: approximate with Zy·B·0.7 (shear centre offset) — only used for slenderness of steel braces.
  const Iy = r.shape === 'box' || r.shape === 'rhs' ? (r.Zy * B) / 2 : r.Zy * B * 0.7
  const webs = r.shape === 'box' || r.shape === 'rhs' ? 2 : 1
  const dims = r.C ? `${r.H}×${r.B}×${r.C}×${r.t}` : `${r.H}×${r.B}×${r.t}`
  return {
    id: `${r.shape}-${dims}`,
    label: `${shapeLabel[r.shape]} ${dims}`,
    shape: r.shape,
    H,
    B,
    t,
    A: r.A,
    Ix,
    Sx: r.Zx,
    rMin: Math.sqrt(Math.min(Ix, Iy) / r.A),
    dMin: B,
    Aweb: webs * t * H,
    w: r.w,
  }
}

/** Equal angle by geometry (sharp corners). a, t in mm. */
export function angle(aMm: number, tMm: number): Section {
  const a = aMm / 10
  const t = tMm / 10
  const A = t * (2 * a - t)
  const ybar = (a * a + a * t - t * t) / (2 * (2 * a - t))
  const I = (t * (a - ybar) ** 3 + a * ybar ** 3 - (a - t) * (ybar - t) ** 3) / 3
  const S = I / (a - ybar)
  return {
    id: `angle-${aMm}x${aMm}x${tMm}`,
    label: `L ${aMm}×${aMm}×${tMm}`,
    shape: 'angle',
    H: a,
    B: a,
    t,
    A,
    Ix: I,
    Sx: S,
    rMin: Math.sqrt(I / A) * 0.78, // principal minor axis ≈ 0.78 r_x for equal angles
    dMin: a,
    Aweb: t * a,
    w: A * 0.785,
  }
}

/** Steel pipe (props/braces). The book uses r = √(OD² + ID²)/4. Dimensions cm. */
export function pipe(OD: number, ID: number, label: string): Section {
  const A = (Math.PI / 4) * (OD ** 2 - ID ** 2)
  const r = Math.sqrt(OD ** 2 + ID ** 2) / 4
  const Ix = A * r * r
  return { id: `pipe-${OD}`, label, shape: 'pipe', H: OD, B: OD, A, Ix, Sx: Ix / (OD / 2), rMin: r, dMin: OD, w: A * 0.785 }
}

export const STEEL_SECTIONS: Section[] = [
  ...STEEL_ROWS.map(steelFromRow),
  angle(50, 5),
  angle(65, 6),
  angle(75, 6),
]

/** Scaffold tube BS 1139 / EN 39 Ø48.3×4.0 — posts, ledgers and bracing of tube-and-fitting falsework. */
export const BS_TUBE = 'pipe-4.83'

export const PIPES: Section[] = [
  pipe(4.27, 3.81, 'ท่อเหล็ก Ø1¼" (42.7×2.3 มม.)'),
  pipe(4.86, 4.22, 'ท่อเหล็ก Ø1½" (48.6 มม.)'),
  pipe(4.83, 4.03, 'ท่อ BS 1139 Ø48.3×4.0 มม.'),
  pipe(6.03, 5.45, 'ท่อเหล็ก Ø2" (60.3 มม.)'),
  pipe(7.63, 6.99, 'ท่อเหล็ก Ø2½" (76.3×3.2 มม.)'),
  pipe(8.91, 8.27, 'ท่อเหล็ก Ø3" (89.1×3.2 มม.)'),
]

/** Round timber post (เสาไม้กลม / ไม้เบญจพรรณ), diameter in inches at the book's 2.5 cm/inch (Ex 6.2: Ø4" = 10 cm). */
export function roundLog(dIn: number): Section {
  const d = dIn * INCH_BOOK
  const A = (Math.PI * d * d) / 4
  const I = (Math.PI * d ** 4) / 64
  return { id: `log-${dIn}`, label: `ไม้กลม Ø${dIn}"`, shape: 'round', H: d, B: d, A, Ix: I, Sx: I / (d / 2), rMin: d / 4, dMin: d }
}

export const LOGS: Section[] = [3, 4, 5, 6].map(roundLog)

export const TIMBER_SECTIONS: Section[] = TIMBER_SIZES.map(([b, h]) => timber(b, h))

export const ALL_SECTIONS: Section[] = [...TIMBER_SECTIONS, ...LOGS, ...STEEL_SECTIONS, ...PIPES]

/** Timber member laid flat (width = depth of the nominal size), e.g. beam-bottom stiffeners "วางนอน" (Table 7.3). */
export function flat(s: Section): Section {
  if (s.shape !== 'rect') return s
  return { ...rect(s.H, s.B, `${s.id}-flat`, `${s.label} (วางนอน)`), shape: 'rect' }
}

export function getSection(id: string): Section {
  const s = ALL_SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`Unknown section ${id}`)
  return s
}

/** n identical members acting together (double wales / yokes). */
export function multiple(s: Section, n: number): Section {
  if (n === 1) return s
  return {
    ...s,
    id: `${n}x-${s.id}`,
    label: `${n}–${s.label}`,
    A: s.A * n,
    Ix: s.Ix * n,
    Sx: s.Sx * n,
    Aweb: s.Aweb !== undefined ? s.Aweb * n : undefined,
    B: s.B * n,
    w: s.w !== undefined ? s.w * n : undefined,
  }
}
