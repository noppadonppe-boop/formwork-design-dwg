// Element defaults and running the engine with project criteria.
import {
  BEAM_TYPE_LABEL,
  type BeamDesign,
  type BeamInput,
  type ColumnDesign,
  type ColumnInput,
  DEFAULT_BEAM,
  DEFAULT_BRACE,
  DEFAULT_COLUMN,
  DEFAULT_FOOTING,
  DEFAULT_SLAB,
  DEFAULT_WALL,
  designBeam,
  designColumn,
  designFooting,
  designSlab,
  designWall,
  type FootingDesign,
  type FootingInput,
  type SlabDesign,
  type SlabInput,
  type WallDesign,
  type WallInput,
} from '@/engine'
import type { Criteria, ElementData, ElementType, FormElement } from './types'

function pressureFrom(c: Criteria) {
  return { method: c.pressureMethod, R: c.R, T: c.T, slump: c.slump, gamma: c.gamma, vibrationFactor: c.vibrationFactor }
}

const PREFIX: Record<ElementType, string> = { wall: 'W', column: 'C', slab: 'S', beam: 'B', footing: 'F' }

export function newElement(type: ElementType, c: Criteria, existing: FormElement[]): ElementData {
  const n = existing.filter((e) => e.type === type).length + 1
  const base = { code: `${PREFIX[type]}${n}`, name: '', level: '', qty: 1 }
  const timber = c.defaults.timberId
  const loads = { liveLoad: c.liveLoad, formWeight: c.formWeight, gamma: c.gamma }
  switch (type) {
    case 'wall': {
      const input: WallInput = {
        ...DEFAULT_WALL,
        pressure: pressureFrom(c),
        sheathing: { materialId: c.defaults.plywoodId, thicknessMm: c.defaults.plywoodThicknessMm },
        stud: { ...DEFAULT_WALL.stud, materialId: timber, spacingCm: undefined },
        wale: { ...DEFAULT_WALL.wale, materialId: timber },
        tie: { tieId: c.defaults.tieId },
        brace: { ...DEFAULT_BRACE, materialId: timber, wind: c.windLoad },
      }
      return { ...base, type, name: 'กำแพง', input }
    }
    case 'column': {
      const input: ColumnInput = {
        ...DEFAULT_COLUMN,
        b: 0.4,
        h: 0.4,
        height: 3.2,
        pressure: pressureFrom(c),
        sheathing: { type: 'plywood', materialId: c.defaults.plywoodId, thicknessMm: c.defaults.plywoodThicknessMm },
        stud: { ...DEFAULT_COLUMN.stud!, materialId: timber, spacingCm: undefined },
        yoke: { ...DEFAULT_COLUMN.yoke, materialId: timber },
        tie: { enabled: false, tieId: c.defaults.tieId, spans: 2 },
        brace: { ...DEFAULT_COLUMN.brace, materialId: timber, wind: c.windLoad, heightM: 2.7 },
      }
      return { ...base, type, name: 'เสา', input }
    }
    case 'slab': {
      const input: SlabInput = {
        ...DEFAULT_SLAB,
        loads,
        sheathing: { type: 'plywood', materialId: c.defaults.plywoodId, thicknessMm: Math.max(c.defaults.plywoodThicknessMm, 18) },
        joist: { ...DEFAULT_SLAB.joist, materialId: timber },
        stringer: { ...DEFAULT_SLAB.stringer, materialId: timber },
      }
      return { ...base, type, name: 'พื้น', input }
    }
    case 'beam': {
      const input: BeamInput = {
        ...DEFAULT_BEAM,
        loads: { ...loads, beamFormWeight: DEFAULT_BEAM.loads.beamFormWeight },
        sheathing: { type: 'plywood', materialId: c.defaults.plywoodId, thicknessMm: c.defaults.plywoodThicknessMm },
        stud: { ...DEFAULT_BEAM.stud, materialId: timber },
        bottom: { ...DEFAULT_BEAM.bottom, materialId: timber },
        head: { ...DEFAULT_BEAM.head, materialId: timber },
        tie: { ...DEFAULT_BEAM.tie, tieId: c.defaults.tieId, waleMaterialId: timber },
        brace: { ...DEFAULT_BEAM.brace, materialId: timber },
        bracing: { ...DEFAULT_BEAM.bracing!, materialId: timber },
        crossJoist: { ...DEFAULT_BEAM.crossJoist!, materialId: timber },
      }
      return { ...base, type, name: 'คาน', input }
    }
    case 'footing': {
      const input: FootingInput = {
        ...DEFAULT_FOOTING,
        pressure: pressureFrom(c),
        sheathing: { type: 'plywood', materialId: c.defaults.plywoodId, thicknessMm: c.defaults.plywoodThicknessMm },
        stud: { ...DEFAULT_FOOTING.stud, materialId: timber },
        brace: { ...DEFAULT_FOOTING.brace, materialId: timber },
        wale: { ...DEFAULT_FOOTING.wale, materialId: timber },
        tie: { tieId: c.defaults.tieId },
      }
      return { ...base, type, name: 'ฐานราก', input }
    }
  }
}

/** Project-level criteria that always apply on top of the element input. */
function withCriteria<T extends ElementData['input']>(inp: T, c: Criteria): T {
  return {
    ...inp,
    deflection: { ratio: c.deflectionRatio, absCm: c.deflectionAbsMm ? c.deflectionAbsMm / 10 : undefined },
    checkTimberShear: c.checkTimberShear,
  }
}

export type AnyDesign =
  | { type: 'wall'; design: WallDesign }
  | { type: 'column'; design: ColumnDesign }
  | { type: 'slab'; design: SlabDesign }
  | { type: 'beam'; design: BeamDesign }
  | { type: 'footing'; design: FootingDesign }

/** `advise` adds the side-by-side arrangement check (footings) — the design pages, not the optimizer. */
export function runDesign(el: ElementData, c: Criteria, opts: { advise?: boolean } = {}): AnyDesign {
  switch (el.type) {
    case 'wall':
      return { type: 'wall', design: designWall(withCriteria(el.input, c)) }
    case 'column':
      return { type: 'column', design: designColumn(withCriteria(el.input, c)) }
    case 'slab':
      return { type: 'slab', design: designSlab(withCriteria(el.input, c)) }
    case 'beam':
      return { type: 'beam', design: designBeam(withCriteria(el.input, c)) }
    case 'footing':
      return { type: 'footing', design: designFooting(withCriteria(el.input, c), opts) }
  }
}

export function elementSize(el: ElementData): string {
  switch (el.type) {
    case 'wall':
      return `t ${(el.input.thickness * 100).toFixed(0)} · H ${el.input.height.toFixed(2)} · L ${el.input.length.toFixed(2)} ม.`
    case 'column':
      return `${(el.input.b * 100).toFixed(0)}×${(el.input.h * 100).toFixed(0)} ซม. · H ${el.input.height.toFixed(2)} ม.`
    case 'slab':
      return `t ${(el.input.thickness * 100).toFixed(0)} ซม. · ${el.input.lengthX.toFixed(2)}×${el.input.lengthY.toFixed(2)} ม. · สูง ${el.input.clearHeight.toFixed(2)} ม.`
    case 'beam':
      return `${(el.input.b * 100).toFixed(0)}×${(el.input.h * 100).toFixed(0)} ซม. · L ${el.input.length.toFixed(2)} ม. · ${BEAM_TYPE_LABEL[el.input.type]}`
    case 'footing':
      return `${el.input.lengthX.toFixed(2)}×${el.input.lengthY.toFixed(2)} ม. · H ${el.input.height.toFixed(2)} ม.`
  }
}

/** Height used for the pressure diagram (lateral) or the slab thickness (vertical). */
export function elementHeight(el: ElementData): number {
  switch (el.type) {
    case 'slab':
      return el.input.thickness
    case 'beam':
      return el.input.h
    default:
      return el.input.height
  }
}

export const TYPE_LABEL: Record<ElementType, string> = { wall: 'กำแพง', column: 'เสา', slab: 'พื้น', beam: 'คาน', footing: 'ฐานราก' }

/** Labels and units of the `quantities` keys of every design result. */
export const QUANTITY_LABEL: Record<string, [string, string]> = {
  plywoodArea: ['พื้นที่ไม้อัด', 'ม.²'],
  plywoodSheets: ['ไม้อัด 1.22×2.44', 'แผ่น'],
  studs: ['เคร่า', 'ท่อน'],
  studLength: ['ความยาวเคร่ารวม', 'ม.'],
  waleLength: ['ความยาวคานรับเคร่ารวม', 'ม.'],
  yokes: ['คานรัด', 'ท่อน'],
  ties: ['Form tie', 'ชุด'],
  braces: ['ค้ำยัน', 'ตัว'],
  joists: ['ตง', 'ตัว'],
  joistLength: ['ความยาวตงรวม', 'ม.'],
  stringerLength: ['ความยาวคานรองรับรวม', 'ม.'],
  shores: ['เสาค้ำ / ขานั่งร้าน', 'ต้น'],
  ledgerLength: ['ท่อยึดแนวราบรวม', 'ม.'],
  bracing: ['ค้ำยันทแยงระบบเสาค้ำ', 'ตัว'],
  bottomLength: ['ไม้เสริมท้องแบบรวม', 'ม.'],
  crossJoists: ['ตงขวางใต้ท้องแบบ', 'ตัว'],
  heads: ['คานขวาง', 'ตัว'],
  stakes: ['หลักยึด', 'ต้น'],
}

/** Key spacings shown above the results. */
export function layoutSummary(r: AnyDesign): { label: string; value: string }[] {
  switch (r.type) {
    case 'wall':
      return [
        { label: 'เคร่า @', value: `${r.design.layout.studSpacing}` },
        { label: 'คานรับเคร่า @', value: `${r.design.layout.waleSpacing}` },
        { label: 'ไทร์ @', value: `${r.design.layout.tieSpacing} ซม.` },
      ]
    case 'column':
      return [
        ...(r.design.layout.studSpacing ? [{ label: 'เคร่า @', value: `${r.design.layout.studSpacing}` }] : []),
        { label: 'คานรัด @', value: `${r.design.layout.yokeSpacing} ซม.` },
        { label: 'จำนวนคานรัด', value: `${r.design.layout.yokeLevels.length} ชุด` },
      ]
    case 'slab':
      return [
        { label: 'ตง @', value: `${r.design.layout.joistSpacing}` },
        { label: 'คานรองรับ @', value: `${r.design.layout.stringerSpacing}` },
        { label: 'เสาค้ำ @', value: `${r.design.layout.shoreSpacing} ซม.` },
      ]
    case 'beam':
      return [
        { label: 'เคร่าข้าง @', value: `${r.design.layout.studSpacing}` },
        ...(r.design.layout.crossJoistSpacing ? [{ label: 'ตงขวาง @', value: `${r.design.layout.crossJoistSpacing}` }] : []),
        ...(r.design.layout.bottomZ.length ? [{ label: 'คร่าวตามยาว', value: `${r.design.layout.bottomZ.length} ตัว` }] : []),
        ...(r.design.layout.stringer
          ? [
              { label: 'คานขวาง @', value: `${r.design.layout.headSpacing}` },
              { label: 'เสาค้ำ @', value: `${r.design.layout.stringer.shoreSpacing} ซม. × ${r.design.layout.stringer.z.length} แถว` },
              ...(r.design.layout.stringer.ledgerY.length ? [{ label: 'ท่อยึดแนวราบ', value: `${r.design.layout.stringer.ledgerY.length} ระดับ` }] : []),
            ]
          : [{ label: 'คานขวาง/เสาค้ำ @', value: `${r.design.layout.headSpacing} ซม.` }]),
      ]
    case 'footing':
      return [
        { label: 'เคร่า @', value: `${r.design.layout.studSpacing} ซม.` },
        ...(r.design.layout.supportSpacing ? [{ label: 'จุดค้ำ @', value: `${r.design.layout.supportSpacing} ซม.` }] : []),
        ...(r.design.layout.braceAlong ? [{ label: 'ค้ำยัน @', value: `${r.design.layout.braceAlong} ซม.` }] : []),
        ...(r.design.layout.tieLayout ? [{ label: 'คานรับเคร่า @', value: `${r.design.layout.waleSpacing}` }] : []),
        ...(r.design.layout.tieLayout ? [{ label: 'ไทร์', value: r.design.layout.tieSpacing ? `@${r.design.layout.tieSpacing} ซม. · ${r.design.quantities.ties} ตัว` : 'ไม่ใช้' }] : []),
      ]
  }
}
