// Form Assembly — assemblies: panels from the stock laid out on the faces of a footing, column, wall or beam, with
// automatic layout, drag-to-reorder, the key diagram and face elevations, and the checks against the design.
import clsx from 'clsx'
import { Check, Layers, Loader2, Minus, Plus, Printer, Save, Trash2, Wand2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Field, Modal, Segmented, Select, StatusBadge, Toggle } from '@/components/ui'
import { isConflict } from '@/data/conflict'
import { elementSize, runDesign, TYPE_LABEL } from '@/data/elements'
import { repo, versionOf } from '@/data/repo'
import { type AssemblyData, type Criteria, emptyFaces, type FaceKey, type FaceLayout, type FormAssembly, type FormElement, type FormPanel } from '@/data/types'
import { analyzeAssembly, autoFace, faceLayoutOf, faceSpecs, type FillerAt, fillerLike } from '@/model/assembly'
import { elementGeom } from '@/model/assemblyGeom'
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

/** elements an assembly can be made for (footings, rectangular plywood columns, walls, beams) */
const supported = (els: FormElement[]) => els.filter((e) => !!elementGeom(e))

/** auto layout of every face (the originals only when linked) */
function autoAll(a: AssemblyData, el: FormElement, panels: FormPanel[], opts: { filler: FillerAt; stagger: boolean }) {
  const g = elementGeom(el)
  const missing: { key: FaceKey; width: number; height: number }[] = []
  if (!g) return { faces: a.faces, missing }
  const keys = g.faces.map((f) => f.key).filter((k) => !(a.linked && g.links.some(([, copy]) => copy === k)))
  // faces between the through pair first: the through faces' size depends on the panels they wrap
  const pairOf = (k: FaceKey) => g.faces.find((f) => f.key === k)!.pair
  const order = [...keys].sort((x, y) => Number(a.through === pairOf(x)) - Number(a.through === pairOf(y)))
  const faces = { ...a.faces }
  const byId = new Map(panels.map((p) => [p.id, p]))
  for (const k of order) {
    const spec = faceSpecs(g, { ...a, faces }, byId)[k]!
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
  const candidates = supported(elements)

  const create = async () => {
    const el = elements.find((e) => e.id === elId)
    const g = el && elementGeom(el)
    if (!el || !g || busy) return
    setBusy(true)
    try {
      const base: AssemblyData = { code: '', name: el.name, elementId: el.id, through: g.through, linked: g.links.length > 0, faces: emptyFaces(), note: '' }
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
            <p className="max-w-md text-sm text-muted">เลือกฐานราก เสา ผนัง หรือคานที่ออกแบบแล้ว ระบบจะนำแผงจากคลังมาจัดลงทุกด้านให้ แล้วปรับเองได้</p>
            {canEdit && (
              <Button variant="primary" onClick={() => setCreating(true)} disabled={!candidates.length || !panels.length}>
                <Plus size={16} /> สร้างชุดประกอบ
              </Button>
            )}
            {!candidates.length && <p className="text-xs text-muted">ยังไม่มีชิ้นงานที่ทำชุดประกอบได้ (ฐานราก เสาสี่เหลี่ยมแบบไม้อัด ผนัง คาน)</p>}
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
                      <div className="truncate text-xs text-muted">{el ? `${el.code} ${TYPE_LABEL[el.type]} · ${elementSize(el)}` : 'ไม่พบชิ้นงาน'}</div>
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
        <Field label="ชิ้นงาน" hint="ฐานราก · เสาสี่เหลี่ยม (ไม้อัด) · ผนัง · คาน">
          <Select value={elId} onChange={(e) => setElId(e.target.value)}>
            <option value="">— เลือกชิ้นงาน —</option>
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} {TYPE_LABEL[e.type]} · {elementSize(e)}
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
  const r = useMemo(() => (el ? analyzeAssembly(draft, el, run, panels, criteria) : undefined), [draft, el, run, panels, criteria])
  const model3d = useMemo(() => (view === '3d' && r && el ? assembly3d(r, el) : undefined), [view, r, el])

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

  if (!el || !r)
    return (
      <div className="card p-6 text-sm text-muted">
        ไม่พบชิ้นงานของชุดประกอบนี้ (อาจถูกลบไปแล้ว หรือเปลี่ยนเป็นรูปทรงที่ยังไม่รองรับ)
        {canEdit && (
          <Button variant="danger" className="ml-3" onClick={() => repo.deleteAssembly(projectId, assembly.id).then(onDeleted)}>
            <Trash2 size={16} /> ลบชุดประกอบ
          </Button>
        )}
      </div>
    )

  const g = r.geom
  // a face of another element type (or one the element lost) falls back to the first face
  const shown: FaceKey = r.keys.includes(face) ? face : r.keys[0]
  // the face being edited: a linked copy edits its original
  const editKey: FaceKey = (draft.linked && g.links.find(([, copy]) => copy === shown)?.[0]) || shown
  const mirrored = editKey !== shown
  const layout = faceLayoutOf(draft, shown, g.links)
  const fr = r.faces[shown]!
  const ro = !canEdit || mirrored
  const setLayout = (f: FaceLayout) => set({ faces: { ...draft.faces, [editKey]: f } })
  const courses = layout.courses
  const targetCourse = slot ? slot.course : Math.max(courses.length - 1, 0)

  /** auto layout of every face, or only of `only` (their missing panels replace theirs in the list) */
  const runAuto = (only?: FaceKey[], stock: FormPanel[] = panels) => {
    const res = autoAll(only ? { ...draft, linked: false } : draft, el, stock, { filler, stagger })
    if (only) {
      set({ faces: { ...draft.faces, ...Object.fromEntries(only.map((k) => [k, res.faces[k]])) } })
      setMissing((m) => [...m.filter((x) => !only.includes(x.key)), ...res.missing.filter((x) => only.includes(x.key))])
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
  /** make the missing panel (or use one of that size already in the stock), then lay out again every face that
   *  was waiting for it */
  const makeFiller = async (m: { key: FaceKey; width: number; height: number }) => {
    const same = (p: { width: number; height: number }) => Math.abs(p.width - m.width) < 0.0005 && Math.abs(p.height - m.height) < 0.0005
    const waiting = missing.filter(same).map((x) => x.key)
    const existing = panels.find(same)
    if (existing) return runAuto(waiting)
    const ids = faceLayoutOf(draft, m.key, g.links).courses.flatMap((c) => c.panels)
    const like = panels.find((p) => ids.includes(p.id) && Math.abs(p.height - m.height) < 0.005) ?? panels.find((p) => ids.includes(p.id)) ?? panels[0]
    if (!like) return
    setMaking(true)
    try {
      const data = { ...fillerLike(like, m.width, m.height), refElementId: el.id }
      const code = panelCodeFor(data.width, data.height, panels.map((p) => p.code))
      const id = await repo.createPanel(projectId, { ...data, code })
      runAuto(waiting, [...panels, { ...data, code, id, projectId, createdAt: Date.now(), updatedAt: Date.now() }])
    } finally {
      setMaking(false)
    }
  }

  const courseH = r.faces[editKey]?.courses[Math.min(targetCourse, courses.length - 1)]?.h
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
            {el.code} {TYPE_LABEL[el.type]} · {elementSize(el)}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to={`/projects/${projectId}/assembly/print?asm=${assembly.id}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <Printer size={16} /> แบบประกอบ
          </Link>
          {canEdit && (
            <>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} /> ลบ
              </Button>
              <Button variant="primary" onClick={() => save()} disabled={!draft.code.trim() || state === 'saving' || state === 'conflict' || (!dirty && state !== 'error')}>
                {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : state === 'saved' && !dirty ? <Check size={16} /> : <Save size={16} />}
                {state === 'saved' && !dirty ? 'บันทึกแล้ว' : 'บันทึก'}
              </Button>
            </>
          )}
        </div>
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
        <Field label={g.type === 'beam' ? 'มุมข้างคานกับท้องคาน' : 'ด้านที่วิ่งทะลุมุม'} hint={g.type === 'beam' ? 'ด้านที่ทะลุจะยาว/กว้างเพิ่มเท่าความหนาแผงของอีกด้าน' : 'อีกคู่หนึ่งอยู่ระหว่างด้านที่ทะลุ (ยาวพอดีคอนกรีต)'}>
          <Segmented<'x' | 'y'>
            label="ด้านที่วิ่งทะลุมุม"
            value={draft.through}
            onChange={(through) => set({ through })}
            options={[
              { value: 'x', label: g.throughLabel.x },
              { value: 'y', label: g.throughLabel.y },
            ]}
          />
        </Field>
        <div className="flex flex-col justify-end">
          {g.links.length > 0 && (
            <Toggle
              checked={draft.linked}
              onChange={(linked) => set({ linked, faces: linked ? draft.faces : { ...draft.faces, ...Object.fromEntries(g.links.map(([src, copy]) => [copy, draft.faces[src]])) } })}
              label={`ด้านตรงข้ามเหมือนกัน (${g.links.map(([src, copy]) => `${copy} = ${src}`).join(', ')})`}
            />
          )}
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
              ด้าน {m.key}: แผงในคลังต่อได้ไม่พอดี — ต้องมีแผง <span className="num font-semibold">{+m.width.toFixed(3)} × {+m.height.toFixed(3)}</span> ม.
              {canEdit && (
                <Button variant="secondary" className="ml-auto h-8" onClick={() => makeFiller(m)} disabled={making}>
                  {making ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} สร้างแผง {+m.width.toFixed(3)} × {+m.height.toFixed(3)} แล้วจัดใหม่
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="card p-3">
            <p className="mb-1 text-xs text-muted">{g.diagram.caption} — คลิกเลือกด้าน (สีเข้ม = ทะลุมุม)</p>
            <PlanView geom={g} specs={r.specs} selected={shown} onSelect={(k) => (setFace(k), setSlot(undefined))} />
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
              <h3 className="mb-2 text-sm font-semibold">{g.waleLabel} (ตามที่ออกแบบ)</h3>
              <ul className="text-sm">
                {r.wales.map((w, i) => (
                  <li key={i} className="flex justify-between py-0.5">
                    <span>
                      ด้าน {w.faces} ยาว <span className="num">{w.length.toFixed(2)}</span> ม.
                    </span>
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
                  เลือก <span className="num font-semibold">{selectedPanel.code}</span> · {fr.spec.label} ชั้นที่ {slot.course + 1} ลำดับที่ {slot.index + 1} ·{' '}
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
                {r.keys.map((k) => (
                  <button key={k} type="button" role="tab" aria-selected={shown === k} onClick={() => (setFace(k), setSlot(undefined))} className={clsx('h-8 rounded-md px-3 text-[13px]', shown === k ? 'bg-white font-semibold shadow-sm' : 'text-slate-600')}>
                    {k} <StatusDot status={r.faces[k]!.status} />
                  </button>
                ))}
              </div>
              <span className="text-sm">
                {fr.spec.label} · ยาว <span className="num">{fr.spec.length.toFixed(3)}</span> ม. · {fr.spec.exactHeight ? 'กว้าง' : 'สูง'} {fr.spec.exactHeight ? '' : '≥ '}
                <span className="num">{fr.spec.reqHeight.toFixed(3)}</span> ม. {fr.spec.through ? '(ทะลุมุม)' : ''}
              </span>
              {!ro && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Button variant="ghost" className="h-8 px-2.5" onClick={() => runAuto([editKey])}>
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
            {mirrored && <p className="mb-2 text-xs text-muted">ด้าน {shown} ใช้แผงเหมือนด้าน {editKey} — ปิด “ด้านตรงข้ามเหมือนกัน” เพื่อจัดแยก</p>}
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
            <h3 className="mb-2 text-sm font-semibold">การตรวจสอบ {fr.spec.label}</h3>
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
