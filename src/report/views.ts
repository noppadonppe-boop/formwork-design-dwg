// Orthographic views of each element type with their dimension chains — shared by the calc report and the shop drawings.
import type { AnyDesign } from '@/data/elements'
import type { ElementData } from '@/data/types'
import { BEAM_TYPE_LABEL, columnShapeOf, columnTieSpans, footingShapeOf, footingSystemLabel, isLegShape, legBox, legOutline, polygonBox, SHAPE_NAME } from '@/engine'
import { elementModel } from '@/model/elementModel'
import type { FormModel } from '@/model/formModel'
import { chain, corners, type Dim } from './Drawing'

export type DrawingSpec = { model: FormModel; view: 'front' | 'side' | 'top'; dims: Dim[]; title: string }
const without = (m: FormModel, ...groups: string[]): FormModel => ({ ...m, parts: m.parts.filter((p) => !groups.includes(p.group)) })

export function elementViews(el: ElementData, run: AnyDesign): { a: DrawingSpec; b: DrawingSpec } {
  const m = elementModel(el, run)
  if (el.type === 'wall' && run.type === 'wall') {
    const i = el.input
    const { tieLevels, tieX, studX, studLevels, system } = run.design.layout
    const horizontal = system === 'horizontal'
    // ties along the wall (horizontal studs: at the vertical wales) and up it (at the wales / tie rows), a few studs
    const front: Dim[] = [
      { dir: 'h', a: 0, b: i.length, at: -0.55, text: `L = ${i.length.toFixed(2)} ม.` },
      ...chain('h', [0, ...tieX, i.length], -0.28),
      ...chain('v', [0, ...tieLevels, i.height], -0.35),
      ...(horizontal ? chain('v', studLevels.slice(0, 4), i.length + 0.2) : chain('h', studX.slice(0, 4), i.height + 0.2)),
    ]
    const uMin = -m.bounds.max[2]
    const side: Dim[] = [
      { dir: 'v', a: 0, b: i.height, at: uMin - 0.25, text: `H = ${i.height.toFixed(2)}` },
      { dir: 'h', a: -i.thickness / 2, b: i.thickness / 2, at: i.height + 0.25, text: `${Math.round(i.thickness * 100)}` },
    ]
    return {
      a: { model: m, view: 'front', dims: front, title: horizontal ? 'รูปด้านกำแพง (Elevation) — ระยะเคร่านอน / คานตั้ง / ไทร์ (ซม.)' : 'รูปด้านกำแพง (Elevation) — ระยะเคร่า / คานรับเคร่า / ไทร์ (ซม.)' },
      b: { model: m, view: 'side', dims: side, title: 'รูปตัดกำแพง (Section) — ค้ำยันและไทร์' },
    }
  }
  if (el.type === 'column' && run.type === 'column') {
    const i = el.input
    const d = run.design
    const plan = without(m, 'brace')
    const ext = Math.max(...plan.parts.flatMap((p) => corners(p).map((q) => Math.abs(q[0]))))
    const extZ = Math.max(...plan.parts.flatMap((p) => corners(p).map((q) => Math.abs(q[2]))))
    const shape = columnShapeOf(i)
    const round = shape.kind === 'circle'
    const leg = isLegShape(shape) ? shape : undefined
    // plan extent of the concrete: a polygon's or an L/T/U's box (across the corners × F for the hexagon)
    const [cx, cz] = shape.kind === 'polygon' ? polygonBox(shape.n, i.b) : leg ? legBox(leg) : [i.b, i.h]
    const boxed = shape.kind === 'rect' || (shape.kind === 'polygon' && shape.yoke === 'box') || leg?.yoke === 'box'
    const spans = boxed ? columnTieSpans(i.tie) : { long: 1, short: 1 }
    const longZ = cz >= cx
    const [L, S] = longZ ? [cz, cx] : [cx, cz]
    const tieL = spans.long > 1 ? Array.from({ length: spans.long + 1 }, (_, k) => -L / 2 + (k * L) / spans.long) : []
    const tieS = spans.short > 1 ? Array.from({ length: spans.short + 1 }, (_, k) => -S / 2 + (k * S) / spans.short) : []
    const [tieZ, tieX] = longZ ? [tieL, tieS] : [tieS, tieL]
    const size = Math.round(i.b * 100)
    // an L/T/U: the steps of its outline along x and down z, and the overall sizes beyond them
    const legChain = (k: 0 | 1) => (leg ? [...new Set(legOutline(leg).map((q) => Math.round(q[k] * 1000) / 1000))].sort((a, b) => a - b).map((v) => v - (k ? cz : cx) / 2) : [])
    const planDims: Dim[] = leg
      ? [
          ...chain('h', legChain(0), extZ + 0.15),
          { dir: 'h', a: -cx / 2, b: cx / 2, at: extZ + 0.35, text: `${Math.round(cx * 100)}` },
          ...chain('v', legChain(1).map((z) => -z), -ext - 0.15),
          { dir: 'v', a: -cz / 2, b: cz / 2, at: -ext - 0.35, text: `${Math.round(cz * 100)}` },
        ]
      : shape.kind === 'rect'
        ? [
            { dir: 'h', a: -i.b / 2, b: i.b / 2, at: i.h / 2 + 0.35, text: `b = ${size}` },
            { dir: 'v', a: -i.h / 2, b: i.h / 2, at: -ext - 0.15, text: `h = ${Math.round(i.h * 100)}` },
          ]
        : round
          ? [{ dir: 'h', a: -i.b / 2, b: i.b / 2, at: extZ + 0.15, text: `Ø ${size}` }]
          : [
              { dir: 'v', a: -i.b / 2, b: i.b / 2, at: -ext - 0.15, text: `F = ${size}` },
              { dir: 'h', a: -cx / 2, b: cx / 2, at: extZ + 0.15, text: `${Math.round(cx * 100)}` },
            ]
    planDims.push(...(tieZ.length ? chain('v', tieZ.map((z) => -z), ext + 0.2) : []), ...(tieX.length ? chain('h', tieX, -extZ - 0.2) : []))
    const levels = d.layout.yokeLevels
    const elev: Dim[] = [...(levels.length ? chain('v', [0, ...levels, i.height], m.bounds.min[0] - 0.2) : [{ dir: 'v' as const, a: 0, b: i.height, at: m.bounds.min[0] - 0.2, text: `H = ${i.height.toFixed(2)}` }]), { dir: 'h', a: -cx / 2, b: cx / 2, at: i.height + 0.3, text: `${Math.round(cx * 100)}` }]
    const what = round ? (shape.system === 'stave' ? 'ระแนงและคานรัดเจาะโค้ง' : shape.system === 'steel' ? 'แบบเหล็กและสลักปีก' : 'ท่อกระดาษ') : 'คานรัด เคร่า และไทร์'
    return {
      a: { model: plan, view: 'top', dims: planDims, title: `แปลนเสา${shape.kind === 'rect' ? '' : SHAPE_NAME[shape.kind === 'polygon' ? shape.n : shape.kind]} (Plan) — ${what} (ซม.)` },
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
  const fs = footingShapeOf(i)
  const zMax = m.bounds.max[2]
  // an L/T/U: the steps of its outline along x and down z; round / polygonal: D or F
  const [fx, fz] = isLegShape(fs) ? legBox(fs) : fs.kind === 'polygon' ? polygonBox(fs.n, i.lengthX) : [i.lengthX, i.lengthY]
  const steps = (k: 0 | 1) => (isLegShape(fs) ? [...new Set(legOutline(fs).map((q) => Math.round(q[k] * 1000) / 1000))].sort((a, b) => a - b).map((v) => v - (k ? fz : fx) / 2) : [])
  const plan: Dim[] = isLegShape(fs)
    ? [
        ...chain('h', steps(0), zMax + 0.25),
        { dir: 'h', a: -fx / 2, b: fx / 2, at: zMax + 0.55, text: `${fx.toFixed(2)} ม.` },
        ...chain('v', steps(1).map((z) => -z), -xMax - 0.25),
        { dir: 'v', a: -fz / 2, b: fz / 2, at: -xMax - 0.55, text: `${fz.toFixed(2)} ม.` },
      ]
    : fs.kind === 'circle'
      ? [{ dir: 'h', a: -fx / 2, b: fx / 2, at: zMax + 0.25, text: `Ø ${fx.toFixed(2)} ม.` }]
      : fs.kind === 'polygon'
        ? [{ dir: 'v', a: -fz / 2, b: fz / 2, at: -xMax - 0.25, text: `F = ${fz.toFixed(2)} ม.` }]
        : [
            { dir: 'h', a: -i.lengthX / 2, b: i.lengthX / 2, at: zMax + 0.25, text: `${i.lengthX.toFixed(2)} ม.` },
            { dir: 'v', a: -i.lengthY / 2, b: i.lengthY / 2, at: -xMax - 0.25, text: `${i.lengthY.toFixed(2)} ม.` },
          ]
  const levels = i.support === 'tied' ? d.layout.waleLevels : d.layout.braceLevels
  const sec: Dim[] = [...chain('v', [0, ...[...levels].sort((p, q) => p - q), i.height], -xMax - 0.25)]
  return {
    a: { model: m, view: 'top', dims: plan, title: `แปลนแบบหล่อฐานราก${fs.kind === 'rect' ? '' : SHAPE_NAME[fs.kind === 'polygon' ? fs.n : fs.kind]} (Plan)` },
    b: { model: m, view: 'front', dims: sec, title: `รูปด้านฐานราก — ${footingSystemLabel(i, d)} (ระยะ ซม.)` },
  }
}

