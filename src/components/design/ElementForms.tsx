// Input forms for wall / column elements. Each group is tagged with the 3D part group it edits so the
// 3D inspector can show just that group (`only`).
import { createContext, type ReactNode, useContext } from 'react'
import { MemberPicker } from '@/components/design/MemberPicker'
import { NumField } from '@/components/design/NumField'
import { Field, Segmented, Select, Toggle } from '@/components/ui'
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
  type ColumnInput,
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
  PLYWOOD,
  PLYWOOD_THICKNESS,
  type PressureParams,
  RATED_SHORES,
  type ShoreParams,
  type SlabInput,
  TIES,
  TIMBER,
  type VerticalLoads,
  type WallInput,
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
      <div className="grid grid-cols-3 gap-2">
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
      <div className="grid grid-cols-3 gap-2">
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
  return (
    <>
      <Group title="ขนาดกำแพง" part="concrete">
        <div className="grid grid-cols-3 gap-2">
          <NumField label="ความหนา" unit="ซม." scale={100} value={inp.thickness} min={5} max={300} onChange={(v) => v && set((i) => ({ ...i, thickness: v }))} />
          <NumField label="ความสูงเท H" unit="ม." value={inp.height} min={0.2} max={15} onChange={(v) => v && set((i) => ({ ...i, height: v }))} />
          <NumField label="ความยาว" unit="ม." value={inp.length} min={0.2} max={200} onChange={(v) => v && set((i) => ({ ...i, length: v }))} />
        </div>
      </Group>
      <PressureGroup p={inp.pressure} onChange={(p) => set((i) => ({ ...i, pressure: p }))} />
      <Group title="แผ่นผิวแบบ" part="sheathing">
        <SheathingPly materialId={inp.sheathing.materialId} thicknessMm={inp.sheathing.thicknessMm} onChange={(v) => set((i) => ({ ...i, sheathing: v }))} />
      </Group>
      <Group title="เคร่าตั้ง (Studs)" part="stud">
        <MemberPicker label="เคร่า" sectionId={inp.stud.sectionId} materialId={inp.stud.materialId} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, ...v } }))} />
        <NumField label="ระยะเคร่า" unit="ซม." optional placeholder="อัตโนมัติ" hint="เว้นว่าง = ให้ระบบเลือก" value={inp.stud.spacingCm} min={5} max={120} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud, spacingCm: v } }))} />
      </Group>
      <Group title="คานรับเคร่า (Wales)" part="wale">
        <MemberPicker label="คานรับเคร่า" sectionId={inp.wale.sectionId} materialId={inp.wale.materialId} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, ...v } }))} />
        <Segmented label="จำนวนต่อชุด" value={String(inp.wale.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'หน้าตัดคู่' }]} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, count: Number(v) as 1 | 2 } }))} />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="ระยะ c/c" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.wale.spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, wale: { ...i.wale, spacingCm: v } }))} />
          <NumField label="ตัวแรกจากฐาน" unit="ม." value={inp.bottomWaleOffsetM} min={0.05} max={1} onChange={(v) => v && set((i) => ({ ...i, bottomWaleOffsetM: v }))} />
          <NumField label="ตัวบนจากขอบบน" unit="ม." optional placeholder="อัตโนมัติ" hint="เว้นว่าง = ช่วงยื่นยาวสุดที่ผ่าน" value={inp.topWaleOffsetM} min={0.05} max={1} onChange={(v) => set((i) => ({ ...i, topWaleOffsetM: v }))} />
        </div>
      </Group>
      <Group title="Form tie" part="tie">
        <TieSelect value={inp.tie.tieId} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, tieId: v } }))} />
        <NumField label="ระยะไทร์ตามแนวนอน" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.tie.spacingCm} min={20} max={300} onChange={(v) => set((i) => ({ ...i, tie: { ...i.tie, spacingCm: v } }))} />
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

function ColumnFields({ inp, set }: { inp: ColumnInput; set: (fn: (i: ColumnInput) => ColumnInput) => void }) {
  const sh = inp.sheathing
  return (
    <>
      <Group title="ขนาดเสา" part="concrete">
        <div className="grid grid-cols-3 gap-2">
          <NumField label="ด้าน b" unit="ซม." scale={100} value={inp.b} min={10} max={300} onChange={(v) => v && set((i) => ({ ...i, b: v }))} />
          <NumField label="ด้าน h" unit="ซม." scale={100} value={inp.h} min={10} max={300} onChange={(v) => v && set((i) => ({ ...i, h: v }))} />
          <NumField label="ความสูงเท H" unit="ม." value={inp.height} min={0.3} max={15} onChange={(v) => v && set((i) => ({ ...i, height: v }))} />
        </div>
      </Group>
      <PressureGroup p={inp.pressure} onChange={(p) => set((i) => ({ ...i, pressure: p }))} />
      <Group title="แผ่นผิวแบบ" part="sheathing">
        <Segmented
          label="ชนิดแผ่นผิว"
          value={sh.type}
          options={[
            { value: 'plywood', label: 'ไม้อัด + เคร่า' },
            { value: 'board', label: 'ไม้กระดาน (ไม่มีเคร่า)' },
          ]}
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
      {sh.type === 'plywood' && inp.stud && (
        <Group title="เคร่าตั้ง (Studs)" part="stud">
          <MemberPicker label="เคร่า" sectionId={inp.stud.sectionId} materialId={inp.stud.materialId} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud!, ...v } }))} />
          <NumField label="ระยะเคร่า" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.stud.spacingCm} min={5} max={100} onChange={(v) => set((i) => ({ ...i, stud: { ...i.stud!, spacingCm: v } }))} />
        </Group>
      )}
      <Group title="คานรัดแบบ (Yokes)" part="yoke">
        <MemberPicker label="คานรัด" sectionId={inp.yoke.sectionId} materialId={inp.yoke.materialId} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, ...v } }))} />
        <Segmented label="จำนวนต่อชุด" value={String(inp.yoke.count) as '1' | '2'} options={[{ value: '1', label: 'เดี่ยว' }, { value: '2', label: 'หน้าตัดคู่' }]} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, count: Number(v) as 1 | 2 } }))} />
        <NumField label="ระยะคานรัด c/c" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.yoke.spacingCm} min={10} max={150} onChange={(v) => set((i) => ({ ...i, yoke: { ...i.yoke, spacingCm: v } }))} />
      </Group>
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
      </Group>
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
        ]}
        onChange={(k) => onChange({ ...s, kind: k })}
      />
      {s.kind === 'post' ? (
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
      <div className="grid grid-cols-3 gap-2">
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
          <NumField label="ระยะคานรองรับ" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.stringer.spacingCm} min={30} max={300} onChange={(v) => set((i) => ({ ...i, stringer: { ...i.stringer, spacingCm: v } }))} />
        </div>
      </Group>
      <ShoreFields s={inp.shore} onChange={(s) => set((i) => ({ ...i, shore: s }))}>
        <NumField label="ระยะเสาค้ำตามแนวคานรองรับ" unit="ซม." optional placeholder="อัตโนมัติ" value={inp.shore.spacingCm} min={30} max={300} onChange={(v) => set((i) => ({ ...i, shore: { ...i.shore, spacingCm: v } }))} />
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
        <div className="grid grid-cols-3 gap-2">
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
              <NumField label="ระยะแถวริม–ริม" unit="ม." value={inp.shore.postSpacingM} min={0.2} max={3} onChange={(v) => v && set((i) => ({ ...i, shore: { ...i.shore, postSpacingM: v } }))} />
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
            {inp.shore.layout === 'double' && <NumField label="ระยะเสาคู่" unit="ม." value={inp.shore.postSpacingM} min={0.2} max={2.5} onChange={(v) => v && set((i) => ({ ...i, shore: { ...i.shore, postSpacingM: v } }))} />}
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

function FootingFields({ inp, set }: { inp: FootingInput; set: (fn: (i: FootingInput) => FootingInput) => void }) {
  return (
    <>
      <Group title="ขนาดฐานราก" part="concrete">
        <div className="grid grid-cols-3 gap-2">
          <NumField label="ยาว X" unit="ม." value={inp.lengthX} min={0.2} max={30} onChange={(v) => v && set((i) => ({ ...i, lengthX: v }))} />
          <NumField label="ยาว Y" unit="ม." value={inp.lengthY} min={0.2} max={30} onChange={(v) => v && set((i) => ({ ...i, lengthY: v }))} />
          <NumField label="ลึก H" unit="ม." value={inp.height} min={0.2} max={6} onChange={(v) => v && set((i) => ({ ...i, height: v }))} />
        </div>
      </Group>
      <PressureGroup p={inp.pressure} onChange={(p) => set((i) => ({ ...i, pressure: p }))} />
      <Group title="แผ่นผิวข้างแบบ" part="sheathing">
        <DeckSheathingFields sh={inp.sheathing} onChange={(sh) => set((i) => ({ ...i, sheathing: sh }))} />
      </Group>
      <Group title="เคร่า (Studs)" part="stud">
        <Field label="การยึดเคร่า (§10.4)">
          <Select value={inp.support} onChange={(e) => set((i) => ({ ...i, support: e.target.value as FootingInput['support'] }))}>
            {Object.entries(FOOTING_SUPPORT_LABEL).map(([k, l]) => (
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
              options={(['stud', 'wale'] as const).map((k) => ({ value: k, label: FOOTING_BRACE_AT_LABEL[k] }))}
              onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, at: v } }))}
            />
          </div>
          <MemberPicker label="ค้ำยัน" sectionId={inp.brace.sectionId} materialId={inp.brace.materialId} pipes onChange={(v) => set((i) => ({ ...i, brace: { ...i.brace, ...v } }))} />
          <div className="grid grid-cols-3 gap-2">
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
            <Field label="มุมคาน" className="col-span-2">
              <Select value={inp.wale.corner ?? 'cross'} onChange={(e) => set((i) => ({ ...i, wale: { ...i.wale, corner: e.target.value as FootingWaleCorner } }))}>
                {Object.entries(FOOTING_WALE_CORNER_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            {(inp.wale.corner ?? 'cross') === 'cross' && (
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
      {inp.support === 'tied' && (
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
          <div className="grid grid-cols-3 gap-2">
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
