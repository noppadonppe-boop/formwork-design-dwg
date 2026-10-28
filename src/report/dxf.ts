// DXF (R12, ASCII) export of the shop-drawing views at full size in millimetres: one layer per part group,
// dimensions as lines + text, Thai text written as \U+XXXX escapes (read by AutoCAD / BricsCAD / LibreCAD).
import type { FormModel, PartGroup } from '@/model/formModel'
import { boxOutline, corners, type Dim, type OrthoView, PROJ } from './Drawing'

export interface DxfView {
  model: FormModel
  view: OrthoView
  dims: Dim[]
  title: string
}

const LAYER_COLOR: Record<PartGroup | 'DIM' | 'TEXT', number> = {
  concrete: 8,
  sheathing: 30,
  stud: 2,
  wale: 4,
  yoke: 4,
  tie: 1,
  brace: 3,
  joist: 2,
  stringer: 4,
  shore: 5,
  bracing: 3,
  bottom: 40,
  head: 6,
  stake: 32,
  DIM: 1,
  TEXT: 7,
}
const layer = (g: PartGroup | 'DIM' | 'TEXT') => `FW-${g.toUpperCase()}`

/** Non-ASCII characters as AutoCAD unicode escapes. */
export const dxfText = (s: string) => [...s].map((ch) => (ch.charCodeAt(0) < 128 ? ch : `\\U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)).join('')

export interface DxfSheet {
  /** BOM marks drawn as numbered circles with leaders on the first view */
  marks?: { mark: number; partIds: string[] }[]
  /** BOM table rows (first row = header) drawn below the views */
  table?: string[][]
  notes?: string[]
  /** title block rows [label, value] drawn to the right of the views */
  titleBlock?: [string, string][]
}

export function toDxf(views: DxfView[], titleLines: string[] = [], sheet: DxfSheet = {}): string {
  const out: string[] = []
  const put = (...pairs: (string | number)[]) => {
    for (let i = 0; i < pairs.length; i += 2) out.push(String(pairs[i]), typeof pairs[i + 1] === 'number' ? (pairs[i + 1] as number).toFixed(3).replace(/\.?0+$/, '') || '0' : String(pairs[i + 1]))
  }
  const line = (ly: string, x1: number, y1: number, x2: number, y2: number) => put(0, 'LINE', 8, ly, 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0)
  const text = (ly: string, x: number, y: number, hgt: number, s: string, center = false) =>
    center ? put(0, 'TEXT', 8, ly, 10, x, 20, y, 30, 0, 40, hgt, 1, dxfText(s), 72, 1, 11, x, 21, y, 31, 0) : put(0, 'TEXT', 8, ly, 10, x, 20, y, 30, 0, 40, hgt, 1, dxfText(s))
  const middle = (ly: string, x: number, y: number, hgt: number, s: string) => put(0, 'TEXT', 8, ly, 10, x, 20, y, 30, 0, 40, hgt, 1, dxfText(s), 72, 1, 73, 2, 11, x, 21, y, 31, 0)
  const circle = (ly: string, x: number, y: number, r: number) => put(0, 'CIRCLE', 8, ly, 10, x, 20, y, 30, 0, 40, r)
  const rect = (ly: string, x1: number, y1: number, x2: number, y2: number) => {
    line(ly, x1, y1, x2, y1)
    line(ly, x2, y1, x2, y2)
    line(ly, x2, y2, x1, y2)
    line(ly, x1, y2, x1, y1)
  }

  const names = [...(Object.keys(LAYER_COLOR) as (keyof typeof LAYER_COLOR)[]), 'MARK', 'TABLE'] as const
  put(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC')
  put(0, 'SECTION', 2, 'TABLES')
  put(0, 'TABLE', 2, 'LTYPE', 70, 1, 0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, 0, 0, 'ENDTAB')
  put(0, 'TABLE', 2, 'LAYER', 70, names.length)
  for (const n of names) put(0, 'LAYER', 2, `FW-${n.toUpperCase()}`, 70, 0, 62, n === 'MARK' ? 6 : n === 'TABLE' ? 7 : LAYER_COLOR[n], 6, 'CONTINUOUS')
  put(0, 'ENDTAB', 0, 'ENDSEC')
  put(0, 'SECTION', 2, 'ENTITIES')

  let x0 = 0
  let maxH = 0
  let thMax = 25
  views.forEach((v, vi) => {
    const P = PROJ[v.view]
    const pts = v.model.parts.flatMap((p) => corners(p).map(P))
    const u0 = Math.min(...pts.map((q) => q[0]), ...v.dims.filter((d) => d.dir === 'v').map((d) => d.at))
    const u1 = Math.max(...pts.map((q) => q[0]), ...v.dims.filter((d) => d.dir === 'v').map((d) => d.at))
    const v0 = Math.min(...pts.map((q) => q[1]), ...v.dims.filter((d) => d.dir === 'h').map((d) => d.at))
    const v1 = Math.max(...pts.map((q) => q[1]), ...v.dims.filter((d) => d.dir === 'h').map((d) => d.at))
    const X = (u: number) => x0 + (u - u0) * 1000
    const Y = (w: number) => (w - v0) * 1000
    const th = Math.min(Math.max((Math.max(u1 - u0, v1 - v0) * 1000) / 80, 25), 120)
    for (const p of v.model.parts) {
      const ly = layer(p.group)
      const [a, b] = corners(p).map(P)
      if (p.shape === 'box' && (p.yaw || p.plan)) {
        const q = boxOutline(p, P, v.view === 'top')
        q.forEach((u, k) => {
          const w = q[(k + 1) % q.length]
          line(ly, X(u[0]), Y(u[1]), X(w[0]), Y(w[1]))
        })
        continue
      }
      if (p.shape === 'box') {
        const [xa, xb, ya, yb] = [X(Math.min(a[0], b[0])), X(Math.max(a[0], b[0])), Y(Math.min(a[1], b[1])), Y(Math.max(a[1], b[1]))]
        line(ly, xa, ya, xb, ya)
        line(ly, xb, ya, xb, yb)
        line(ly, xb, yb, xa, yb)
        line(ly, xa, yb, xa, ya)
        continue
      }
      const dx = X(b[0]) - X(a[0])
      const dy = Y(b[1]) - Y(a[1])
      const len = Math.hypot(dx, dy)
      const half = (p.b * 1000) / 2
      if (len < 1) continue
      if (half < 8) {
        line(ly, X(a[0]), Y(a[1]), X(b[0]), Y(b[1]))
        continue
      }
      const nx = (-dy / len) * half
      const ny = (dx / len) * half
      line(ly, X(a[0]) + nx, Y(a[1]) + ny, X(b[0]) + nx, Y(b[1]) + ny)
      line(ly, X(a[0]) - nx, Y(a[1]) - ny, X(b[0]) - nx, Y(b[1]) - ny)
      line(ly, X(a[0]) + nx, Y(a[1]) + ny, X(a[0]) - nx, Y(a[1]) - ny)
      line(ly, X(b[0]) + nx, Y(b[1]) + ny, X(b[0]) - nx, Y(b[1]) - ny)
    }
    const dl = layer('DIM')
    const tk = th / 2
    for (const d of v.dims) {
      const label = d.text ?? `${Math.round(Math.abs(d.b - d.a) * 100)}`
      if (d.dir === 'h') {
        const y = Y(d.at)
        line(dl, X(d.a), y, X(d.b), y)
        for (const u of [d.a, d.b]) line(dl, X(u) - tk, y - tk, X(u) + tk, y + tk)
        text(dl, (X(d.a) + X(d.b)) / 2, y + th * 0.4, th * 0.8, label, true)
      } else {
        const x = X(d.at)
        line(dl, x, Y(d.a), x, Y(d.b))
        for (const w of [d.a, d.b]) line(dl, x - tk, Y(w) - tk, x + tk, Y(w) + tk)
        text(dl, x - th * 0.4 - label.length * th * 0.55, (Y(d.a) + Y(d.b)) / 2, th * 0.8, label)
      }
    }
    text(layer('TEXT'), (X(u0) + X(u1)) / 2, -th * 3, th * 1.2, v.title, true)
    thMax = Math.max(thMax, th)
    let right = X(u1)
    if (vi === 0 && sheet.marks?.length) {
      // numbered circles in a column right of the first view, leaders to the nearest part of each mark
      const byId = new Map(v.model.parts.map((p) => [p.id, p]))
      const anchors = sheet.marks
        .map((m) => {
          const ps = m.partIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p)
          if (!ps.length) return undefined
          const pts = ps.map((p) => corners(p).map(P)).reduce((best, c) => (Math.max(...c.map((q) => q[2])) > Math.max(...best.map((q) => q[2])) ? c : best))
          return { mark: m.mark, x: X((pts[0][0] + pts[1][0]) / 2), y: Y((pts[0][1] + pts[1][1]) / 2) }
        })
        .filter((a): a is { mark: number; x: number; y: number } => !!a)
        .sort((a, b) => b.y - a.y)
      const r = th * 0.9
      const cx = X(u1) + th * 8
      const span = (v1 - v0) * 1000
      const step = anchors.length > 1 ? Math.min(th * 3, span / (anchors.length - 1)) : 0
      const top = Y(v1) - (span - step * (anchors.length - 1)) / 2
      anchors.forEach((a, i) => {
        const cy = top - i * step
        line(layer('MARK' as PartGroup), a.x, a.y, cx - r, cy)
        circle(layer('MARK' as PartGroup), cx, cy, r)
        middle(layer('MARK' as PartGroup), cx, cy, th, String(a.mark))
      })
      right = cx + r
    }
    maxH = Math.max(maxH, (v1 - v0) * 1000)
    x0 = right + Math.max(1500, th * 20)
  })

  // BOM table under the views, notes beside it, title block at the far right
  const th = thMax
  const tl = layer('TABLE' as PartGroup)
  let yTable = -th * 8
  if (sheet.table?.length) {
    const widths = sheet.table[0].map((_, c) => Math.max(...sheet.table!.map((r) => (r[c] ?? '').length)) * th * 0.75 + th * 1.5)
    const xs = widths.reduce<number[]>((a, w) => [...a, a[a.length - 1] + w], [0])
    const rh = th * 1.8
    sheet.table.forEach((r, i) => {
      const y = yTable - i * rh
      r.forEach((c, j) => text(tl, xs[j] + th * 0.6, y - rh + th * 0.5, th * (i === 0 ? 0.85 : 0.8), c))
      line(tl, 0, y, xs[xs.length - 1], y)
    })
    const yEnd = yTable - sheet.table.length * rh
    line(tl, 0, yEnd, xs[xs.length - 1], yEnd)
    for (const x of xs) line(tl, x, yTable, x, yEnd)
    if (sheet.notes?.length) sheet.notes.forEach((n, i) => text(layer('TEXT'), xs[xs.length - 1] + th * 4, yTable - th * 1.4 - i * th * 1.8, th * 0.8, `${i + 1}. ${n}`))
    yTable = yEnd
  }
  if (sheet.titleBlock?.length) {
    const w = th * 40
    const rh = th * 2
    const x1 = x0
    const yTop = maxH
    sheet.titleBlock.forEach(([k, v], i) => {
      const y = yTop - i * rh
      text(tl, x1 + th * 0.6, y - rh + th * 0.6, th * 0.7, k)
      text(tl, x1 + th * 10, y - rh + th * 0.6, th * 0.9, v)
      line(tl, x1, y - rh, x1 + w, y - rh)
    })
    rect(tl, x1, yTop, x1 + w, yTop - sheet.titleBlock.length * rh)
    line(tl, x1 + th * 9.4, yTop, x1 + th * 9.4, yTop - sheet.titleBlock.length * rh)
  }
  titleLines.forEach((t, i) => text(layer('TEXT'), 0, maxH + 400 + (titleLines.length - i) * 150, 100, t))
  put(0, 'ENDSEC', 0, 'EOF')
  return out.join('\r\n') + '\r\n'
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
