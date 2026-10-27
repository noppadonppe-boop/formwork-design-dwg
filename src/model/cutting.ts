// Plywood cutting plan: the plywood pieces of the model packed onto 1.22 × 2.44 m sheets (guillotine cuts,
// pieces may rotate). Pieces bigger than a sheet are split into sheet-sized parts (joints over a stud/joist on site).
import type { BomLine } from './bom'
import type { FormModel } from './formModel'

export const SHEET_W = 1.22
export const SHEET_H = 2.44
const KERF = 0.003

export interface Piece {
  mark: number
  w: number
  h: number
}
export interface Placed extends Piece {
  x: number
  y: number
  rotated: boolean
}
export interface CutSheet {
  pieces: Placed[]
  /** used area / sheet area */
  usage: number
  full: boolean
}

/** Split a piece into parts no larger than the sheet (short side ≤ 1.22, long side ≤ 2.44). */
export function splitPiece(p: Piece): Piece[] {
  const [s, l] = p.w <= p.h ? [p.w, p.h] : [p.h, p.w]
  const parts = (len: number, max: number) => {
    const out: number[] = []
    for (let r = len; r > 1e-6; r -= max) out.push(Math.min(r, max))
    return out
  }
  if (s <= SHEET_W + 1e-6 && l <= SHEET_H + 1e-6) return [{ mark: p.mark, w: s, h: l }]
  const out: Piece[] = []
  for (const a of parts(s, SHEET_W)) for (const b of parts(l, SHEET_H)) out.push({ mark: p.mark, w: a, h: b })
  return out
}

export function packSheets(pieces: Piece[]): CutSheet[] {
  // guillotine packing: each sheet keeps a list of free rectangles; a piece goes into the best-fitting free
  // rectangle (least leftover area), which is then split along the shorter leftover — saw cuts run edge to edge
  type Rect = { x: number; y: number; w: number; h: number }
  const all = pieces.flatMap(splitPiece).sort((a, b) => b.w * b.h - a.w * a.h || Math.max(b.w, b.h) - Math.max(a.w, a.h))
  const sheets: { free: Rect[]; pieces: Placed[] }[] = []
  const fit = (sh: (typeof sheets)[number], p: Piece) => {
    let best: { r: Rect; w: number; h: number; rotated: boolean; waste: number } | undefined
    for (const r of sh.free)
      for (const [w, h, rotated] of [
        [p.w, p.h, false],
        [p.h, p.w, true],
      ] as [number, number, boolean][])
        if (w <= r.w + 1e-6 && h <= r.h + 1e-6) {
          const waste = r.w * r.h - w * h
          if (!best || waste < best.waste - 1e-9) best = { r, w, h, rotated, waste }
        }
    if (!best) return false
    const { r, w, h } = best
    sh.free.splice(sh.free.indexOf(r), 1)
    sh.pieces.push({ ...p, w, h, x: r.x, y: r.y, rotated: best.rotated })
    const rw = r.w - w - KERF
    const rh = r.h - h - KERF
    // split so the larger leftover stays whole
    if (rw * r.h > rh * r.w) {
      if (rw > 0.01) sh.free.push({ x: r.x + w + KERF, y: r.y, w: rw, h: r.h })
      if (rh > 0.01) sh.free.push({ x: r.x, y: r.y + h + KERF, w, h: rh })
    } else {
      if (rh > 0.01) sh.free.push({ x: r.x, y: r.y + h + KERF, w: r.w, h: rh })
      if (rw > 0.01) sh.free.push({ x: r.x + w + KERF, y: r.y, w: rw, h })
    }
    return true
  }
  for (const p of all) {
    if (sheets.some((sh) => fit(sh, p))) continue
    const sh = { free: [{ x: 0, y: 0, w: SHEET_W, h: SHEET_H }], pieces: [] as Placed[] }
    sheets.push(sh)
    fit(sh, p)
  }
  return sheets.map((s) => {
    const used = s.pieces.reduce((a, p) => a + p.w * p.h, 0)
    return { pieces: s.pieces, usage: used / (SHEET_W * SHEET_H), full: s.pieces.length === 1 && used / (SHEET_W * SHEET_H) > 0.99 }
  })
}

/** Plywood pieces of an element (one per model part), from its BOM lines. */
export function plywoodPieces(model: FormModel, lines: BomLine[]): Piece[] {
  const byId = new Map(model.parts.map((p) => [p.id, p]))
  const out: Piece[] = []
  for (const l of lines) {
    if (l.category !== 'plywood') continue
    for (const id of l.partIds) {
      const p = byId.get(id)
      if (!p || p.shape !== 'box') continue
      const [a, b] = [...p.size].sort((x, y) => y - x)
      out.push({ mark: l.mark, w: Math.round(b * 1000) / 1000, h: Math.round(a * 1000) / 1000 })
    }
  }
  return out
}
