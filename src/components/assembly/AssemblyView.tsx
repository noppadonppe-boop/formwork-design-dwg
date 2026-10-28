// Form Assembly — assemblies: panels from the stock laid out on the four faces of a footing, with automatic layout,
// drag-to-reorder, the plan and face elevations, and the checks against the footing design.
import clsx from 'clsx'
import { Check, Layers, Loader2, Minus, Plus, Save, Trash2, Wand2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Empty, Field, Modal, Segmented, Select, StatusBadge, Toggle } from '@/components/ui'
import { isConflict } from '@/data/conflict'
import { elementSize, runDesign } from '@/data/elements'
import { repo, versionOf } from '@/data/repo'
import { type AssemblyData, type Criteria, emptyFaces, FACE_KEYS, type FaceKey, type FaceLayout, type FormAssembly, type FormElement, type FormPanel } from '@/data/types'
import { analyzeAssembly, autoFace, FACE_LABEL, faceLayoutOf, faceSpecs, type FillerAt, fillerLike } from '@/model/assembly'
import { assembly3d } from '@/model/assembly3d'
import { type PanelCheck, panelCodeFor } from '@/model/panel'
import { FaceElevation, PlanView, type Slot } from './FaceViews'

const Assembly3D = lazy(() => import('./Assembly3D'))

const CHECK_STYLE: Record<PanelCheck['status'], string> = { ok: 'text-ok', warn: 'text-warn', fail: 'text-fail', info: 'text-muted' }
const CHECK_MARK: Record<PanelCheck['status'], string> = { ok: '✓', warn: '!', fail: '✕', info: 'i' }
const FILLER_LABEL: Record<FillerAt, string> = { middle: 'ตรงกลาง', left: 'ซ้าย', right: 'ขวา' }

const dataOf = (a: FormAssembly): AssemblyData => ({
  code: a.code,
  name: a.name ?? '',
  elementId: a.elementId,
  through: a.through ?? 'x',
  linked: a.linked ?? true,
  faces: { ...emptyFaces(), ...a.faces },
  note: a.note ?? '',
})

const footings = (els: FormElement[]) => els.filter((e) => e.type === 'footing')

/** auto layout of every face (A and B only when linked) */
function autoAll(a: AssemblyData, el: FormElement, panels: FormPanel[], opts: { filler: FillerAt; stagger: boolean }) {
  if (el.type !== 'footing') return { faces: a.faces, missing: [] as { key: FaceKey; width: number; height: number }[] }
  const keys = a.linked ? (['A', 'B'] as FaceKey[]) : FACE_KEYS
  // inner faces first: the through faces' length depends on the panels at their ends
  const order = [...keys].sort((x, y) => Number(a.through === (x === 'A' || x === 'C' ? 'x' : 'y')) - Number(a.through === (y === 'A' || y === 'C' ? 'x' : 'y')))
  const faces = { ...a.faces }
  const missing: { key: FaceKey; width: number; height: number }[] = []
  for (const k of order) {
    const spec = faceSpecs(el.input, { ...a, faces }, new Map(panels.map((p) => [p.id, p])))[k]
    const r = autoFace(spec, panels, opts)
    faces[k] = r.layout
    if (r.missing) missing.push({ key: k, ...r.missing })
  }
  return { faces, missing }
}

export function AssemblyView({ projectId, elements, panels, assemblies, criteria, canEdit, selectedId, onSelect }: { projectId: string; elements: FormElement[]; panels: FormPanel[]; assemblies: FormAssembly[]; criteria: Criteria; canEdit: boolean; selectedId?: string; onSelect: (id: string | undefined) => void }) {
  const [creating, setCreating] = useState(false)
  const [elId, setElId] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = assemblies.find((a) => a.id === selectedId) ?? assemblies[0]
  const candidates = footings(elements)

  const create = async () => {
    const el = elements.find((e) => e.id === elId)
    if (!el || el.type !== 'footing' || busy) return
    setBusy(true)
    try {
      const base: AssemblyData = { code: '', name: el.name, elementId: el.id, through: el.input.lengthX >= el.input.lengthY ? 'x' : 'y', linked: true, faces: emptyFaces(), note: '' }
      const { faces } = autoAll(base, el, panels, { filler: 'middle', stagger: false })
      const code = `ASM-${el.code}`
      const taken = assemblies.map((a) => a.code)
      const unique = taken.includes(code) ? `${code}-${taken.filter((c) => c.startsWith(code)).length + 1}` : code
      const id = await repo.createAssembly(projectId, { ...base, code: unique, faces })
      setCreating(false)
      onSelect(id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {assemblies.length === 0 ? (
        <section className="card">
          <Empty icon={<Layers size={22} />} title="ยังไม่มีชุดประกอบ">
            <p className="max-w-md text-sm text-muted">เลือกฐานรากที่ออกแบบแล้ว ระบบจะนำแผงจากคลังมาจัดลงทั้ง 4 ด้านให้ แล้วปรับเองได้</p>
            {canEdit && (
              <Button variant="primary" onClick={() => setCreating(true)} disabled={!candidates.length || !panels.length}>
                <Plus size={16} /> สร้างชุดประกอบ
              </Button>
            )}
            {!candidates.length && <p className="text-xs text-muted">ยังไม่มีฐานรากในโครงการ (ชุดประกอบของผนัง เสา คาน จะตามมาในเฟสถัดไป)</p>}
            {!!candidates.length && !panels.length && <p className="text-xs text-muted">สร้างแผงในคลังก่อน</p>}
          </Empty>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <section className="card h-fit overflow-hidden" aria-label="รายการชุดประกอบ">
            <ul className="divide-y divide-line">
              {assemblies.map((a) => {
                const el = elements.find((e) => e.id === a.elementId)
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => onSelect(a.id)} aria-current={a.id === selected?.id ? 'true' : undefined} className={clsx('w-full px-3 py-2.5 text-left hover:bg-slate-50', a.id === selected?.id && 'bg-blue-50 ring-1 ring-inset ring-sel')}>
                      <div className="num font-semibold">{a.code}</div>
                      <div className="truncate text-xs text-muted">{el ? `${el.code} · ${elementSize(el)}` : 'ไม่พบชิ้นงาน'}</div>
                    </button>
                  </li>
                )
              })}
            </ul>
            {canEdit && (
              <div className="border-t border-line p-2">
                <Button variant="ghost" className="w-full" onClick={() => setCreating(true)} disabled={!candidates.length || !panels.length}>
                  <Plus size={16} /> สร้างชุดประกอบ
                </Button>
              </div>
            )}
          </section>
          {selected && <AssemblyEditor key={selected.id} assembly={selected} elements={elements} panels={panels} criteria={criteria} canEdit={canEdit} projectId={projectId} onDeleted={() => onSelect(undefined)} />}
        </div>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="สร้างชุดประกอบ"
        footer={
          <>
            <Button onClick={() => setCreating(false)}>ยกเลิก</Button>
            <Button variant="primary" onClick={create} disabled={!elId || busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} สร้างและจัดอัตโนมัติ
            </Button>
          </>
        }
      >
        <Field label="ชิ้นงาน" hint="ตอนนี้รองรับฐานราก (4 ด้าน)">
          <Select value={elId} onChange={(e) => setElId(e.target.value)}>
            <option value="">— เลือกฐานราก —</option>
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} · {elementSize(e)}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </>
  )
}

function AssemblyEditor({ assembly, elements, panels, criteria, canEdit, projectId, onDeleted }: { assembly: FormAssembly; elements: FormElement[]; panels: FormPanel[]; criteria: Criteria; canEdit: boolean; projectId: string; onDeleted: () => void }) {
  const [draft, setDraft] = useState<AssemblyData>(() => dataOf(assembly))
  const base = useRef({ json: JSON.stringify(dataOf(assembly)), version: versionOf(assembly) })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const [remoteChanged, setRemoteChanged] = useState(false)
  const [face, setFace] = useState<FaceKey>('A')
  const [slot, setSlot] = useState<Slot>()
  const [filler, setFiller] = useState<FillerAt>('middle')
  const [stagger, setStagger] = useState(false)
  const [missing, setMissing] = useState<{ key: FaceKey; width: number; height: number }[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [making, setMaking] = useState(false)
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const dirty = JSON.stringify(draft) !== base.current.json

  useEffect(() => {
    const remote = dataOf(assembly)
    const json = JSON.stringify(remote)
    if (json === base.current.json) {
      base.current.version = versionOf(assembly)
      return
    }
    if (!dirty) {
      base.current = { json, version: versionOf(assembly) }
      setDraft(remote)
    } else setRemoteChanged(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assembly])

  const el = elements.find((e) => e.id === draft.elementId)
  const run = useMemo(() => {
    try {
      return el ? runDesign(el, criteria) : undefined
    } catch {
      return undefined
    }
  }, [el, criteria])
  const r = useMemo(() => (el?.type === 'footing' ? analyzeAssembly(draft, el.input, run, panels, el, criteria) : undefined), [draft, el, run, panels, criteria])
  const model3d = useMemo(() => (view === '3d' && r && el?.type === 'footing' ? assembly3d(r, el.input, draft.through) : undefined), [view, r, el, draft.through])

  const set = (p: Partial<AssemblyData>) => {
    setDraft((d) => ({ ...d, ...p }))
    if (state !== 'conflict') setState('idle')
  }
  const save = async (force = false) => {
    if (!canEdit || state === 'saving' || !draft.code.trim()) return
    setState('saving')
    try {
      const data = { ...draft, code: draft.code.trim() }
      const version = await repo.updateAssembly(projectId, assembly.id, data, force ? undefined : base.current.version, force)
      base.current = { json: JSON.stringify(data), version }
      setDraft(data)
      setRemoteChanged(false)
      setState('saved')
    } catch (e) {
      setState(isConflict(e) ? 'conflict' : 'error')
    }
  }
  const reload = () => {
    base.current = { json: JSON.stringify(dataOf(assembly)), version: versionOf(assembly) }
    setDraft(dataOf(assembly))
    setRemoteChanged(false)
    setState('idle')
  }

  if (!el || el.type !== 'footing' || !r)
    return (
      <div className="card p-6 text-sm text-muted">
        ไม่พบฐานรากของชุดประกอบนี้ (อาจถูกลบไปแล้ว)
        {canEdit && (
          <Button variant="danger" className="ml-3" onClick={() => repo.deleteAssembly(projectId, assembly.id).then(onDeleted)}>
            <Trash2 size={16} /> ลบชุดประกอบ
          </Button>
        )}
      </div>
    )

  // the face being edited: C and D edit A and B when linked
  const editKey: FaceKey = draft.linked && face === 'C' ? 'A' : draft.linked && face === 'D' ? 'B' : face
  const mirrored = editKey !== face
  const layout = faceLayoutOf(draft, face)
  const fr = r.faces[face]
  const ro = !canEdit || mirrored
  const setLayout = (f: FaceLayout) => set({ faces: { ...draft.faces, [editKey]: f } })
  const courses = layout.courses
  const targetCourse = slot ? slot.course : Math.max(courses.length - 1, 0)

  const runAuto = (only?: FaceKey) => {
    const res = autoAll(only ? { ...draft, linked: false } : draft, el, panels, { filler, stagger })
    if (only) {
      set({ faces: { ...draft.faces, [only]: res.faces[only] } })
      setMissing((m) => [...m.filter((x) => x.key !== only), ...res.missing.filter((x) => x.key === only)])
    } else {
      set({ faces: res.faces })
      setMissing(res.missing)
    }
    setSlot(undefined)
  }
  const move = (course: number, from: number, to: number) => {
    const row = [...courses[course].panels]
    const [id] = row.splice(from, 1)
    row.splice(to, 0, id)
    setLayout({ courses: courses.map((c, i) => (i === course ? { panels: row } : c)) })
  }
  const add = (id: string) => {
    const cs = courses.length ? courses.map((c) => ({ panels: [...c.panels] })) : [{ panels: [] as string[] }]
    const ci = Math.min(targetCourse, cs.length - 1)
    const at = slot ? slot.index + 1 : cs[ci].panels.length
    cs[ci].panels.splice(at, 0, id)
    setLayout({ courses: cs })
    setSlot({ course: ci, index: at })
  }
  const removeSlot = () => {
    if (!slot) return
    setLayout({ courses: courses.map((c, i) => (i === slot.course ? { panels: c.panels.filter((_, j) => j !== slot.index) } : c)) })
    setSlot(undefined)
  }
  const addCourse = () => setLayout({ courses: [...courses, { panels: courses.length ? [...courses[courses.length - 1].panels] : [] }] })
  const dropCourse = () => {
    setLayout({ courses: courses.slice(0, -1) })
    setSlot(undefined)
  }
  /** make the missing filler like the main panel of the face and put it into every course */
  const makeFiller = async (m: { key: FaceKey; width: number; height: number }) => {
    const ids = faceLayoutOf(draft, m.key).courses.flatMap((c) => c.panels)
    const like = panels.find((p) => ids.includes(p.id) && Math.abs(p.height - m.height) < 0.005) ?? panels.find((p) => Math.abs(p.height - m.height) < 0.005) ?? panels[0]
    if (!like) return
    setMaking(true)
    try {
      const data = fillerLike(like, m.width)
      const id = await repo.createPanel(projectId, { ...data, code: panelCodeFor(data.width, data.height, panels.map((p) => p.code)), refElementId: el.id })
      const f = faceLayoutOf(draft, m.key)
      const cs = f.courses.map((c) => {
        const at = filler === 'left' ? 0 : filler === 'right' ? c.panels.length : Math.ceil(c.panels.length / 2)
        const row = [...c.panels]
        row.splice(at, 0, id)
        return { panels: row }
      })
      set({ faces: { ...draft.faces, [m.key]: { courses: cs } } })
      setMissing((x) => x.filter((y) => y !== m))
    } finally {
      setMaking(false)
    }
  }

  const courseH = r.faces[editKey].courses[Math.min(targetCourse, courses.length - 1)]?.h
  const fit = (p: FormPanel) => !courseH || Math.abs(p.height - courseH) < 0.005
  const selectedPanel = slot ? panels.find((p) => p.id === courses[slot.course]?.panels[slot.index]) : undefined

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={`ชุดประกอบ ${draft.code}`}>
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <input className="num w-40 rounded-md border border-transparent px-1 text-xl font-bold hover:border-line focus:border-sel focus:outline-none" value={draft.code} disabled={!canEdit} onChange={(e) => set({ code: e.target.value })} aria-label="รหัสชุดประกอบ" />
            <StatusBadge status={r.status} />
            {dirty && <span className="text-xs text-warn">ยังไม่บันทึก</span>}
          </div>
          <p className="text-sm text-muted">
            {el.code} ฐานราก · {elementSize(el)} · สูงเท {el.input.height.toFixed(2)} ม.
          </p>
        </div>
        {canEdit && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> ลบ
            </Button>
            <Button variant="primary" onClick={() => save()} disabled={!draft.code.trim() || state === 'saving' || state === 'conflict' || (!dirty && state !== 'error')}>
              {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : state === 'saved' && !dirty ? <Check size={16} /> : <Save size={16} />}
              {state === 'saved' && !dirty ? 'บันทึกแล้ว' : 'บันทึก'}
            </Button>
          </div>
        )}
        {state === 'error' && <p className="w-full text-sm text-fail">บันทึกไม่สำเร็จ</p>}
        {(remoteChanged || state === 'conflict') && (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn ring-1 ring-amber-200" role="alert">
            มีผู้อื่นบันทึกชุดประกอบนี้ระหว่างที่คุณแก้ไข — ค่าที่คุณแก้ยังอยู่
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

      <fieldset disabled={!canEdit} className="card grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="ด้านที่วิ่งทะลุมุม" hint="อีกคู่หนึ่งอยู่ระหว่างด้านที่ทะลุ (ยาวพอดีคอนกรีต)">
          <Segmented<'x' | 'y'>
            label="ด้านที่วิ่งทะลุมุม"
            value={draft.through}
            onChange={(through) => set({ through })}
            options={[
              { value: 'x', label: `A/C (${el.input.lengthX.toFixed(2)})` },
              { value: 'y', label: `B/D (${el.input.lengthY.toFixed(2)})` },
            ]}
          />
        </Field>
        <div className="flex flex-col justify-end">
          <Toggle checked={draft.linked} onChange={(linked) => set({ linked, faces: linked ? draft.faces : { ...draft.faces, C: draft.faces.A, D: draft.faces.B } })} label="ด้านตรงข้ามเหมือนกัน (C = A, D = B)" />
        </div>
        <Field label="แผงเสริมไว้ที่">
          <Segmented<FillerAt> label="แผงเสริมไว้ที่" value={filler} onChange={setFiller} options={(['middle', 'left', 'right'] as const).map((v) => ({ value: v, label: FILLER_LABEL[v] }))} />
        </Field>
        <div className="flex flex-col justify-end gap-2">
          <Toggle checked={stagger} onChange={setStagger} label="ชั้นบนกลับด้าน (รอยต่อสลับ)" />
          <Button variant="soft" onClick={() => runAuto()}>
            <Wand2 size={16} /> จัดอัตโนมัติทุกด้าน
          </Button>
        </div>
      </fieldset>

      {missing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn ring-1 ring-amber-200" role="alert">
          {missing.map((m) => (
            <div key={m.key} className="flex flex-wrap items-center gap-2">
              ด้าน {m.key}: แผงในคลังต่อได้ไม่พอดี — ขาดอีก <span className="num font-semibold">{m.width.toFixed(2)}</span> ม. ต่อชั้น
              {canEdit && (
                <Button variant="secondary" className="ml-auto h-8" onClick={() => makeFiller(m)} disabled={making}>
                  {making ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} สร้างแผงเสริม {m.width.toFixed(2)} × {m.height.toFixed(2)} แล้วใส่ให้
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="card p-3">
            <p className="mb-1 text-xs text-muted">ผัง — คลิกเลือกด้าน (สีเข้ม = วิ่งทะลุมุม)</p>
            <PlanView specs={r.specs} lx={el.input.lengthX} ly={el.input.lengthY} selected={face} onSelect={(k) => (setFace(k), setSlot(undefined))} />
          </div>
          <div className="card p-3">
            <h3 className="mb-2 text-sm font-semibold">แผงที่ใช้ต่อ 1 ชุด</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-1 text-left font-normal">แผง</th>
                  <th className="pb-1 text-right font-normal">ใช้</th>
                  <th className="pb-1 text-right font-normal">สต็อก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.usage.map((u) => (
                  <tr key={u.panel.id}>
                    <td className="num py-1">
                      <span className={clsx('mr-1.5 inline-block size-2 rounded-full', u.status === 'ok' ? 'bg-ok' : u.status === 'warn' ? 'bg-warn' : 'bg-fail')} />
                      {u.panel.code}
                    </td>
                    <td className="num py-1 text-right">{u.used}</td>
                    <td className={clsx('num py-1 text-right', u.used > (u.panel.stock ?? 0) && 'font-semibold text-fail')}>{u.panel.stock ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.usage.some((u) => u.used > (u.panel.stock ?? 0)) && <p className="mt-2 text-xs text-fail">สต็อกไม่พอ — เพิ่มจำนวนในคลังแผง</p>}
          </div>
          {r.wales.length > 0 && (
            <div className="card p-3">
              <h3 className="mb-2 text-sm font-semibold">คานรับเคร่า (ตามที่ออกแบบ)</h3>
              <ul className="text-sm">
                {r.wales.map((w, i) => (
                  <li key={i} className="flex justify-between py-0.5">
                    <span>ด้าน {w.axis === 'x' ? 'A/C' : 'B/D'} ยาว <span className="num">{w.length.toFixed(2)}</span> ม.</span>
                    <span className="num">{w.count} ท่อน</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Segmented<'2d' | '3d'> label="มุมมอง" value={view} onChange={setView} options={[{ value: '2d', label: 'รูปด้าน 2D (จัดแผง)' }, { value: '3d', label: '3D · ลำดับการประกอบ' }]} />
          {view === '3d' && model3d && (
            <div className="card p-4">
              <Suspense fallback={<div className="flex h-[380px] items-center justify-center text-muted"><Loader2 className="animate-spin" aria-label="กำลังโหลด 3D" /></div>}>
                <Assembly3D model={model3d} selected={slot ? { face: editKey, ...slot } : undefined} onPick={(p) => (p ? (setFace(p.face), setSlot({ course: p.course, index: p.index })) : setSlot(undefined))} />
              </Suspense>
              {selectedPanel && slot && (
                <p className="mt-3 text-sm">
                  เลือก <span className="num font-semibold">{selectedPanel.code}</span> · {FACE_LABEL[face]} ชั้นที่ {slot.course + 1} ลำดับที่ {slot.index + 1} ·{' '}
                  <button type="button" className="font-medium text-sel underline" onClick={() => setView('2d')}>
                    ดูในรูปด้าน
                  </button>
                </p>
              )}
            </div>
          )}
          <div className={clsx('card p-4', view === '3d' && 'hidden')}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="ด้าน" className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
                {FACE_KEYS.map((k) => (
                  <button key={k} type="button" role="tab" aria-selected={face === k} onClick={() => (setFace(k), setSlot(undefined))} className={clsx('h-8 rounded-md px-3 text-[13px]', face === k ? 'bg-white font-semibold shadow-sm' : 'text-slate-600')}>
                    {k} <StatusDot status={r.faces[k].status} />
                  </button>
                ))}
              </div>
              <span className="text-sm">
                {FACE_LABEL[face]} · ยาว <span className="num">{fr.spec.length.toFixed(3)}</span> ม. {fr.spec.through ? '(ทะลุมุม)' : '(อยู่ระหว่างด้านทะลุ)'}
              </span>
              {!ro && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Button variant="ghost" className="h-8 px-2.5" onClick={() => runAuto(editKey)}>
                    <Wand2 size={14} /> จัดด้านนี้
                  </Button>
                  <Button variant="ghost" className="h-8 px-2.5" onClick={addCourse}>
                    <Plus size={14} /> ชั้น
                  </Button>
                  <Button variant="ghost" className="h-8 px-2.5" onClick={dropCourse} disabled={!courses.length}>
                    <Minus size={14} /> ชั้นบนสุด
                  </Button>
                </div>
              )}
            </div>
            {mirrored && <p className="mb-2 text-xs text-muted">ด้าน {face} ใช้แผงเหมือนด้าน {editKey} — ปิด “ด้านตรงข้ามเหมือนกัน” เพื่อจัดแยก</p>}
            <FaceElevation face={fr} editable={!ro} selected={mirrored ? undefined : slot} onSelect={(s) => !mirrored && setSlot(s)} onMove={move} />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-200 ring-1 ring-amber-700" /> แผง
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-orange-200 ring-1 ring-orange-700" /> แผงเสริม
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-4 bg-teal-700" /> คานรับเคร่า
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-violet-700" /> Form tie
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-600" /> tie ใกล้รอยต่อ
              </span>
              {!ro && <span className="ml-auto text-muted">ลากแผงซ้าย–ขวาเพื่อสลับตำแหน่ง</span>}
            </div>
          </div>

          {!ro && view === '2d' && (
            <div className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">วางแผงจากคลัง</h3>
                <span className="text-xs text-muted">{slot ? `แทรกถัดจากแผงที่เลือก (ชั้นที่ ${slot.course + 1})` : courses.length ? `ต่อท้ายชั้นบนสุด (ชั้นที่ ${courses.length})` : 'เริ่มชั้นที่ 1'}</span>
                {slot && selectedPanel && (
                  <Button variant="danger" className="ml-auto h-8 px-2.5" onClick={removeSlot}>
                    <X size={14} /> เอา {selectedPanel.code} ออก
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {panels.map((p) => (
                  <button key={p.id} type="button" onClick={() => add(p.id)} className={clsx('num rounded-md border px-2 py-1 text-xs hover:bg-slate-50', fit(p) ? 'border-slate-300 text-ink' : 'border-dashed border-slate-300 text-slate-400')} title={fit(p) ? undefined : 'สูงไม่เท่าชั้นนี้'}>
                    {p.code} <span className="text-muted">{p.width.toFixed(2)}×{p.height.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">การตรวจสอบ {FACE_LABEL[face]}</h3>
            <CheckList checks={fr.checks} />
            {r.usage.some((u) => u.status !== 'ok') && (
              <p className="mt-3 text-xs text-muted">แผงที่มีจุดสีเหลือง/แดงในตาราง “แผงที่ใช้” — ดูรายละเอียดในคลังแผง (ตรวจกับ {el.code})</p>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`ลบชุดประกอบ ${assembly.code}?`}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>ยกเลิก</Button>
            <Button
              variant="danger"
              onClick={async () => {
                setConfirmDelete(false)
                await repo.deleteAssembly(projectId, assembly.id)
                onDeleted()
              }}
            >
              <Trash2 size={16} /> ลบชุดประกอบ
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">แผงในคลังไม่ถูกลบ</p>
      </Modal>
    </section>
  )
}

function StatusDot({ status }: { status: 'ok' | 'warn' | 'fail' }) {
  return <span className={clsx('ml-0.5 inline-block size-1.5 rounded-full align-middle', status === 'ok' ? 'bg-ok' : status === 'warn' ? 'bg-warn' : 'bg-fail')} aria-hidden />
}

function CheckList({ checks }: { checks: PanelCheck[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {checks.map((c, i) => (
        <li key={i} className="flex gap-2">
          <span className={clsx('num w-4 shrink-0 text-center font-bold', CHECK_STYLE[c.status])}>{CHECK_MARK[c.status]}</span>
          <span>
            {c.label}
            {c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
