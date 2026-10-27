import { getMaterial, LOGS, MATERIALS, type MaterialKind, PIPES, STEEL_SECTIONS, TIMBER_SECTIONS } from '@/engine'
import { Field, Select } from '../ui'

interface Props {
  label: string
  sectionId: string
  materialId: string
  onChange: (v: { sectionId: string; materialId: string }) => void
  /** allowed material kinds */
  kinds?: MaterialKind[]
  /** props/braces: include steel pipes and round timber posts */
  pipes?: boolean
}

export function sectionsFor(kind: MaterialKind, pipes = false) {
  if (kind === 'timber') return pipes ? [...TIMBER_SECTIONS, ...LOGS] : TIMBER_SECTIONS
  return pipes ? [...PIPES, ...STEEL_SECTIONS] : STEEL_SECTIONS
}

export function MemberPicker({ label, sectionId, materialId, onChange, kinds = ['timber', 'steel'], pipes }: Props) {
  const mat = getMaterial(materialId)
  const sections = sectionsFor(mat.kind, pipes)
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label={`${label} — วัสดุ`}>
        <Select
          value={materialId}
          onChange={(e) => {
            const m = getMaterial(e.target.value)
            const list = sectionsFor(m.kind, pipes)
            onChange({ materialId: m.id, sectionId: list.some((s) => s.id === sectionId) ? sectionId : list[0].id })
          }}
        >
          {MATERIALS.filter((m) => kinds.includes(m.kind)).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="หน้าตัด">
        <Select value={sectionId} onChange={(e) => onChange({ materialId, sectionId: e.target.value })}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
