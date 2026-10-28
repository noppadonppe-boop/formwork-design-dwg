// Plan shape of a column section. The rectangle (b × h) is the default; a round column and the regular
// hexagon/octagon keep their one size in b = h (D, or F = distance across the flats).
//   circle  — vertical staves in a square frame of wide boards cut out to the circle (Ex 9.2: each board spans D,
//             F = w·D/2, M = w·D²/8 on the net section), a bolted steel form, or a cardboard tube; plywood bends
//             round only to large radii (APA, dry, across the face grain);
//   polygon — a square/rectangular box of yokes with corner fillers behind the sloping faces (the rectangle
//             design on the box), or a ring of yokes along the faces: span a, M = w·a²/8, T = w·F/2.

export type CircleSystem = 'stave' | 'steel' | 'tube'
export type PolygonYoke = 'box' | 'ring'

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

/** Section of a column: area m², perimeter m, least thickness d for the lateral pressure, m. */
export function columnSection(inp: { b: number; h: number; shape?: ColumnShape }): { area: number; perimeter: number; d: number } {
  const s = columnShapeOf(inp)
  if (s.kind === 'circle') return { area: (Math.PI * inp.b ** 2) / 4, perimeter: Math.PI * inp.b, d: inp.b }
  if (s.kind === 'polygon') {
    const { a } = polygonDims(s.n, inp.b)
    return { area: (s.n * a * inp.b) / 4, perimeter: s.n * a, d: inp.b }
  }
  return { area: inp.b * inp.h, perimeter: 2 * (inp.b + inp.h), d: Math.min(inp.b, inp.h) }
}

export const SHAPE_NAME: Record<string, string> = { rect: 'สี่เหลี่ยม', circle: 'กลม', 6: 'หกเหลี่ยม', 8: 'แปดเหลี่ยม' }
export const CIRCLE_SYSTEM_LABEL: Record<CircleSystem, string> = { stave: 'ไม้ระแนงตั้ง + คานรัดเจาะโค้ง', steel: 'แบบเหล็กสำเร็จรูป', tube: 'ท่อกระดาษ' }
export const POLYGON_YOKE_LABEL: Record<PolygonYoke, string> = { box: 'กรอบสี่เหลี่ยม + ไม้อุดมุม', ring: 'วงแหวนตามรูป' }

/** "กลม Ø50 ซม." / "หกเหลี่ยม F 60 ซม." / "30×60 ซม." */
export function columnSizeText(inp: { b: number; h: number; shape?: ColumnShape }): string {
  const s = columnShapeOf(inp)
  const cm = (v: number) => (v * 100).toFixed(0)
  if (s.kind === 'circle') return `กลม Ø${cm(inp.b)} ซม.`
  if (s.kind === 'polygon') return `${SHAPE_NAME[s.n]} F ${cm(inp.b)} ซม.`
  return `${cm(inp.b)}×${cm(inp.h)} ซม.`
}

/** How the form is built, in words (empty for the rectangle). */
export function columnShapeSystem(shape: ColumnShape): string {
  if (shape.kind === 'circle') return CIRCLE_SYSTEM_LABEL[shape.system]
  if (shape.kind === 'polygon') return `คานรัด${POLYGON_YOKE_LABEL[shape.yoke]}`
  return ''
}
