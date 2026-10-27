// Import elements from drawings: DXF plans (layers + shapes + labels) or any drawing image / PDF read by Claude.
// Every source ends in the same review table; the checked rows become project elements.
import clsx from 'clsx'
import { ChevronLeft, FileUp, KeyRound, Loader2, Sparkles, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { NumField } from '@/components/design/NumField'
import { ProjectNav } from '@/components/ProjectNav'
import { Field, Segmented, Select } from '@/components/ui'
import { runDesign, TYPE_LABEL } from '@/data/elements'
import { useElements, useProject } from '@/data/hooks'
import { useAuth } from '@/auth/AuthProvider'
import { uploadErrorMessage, uploadFile, uploadsEnabled } from '@/data/files'
import { repo } from '@/data/repo'
import { DEFAULT_CRITERIA, type ElementType } from '@/data/types'
import { AI_MODELS, type AiSchedule, loadAiSettings, readDrawing, readDrawingServer, saveAiSettings, scheduleToCandidates, SERVER_MAX_BYTES, serverAvailable } from '@/import/ai'
import { type Candidate, candidateToElement, DEFAULT_DETECT, type DetectOptions, detect, dimsText, guessRole, type Role, ROLE_LABEL } from '@/import/detect'
import { type DxfDrawing, readDxf } from '@/import/dxfRead'

const TYPE_COLOR: Record<ElementType, string> = { column: '#2563eb', wall: '#16a34a', footing: '#b45309', beam: '#9333ea', slab: '#0891b2' }
const TYPES: ElementType[] = ['column', 'wall', 'beam', 'slab', 'footing']

async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(buf)
  if (!utf8.includes('�')) return utf8
  try {
    return new TextDecoder('windows-874').decode(buf) // Thai ANSI drawings
  } catch {
    return utf8
  }
}

export function ImportPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'dxf' | 'ai'>('dxf')
  const [opt, setOpt] = useState<DetectOptions>(DEFAULT_DETECT)
  const [rows, setRows] = useState<Candidate[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  // DXF state
  const [dxfName, setDxfName] = useState<string>()
  const [dxfText, setDxfText] = useState<string>()
  const [unit, setUnit] = useState<number | undefined>()
  const [roles, setRoles] = useState<Record<string, Role>>({})
  const drawing = useMemo<DxfDrawing | undefined>(() => {
    if (!dxfText) return undefined
    try {
      return readDxf(dxfText, unit)
    } catch {
      return undefined
    }
  }, [dxfText, unit])
  const detected = useMemo(() => (drawing ? detect(drawing, roles, opt) : undefined), [drawing, roles, opt])

  // AI state
  const [ai, setAi] = useState(loadAiSettings)
  const [aiFile, setAiFile] = useState<File>()
  const [aiHint, setAiHint] = useState('')
  const [schedule, setSchedule] = useState<AiSchedule>()
  const [serverInfo, setServerInfo] = useState<string>()
  const abort = useRef<AbortController | undefined>(undefined)
  const preview = useMemo(() => (aiFile && aiFile.type.startsWith('image/') ? URL.createObjectURL(aiFile) : undefined), [aiFile])

  if (project === undefined || elements === undefined)
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!project) return <p className="p-10 text-center text-muted">ไม่พบโครงการ</p>
  const criteria = { ...DEFAULT_CRITERIA, ...project.criteria }

  // keep a copy of every imported drawing in Storage (project files, category "imports")
  const keepCopy = (f: File) => {
    if (!uploadsEnabled || !user) return
    uploadFile(f, { projectId: project.id, category: 'imports', uid: user.uid }).catch((e) => setError(`เก็บไฟล์ใน Storage ไม่สำเร็จ: ${uploadErrorMessage(e)}`))
  }

  const onDxf = async (f: File | undefined) => {
    if (!f) return
    setError(undefined)
    const text = await readText(f)
    try {
      const d = readDxf(text)
      setDxfName(f.name)
      setDxfText(text)
      setUnit(undefined)
      setRoles(Object.fromEntries(d.layers.map((l) => [l, guessRole(l)])))
      setRows(detect(d, Object.fromEntries(d.layers.map((l) => [l, guessRole(l)])), opt).candidates)
      keepCopy(f)
    } catch (e) {
      setError(`อ่านไฟล์ DXF ไม่ได้: ${(e as Error).message}`)
    }
  }
  const redetect = (r: Record<string, Role>, u = unit, o = opt) => {
    if (!dxfText) return
    const d = readDxf(dxfText, u)
    setRows(detect(d, r, o).candidates)
  }

  const runAi = async () => {
    if (!aiFile || (ai.route === 'own' && !ai.apiKey)) return
    setBusy(true)
    setError(undefined)
    setServerInfo(undefined)
    saveAiSettings(ai)
    abort.current = new AbortController()
    try {
      let s: AiSchedule
      if (ai.route === 'server') {
        const r = await readDrawingServer(aiFile, { model: ai.model, hint: aiHint, signal: abort.current.signal })
        s = r.schedule
        setServerInfo(`อ่านด้วย ${r.model} · ${r.usage.input_tokens.toLocaleString()} + ${r.usage.output_tokens.toLocaleString()} tokens · เหลือวันนี้ ${r.remaining} ครั้ง`)
      } else s = await readDrawing(aiFile, { ...ai, hint: aiHint, signal: abort.current.signal })
      setSchedule(s)
      setRows(scheduleToCandidates(s, opt))
      keepCopy(aiFile)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    const chosen = rows.filter((r) => r.include)
    if (!chosen.length) return
    setBusy(true)
    try {
      let existing = [...elements]
      for (const c of chosen) {
        const el = candidateToElement(c, criteria, existing)
        let data = el
        try {
          const d = runDesign(el, criteria).design
          data = { ...el, result: { status: d.status, maxRatio: d.maxRatio, pressure: d.pressure.Pmax } }
        } catch {
          /* saved without a result; the element page shows the error */
        }
        const id = await repo.createElement(project.id, data)
        existing = [...existing, { ...data, id, projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }]
      }
      navigate(`/projects/${project.id}`)
    } catch (e) {
      setError(`สร้างชิ้นส่วนไม่สำเร็จ: ${(e as Error).message}`)
      setBusy(false)
    }
  }

  const patch = (k: string, p: Partial<Candidate>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...p } : r)))
  const included = rows.filter((r) => r.include)
  const codesInProject = new Set(elements.map((e) => e.code))

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-6 sm:px-8">
      <Link to={`/projects/${project.id}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> {project.name}
      </Link>
      <ProjectNav projectId={project.id} />
      <div>
        <h1 className="text-2xl font-bold">นำเข้าชิ้นส่วนจากแบบ</h1>
        <p className="text-sm text-muted">อ่านเสา กำแพง คาน พื้น และฐานรากจากไฟล์ DXF หรือให้ AI อ่านจากรูป/PDF แล้วตรวจทานก่อนสร้างชิ้นส่วน</p>
      </div>

      <div className="flex w-fit rounded-lg border border-line bg-white p-0.5" role="tablist">
        {(
          [
            ['dxf', 'ไฟล์ DXF (AutoCAD)', FileUp],
            ['ai', 'AI อ่านแบบ (รูป / PDF)', Sparkles],
          ] as const
        ).map(([k, l, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx('inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium', tab === k ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      <section className="card grid gap-3 p-4 sm:grid-cols-4">
        {(
          [
            ['storeyH', 'ความสูงชั้น (พื้นถึงพื้น)', 'ม.'],
            ['slabT', 'ความหนาพื้น', 'ม.'],
            ['beamH', 'ความลึกคาน (ถ้าไม่ระบุ)', 'ม.'],
            ['footingH', 'ความลึกฐานราก (ถ้าไม่ระบุ)', 'ม.'],
          ] as const
        ).map(([k, l, u]) => (
          <NumField
            key={k}
            label={l}
            unit={u}
            value={opt[k]}
            min={0.05}
            max={20}
            onChange={(v) => {
              if (!v) return
              const o = { ...opt, [k]: v }
              setOpt(o)
              if (tab === 'dxf') redetect(roles, unit, o)
              else if (schedule) setRows(scheduleToCandidates(schedule, o))
            }}
          />
        ))}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-fail">{error}</p>}

      {tab === 'dxf' ? (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <section className="card flex flex-col gap-3 p-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm hover:border-sel">
              <Upload size={22} className="text-muted" />
              <span>{dxfName ?? 'เลือกไฟล์ .dxf (ASCII)'}</span>
              <span className="text-xs text-muted">ไฟล์ DWG ให้ Save As เป็น DXF ก่อน · อ่านในเบราว์เซอร์ ไม่อัปโหลดไปที่ใด</span>
              <input type="file" accept=".dxf" className="sr-only" onChange={(e) => onDxf(e.target.files?.[0])} />
            </label>
            {drawing && (
              <>
                <Field label={`หน่วยในแบบ (ตรวจพบ: ${drawing.unitsLabel})`}>
                  <Select
                    value={unit ?? ''}
                    onChange={(e) => {
                      const u = e.target.value ? Number(e.target.value) : undefined
                      setUnit(u)
                      redetect(roles, u)
                    }}
                  >
                    <option value="">อัตโนมัติ</option>
                    <option value={0.001}>มิลลิเมตร</option>
                    <option value={0.01}>เซนติเมตร</option>
                    <option value={1}>เมตร</option>
                  </Select>
                </Field>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">เลเยอร์ → ชนิดชิ้นส่วน</h3>
                  <div className="max-h-[360px] overflow-y-auto rounded-lg border border-line">
                    {drawing.layers.map((l) => (
                      <div key={l} className="flex items-center gap-2 border-b border-slate-100 px-2 py-1 last:border-0">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs" title={l}>
                          {l}
                        </span>
                        <span className="text-[11px] text-muted">{drawing.entities.filter((e) => e.layer === l).length}</span>
                        <select
                          className="h-7 rounded border border-line bg-white px-1 text-xs"
                          value={roles[l] ?? 'auto'}
                          aria-label={`ชนิดของเลเยอร์ ${l}`}
                          onChange={(e) => {
                            const r = { ...roles, [l]: e.target.value as Role }
                            setRoles(r)
                            redetect(r)
                          }}
                        >
                          {Object.entries(ROLE_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
          <section className="card overflow-hidden">
            {drawing && detected ? <PlanPreview d={drawing} assigned={detected.assigned} shapes={detected.shapes} /> : <p className="grid h-[420px] place-items-center text-sm text-muted">ตัวอย่างแปลนจะแสดงที่นี่</p>}
          </section>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <section className="card flex flex-col gap-3 p-4">
            {serverAvailable && (
              <Segmented
                label="เรียก AI ผ่าน"
                value={ai.route}
                options={[
                  { value: 'server', label: 'เซิร์ฟเวอร์ของบริษัท' },
                  { value: 'own', label: 'API key ของฉัน' },
                ]}
                onChange={(route) => setAi({ ...ai, route })}
              />
            )}
            {ai.route === 'server' ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                ใช้คีย์ที่เก็บบนเซิร์ฟเวอร์ (Cloud Function) — ไม่ต้องกรอกคีย์ · ต้องเข้าสู่ระบบ · มีโควตาต่อวัน · ไฟล์ไม่เกิน {SERVER_MAX_BYTES / 1024 / 1024} MB
              </p>
            ) : (
              <Field label="Anthropic API key" hint="เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น — ไฟล์แบบจะถูกส่งไปยัง Claude API เพื่ออ่าน">
                <div className="relative">
                  <KeyRound size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="password" className="input pl-8" placeholder="sk-ant-…" value={ai.apiKey} autoComplete="off" onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} />
                </div>
              </Field>
            )}
            <Field label="โมเดล">
              <Select value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })}>
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm hover:border-sel">
              <Upload size={22} className="text-muted" />
              <span>{aiFile?.name ?? 'เลือกรูปแบบ (PNG/JPG) หรือ PDF'}</span>
              <span className="text-xs text-muted">แปลนโครงสร้าง ตารางเสา/คาน/ฐานราก หรือรูปตัด · PDF ไม่เกิน 32 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="sr-only" onChange={(e) => setAiFile(e.target.files?.[0])} />
            </label>
            <Field label="หมายเหตุถึง AI (ไม่บังคับ)">
              <textarea className="input min-h-[64px] py-2" placeholder="เช่น แบบชั้น 2 หน่วยเป็นมิลลิเมตร ให้ข้ามบันได" value={aiHint} onChange={(e) => setAiHint(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button type="button" disabled={!aiFile || (ai.route === 'own' && !ai.apiKey) || busy} onClick={runAi} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? 'กำลังอ่านแบบ…' : 'อ่านแบบด้วย AI'}
              </button>
              {busy && (
                <button type="button" onClick={() => abort.current?.abort()} className="h-10 rounded-lg border border-slate-300 px-3 text-sm">
                  ยกเลิก
                </button>
              )}
            </div>
            <p className="text-xs text-muted">ผลจาก AI อาจผิดพลาด ตรวจขนาดและจำนวนทุกแถวกับแบบก่อนสร้างชิ้นส่วน</p>
          </section>
          <section className="card flex flex-col gap-3 overflow-hidden p-4">
            {schedule && (
              <div className="text-sm">
                <b>{schedule.drawing_title || 'ผลการอ่านแบบ'}</b>
                <span className="ml-2 text-muted">
                  {schedule.storey_height_m ? `สูงชั้น ${schedule.storey_height_m} ม. · ` : ''}
                  {schedule.slab_thickness_cm ? `พื้นหนา ${schedule.slab_thickness_cm} ซม.` : ''}
                </span>
                {serverInfo && <span className="ml-2 text-xs text-muted">· {serverInfo}</span>}
                {schedule.warnings.length > 0 && (
                  <ul className="mt-2 list-disc rounded-lg bg-amber-50 py-2 pl-6 pr-3 text-[13px] text-warn">
                    {schedule.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {preview ? <img src={preview} alt="แบบที่เลือก" className="max-h-[520px] w-full rounded-lg border border-line object-contain" /> : <p className="grid h-[300px] place-items-center text-sm text-muted">{aiFile ? aiFile.name : 'ตัวอย่างแบบจะแสดงที่นี่'}</p>}
          </section>
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="font-semibold">ตรวจทานรายการ ({included.length}/{rows.length} รายการ · {included.reduce((a, r) => a + r.qty, 0)} ชุด)</h2>
          <button type="button" disabled={!included.length || busy} onClick={create} className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
            สร้าง {included.length} ชิ้นส่วนในโครงการ
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">ยังไม่มีรายการ — เลือกไฟล์ด้านบน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="px-2 py-2 text-left font-medium">ชนิด</th>
                  <th className="px-2 py-2 text-left font-medium">รหัส</th>
                  <th className="px-2 py-2 text-left font-medium">ขนาด</th>
                  <th className="w-20 px-2 py-2 text-right font-medium">จำนวน</th>
                  <th className="px-2 py-2 text-left font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.key} className={clsx(!r.include && 'opacity-50')}>
                    <td className="px-3 py-1.5">
                      <input type="checkbox" className="size-4 accent-brand" checked={r.include} aria-label={`นำเข้า ${r.code}`} onChange={(e) => patch(r.key, { include: e.target.checked })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: TYPE_COLOR[r.type] }} />
                      <select className="h-8 rounded border border-line bg-white px-1 text-sm" value={r.type} aria-label="ชนิด" onChange={(e) => patch(r.key, { type: e.target.value as ElementType })}>
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input className={clsx('input num h-8 w-24', codesInProject.has(r.code) && 'border-amber-400')} value={r.code} aria-label="รหัส" title={codesInProject.has(r.code) ? 'มีรหัสนี้ในโครงการแล้ว' : undefined} onChange={(e) => patch(r.key, { code: e.target.value })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <DimsEditor c={r} onChange={(dims) => patch(r.key, { dims })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input className="input num h-8 w-16 text-right" inputMode="numeric" value={r.qty} aria-label="จำนวน" onChange={(e) => patch(r.key, { qty: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
                    </td>
                    <td className="max-w-[320px] px-2 py-1.5 text-xs text-muted">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const DIM_FIELDS: Record<ElementType, [keyof Candidate['dims'], string, number][]> = {
  column: [
    ['b', 'b ซม.', 100],
    ['h', 'h ซม.', 100],
    ['height', 'H ม.', 1],
  ],
  wall: [
    ['thickness', 't ซม.', 100],
    ['length', 'L ม.', 1],
    ['height', 'H ม.', 1],
  ],
  beam: [
    ['b', 'b ซม.', 100],
    ['depth', 'h ซม.', 100],
    ['length', 'L ม.', 1],
  ],
  slab: [
    ['thickness', 't ซม.', 100],
    ['lengthX', 'X ม.', 1],
    ['lengthY', 'Y ม.', 1],
  ],
  footing: [
    ['lengthX', 'X ม.', 1],
    ['lengthY', 'Y ม.', 1],
    ['height', 'ลึก ม.', 1],
  ],
}

function DimsEditor({ c, onChange }: { c: Candidate; onChange: (d: Candidate['dims']) => void }) {
  return (
    <div className="flex items-center gap-1.5" title={dimsText(c)}>
      {DIM_FIELDS[c.type].map(([k, label, scale]) => (
        <label key={k} className="flex items-center gap-1 text-[11px] text-muted">
          {label}
          <input
            className="input num h-8 w-16 px-1.5 text-right text-sm"
            inputMode="decimal"
            defaultValue={c.dims[k] !== undefined ? Math.round(c.dims[k]! * scale * 100) / 100 : ''}
            key={`${c.key}-${c.type}-${k}`}
            onBlur={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v > 0) onChange({ ...c.dims, [k]: v / scale })
            }}
          />
        </label>
      ))}
    </div>
  )
}

/** Plan of the DXF with detected shapes coloured by element type. */
function PlanPreview({ d, shapes, assigned }: { d: DxfDrawing; shapes: { id: string; poly: [number, number][]; kind: string; cx: number; cy: number; long: number }[]; assigned: Map<string, ElementType> }) {
  const W = 1000
  const H = 640
  const [x0, y0] = d.bounds.min
  const [x1, y1] = d.bounds.max
  const s = Math.min((W - 20) / (x1 - x0 || 1), (H - 20) / (y1 - y0 || 1))
  const X = (x: number) => 10 + (x - x0) * s
  const Y = (y: number) => H - 10 - (y - y0) * s
  const lines: string[] = []
  for (const e of d.entities.slice(0, 40000)) {
    if (e.kind === 'line') lines.push(`M${X(e.a[0]).toFixed(1)} ${Y(e.a[1]).toFixed(1)}L${X(e.b[0]).toFixed(1)} ${Y(e.b[1]).toFixed(1)}`)
    else if (e.kind === 'poly' && e.pts.length > 1) lines.push(`M${e.pts.map((p) => `${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('L')}${e.closed ? 'Z' : ''}`)
  }
  const counts = new Map<ElementType, number>()
  for (const t of assigned.values()) counts.set(t, (counts.get(t) ?? 0) + 1)
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full bg-slate-50" role="img" aria-label="แปลนจากไฟล์ DXF">
        <path d={lines.join('')} fill="none" stroke="#94a3b8" strokeWidth={0.6} />
        {shapes.map((sh) => {
          const t = assigned.get(sh.id)
          if (!t) return null
          return sh.kind === 'circle' ? (
            <circle key={sh.id} cx={X(sh.cx)} cy={Y(sh.cy)} r={Math.max((sh.long / 2) * s, 2)} fill={TYPE_COLOR[t]} fillOpacity={0.35} stroke={TYPE_COLOR[t]} strokeWidth={1.2} />
          ) : (
            <polygon key={sh.id} points={sh.poly.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')} fill={TYPE_COLOR[t]} fillOpacity={0.35} stroke={TYPE_COLOR[t]} strokeWidth={1.2} />
          )
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-3 border-t border-line px-3 py-2 text-xs text-muted">
        {TYPES.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: TYPE_COLOR[t] }} />
            {TYPE_LABEL[t]} {counts.get(t) ?? 0}
          </span>
        ))}
        <span className="ml-auto">
          {d.entities.length.toLocaleString()} วัตถุ · หน่วย {d.unitsLabel} · {(d.bounds.max[0] - d.bounds.min[0]).toFixed(1)} × {(d.bounds.max[1] - d.bounds.min[1]).toFixed(1)} ม.
        </span>
      </figcaption>
    </figure>
  )
}
