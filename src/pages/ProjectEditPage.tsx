import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { ChevronLeft, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthProvider'
import { isConflict, isDuplicateProjectNo } from '@/data/conflict'
import { MethodCard } from '@/components/MethodCard'
import { ProjectNav } from '@/components/ProjectNav'
import { Button, Field, NumberInput, Select } from '@/components/ui'
import { PLYWOOD, PLYWOOD_THICKNESS, STEEL, TIES, TIMBER } from '@/engine'
import { useProject, useProjects } from '@/data/hooks'
import { METHOD_INFO } from '@/data/references'
import { repo, versionOf } from '@/data/repo'
import { DEFAULT_CRITERIA, EMPTY_PROJECT, type Project, type ProjectData, REPORT_LANG_LABEL, STATUS_LABEL } from '@/data/types'
import { DeleteProjectModal } from './ProjectsPage'

const num = (min: number, max: number, msg = `ค่า ${min}–${max}`) => z.number({ error: 'กรอกตัวเลข' }).min(min, msg).max(max, msg)

const schema = z.object({
  projectNo: z.string().trim().min(1, 'กรอกเลขที่โครงการ').max(40),
  name: z.string().trim().min(1, 'กรอกชื่อโครงการ').max(200),
  client: z.string().trim().max(200),
  contractor: z.string().trim().max(200),
  subcontractor: z.string().trim().max(200),
  location: z.string().trim().max(300),
  note: z.string().max(4000),
  revision: z.string().trim().max(10),
  status: z.enum(['design', 'review', 'issued']),
  reportLang: z.enum(['th', 'en', 'zh']),
  logo: z.string().max(400_000, 'ไฟล์โลโก้ใหญ่เกินไป'),
  criteria: z.object({
    pressureMethod: z.enum(['ACI347', 'CEB', 'CIRA', 'HYDROSTATIC']),
    verticalMethod: z.enum(['ACI347', 'CEB', 'CIRA']),
    R: num(0.1, 20),
    T: num(0, 45),
    slump: num(0, 25),
    gamma: num(1500, 5500),
    vibrationFactor: num(0, 0.5),
    liveLoad: num(0, 1000),
    formWeight: num(0, 200),
    deflectionRatio: num(180, 1000),
    deflectionAbsMm: z.number().min(0.5).max(20).nullable(),
    checkTimberShear: z.boolean(),
    windLoad: num(0, 300),
    defaults: z.object({
      plywoodId: z.string(),
      plywoodThicknessMm: z.number(),
      timberId: z.string(),
      steelId: z.string(),
      tieId: z.string(),
    }),
  }),
})

type FormValues = z.infer<typeof schema>

/** the project as form values — only the fields this form edits, so comparisons ignore shop settings, counters, … */
function toValues(p: Project): FormValues {
  const v = { ...EMPTY_PROJECT, ...p, criteria: { ...DEFAULT_CRITERIA, ...p.criteria, defaults: { ...DEFAULT_CRITERIA.defaults, ...p.criteria?.defaults } } }
  return Object.fromEntries(Object.keys(schema.shape).map((k) => [k, v[k as keyof typeof v]])) as FormValues
}

/** Read an image file and shrink it to fit 600 × 240 px, as a PNG data URL (keeps transparency). */
async function logoDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, 600 / (img.naturalWidth || 600), 240 / (img.naturalHeight || 240))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round((img.naturalWidth || 600) * k))
    c.height = Math.max(1, Math.round((img.naturalHeight || 240) * k))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

const TABS = [
  { id: 'code', label: 'Design Code' },
  { id: 'load', label: 'Loads & Concrete' },
  { id: 'mat', label: 'วัสดุเริ่มต้น' },
  { id: 'def', label: 'Deflection & Safety' },
] as const

export function ProjectEditPage() {
  const { projectId } = useParams()
  const isNew = !projectId
  const project = useProject(projectId)
  const { projects } = useProjects()
  const { user, userProfile, can } = useAuth()
  /** form values (JSON) and project version the edits are based on */
  const base = useRef<{ json: string; version: number }>(undefined)
  const [remoteChanged, setRemoteChanged] = useState(false)
  const [conflict, setConflict] = useState(false)
  const navigate = useNavigate()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('code')
  const [saveError, setSaveError] = useState<string>()
  const [deleting, setDeleting] = useState(false)
  const [logoError, setLogoError] = useState<string>()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_PROJECT })

  const adopt = (p: Project) => {
    const v = toValues(p)
    base.current = { json: JSON.stringify(v), version: versionOf(p) }
    reset(v)
    setRemoteChanged(false)
    setConflict(false)
  }

  // realtime: take others' saves while this form has no unsaved edits; otherwise keep what is typed and warn
  useEffect(() => {
    if (!project) return
    const json = JSON.stringify(toValues(project))
    if (!base.current) return adopt(project)
    if (json === base.current.json) {
      base.current.version = versionOf(project) // only fields outside this form changed (BOM settings, counters)
      return
    }
    if (!isDirty) adopt(project)
    else setRemoteChanged(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  if (!isNew && project === undefined)
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!isNew && project === null) return <p className="p-10 text-center text-muted">ไม่พบโครงการ</p>

  const onSubmit = async (v: FormValues, force = false) => {
    setSaveError(undefined)
    const dup = projects?.find((p) => p.projectNo.toLowerCase() === v.projectNo.toLowerCase() && p.id !== projectId)
    if (dup) {
      setError('projectNo', { message: `เลขที่นี้ใช้แล้วกับ “${dup.name}”` })
      return
    }
    try {
      const data = v as ProjectData
      if (isNew) {
        // creators without "see all projects" get the new project assigned so they can open it
        const id = await repo.createProject(user!.uid, data, userProfile && !can('project.viewAll') ? userProfile.email : undefined)
        navigate(`/projects/${id}`, { replace: true })
      } else {
        const version = await repo.updateProject(projectId!, data, force ? undefined : base.current?.version, force)
        base.current = { json: JSON.stringify(v), version }
        navigate(`/projects/${projectId}`)
      }
    } catch (e) {
      if (isConflict(e)) setConflict(true)
      else if (isDuplicateProjectNo(e)) setError('projectNo', { message: e.message })
      else setSaveError((e as Error).message)
    }
  }

  const logo = watch('logo')
  const pickLogo = async (file: File | undefined) => {
    setLogoError(undefined)
    if (!file) return
    if (!file.type.startsWith('image/')) return setLogoError('เลือกไฟล์รูปภาพ (PNG, JPG, SVG)')
    try {
      setValue('logo', await logoDataUrl(file), { shouldDirty: true, shouldValidate: true })
    } catch {
      setLogoError('อ่านไฟล์รูปไม่ได้')
    }
  }
  const absMm = watch('criteria.deflectionAbsMm')
  const method = watch('criteria.pressureMethod')
  const crit = errors.criteria

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v))} className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8" noValidate>
      <div className="flex flex-wrap items-center gap-3">
        <Link to={isNew ? '/' : `/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> {isNew ? 'โครงการทั้งหมด' : project?.name}
        </Link>
      </div>
      {!isNew && projectId && <ProjectNav projectId={projectId} />}
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex-1 text-[26px] font-bold">{isNew ? 'สร้างโครงการใหม่' : 'แก้ไขโครงการ'}</h1>
        {!isNew && can('project.delete') && (
          <Button variant="danger" onClick={() => setDeleting(true)}>
            ลบโครงการ
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isSubmitting || (!isNew && !isDirty)} className="h-11 min-w-28">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {isNew ? 'สร้างโครงการ' : 'บันทึก'}
        </Button>
      </div>
      {saveError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-fail">บันทึกไม่สำเร็จ: {saveError}</p>}
      {(remoteChanged || conflict) && project && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-warn ring-1 ring-amber-200" role="alert">
          มีผู้อื่นบันทึกโครงการนี้ระหว่างที่คุณแก้ไข — ข้อมูลที่คุณกรอกยังอยู่ครบ
          <span className="ml-auto flex gap-3">
            <button type="button" className="font-medium underline" onClick={() => adopt(project)}>
              โหลดของผู้อื่น (ทิ้งของฉัน)
            </button>
            <button type="button" className="font-medium underline" disabled={isSubmitting} onClick={handleSubmit((v) => onSubmit(v, true))}>
              บันทึกของฉันทับ
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="pinfo" className="card flex w-full flex-col gap-3.5 p-5 lg:w-[440px]">
          <h2 id="pinfo" className="text-lg font-semibold">
            ข้อมูลโครงการ
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project No. *" error={errors.projectNo?.message}>
              <input className="input num" {...register('projectNo')} placeholder="PRJ-2026-001" />
            </Field>
            <Field label="Revision" error={errors.revision?.message}>
              <input className="input" {...register('revision')} />
            </Field>
          </div>
          <Field label="Project Name *" error={errors.name?.message}>
            <input className="input" {...register('name')} />
          </Field>
          <Field label="Client">
            <input className="input" {...register('client')} />
          </Field>
          <Field label="Contractor">
            <input className="input" {...register('contractor')} />
          </Field>
          <Field label="Subcontractor">
            <input className="input" {...register('subcontractor')} />
          </Field>
          <Field label="Project location">
            <input className="input" {...register('location')} />
          </Field>
          <Field label="สถานะ">
            <Select {...register('status')}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project note">
            <textarea rows={4} className="input h-auto py-2" {...register('note')} />
          </Field>

          <h2 id="pdocs" className="mt-2 border-t border-line pt-4 text-lg font-semibold">
            เอกสาร · รายการคำนวณ & Shop drawing
          </h2>
          <Field label="ภาษารายการคำนวณ" hint="เปลี่ยนชั่วคราวได้ที่หน้ารายการคำนวณ">
            <Select {...register('reportLang')}>
              {Object.entries(REPORT_LANG_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-slate-700">โลโก้บริษัท</span>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-1.5">
                {logo ? <img src={logo} alt="โลโก้บริษัท" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">ยังไม่มีโลโก้</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50 focus-within:ring-2 focus-within:ring-sel">
                  <ImagePlus size={16} aria-hidden /> {logo ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={(e) => (pickLogo(e.target.files?.[0]), (e.target.value = ''))} />
                </label>
                {logo && (
                  <button type="button" onClick={() => setValue('logo', '', { shouldDirty: true })} className="inline-flex h-8 items-center gap-1.5 text-xs text-fail hover:underline">
                    <Trash2 size={14} aria-hidden /> ลบโลโก้
                  </button>
                )}
              </div>
            </div>
            <span className={clsx('text-xs', logoError || errors.logo ? 'text-fail' : 'text-muted')}>
              {logoError ?? errors.logo?.message ?? 'แสดงที่กรอบชื่อแบบของ Shop drawing และหัวรายการคำนวณ · ย่อให้อัตโนมัติ (สูงสุด 600×240 px)'}
            </span>
          </div>
        </section>

        <section aria-labelledby="crit" className="card min-w-0 flex-[999_1_560px]">
          <div className="flex flex-col gap-3 px-5 pt-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id="crit" className="text-lg font-semibold">
                Design Criteria · Code · Parameters
              </h2>
              <span className="text-xs text-muted">ค่าเริ่มต้นของโครงการ — ชิ้นส่วนแต่ละตัวปรับได้</span>
            </div>
            <div role="tablist" className="-mb-px flex flex-wrap border-b border-line">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx('min-h-11 border-b-2 px-4 text-sm', tab === t.id ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-600 hover:text-ink')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            <div hidden={tab !== 'code'} className="grid gap-4 sm:grid-cols-2">
              <Field label="แรงดันด้านข้างคอนกรีต" hint="CEB ใช้ในตัวอย่างบทที่ 8–10 ของหนังสือ">
                <Select {...register('criteria.pressureMethod')}>
                  <option value="CEB">CEB — ค่าต่ำสุดของ 3 กรณี (สมการ 2.12–2.14)</option>
                  <option value="ACI347">ACI 347 (สมการ 2.7–2.9)</option>
                  <option value="CIRA">CIRA (ตาราง 2.3–2.5)</option>
                  <option value="HYDROSTATIC">แรงดันของเหลวเต็มความสูง γH</option>
                </Select>
              </Field>
              <Field label="น้ำหนักแนวดิ่ง (พื้น/คาน)">
                <Select {...register('criteria.verticalMethod')}>
                  <option value="ACI347">ACI 347 (LL ≥ 245 กก./ม.²)</option>
                  <option value="CEB">CEB (ตาราง 2.7)</option>
                  <option value="CIRA">CIRA (ตาราง 2.7, γ 2,500)</option>
                </Select>
              </Field>
              <Field label="วิธีออกแบบ">
                <Select disabled>
                  <option>Allowable Stress Design (หน่วยแรงที่ยอมให้)</option>
                </Select>
              </Field>
              <Field label="ระบบหน่วย">
                <Select disabled>
                  <option>MKS — กก., ซม., ม. (ตามหนังสือ)</option>
                </Select>
              </Field>
              <div className="rounded-lg border border-line bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700 sm:col-span-2">
                <b className="text-ink">สูตรที่ใช้:</b>{' '}
                {method === 'ACI347' && <span className="num">P = 150 + 9000R/T (psf) ≤ 9,760 (กำแพง) / 14,640 (เสา) กก./ม.² และ ≤ γh</span>}
                {method === 'CEB' && <span className="num">P = min(γH, 2400kR + 500, 300R + 10000d + 1500) กก./ม.²</span>}
                {method === 'CIRA' && <span className="num">P = min(ตาราง 2.3, 2.4, 2.5), γ = 2,500 กก./ม.³</span>}
                {method === 'HYDROSTATIC' && <span className="num">P = γ·H</span>}
              </div>
              <div className="rounded-lg border border-line p-4 sm:col-span-2">
                <MethodCard m={METHOD_INFO[method]} compact />
                <Link to="/reference" className="mt-3 inline-block text-[13px] font-medium text-brand hover:underline">
                  เปรียบเทียบทุกวิธี และตารางสมการอ้างอิงทั้งหมด →
                </Link>
              </div>
            </div>

            <div hidden={tab !== 'load'} className="grid gap-4 sm:grid-cols-3">
              <Field label="อัตราการเท R" error={crit?.R?.message}>
                <NumberInput unit="ม./ชม." {...register('criteria.R', { valueAsNumber: true })} />
              </Field>
              <Field label="อุณหภูมิคอนกรีต T" error={crit?.T?.message}>
                <NumberInput unit="°C" {...register('criteria.T', { valueAsNumber: true })} />
              </Field>
              <Field label="ค่ายุบตัว (Slump)" error={crit?.slump?.message}>
                <NumberInput unit="ซม." {...register('criteria.slump', { valueAsNumber: true })} />
              </Field>
              <Field label="หน่วยน้ำหนักคอนกรีต γ" error={crit?.gamma?.message}>
                <NumberInput unit="กก./ม.³" {...register('criteria.gamma', { valueAsNumber: true })} />
              </Field>
              <Field label="เพิ่มผลการจี้เขย่า" hint="ACI-622: 0.10–0.20" error={crit?.vibrationFactor?.message}>
                <NumberInput unit="×" {...register('criteria.vibrationFactor', { valueAsNumber: true })} />
              </Field>
              <Field label="แรงลม (ค้ำยัน)" hint="ประเทศไทย 50–100" error={crit?.windLoad?.message}>
                <NumberInput unit="กก./ม.²" {...register('criteria.windLoad', { valueAsNumber: true })} />
              </Field>
              <Field label="น้ำหนักจรขณะก่อสร้าง" error={crit?.liveLoad?.message}>
                <NumberInput unit="กก./ม.²" {...register('criteria.liveLoad', { valueAsNumber: true })} />
              </Field>
              <Field label="น้ำหนักแบบหล่อ" hint="15–75, ทั่วไป 50" error={crit?.formWeight?.message}>
                <NumberInput unit="กก./ม.²" {...register('criteria.formWeight', { valueAsNumber: true })} />
              </Field>
            </div>

            <div hidden={tab !== 'mat'} className="grid gap-4 sm:grid-cols-2">
              <Field label="ไม้อัด (แผ่นผิวแบบ)">
                <Select {...register('criteria.defaults.plywoodId')}>
                  {PLYWOOD.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — Fb {m.Fb}, E {m.E.toLocaleString()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ความหนาไม้อัด">
                <Select {...register('criteria.defaults.plywoodThicknessMm', { valueAsNumber: true })}>
                  {PLYWOOD_THICKNESS.map((t) => (
                    <option key={t} value={t}>
                      {t} มม.
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ไม้แปรรูป (เคร่า/คร่าว)">
                <Select {...register('criteria.defaults.timberId')}>
                  {TIMBER.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — Fb {m.Fb}, Fv {m.Fv}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="เหล็กรูปพรรณ">
                <Select {...register('criteria.defaults.steelId')}>
                  {STEEL.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — Fb {m.Fb}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Form tie">
                <Select {...register('criteria.defaults.tieId')}>
                  {TIES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — SWL {t.swl.toLocaleString()} กก.
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-xs leading-relaxed text-muted sm:col-span-2">หน่วยแรงที่ยอมให้จากตาราง 3.4, 3.5, 3.7 และตาราง 4.6 ของหนังสือ — หน่วย กก./ซม.²</p>
            </div>

            <div hidden={tab !== 'def'} className="grid gap-4 sm:grid-cols-2">
              <Field label="เกณฑ์การแอ่นตัว L /" hint="หนังสือใช้ L/360" error={crit?.deflectionRatio?.message}>
                <NumberInput unit="—" {...register('criteria.deflectionRatio', { valueAsNumber: true })} />
              </Field>
              <Field label="จำกัดค่าสูงสุดเพิ่มเติม" hint="เว้นว่าง = ใช้ L/ratio อย่างเดียว · ทั่วไป 1.5 (แผ่นผิว) – 3 มม." error={crit?.deflectionAbsMm?.message}>
                <NumberInput unit="มม." placeholder="—" {...register('criteria.deflectionAbsMm', { setValueAs: (v) => (v === '' || v === null || Number.isNaN(Number(v)) ? null : Number(v)) })} />
              </Field>
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 text-sm sm:col-span-2">
                <span>
                  ตรวจแรงเฉือนไม้ (สมการ 5.13, ลดช่วง l − 2d)
                  <span className="block text-xs text-muted">ตารางออกแบบบทที่ 8 ควบคุมด้วยแรงเฉือน — ตัวอย่างคำนวณตรงไม่ได้ตรวจ แนะนำให้เปิด</span>
                </span>
                <input type="checkbox" className="size-4 accent-brand" {...register('criteria.checkTimberShear')} />
              </label>
              <div className="rounded-lg border border-line p-4 text-[13px] sm:col-span-2">
                <h3 className="mb-2 font-semibold">อัตราส่วนความปลอดภัยอุปกรณ์ (ตาราง 5.1)</h3>
                <ul className="grid gap-1 text-slate-700 sm:grid-cols-2">
                  <li>Form tie งานเบา (สูง ≤ 5 ม.) — 1.5</li>
                  <li>Form tie งานหนัก (สูง &gt; 5 ม.) — 2.0</li>
                  <li>Anchor — 1.5 / 2.0 / 3.0 (แรงกระแทก)</li>
                  <li>Hanger — 1.5 / 2.0</li>
                </ul>
                <p className="mt-2 text-xs text-muted">กำลังไทร์ใช้ค่า Working load ในตาราง 4.6 (= 0.70 × กำลังประลัย){absMm ? ` · จำกัดการแอ่นตัว ≤ ${absMm} มม.` : ''}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      {project && <DeleteProjectModal project={deleting ? project : null} onClose={() => setDeleting(false)} onDeleted={() => navigate('/', { replace: true })} />}
    </form>
  )
}
