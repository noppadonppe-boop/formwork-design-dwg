import { Columns3, Cuboid, FileInput, FileText, Layers, Loader2, Pencil, PanelTop, Plus, RectangleHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { FilesPanel } from '@/components/FilesPanel'
import { ProjectNav } from '@/components/ProjectNav'
import { Button, Empty, Modal, RatioBar, StatusBadge } from '@/components/ui'
import { elementSize, newElement, TYPE_LABEL } from '@/data/elements'
import { useElements, useProject } from '@/data/hooks'
import { repo } from '@/data/repo'
import { DEFAULT_CRITERIA, type ElementType, type FormElement, STATUS_LABEL } from '@/data/types'
import { fmt } from '@/engine'

const METHOD_LABEL = { ACI347: 'ACI 347', CEB: 'CEB', CIRA: 'CIRA', HYDROSTATIC: 'γH' } as const

export function ProjectPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState<FormElement | null>(null)
  const { can } = useAuth()
  const canEdit = can('element.edit')

  if (project === undefined)
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (project === null)
    return (
      <div className="p-10 text-center text-muted">
        ไม่พบโครงการ · <Link to="/" className="text-sel">กลับหน้าโครงการ</Link>
      </div>
    )

  const criteria = { ...DEFAULT_CRITERIA, ...project.criteria }
  const add = async (type: ElementType) => {
    if (busy) return
    setBusy(true)
    try {
      const id = await repo.createElement(project.id, newElement(type, criteria, elements ?? []))
      navigate(`/projects/${project.id}/elements/${id}`)
    } finally {
      setBusy(false)
    }
  }

  const info: [string, string][] = [
    ['Client', project.client],
    ['Contractor', project.contractor],
    ['Subcontractor', project.subcontractor],
    ['Location', project.location],
  ]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <p className="text-[13px] text-muted">
            <Link to="/" className="hover:text-ink">
              โครงการ
            </Link>{' '}
            / <span className="num">{project.projectNo}</span> · {project.revision}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight">{project.name}</h1>
        </div>
        {can('report') && (
          <Link to={`/projects/${project.id}/report`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
            <FileText size={16} /> รายการคำนวณทั้งโครงการ
          </Link>
        )}
      </div>

      <ProjectNav projectId={project.id} className="-mt-2" />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd>{v || '—'}</dd>
              </div>
            ))}
          </dl>
          {project.note && <p className="mt-4 whitespace-pre-line border-t border-line pt-3 text-sm text-slate-700">{project.note}</p>}
        </section>
        <section className="card flex flex-col gap-2 p-5 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Design Criteria</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-sel">{STATUS_LABEL[project.status]}</span>
          </div>
          <Row k="แรงดันด้านข้าง" v={METHOD_LABEL[criteria.pressureMethod]} />
          <Row k="อัตราเท R / อุณหภูมิ T" v={`${criteria.R} ม./ชม. · ${criteria.T} °C`} />
          <Row k="Slump / γ" v={`${criteria.slump} ซม. · ${fmt(criteria.gamma)} กก./ม.³`} />
          <Row k="การแอ่นตัว" v={`L/${criteria.deflectionRatio}${criteria.deflectionAbsMm ? ` ≤ ${criteria.deflectionAbsMm} มม.` : ''}`} />
          <Row k="ตรวจแรงเฉือนไม้" v={criteria.checkTimberShear ? 'ใช่' : 'ไม่'} />
        </section>
      </div>

      <section id="elements" className="card scroll-mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="mr-auto font-semibold">ชิ้นส่วน ({elements?.length ?? 0})</h2>
          {can('import') && (
            <Link to={`/projects/${project.id}/import`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand px-3 text-sm font-medium text-brand hover:bg-orange-50">
              <FileInput size={16} /> นำเข้าจากแบบ (DXF / AI)
            </Link>
          )}
          {canEdit && (
            <>
          <Button disabled={busy} onClick={() => add('wall')}>
            <PanelTop size={16} /> เพิ่มกำแพง
          </Button>
          <Button disabled={busy} onClick={() => add('column')}>
            <Columns3 size={16} /> เพิ่มเสา
          </Button>
          <Button disabled={busy} onClick={() => add('beam')}>
            <RectangleHorizontal size={16} /> เพิ่มคาน
          </Button>
          <Button disabled={busy} onClick={() => add('slab')}>
            <Layers size={16} /> เพิ่มพื้น
          </Button>
          <Button disabled={busy} onClick={() => add('footing')}>
            <Cuboid size={16} /> เพิ่มฐานราก
          </Button>
            </>
          )}
        </div>
        {elements === undefined ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
          </div>
        ) : elements.length === 0 ? (
          <Empty icon={<Plus size={22} />} title="ยังไม่มีชิ้นส่วน">
            <p className="max-w-sm text-sm text-muted">เพิ่มกำแพง เสา คาน พื้น หรือฐานราก แล้วระบบจะออกแบบแผ่นผิว เคร่า ตง คาน ไทร์ เสาค้ำ และค้ำยันให้ตามหนังสืออ้างอิง</p>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">รหัส</th>
                  <th className="px-3 py-2.5 font-medium">ประเภท / ชื่อ</th>
                  <th className="px-3 py-2.5 font-medium">ขนาด</th>
                  <th className="px-3 py-2.5 font-medium">ชั้น/โซน</th>
                  <th className="px-3 py-2.5 text-right font-medium">จำนวน</th>
                  <th className="px-3 py-2.5 text-right font-medium">P / w (กก./ม.²)</th>
                  <th className="w-44 px-3 py-2.5 font-medium">อัตราส่วนสูงสุด</th>
                  <th className="px-4 py-2.5 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {elements.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="num px-4 py-3 font-semibold">
                      <Link to={`/projects/${project.id}/elements/${e.id}`} className="hover:text-sel">
                        {e.code}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {TYPE_LABEL[e.type]}
                      <span className="text-muted"> · {e.name || '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-[13px]">{elementSize(e)}</td>
                    <td className="px-3 py-3">{e.level || '—'}</td>
                    <td className="num px-3 py-3 text-right">{e.qty}</td>
                    <td className="num px-3 py-3 text-right">{e.result ? fmt(e.result.pressure) : '—'}</td>
                    <td className="px-3 py-3">
                      {e.result ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <RatioBar ratio={e.result.maxRatio} />
                          </div>
                          <span className="num w-10 text-right text-xs">{e.result.maxRatio.toFixed(2)}</span>
                          <StatusBadge status={e.result.status} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted">ยังไม่คำนวณ</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/projects/${project.id}/elements/${e.id}`} aria-label={`แก้ไข ${e.code}`} title="แก้ไข" className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-slate-600 hover:bg-slate-50">
                          <Pencil size={16} />
                        </Link>
                        {canEdit && (
                          <button type="button" onClick={() => setToDelete(e)} aria-label={`ลบ ${e.code}`} title="ลบ" className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-fail hover:bg-red-50">
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

      <FilesPanel projectId={project.id} />

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`ลบชิ้นส่วน ${toDelete?.code ?? ''}?`}
        footer={
          <>
            <Button onClick={() => setToDelete(null)}>ยกเลิก</Button>
            <Button
              variant="primary"
              className="bg-fail hover:bg-red-800"
              onClick={async () => {
                if (toDelete) await repo.deleteElement(project.id, toDelete.id)
                setToDelete(null)
              }}
            >
              ลบ
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">ข้อมูลและผลการคำนวณของชิ้นส่วนนี้จะถูกลบ</p>
      </Modal>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
      <span className="text-muted">{k}</span>
      <span className="num text-right text-[13px]">{v}</span>
    </div>
  )
}
