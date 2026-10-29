// Input forms for wall / column elements. Each group is tagged with the 3D part group it edits so the
// 3D inspector can show just that group (`only`).
import clsx from 'clsx'
import { createContext, type ReactNode, useContext } from 'react'
import { MemberPicker } from '@/components/design/MemberPicker'
import { NumField } from '@/components/design/NumField'
import { Field, Segmented, Select, Toggle } from '@/components/ui'
import { withRoundForm } from '@/data/elements'
import type { ElementData } from '@/data/types'
import {
  BEAM_TYPE_LABEL,
  beamBracing,
  beamCrossJoist,
  beamHasRunners,
  type BeamInput,
  beamStringer,
  BS_TUBE,
  getSection,
  LEDGER_LIFT,
  type BraceParams,
  CIRCLE_SYSTEM_LABEL,
  type ColumnInput,
  type ColumnShape,
  columnShapeOf,
  cutYokeNetCm,
  isLegShape,
  legBox,
  legLayout,
  type LegShape,
  LEG_YOKE_LABEL,
  requiredTies,
  SHAPE_NAME,
  plywoodBendRadius,
  POLYGON_YOKE_LABEL,
  polygonDims,
  RATED_PRESSURE,
  type DeckSheathing,
  FOOTING_BRACE_AT_LABEL,
  FOOTING_SUPPORT_LABEL,
  FOOTING_TIE_LAYOUT_LABEL,
  FOOTING_WALE_CORNER_LABEL,
  FOOTING_WALE_SHIFT_LABEL,
  GROUND_BEARING,
  getMaterial,
  type FootingWaleCorner,
  type FootingWaleShift,
  type FootingTieLayout,
  type FootingInput,
  type FootingShape,
  footingShapeOf,
  PLYWOOD,
  PLYWOOD_THICKNESS,
  type PressureParams,
  RATED_SHORES,
  DEFAULT_RINGLOCK,
  ledgerText,
  RINGLOCK_LIFTS,
  RINGLOCK_SYSTEMS,
  ringlockEta,
  type RinglockSystemId,
  ringlockSystem,
  type ShoreParams,
  type SlabInput,
  TIES,
  TIMBER,
  type VerticalLoads,
  type WallInput,
  type WallSystem,
} from '@/engine'
import type { PartGroup } from '@/model/formModel'

const OnlyCtx = createContext<PartGroup | undefined>(undefined)

export function Group({ title, part, children }: { title: string; part?: PartGroup; children: ReactNode }) {
  const only = useContext(OnlyCtx)
  if (only && part !== only) return null
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  )
}

// ---------------------------------------------------------------- shared input groups

function PressureGroup({ p, onChange }: { p: PressureParams; onChange: (p: PressureParams) => void }) {
  return (
    <Group title="แรงดันคอนกรีต" part="concrete">
      <Field label="วิธีคำนวณ">
        <Select value={p.method} onChange={(e) => onChange({ ...p, method: e.target.value as PressureParams['method'] })}>
          <option value="CEB">CEB (ค่าต่ำสุด 3 กรณี)</option>
          <option value="ACI347">ACI 347</option>
          <option value="CIRA">CIRA</option>
          <option value="HYDROSTATIC">γH เต็มความสูง</option>
        </Select>
      </Field>
      <div className="fields3">
        <NumField label="อัตราเท R" unit="ม./ชม." value={p.R} min={0.1} max={20} onChange={(v) => v !== undefined && onChange({ ...p, R: v })} />
        <NumField label="T" unit="°C" value={p.T} min={0} max={45} onChange={(v) => v !== undefined && onChange({ ...p, T: v })} />
        <NumField label="Slump" unit="ซม." value={p.slump} min={0} max={25} onChange={(v) => v !== undefined && onChange({ ...p, slump: v })} />
      </div>
    </Group>
  )
}

function SheathingPly({ materialId, thicknessMm, onChange }: { materialId: string; thicknessMm: number; onChange: (v: { materialId: string; thicknessMm: number }) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="ไม้อัด">
        <Select value={materialId} onChange={(e) => onChange({ materialId: e.target.value, thicknessMm })}>
          {PLYWOOD.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="ความหนา">
        <Select value={thicknessMm} onChange={(e) => onChange({ materialId, thicknessMm: Number(e.target.value) })}>
          {PLYWOOD_THICKNESS.map((t) => (
            <option key={t} value={t}>
              {t} มม.
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}

function TieSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="ชนิด Form tie">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {TIES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — SWL {t.swl.toLocaleString()} กก.
          </option>
        ))}
      </Select>
    </Field>
  )
}

function BraceGroup<B extends BraceParams>({ b, onChange, extra }: { b: B; onChange: (b: B) => void; extra?: ReactNode }) {
  return (
    <Group title="ค้ำยันด้านข้าง" part="brace">
      <MemberPicker label="ค้ำยัน" sectionId={b.sectionId} materialId={b.materialId} pipes onChange={(v) => onChange({ ...b, ...v })} />
      <div className="fields3">
        <NumField label="มุม" unit="°" value={b.angleDeg} min={30} max={75} onChange={(v) => v !== undefined && onChange({ ...b, angleDeg: v })} />
        <NumField label="สูงจุดยึด" unit="ม." value={b.heightM} optional placeholder="= H" onChange={(v) => onChange({ ...b, heightM: v })} />
        <NumField label="แรงลม" unit="กก./ม.²" value={b.wind} min={0} onChange={(v) => v !== undefined && onChange({ ...b, wind: v })} />
      </div>
      {extra}
      <div className="grid grid-cols-2 gap-2">
        <Toggle label="ยึดกลางช่วง" checked={b.midBraced} onChange={(v) => onChange({ ...b, midBraced: v })} />
        <Toggle label="ค้ำด้านเดียว (รับแรงดึง)" checked={b.oneSided} onChange={(v) => onChange({ ...b, oneSided: v })} />
      </div>
    </Group>
  )
}

// ---------------------------------------------------------------- wall

function WallFields({ inp, set }: { inp: WallInput; set: (fn: (i: WallInput) => WallInput) => void }) {
  // horizontal studs: the lowest / top levels are the tie rows on the vertical wales
  const horizontal = inp.system === 'horizontal'
  const levelFields = (
    <>
      <NumField label={horizontal ? 'ไทร์ล่างสุดจากฐาน' : 'ตัวแรกจากฐาน'} unit="ม." value={inp.bottomWaleOffsetM} min={0.05} max={1} onChange={(v) => v && set((i) => ({ ...i, bottomWaleOffsetM: v }))} />
      <NumField label={horizontal ? 'ไทร์บนจากขอบบน' : 'ตัวบนจากขอบบน'} unit="ม." optional placeholder="อัตโนมัติ" hint={horizontal ? 'เว้นว่าง = ช่วงยื่นของคานตั้งยาวสุดที่ผ่าน' : 'เว้นว่าง = ช่วงยื่นยาวสุดที่ผ่าน'} value={inp.topWaleOffsetM} min={0.05} max={1} onChange={(v) => set((i) => ({ ...i, topWaleOffsetM: v }))} />
    </>
  )
  return (
    <>
      <Group title="ขนาดกำแพง" part="concrete">
        <div className="fields3">
          <NumField label="ความหนา" unit="ซม." scale={100} value={inp.thickness} min={5} max={300} onChange={(v) => v && set((i) => ({ ...i, thickness: v }))} />
          <NumField label="ความสูงเท H" unit="ม." value={inp.height} min={0.2} max={15} onChange={(v) => v && set((i) => ({ ...i, height: v }))} />
          <NumField label="ความยาว" unit="ม." value={inp.length} min={0.2} max={200} onChange={(v) => v && set((i) => ({ ...i, length: v }))} />
        </div>
      </Group>
      <PressureGroup p={inp.pressure} onChange={(p) => set((i) => ({ ...i, pressure: p }))} />
      <Group title="แผ่นผิวแบบ" part="sheathing">
        <SheathingPly materialId={inp.sheathing.materialId} thicknessMm={inp.sheathing.thicknessMm} onChange={(v) => set((i) => ({ ...i, sheathing: v }))} />
      </Group>
      <Group title={horizontal ? 'เคร่านอน (Studs)' : 'เคร่าตั้ง (Studs)'} part="stud">
        <Segmented<WallSystem>
          label="ระบบโครงแบบ"
          value={inp.system ?? 'vertical'}
          options={[
            { value: 'vertical', label: 'เคร่าตั้ง + คานนอน' },
            { value: 'horizontal', label: 'เคร่านอน + คานตั้ง' },
          ]}
          onChange={(system) => set((i) => ({ ...i, system }))}
        />
        <MemberPicker label="เคร่า" sectionId={inp.stud.sectionId} materialId={inp.stud.materialId} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, ...v } }))} />
        <NumField label={horizontal ? 'ระยะเคร่าตามแนวดิ่ง' : 'ระยะเคร่า'} unit="ซม." optional placeholder="อัตโนมัติ" hint={inp.graded && horizontal ? 'ระยะที่แถวล่างสุด — ด้านบนห่างขึ้นตามแรงดัน' : 'เว้นว่าง = ให้ระบบเลือก'} value={inp.stud.spacingCm} min={5} max={120} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, spacingCm: v } }))} />
        {horizontal && <Toggle label="ระยะเคร่าและไทร์แปรตามแรงดัน (ห่างขึ้นด้านบน)" checked={!!inp.graded} onChange={(v) => set((i) => ({ ...i, graded: v || undefined }))} />}
      </Group>
      <Group title={horizontal ? 'คานตั้ง (Strongbacks)' : 'คานรับเคร่า (Wales)'} part="wale">
        <MemberPicker label={horizontal ? 'คานตั้ง' : 'คานรับเคร่า'} sectionId={inp.wale.sectionId} materialId={inp.wale.materialId} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, ...v } }))} />
        <Segmented label="จำนวนต่อชุด" value={String(inp.wale.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'หน้าตัดคู่' }]} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, count: Number(v) as 1 | 2 } }))} />
        <div className="grid grid-cols-2 gap-2">
          <NumField label={horizontal ? 'ระยะ c/c ตามแนวนอน' : 'ระยะ c/c'} unit="ซม." optional placeholder="อัตโนมัติ" value={inp.wale.spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, spacingCm: v } }))} />
          {horizontal ? (
            <NumField label="ตัวริมจากปลายกำแพง" unit="ม." optional placeholder="อัตโนมัติ" hint="เว้นว่าง = ช่วงยื่นของเคร่าที่ผ่าน ≤ 15 ซม." value={inp.endWaleOffsetM} min={0} max={1} onChange={(v) => set((i) => ({ ...i, endWaleOffsetM: v }))} />
          ) : (
            levelFields
          )}
        </div>
      </Group>
      <Group title="Form tie" part="tie">
        <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
        <NumField label={horizontal ? 'ระยะไทร์ตามแนวดิ่ง' : 'ระยะไทร์ตามแนวนอน'} unit="ซม." optional placeholder="อัตโนมัติ" hint={horizontal ? 'ตามแนวนอนไทร์อยู่ที่คานตั้งทุกตัว' : undefined} value={inp.tie.spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, spacingCm: v } }))} />
        {horizontal && <div className="grid grid-cols-2 gap-2">{levelFields}</div>}
      </Group>
      <BraceGroup
        b={inp.brace}
        onChange={(b) => set((i) => ({ ...i, brace: b }))}
        extra={
          <div className="grid grid-cols-2 gap-2">
            <NumField label="ระยะค้ำยัน" unit="ม." value={inp.brace.spacingM} min={0.3} max={5} onChange={(v) => v && set((i) => ({ ...i, brace: { ...i.brace, spacingM: v } }))} />
            <Field label="จำนวนระดับ">
              <Select value={inp.brace.levels} onChange={(e) => set((i) => ({ ...i, brace: { ...i.brace, levels: Number(e.target.value) as 1 | 2 } }))}>
                <option value={1}>1 ระดับ</option>
                <option value={2}>2 ระดับ (บน + กลาง)</option>
              </Select>
            </Field>
          </div>
        }
      />
    </>
  )
}

// ---------------------------------------------------------------- column

type ShapeKey = 'rect' | 'circle' | 'hex' | 'oct' | 'L' | 'T' | 'U'
const SHAPE_OPTIONS: { key: ShapeKey; label: string; icon: ReactNode }[] = [
  { key: 'rect', label: 'สี่เหลี่ยม', icon: <path d="M5 9h24v16H5z" /> },
  { key: 'circle', label: 'กลม', icon: <circle cx="17" cy="17" r="12" /> },
  { key: 'hex', label: 'หกเหลี่ยม', icon: <path d="M10 6h14l6.5 11L24 28H10L3.5 17z" /> },
  { key: 'oct', label: 'แปดเหลี่ยม', icon: <path d="M12 4h10l8 8v10l-8 8H12l-8-8V12z" /> },
  { key: 'L', label: 'ตัว L', icon: <path d="M6 5h22v8H14v16H6z" /> },
  { key: 'T', label: 'ตัว T', icon: <path d="M5 6h24v8h-8v15h-8V14H5z" /> },
  { key: 'U', label: 'ตัว U', icon: <path d="M5 6h8v14h8V6h8v22H5z" /> },
]
const shapeKey = (s: ColumnShape): ShapeKey => (s.kind === 'polygon' ? (s.n === 6 ? 'hex' : 'oct') : s.kind)

/** Starting sizes of an L/T/U, m. */
const LEG_DEFAULT: Record<'L' | 'T' | 'U', LegShape> = {
  L: { kind: 'L', a: 0.8, b: 0.8, ta: 0.25, tb: 0.25, yoke: 'tied' },
  T: { kind: 'T', bf: 0.9, tf: 0.25, tw: 0.25, d: 0.8, yoke: 'tied' },
  U: { kind: 'U', b: 1.0, d: 0.8, t: 0.25, tb: 0.25, yoke: 'tied' },
}

/** Column input on an L/T/U shape: b × h kept as its box. */
function withLeg(i: ColumnInput, s: LegShape): ColumnInput {
  const [bx, bz] = legBox(s)
  return { ...i, b: bx, h: bz, shape: s }
}

/** Column input switched to another plan shape: one size b = h for round/polygon; staves for a round column. */
function withShape(i: ColumnInput, key: ShapeKey): ColumnInput {
  const was = columnShapeOf(i)
  if (key === 'rect') {
    const { shape: _s, ...rest } = i
    return rest
  }
  if (key === 'L' || key === 'T' || key === 'U') {
    // ties at the inner corners are part of the form; each leg starts as one span
    const s = { ...LEG_DEFAULT[key], yoke: isLegShape(was) ? was.yoke : 'tied' } as LegShape
    return withLeg({ ...i, tie: { ...i.tie, enabled: s.yoke === 'box' ? i.tie.enabled : true, spans: 1, shortSpans: undefined } }, s)
  }
  const size = was.kind === 'rect' ? Math.min(i.b, i.h) : isLegShape(was) ? 0.6 : i.b
  if (key === 'circle') return withRoundForm({ ...i, b: size, h: size })
  const n = key === 'hex' ? 6 : 8
  return { ...i, b: size, h: size, shape: { kind: 'polygon', n, yoke: was.kind === 'polygon' ? was.yoke : 'box' } }
}

/** Size fields of an L/T/U, cm; a thickness stays at least 5 cm short of the size it lies across. */
function LegFields({ s, onChange, metres }: { s: LegShape; onChange: (s: LegShape) => void; metres?: boolean }) {
  const top = metres ? 30 : 6
  const f = (label: string, key: string, value: number, max: number) =>
    metres ? (
      <NumField key={key} label={label} unit="ม." value={value} min={0.1} max={Math.max(0.1, max)} onChange={(v) => v && onChange({ ...s, [key]: v } as LegShape)} />
    ) : (
      <NumField key={key} label={label} unit="ซม." scale={100} value={value} min={10} max={Math.max(10, max * 100)} onChange={(v) => v && onChange({ ...s, [key]: v } as LegShape)} />
    )
  switch (s.kind) {
    case 'L':
      return [f('ยาวรวม a', 'a', s.a, top), f('ยาวรวม b', 'b', s.b, top), f('ขาหนา ta', 'ta', s.ta, s.b - 0.05), f('ขาหนา tb', 'tb', s.tb, s.a - 0.05)]
    case 'T':
      return [f('ปีกกว้าง bf', 'bf', s.bf, top), f('ปีกหนา tf', 'tf', s.tf, s.d - 0.05), f('เอวหนา tw', 'tw', s.tw, s.bf - 0.1), f('ลึกรวม d', 'd', s.d, top)]
    case 'U':
      return [f('กว้าง b', 'b', s.b, top), f('ลึก d', 'd', s.d, top), f('ขาหนา t', 't', s.t, (s.b - 0.05) / 2), f('ท้องหนา tb', 'tb', s.tb, s.d - 0.05)]
  }
}

function ShapePicker({ value, onChange, label = 'รูปหน้าตัดเสา' }: { value: ShapeKey; onChange: (k: ShapeKey) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-1.5">
      {SHAPE_OPTIONS.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.key)}
            className={clsx('flex flex-col items-center gap-1 rounded-lg border px-1 pb-1.5 pt-2 text-xs transition', on ? 'border-sel bg-blue-50 font-semibold text-ink ring-1 ring-sel' : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-ink')}
          >
            <svg viewBox="0 0 34 34" className={clsx('size-8 fill-slate-200 stroke-[1.6]', on ? 'stroke-sel' : 'stroke-slate-500')} aria-hidden="true">
              {o.icon}
            </svg>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ColumnFields({ inp, set }: { inp: ColumnInput; set: (fn: (i: ColumnInput) => ColumnInput) => void }) {
  const shape = columnShapeOf(inp)
  const round = shape.kind === 'circle' ? shape : undefined
  const poly = shape.kind === 'polygon' ? shape : undefined
  const ring = poly?.yoke === 'ring'
  const leg = isLegShape(shape) ? shape : undefined
  /** ready-made round form: no timber members */
  const madeForm = round && round.system !== 'stave'
  const setSize = (v: number | undefined) => v && set((i) => ({ ...i, b: v, h: v }))
  return (
    <>
      <Group title="ขนาดเสา" part="concrete">
        <ShapePicker value={shapeKey(shape)} onChange={(k) => set((i) => withShape(i, k))} />
        <div className="fields3">
          {leg ? (
            <LegFields s={leg} onChange={(s) => set((i) => withLeg(i, s))} />
          ) : shape.kind === 'rect' ? (
            <>
              <NumField label="ด้าน b" unit="ซม." scale={100} value={inp.b} min={10} max={300} onChange={(v) => v && set((i) => ({ ...i, b: v }))} />
              <NumField label="ด้าน h" unit="ซม." scale={100} value={inp.h} min={10} max={300} onChange={(v) => v && set((i) => ({ ...i, h: v }))} />
            </>
          ) : round ? (
            <NumField label="เส้นผ่านศูนย์กลาง D" unit="ซม." scale={100} value={inp.b} min={15} max={300} onChange={setSize} />
          ) : (
            <NumField label="ระยะข้ามด้านแบน F" unit="ซม." scale={100} value={inp.b} min={20} max={300} hint={`ยาวด้าน a = ${(polygonDims(poly!.n, inp.b).a * 100).toFixed(1)} ซม.`} onChange={setSize} />
          )}
          <NumField label="ความสูงเท H" unit="ม." value={inp.height} min={0.3} max={15} onChange={(v) => v && set((i) => ({ ...i, height: v }))} />
        </div>
        {round && (
          <Segmented
            label="ระบบแบบหล่อเสากลม"
            value={round.system}
            options={(['stave', 'steel', 'tube'] as const).map((v) => ({ value: v, label: CIRCLE_SYSTEM_LABEL[v] }))}
            onChange={(v) => set((i) => ({ ...i, shape: { kind: 'circle', system: v, ratedKgM2: v === 'stave' ? undefined : round.ratedKgM2 } }))}
          />
        )}
        {madeForm && (
          <NumField
            label="แรงดันที่ผู้ผลิตรับรอง"
            unit="กก./ม.²"
            hint="ตามข้อมูลผู้ผลิตแบบหล่อ"
            value={round.ratedKgM2}
            optional
            placeholder={RATED_PRESSURE[round.system as 'steel' | 'tube'].toLocaleString()}
            min={500}
            max={20000}
            onChange={(v) => set((i) => ({ ...i, shape: { ...round, ratedKgM2: v } }))}
          />
        )}
        {poly && (
          <Segmented
            label="คานรัดเสาหลายเหลี่ยม"
            value={poly.yoke}
            options={(['box', 'ring'] as const).map((v) => ({ value: v, label: POLYGON_YOKE_LABEL[v] }))}
            onChange={(v) => set((i) => ({ ...i, shape: { ...poly, yoke: v } }))}
          />
        )}
        {round?.system === 'stave' && <p className="text-xs text-slate-500">ไม้อัดหนา 18 มม. ดัดโค้งได้ที่รัศมี ≥ {plywoodBendRadius(18)} ม. เสากลมจึงใช้ไม้ระแนงตั้ง (หรือไม้อัดตัดเป็นแถบ) รัดด้วยกรอบคานรัดไม้กระดานกว้างเจาะโค้งตามวงกลม ตอกลิ่มที่มุม (ตัวอย่าง 9.2)</p>}
        {poly && !ring && <p className="text-xs text-slate-500">คานรัดเป็นกรอบสี่เหลี่ยมรอบเสา ไม้อุดมุมหนุนด้านเอียง 4 ด้าน คำนวณคานรัดแบบเสาสี่เหลี่ยมขนาดเท่ากรอบ</p>}
        {ring && <p className="text-xs text-slate-500">คานรัดวิ่งตามทุกด้าน ต่อมุมด้วยเหล็กประกับ + น็อต รับแรงดึง T = w·F/2 ไม่ต้องใช้ Form tie</p>}
        {leg && (
          <Segmented
            label={`คานรัดเสา${SHAPE_NAME[leg.kind]}`}
            value={leg.yoke}
            options={(['tied', 'box'] as const).map((v) => ({ value: v, label: LEG_YOKE_LABEL[v] }))}
            onChange={(v) => set((i) => ({ ...withLeg(i, { ...leg, yoke: v }), tie: { ...i.tie, enabled: v === 'tied' ? true : i.tie.enabled, spans: v === 'tied' ? 1 : Math.max(i.tie.spans, 2) } }))}
          />
        )}
        {leg?.yoke === 'tied' && (
          <p className="text-xs text-slate-500">
            มุมในไม่มีหน้าตรงข้ามรับแรงดึงของคานรัด ระบบจึงใส่ Form tie ผ่านแต่ละขาที่มุมใน <b>{requiredTies(leg)} แถว</b> ให้เสมอ (ปิดไม่ได้) แต่ละขาคิดเหมือนเสาสี่เหลี่ยมที่โคนยึดด้วยไทร์
          </p>
        )}
        {leg?.yoke === 'box' && <p className="text-xs text-slate-500">คานรัดเป็นกรอบสี่เหลี่ยมรอบเสา ใส่กล่องไม้อุดที่มุมเว้า {legLayout(leg).fillers.length} กล่อง (รูป 9.2) คำนวณคานรัดแบบเสาสี่เหลี่ยมขนาดเท่ากรอบ</p>}
      </Group>
      <PressureGroup p={inp.pressure} onChange={(p) => set((i) => ({ ...i, pressure: p }))} />
      {!madeForm && <ColumnTimberFields inp={inp} set={set} />}
      {round?.system === 'steel' && (
        <Group title="สลักเกลียวปีกแบบเหล็ก" part="tie">
          <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
          <NumField label="ระยะสลักตามความสูง" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.yoke.spacingCm} min={10} max={100} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, spacingCm: v } }))} />
        </Group>
      )}
      <ColumnBraceGroup inp={inp} set={set} />
    </>
  )
}

/** Sheathing, studs, yokes and ties — the timber form (any shape but a ready-made round form). */
function ColumnTimberFields({ inp, set }: { inp: ColumnInput; set: (fn: (i: ColumnInput) => ColumnInput) => void }) {
  const sh = inp.sheathing
  const shape = columnShapeOf(inp)
  const staves = shape.kind === 'circle'
  const ring = shape.kind === 'polygon' && shape.yoke === 'ring'
  return (
    <>
      <Group title={staves ? 'ไม้ระแนงตั้ง (Staves)' : 'แผ่นผิวแบบ'} part="sheathing">
        <Segmented
          label="ชนิดแผ่นผิว"
          value={sh.type}
          options={
            staves
              ? [
                  { value: 'board', label: 'ไม้กระดาน' },
                  { value: 'plywood', label: 'ไม้อัดตัดเป็นแถบ' },
                ]
              : [
                  { value: 'plywood', label: 'ไม้อัด + เคร่า' },
                  { value: 'board', label: 'ไม้กระดาน (ไม่มีเคร่า)' },
                ]
          }
          onChange={(t) =>
            set((i) => ({
              ...i,
              sheathing: t === 'plywood' ? { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 18 } : { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 },
              stud: i.stud ?? { sectionId: 'timber-1.5x3', materialId: 'timber-yang' },
            }))
          }
        />
        {sh.type === 'plywood' ? (
          <SheathingPly materialId={sh.materialId} thicknessMm={sh.thicknessMm} onChange={(v) => set((i) => ({ ...i, sheathing: { type: 'plywood', ...v } }))} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label="ไม้">
              <Select value={sh.materialId} onChange={(e) => set((i) => ({ ...i, sheathing: { ...sh, materialId: e.target.value } }))}>
                {TIMBER.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ความหนา">
              <Select value={sh.thicknessCm} onChange={(e) => set((i) => ({ ...i, sheathing: { ...sh, thicknessCm: Number(e.target.value) } }))}>
                <option value={1.87}>¾" (1.87 ซม.)</option>
                <option value={2.5}>1" (2.5 ซม.)</option>
                <option value={3.75}>1½" (3.75 ซม.)</option>
              </Select>
            </Field>
          </div>
        )}
      </Group>
      {sh.type === 'plywood' && inp.stud && !staves && (
        <Group title="เคร่าตั้ง (Studs)" part="stud">
          <MemberPicker label="เคร่า" sectionId={inp.stud.sectionId} materialId={inp.stud.materialId} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud!, ...v } }))} />
          <NumField label="ระยะเคร่า" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.stud.spacingCm} min={5} max={100} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud!, spacingCm: v } }))} />
        </Group>
      )}
      <Group title={staves ? 'คานรัดเจาะโค้ง (Yokes)' : 'คานรัดแบบ (Yokes)'} part="yoke">
        <MemberPicker label={staves ? 'ไม้คานรัด (เจาะโค้ง)' : 'คานรัด'} sectionId={inp.yoke.sectionId} materialId={inp.yoke.materialId} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, ...v } }))} />
        <Segmented label="จำนวนต่อชุด" value={String(inp.yoke.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'หน้าตัดคู่' }]} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, count: Number(v) as 1 | 2 } }))} />
        <NumField label="ระยะคานรัด c/c" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.yoke.spacingCm} min={10} max={150} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, spacingCm: v } }))} />
        {shape.kind === 'circle' && (
          <NumField
            label="ความลึกสุทธิที่รอยเจาะ"
            unit="ซม."
            optional
            placeholder={cutYokeNetCm(getSection(inp.yoke.sectionId).H, inp.b * 50 + (sh.type === 'plywood' ? sh.thicknessMm / 10 : sh.thicknessCm)).toFixed(1)}
            hint="เว้นว่าง = ขอบในของไม้ 4 ด้านพบกันบนวงกลมที่ 45°"
            value={shape.netCm}
            min={3}
            max={60}
            onChange={(v) => set((i) => ({ ...i, shape: { ...shape, netCm: v } }))}
          />
        )}
      </Group>
      {isLegShape(shape) && shape.yoke === 'tied' ? (
        <Group title="การยึดรั้ง (Form tie)" part="tie">
          <div className="grid grid-cols-2 gap-2">
            <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
            <Field label="แบ่งแต่ละขาเป็น">
              <Select value={Math.max(1, inp.tie.spans)} onChange={(e) => set((i) => ({ ...i, tie: { ...i.tie, spans: Number(e.target.value) } }))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '1 ช่วง (ไทร์มุมในเท่านั้น)' : `${n} ช่วง (+${n - 1} แถว/ขา)`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Group>
      ) : (
        !staves && !ring && <ColumnTieGroup inp={inp} set={set} />
      )}
    </>
  )
}

function ColumnTieGroup({ inp, set }: { inp: ColumnInput; set: (fn: (i: ColumnInput) => ColumnInput) => void }) {
  return (
    <>
      <Group title="การยึดรั้ง (Form tie)" part="tie">
        <Toggle label="ใช้ Form tie ผ่านด้านยาว" checked={inp.tie.enabled} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, enabled: v, spans: Math.max(i.tie.spans, 2) } }))} />
        {inp.tie.enabled && (
          <div className="grid grid-cols-2 gap-2">
            <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
            <Field label="แบ่งด้านยาวเป็น">
              <Select value={inp.tie.spans} onChange={(e) => set((i) => ({ ...i, tie: { ...i.tie, spans: Number(e.target.value) } }))}>
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} ช่วง ({n - 1} แถว)
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {inp.tie.enabled && (
          <>
            <Toggle label="ใช้ Form tie ผ่านด้านสั้นด้วย (สองทิศทาง)" checked={(inp.tie.shortSpans ?? 1) > 1} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, shortSpans: v ? 2 : undefined } }))} />
            {(inp.tie.shortSpans ?? 1) > 1 && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="แบ่งด้านสั้นเป็น">
                  <Select value={inp.tie.shortSpans} onChange={(e) => set((i) => ({ ...i, tie: { ...i.tie, shortSpans: Number(e.target.value) } }))}>
                    {[2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} ช่วง ({n - 1} แถว)
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </>
        )}
      </Group>
    </>
  )
}

function ColumnBraceGroup({ inp, set }: { inp: ColumnInput; set: (fn: (i: ColumnInput) => ColumnInput) => void }) {
  return (
    <>
      <BraceGroup
        b={inp.brace}
        onChange={(b) => set((i) => ({ ...i, brace: b }))}
        extra={
          <div className="grid grid-cols-2 gap-2">
            <NumField label="ค้ำยันต่อด้าน" unit="ตัว" value={inp.brace.perSide} min={1} max={4} onChange={(v) => v && set((i) => ({ ...i, brace: { ...i.brace, perSide: Math.round(v) } }))} />
            <Field label="ค้ำกี่ด้าน">
              <Select value={inp.brace.sides} onChange={(e) => set((i) => ({ ...i, brace: { ...i.brace, sides: Number(e.target.value) as 2 | 4 } }))}>
                <option value={4}>4 ด้าน</option>
                <option value={2}>2 ด้าน (ต้องรับแรงดึง)</option>
              </Select>
            </Field>
          </div>
        }
      />
    </>
  )
}

export function WallForm({ inp, set, only }: { inp: WallInput; set: (fn: (i: WallInput) => WallInput) => void; only?: PartGroup }) {
  return (
    <OnlyCtx.Provider value={only}>
      <WallFields inp={inp} set={set} />
    </OnlyCtx.Provider>
  )
}

export function ColumnForm({ inp, set, only }: { inp: ColumnInput; set: (fn: (i: ColumnInput) => ColumnInput) => void; only?: PartGroup }) {
  return (
    <OnlyCtx.Provider value={only}>
      <ColumnFields inp={inp} set={set} />
    </OnlyCtx.Provider>
  )
}

// ---------------------------------------------------------------- shared: decks, loads, shores

const BOARDS = [
  { v: 1.8, l: '¾" (1.8 ซม.)' },
  { v: 1.9, l: '¾" (1.9 ซม.)' },
  { v: 2.5, l: '1" (2.5 ซม.)' },
  { v: 3.75, l: '1½" (3.75 ซม.)' },
]

function DeckSheathingFields({ sh, onChange }: { sh: DeckSheathing; onChange: (s: DeckSheathing) => void }) {
  return (
    <>
      <Segmented
        label="ชนิดแผ่นผิว"
        value={sh.type}
        options={[
          { value: 'plywood', label: 'ไม้อัด' },
          { value: 'board', label: 'ไม้กระดาน' },
        ]}
        onChange={(t) => onChange(t === 'plywood' ? { type: 'plywood', materialId: 'ply-apa1', thicknessMm: 18 } : { type: 'board', materialId: 'timber-yang', thicknessCm: 2.5 })}
      />
      {sh.type === 'plywood' ? (
        <SheathingPly materialId={sh.materialId} thicknessMm={sh.thicknessMm} onChange={(v) => onChange({ type: 'plywood', ...v })} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="ไม้">
            <Select value={sh.materialId} onChange={(e) => onChange({ ...sh, materialId: e.target.value })}>
              {TIMBER.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ความหนา">
            <Select value={sh.thicknessCm} onChange={(e) => onChange({ ...sh, thicknessCm: Number(e.target.value) })}>
              {BOARDS.map((b) => (
                <option key={b.v} value={b.v}>
                  {b.l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </>
  )
}

function LoadsFields<L extends VerticalLoads>({ loads, onChange, extra }: { loads: L; onChange: (l: L) => void; extra?: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumField label="น้ำหนักจร" unit="กก./ม.²" value={loads.liveLoad} min={0} max={2000} onChange={(v) => v !== undefined && onChange({ ...loads, liveLoad: v })} />
      <NumField label="น้ำหนักแบบ" unit="กก./ม.²" value={loads.formWeight} min={0} max={500} onChange={(v) => v !== undefined && onChange({ ...loads, formWeight: v })} />
      <NumField label="γ คอนกรีต" unit="กก./ม.³" value={loads.gamma} min={1500} max={3000} onChange={(v) => v !== undefined && onChange({ ...loads, gamma: v })} />
      {extra}
    </div>
  )
}

function ShoreFields<S extends ShoreParams>({ s, onChange, children }: { s: S; onChange: (s: S) => void; children?: ReactNode }) {
  return (
    <Group title="เสาค้ำยัน / นั่งร้าน (Shoring)" part="shore">
      <Segmented
        label="ระบบค้ำยัน"
        value={s.kind}
        options={[
          { value: 'post', label: 'เสาค้ำไม้/ท่อเหล็ก (คำนวณ)' },
          { value: 'rated', label: 'นั่งร้าน / Steel prop (SWL)' },
          { value: 'ringlock', label: 'นั่งร้าน Ringlock' },
        ]}
        onChange={(k) => onChange({ ...s, kind: k, ...(k === 'ringlock' ? { ringlock: s.ringlock ?? DEFAULT_RINGLOCK } : {}) })}
      />
      {s.kind === 'ringlock' ? (
        <RinglockFields s={s} onChange={onChange} />
      ) : s.kind === 'post' ? (
        <>
          <MemberPicker label="เสาค้ำ" sectionId={s.sectionId} materialId={s.materialId} pipes onChange={(v) => onChange({ ...s, ...v })} />
          <Field label="ค้ำยันทางข้างที่เสา">
            <Select value={s.braceLevels} onChange={(e) => onChange({ ...s, braceLevels: Number(e.target.value) })}>
              <option value={0}>ไม่มี (ความยาวเต็มต้น)</option>
              <option value={1}>1 ระดับ: กลางความสูง (l/2)</option>
              <option value={2}>2 ระดับ (l/3)</option>
            </Select>
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="ผลิตภัณฑ์">
            <Select
              value={RATED_SHORES.some((r) => r.name === s.ratedName) ? s.ratedName : ''}
              onChange={(e) => {
                const r = RATED_SHORES.find((x) => x.name === e.target.value)
                if (r) onChange({ ...s, ratedName: r.name, swl: r.swl })
              }}
            >
              <option value="">กำหนดเอง</option>
              {RATED_SHORES.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <NumField label="SWL ต่อขา" unit="กก." hint="ตามข้อมูลผู้ผลิต" value={s.swl} min={50} max={20000} onChange={(v) => v && onChange({ ...s, swl: v })} />
        </div>
      )}
      <div className="fields3">
        <NumField label="ความยาวเสา" unit="ม." optional placeholder="อัตโนมัติ" value={s.lengthM} min={0.3} max={15} onChange={(v) => onChange({ ...s, lengthM: v })} />
        <NumField label="แป้นรองฐาน" unit="ซม." hint="ด้านของแผ่นรองใต้เสา" value={s.baseCm} min={0} max={100} onChange={(v) => v !== undefined && onChange({ ...s, baseCm: v })} />
        <NumField label="รับแรงแบกทาน" unit="กก./ม.²" hint="ของพื้นใต้เสา · 0 = ไม่ตรวจ" value={s.bearing} min={0} onChange={(v) => v !== undefined && onChange({ ...s, bearing: v })} />
      </div>
      <Field label="พื้นใต้เสาค้ำ (ค่าแนะนำแรงแบกทาน)">
        <Select
          value={GROUND_BEARING.find((g) => g.bearing === s.bearing)?.name ?? (s.bearing === 0 ? 'none' : '')}
          onChange={(e) => {
            const g = GROUND_BEARING.find((x) => x.name === e.target.value)
            if (g) onChange({ ...s, bearing: g.bearing })
            else if (e.target.value === 'none') onChange({ ...s, bearing: 0 })
          }}
        >
          <option value="">กำหนดเอง ({s.bearing.toLocaleString()} กก./ม.²)</option>
          {GROUND_BEARING.map((g) => (
            <option key={g.name} value={g.name}>
              {g.name} — {g.bearing.toLocaleString()} กก./ม.²
            </option>
          ))}
          <option value="none">พื้นคอนกรีต / โครงสร้าง — ไม่ตรวจ (ให้วิศวกรตรวจพื้นรับน้ำหนัก)</option>
        </Select>
      </Field>
      <p className="text-xs leading-relaxed text-muted">
        ตรวจว่าพื้นใต้เสารับแรงกดได้: น้ำหนักต่อต้น ÷ (ด้านแป้นรองฐาน)² ≤ แรงแบกทาน — ตรวจเมื่อกรอกทั้งสองช่องมากกว่า 0. แป้นรองฐานคือด้านของแผ่นรองสี่เหลี่ยมใต้เสา (แจ็คเบสทั่วไป 15 ซม.; วางบนไม้หมอน/แผ่นไม้รองให้กรอกด้านที่กระจายแรงได้จริงต่อเสา เช่น 30). แรงแบกทานใช้ค่าจากผลเจาะสำรวจดินหรือวิศวกร — ค่าแนะนำข้างบนเป็นค่าประมาณสำหรับตรวจเบื้องต้น ถ้าไม่ผ่าน ให้ขยายแป้นรองฐาน/ใช้ไม้หมอน หรือเทคอนกรีตหยาบรองใต้เสา
      </p>
      {children}
    </Group>
  )
}

/** Ringlock: the ledger lengths a spacing across the beam has to match (× bays between the outer rows). */
const ledgerHint = (s: ShoreParams, bays = 1) =>
  s.kind === 'ringlock' ? `Ringlock: ${ringlockSystem(s.ringlock).ledgersCm.map((l) => ((l * bays) / 100).toFixed(2)).join(' / ')} ม.` : undefined

function RinglockFields<S extends ShoreParams>({ s, onChange }: { s: S; onChange: (s: S) => void }) {
  const rl = s.ringlock ?? DEFAULT_RINGLOCK
  const sys = ringlockSystem(rl)
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="ระบบ Ringlock">
          <Select value={sys.id} onChange={(e) => onChange({ ...s, ringlock: { ...rl, system: e.target.value as RinglockSystemId } })}>
            {RINGLOCK_SYSTEMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ระยะชั้นคานนอน" hint="จานโรเซตต์ทุก 0.5 ม.">
          <Select value={rl.liftM} onChange={(e) => onChange({ ...s, ringlock: { ...rl, liftM: Number(e.target.value) } })}>
            {RINGLOCK_LIFTS.map((v) => (
              <option key={v} value={v}>
                {v.toFixed(1)} ม.
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="fields3">
        <NumField label="SWL ต่อเสาตั้งจากผู้ผลิต" unit="กก." optional placeholder="คำนวณ" hint="เว้นว่าง = คำนวณจากท่อเสาตั้ง" value={rl.swl} min={100} max={20000} onChange={(v) => onChange({ ...s, ringlock: { ...rl, swl: v } })} />
        <NumField label="η (l₀ = η·h)" optional placeholder={String(ringlockEta(rl.liftM))} hint="เว้นว่าง = ตาม JGJ 231" value={rl.eta} min={0.5} max={3} onChange={(v) => onChange({ ...s, ringlock: { ...rl, eta: v } })} />
        <NumField label="k (l₀ = h′ + 2k·a)" optional placeholder="0.7" hint="เว้นว่าง = ตาม JGJ 231" value={rl.k} min={0.3} max={2} onChange={(v) => onChange({ ...s, ringlock: { ...rl, k: v } })} />
      </div>
      <p className="text-xs leading-relaxed text-muted">
        คานนอนมาตรฐาน {ledgerText(sys)} ม. — ระยะเสาค้ำที่ระบบเลือกจะปัดลงเป็นความยาวคานนอนเหล่านี้ (ระยะที่กรอกเองต้องตรงความยาวคานนอน). ความยาวประสิทธิผลของเสาตั้งตาม JGJ 231-2010 ข้อ 5.3.2: ใช้ค่ามากของ l₀ = η·h (η = 1.6 ที่ระยะชั้น 0.5/1.0 ม., 1.2 ที่ 1.5 ม.) และ l₀ = h′ + 2k·a (k = 0.7, a = ยูเฮดเหนือคานนอนบนสุด) แล้วคิดกำลังรับด้วย AISC ASD · ตรวจเกลียวแจ็คโผล่ ≤ 40 ซม. และยูเฮดเหนือคานนอนบนสุด ≤ 65 ซม. (ข้อ 6.1.5) — ถ้ามีตาราง SWL ของผู้ผลิตที่ใช้จริง ให้กรอกแทน
      </p>
    </>
  )
}

// ---------------------------------------------------------------- slab

function SlabFields({ inp, set }: { inp: SlabInput; set: (fn: (i: SlabInput) => SlabInput) => void }) {
  return (
    <>
      <Group title="ขนาดพื้น" part="concrete">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="ความหนาพื้น" unit="ซม." scale={100} value={inp.thickness} min={5} max={100} onChange={(v) => v && set((i) => ({ ...i, thickness: v }))} />
          <NumField label="สูงจากพื้นถึงท้องพื้น" unit="ม." value={inp.clearHeight} min={1} max={12} onChange={(v) => v && set((i) => ({ ...i, clearHeight: v }))} />
          <NumField label="ยาว X (แนวคานรองรับ)" unit="ม." value={inp.lengthX} min={0.5} max={60} onChange={(v) => v && set((i) => ({ ...i, lengthX: v }))} />
          <NumField label="ยาว Y (แนวตง)" unit="ม." value={inp.lengthY} min={0.5} max={60} onChange={(v) => v && set((i) => ({ ...i, lengthY: v }))} />
        </div>
        <LoadsFields loads={inp.loads} onChange={(l) => set((i) => ({ ...i, loads: l }))} />
      </Group>
      <Group title="แผ่นพื้นแบบ" part="sheathing">
        <DeckSheathingFields sh={inp.sheathing} onChange={(sh) => set((i) => ({ ...i, sheathing: sh }))} />
      </Group>
      <Group title="ตง (Joists)" part="joist">
        <MemberPicker label="ตง" sectionId={inp.joist.sectionId} materialId={inp.joist.materialId} onChange={(v) => set((i) => ({ ...i, joist: { ...i.joist, ...v } }))} />
        <NumField label="ระยะตง" unit="ซม." optional placeholder="อัตโนมัติ" hint="เว้นว่าง = ให้ระบบเลือก" value={inp.joist.spacingCm} min={10} max={150} onChange={(v) => set((i) => ({ ...i, joist: { ...i.joist, spacingCm: v } }))} />
      </Group>
      <Group title="คานรองรับ (Stringers)" part="stringer">
        <MemberPicker label="คานรองรับ" sectionId={inp.stringer.sectionId} materialId={inp.stringer.materialId} onChange={(v) => set((i) => ({ ...i, stringer: { ...i.stringer, ...v } }))} />
        <div className="grid grid-cols-2 gap-2">
          <Segmented label="จำนวนต่อแนว" value={String(inp.stringer.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'คู่' }]} onChange={(v) => set((i) => ({ ...i, stringer: { ...i.stringer, count: Number(v) as 1 | 2 } }))} />
          <NumField label="ระยะคานรองรับ" unit="ซม." optional placeholder="อัตโนมัติ" hint={ledgerHint(inp.shore)} value={inp.stringer.spacingCm} min={30} max={300} onChange={(v) => set((i) => ({ ...i, stringer: { ...i.stringer, spacingCm: v } }))} />
        </div>
      </Group>
      <ShoreFields s={inp.shore} onChange={(s) => set((i) => ({ ...i, shore: s }))}>
        <NumField label="ระยะเสาค้ำตามแนวคานรองรับ" unit="ซม." optional placeholder="อัตโนมัติ" hint={ledgerHint(inp.shore)} value={inp.shore.spacingCm} min={30} max={300} onChange={(v) => set((i) => ({ ...i, shore: { ...i.shore, spacingCm: v } }))} />
      </ShoreFields>
      <Group title="ค้ำยันทางข้างระบบเสาค้ำ" part="bracing">
        <Toggle label="ออกแบบค้ำยันทแยง (ACI 347: 2% DL)" checked={inp.bracing.enabled} onChange={(v) => set((i) => ({ ...i, bracing: { ...i.bracing, enabled: v } }))} />
        {inp.bracing.enabled && <MemberPicker label="ค้ำยันทแยง" sectionId={inp.bracing.sectionId} materialId={inp.bracing.materialId} pipes onChange={(v) => set((i) => ({ ...i, bracing: { ...i.bracing, ...v } }))} />}
      </Group>
    </>
  )
}

// ---------------------------------------------------------------- beam

function BeamFields({ inp, set }: { inp: BeamInput; set: (fn: (i: BeamInput) => BeamInput) => void }) {
  return (
    <>
      <Group title="ขนาดคาน" part="concrete">
        <Field label="ชนิดคาน">
          <Select value={inp.type} onChange={(e) => set((i) => ({ ...i, type: e.target.value as BeamInput['type'] }))}>
            {Object.entries(BEAM_TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="fields3">
          <NumField label="กว้าง b" unit="ซม." scale={100} value={inp.b} min={10} max={200} onChange={(v) => v && set((i) => ({ ...i, b: v }))} />
          <NumField label="ลึก h (รวมพื้น)" unit="ซม." scale={100} value={inp.h} min={15} max={300} onChange={(v) => v && set((i) => ({ ...i, h: v }))} />
          <NumField label="ยาว L" unit="ม." value={inp.length} min={0.5} max={30} onChange={(v) => v && set((i) => ({ ...i, length: v }))} />
          <NumField label="สูงถึงท้องคาน" unit="ม." value={inp.clearHeight} min={0.8} max={12} onChange={(v) => v && set((i) => ({ ...i, clearHeight: v }))} />
          {inp.type !== 'isolated' && (
            <>
              <NumField label="พื้นหนา" unit="ซม." scale={100} value={inp.slabT} min={0} max={50} onChange={(v) => v !== undefined && set((i) => ({ ...i, slabT: v }))} />
              <NumField label="พื้นถ่ายลงคาน" unit="ม." hint="กว้างนอกตัวคาน" value={inp.slabTribM} min={0} max={10} onChange={(v) => v !== undefined && set((i) => ({ ...i, slabTribM: v }))} />
            </>
          )}
        </div>
        <LoadsFields
          loads={inp.loads}
          onChange={(l) => set((i) => ({ ...i, loads: l }))}
          extra={<NumField label="แบบหล่อคาน" unit="กก./ม." value={inp.loads.beamFormWeight} min={0} max={1000} onChange={(v) => v !== undefined && set((i) => ({ ...i, loads: { ...i.loads, beamFormWeight: v } }))} />}
        />
      </Group>
      <Group title="แผ่นผิวแบบ (ข้างและท้อง)" part="sheathing">
        <DeckSheathingFields sh={inp.sheathing} onChange={(sh) => set((i) => ({ ...i, sheathing: sh }))} />
      </Group>
      <Group title="เคร่าข้างคาน" part="stud">
        <MemberPicker label="เคร่า" sectionId={inp.stud.sectionId} materialId={inp.stud.materialId} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, ...v } }))} />
        <NumField label="ระยะเคร่า" unit="ซม." optional placeholder="อัตโนมัติ" hint="เว้นว่าง = ให้ระบบเลือก" value={inp.stud.spacingCm} min={10} max={120} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, spacingCm: v } }))} />
      </Group>
      <Group title="Form tie (คานลึก)" part="tie">
        <Toggle label="ใช้ Form tie + คานรับเคร่ายึดแบบข้าง" checked={inp.tie.enabled} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, enabled: v } }))} />
        {inp.tie.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
              <NumField label="จำนวนแนวไทร์" unit="แนว" value={inp.tie.rows} min={1} max={6} onChange={(v) => v && set((i) => ({ ...i, tie: { ...i.tie, rows: Math.round(v) } }))} />
            </div>
            <MemberPicker label="คานรับเคร่า (คู่)" sectionId={inp.tie.waleSectionId} materialId={inp.tie.waleMaterialId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, waleSectionId: v.sectionId, waleMaterialId: v.materialId } }))} />
          </>
        )}
      </Group>
      <Group title="ท้องแบบ: คร่าวรับท้องแบบ" part="bottom">
        <Segmented
          label="ทิศทางคร่าวใต้ไม้อัดท้อง"
          value={inp.bottomDir ?? 'along'}
          options={[
            { value: 'along', label: 'ตามยาวคาน' },
            { value: 'across', label: 'ขวางคาน (ตงขวาง)' },
          ]}
          onChange={(v) => set((i) => ({ ...i, bottomDir: v }))}
        />
        {inp.bottomDir === 'across' && (
          <>
            <MemberPicker label="ตงขวาง" sectionId={beamCrossJoist(inp).sectionId} materialId={beamCrossJoist(inp).materialId} kinds={['timber']} onChange={(v) => set((i) => ({ ...i, crossJoist: { ...beamCrossJoist(i), ...v } }))} />
            <NumField label="ระยะตงขวาง" unit="ซม." optional placeholder="อัตโนมัติ" value={beamCrossJoist(inp).spacingCm} min={10} max={100} onChange={(v) => set((i) => ({ ...i, crossJoist: { ...beamCrossJoist(i), spacingCm: v } }))} />
          </>
        )}
        <Toggle label="เลือกจำนวนคร่าวตามยาวอัตโนมัติ (ตามช่วงที่ไม้อัด/ตงขวางรับได้)" checked={!!inp.bottom.auto} onChange={(v) => set((i) => ({ ...i, bottom: { ...i.bottom, auto: v } }))} />
        <div className="grid grid-cols-2 gap-2">
          {!inp.bottom.auto && (
            <NumField
              label="จำนวนคร่าวตามยาว"
              unit="ตัว"
              hint={inp.bottomDir === 'across' ? 'อย่างน้อย 2' : '0 = แผ่นท้องรับเอง'}
              value={inp.bottom.count}
              min={inp.bottomDir === 'across' ? 2 : 0}
              max={10}
              onChange={(v) => v !== undefined && set((i) => ({ ...i, bottom: { ...i.bottom, count: Math.round(v) } }))}
            />
          )}
          {getMaterial(inp.bottom.materialId).kind === 'timber' && (
            <Segmented label="การวาง" value={inp.bottom.flat ? 'flat' : 'edge'} options={[{ value: 'flat', label: 'วางนอน' }, { value: 'edge', label: 'วางตั้ง' }]} onChange={(v) => set((i) => ({ ...i, bottom: { ...i.bottom, flat: v === 'flat' } }))} />
          )}
        </div>
        {beamHasRunners(inp) && <MemberPicker label={inp.bottomDir === 'across' ? 'คร่าวตามยาว' : 'ไม้เสริมท้อง (คร่าวตามยาว)'} sectionId={inp.bottom.sectionId} materialId={inp.bottom.materialId} onChange={(v) => set((i) => ({ ...i, bottom: { ...i.bottom, ...v } }))} />}
      </Group>
      <Group title="คานขวางรับท้องแบบ (Head)" part="head">
        <MemberPicker label="คานขวาง" sectionId={inp.head.sectionId} materialId={inp.head.materialId} onChange={(v) => set((i) => ({ ...i, head: { ...i.head, ...v } }))} />
        <div className="grid grid-cols-2 gap-2">
          <Segmented label="จำนวนต่อชุด" value={String(inp.head.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'คู่' }]} onChange={(v) => set((i) => ({ ...i, head: { ...i.head, count: Number(v) as 1 | 2 } }))} />
          <NumField label="ระยะคานขวาง" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.head.spacingCm} min={20} max={240} onChange={(v) => set((i) => ({ ...i, head: { ...i.head, spacingCm: v } }))} />
        </div>
      </Group>
      <Group title="คานแนวยาวใต้คานขวาง (Stringer)" part="stringer">
        <Toggle
          label="วางคานขวางบนคานแนวยาว + ก้ามปู (ระยะเสาค้ำไม่ต้องตรงคานขวาง)"
          checked={beamStringer(inp).enabled}
          onChange={(v) =>
            set((i) => {
              const pipe = (id: string) => getSection(id).shape === 'pipe'
              return {
                ...i,
                stringer: { ...beamStringer(i), enabled: v },
                // the system is usually built of BS tubes: start the posts and the bracing as tubes
                ...(v && i.shore.kind === 'post' && !pipe(i.shore.sectionId) ? { shore: { ...i.shore, sectionId: BS_TUBE, materialId: 'steel-a36' } } : {}),
                ...(v && !pipe(beamBracing(i).sectionId) ? { bracing: { ...beamBracing(i), sectionId: BS_TUBE, materialId: 'steel-a36' } } : {}),
              }
            })
          }
        />
        {beamStringer(inp).enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Segmented label="จำนวนแถว" value={String(beamStringer(inp).rows) as '2' | '3'} options={[{ value: '2', label: '2 แถว' }, { value: '3', label: '3 แถว' }]} onChange={(v) => set((i) => ({ ...i, stringer: { ...beamStringer(i), rows: Number(v) as 2 | 3 } }))} />
              <NumField label="ระยะแถวริม–ริม" unit="ม." hint={ledgerHint(inp.shore, beamStringer(inp).rows - 1)} value={inp.shore.postSpacingM} min={0.2} max={3} onChange={(v) => v && set((i) => ({ ...i, shore: { ...i.shore, postSpacingM: v } }))} />
            </div>
            <MemberPicker label="คานแนวยาว" sectionId={beamStringer(inp).sectionId} materialId={beamStringer(inp).materialId} onChange={(v) => set((i) => ({ ...i, stringer: { ...beamStringer(i), ...v } }))} />
            <div className="grid grid-cols-2 gap-2">
              <Segmented label="ต่อแถว" value={String(beamStringer(inp).count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'คู่' }]} onChange={(v) => set((i) => ({ ...i, stringer: { ...beamStringer(i), count: Number(v) as 1 | 2 } }))} />
              <NumField label="ระยะเสาค้ำตามแนวคาน" unit="ซม." optional placeholder="อัตโนมัติ" value={beamStringer(inp).spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, stringer: { ...beamStringer(i), spacingCm: v } }))} />
            </div>
            {inp.shore.kind === 'post' && (
              <NumField label="ท่อยึดแนวราบ (ท่อแนวรอง) ห่างไม่เกิน" unit="ม." hint="ยึดเสาทั้งสองทิศทาง — ระบบเพิ่มระดับให้เองถ้าเสายังเป็นตัวกำหนด" value={beamStringer(inp).liftM ?? LEDGER_LIFT} min={0.5} max={3} onChange={(v) => v && set((i) => ({ ...i, stringer: { ...beamStringer(i), liftM: v } }))} />
            )}
          </>
        )}
      </Group>
      <ShoreFields s={inp.shore} onChange={(s) => set((i) => ({ ...i, shore: s }))}>
        {!beamStringer(inp).enabled && (
          <div className="grid grid-cols-2 gap-2">
            <Segmented label="รูปแบบ" value={inp.shore.layout} options={[{ value: 'single', label: 'ตุ๊กตาตัวที' }, { value: 'double', label: 'เสาคู่' }]} onChange={(v) => set((i) => ({ ...i, shore: { ...i.shore, layout: v } }))} />
            {inp.shore.layout === 'double' && <NumField label="ระยะเสาคู่" unit="ม." hint={ledgerHint(inp.shore)} value={inp.shore.postSpacingM} min={0.2} max={2.5} onChange={(v) => v && set((i) => ({ ...i, shore: { ...i.shore, postSpacingM: v } }))} />}
          </div>
        )}
      </ShoreFields>
      <Group title={beamStringer(inp).enabled ? 'ค้ำยันทแยงและท่อยึดแนวราบ (ตามแนวคานและขวางคาน)' : 'ค้ำยันทางข้างแถวเสาค้ำ (ตามแนวคาน)'} part="bracing">
        <Toggle label="ออกแบบค้ำยันทแยง (ACI 347: 2% DL)" checked={beamBracing(inp).enabled} onChange={(v) => set((i) => ({ ...i, bracing: { ...beamBracing(i), enabled: v } }))} />
        {(beamBracing(inp).enabled || beamStringer(inp).enabled) && (
          <MemberPicker label={beamStringer(inp).enabled ? 'ค้ำยันทแยง / ท่อยึดแนวราบ' : 'ค้ำยันทแยง'} sectionId={beamBracing(inp).sectionId} materialId={beamBracing(inp).materialId} pipes onChange={(v) => set((i) => ({ ...i, bracing: { ...beamBracing(i), ...v } }))} />
        )}
      </Group>
      {inp.type !== 'slab' && !inp.tie.enabled && (
        <Group title="ค้ำยันปากแบบ" part="brace">
          <MemberPicker label="ค้ำยันทแยง" sectionId={inp.brace.sectionId} materialId={inp.brace.materialId} onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, ...v } }))} />
          <NumField label="มุมกับแนวราบ" unit="°" value={inp.brace.angleDeg} min={30} max={75} onChange={(v) => v && set((i) => ({ ...i, brace: { ...i.brace, angleDeg: v } }))} />
        </Group>
      )}
    </>
  )
}

// ---------------------------------------------------------------- footing

/** Starting sizes of an L/T/U footing, m. */
const LEG_FOOTING: Record<'L' | 'T' | 'U', LegShape> = {
  L: { kind: 'L', a: 4.5, b: 4.0, ta: 1.5, tb: 1.5, yoke: 'tied' },
  T: { kind: 'T', bf: 5.0, tf: 1.5, tw: 1.6, d: 4.2, yoke: 'tied' },
  U: { kind: 'U', b: 5.2, d: 4.0, t: 1.5, tb: 1.5, yoke: 'tied' },
}

const footingKey = (s: FootingShape): ShapeKey => (s.kind === 'polygon' ? (s.n === 6 ? 'hex' : 'oct') : s.kind)

/** Footing input on an L/T/U: lengthX × lengthY kept as its box. */
function withFootingLeg(i: FootingInput, s: LegShape): FootingInput {
  const [x, y] = legBox(s)
  return { ...i, lengthX: x, lengthY: y, shape: s }
}

/** Footing switched to another plan shape: one size for round / polygonal; a round one is braced at every stud. */
function withFootingShape(i: FootingInput, key: ShapeKey): FootingInput {
  const was = footingShapeOf(i)
  if (key === 'rect') {
    const { shape: _s, ...rest } = i
    return rest
  }
  if (key === 'L' || key === 'T' || key === 'U') return withFootingLeg(i, LEG_FOOTING[key])
  const size = was.kind === 'rect' ? Math.min(i.lengthX, i.lengthY) : isLegShape(was) ? 4 : i.lengthX
  if (key === 'circle') {
    const flat = i.support === 'tied' || (i.support === 'braced' && i.brace.at === 'wale')
    return { ...i, lengthX: size, lengthY: size, shape: { kind: 'circle' }, ...(flat ? { support: 'braced' as const, brace: { ...i.brace, at: 'stud' as const } } : {}) }
  }
  return { ...i, lengthX: size, lengthY: size, shape: { kind: 'polygon', n: key === 'hex' ? 6 : 8 } }
}

function FootingFields({ inp, set }: { inp: FootingInput; set: (fn: (i: FootingInput) => FootingInput) => void }) {
  const shape = footingShapeOf(inp)
  const rect = shape.kind === 'rect'
  const round = shape.kind === 'circle'
  const leg = isLegShape(shape) ? shape : undefined
  const setSize = (v: number | undefined) => v && set((i) => ({ ...i, lengthX: v, lengthY: v }))
  return (
    <>
      <Group title="ขนาดฐานราก" part="concrete">
        <ShapePicker label="รูปแปลนฐานราก" value={footingKey(shape)} onChange={(k) => set((i) => withFootingShape(i, k))} />
        <div className="fields3">
          {leg ? (
            <LegFields metres s={leg} onChange={(s) => set((i) => withFootingLeg(i, s))} />
          ) : rect ? (
            <>
              <NumField label="ยาว X" unit="ม." value={inp.lengthX} min={0.2} max={30} onChange={(v) => v && set((i) => ({ ...i, lengthX: v }))} />
              <NumField label="ยาว Y" unit="ม." value={inp.lengthY} min={0.2} max={30} onChange={(v) => v && set((i) => ({ ...i, lengthY: v }))} />
            </>
          ) : round ? (
            <NumField label="เส้นผ่านศูนย์กลาง D" unit="ม." value={inp.lengthX} min={0.5} max={30} onChange={setSize} />
          ) : (
            <NumField label="ระยะข้ามด้านแบน F" unit="ม." value={inp.lengthX} min={0.5} max={30} hint={`ยาวด้าน a = ${polygonDims(shape.kind === 'polygon' ? shape.n : 8, inp.lengthX).a.toFixed(2)} ม.`} onChange={setSize} />
          )}
          <NumField label="ลึก H" unit="ม." value={inp.height} min={0.2} max={6} onChange={(v) => v && set((i) => ({ ...i, height: v }))} />
        </div>
        {round && <p className="text-xs text-slate-500">แผ่นผิวดัดโค้งตามรัศมี (ไม้อัด 9 มม. R ≥ 0.9 ม., 12 มม. R ≥ 1.8 ม.) ยึดด้วยเคร่าปลายยื่นหรือค้ำยันทุกเคร่า — คานรับเคร่าตรงใช้กับรูปกลมไม่ได้</p>}
        {shape.kind === 'polygon' && <p className="text-xs text-slate-500">คานรับเคร่ารอบฐานเป็นวงแหวนตามหน้า ต่อมุมด้วยเหล็กประกับ ไม่ใช้ Form tie</p>}
        {leg && <p className="text-xs text-slate-500">คานรับเคร่ารอบฐานวิ่งตามทุกหน้า มี Form tie ผ่านแต่ละขาที่มุมใน {requiredTies(leg)} แถว (บังคับ) ระบบเพิ่มไทร์กลางขาให้เองถ้าจำเป็น</p>}
      </Group>
      <PressureGroup p={inp.pressure} onChange={(p) => set((i) => ({ ...i, pressure: p }))} />
      <Group title="แผ่นผิวข้างแบบ" part="sheathing">
        <DeckSheathingFields sh={inp.sheathing} onChange={(sh) => set((i) => ({ ...i, sheathing: sh }))} />
      </Group>
      <Group title="เคร่า (Studs)" part="stud">
        <Field label="การยึดเคร่า (§10.4)">
          <Select value={inp.support} onChange={(e) => set((i) => ({ ...i, support: e.target.value as FootingInput['support'] }))}>
            {Object.entries(FOOTING_SUPPORT_LABEL)
              .filter(([k]) => !round || k !== 'tied')
              .map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <MemberPicker label="เคร่า" sectionId={inp.stud.sectionId} materialId={inp.stud.materialId} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, ...v } }))} />
        <NumField label="ระยะเคร่า" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.stud.spacingCm} min={10} max={100} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, spacingCm: v } }))} />
      </Group>
      {inp.support === 'braced' && (
        <Group title="ค้ำยันทแยง" part="brace">
          <div className="label">
            <span>ตำแหน่งค้ำยัน</span>
            <Segmented
              label="ตำแหน่งค้ำยัน"
              value={inp.brace.at ?? 'stud'}
              options={(round ? (['stud'] as const) : (['stud', 'wale'] as const)).map((k) => ({ value: k, label: FOOTING_BRACE_AT_LABEL[k] }))}
              onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, at: v } }))}
            />
          </div>
          <MemberPicker label="ค้ำยัน" sectionId={inp.brace.sectionId} materialId={inp.brace.materialId} pipes onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, ...v } }))} />
          <div className="fields3">
            <NumField label="มุม" unit="°" value={inp.brace.angleDeg} min={30} max={60} onChange={(v) => v && set((i) => ({ ...i, brace: { ...i.brace, angleDeg: v } }))} />
            <NumField label="ระยะจุดค้ำ" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.brace.spacingCm} min={15} max={200} onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, spacingCm: v } }))} />
            <NumField label="ยื่นปลายบน" unit="ม." value={inp.brace.topOverhangM} min={0} max={1} onChange={(v) => v !== undefined && set((i) => ({ ...i, brace: { ...i.brace, topOverhangM: v } }))} />
          </div>
          {inp.brace.at === 'wale' && (
            <NumField label="ระยะค้ำยันตามคานรับเคร่า" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.brace.alongCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, alongCm: v } }))} />
          )}
        </Group>
      )}
      {(inp.support === 'tied' || (inp.support === 'braced' && inp.brace.at === 'wale')) && (
        <Group title={inp.support === 'tied' ? 'คานรับเคร่ารอบฐาน (Wales)' : 'คานรับเคร่า (รับค้ำยัน)'} part="wale">
          <MemberPicker label="คานรับเคร่า" sectionId={inp.wale.sectionId} materialId={inp.wale.materialId} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, ...v } }))} />
          <div className="grid grid-cols-3 gap-2">
            <Segmented label="ต่อชุด" value={String(inp.wale.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'คู่' }]} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, count: Number(v) as 1 | 2 } }))} />
            {rect && (
            <Field label="มุมคาน" className="col-span-2">
              <Select value={inp.wale.corner ?? 'cross'} onChange={(e) => set((i) => ({ ...i, wale: { ...i.wale, corner: e.target.value as FootingWaleCorner } }))}>
                {Object.entries(FOOTING_WALE_CORNER_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            )}
            {rect && (inp.wale.corner ?? 'cross') === 'cross' && (
              <Field label="คานด้านสั้น" hint="อัตโนมัติ: เลื่อนลงถ้าคานล่างยังห่างฐาน ≥ 3 ซม.">
                <Select value={inp.wale.shift ?? 'auto'} onChange={(e) => set((i) => ({ ...i, wale: { ...i.wale, shift: e.target.value as FootingWaleShift } }))}>
                  {Object.entries(FOOTING_WALE_SHIFT_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {inp.support === 'tied' && (
              <>
                <NumField label="ระยะ c/c" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.wale.spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, spacingCm: v } }))} />
                <NumField label="ตัวแรกจากฐาน" unit="ม." value={inp.wale.bottomOffsetM} min={0.05} max={1} onChange={(v) => v && set((i) => ({ ...i, wale: { ...i.wale, bottomOffsetM: v } }))} />
              </>
            )}
          </div>
        </Group>
      )}
      {inp.support === 'tied' && leg && (
        <Group title="Form tie" part="tie">
          <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
        </Group>
      )}
      {inp.support === 'tied' && rect && (
        <Group title="Form tie" part="tie">
          <Field label="การวางไทร์">
            <Select value={inp.tie.layout ?? 'auto'} onChange={(e) => set((i) => ({ ...i, tie: { ...i.tie, layout: e.target.value as FootingTieLayout } }))}>
              {Object.entries(FOOTING_TIE_LAYOUT_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          {inp.tie.layout !== 'none' && (
            <>
              <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
              <NumField label="ระยะไทร์" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.tie.spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, spacingCm: v } }))} />
            </>
          )}
        </Group>
      )}
      {inp.support !== 'tied' && (
        <Group title="หลักยึดและดิน" part="stake">
          <MemberPicker label="หลัก" sectionId={inp.stake.sectionId} materialId="timber-yang" kinds={['timber']} onChange={(v) => set((i) => ({ ...i, stake: { ...i.stake, sectionId: v.sectionId } }))} />
          <div className="fields3">
            <NumField label="ฝังลึก" unit="ม." value={inp.stake.embedM} min={0.2} max={3} onChange={(v) => v && set((i) => ({ ...i, stake: { ...i.stake, embedM: v } }))} />
            <NumField label="แผ่นไม้หลังหลัก" unit="ซม." value={inp.stake.boardCm} min={5} max={60} onChange={(v) => v && set((i) => ({ ...i, stake: { ...i.stake, boardCm: v } }))} />
            <NumField label="ดินรับแรง" unit="กก./ม.²" value={inp.soilBearing} min={1000} max={100000} onChange={(v) => v && set((i) => ({ ...i, soilBearing: v }))} />
          </div>
        </Group>
      )}
    </>
  )
}

export function SlabForm({ inp, set, only }: { inp: SlabInput; set: (fn: (i: SlabInput) => SlabInput) => void; only?: PartGroup }) {
  return (
    <OnlyCtx.Provider value={only}>
      <SlabFields inp={inp} set={set} />
    </OnlyCtx.Provider>
  )
}

export function BeamForm({ inp, set, only }: { inp: BeamInput; set: (fn: (i: BeamInput) => BeamInput) => void; only?: PartGroup }) {
  return (
    <OnlyCtx.Provider value={only}>
      <BeamFields inp={inp} set={set} />
    </OnlyCtx.Provider>
  )
}

export function FootingForm({ inp, set, only }: { inp: FootingInput; set: (fn: (i: FootingInput) => FootingInput) => void; only?: PartGroup }) {
  return (
    <OnlyCtx.Provider value={only}>
      <FootingFields inp={inp} set={set} />
    </OnlyCtx.Provider>
  )
}

/** Form for any element type; `set` receives an updater of the element input. */
export function ElementForm({ el, set, only }: { el: ElementData; set: (fn: (el: ElementData) => ElementData) => void; only?: PartGroup }) {
  switch (el.type) {
    case 'wall':
      return <WallForm inp={el.input} set={(fn) => set((e) => (e.type === 'wall' ? { ...e, input: fn(e.input) } : e))} only={only} />
    case 'column':
      return <ColumnForm inp={el.input} set={(fn) => set((e) => (e.type === 'column' ? { ...e, input: fn(e.input) } : e))} only={only} />
    case 'slab':
      return <SlabForm inp={el.input} set={(fn) => set((e) => (e.type === 'slab' ? { ...e, input: fn(e.input) } : e))} only={only} />
    case 'beam':
      return <BeamForm inp={el.input} set={(fn) => set((e) => (e.type === 'beam' ? { ...e, input: fn(e.input) } : e))} only={only} />
    case 'footing':
      return <FootingForm inp={el.input} set={(fn) => set((e) => (e.type === 'footing' ? { ...e, input: fn(e.input) } : e))} only={only} />
  }
}
