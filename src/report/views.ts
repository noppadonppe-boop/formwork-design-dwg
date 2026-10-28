// Orthographic views of each element type with their dimension chains — shared by the calc report and the shop drawings.
import type { AnyDesign } from '@/data/elements'
import type { ElementData } from '@/data/types'
import { BEAM_TYPE_LABEL, columnTieSpans, FOOTING_SUPPORT_LABEL } from '@/engine'
import { elementModel } from '@/model/elementModel'
import type { FormModel } from '@/model/formModel'
import { chain, type Dim } from './Drawing'

export type DrawingSpec = { model: FormModel; view: 'front' | 'side' | 'top'; dims: Dim[]; title: string }
const without = (m: FormModel, ...groups: string[]): FormModel => ({ ...m, parts: m.parts.filter((p) => !groups.includes(p.group)) })

export function elementViews(el: ElementData, run: AnyDesign): { a: DrawingSpec; b: DrawingSpec } {
  const m = elementModel(el, run)
  if (el.type === 'wall' && run.type === 'wall') {
    const i = el.input
    const { waleLevels, tieX, studX } = run.design.layout
    const front: Dim[] = [
      { dir: 'h', a: 0, b: i.length, at: -0.55, text: `L = ${i.length.toFixed(2)} ม.` },
      ...chain('h', [0, ...tieX, i.length], -0.28),
      ...chain('v', [0, ...waleLevels, i.height], -0.35),
      ...chain('h', studX.slice(0, 4), i.height + 0.2),
    ]
    const uMin = -m.bounds.max[2]
    const side: Dim[] = [
      { dir: 'v', a: 0, b: i.height, at: uMin - 0.25, text: `H = ${i.height.toFixed(2)}` },
      { dir: 'h', a: -i.thickness / 2, b: i.thickness / 2, at: i.height + 0.25, text: `${Math.round(i.thickness * 100)}` },
    ]
    return {
      a: { model: m, view: 'front', dims: front, title: 'รูปด้านกำแพง (Elevation) — ระยะเคร่า / คานรับเคร่า / ไทร์ (ซม.)' },
      b: { model: m, view: 'side', dims: side, title: 'รูปตัดกำแพง (Section) — ค้ำยันและไทร์' },
    }
  }
  if (el.type === 'column' && run.type === 'column') {
    const i = el.input
    const d = run.design
    const plan = without(m, 'brace')
    const ext = Math.max(...plan.parts.map((p) => (p.shape === 'box' ? Math.abs(p.center[0]) + p.size[0] / 2 : Math.max(Math.abs(p.from[0]), Math.abs(p.to[0])))))
    const extZ = Math.max(...plan.parts.map((p) => (p.shape === 'box' ? Math.abs(p.center[2]) + p.size[2] / 2 : Math.max(Math.abs(p.from[2]), Math.abs(p.to[2])))))
    const spans = columnTieSpans(i.tie)
    const tieZ = spans.long > 1 ? Array.from({ length: spans.long + 1 }, (_, k) => -i.h / 2 + (k * i.h) / spans.long) : []
    const tieX = spans.short > 1 ? Array.from({ length: spans.short + 1 }, (_, k) => -i.b / 2 + (k * i.b) / spans.short) : []
    const planDims: Dim[] = [
      { dir: 'h', a: -i.b / 2, b: i.b / 2, at: i.h / 2 + 0.35, text: `b = ${Math.round(i.b * 100)}` },
      { dir: 'v', a: -i.h / 2, b: i.h / 2, at: -ext - 0.15, text: `h = ${Math.round(i.h * 100)}` },
      ...(tieZ.length ? chain('v', tieZ.map((z) => -z), ext + 0.2) : []),
      ...(tieX.length ? chain('h', tieX, -extZ - 0.2) : []),
    ]
    const elev: Dim[] = [...chain('v', [0, ...d.layout.yokeLevels, i.height], m.bounds.min[0] - 0.2), { dir: 'h', a: -i.b / 2, b: i.b / 2, at: i.height + 0.3, text: `${Math.round(i.b * 100)}` }]
    return {
      a: { model: plan, view: 'top', dims: planDims, title: 'แปลนเสา (Plan) — คานรัด เคร่า และไทร์ (ซม.)' },
      b: { model: m, view: 'front', dims: elev, title: 'รูปด้านเสา (Elevation) — ระยะคานรัด (ซม.)' },
    }
  }
  if (el.type === 'slab' && run.type === 'slab') {
    const i = el.input
    const { shoreX, stringerY, joistX, shoreTop } = run.design.layout
    const plan: Dim[] = [
      ...chain('h', [0, ...shoreX, i.lengthX], 0.3),
      { dir: 'h', a: 0, b: i.lengthX, at: 0.6, text: `${i.lengthX.toFixed(2)} ม.` },
      ...chain('v', [0, ...stringerY, i.lengthY].map((z) => -z), -0.35),
      ...chain('h', joistX.slice(0, 4), -i.lengthY - 0.3),
    ]
    const sec: Dim[] = [
      ...chain('v', [0, shoreTop, i.clearHeight, i.clearHeight + i.thickness], -0.35),
      ...chain('h', [0, ...shoreX, i.lengthX], -0.25),
    ]
    return {
      a: { model: without(m, 'concrete', 'sheathing', 'bracing'), view: 'top', dims: plan, title: 'แปลนโครงแบบพื้น (Plan) — ตง / คานรองรับ / เสาค้ำ (ซม.)' },
      b: { model: m, view: 'front', dims: sec, title: 'รูปตัดตามแนวคานรองรับ (Section)' },
    }
  }
  if (el.type === 'beam' && run.type === 'beam') {
    const i = el.input
    const { headX, studX, bottomZ, crossJoistX, stringer: sgL } = run.design.layout
    const Y = i.clearHeight
    const zMax = m.bounds.max[2]
    const sec: Dim[] = [
      ...chain('v', [0, ...(sgL?.ledgerY ?? []), Y, Y + i.h], -zMax - 0.25),
      { dir: 'h', a: -i.b / 2, b: i.b / 2, at: Y + i.h + 0.2, text: `${Math.round(i.b * 100)}` },
      ...(bottomZ.length > 1 ? chain('h', bottomZ, Y + i.h + 0.4) : []),
      ...(sgL ? chain('h', sgL.z, -0.25) : []),
    ]
    const elev: Dim[] = [
      ...(sgL ? [...chain('h', [0, ...sgL.shoreX, i.length], -0.25), ...chain('h', headX.slice(0, 5), Y + i.h + 0.6)] : chain('h', [0, ...headX, i.length], -0.25)),
      ...chain('h', studX.slice(0, 4), Y + i.h + 0.2),
      ...(crossJoistX.length > 1 ? chain('h', crossJoistX.slice(0, 5), Y + i.h + 0.4) : []),
      { dir: 'h', a: 0, b: i.length, at: -0.55, text: `L = ${i.length.toFixed(2)} ม.` },
    ]
    return {
      a: { model: m, view: 'front', dims: elev, title: 'รูปด้านคาน (Elevation) — ระยะคานขวาง/เสาค้ำ และเคร่าข้าง (ซม.)' },
      b: { model: m, view: 'side', dims: sec, title: `รูปตัดคาน (Section) — ${BEAM_TYPE_LABEL[i.type]}` },
    }
  }
  const i = (el as Extract<ElementData, { type: 'footing' }>).input
  const d = (run as Extract<AnyDesign, { type: 'footing' }>).design
  const xMax = m.bounds.max[0]
  const plan: Dim[] = [
    { dir: 'h', a: -i.lengthX / 2, b: i.lengthX / 2, at: m.bounds.max[2] + 0.25, text: `${i.lengthX.toFixed(2)} ม.` },
    { dir: 'v', a: -i.lengthY / 2, b: i.lengthY / 2, at: -xMax - 0.25, text: `${i.lengthY.toFixed(2)} ม.` },
  ]
  const levels = i.support === 'tied' ? d.layout.waleLevels : d.layout.braceLevels
  const sec: Dim[] = [...chain('v', [0, ...[...levels].sort((p, q) => p - q), i.height], -xMax - 0.25)]
  return {
    a: { model: m, view: 'top', dims: plan, title: 'แปลนแบบหล่อฐานราก (Plan)' },
    b: { model: m, view: 'front', dims: sec, title: `รูปด้านฐานราก — ${FOOTING_SUPPORT_LABEL[i.support]} (ระยะ ซม.)` },
  }
}

