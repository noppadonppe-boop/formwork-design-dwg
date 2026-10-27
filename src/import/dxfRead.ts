// Minimal ASCII DXF reader for structural plans: LINE, LWPOLYLINE, POLYLINE/VERTEX, CIRCLE, TEXT, MTEXT and
// INSERT (blocks expanded with scale / rotation / translation). Coordinates are converted to metres.

export type Pt = [number, number]

export type DxfEntity =
  | { kind: 'line'; layer: string; a: Pt; b: Pt }
  | { kind: 'poly'; layer: string; pts: Pt[]; closed: boolean }
  | { kind: 'circle'; layer: string; c: Pt; r: number }
  | { kind: 'text'; layer: string; at: Pt; text: string; height: number }

export interface DxfDrawing {
  entities: DxfEntity[]
  layers: string[]
  /** drawing units → metres */
  scale: number
  unitsLabel: string
  bounds: { min: Pt; max: Pt }
}

type Pair = [number, string]

function pairs(text: string): Pair[] {
  const lines = text.split(/\r?\n/)
  const out: Pair[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim())
    if (Number.isNaN(code)) {
      i -= 1 // resync on a stray line
      continue
    }
    out.push([code, lines[i + 1]])
  }
  return out
}

/** \U+XXXX escapes and MTEXT formatting codes → plain text. */
export function cleanText(s: string): string {
  return s
    .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\P/g, ' ')
    .replace(/\\[A-Za-z][^;\\{}]*;/g, '')
    .replace(/[{}]/g, '')
    .replace(/%%[cC]/g, 'Ø')
    .replace(/%%[dD]/g, '°')
    .trim()
}

interface RawEntity {
  type: string
  codes: Pair[]
}

/** Split a section's pairs into entities (each starts with group code 0). */
function entitiesOf(ps: Pair[]): RawEntity[] {
  const out: RawEntity[] = []
  let cur: RawEntity | undefined
  for (const p of ps) {
    if (p[0] === 0) {
      cur = { type: p[1].trim(), codes: [] }
      out.push(cur)
    } else cur?.codes.push(p)
  }
  return out
}

const num = (e: RawEntity, code: number, def = 0) => {
  const p = e.codes.find((c) => c[0] === code)
  return p ? Number(p[1]) : def
}
const str = (e: RawEntity, code: number) => e.codes.find((c) => c[0] === code)?.[1].trim() ?? ''

/** Convert raw entities (with POLYLINE/VERTEX/SEQEND runs) to drawing entities in drawing units. */
function convert(raw: RawEntity[], blocks: Map<string, RawEntity[]>, depth = 0): DxfEntity[] {
  const out: DxfEntity[] = []
  for (let i = 0; i < raw.length; i++) {
    const e = raw[i]
    const layer = str(e, 8) || '0'
    switch (e.type) {
      case 'LINE':
        out.push({ kind: 'line', layer, a: [num(e, 10), num(e, 20)], b: [num(e, 11), num(e, 21)] })
        break
      case 'LWPOLYLINE': {
        const xs = e.codes.filter((c) => c[0] === 10).map((c) => Number(c[1]))
        const ys = e.codes.filter((c) => c[0] === 20).map((c) => Number(c[1]))
        out.push({ kind: 'poly', layer, pts: xs.map((x, k) => [x, ys[k] ?? 0]), closed: (num(e, 70) & 1) === 1 })
        break
      }
      case 'POLYLINE': {
        const pts: Pt[] = []
        let j = i + 1
        for (; j < raw.length && raw[j].type !== 'SEQEND'; j++) if (raw[j].type === 'VERTEX') pts.push([num(raw[j], 10), num(raw[j], 20)])
        out.push({ kind: 'poly', layer, pts, closed: (num(e, 70) & 1) === 1 })
        i = j
        break
      }
      case 'CIRCLE':
        out.push({ kind: 'circle', layer, c: [num(e, 10), num(e, 20)], r: num(e, 40) })
        break
      case 'TEXT':
      case 'MTEXT': {
        const t = e.codes
          .filter((c) => c[0] === 3 || c[0] === 1)
          .map((c) => c[1])
          .join('')
        if (t.trim()) out.push({ kind: 'text', layer, at: [num(e, 10), num(e, 20)], text: cleanText(t), height: num(e, 40, 1) })
        break
      }
      case 'INSERT': {
        if (depth > 4) break
        const blk = blocks.get(str(e, 2))
        if (!blk) break
        const [ix, iy] = [num(e, 10), num(e, 20)]
        const [sx, sy] = [num(e, 41, 1), num(e, 42, 1)]
        const rot = (num(e, 50) * Math.PI) / 180
        const T = ([x, y]: Pt): Pt => {
          const u = x * sx
          const v = y * sy
          return [ix + u * Math.cos(rot) - v * Math.sin(rot), iy + u * Math.sin(rot) + v * Math.cos(rot)]
        }
        const s = Math.abs(sx)
        for (const c of convert(blk, blocks, depth + 1)) {
          const ly = c.layer === '0' ? layer : c.layer // entities on layer 0 take the insert's layer
          if (c.kind === 'line') out.push({ ...c, layer: ly, a: T(c.a), b: T(c.b) })
          else if (c.kind === 'poly') out.push({ ...c, layer: ly, pts: c.pts.map(T) })
          else if (c.kind === 'circle') out.push({ ...c, layer: ly, c: T(c.c), r: c.r * s })
          else out.push({ ...c, layer: ly, at: T(c.at), height: c.height * s })
        }
        break
      }
    }
  }
  return out
}

const UNITS: Record<number, [number, string]> = { 1: [0.0254, 'นิ้ว'], 2: [0.3048, 'ฟุต'], 4: [0.001, 'มม.'], 5: [0.01, 'ซม.'], 6: [1, 'ม.'] }

export function readDxf(text: string, unitOverride?: number): DxfDrawing {
  const ps = pairs(text)
  // sections
  const sections = new Map<string, Pair[]>()
  for (let i = 0; i < ps.length; i++) {
    if (ps[i][0] === 0 && ps[i][1].trim() === 'SECTION' && ps[i + 1]?.[0] === 2) {
      const name = ps[i + 1][1].trim()
      const start = i + 2
      let j = start
      while (j < ps.length && !(ps[j][0] === 0 && ps[j][1].trim() === 'ENDSEC')) j++
      sections.set(name, ps.slice(start, j))
      i = j
    }
  }
  let insunits = 0
  const header = sections.get('HEADER') ?? []
  const iu = header.findIndex((p) => p[0] === 9 && p[1].trim() === '$INSUNITS')
  if (iu >= 0) insunits = Number(header[iu + 1]?.[1] ?? 0)

  const blocks = new Map<string, RawEntity[]>()
  const blkRaw = entitiesOf(sections.get('BLOCKS') ?? [])
  for (let i = 0; i < blkRaw.length; i++)
    if (blkRaw[i].type === 'BLOCK') {
      const name = str(blkRaw[i], 2)
      const body: RawEntity[] = []
      let j = i + 1
      for (; j < blkRaw.length && blkRaw[j].type !== 'ENDBLK'; j++) body.push(blkRaw[j])
      blocks.set(name, body)
      i = j
    }

  const raw = convert(entitiesOf(sections.get('ENTITIES') ?? []), blocks)
  // units: header, else guess from the extent (a building plan is 5–300 m across)
  const xs = raw.flatMap((e) => (e.kind === 'line' ? [e.a[0], e.b[0]] : e.kind === 'poly' ? e.pts.map((p) => p[0]) : e.kind === 'circle' ? [e.c[0]] : [e.at[0]]))
  const span = xs.length ? xs.reduce((m, x) => Math.max(m, x), -Infinity) - xs.reduce((m, x) => Math.min(m, x), Infinity) : 0
  let [scale, unitsLabel] = UNITS[insunits] ?? (span > 3000 ? [0.001, 'มม. (เดา)'] : span > 300 ? [0.01, 'ซม. (เดา)'] : [1, 'ม. (เดา)'])
  if (unitOverride) {
    scale = unitOverride
    unitsLabel = Object.values(UNITS).find((u) => u[0] === unitOverride)?.[1] ?? `×${unitOverride}`
  }
  const S = (p: Pt): Pt => [p[0] * scale, p[1] * scale]
  const entities: DxfEntity[] = raw.map((e) =>
    e.kind === 'line' ? { ...e, a: S(e.a), b: S(e.b) } : e.kind === 'poly' ? { ...e, pts: e.pts.map(S) } : e.kind === 'circle' ? { ...e, c: S(e.c), r: e.r * scale } : { ...e, at: S(e.at), height: e.height * scale },
  )
  const all = entities.flatMap((e) => (e.kind === 'line' ? [e.a, e.b] : e.kind === 'poly' ? e.pts : e.kind === 'circle' ? [e.c] : [e.at]))
  const bounds = { min: [Infinity, Infinity] as Pt, max: [-Infinity, -Infinity] as Pt }
  for (const p of all) {
    bounds.min = [Math.min(bounds.min[0], p[0]), Math.min(bounds.min[1], p[1])]
    bounds.max = [Math.max(bounds.max[0], p[0]), Math.max(bounds.max[1], p[1])]
  }
  if (!all.length) Object.assign(bounds, { min: [0, 0], max: [1, 1] })
  return { entities, layers: [...new Set(entities.map((e) => e.layer))].sort(), scale, unitsLabel, bounds }
}
