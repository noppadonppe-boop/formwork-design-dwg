import clsx from 'clsx'
import { Box, Check, ChevronLeft, CloudOff, DraftingCompass, Eye, FileText, Wand2, ListChecks, Loader2, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { ElementForm, Group } from '@/components/design/ElementForms'
import { NumField } from '@/components/design/NumField'
import { ProjectNav } from '@/components/ProjectNav'
import { OptimizerPanel } from '@/components/design/OptimizerPanel'
import { ResultsPanel } from '@/components/design/ResultsPanel'
import { Field, StatusBadge } from '@/components/ui'
import { elementHeight, layoutSummary, QUANTITY_LABEL, runDesign, TYPE_LABEL } from '@/data/elements'
import { useElements, useProject } from '@/data/hooks'
import { isConflict } from '@/data/conflict'
import { repo, versionOf } from '@/data/repo'
import { type Criteria, DEFAULT_CRITERIA, type ElementData } from '@/data/types'
import { fmt } from '@/engine'

const Designer3D = lazy(() => import('@/components/three/Designer3D'))

type Tab = '3d' | 'calc' | 'opt'
const TAB_KEY = 'formwork-studio:element-tab'

type SaveState = 'saved' | 'saving' | 'dirty' | 'error' | 'conflict'

export function ElementPage() {
  const { projectId, elementId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const stored = elements?.find((e) => e.id === elementId)
  const { can } = useAuth()
  const canEdit = can('element.edit')
  const [draft, setDraft] = useState<ElementData>()
  const [save, setSave] = useState<SaveState>('saved')
  /** version the current draft is based on, and the draft object that came from the server */
  const base = useRef<number | undefined>(undefined)
  const synced = useRef<ElementData | undefined>(undefined)
  const pending = useRef<number | undefined>(undefined)
  const [remoteChanged, setRemoteChanged] = useState(false)
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      return (localStorage.getItem(TAB_KEY) as Tab) || '3d'
    } catch {
      return '3d'
    }
  })
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      /* private mode */
    }
  }
  const timer = useRef<number | undefined>(undefined)

  const adopt = (el: ElementData) => {
    base.current = versionOf(el)
    synced.current = el
    setDraft(el)
    setRemoteChanged(false)
    setSave('saved')
  }

  // realtime: take the stored element whenever there are no unsaved edits here; otherwise keep the draft and warn
  useEffect(() => {
    if (!stored) return
    const v = versionOf(stored)
    if (!draft) return adopt(stored)
    if (v === base.current || v === pending.current) return // our own save coming back
    const unsaved = draft !== synced.current || save === 'saving' || save === 'conflict'
    if (!unsaved || !canEdit) adopt(stored)
    else setRemoteChanged(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored])

  const criteria: Criteria = { ...DEFAULT_CRITERIA, ...project?.criteria }
  const run = useMemo(() => {
    if (!draft) return undefined
    try {
      return { ok: true as const, res: runDesign(draft, criteria, { advise: true }) }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, project?.criteria])

  const persist = async (force = false) => {
    if (!draft || !projectId || !elementId) return
    setSave('saving')
    pending.current = (base.current ?? 0) + 1
    try {
      const d = run?.ok ? run.res.design : undefined
      // strip server fields so they are not written back
      const { id: _id, projectId: _pid, createdAt: _c, updatedAt: _u, version: _v, ...data } = draft as ElementData & { id?: string; projectId?: string; createdAt?: number; updatedAt?: number; version?: number }
      base.current = await repo.updateElement(
        projectId,
        elementId,
        { ...data, result: d ? { status: d.status, maxRatio: d.maxRatio, pressure: d.pressure.Pmax } : undefined } as ElementData,
        force ? undefined : base.current,
        force,
      )
      synced.current = draft
      setRemoteChanged(false)
      setSave('saved')
    } catch (e) {
      setSave(isConflict(e) ? 'conflict' : 'error')
    } finally {
      pending.current = undefined
    }
  }

  // debounced autosave of the input + summary result (only edits made here, never a draft taken from the server)
  useEffect(() => {
    if (!draft || draft === synced.current || !canEdit || save === 'conflict') return
    setSave('dirty')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => persist(), 700)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  if (project === undefined || elements === undefined || (stored && !draft))
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!project || !stored || !draft) return <p className="p-10 text-center text-muted">ไม่พบชิ้นส่วน</p>

  const patch = (p: Partial<ElementData>) => setDraft({ ...draft, ...p } as ElementData)
  const update = (fn: (el: ElementData) => ElementData) => setDraft((d) => (d ? fn(d) : d))
  const layout = run?.ok ? layoutSummary(run.res) : []

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> {project.name}
        </Link>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          {save === 'saving' && (
            <>
              <Loader2 size={14} className="animate-spin" /> กำลังบันทึก…
            </>
          )}
          {save === 'saved' && (
            <>
              <Check size={14} className="text-ok" /> บันทึกแล้ว
            </>
          )}
          {save === 'dirty' && 'มีการแก้ไข…'}
          {save === 'error' && (
            <span className="inline-flex items-center gap-1 text-fail">
              <CloudOff size={14} /> บันทึกไม่สำเร็จ
            </span>
          )}
          {save === 'conflict' && (
            <span className="inline-flex items-center gap-1 text-warn">
              <TriangleAlert size={14} /> หยุดบันทึกอัตโนมัติ
            </span>
          )}
        </span>
      </div>
      {!canEdit && (
        <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-600">
          <Eye size={16} /> โหมดดูอย่างเดียว — สิทธิ์ของคุณไม่รวมการออกแบบชิ้นส่วน การเปลี่ยนค่าในหน้านี้จะไม่ถูกบันทึก
        </p>
      )}
      {canEdit && (remoteChanged || save === 'conflict') && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-warn ring-1 ring-amber-200" role="alert">
          <TriangleAlert size={16} />
          มีผู้อื่นบันทึกชิ้นส่วนนี้ระหว่างที่คุณแก้ไข — ค่าที่คุณกรอกยังอยู่ครบ
          <span className="ml-auto flex gap-3">
            <button type="button" className="font-medium underline" onClick={() => stored && adopt(stored)}>
              โหลดของผู้อื่น (ทิ้งของฉัน)
            </button>
            <button type="button" className="font-medium underline" onClick={() => persist(true)}>
              บันทึกของฉันทับ
            </button>
          </span>
        </div>
      )}
      <ProjectNav projectId={project.id} elementId={elementId} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          <span className="num">{draft.code}</span> · แบบหล่อ{TYPE_LABEL[draft.type]} {draft.name && <span className="font-normal text-muted">— {draft.name}</span>}
        </h1>
        {run?.ok && (
          <StatusBadge status={run.res.design.status}>
            {run.res.design.status === 'fail' ? 'ไม่ผ่าน' : 'ผ่าน'} · ratio <span className="num">{run.res.design.maxRatio.toFixed(2)}</span>
          </StatusBadge>
        )}
        <Link
          to={`/projects/${project.id}/elements/${elementId}/shop`}
          target="_blank"
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium hover:bg-slate-50"
        >
          <DraftingCompass size={16} /> Shop drawing + BOM
        </Link>
        <Link
          to={`/projects/${project.id}/elements/${elementId}/report`}
          target="_blank"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <FileText size={16} /> รายการคำนวณ (PDF)
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <aside className="card flex w-full flex-col gap-5 p-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:w-[420px] lg:overflow-y-auto">
          <Group title="ข้อมูลชิ้นส่วน">
            <div className="grid grid-cols-2 gap-3">
              <Field label="รหัส">
                <input className="input num" value={draft.code} onChange={(e) => patch({ code: e.target.value })} />
              </Field>
              <Field label="ชื่อ">
                <input className="input" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <Field label="ชั้น / โซน">
                <input className="input" value={draft.level} onChange={(e) => patch({ level: e.target.value })} />
              </Field>
              <NumField label="จำนวน" value={draft.qty} min={1} onChange={(v) => patch({ qty: v ?? 1 })} />
            </div>
          </Group>
          <ElementForm el={draft} set={update} />
        </aside>

        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-4" aria-label="ผลการออกแบบ">
          <div className="flex w-fit rounded-lg border border-line bg-white p-0.5" role="tablist" aria-label="มุมมองผลการออกแบบ">
            {(
              [
                ['3d', 'โมเดล 3D', Box],
                ['calc', 'ผลการคำนวณ', ListChecks],
                ['opt', 'Optimizer', Wand2],
              ] as const
            ).map(([k, l, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx('inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium', tab === k ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                <Icon size={15} /> {l}
              </button>
            ))}
          </div>
          {tab === 'opt' ? (
            <OptimizerPanel draft={draft} criteria={criteria} onApply={(el) => update(() => el)} />
          ) : !run?.ok ? (
            <p className="card p-6 text-sm text-fail">คำนวณไม่ได้: {run?.error}</p>
          ) : tab === '3d' ? (
            <Suspense
              fallback={
                <div className="grid h-[min(72dvh,640px)] min-h-[420px] place-items-center rounded-xl border border-line bg-slate-100 text-muted">
                  <Loader2 className="animate-spin" aria-label="กำลังโหลดโมเดล 3D" />
                </div>
              }
            >
              <Designer3D draft={draft} run={run.res} setDraft={update} />
            </Suspense>
          ) : (
            <ResultsPanel result={run.res.design} height={elementHeight(draft)} layout={layout} />
          )}
          {run?.ok && <Quantities q={run.res.design.quantities as unknown as Record<string, number>} />}
        </section>
      </div>
    </div>
  )
}



function Quantities({ q }: { q: Record<string, number> }) {
  return (
    <div className="card p-4">
      <h2 className="mb-2 font-semibold">ปริมาณวัสดุโดยประมาณ (ต่อ 1 ชิ้น)</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {Object.entries(q).filter(([, v]) => v > 0).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{QUANTITY_LABEL[k]?.[0] ?? k}</dt>
            <dd className="num">
              {fmt(v, Number.isInteger(v) ? 0 : 1)} {QUANTITY_LABEL[k]?.[1]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

