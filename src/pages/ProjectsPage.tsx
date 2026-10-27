import clsx from 'clsx'
import { FileInput, FolderPlus, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Empty, Modal } from '@/components/ui'
import { useAuth } from '@/auth/AuthProvider'
import { useProjects } from '@/data/hooks'
import { repo } from '@/data/repo'
import { type Project, type ProjectStatus, STATUS_LABEL } from '@/data/types'

const STATUS_STYLE: Record<ProjectStatus, string> = {
  design: 'bg-blue-50 text-sel',
  review: 'bg-amber-50 text-warn',
  issued: 'bg-green-50 text-ok',
}

const relTime = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} วันก่อน` : new Date(t).toLocaleDateString('th-TH')
}

export function ProjectsPage() {
  const { projects, loading, error } = useProjects()
  const { can } = useAuth()
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [toDelete, setToDelete] = useState<Project | null>(null)
  const [importing, setImporting] = useState(false)
  const navigate = useNavigate()

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (projects ?? []).filter(
      (p) =>
        (filter === 'all' || p.status === filter) &&
        (!s || [p.projectNo, p.name, p.client, p.contractor, p.subcontractor, p.location].some((x) => x?.toLowerCase().includes(s))),
    )
  }, [projects, filter, q])

  const counts = useMemo(() => {
    const c = { all: 0, design: 0, review: 0, issued: 0, elements: 0 }
    for (const p of projects ?? []) {
      c.all++
      c[p.status]++
      c.elements += p.elementCount
    }
    return c
  }, [projects])

  const kpis = [
    { label: 'โครงการทั้งหมด', value: counts.all, sub: `${counts.design} กำลังออกแบบ` },
    { label: 'รอตรวจ', value: counts.review, sub: 'ต้องตรวจทานรายการคำนวณ' },
    { label: 'ออกแบบแล้ว', value: counts.issued, sub: 'พร้อมออก Shop drawing' },
    { label: 'ชิ้นส่วนที่ออกแบบ', value: counts.elements, sub: 'กำแพง · เสา · คาน · พื้น · ฐานราก' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <p className="text-[13px] text-muted">Workspace / โครงการ</p>
          <h1 className="text-[28px] font-bold tracking-tight">โครงการทั้งหมด</h1>
        </div>
        {can('import') && (
          <Button className="h-11" onClick={() => setImporting(true)}>
            <FileInput size={18} /> นำเข้าแบบ (DXF / PDF / ภาพ)
          </Button>
        )}
        {can('project.create') && (
          <Button variant="primary" className="h-11" onClick={() => navigate('/projects/new')}>
            <Plus size={18} /> โครงการใหม่
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card flex flex-col gap-1 px-4 py-4">
            <span className="text-[13px] text-muted">{k.label}</span>
            <strong className="num text-[28px] font-semibold">{k.value}</strong>
            <span className="text-xs text-muted">{k.sub}</span>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {(['all', 'design', 'review', 'issued'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              aria-pressed={filter === s}
              className={clsx('h-8 rounded-full px-3.5 text-[13px]', filter === s ? 'bg-navy-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
            >
              {s === 'all' ? `ทั้งหมด (${counts.all})` : `${STATUS_LABEL[s]} (${counts[s]})`}
            </button>
          ))}
          <label className="ml-auto flex h-9 w-full items-center gap-2 rounded-lg border border-slate-300 px-3 text-muted focus-within:border-sel sm:w-72">
            <Search size={16} aria-hidden />
            <span className="sr-only">ค้นหาโครงการ</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเลขที่, ชื่อ, ลูกค้า…" className="min-w-0 flex-1 text-sm text-ink outline-none" />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted">
            <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
          </div>
        ) : error ? (
          <p className="px-4 py-10 text-center text-sm text-fail">โหลดข้อมูลไม่สำเร็จ: {error}</p>
        ) : list.length === 0 ? (
          <Empty icon={<FolderPlus size={22} />} title={projects?.length ? 'ไม่พบโครงการที่ตรงกับการค้นหา' : 'ยังไม่มีโครงการ'}>
            {!projects?.length && !can('project.create') && <p className="max-w-sm text-sm text-muted">ยังไม่มีโครงการที่ได้รับมอบหมาย — ติดต่อ Master Admin</p>}
            {!projects?.length && can('project.create') && (
              <Button variant="primary" onClick={() => navigate('/projects/new')}>
                <Plus size={18} /> สร้างโครงการแรก
              </Button>
            )}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Project No.</th>
                  <th className="px-3 py-2.5 font-medium">ชื่อโครงการ / ที่ตั้ง</th>
                  <th className="px-3 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Contractor / Sub</th>
                  <th className="px-3 py-2.5 font-medium">ชิ้นส่วน</th>
                  <th className="px-3 py-2.5 font-medium">สถานะ</th>
                  <th className="px-3 py-2.5 font-medium">อัปเดต</th>
                  <th className="px-4 py-2.5 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="num px-4 py-3.5 text-[13px]">{p.projectNo}</td>
                    <td className="px-3 py-3.5">
                      <Link to={`/projects/${p.id}`} className="font-semibold text-ink hover:text-sel">
                        {p.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted">{p.location || '—'}</div>
                    </td>
                    <td className="px-3 py-3.5">{p.client || '—'}</td>
                    <td className="px-3 py-3.5">
                      {p.contractor || '—'}
                      <div className="mt-0.5 text-xs text-muted">{p.subcontractor || '—'}</div>
                    </td>
                    <td className="num px-3 py-3.5">{p.elementCount}</td>
                    <td className="px-3 py-3.5">
                      <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLE[p.status])}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-muted">{relTime(p.updatedAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {can('project.edit') && (
                          <Link to={`/projects/${p.id}/edit`} aria-label={`แก้ไข ${p.name}`} title="แก้ไข" className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-slate-600 hover:bg-slate-50">
                            <Pencil size={16} />
                          </Link>
                        )}
                        {can('project.delete') && (
                          <button type="button" onClick={() => setToDelete(p)} aria-label={`ลบ ${p.name}`} title="ลบ" className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-fail hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <DeleteProjectModal project={toDelete} onClose={() => setToDelete(null)} />
      <Modal open={importing} onClose={() => setImporting(false)} title="นำเข้าแบบเข้าโครงการไหน?">
        {projects?.length ? (
          <ul className="-mx-2 flex max-h-[50dvh] flex-col overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}/import`} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <span className="num w-28 shrink-0 text-xs text-muted">{p.projectNo}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">ยังไม่มีโครงการ — สร้างโครงการก่อน แล้วจึงนำเข้าแบบ</p>
        )}
        {can('project.create') && (
          <Button onClick={() => navigate('/projects/new')}>
            <Plus size={16} /> สร้างโครงการใหม่
          </Button>
        )}
      </Modal>
    </div>
  )
}

export function DeleteProjectModal({ project, onClose, onDeleted }: { project: Project | null; onClose: () => void; onDeleted?: () => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()
  const close = () => {
    setTyped('')
    setErr(undefined)
    onClose()
  }
  return (
    <Modal
      open={!!project}
      onClose={close}
      title={`ลบโครงการ “${project?.name ?? ''}” ?`}
      footer={
        <>
          <Button onClick={close}>ยกเลิก</Button>
          <Button
            variant="primary"
            className="bg-fail hover:bg-red-800"
            disabled={typed.trim() !== project?.projectNo || busy}
            onClick={async () => {
              if (!project) return
              setBusy(true)
              try {
                await repo.deleteProject(project.id)
                close()
                onDeleted?.()
              } catch (e) {
                setErr((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            ลบถาวร
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">
        ชิ้นส่วนและรายการคำนวณทั้งหมด ({project?.elementCount ?? 0} ชิ้น) จะถูกลบและกู้คืนไม่ได้ พิมพ์เลขที่โครงการ <b className="num text-ink">{project?.projectNo}</b> เพื่อยืนยัน
      </p>
      <input className="input num" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="พิมพ์เลขที่โครงการเพื่อยืนยัน" />
      {err && <p className="text-sm text-fail">{err}</p>}
    </Modal>
  )
}
