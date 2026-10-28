// Turn a plan drawing into formwork elements: find rectangles / circles, classify them by layer (or by shape when
// the layer says nothing), read nearby labels such as "C1 40x40" or "B2 30x60", and merge identical items into one
// element with a quantity. Shared with the AI import, which produces the same `Candidate` list.
import { newElement, withRoundForm } from '@/data/elements'
import type { Criteria, ElementData, ElementType, FormElement } from '@/data/types'
import type { DxfDrawing, DxfEntity, Pt } from './dxfRead'

export type Role = ElementType | 'ignore' | 'auto'

export interface Shape {
  id: string
  layer: string
  kind: 'rect' | 'circle'
  cx: number
  cy: number
  /** long and short side, m (circle: diameter twice) */
  long: number
  short: number
  poly: Pt[]
}

export interface Candidate {
  key: string
  type: ElementType
  code: string
  name: string
  qty: number
  /** metres */
  /** round column (a circle in the drawing): designed with a round form, b = h = D */
  round?: boolean
  dims: { b?: number; h?: number; thickness?: number; length?: number; height?: number; lengthX?: number; lengthY?: number; depth?: number; slabT?: number }
  source: 'dxf' | 'ai'
  note?: string
  shapeIds: string[]
  include: boolean
}

export interface DetectOptions {
  /** floor-to-floor height, m */
  storeyH: number
  slabT: number
  footingH: number
  beamH: number
}

export const DEFAULT_DETECT: DetectOptions = { storeyH: 3.2, slabT: 0.15, footingH: 1.0, beamH: 0.6 }

const PREFIX: Record<ElementType, string> = { column: 'C', wall: 'W', footing: 'F', beam: 'B', slab: 'S' }
export const ROLE_LABEL: Record<Role, string> = { auto: 'อัตโนมัติ (ตามรูปทรง)', column: 'เสา', wall: 'กำแพง', footing: 'ฐานราก', beam: 'คาน', slab: 'พื้น', ignore: 'ไม่ใช้' }

/** Guess a layer's role from its name (English / Thai / common CAD prefixes). */
export function guessRole(layer: string): Role {
  const l = layer.toUpperCase()
  if (/DIM|TEXT|ANNO|GRID|AXIS|HATCH|TITLE|BORDER|FURN|DOOR|WIN/.test(l)) return 'ignore'
  if (/COL|เสา|^S-COL|PIER/.test(l)) return 'column'
  if (/WALL|กำแพง|RW|SHEAR/.test(l)) return 'wall'
  if (/FOOT|FDN|FTG|PILE|CAP|ฐาน/.test(l)) return 'footing'
  if (/BEAM|คาน|GIRDER|^S-BM/.test(l)) return 'beam'
  if (/SLAB|พื้น|FLOOR/.test(l)) return 'slab'
  return 'auto'
}

const key = (p: Pt) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

function rectFromPts(pts: Pt[], layer: string, id: string): Shape | undefined {
  let p = pts
  if (p.length === 5 && dist(p[0], p[4]) < 1e-3) p = p.slice(0, 4)
  if (p.length !== 4) return undefined
  const s = [0, 1, 2, 3].map((i) => [p[(i + 1) % 4][0] - p[i][0], p[(i + 1) % 4][1] - p[i][1]] as Pt)
  const len = s.map((v) => Math.hypot(v[0], v[1]))
  if (len.some((l) => l < 0.02)) return undefined
  for (let i = 0; i < 4; i++) {
    const a = s[i]
    const b = s[(i + 1) % 4]
    if (Math.abs(a[0] * b[0] + a[1] * b[1]) / (len[i] * len[(i + 1) % 4]) > 0.02) return undefined // not square corners
  }
  const w = (len[0] + len[2]) / 2
  const h = (len[1] + len[3]) / 2
  return { id, layer, kind: 'rect', cx: p.reduce((a, q) => a + q[0], 0) / 4, cy: p.reduce((a, q) => a + q[1], 0) / 4, long: Math.max(w, h), short: Math.min(w, h), poly: p }
}

/** Rectangles drawn as closed polylines or as four separate lines, and circles. */
export function findShapes(entities: DxfEntity[]): Shape[] {
  const shapes: Shape[] = []
  let n = 0
  for (const e of entities) {
    if (e.kind === 'poly' && (e.closed || (e.pts.length === 5 && dist(e.pts[0], e.pts[4]) < 1e-3))) {
      const r = rectFromPts(e.pts, e.layer, `s${n++}`)
      if (r) shapes.push(r)
    } else if (e.kind === 'circle' && e.r > 0.05) shapes.push({ id: `s${n++}`, layer: e.layer, kind: 'circle', cx: e.c[0], cy: e.c[1], long: 2 * e.r, short: 2 * e.r, poly: [] })
  }
  // four-line rectangles, per layer
  const byLayer = new Map<string, (DxfEntity & { kind: 'line' })[]>()
  for (const e of entities) if (e.kind === 'line') byLayer.set(e.layer, [...(byLayer.get(e.layer) ?? []), e])
  for (const [layer, lines] of byLayer) {
    if (lines.length > 20000) continue
    const at = new Map<string, Pt[]>()
    const seg = new Set<string>()
    for (const l of lines) {
      at.set(key(l.a), [...(at.get(key(l.a)) ?? []), l.b])
      at.set(key(l.b), [...(at.get(key(l.b)) ?? []), l.a])
      seg.add(`${key(l.a)}|${key(l.b)}`)
      seg.add(`${key(l.b)}|${key(l.a)}`)
    }
    const seen = new Set<string>()
    for (const l of lines)
      for (const p2 of at.get(key(l.b)) ?? []) {
        if (key(p2) === key(l.a)) continue
        const p3: Pt = [l.a[0] + p2[0] - l.b[0], l.a[1] + p2[1] - l.b[1]]
        if (!seg.has(`${key(p2)}|${key(p3)}`) || !seg.has(`${key(p3)}|${key(l.a)}`)) continue
        const pts: Pt[] = [l.a, l.b, p2, p3]
        const id = pts.map(key).sort().join(';')
        if (seen.has(id)) continue
        seen.add(id)
        const r = rectFromPts(pts, layer, `s${n++}`)
        if (r) shapes.push(r)
      }
  }
  return shapes
}

export interface Label {
  prefix: string
  code: string
  b?: number
  h?: number
  at: Pt
}

/** "C1", "C-1 40x40", "B2 (0.30x0.60)", "F3 2.40×2.40" → code and optional section, m. */
export function parseLabel(text: string, at: Pt = [0, 0]): Label | undefined {
  const m = /\b(GB|PC|[CBFWS])\s*-?\s*(\d{1,3}[A-Za-z]?)\b/i.exec(text)
  if (!m) return undefined
  const prefix = m[1].toUpperCase()
  const out: Label = { prefix, code: `${prefix}${m[2].toUpperCase()}`, at }
  const d = /(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)/.exec(text.slice(m.index + m[0].length))
  if (d) {
    const conv = (v: number) => (v < 5 ? v : v / 100) // values below 5 are metres, else centimetres
    out.b = conv(Number(d[1]))
    out.h = conv(Number(d[2]))
  }
  return out
}

const PREFIX_TYPE: Record<string, ElementType> = { C: 'column', B: 'beam', GB: 'beam', F: 'footing', PC: 'footing', W: 'wall', S: 'slab' }

function classify(s: Shape, role: Role): ElementType | undefined {
  if (role === 'ignore') return undefined
  if (role !== 'auto') return role
  const ratio = s.long / Math.max(s.short, 1e-6)
  if (s.kind === 'circle') return s.long <= 1.5 ? 'column' : undefined
  if (s.long <= 1.5 && ratio <= 3) return 'column'
  if (ratio >= 4 && s.short <= 0.6) return 'wall'
  if (s.short >= 0.8 && s.long <= 20 && ratio <= 6) return 'footing'
  return undefined
}

export function detect(d: DxfDrawing, roles: Record<string, Role>, opt: DetectOptions): { shapes: Shape[]; assigned: Map<string, ElementType>; candidates: Candidate[] } {
  const shapes = findShapes(d.entities)
  const labels = d.entities.filter((e): e is DxfEntity & { kind: 'text' } => e.kind === 'text').flatMap((t) => {
    const l = parseLabel(t.text, t.at)
    return l ? [l] : []
  })
  const assigned = new Map<string, ElementType>()
  type Item = { type: ElementType; code?: string; dims: Candidate['dims']; shapeId?: string; note?: string; round?: boolean }
  const items: Item[] = []
  const used = new Set<Label>()
  for (const s of shapes) {
    const t = classify(s, roles[s.layer] ?? guessRole(s.layer))
    if (!t) continue
    assigned.set(s.id, t)
    // nearest label of a matching prefix within reach
    const reach = Math.max(1.5, 1.5 * s.long)
    let best: Label | undefined
    let bd = Infinity
    for (const l of labels) {
      if (PREFIX_TYPE[l.prefix] !== t) continue
      const dd = Math.hypot(l.at[0] - s.cx, l.at[1] - s.cy)
      if (dd < reach && dd < bd) {
        bd = dd
        best = l
      }
    }
    if (best) used.add(best)
    const r2 = (v: number) => Math.round(v * 100) / 100
    switch (t) {
      case 'column':
        items.push({ type: t, code: best?.code, shapeId: s.id, dims: { b: r2(s.short), h: r2(s.long), height: r2(opt.storeyH - opt.slabT) }, ...(s.kind === 'circle' ? { round: true, note: 'เสากลม — แบบหล่อไม้ระแนงตั้ง + คานรัดเจาะโค้ง' } : {}) })
        break
      case 'wall':
        items.push({ type: t, code: best?.code, shapeId: s.id, dims: { thickness: r2(s.short), length: r2(s.long), height: r2(opt.storeyH - opt.slabT) } })
        break
      case 'footing':
        items.push({ type: t, code: best?.code, shapeId: s.id, dims: { lengthX: r2(s.long), lengthY: r2(s.short), height: opt.footingH } })
        break
      case 'beam':
        items.push({ type: t, code: best?.code, shapeId: s.id, dims: { b: r2(best?.b ?? s.short), depth: r2(best?.h ?? opt.beamH), length: r2(s.long), slabT: opt.slabT, height: r2(opt.storeyH - (best?.h ?? opt.beamH)) } })
        break
      case 'slab':
        items.push({ type: t, code: best?.code, shapeId: s.id, dims: { lengthX: r2(s.long), lengthY: r2(s.short), thickness: opt.slabT, height: r2(opt.storeyH - opt.slabT) } })
        break
    }
  }
  // beams are usually drawn as open lines: take them from their labels ("B1 30x60")
  // the beam length is the nearest beam line (centre line or edge) on a beam layer
  const beamLines = d.entities.filter((e): e is DxfEntity & { kind: 'line' } => e.kind === 'line' && (roles[e.layer] ?? guessRole(e.layer)) === 'beam')
  const nearestLine = (p: Pt) => {
    let best: { len: number; dd: number } | undefined
    for (const ln of beamLines) {
      const [ax, ay] = ln.a
      const [bx, by] = ln.b
      const L2 = (bx - ax) ** 2 + (by - ay) ** 2
      if (L2 < 0.01) continue
      const t = Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / L2))
      const dd = Math.hypot(ax + t * (bx - ax) - p[0], ay + t * (by - ay) - p[1])
      if (dd < 1 && (!best || dd < best.dd)) best = { len: Math.sqrt(L2), dd }
    }
    return best?.len
  }
  for (const l of labels) {
    if (used.has(l) || PREFIX_TYPE[l.prefix] !== 'beam' || !l.b || !l.h) continue
    const len = nearestLine(l.at)
    items.push({
      type: 'beam',
      code: l.code,
      dims: { b: l.b, depth: l.h, length: len ? Math.round(len * 100) / 100 : 6, slabT: opt.slabT, height: Math.round((opt.storeyH - l.h) * 100) / 100 },
      note: len ? 'ความยาวจากเส้นคานใกล้ป้ายชื่อ' : 'จากป้ายชื่อ — ไม่พบเส้นคาน ตรวจความยาว',
    })
  }
  return { shapes, assigned, candidates: group(items, 'dxf') }
}

/** Merge identical items (type + code + dimensions) into candidates with a quantity. */
export function group(items: { type: ElementType; code?: string; dims: Candidate['dims']; shapeId?: string; note?: string; qty?: number; name?: string; round?: boolean }[], source: Candidate['source']): Candidate[] {
  const map = new Map<string, Candidate>()
  for (const it of items) {
    const dimKey = Object.entries(it.dims)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}${Math.round((v as number) * 100)}`)
      .join(',')
    const k = `${it.type}|${it.code ?? ''}|${dimKey}${it.round ? '|round' : ''}`
    const c = map.get(k)
    if (c) {
      c.qty += it.qty ?? 1
      if (it.shapeId) c.shapeIds.push(it.shapeId)
    } else map.set(k, { key: k, type: it.type, code: it.code ?? '', name: it.name ?? '', qty: it.qty ?? 1, dims: it.dims, source, note: it.note, ...(it.round ? { round: true } : {}), shapeIds: it.shapeId ? [it.shapeId] : [], include: true })
  }
  // one code per group: a code shared by groups of different size gets a suffix (W1, W1-2, …)
  const seenCode = new Map<string, number>()
  for (const c of [...map.values()].sort((a, b) => b.qty - a.qty))
    if (c.code) {
      const n = (seenCode.get(c.code) ?? 0) + 1
      seenCode.set(c.code, n)
      if (n > 1) c.code = `${c.code}-${n}`
    }
  // number the unlabelled groups after the labelled ones, per type
  const out = [...map.values()].sort((a, b) => a.type.localeCompare(b.type) || a.code.localeCompare(b.code, undefined, { numeric: true }) || b.qty - a.qty)
  const taken = new Set(out.map((c) => c.code).filter(Boolean))
  const next: Partial<Record<ElementType, number>> = {}
  for (const c of out)
    if (!c.code) {
      let n = next[c.type] ?? 1
      while (taken.has(`${PREFIX[c.type]}${n}`)) n++
      c.code = `${PREFIX[c.type]}${n}`
      taken.add(c.code)
      next[c.type] = n + 1
    }
  return out
}

export const dimsText = (c: Candidate): string => {
  const cm = (v?: number) => (v === undefined ? '?' : Math.round(v * 100))
  const m = (v?: number) => (v === undefined ? '?' : v.toFixed(2))
  switch (c.type) {
    case 'column':
      return c.round ? `Ø${cm(c.dims.b)} ซม. · H ${m(c.dims.height)} ม.` : `${cm(c.dims.b)}×${cm(c.dims.h)} ซม. · H ${m(c.dims.height)} ม.`
    case 'wall':
      return `t ${cm(c.dims.thickness)} ซม. · L ${m(c.dims.length)} · H ${m(c.dims.height)} ม.`
    case 'footing':
      return `${m(c.dims.lengthX)}×${m(c.dims.lengthY)} · ลึก ${m(c.dims.height)} ม.`
    case 'beam':
      return `${cm(c.dims.b)}×${cm(c.dims.depth)} ซม. · L ${m(c.dims.length)} ม.`
    case 'slab':
      return `t ${cm(c.dims.thickness)} ซม. · ${m(c.dims.lengthX)}×${m(c.dims.lengthY)} ม.`
  }
}

/** Element data for a candidate, from the project defaults plus the detected sizes. */
export function candidateToElement(c: Candidate, criteria: Criteria, existing: FormElement[]): ElementData {
  const el = newElement(c.type, criteria, existing)
  const d = c.dims
  const base = { ...el, code: c.code || el.code, name: c.name || el.name, qty: c.qty }
  switch (el.type) {
    case 'column':
      if (c.round) {
        const D = d.b ?? el.input.b
        const circle = withRoundForm({ ...el.input, b: D, h: D })
        return { ...base, type: 'column', input: { ...circle, height: d.height ?? el.input.height, brace: { ...el.input.brace, heightM: Math.max(0.5, (d.height ?? el.input.height) - 0.5) } } }
      }
      return { ...base, type: 'column', input: { ...el.input, b: d.b ?? el.input.b, h: d.h ?? el.input.h, height: d.height ?? el.input.height, brace: { ...el.input.brace, heightM: Math.max(0.5, (d.height ?? el.input.height) - 0.5) } } }
    case 'wall':
      return { ...base, type: 'wall', input: { ...el.input, thickness: d.thickness ?? el.input.thickness, length: d.length ?? el.input.length, height: d.height ?? el.input.height } }
    case 'footing':
      return { ...base, type: 'footing', input: { ...el.input, lengthX: d.lengthX ?? el.input.lengthX, lengthY: d.lengthY ?? el.input.lengthY, height: d.height ?? el.input.height } }
    case 'beam':
      return { ...base, type: 'beam', input: { ...el.input, b: d.b ?? el.input.b, h: d.depth ?? el.input.h, length: d.length ?? el.input.length, slabT: d.slabT ?? el.input.slabT, clearHeight: d.height ?? el.input.clearHeight } }
    case 'slab':
      return { ...base, type: 'slab', input: { ...el.input, thickness: d.thickness ?? el.input.thickness, lengthX: d.lengthX ?? el.input.lengthX, lengthY: d.lengthY ?? el.input.lengthY, clearHeight: d.height ?? el.input.clearHeight } }
  }
}
