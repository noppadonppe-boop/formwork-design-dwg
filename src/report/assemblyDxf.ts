// DXF (R12, ASCII) of Form Assembly drawings at full size in millimetres: a panel (plywood, studs, joints) and the
// faces of an assembly (panels with their codes, wales, form ties). Views are laid out left to right with a title under
// each; Thai text as \U+XXXX escapes like the shop-drawing DXF (dxf.ts).
import type { PanelData } from '@/data/types'
import type { FaceResult } from '@/model/assembly'
import type { PanelLayout } from '@/model/panel'
import { dxfText } from './dxf'

type Layer = 'PLYWOOD' | 'STUD' | 'JOINT' | 'PANEL' | 'FILLER' | 'WALE' | 'TIE' | 'POUR' | 'DIM' | 'TEXT'
const LAYERS: Record<Layer, number> = { PLYWOOD: 30, STUD: 2, JOINT: 1, PANEL: 30, FILLER: 40, WALE: 4, TIE: 6, POUR: 1, DIM: 1, TEXT: 7 }

/** one drawing in metres, origin bottom-left */
export interface SimpleView {
  title: string
  rects: { layer: Layer; x: number; y: number; w: number; h: number; label?: string }[]
  lines: { layer: Layer; x1: number; y1: number; x2: number; y2: number }[]
  circles: { layer: Layer; x: number; y: number; r: number }[]
  texts: { layer: Layer; x: number; y: number; h: number; s: string; center?: boolean }[]
  width: number
  height: number
}

export function viewsToDxf(views: SimpleView[], titleLines: string[]): string {
  const out: string[] = []
  const put = (...pairs: (string | number)[]) => {
    for (let i = 0; i < pairs.length; i += 2) out.push(String(pairs[i]), typeof pairs[i + 1] === 'number' ? (pairs[i + 1] as number).toFixed(3).replace(/\.?0+$/, '') || '0' : String(pairs[i + 1]))
  }
  const ly = (l: Layer) => `FA-${l}`
  const line = (l: Layer, x1: number, y1: number, x2: number, y2: number) => put(0, 'LINE', 8, ly(l), 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0)
  const text = (l: Layer, x: number, y: number, h: number, s: string, center = false) =>
    center ? put(0, 'TEXT', 8, ly(l), 10, x, 20, y, 30, 0, 40, h, 1, dxfText(s), 72, 1, 73, 2, 11, x, 21, y, 31, 0) : put(0, 'TEXT', 8, ly(l), 10, x, 20, y, 30, 0, 40, h, 1, dxfText(s))

  put(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC')
  put(0, 'SECTION', 2, 'TABLES')
  put(0, 'TABLE', 2, 'LTYPE', 70, 1, 0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, 0, 0, 'ENDTAB')
  put(0, 'TABLE', 2, 'LAYER', 70, Object.keys(LAYERS).length)
  for (const [n, c] of Object.entries(LAYERS)) put(0, 'LAYER', 2, ly(n as Layer), 70, 0, 62, c, 6, 'CONTINUOUS')
  put(0, 'ENDTAB', 0, 'ENDSEC')
  put(0, 'SECTION', 2, 'ENTITIES')

  let x0 = 0
  let maxH = 0
  for (const v of views) {
    const X = (x: number) => x0 + x * 1000
    const Y = (y: number) => y * 1000
    const th = Math.min(Math.max((Math.max(v.width, v.height) * 1000) / 70, 25), 120)
    for (const r of v.rects) {
      line(r.layer, X(r.x), Y(r.y), X(r.x + r.w), Y(r.y))
      line(r.layer, X(r.x + r.w), Y(r.y), X(r.x + r.w), Y(r.y + r.h))
      line(r.layer, X(r.x + r.w), Y(r.y + r.h), X(r.x), Y(r.y + r.h))
      line(r.layer, X(r.x), Y(r.y + r.h), X(r.x), Y(r.y))
      if (r.label) text('TEXT', X(r.x + r.w / 2), Y(r.y + r.h / 2), th, r.label, true)
    }
    for (const l of v.lines) line(l.layer, X(l.x1), Y(l.y1), X(l.x2), Y(l.y2))
    for (const c of v.circles) put(0, 'CIRCLE', 8, ly(c.layer), 10, X(c.x), 20, Y(c.y), 30, 0, 40, c.r * 1000)
    for (const t of v.texts) text(t.layer, X(t.x), Y(t.y), t.h * 1000, t.s, t.center)
    text('TEXT', X(v.width / 2), -th * 4, th * 1.3, v.title, true)
    maxH = Math.max(maxH, v.height * 1000)
    x0 = X(v.width) + Math.max(1500, th * 25)
  }
  titleLines.forEach((t, i) => text('TEXT', 0, maxH + 400 + (titleLines.length - i) * 150, 100, t))
  put(0, 'ENDSEC', 0, 'EOF')
  return out.join('\r\n') + '\r\n'
}

/** horizontal chain of dimensions under y, labels in cm */
function chain(v: SimpleView, xs: number[], y: number, h: number) {
  v.lines.push({ layer: 'DIM', x1: xs[0], y1: y, x2: xs[xs.length - 1], y2: y })
  for (const x of xs) v.lines.push({ layer: 'DIM', x1: x - h / 3, y1: y - h / 3, x2: x + h / 3, y2: y + h / 3 })
  xs.slice(1).forEach((x, i) => v.texts.push({ layer: 'DIM', x: (xs[i] + x) / 2, y: y + h * 0.9, h: h * 0.8, s: `${Math.round((x - xs[i]) * 100)}`, center: true }))
}

export function panelView(p: PanelData, L: PanelLayout): SimpleView {
  const v: SimpleView = { title: `แผง ${p.code} ${p.width.toFixed(2)} x ${p.height.toFixed(2)} ม. (มองจากด้านเคร่า)`, rects: [], lines: [], circles: [], texts: [], width: p.width, height: p.height }
  for (const s of L.ply) v.rects.push({ layer: 'PLYWOOD', x: s.x, y: s.y, w: s.w, h: s.h })
  for (const m of L.members) v.rects.push({ layer: 'STUD', x: m.x, y: m.y, w: m.w, h: m.h })
  for (const j of L.seams) v.lines.push(j.axis === 'x' ? { layer: 'JOINT', x1: j.at, y1: 0, x2: j.at, y2: p.height } : { layer: 'JOINT', x1: 0, y1: j.at, x2: p.width, y2: j.at })
  const h = Math.max(p.width, p.height) / 60
  const xs = L.members.filter((m) => m.kind === 'stud' || m.kind === 'edge').map((m) => m.x + m.w / 2)
  if (p.stud.dir === 'vertical' && xs.length > 1) chain(v, [...xs].sort((a, b) => a - b), -h * 2, h)
  chain(v, [0, p.width], p.height + h * 2, h)
  return v
}

export function faceView(f: FaceResult, title: string): SimpleView {
  const len = Math.max(f.spec.length, ...f.courses.map((c) => c.length))
  const v: SimpleView = { title, rects: [], lines: [], circles: [], texts: [], width: len, height: Math.max(f.height, f.spec.height) }
  for (const p of f.placed) v.rects.push({ layer: p.w < 0.3 ? 'FILLER' : 'PANEL', x: p.x, y: p.y, w: p.w, h: p.h, label: p.w >= 0.3 ? p.panel?.code : undefined })
  for (const p of f.placed.filter((p) => p.w < 0.3 && p.panel)) v.texts.push({ layer: 'TEXT', x: p.x + p.w / 2, y: p.y + p.h + 0.04, h: 0.04, s: p.panel!.code, center: true })
  for (const y of f.wales) v.lines.push({ layer: 'WALE', x1: -0.1, y1: y, x2: len + 0.1, y2: y })
  for (const t of f.ties) v.circles.push({ layer: 'TIE', x: t.u, y: t.y, r: 0.015 })
  v.lines.push({ layer: 'POUR', x1: -0.15, y1: f.spec.height, x2: len + 0.15, y2: f.spec.height })
  v.texts.push({ layer: 'POUR', x: len + 0.2, y: f.spec.height, h: 0.05, s: `เท ${f.spec.height.toFixed(2)}` })
  const h = Math.max(len, v.height) / 60
  const bottom = f.placed.filter((p) => p.course === 0)
  if (bottom.length) chain(v, [0, ...bottom.map((p) => p.x + p.w)], -h * 2, h)
  chain(v, [0, f.spec.length], -h * 5, h)
  return v
}
