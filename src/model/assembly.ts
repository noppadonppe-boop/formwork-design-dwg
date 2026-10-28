// Form Assembly — panels from the stock assembled into the four side faces of a footing form: required face sizes
// with the corner detail (one pair of faces runs past the corners), automatic layout (fewest panels, fillers in the
// middle), and the checks of each face against the footing design (length, height, form ties clear of joints).
// Face coordinates in metres seen from outside: u from the face's left end, y up from the base.
import type { AnyDesign } from '@/data/elements'
import type { AssemblyData, FaceKey, FaceLayout, FormPanel, PanelData } from '@/data/types'
import { FACE_KEYS } from '@/data/types'
import { deckThicknessM, type FootingDesign, type FootingInput, getSection, type Status } from '@/engine'
import { elementModel } from './elementModel'
import type { BoxPart } from './formModel'
import { type PanelCheck, panelChecks, panelLayout, panelStatus } from './panel'

/** length tolerance, m */
const TOL = 0.005
/** a through face may run past the corner by this much without a warning, m */
export const THROUGH_OVERRUN = 0.1
/** form ties closer than this to a panel joint clash with it, m */
export const TIE_CLEAR = 0.1

export const FACE_LABEL: Record<FaceKey, string> = { A: 'ด้าน A (หน้า)', B: 'ด้าน B (ขวา)', C: 'ด้าน C (หลัง)', D: 'ด้าน D (ซ้าย)' }
export const faceAxis = (k: FaceKey): 'x' | 'y' => (k === 'A' || k === 'C' ? 'x' : 'y')

export interface FaceSpec {
  key: FaceKey
  axis: 'x' | 'y'
  /** concrete length along the face, m */
  concreteL: number
  through: boolean
  /** face coordinate of the concrete edge = thickness of the abutting panels on a through face, m */
  offset: number
  /** required panel length, m */
  length: number
  /** pour height, m */
  height: number
  /** the face along the longer side of the footing */
  long: boolean
}

/** the layout used for a face: C and D repeat A and B when linked */
export const faceLayoutOf = (a: Pick<AssemblyData, 'faces' | 'linked'>, k: FaceKey): FaceLayout => (a.linked && k === 'C' ? a.faces.A : a.linked && k === 'D' ? a.faces.B : a.faces[k]) ?? { courses: [] }

const panelIds = (f: FaceLayout) => f.courses.flatMap((c) => c.panels)

export function faceSpecs(inp: FootingInput, a: Pick<AssemblyData, 'faces' | 'linked' | 'through'>, panels: Map<string, PanelData>): Record<FaceKey, FaceSpec> {
  const fallbackT = deckThicknessM(inp.sheathing) + getSection(inp.stud.sectionId).H / 100
  /** thickness of the panels of the faces along `axis`: the corners of the other pair butt against them */
  const thickness = (axis: 'x' | 'y') => {
    const ts = FACE_KEYS.filter((k) => faceAxis(k) === axis)
      .flatMap((k) => panelIds(faceLayoutOf(a, k)))
      .map((id) => panels.get(id))
      .filter((p): p is PanelData => !!p)
      .map((p) => panelLayout(p).thickness)
    return ts.length ? Math.max(...ts) : fallbackT
  }
  const longIsX = inp.lengthX >= inp.lengthY
  const out = {} as Record<FaceKey, FaceSpec>
  for (const key of FACE_KEYS) {
    const axis = faceAxis(key)
    const concreteL = axis === 'x' ? inp.lengthX : inp.lengthY
    const through = a.through === axis
    const offset = through ? thickness(axis === 'x' ? 'y' : 'x') : 0
    out[key] = { key, axis, concreteL, through, offset, length: r3(concreteL + 2 * offset), height: inp.height, long: (axis === 'x') === longIsX }
  }
  return out
}

const r3 = (v: number) => Math.round(v * 1000) / 1000

// ---------------------------------------------------------------- automatic layout

export type FillerAt = 'middle' | 'left' | 'right'

export interface AutoResult {
  layout: FaceLayout
  /** filler still needed in every course (no panel combination closes the length), m */
  missing?: { width: number; height: number }
  /** panel height used for the courses, m */
  courseHeight?: number
}

/**
 * Fewest panels that close `length` exactly (a through face may run over by up to THROUGH_OVERRUN), in courses of one
 * panel height stacked to at least the pour height. The widest panels go first; the narrower ones (fillers) are placed
 * in the middle, at the left or at the right; `stagger` reverses every other course so joints do not line up.
 */
export function autoFace(spec: Pick<FaceSpec, 'length' | 'height' | 'through'>, stock: FormPanel[], opts: { filler: FillerAt; stagger: boolean }): AutoResult {
  const cm = (v: number) => Math.round(v * 100)
  const heights = [...new Set(stock.map((p) => cm(p.height)))].filter((h) => h > 0)
  if (!heights.length) return { layout: { courses: [] } }
  const H = cm(spec.height)
  // the course height closest above the pour height, then the fewest courses
  const h = heights.map((h) => ({ h, n: Math.ceil(H / h - 1e-9) })).sort((a, b) => a.n * a.h - H - (b.n * b.h - H) || a.n - b.n)[0]

  const row = stock.filter((p) => cm(p.height) === h.h)
  const widths = [...new Set(row.map((p) => cm(p.width)))].filter((w) => w > 0).sort((a, b) => b - a)
  const byWidth = new Map(widths.map((w) => [w, row.filter((p) => cm(p.width) === w).sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))[0]]))
  const T = cm(spec.length)
  const top = T + (spec.through ? cm(THROUGH_OVERRUN) : 0)
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
  let missing: AutoResult['missing']
  if (target < 0) {
    // the longest reachable length below T; the rest is a filler to make
    for (let t = T; t >= 0; t--)
      if (best[t] < Infinity) {
        target = t
        break
      }
    missing = { width: (T - target) / 100, height: h.h / 100 }
  }
  const pieces: number[] = []
  for (let t = target; t > 0; t -= from[t]) pieces.push(from[t])
  const main = Math.max(0, ...pieces)
  const mains = pieces.filter((w) => w === main)
  const fillers = pieces.filter((w) => w !== main).sort((a, b) => b - a)
  const half = Math.ceil(mains.length / 2)
  const order = opts.filler === 'left' ? [...fillers, ...mains] : opts.filler === 'right' ? [...mains, ...fillers] : [...mains.slice(0, half), ...fillers, ...mains.slice(half)]
  const ids = order.map((w) => byWidth.get(w)!.id)
  const courses = Array.from({ length: h.n }, (_, i) => ({ panels: opts.stagger && i % 2 ? [...ids].reverse() : [...ids] }))
  return { layout: { courses }, missing, courseHeight: h.h / 100 }
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

/** wale and tie positions of the footing design on a face, in face coordinates */
function designOnFace(spec: FaceSpec, inp: FootingInput, d?: FootingDesign) {
  if (!d) return { wales: [] as number[], ties: [] as { u: number; y: number }[] }
  const viaWale = inp.support === 'braced' && inp.brace.at === 'wale'
  const wales = inp.support === 'tied' || viaWale ? d.layout.waleLevels : []
  const n = inp.support !== 'tied' ? 0 : spec.long ? (d.layout.tiesLong ?? 0) : d.layout.tieLayout === 'both' ? (d.layout.tiesShort ?? 0) : 0
  const us = Array.from({ length: n }, (_, j) => spec.offset + ((j + 1) * spec.concreteL) / (n + 1))
  return { wales, ties: wales.flatMap((y) => us.map((u) => ({ u: r3(u), y }))) }
}

export function analyzeFace(spec: FaceSpec, layout: FaceLayout, panels: Map<string, FormPanel>, inp: FootingInput, design?: FootingDesign): FaceResult {
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
    else if (diff > TOL && !spec.through) checks.push({ status: 'fail', label: `${name}ยาว ${c.length.toFixed(2)} ม. — เกิน ${diff.toFixed(2)} ม.`, detail: 'ด้านนี้อยู่ระหว่างด้านที่วิ่งทะลุมุม ต้องยาวพอดี' })
    else if (diff > THROUGH_OVERRUN + TOL) checks.push({ status: 'warn', label: `${name}ยื่นเกินมุม ${diff.toFixed(2)} ม.` })
    if (layout.courses[i].panels.some((id) => panels.get(id) && Math.abs(panels.get(id)!.height - c.h) > TOL)) checks.push({ status: 'warn', label: `${name}แผงสูงไม่เท่ากัน` })
  })
  if (placed.length && courses.every((c) => Math.abs(c.length - spec.length) <= TOL || (spec.through && c.length >= spec.length - TOL && c.length - spec.length <= THROUGH_OVERRUN + TOL)))
    checks.push({ status: 'ok', label: `ความยาวครบ ${spec.length.toFixed(2)} ม.${spec.through ? ` (คอนกรีต ${spec.concreteL.toFixed(2)} + หุ้มมุม 2 × ${(spec.offset * 100).toFixed(1)} ซม.)` : ''}` })
  if (placed.length) {
    if (height < spec.height - TOL) checks.push({ status: 'fail', label: `สูง ${height.toFixed(2)} ม. — ต่ำกว่าระดับเท ${spec.height.toFixed(2)} ม.` })
    else checks.push({ status: 'ok', label: `สูง ${height.toFixed(2)} ม. ≥ ระดับเท ${spec.height.toFixed(2)} ม.` })
  }

  const dz = designOnFace(spec, inp, design)
  const ties = dz.ties.map((t) => {
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
  return { spec, placed, courses, height, wales: dz.wales, ties, checks, status: panelStatus(checks) }
}

// ---------------------------------------------------------------- the whole assembly

export interface AssemblyResult {
  specs: Record<FaceKey, FaceSpec>
  faces: Record<FaceKey, FaceResult>
  /** panels used per set, with the stock and the check against the footing design */
  usage: { panel: FormPanel; used: number; status: Status }[]
  /** wales of the footing design: length and count per face direction */
  wales: { axis: 'x' | 'y'; length: number; count: number }[]
  status: Status
}

export function analyzeAssembly(a: AssemblyData, inp: FootingInput, run: AnyDesign | undefined, panels: FormPanel[], el?: Parameters<typeof elementModel>[0], criteria?: Parameters<typeof panelChecks>[3]): AssemblyResult {
  const byId = new Map(panels.map((p) => [p.id, p]))
  const design = run?.type === 'footing' ? run.design : undefined
  const specs = faceSpecs(inp, a, byId)
  const faces = Object.fromEntries(FACE_KEYS.map((k) => [k, analyzeFace(specs[k], faceLayoutOf(a, k), byId, inp, design)])) as Record<FaceKey, FaceResult>

  const counts = new Map<string, number>()
  for (const k of FACE_KEYS) for (const id of panelIds(faceLayoutOf(a, k))) counts.set(id, (counts.get(id) ?? 0) + 1)
  const usage = [...counts]
    .flatMap(([id, used]) => {
      const panel = byId.get(id)
      if (!panel) return []
      const ref = el && run ? { el, run } : undefined
      const s = panelStatus(panelChecks(panel, panelLayout(panel), ref, criteria))
      return [{ panel, used, status: (used > (panel.stock ?? 0) && s === 'ok' ? 'warn' : s) as Status }]
    })
    .sort((x, y) => x.panel.code.localeCompare(y.panel.code, undefined, { numeric: true }))

  const wales: AssemblyResult['wales'] = []
  if (el && run) {
    try {
      for (const p of elementModel(el, run).parts) {
        if (p.group !== 'wale' || p.shape !== 'box') continue
        const b = p as BoxPart
        const axis = b.size[0] >= b.size[2] ? 'x' : 'y'
        const length = r3(Math.max(b.size[0], b.size[2]))
        const w = wales.find((w) => w.axis === axis && Math.abs(w.length - length) < 0.001)
        if (w) w.count++
        else wales.push({ axis, length, count: 1 })
      }
    } catch {
      /* no model: wales not listed */
    }
  }
  const all = [...FACE_KEYS.map((k) => faces[k].status), ...usage.map((u) => u.status)]
  const status: Status = all.includes('fail') ? 'fail' : all.includes('warn') ? 'warn' : 'ok'
  return { specs, faces, usage, wales, status }
}

/** a filler panel `width` wide made like `like` (same height, plywood and studs) */
export function fillerLike(like: PanelData, width: number): PanelData {
  return { ...like, width: r3(width), name: 'แผงเสริม', stock: 0, edges: { ...like.edges, left: true, right: true }, note: '' }
}
