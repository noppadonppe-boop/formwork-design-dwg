// Form Assembly — panels from the stock assembled into the faces of an element (footing, column, wall, beam; faces
// from assemblyGeom): required face sizes with the corner detail (one pair of faces runs through), automatic layout
// (fewest panels, fillers in the middle), and the checks of each face against the design (length, height or soffit
// width, form ties clear of joints). Face coordinates in metres seen from outside: u from the face's left end, y up the
// face (across a soffit) from the panels' first edge.
import type { AnyDesign } from '@/data/elements'
import type { AssemblyData, Criteria, ElementData, FaceKey, FaceLayout, FormPanel, PanelData } from '@/data/types'
import { getSection, type Status } from '@/engine'
import { type ElementGeom, elementGeom, type FaceDef, type Pair } from './assemblyGeom'
import { elementModel } from './elementModel'
import type { BoxPart } from './formModel'
import { type PanelCheck, panelChecks, panelLayout, panelStatus } from './panel'

/** length tolerance, m */
const TOL = 0.005
/** a through face may run past the corner by this much without a warning, m */
export const THROUGH_OVERRUN = 0.1
/** form ties closer than this to a panel joint clash with it, m */
export const TIE_CLEAR = 0.1
/** faces narrower than this (mm) are closed with one panel of their own width */
const NARROW = 600

export interface FaceSpec extends FaceDef {
  through: boolean
  /** face coordinates of the concrete edge (u) and of the concrete base or soffit edge (y), m */
  offset: number
  yOffset: number
  /** required panel length, m */
  length: number
  /** required height (minimum) or soffit width (exact), m */
  reqHeight: number
  /** a through face extended along its length may run over the corner a little */
  canOverrun: boolean
}

const DEFAULT_LINKS: [FaceKey, FaceKey][] = [
  ['A', 'C'],
  ['B', 'D'],
]

/** the layout used for a face: a linked copy (C, D) repeats its original (A, B) */
export function faceLayoutOf(a: Pick<AssemblyData, 'faces' | 'linked'>, k: FaceKey, links: [FaceKey, FaceKey][] = DEFAULT_LINKS): FaceLayout {
  const src = a.linked ? links.find(([, copy]) => copy === k)?.[0] : undefined
  return a.faces[src ?? k] ?? { courses: [] }
}

const panelIds = (f: FaceLayout) => f.courses.flatMap((c) => c.panels)
const r3 = (v: number) => Math.round(v * 1000) / 1000

export function faceSpecs(g: ElementGeom, a: Pick<AssemblyData, 'faces' | 'linked' | 'through'>, panels: Map<string, PanelData>): Partial<Record<FaceKey, FaceSpec>> {
  /** thickness of the panels on the faces of `pair` (the other pair's corners butt against them) */
  const thickness = (pair: Pair) => {
    const ts = g.faces
      .filter((f) => f.pair === pair)
      .flatMap((f) => panelIds(faceLayoutOf(a, f.key, g.links)))
      .map((id) => panels.get(id))
      .filter((p): p is PanelData => !!p)
      .map((p) => panelLayout(p).thickness)
    return ts.length ? Math.max(...ts) : g.panelT
  }
  const out: Partial<Record<FaceKey, FaceSpec>> = {}
  for (const f of g.faces) {
    const through = a.through === f.pair
    const t = through ? thickness(f.pair === 'x' ? 'y' : 'x') : 0
    const offset = f.extend === 'u-both' ? t : 0
    const yOffset = f.extend === 'u-both' ? 0 : t
    out[f.key] = {
      ...f,
      wales: f.wales.map((y) => r3(y + yOffset)),
      ties: f.ties.map((p) => ({ u: r3(p.u + offset), y: r3(p.y + yOffset) })),
      through,
      offset,
      yOffset,
      length: r3(f.concreteL + 2 * offset),
      reqHeight: r3(f.height + (f.extend === 'y-both' ? 2 : 1) * yOffset),
      canOverrun: through && f.extend === 'u-both',
    }
  }
  return out
}

// ---------------------------------------------------------------- automatic layout

export type FillerAt = 'middle' | 'left' | 'right'

export interface AutoResult {
  layout: FaceLayout
  /** filler still needed in every course (no panel combination closes the length), m */
  missing?: { width: number; height: number }
}

type AutoSpec = Pick<FaceSpec, 'length' | 'reqHeight' | 'canOverrun'> & { exactHeight?: boolean }

/** course heights (mm): one height stacked to at least `H`, or (exact) the fewest courses summing to `H` (none when
 *  no combination does) */
function courseHeights(H: number, heights: number[], exact: boolean): number[] {
  if (exact) {
    const best = new Array<number>(H + 1).fill(Infinity)
    const from = new Array<number>(H + 1).fill(0)
    best[0] = 0
    for (let t = 1; t <= H; t++)
      for (const h of heights)
        if (h <= t && best[t - h] + 1 < best[t]) {
          best[t] = best[t - h] + 1
          from[t] = h
        }
    if (best[H] < Infinity) {
      const out: number[] = []
      for (let t = H; t > 0; t -= from[t]) out.push(from[t])
      return out.sort((a, b) => b - a)
    }
    return []
  }
  // fewest courses, each metre of panel above the required height counting as two more courses
  const score = (c: { h: number; n: number }) => c.n + (2 * (c.n * c.h - H)) / 1000
  const h = heights.map((h) => ({ h, n: Math.ceil(H / h - 1e-9) })).sort((a, b) => score(a) - score(b))[0]
  return Array.from({ length: h.n }, () => h.h)
}

/**
 * Fewest panels that close `length` exactly (a through face may run over by up to THROUGH_OVERRUN), in courses up to
 * the required height. The widest panels go first; the narrower ones (fillers) are placed in the middle, at the left
 * or at the right; `stagger` reverses every other course so joints do not line up.
 */
export function autoFace(spec: AutoSpec, stock: FormPanel[], opts: { filler: FillerAt; stagger: boolean }): AutoResult {
  // whole millimetres: panel sizes made to fit (soffits, fillers) need not be whole centimetres
  const mm = (v: number) => Math.round(v * 1000)
  const heights = [...new Set(stock.map((p) => mm(p.height)))].filter((h) => h > 0)
  if (!heights.length) return { layout: { courses: [] } }
  const T = mm(spec.length)
  const top = T + (spec.canOverrun ? mm(THROUGH_OVERRUN) : 0)
  let missing: AutoResult['missing']
  const rowFor = new Map<number, string[]>()
  const fill = (h: number) => {
    const row = stock.filter((p) => mm(p.height) === h)
    const widths = [...new Set(row.map((p) => mm(p.width)))].filter((w) => w > 0).sort((a, b) => b - a)
    const byWidth = new Map(widths.map((w) => [w, row.filter((p) => mm(p.width) === w).sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))[0]]))
    // unbounded change-making: fewest pieces for every length up to `top`
    const best = new Array<number>(top + 1).fill(Infinity)
    const from = new Array<number>(top + 1).fill(0)
    best[0] = 0
    for (let t = 1; t <= top; t++)
      for (const w of widths)
        if (w <= t && best[t - w] + 1 < best[t]) {
          best[t] = best[t - w] + 1
          from[t] = w
        }
    let target = -1
    for (let t = T; t <= top; t++)
      if (best[t] < Infinity) {
        target = t
        break
      }
    if (T < NARROW && (target < 0 || best[target] > 1)) {
      // a narrow face (stop-end, column side) is one panel of its own width, not strips side by side
      missing ??= { width: T / 1000, height: h / 1000 }
      return []
    }
    if (target < 0) {
      // the longest reachable length below T; the rest is a filler to make
      for (let t = T; t >= 0; t--)
        if (best[t] < Infinity) {
          target = t
          break
        }
      missing ??= { width: (T - target) / 1000, height: h / 1000 }
    }
    const pieces: number[] = []
    for (let t = target; t > 0; t -= from[t]) pieces.push(from[t])
    const main = Math.max(0, ...pieces)
    const mains = pieces.filter((w) => w === main)
    const fillers = pieces.filter((w) => w !== main).sort((a, b) => b - a)
    const half = Math.ceil(mains.length / 2)
    const order = opts.filler === 'left' ? [...fillers, ...mains] : opts.filler === 'right' ? [...mains, ...fillers] : [...mains.slice(0, half), ...fillers, ...mains.slice(half)]
    return order.map((w) => byWidth.get(w)!.id)
  }
  const hs = courseHeights(mm(spec.reqHeight), heights, !!spec.exactHeight)
  // no panel heights add up to an exact width (soffit): equal panels as wide as the soffit, none longer than the stock's
  if (!hs.length) {
    const longest = Math.max(...stock.map((p) => mm(p.width)))
    return { layout: { courses: [] }, missing: { width: r3(T / Math.ceil(T / longest) / 1000), height: spec.reqHeight } }
  }
  const courses = hs.map((h, i) => {
    if (!rowFor.has(h)) rowFor.set(h, fill(h))
    const ids = rowFor.get(h)!
    return { panels: opts.stagger && i % 2 ? [...ids].reverse() : [...ids] }
  })
  return { layout: { courses }, missing }
}

// ---------------------------------------------------------------- analysis of a face

export interface PlacedPanel {
  id: string
  panel?: FormPanel
  course: number
  index: number
  x: number
  y: number
  w: number
  h: number
}

export interface FaceResult {
  spec: FaceSpec
  placed: PlacedPanel[]
  courses: { y: number; h: number; length: number; joints: number[] }[]
  height: number
  wales: number[]
  ties: { u: number; y: number; clash: boolean }[]
  checks: PanelCheck[]
  status: Status
}

export function analyzeFace(spec: FaceSpec, layout: FaceLayout, panels: Map<string, FormPanel>): FaceResult {
  const placed: PlacedPanel[] = []
  const courses: FaceResult['courses'] = []
  const checks: PanelCheck[] = []
  let y = 0
  layout.courses.forEach((c, ci) => {
    let x = 0
    const hs: number[] = []
    const joints: number[] = []
    c.panels.forEach((id, i) => {
      const p = panels.get(id)
      const w = p?.width ?? 0
      const h = p?.height ?? 0
      placed.push({ id, panel: p, course: ci, index: i, x: r3(x), y: r3(y), w, h })
      x += w
      if (i < c.panels.length - 1) joints.push(r3(x))
      if (p) hs.push(h)
    })
    const ch = hs.length ? Math.max(...hs) : 0
    courses.push({ y: r3(y), h: ch, length: r3(x), joints })
    y += ch
  })
  const height = r3(y)

  if (!placed.length) checks.push({ status: 'fail', label: 'ยังไม่มีแผงในด้านนี้', detail: 'กด “จัดอัตโนมัติ” หรือเลือกแผงจากคลังมาวาง' })
  const lost = placed.filter((p) => !p.panel).length
  if (lost) checks.push({ status: 'fail', label: `มีแผงที่ถูกลบออกจากคลังแล้ว ${lost} แผง` })

  courses.forEach((c, i) => {
    if (!layout.courses[i].panels.length) return checks.push({ status: 'warn', label: `ชั้นที่ ${i + 1} ว่าง` })
    const name = courses.length > 1 ? `ชั้นที่ ${i + 1}: ` : ''
    const diff = r3(c.length - spec.length)
    if (diff < -TOL) checks.push({ status: 'fail', label: `${name}ยาว ${c.length.toFixed(2)} ม. — ขาดอีก ${(-diff).toFixed(2)} ม.`, detail: `ต้องการ ${spec.length.toFixed(3)} ม.` })
    else if (diff > TOL && !spec.canOverrun) checks.push({ status: 'fail', label: `${name}ยาว ${c.length.toFixed(2)} ม. — เกิน ${diff.toFixed(2)} ม.`, detail: 'ด้านนี้ต้องยาวพอดี' })
    else if (diff > THROUGH_OVERRUN + TOL) checks.push({ status: 'warn', label: `${name}ยื่นเกินมุม ${diff.toFixed(2)} ม.` })
    if (layout.courses[i].panels.some((id) => panels.get(id) && Math.abs(panels.get(id)!.height - c.h) > TOL)) checks.push({ status: 'warn', label: `${name}แผงสูงไม่เท่ากัน` })
  })
  if (placed.length && courses.every((c) => Math.abs(c.length - spec.length) <= TOL || (spec.canOverrun && c.length >= spec.length - TOL && c.length - spec.length <= THROUGH_OVERRUN + TOL)))
    checks.push({ status: 'ok', label: `ความยาวครบ ${spec.length.toFixed(2)} ม.${spec.offset ? ` (คอนกรีต ${spec.concreteL.toFixed(2)} + หุ้มมุม 2 × ${(spec.offset * 100).toFixed(1)} ซม.)` : ''}` })
  if (placed.length) {
    const extra = spec.yOffset ? ` (รวมหุ้ม ${(spec.yOffset * 100).toFixed(1)} ซม.${spec.extend === 'y-both' ? ' × 2' : ''})` : ''
    if (spec.exactHeight) {
      if (Math.abs(height - spec.reqHeight) <= TOL) checks.push({ status: 'ok', label: `กว้าง ${height.toFixed(3)} ม. พอดี${extra}` })
      else checks.push({ status: 'fail', label: `กว้าง ${height.toFixed(3)} ม. — ต้องการ ${spec.reqHeight.toFixed(3)} ม.${extra}` })
    } else if (height < spec.reqHeight - TOL) checks.push({ status: 'fail', label: `สูง ${height.toFixed(2)} ม. — ต่ำกว่าที่ต้องการ ${spec.reqHeight.toFixed(2)} ม.${extra}` })
    else checks.push({ status: 'ok', label: `สูง ${height.toFixed(2)} ม. ≥ ${spec.reqHeight.toFixed(2)} ม.${extra}` })
  }

  const ties = spec.ties.map((t) => {
    const c = courses.find((c) => t.y >= c.y - TOL && t.y <= c.y + c.h + TOL)
    const nearJoint = !!c && c.joints.some((j) => Math.abs(j - t.u) < TIE_CLEAR)
    const nearCourse = courses.some((c, i) => i > 0 && Math.abs(c.y - t.y) < TIE_CLEAR / 2)
    return { ...t, clash: nearJoint || nearCourse }
  })
  const clash = ties.filter((t) => t.clash).length
  if (ties.length && placed.length)
    checks.push(
      clash
        ? { status: 'warn', label: `Form tie ${clash} ตำแหน่งตกใกล้รอยต่อแผง (< ${TIE_CLEAR * 100} ซม.)`, detail: 'สลับตำแหน่งแผง หรือย้ายแผงเสริม' }
        : { status: 'ok', label: `Form tie ${ties.length} ตำแหน่ง ไม่ตกที่รอยต่อแผง` },
    )
  return { spec, placed, courses, height, wales: spec.wales, ties, checks, status: panelStatus(checks) }
}

// ---------------------------------------------------------------- the whole assembly

export interface AssemblyResult {
  geom: ElementGeom
  /** the element's faces, in order */
  keys: FaceKey[]
  specs: Partial<Record<FaceKey, FaceSpec>>
  faces: Partial<Record<FaceKey, FaceResult>>
  /** the layout used on every face (linked copies resolved) */
  layouts: Partial<Record<FaceKey, FaceLayout>>
  /** panels used per set, with the stock and the check against the design */
  usage: { panel: FormPanel; used: number; status: Status }[]
  /** wales / yokes of the design: length and count, by the faces they run along */
  wales: { faces: string; length: number; count: number }[]
  status: Status
}

/** undefined when assemblies do not cover the element (see elementGeom) */
export function analyzeAssembly(a: AssemblyData, el: ElementData, run: AnyDesign | undefined, panels: FormPanel[], criteria?: Pick<Criteria, 'deflectionRatio' | 'deflectionAbsMm'>): AssemblyResult | undefined {
  const geom = elementGeom(el, run)
  if (!geom) return undefined
  const byId = new Map(panels.map((p) => [p.id, p]))
  const keys = geom.faces.map((f) => f.key)
  const specs = faceSpecs(geom, a, byId)
  const layouts: AssemblyResult['layouts'] = {}
  const faces: AssemblyResult['faces'] = {}
  for (const k of keys) {
    layouts[k] = faceLayoutOf(a, k, geom.links)
    faces[k] = analyzeFace(specs[k]!, layouts[k]!, byId)
  }

  const counts = new Map<string, number>()
  for (const k of keys) for (const id of panelIds(layouts[k]!)) counts.set(id, (counts.get(id) ?? 0) + 1)
  const usage = [...counts]
    .flatMap(([id, used]) => {
      const panel = byId.get(id)
      if (!panel) return []
      const s = panelStatus(panelChecks(panel, panelLayout(panel), run ? { el, run } : undefined, criteria))
      return [{ panel, used, status: (used > (panel.stock ?? 0) && s === 'ok' ? 'warn' : s) as Status }]
    })
    .sort((x, y) => x.panel.code.localeCompare(y.panel.code, undefined, { numeric: true }))

  const wales: AssemblyResult['wales'] = []
  if (run) {
    const along = (axis: 0 | 2) =>
      geom.faces
        .filter((f) => Math.abs(f.e[axis]) > 0.5 && f.v[1] === 1)
        .map((f) => f.key)
        .join('/')
    try {
      for (const p of elementModel(el, run).parts) {
        if ((p.group !== 'wale' && p.group !== 'yoke') || p.shape !== 'box') continue
        const b = p as BoxPart
        const faces = along(b.size[0] >= b.size[2] ? 0 : 2)
        const length = r3(Math.max(b.size[0], b.size[2]))
        const w = wales.find((w) => w.faces === faces && Math.abs(w.length - length) < 0.001)
        if (w) w.count++
        else wales.push({ faces, length, count: 1 })
      }
    } catch {
      /* no model: wales not listed */
    }
  }
  const all = [...keys.map((k) => faces[k]!.status), ...usage.map((u) => u.status)]
  const status: Status = all.includes('fail') ? 'fail' : all.includes('warn') ? 'warn' : 'ok'
  return { geom, keys, specs, faces, layouts, usage, wales, status }
}

/** a panel `width` × `height` (default: the same height) made like `like` (plywood, studs) */
export function fillerLike(like: PanelData, width: number, height = like.height): PanelData {
  return { ...like, width: r3(width), height: r3(height), name: height === like.height ? 'แผงเสริม' : 'แผงตามขนาด', stock: 0, edges: { ...like.edges, left: true, right: true }, note: '' }
}

/** wale section of the design for the 3D view: footing / wall wales, column yokes, beam tie wales */
export function waleSectionOf(el: ElementData): { sectionId: string; count: number } | undefined {
  switch (el.type) {
    case 'footing':
    case 'wall':
      return { sectionId: el.input.wale.sectionId, count: el.input.wale.count }
    case 'column':
      return { sectionId: el.input.yoke.sectionId, count: el.input.yoke.count }
    case 'beam':
      return el.input.tie?.enabled ? { sectionId: el.input.tie.waleSectionId, count: 1 } : undefined
    default:
      return undefined
  }
}

export const sectionDepth = (id: string) => getSection(id).H / 100
