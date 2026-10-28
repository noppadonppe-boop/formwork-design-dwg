// Form Assembly — the project's panel stock (แผงแบบหล่อ) and the panel editor. Panels are prefabricated pieces with a
// code, re-used by any assembly; each is checked against the design of an element of the project.
// Assemblies (?view=asm) lay the stock panels out on the faces of an element (components/assembly/AssemblyView).
import clsx from 'clsx'
import { Check, ChevronLeft, Copy, Layers, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AssemblyView } from '@/components/assembly/AssemblyView'
import { MEMBER_SWATCH, PanelDrawing } from '@/components/assembly/PanelDrawing'
import { NumField } from '@/components/design/NumField'
import { ProjectNav } from '@/components/ProjectNav'
import { Button, Empty, Field, Modal, Segmented, Select, StatusBadge } from '@/components/ui'
import { isConflict } from '@/data/conflict'
import { runDesign, TYPE_LABEL } from '@/data/elements'
import { useAssemblies, useElements, usePanels, useProject } from '@/data/hooks'
import { repo, versionOf } from '@/data/repo'
import { type Criteria, DEFAULT_CRITERIA, DEFAULT_PANEL, type FormElement, type FormPanel, type PanelData, type PanelEdge, type SheetLay, type StudDir } from '@/data/types'
import { getSection, PLYWOOD, PLYWOOD_THICKNESS, TIMBER, TIMBER_SECTIONS } from '@/engine'
import { EDGE_LABEL, MEMBER_LABEL, type PanelCheck, panelChecks, panelCodeFor, panelLayout, panelRefTypes, panelStatus } from '@/model/panel'

const EDGES: PanelEdge[] = ['left', 'right', 'top', 'bottom']
const LAY_LABEL: Record<SheetLay, string> = { auto: 'อัตโนมัติ', 'long-width': 'ด้านยาวตามกว้าง', 'long-height': 'ด้านยาวตามสูง' }
const CHECK_STYLE: Record<PanelCheck['status'], string> = { ok: 'text-ok', warn: 'text-warn', fail: 'text-fail', info: 'text-muted' }
const CHECK_MARK: Record<PanelCheck['status'], string> = { ok: '✓', warn: '!', fail: '✕', info: 'i' }

/** the panel's data fields, without the stored id / timestamps */
const dataOf = (p: FormPanel): PanelData => ({
  code: p.code,
  name: p.name ?? '',
  width: p.width,
  height: p.height,
  plywood: { ...DEFAULT_PANEL.plywood, ...p.plywood },
  stud: { ...DEFAULT_PANEL.stud, ...p.stud },
  edges: { ...DEFAULT_PANEL.edges, ...p.edges },
  stock: p.stock ?? 0,
  note: p.note ?? '',
  ...(p.refElementId ? { refElementId: p.refElementId } : {}),
})

function useChecks(p: PanelData | undefined, elements: FormElement[] | undefined, criteria: Criteria) {
  return useMemo(() => {
    if (!p) return undefined
    try {
      const layout = panelLayout(p)
      const el = elements?.find((e) => e.id === p.refElementId)
      let ref
      try {
        ref = el ? { el, run: runDesign(el, criteria) } : undefined
      } catch {
        ref = undefined
      }
      const checks = panelChecks(p, layout, ref, criteria)
      return { layout, checks, status: panelStatus(checks), ref: el }
    } catch {
      return undefined
    }
  }, [p, elements, criteria])
}

export function AssemblyPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const panels = usePanels(projectId)
  const assemblies = useAssemblies(projectId)
  const [params, setParams] = useSearchParams()
  const { can } = useAuth()
  const canEdit = can('element.edit')
  const criteria: Criteria = useMemo(() => ({ ...DEFAULT_CRITERIA, ...project?.criteria }), [project?.criteria])
  const [busy, setBusy] = useState(false)

  const selectedId = params.get('panel') ?? panels?.[0]?.id
  const selected = panels?.find((p) => p.id === selectedId)
  const select = (id: string) => setParams({ panel: id }, { replace: true })
  const view = params.get('view') === 'asm' ? 'asm' : 'panels'

  if (project === undefined || elements === undefined || panels === undefined || assemblies === undefined)
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!project) return <p className="p-10 text-center text-muted">ไม่พบโครงการ</p>

  const create = async (from?: PanelData) => {
    if (!canEdit || busy) return
    setBusy(true)
    try {
      const base = from ?? DEFAULT_PANEL
      const code = panelCodeFor(base.width, base.height, panels.map((p) => p.code))
      const id = await repo.createPanel(project.id, { ...base, code, stock: from ? base.stock : 0 })
      select(id)
    } finally {
      setBusy(false)
    }
  }

  const totalStock = panels.reduce((a, p) => a + (p.stock ?? 0), 0)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-6 sm:px-8">
      <Link to={`/projects/${project.id}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> {project.name}
      </Link>
      <ProjectNav projectId={project.id} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs text-muted">
            <span className="num">{project.projectNo}</span> · Rev {project.revision}
          </p>
          <h1 className="text-2xl font-bold">Form Assembly — {view === 'asm' ? 'ชุดประกอบแบบหล่อ' : 'คลังแผงแบบหล่อ'}</h1>
          <p className="text-sm text-muted">สร้างแผงสำเร็จรูปพร้อมรหัส เก็บเป็นสต็อก แล้วนำไปประกอบเป็นชุดแบบหล่อของชิ้นงานต่าง ๆ</p>
        </div>
        <div className="ml-auto flex gap-2">
          {canEdit && view === 'panels' && (
            <Button variant="primary" onClick={() => create()} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} สร้างแผง
            </Button>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="ส่วนของ Form Assembly" className="flex w-fit flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-[13px]">
        {(
          [
            ['panels', `คลังแผง (${panels.length} แบบ · ${totalStock} แผง)`],
            ['asm', `ชุดประกอบ (${assemblies.length})`],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setParams(v === 'asm' ? { view: 'asm' } : {}, { replace: true })} className={clsx('h-8 rounded-md px-3', view === v ? 'bg-white font-semibold shadow-sm' : 'text-slate-600 hover:text-ink')}>
            {label}
          </button>
        ))}
        <span className="h-8 px-3 leading-8 text-slate-400" title="เฟส 4">สรุปการใช้แผง — เร็ว ๆ นี้</span>
      </div>

      {view === 'asm' ? (
        <AssemblyView
          projectId={project.id}
          elements={elements}
          panels={panels}
          assemblies={assemblies}
          criteria={criteria}
          canEdit={canEdit}
          selectedId={params.get('asm') ?? undefined}
          onSelect={(id) => setParams(id ? { view: 'asm', asm: id } : { view: 'asm' }, { replace: true })}
        />
      ) : panels.length === 0 ? (
        <section className="card">
          <Empty icon={<Layers size={22} />} title="ยังไม่มีแผงในคลัง">
            <p className="max-w-md text-sm text-muted">เริ่มจากแผงมาตรฐาน 2.40 × 1.20 ม. (ไม้อัดเต็มแผ่น) แล้วปรับขนาด เคร่า และเคร่าปิดขอบได้</p>
            {canEdit && (
              <Button variant="primary" onClick={() => create()} disabled={busy}>
                <Plus size={16} /> สร้างแผงแรก
              </Button>
            )}
          </Empty>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <PanelList panels={panels} elements={elements} criteria={criteria} selectedId={selected?.id} onSelect={select} />
          {selected ? (
            <PanelEditor
              key={selected.id}
              panel={selected}
              panels={panels}
              elements={elements}
              criteria={criteria}
              canEdit={canEdit}
              onDuplicate={(d) => create(d)}
              onDeleted={() => setParams({}, { replace: true })}
            />
          ) : (
            <p className="card p-10 text-center text-muted">เลือกแผงจากรายการ</p>
          )}
        </div>
      )}
    </div>
  )
}

function PanelList({ panels, elements, criteria, selectedId, onSelect }: { panels: FormPanel[]; elements: FormElement[]; criteria: Criteria; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <section className="card h-fit overflow-hidden" aria-label="รายการแผง">
      <ul className="divide-y divide-line">
        {panels.map((p) => (
          <PanelRow key={p.id} panel={p} elements={elements} criteria={criteria} active={p.id === selectedId} onSelect={() => onSelect(p.id)} />
        ))}
      </ul>
    </section>
  )
}

function PanelRow({ panel, elements, criteria, active, onSelect }: { panel: FormPanel; elements: FormElement[]; criteria: Criteria; active: boolean; onSelect: () => void }) {
  const data = useMemo(() => dataOf(panel), [panel])
  const r = useChecks(data, elements, criteria)
  const sec = getSection(data.stud.sectionId)
  return (
    <li>
      <button type="button" onClick={onSelect} aria-current={active ? 'true' : undefined} className={clsx('flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50', active && 'bg-blue-50 ring-1 ring-inset ring-sel')}>
        <div className="flex h-12 w-16 shrink-0 items-center justify-center">{r && <PanelDrawing panel={data} layout={r.layout} compact className="max-h-12" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="num font-semibold">{data.code}</span>
            {r && <StatusBadge status={r.status} />}
          </div>
          <div className="num text-xs text-slate-600">
            {data.width.toFixed(2)} × {data.height.toFixed(2)} ม.
          </div>
          <div className="truncate text-xs text-muted">
            {sec.label} @{data.stud.spacingCm} · สต็อก {data.stock}
          </div>
        </div>
      </button>
    </li>
  )
}

function PanelEditor({
  panel,
  panels,
  elements,
  criteria,
  canEdit,
  onDuplicate,
  onDeleted,
}: {
  panel: FormPanel
  panels: FormPanel[]
  elements: FormElement[]
  criteria: Criteria
  canEdit: boolean
  onDuplicate: (d: PanelData) => void
  onDeleted: () => void
}) {
  const [draft, setDraft] = useState<PanelData>(() => dataOf(panel))
  const base = useRef({ json: JSON.stringify(dataOf(panel)), version: versionOf(panel) })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const [remoteChanged, setRemoteChanged] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = JSON.stringify(draft) !== base.current.json

  // realtime: follow the stored panel while nothing is unsaved here; otherwise keep the edits and warn
  useEffect(() => {
    const remote = dataOf(panel)
    const json = JSON.stringify(remote)
    if (json === base.current.json) {
      base.current.version = versionOf(panel)
      return
    }
    if (!dirty) {
      base.current = { json, version: versionOf(panel) }
      setDraft(remote)
    } else setRemoteChanged(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel])

  const r = useChecks(draft, elements, criteria)
  const codeTaken = panels.some((p) => p.id !== panel.id && p.code.trim().toLowerCase() === draft.code.trim().toLowerCase())
  const sizeOk = draft.width >= 0.05 && draft.height >= 0.05 && draft.width <= 6 && draft.height <= 6
  const valid = draft.code.trim() !== '' && !codeTaken && sizeOk

  const set = (p: Partial<PanelData>) => {
    setDraft((d) => {
      const next = { ...d, ...p }
      // a code still as suggested from the size follows a new size
      const others = panels.filter((x) => x.id !== panel.id).map((x) => x.code)
      if ((p.width !== undefined || p.height !== undefined) && d.code === panelCodeFor(d.width, d.height, others)) next.code = panelCodeFor(next.width, next.height, others)
      return next
    })
    if (state !== 'conflict') setState('idle')
  }
  const save = async (force = false) => {
    if (!canEdit || !valid || state === 'saving') return
    setState('saving')
    try {
      const data = { ...draft, code: draft.code.trim() }
      const version = await repo.updatePanel(panel.projectId, panel.id, data, force ? undefined : base.current.version, force)
      base.current = { json: JSON.stringify(data), version }
      setDraft(data)
      setRemoteChanged(false)
      setState('saved')
    } catch (e) {
      setState(isConflict(e) ? 'conflict' : 'error')
    }
  }
  const reload = () => {
    base.current = { json: JSON.stringify(dataOf(panel)), version: versionOf(panel) }
    setDraft(dataOf(panel))
    setRemoteChanged(false)
    setState('idle')
  }
  const remove = async () => {
    setConfirmDelete(false)
    await repo.deletePanel(panel.projectId, panel.id)
    onDeleted()
  }

  const refOptions = elements.filter((e) => panelRefTypes.has(e.type))
  const ro = !canEdit

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={`แผง ${draft.code}`}>
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="num text-xl font-bold">{draft.code || '—'}</h2>
            {r && <StatusBadge status={r.status} />}
            {dirty && <span className="text-xs text-warn">ยังไม่บันทึก</span>}
          </div>
          <p className="text-sm text-muted">{draft.name || 'แผงแบบหล่อ'}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button variant="ghost" onClick={() => onDuplicate(draft)} title="สร้างแผงใหม่จากแผงนี้">
                <Copy size={16} /> ทำสำเนา
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} /> ลบ
              </Button>
              <Button variant="primary" onClick={() => save()} disabled={!valid || state === 'saving' || state === 'conflict' || (!dirty && state !== 'error')}>
                {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : state === 'saved' && !dirty ? <Check size={16} /> : <Save size={16} />}
                {state === 'saved' && !dirty ? 'บันทึกแล้ว' : 'บันทึก'}
              </Button>
            </>
          )}
        </div>
        {state === 'error' && <p className="w-full text-sm text-fail">บันทึกไม่สำเร็จ</p>}
        {ro && <p className="w-full text-sm text-muted">ดูอย่างเดียว — การแก้ไขแผงต้องมีสิทธิ์ออกแบบชิ้นส่วน</p>}
        {(remoteChanged || state === 'conflict') && (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn ring-1 ring-amber-200" role="alert">
            มีผู้อื่นบันทึกแผงนี้ระหว่างที่คุณแก้ไข — ค่าที่คุณกรอกยังอยู่
            <span className="ml-auto flex gap-3">
              <button type="button" className="font-medium underline" onClick={reload}>
                โหลดของผู้อื่น
              </button>
              {canEdit && (
                <button type="button" className="font-medium underline" onClick={() => save(true)}>
                  บันทึกของฉันทับ
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="font-medium text-ink">รูปด้านแผง (มองจากด้านเคร่า)</span>
          {(['stud', 'edge', 'cap', 'block'] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={clsx('size-2.5 rounded-sm', MEMBER_SWATCH[k])} />
              {MEMBER_LABEL[k]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t border-dashed border-red-600" /> รอยต่อไม้อัด
          </span>
        </div>
        {r && sizeOk ? <PanelDrawing panel={draft} layout={r.layout} className="max-h-[420px]" /> : <p className="py-16 text-center text-sm text-muted">ขนาดแผง 0.05–6.00 ม.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <fieldset disabled={ro} className="card flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="รหัสแผง" error={codeTaken ? 'รหัสนี้ใช้แล้ว' : draft.code.trim() === '' ? 'กรอกรหัส' : undefined}>
              <input className="input num" value={draft.code} onChange={(e) => set({ code: e.target.value })} />
            </Field>
            <NumField label="จำนวนในสต็อก" unit="แผง" value={draft.stock} min={0} onChange={(v) => set({ stock: Math.round(v ?? 0) })} />
          </div>
          <Field label="ชื่อ / คำอธิบาย">
            <input className="input" value={draft.name} placeholder="แผงมาตรฐานด้านข้างฐานราก" onChange={(e) => set({ name: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <NumField label="กว้าง" unit="ม." value={draft.width} min={0.05} max={6} onChange={(v) => v !== undefined && set({ width: v })} />
            <NumField label="สูง" unit="ม." value={draft.height} min={0.05} max={6} onChange={(v) => v !== undefined && set({ height: v })} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              [2.4, 1.2],
              [1.2, 2.4],
              [2.0, 1.2],
              [0.2, 1.2],
            ].map(([w, h]) => (
              <button key={`${w}x${h}`} type="button" className="num rounded-md border border-line px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => set({ width: w, height: h })}>
                {w.toFixed(2)}×{h.toFixed(2)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ไม้อัด">
              <Select value={draft.plywood.materialId} onChange={(e) => set({ plywood: { ...draft.plywood, materialId: e.target.value } })}>
                {PLYWOOD.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ความหนา">
              <Select value={draft.plywood.thicknessMm} onChange={(e) => set({ plywood: { ...draft.plywood, thicknessMm: Number(e.target.value) } })}>
                {PLYWOOD_THICKNESS.map((t) => (
                  <option key={t} value={t}>
                    {t} มม.
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="วางแผ่นไม้อัด (1.22 × 2.44)">
            <Segmented<SheetLay> label="วางแผ่นไม้อัด" value={draft.plywood.lay} onChange={(lay) => set({ plywood: { ...draft.plywood, lay } })} options={(['auto', 'long-width', 'long-height'] as const).map((v) => ({ value: v, label: LAY_LABEL[v] }))} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เคร่า">
              <Select value={draft.stud.sectionId} onChange={(e) => set({ stud: { ...draft.stud, sectionId: e.target.value } })}>
                {TIMBER_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    ไม้ {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ชนิดไม้">
              <Select value={draft.stud.materialId} onChange={(e) => set({ stud: { ...draft.stud, materialId: e.target.value } })}>
                {TIMBER.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="แนวเคร่า">
              <Segmented<StudDir> label="แนวเคร่า" value={draft.stud.dir} onChange={(dir) => set({ stud: { ...draft.stud, dir } })} options={[{ value: 'vertical', label: 'ตั้ง' }, { value: 'horizontal', label: 'นอน' }]} />
            </Field>
            <NumField label="ระยะเคร่าไม่เกิน" unit="ซม." value={draft.stud.spacingCm} min={10} max={120} onChange={(v) => v !== undefined && set({ stud: { ...draft.stud, spacingCm: v } })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-slate-700">เคร่าปิดขอบ</span>
            <div className="grid grid-cols-4 gap-1.5">
              {EDGES.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={draft.edges[e]}
                  onClick={() => set({ edges: { ...draft.edges, [e]: !draft.edges[e] } })}
                  className={clsx('h-9 rounded-lg border text-sm', draft.edges[e] ? 'border-sel bg-blue-50 font-medium text-sel' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
                >
                  ปิด{EDGE_LABEL[e]}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">ด้านขนานกับเคร่าใช้เคร่าเป็นขอบ ด้านขวางเคร่าใช้เคร่านอนปิดหัว/ท้าย (เคร่าตั้งสั้นลง)</span>
          </div>

          <Field label="ตรวจกับผลคำนวณของชิ้นงาน" hint="ใช้แรงดันคอนกรีตและเคร่าที่ออกแบบของชิ้นงานนั้น">
            <Select value={draft.refElementId ?? ''} onChange={(e) => set({ refElementId: e.target.value || undefined })}>
              <option value="">— ไม่ตรวจ —</option>
              {refOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} · {TYPE_LABEL[e.type]} {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="หมายเหตุ">
            <textarea className="input h-20 py-2" value={draft.note} onChange={(e) => set({ note: e.target.value })} />
          </Field>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-4">
          {r && sizeOk && (
            <div className="flex flex-col gap-4">
              <div className="card p-4">
                <h3 className="mb-2 font-semibold">การตรวจสอบ</h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {r.checks.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={clsx('num w-4 shrink-0 text-center font-bold', CHECK_STYLE[c.status])}>{CHECK_MARK[c.status]}</span>
                      <span>
                        <span className={c.status === 'info' ? 'text-slate-600' : undefined}>{c.label}</span>
                        {c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
                      </span>
                    </li>
                  ))}
                  {!draft.refElementId && <li className="text-xs text-muted">เลือกชิ้นงานในช่อง “ตรวจกับผลคำนวณของชิ้นงาน” เพื่อตรวจไม้อัดและเคร่ากับแรงดันที่คำนวณได้</li>}
                </ul>
              </div>
              <div className="card p-4">
                <h3 className="mb-2 font-semibold">รายการตัดต่อ 1 แผง</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="py-1.5">
                        ไม้อัด {draft.plywood.thicknessMm} มม. ({LAY_LABEL[r.layout.lay]})
                      </td>
                      <td className="num py-1.5 text-right">{r.layout.ply.length} ชิ้น</td>
                    </tr>
                    {r.layout.cuts.map((c) => (
                      <tr key={`${c.kind}${c.length}`}>
                        <td className="py-1.5">
                          {MEMBER_LABEL[c.kind]} {getSection(draft.stud.sectionId).label} ยาว <span className="num">{c.length.toFixed(2)}</span> ม.
                        </td>
                        <td className="num py-1.5 text-right">{c.qty} ท่อน</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-muted">ความหนาแผง</dt>
                    <dd className="num text-base font-semibold">{(r.layout.thickness * 100).toFixed(1)} ซม.</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-muted">น้ำหนักโดยประมาณ</dt>
                    <dd className="num text-base font-semibold">{r.layout.weightKg.toFixed(0)} กก.</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`ลบแผง ${panel.code}?`}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>ยกเลิก</Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 size={16} /> ลบแผง
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">แผงนี้จะถูกลบออกจากคลังของโครงการ</p>
      </Modal>
    </section>
  )
}
