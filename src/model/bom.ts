// Bill of materials taken from the formwork geometry: every part of the model is identified (section, material,
// cut length) and identical pieces are counted together. The shop drawing tags (marks) refer to these lines.
import type { AnyDesign } from '@/data/elements'
import type { ElementData } from '@/data/types'
import { beamBracing, beamCrossJoist, getMaterial, getSection, getTie, type Section } from '@/engine'
import { elementModel } from './elementModel'
import { type FormModel, GROUP_LABEL, type Part, type PartGroup } from './formModel'

export type BomCategory = 'plywood' | 'board' | 'timber' | 'steel' | 'tie' | 'shore' | 'accessory'

export interface BomLine {
  mark: number
  group: PartGroup
  category: BomCategory
  /** member description, e.g. 1½"×3" ไม้ยาง */
  description: string
  /** cut size of one piece: "L 2.50 ม." or "1.22 × 2.44 ม." */
  size: string
  /** length of one piece, m (linear members) */
  lengthM?: number
  /** area of one piece, m² (sheet goods) */
  areaM2?: number
  qty: number
  unit: string
  /** timber volume, ลบ.ฟ. (nominal inches × length in ft / 144) */
  volumeFt3?: number
  /** steel weight, kg */
  weightKg?: number
  /** model parts in this line (for drawing callouts) */
  partIds: string[]
}

export const SHEET_AREA = 1.22 * 2.44
const FT3_CM3 = 28316.85

const shortName = (materialId: string) => getMaterial(materialId).name.replace(/\s*\(.*\)\s*$/, '')

/** Nominal size in inches of a timber section id "timber-1.5x3" (book 2.5 cm/inch convention). */
function nominalInches(s: Section): [number, number] | undefined {
  const m = /^timber-([\d.]+)x([\d.]+)$/.exec(s.id)
  return m ? [Number(m[1]), Number(m[2])] : undefined
}

interface Spec {
  category: BomCategory
  description: string
  unit: string
  section?: Section
  /** member weight per metre, kg/m */
  w?: number
  /** nominal size in inches when there is no library section (knee braces) */
  nominal?: [number, number]
  /** piece of an assembly counted on another part (jack stem, nut) */
  sub?: boolean
}

const memberSpec = (sectionId: string, materialId: string, role?: string): Spec => {
  const s = getSection(sectionId)
  const m = getMaterial(materialId)
  const steel = m.kind === 'steel' || s.shape === 'pipe'
  return { category: steel ? 'steel' : 'timber', description: `${role ? `${role} ` : ''}${s.label} ${steel && s.shape === 'pipe' ? '' : shortName(materialId)}`.trim(), unit: 'ท่อน', section: s, w: steel ? s.w : undefined }
}

/** What a model part is made of. */
function partSpec(el: ElementData, p: Part): Spec | undefined {
  const g = p.group
  const i = el.input as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  if (g === 'concrete') return undefined
  if (g === 'sheathing') {
    if (p.kind === 'plywood') return { category: 'plywood', description: `ไม้อัด ${'thicknessMm' in i.sheathing ? i.sheathing.thicknessMm : ''} มม. ${shortName(i.sheathing.materialId)}`, unit: 'แผ่น' }
    const t = 'thicknessCm' in i.sheathing ? i.sheathing.thicknessCm : 2.5
    return { category: 'board', description: `ไม้กระดานหนา ${t} ซม. ${shortName(i.sheathing.materialId)}`, unit: 'แผ่น' }
  }
  if (g === 'tie') {
    if (p.id.startsWith('tieplate') && el.type === 'footing' && p.shape === 'box') {
      const [a, b, c] = [...p.size].sort((x, y) => y - x).map((x) => x * 100)
      return { category: 'accessory', description: `เหล็กประกับไทร์ ${Math.round(b)}×${Math.round(a)} ซม. หนา ${Math.round(c * 10)} มม.`, unit: 'แผ่น' }
    }
    if (p.id.startsWith('tieplate')) return { category: 'accessory', description: 'แผ่นรองไทร์ / Washer plate 8×8 ซม.', unit: 'ตัว' }
    if (p.id.startsWith('bolt')) return { category: 'accessory', description: 'สลักเกลียวยึดคานรัด Ø12 มม. + น็อต', unit: 'ชุด' }
    return { category: 'tie', description: getTie(i.tie.tieId).name, unit: 'ชุด' }
  }
  if (g === 'shore') {
    const s = i.shore
    if (p.id.endsWith('-base')) return { category: 'accessory', description: `แป้นรองฐานเสาค้ำ ${s.baseCm}×${s.baseCm} ซม.`, unit: 'ตัว' }
    // stem, nut and side plates of a screw jack sit in the line of its plate without adding to the count
    const sub = /-(head|jack)-[a-z]$/.test(p.id)
    if (/-jack(-[a-z])?$/.test(p.id)) return { category: 'accessory', description: 'แจ็คเบส (Jack base) ปรับระดับ', unit: 'ตัว', sub }
    if (/-head(-[a-z])?$/.test(p.id)) return { category: 'accessory', description: 'ยูเฮด / ก้ามปู (U-head) ปรับระดับ', unit: 'ตัว', sub }
    if (p.id.startsWith('knee')) return { category: 'timber', description: 'ไม้เท้าแขนตุ๊กตา 1"×2½"', unit: 'ท่อน', nominal: [1, 2.5] }
    if (p.id.startsWith('xbr')) return { category: 'timber', description: 'ไม้ค้ำทแยงเสาคู่ 1"×3"', unit: 'ท่อน', nominal: [1, 3] }
    if (s.kind === 'rated') return { category: 'shore', description: s.ratedName, unit: 'ต้น' }
    return { ...memberSpec(s.sectionId, s.materialId, 'เสาค้ำ'), category: 'shore', unit: 'ต้น' }
  }
  const pick = (): [string, string] | undefined => {
    switch (g) {
      case 'stud':
        return [i.stud.sectionId, i.stud.materialId]
      case 'wale':
        return el.type === 'beam' ? [i.tie.waleSectionId, i.tie.waleMaterialId] : [i.wale.sectionId, i.wale.materialId]
      case 'yoke':
        return [i.yoke.sectionId, i.yoke.materialId]
      case 'brace':
        return [i.brace.sectionId, i.brace.materialId]
      case 'joist': {
        const j = el.type === 'beam' ? beamCrossJoist(el.input) : i.joist
        return [j.sectionId, j.materialId]
      }
      case 'stringer':
        return [i.stringer.sectionId, i.stringer.materialId]
      case 'bracing': {
        const b = el.type === 'beam' ? beamBracing(el.input) : i.bracing
        return [b.sectionId, b.materialId]
      }
      case 'bottom':
        return [i.bottom.sectionId, i.bottom.materialId]
      case 'head':
        return [i.head.sectionId, i.head.materialId]
      case 'stake':
        return [i.stake.sectionId, 'timber-yang']
      default:
        return undefined
    }
  }
  const sm = pick()
  if (!sm) return undefined
  const role = g === 'stake' ? (p.id.startsWith('kick') ? 'หลักตีนเคร่า' : 'หลักรับค้ำยัน') : GROUP_LABEL[g]
  return memberSpec(sm[0], sm[1], role)
}

/** Length of a linear part and the two dimensions of a sheet, m. */
function partDims(p: Part): { length: number; w: number; t: number } {
  if (p.shape === 'bar') return { length: Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1], p.to[2] - p.from[2]), w: p.b, t: p.d }
  const [a, b, c] = [...p.size].sort((x, y) => y - x)
  return { length: a, w: b, t: c }
}

const GROUP_ORDER: PartGroup[] = ['sheathing', 'stud', 'joist', 'bottom', 'wale', 'yoke', 'stringer', 'head', 'tie', 'shore', 'bracing', 'brace', 'stake']

export function modelBom(el: ElementData, model: FormModel): BomLine[] {
  const lines = new Map<string, BomLine & { order: number }>()
  for (const p of model.parts) {
    const spec = partSpec(el, p)
    if (!spec) continue
    const d = partDims(p)
    const sheet = spec.category === 'plywood' || spec.category === 'board'
    const accessory = spec.category === 'accessory' || spec.category === 'tie'
    const L = Math.round(d.length * 100) / 100
    const W = Math.round(d.w * 100) / 100
    const size = sheet ? `${W.toFixed(2)} × ${L.toFixed(2)} ม.` : accessory && spec.category === 'accessory' ? '–' : `ยาว ${L.toFixed(2)} ม.`
    const key = `${p.group}|${spec.description}|${size}`
    let line = lines.get(key)
    if (!line) {
      line = {
        mark: 0,
        order: GROUP_ORDER.indexOf(p.group) * 1000 + (sheet ? -W * L : -L),
        group: p.group,
        category: spec.category,
        description: spec.description,
        size,
        lengthM: sheet || spec.category === 'accessory' ? undefined : L,
        areaM2: sheet ? W * L : undefined,
        qty: 0,
        unit: spec.unit,
        partIds: [],
      }
      const nom = spec.nominal ?? (spec.section && spec.category !== 'steel' ? nominalInches(spec.section) : undefined)
      // timber volume: nominal sizes, else the true section (round logs), else sheet area × thickness (boards)
      if (nom || (spec.section && !spec.w) || spec.category === 'board') line.volumeFt3 = 0
      if (spec.w) line.weightKg = 0
      lines.set(key, line)
    }
    line.partIds.push(p.id)
    if (spec.sub) continue
    line.qty++
    const nom = spec.nominal ?? (spec.section ? nominalInches(spec.section) : undefined)
    if (line.volumeFt3 !== undefined) {
      if (nom) line.volumeFt3 += (nom[0] * nom[1] * L * 3.2808) / 144
      else if (spec.section) line.volumeFt3 += (spec.section.A * L * 100) / FT3_CM3
      else line.volumeFt3 += (d.length * d.w * d.t * 1e6) / FT3_CM3
    }
    if (line.weightKg !== undefined && spec.w) line.weightKg += spec.w * L
  }
  const out = [...lines.values()].sort((a, b) => a.order - b.order || a.description.localeCompare(b.description))
  return out.map(({ order: _o, ...l }, k) => ({ ...l, mark: k + 1 }))
}

export function elementBom(el: ElementData, run: AnyDesign): { model: FormModel; lines: BomLine[] } {
  const model = elementModel(el, run)
  return { model, lines: modelBom(el, model) }
}

export interface BomSummary {
  plywood: { description: string; area: number; sheets: number }[]
  timber: { description: string; length: number; volumeFt3: number }[]
  steel: { description: string; length: number; weightKg: number }[]
  counts: { description: string; qty: number; unit: string }[]
  concreteM3: number
}

/** Material totals of several BOMs (each multiplied by its element quantity). */
export function summarize(items: { lines: BomLine[]; qty: number; concreteM3?: number }[]): BomSummary {
  const ply = new Map<string, { area: number }>()
  const tim = new Map<string, { length: number; volumeFt3: number }>()
  const stl = new Map<string, { length: number; weightKg: number }>()
  const cnt = new Map<string, { qty: number; unit: string }>()
  let concreteM3 = 0
  for (const it of items) {
    concreteM3 += (it.concreteM3 ?? 0) * it.qty
    for (const l of it.lines) {
      const n = l.qty * it.qty
      if (l.areaM2 !== undefined) {
        const e = ply.get(l.description) ?? { area: 0 }
        e.area += l.areaM2 * n
        ply.set(l.description, e)
      } else if (l.category === 'timber' && l.lengthM !== undefined) {
        const e = tim.get(l.description) ?? { length: 0, volumeFt3: 0 }
        e.length += l.lengthM * n
        e.volumeFt3 += (l.volumeFt3 ?? 0) * it.qty
        tim.set(l.description, e)
      } else if ((l.category === 'steel' || (l.category === 'shore' && l.weightKg !== undefined)) && l.lengthM !== undefined) {
        const e = stl.get(l.description) ?? { length: 0, weightKg: 0 }
        e.length += l.lengthM * n
        e.weightKg += (l.weightKg ?? 0) * it.qty
        stl.set(l.description, e)
      } else {
        const e = cnt.get(l.description) ?? { qty: 0, unit: l.unit }
        e.qty += n
        cnt.set(l.description, e)
      }
    }
  }
  return {
    plywood: [...ply].map(([description, e]) => ({ description, area: e.area, sheets: Math.ceil(e.area / SHEET_AREA - 1e-9) })),
    timber: [...tim].map(([description, e]) => ({ description, ...e })),
    steel: [...stl].map(([description, e]) => ({ description, ...e })),
    counts: [...cnt].map(([description, e]) => ({ description, ...e })),
    concreteM3,
  }
}

/** Concrete volume of the element, m³ (from the model's concrete parts, lean concrete excluded). */
export function concreteVolume(model: FormModel): number {
  return model.parts.filter((p) => p.group === 'concrete' && p.shape === 'box' && p.id !== 'lean').reduce((v, p) => v + (p.shape === 'box' ? p.size[0] * p.size[1] * p.size[2] : 0), 0)
}

export const groupLabel = (g: PartGroup) => GROUP_LABEL[g]

/** CSV (UTF-8 with BOM so Excel reads Thai) of BOM rows. */
export function toCsv(rows: (string | number | undefined)[][]): string {
  const cell = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}
