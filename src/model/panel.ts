// Form Assembly — one prefabricated panel: plywood sheets, studs, edge studs, caps and blocking under the plywood
// joints, laid out from the panel's size and stud spacing. Coordinates in metres on the panel face, origin at the
// bottom-left corner, x along the width, y up the height. Shared by the panel editor drawing, its cut list and checks.
import { type AnyDesign, TYPE_LABEL } from '@/data/elements'
import type { Criteria, ElementData, PanelData, PanelEdge, SheetLay } from '@/data/types'
import { type DeflectionCriteria, getMaterial, getSection, maxSpan, plywoodStrip, pressureToLineLoad, type Status } from '@/engine'
import { SHEET_H, SHEET_W } from './cutting'

export type PanelMemberKind = 'edge' | 'stud' | 'cap' | 'block'

/** a timber member on the back of the panel, as the rectangle it covers on the face */
export interface PanelMember {
  kind: PanelMemberKind
  x: number
  y: number
  w: number
  h: number
  /** member length, m */
  length: number
}

export interface PlyPiece {
  x: number
  y: number
  w: number
  h: number
}

export interface PanelLayout {
  ply: PlyPiece[]
  /** plywood joints: vertical lines x = at, horizontal lines y = at */
  seams: { axis: 'x' | 'y'; at: number }[]
  lay: Exclude<SheetLay, 'auto'>
  members: PanelMember[]
  /** centre-to-centre spacings of the studs, cm */
  spacings: number[]
  /** plywood overhang past the outermost stud at a side without an edge stud, cm */
  overhangs: { edge: PanelEdge; cm: number }[]
  /** stud width on the face and depth, m */
  studB: number
  studD: number
  /** panel thickness = plywood + stud depth, m */
  thickness: number
  weightKg: number
  cuts: { kind: PanelMemberKind; length: number; qty: number }[]
}

export const MEMBER_LABEL: Record<PanelMemberKind, string> = { edge: 'เคร่าปิดขอบ', stud: 'เคร่า', cap: 'เคร่าปิดหัว/ท้าย', block: 'ไม้รองรอยต่อไม้อัด' }
export const EDGE_LABEL: Record<PanelEdge, string> = { left: 'ซ้าย', right: 'ขวา', top: 'บน', bottom: 'ล่าง' }

/** approximate densities for the panel weight, kg/m³ */
const PLY_DENSITY = 600
const TIMBER_DENSITY = 750
/** carried by hand: about this much per person; heavier panels go by crane */
export const KG_PER_PERSON = 30
export const HAND_LIFT_MAX_KG = 100

const r3 = (v: number) => Math.round(v * 1000) / 1000
const uniq = (xs: number[]) => [...new Set(xs.map(r3))].sort((a, b) => a - b)

/** cut points 0 < … < L every `step` */
const cutsAlong = (L: number, step: number) => {
  const out: number[] = []
  for (let a = step; a < L - 1e-6; a += step) out.push(r3(a))
  return out
}

function sheetGrid(W: number, H: number, lay: Exclude<SheetLay, 'auto'>) {
  const [sw, sh] = lay === 'long-width' ? [SHEET_H, SHEET_W] : [SHEET_W, SHEET_H]
  const xs = [0, ...cutsAlong(W, sw), W]
  const ys = [0, ...cutsAlong(H, sh), H]
  const ply: PlyPiece[] = []
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) ply.push({ x: xs[i], y: ys[j], w: r3(xs[i + 1] - xs[i]), h: r3(ys[j + 1] - ys[j]) })
  const seams = [...xs.slice(1, -1).map((at) => ({ axis: 'x' as const, at })), ...ys.slice(1, -1).map((at) => ({ axis: 'y' as const, at }))]
  return { ply, seams }
}

/** fewest plywood pieces, then fewest joints; a tie lays the long side along the longer panel side */
export function pickLay(W: number, H: number, lay: SheetLay): Exclude<SheetLay, 'auto'> {
  if (lay !== 'auto') return lay
  const a = sheetGrid(W, H, 'long-width')
  const b = sheetGrid(W, H, 'long-height')
  if (a.ply.length !== b.ply.length) return a.ply.length < b.ply.length ? 'long-width' : 'long-height'
  if (a.seams.length !== b.seams.length) return a.seams.length < b.seams.length ? 'long-width' : 'long-height'
  return W >= H ? 'long-width' : 'long-height'
}

export function panelLayout(p: PanelData): PanelLayout {
  const W = p.width
  const H = p.height
  const sec = getSection(p.stud.sectionId)
  const b = sec.B / 100
  const d = sec.H / 100
  const s = Math.max(p.stud.spacingCm, 5) / 100
  const lay = pickLay(W, H, p.plywood.lay)
  const { ply, seams } = sheetGrid(W, H, lay)

  // local axes: u across the studs, v along them
  const vertical = p.stud.dir === 'vertical'
  const U = vertical ? W : H
  const V = vertical ? H : W
  const [e0, e1]: [PanelEdge, PanelEdge] = vertical ? ['left', 'right'] : ['bottom', 'top']
  const [c0, c1]: [PanelEdge, PanelEdge] = vertical ? ['bottom', 'top'] : ['left', 'right']
  const toFace = (u: number, v: number, du: number, dv: number) => (vertical ? { x: r3(u), y: r3(v), w: r3(du), h: r3(dv) } : { x: r3(v), y: r3(u), w: r3(dv), h: r3(du) })
  const across = seams.filter((j) => j.axis === (vertical ? 'x' : 'y')).map((j) => j.at)
  const along = seams.filter((j) => j.axis === (vertical ? 'y' : 'x')).map((j) => j.at)

  // studs: at the edges that have edge studs (or half a spacing in, so panels butted together keep the spacing),
  // under every plywood joint parallel to them, and at equal spacing ≤ s between those
  const start = p.edges[e0] ? b / 2 : Math.min(s / 2, U / 2)
  const end = p.edges[e1] ? U - b / 2 : Math.max(U - s / 2, U / 2)
  const anchors = uniq([start, ...across.filter((a) => a > start && a < end), end])
  const lines: number[] = []
  for (let i = 0; i < anchors.length - 1; i++) {
    const gap = anchors[i + 1] - anchors[i]
    const n = Math.max(1, Math.ceil(gap / s - 1e-6))
    for (let k = 0; k < n; k++) lines.push(anchors[i] + (k * gap) / n)
  }
  lines.push(anchors[anchors.length - 1])
  const studs = uniq(lines)

  const v0 = p.edges[c0] ? b : 0
  const v1 = p.edges[c1] ? V - b : V
  const members: PanelMember[] = studs.map((u, i) => ({
    kind: (i === 0 && p.edges[e0]) || (i === studs.length - 1 && p.edges[e1]) ? 'edge' : 'stud',
    ...toFace(u - b / 2, v0, b, v1 - v0),
    length: r3(v1 - v0),
  }))
  if (p.edges[c0]) members.push({ kind: 'cap', ...toFace(0, 0, U, b), length: r3(U) })
  if (p.edges[c1]) members.push({ kind: 'cap', ...toFace(0, V - b, U, b), length: r3(U) })
  // blocking under plywood joints that cross the studs, cut between the studs
  for (const at of along) {
    if (at - b / 2 < v0 - 1e-6 || at + b / 2 > v1 + 1e-6) continue // already on a cap
    for (let i = 0; i < studs.length - 1; i++) {
      const len = studs[i + 1] - studs[i] - b
      if (len > 1e-3) members.push({ kind: 'block', ...toFace(studs[i] + b / 2, at - b / 2, len, b), length: r3(len) })
    }
  }

  const spacings = studs.slice(1).map((u, i) => Math.round((u - studs[i]) * 1000) / 10)
  const overhangs: PanelLayout['overhangs'] = []
  if (!p.edges[e0]) overhangs.push({ edge: e0, cm: Math.round((studs[0] - b / 2) * 1000) / 10 })
  if (!p.edges[e1]) overhangs.push({ edge: e1, cm: Math.round((U - studs[studs.length - 1] - b / 2) * 1000) / 10 })

  const timberM = members.reduce((a, m) => a + m.length, 0)
  const weightKg = W * H * (p.plywood.thicknessMm / 1000) * PLY_DENSITY + timberM * (sec.w ?? (sec.A / 1e4) * TIMBER_DENSITY)

  const cutMap = new Map<string, { kind: PanelMemberKind; length: number; qty: number }>()
  for (const m of members) {
    const k = `${m.kind === 'edge' ? 'stud' : m.kind}:${m.length.toFixed(3)}`
    const c = cutMap.get(k)
    if (c) c.qty++
    else cutMap.set(k, { kind: m.kind === 'edge' ? 'stud' : m.kind, length: m.length, qty: 1 })
  }
  const cuts = [...cutMap.values()].sort((a, b) => b.length - a.length)

  return { ply, seams, lay, members, spacings, overhangs, studB: b, studD: d, thickness: r3(p.plywood.thicknessMm / 1000 + d), weightKg, cuts }
}

// ---------------------------------------------------------------- checks

export interface PanelCheck {
  status: Status | 'info'
  label: string
  detail?: string
}

/** elements a panel can be checked against: side forms carried by vertical studs */
export const panelRefTypes = new Set<ElementData['type']>(['wall', 'column', 'footing', 'beam'])

interface RefDesign {
  el: ElementData
  run: AnyDesign
}

function refStud(el: ElementData) {
  if (el.type === 'slab') return undefined
  return el.input.stud
}

export function panelChecks(p: PanelData, L: PanelLayout, ref?: RefDesign, criteria?: Pick<Criteria, 'deflectionRatio' | 'deflectionAbsMm'>): PanelCheck[] {
  const out: PanelCheck[] = []
  const maxS = Math.max(...L.spacings, 0)
  out.push({ status: maxS <= p.stud.spacingCm + 0.05 ? 'ok' : 'warn', label: `ระยะเคร่าจริงสูงสุด ${maxS.toFixed(1)} ซม. (กำหนด ≤ ${p.stud.spacingCm})` })
  const seams = L.seams.length
  out.push({ status: 'ok', label: seams ? `รอยต่อไม้อัด ${seams} แนว — มีเคร่าหรือไม้รองรับทุกแนว` : 'ไม้อัดแผ่นเดียว ไม่มีรอยต่อ' })
  for (const o of L.overhangs) out.push({ status: o.cm > p.stud.spacingCm / 2 + 1 ? 'warn' : 'info', label: `ด้าน${EDGE_LABEL[o.edge]}ไม่มีเคร่าปิดขอบ — ไม้อัดยื่น ${o.cm.toFixed(1)} ซม.`, detail: 'ใช้ต่อชนกับแผงข้างเคียงที่มีเคร่าปิดขอบ' })
  const kg = L.weightKg
  if (kg > HAND_LIFT_MAX_KG) out.push({ status: 'warn', label: `น้ำหนักประมาณ ${kg.toFixed(0)} กก. — เกิน ${HAND_LIFT_MAX_KG} กก.`, detail: 'ควรใช้เครื่องยก หรือแบ่งเป็นแผงเล็กลง' })
  else out.push({ status: 'info', label: `น้ำหนักประมาณ ${kg.toFixed(0)} กก. — ยกด้วยแรงคน ${Math.max(1, Math.ceil(kg / KG_PER_PERSON))} คน` })

  if (!ref) return out
  const { el, run } = ref
  const name = `${el.code} (${TYPE_LABEL[el.type]})`
  // plywood between the panel's studs under the element's design pressure
  const deflection: DeflectionCriteria | undefined = criteria ? { ratio: criteria.deflectionRatio, absCm: criteria.deflectionAbsMm ? criteria.deflectionAbsMm / 10 : undefined } : undefined
  const P = run.design.pressure.Pmax
  const ply = { section: plywoodStrip(p.plywood.thicknessMm), material: getMaterial(p.plywood.materialId), support: 'continuous' as const, deflection }
  const lim = maxSpan(ply, pressureToLineLoad(P, 1))
  const r = maxS / lim.max
  out.push({
    status: r > 1 ? 'fail' : r >= 0.9 ? 'warn' : 'ok',
    label: `ไม้อัด ${p.plywood.thicknessMm} มม. รับแรงดัน ${Math.round(P).toLocaleString()} กก./ม.² ของ ${name}: ช่วงเคร่าได้ไม่เกิน ${lim.max.toFixed(1)} ซม.`,
    detail: `ใช้ ${maxS.toFixed(1)} ซม. (อัตราส่วน ${r.toFixed(2)})`,
  })
  const rs = refStud(el)
  const comp = run.design.components.find((c) => c.key === 'sheathing')
  if (rs && comp?.spacing) {
    const a = comp.spacing.value
    const mine = getSection(p.stud.sectionId)
    const theirs = getSection(rs.sectionId)
    const mMine = getMaterial(p.stud.materialId)
    const mTheirs = getMaterial(rs.materialId)
    const stronger = mine.Sx * mMine.Fb >= theirs.Sx * mTheirs.Fb - 1e-6 && mine.Ix * mMine.E >= theirs.Ix * mTheirs.E - 1e-6
    const ok = maxS <= a + 0.05 && stronger
    out.push({
      status: ok ? 'ok' : 'warn',
      label: ok ? `เคร่า ${mine.label} @≤${a} ซม. ไม่ด้อยกว่าที่ออกแบบใน ${name}` : `เคร่าต่างจากที่ออกแบบใน ${name} (${theirs.label} @${a} ซม.)`,
      detail: ok ? undefined : 'ตรวจเคร่าใหม่ในชุดประกอบ (ระยะคานรับเคร่าขึ้นกับชุดประกอบ)',
    })
    // studs must cross the wales: a wall designed with horizontal studs needs panels with horizontal studs
    const need = (el.type === 'wall' || el.type === 'footing') && el.input.system === 'horizontal' ? 'horizontal' : 'vertical'
    if (p.stud.dir !== need) {
      const dir = (d: string) => (d === 'vertical' ? 'เคร่าตั้ง' : 'เคร่านอน')
      const hard = el.type === 'wall' || need === 'horizontal'
      out.push({ status: hard ? 'warn' : 'info', label: `${name} คำนวณเป็น${dir(need)} — แผงนี้วาง${dir(p.stud.dir)}`, detail: hard ? 'เคร่าจะขนานกับคาน — เลือกแผงที่แนวเคร่าตรงกับระบบของกำแพง หรือเปลี่ยนระบบเคร่าของกำแพง' : 'ต้องวางแผงตะแคงให้เคร่าตั้ง หรือตรวจระบบเคร่าใหม่' })
    }
  }
  return out
}

/** worst status of the checks (info counts as ok) */
export function panelStatus(checks: PanelCheck[]): Status {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  return 'ok'
}

/** suggested code from the size: P-2412 = 2.40 × 1.20 m (decimetres); F-25x120 = 0.25 × 1.20 m (centimetres, when a
 *  side is not whole decimetres); fillers (a side < 0.30 m) F- */
export function panelCodeFor(width: number, height: number, taken: string[]): string {
  const cm = [width, height].map((v) => Math.round(v * 100))
  const size = cm.every((c) => c % 10 === 0) ? cm.map((c) => String(c / 10).padStart(2, '0')).join('') : cm.join('x')
  const base = `${Math.min(width, height) < 0.3 ? 'F' : 'P'}-${size}`
  if (!taken.includes(base)) return base
  for (let i = 0; i < 26; i++) {
    const c = `${base}-${String.fromCharCode(65 + i)}`
    if (!taken.includes(c)) return c
  }
  return `${base}-${taken.length}`
}
