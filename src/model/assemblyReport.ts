// Form Assembly — project summary: panels needed by every assembly against the stock, and the materials to build
// the stock (plywood pieces and sheets, studs by size). Used by the summary tab, its CSV and the print sheets.
import type { Criteria, FormAssembly, FormElement, FormPanel } from '@/data/types'
import { runDesign } from '@/data/elements'
import { getSection, type Status } from '@/engine'
import { analyzeAssembly, type AssemblyResult, faceLayoutOf } from './assembly'
import { packSheets, type Piece } from './cutting'
import { MEMBER_LABEL, type PanelMemberKind, panelLayout } from './panel'
import { FACE_KEYS } from '@/data/types'

export interface AnalyzedAssembly {
  assembly: FormAssembly
  element?: FormElement
  result?: AssemblyResult
}

/** every assembly analysed against its element (no result when the element is missing or not covered) */
export function analyzeAll(assemblies: FormAssembly[], elements: FormElement[], panels: FormPanel[], criteria: Criteria): AnalyzedAssembly[] {
  return assemblies.map((assembly) => {
    const element = elements.find((e) => e.id === assembly.elementId)
    if (!element) return { assembly, element }
    try {
      const run = runDesign(element, criteria)
      return { assembly, element, result: analyzeAssembly(assembly, element, run, panels, criteria) }
    } catch {
      return { assembly, element }
    }
  })
}

export interface UsageRow {
  panel: FormPanel
  /** panels per set, by assembly id */
  perAssembly: Record<string, number>
  /** the most any one assembly needs: enough when the sets are erected one after another */
  maxSet: number
  /** all assemblies standing at the same time */
  allSets: number
  stock: number
  status: Status
}

export function panelUsage(panels: FormPanel[], all: AnalyzedAssembly[]): UsageRow[] {
  return panels.map((panel) => {
    const perAssembly: Record<string, number> = {}
    for (const { assembly, result } of all) {
      let n = 0
      // the element's own faces when analysed (a beam has no face D); otherwise all four with the default links
      const layouts = result ? result.keys.map((k) => result.layouts[k]!) : FACE_KEYS.map((k) => faceLayoutOf(assembly, k))
      for (const l of layouts) for (const c of l.courses) n += c.panels.filter((id) => id === panel.id).length
      if (n) perAssembly[assembly.id] = n
    }
    const counts = Object.values(perAssembly)
    const maxSet = counts.length ? Math.max(...counts) : 0
    const allSets = counts.reduce((a, b) => a + b, 0)
    const stock = panel.stock ?? 0
    const status: Status = maxSet > stock ? 'fail' : allSets > stock ? 'warn' : 'ok'
    return { panel, perAssembly, maxSet, allSets, stock, status }
  })
}

// ---------------------------------------------------------------- materials to build the stock

export interface PanelBom {
  plywood: { thicknessMm: number; materialId: string; pieces: number; areaM2: number; sheets: number }[]
  timber: { sectionId: string; label: string; kind: PanelMemberKind; length: number; qty: number }[]
  timberTotals: { sectionId: string; label: string; lengthM: number; volumeFt3: number }[]
}

/** nominal inches from a timber section id (timber-2x3 → [2, 3]) */
const nominal = (id: string) => {
  const m = /^timber-([\d.]+)x([\d.]+)$/.exec(id)
  return m ? [Number(m[1]), Number(m[2])] : undefined
}
const FT3_CM3 = 28316.85

/** materials for `qty(panel)` of every panel (default: the stock) */
export function panelBom(panels: FormPanel[], qty: (p: FormPanel) => number = (p) => p.stock ?? 0): PanelBom {
  const ply = new Map<string, { thicknessMm: number; materialId: string; pieces: Piece[]; area: number }>()
  const cuts = new Map<string, PanelBom['timber'][number]>()
  let mark = 1
  for (const p of panels) {
    const n = qty(p)
    if (n <= 0) continue
    const L = panelLayout(p)
    const key = `${p.plywood.materialId}|${p.plywood.thicknessMm}`
    const g = ply.get(key) ?? { thicknessMm: p.plywood.thicknessMm, materialId: p.plywood.materialId, pieces: [], area: 0 }
    for (let i = 0; i < n; i++) for (const s of L.ply) g.pieces.push({ mark, w: s.w, h: s.h })
    g.area += n * p.width * p.height
    ply.set(key, g)
    mark++
    for (const c of L.cuts) {
      const k = `${p.stud.sectionId}|${c.kind}|${c.length.toFixed(3)}`
      const row = cuts.get(k) ?? { sectionId: p.stud.sectionId, label: getSection(p.stud.sectionId).label, kind: c.kind, length: c.length, qty: 0 }
      row.qty += c.qty * n
      cuts.set(k, row)
    }
  }
  const timber = [...cuts.values()].sort((a, b) => a.label.localeCompare(b.label) || b.length - a.length)
  const totals = new Map<string, PanelBom['timberTotals'][number]>()
  for (const t of timber) {
    const row = totals.get(t.sectionId) ?? { sectionId: t.sectionId, label: t.label, lengthM: 0, volumeFt3: 0 }
    const len = t.length * t.qty
    row.lengthM += len
    const nom = nominal(t.sectionId)
    row.volumeFt3 += nom ? (nom[0] * nom[1] * len * 3.2808) / 144 : (getSection(t.sectionId).A * len * 100) / FT3_CM3
    totals.set(t.sectionId, row)
  }
  return {
    plywood: [...ply.values()].map((g) => ({ thicknessMm: g.thicknessMm, materialId: g.materialId, pieces: g.pieces.length, areaM2: g.area, sheets: packSheets(g.pieces).length })),
    timber,
    timberTotals: [...totals.values()],
  }
}

export const cutLabel = (k: PanelMemberKind) => MEMBER_LABEL[k]
