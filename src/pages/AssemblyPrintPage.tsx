// Form Assembly print sheets (A3 landscape, print → PDF) with DXF export: a fabrication sheet per panel and an assembly
// drawing per assembly (plan, face elevations, panel schedule, wales, assembly sequence, checks).
// ?panel=<id> or ?asm=<id> for one sheet; ?what=panels or ?what=assemblies for all of them.
import { ChevronLeft, FileDown, Loader2, Printer, ZoomIn, ZoomOut } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { FaceElevation, PlanView } from '@/components/assembly/FaceViews'
import { PanelDrawing } from '@/components/assembly/PanelDrawing'
import { useAssemblies, useElements, usePanels, useProject } from '@/data/hooks'
import { type Criteria, DEFAULT_CRITERIA, FACE_KEYS, type FaceKey, type FormPanel, type Project, shopSettings } from '@/data/types'
import { getMaterial, getSection } from '@/engine'
import { FACE_LABEL } from '@/model/assembly'
import { assembly3d } from '@/model/assembly3d'
import { type AnalyzedAssembly, analyzeAll } from '@/model/assemblyReport'
import { EDGE_LABEL, MEMBER_LABEL, panelLayout } from '@/model/panel'
import { download } from '@/report/dxf'
import { faceView, panelView, viewsToDxf } from '@/report/assemblyDxf'

const btn = 'inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50'
const LAY_LABEL = { auto: 'อัตโนมัติ', 'long-width': 'ด้านยาวตามกว้าง', 'long-height': 'ด้านยาวตามสูง' } as const

export function AssemblyPrintPage() {
  const { projectId } = useParams()
  const [params] = useSearchParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const panels = usePanels(projectId)
  const assemblies = useAssemblies(projectId)
  const { user } = useAuth()
  const [zoom, setZoom] = useState(() => Math.min(1, Math.max(0.35, (window.innerWidth - 48) / 1600)))
  const criteria: Criteria = useMemo(() => ({ ...DEFAULT_CRITERIA, ...project?.criteria }), [project?.criteria])

  const panelId = params.get('panel')
  const asmId = params.get('asm')
  const what = params.get('what')
  const showPanels = (panels ?? []).filter((p) => (panelId ? p.id === panelId : what === 'panels'))
  const all = useMemo(() => (assemblies && elements && panels ? analyzeAll(assemblies, elements, panels, criteria) : []), [assemblies, elements, panels, criteria])
  const showAsm = all.filter((a) => (asmId ? a.assembly.id === asmId : what === 'assemblies'))

  useEffect(() => {
    if (!project) return
    const prev = document.title
    document.title = `${project.projectNo}_form-assembly`
    return () => {
      document.title = prev
    }
  }, [project])

  if (project === undefined || elements === undefined || panels === undefined || assemblies === undefined)
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!project) return <p className="p-10 text-center text-muted">ไม่พบข้อมูล</p>

  const s = shopSettings(project)
  const meta: SheetMeta = { project, company: s.company, drawnBy: s.drawnBy || user?.displayName || '', checkedBy: s.checkedBy, today: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) }
  const titleLines = (t: string) => [`${project.name} (${project.projectNo})`, t, 'หน่วย: มิลลิเมตร (ขนาดจริง) · ตัวเลขบอกระยะเป็นเซนติเมตร']
  const panelDxf = (p: FormPanel) => download(`${project.projectNo}-FA-${p.code}.dxf`, viewsToDxf([panelView(p, panelLayout(p))], titleLines(`แบบผลิตแผง ${p.code} Rev ${project.revision}`)), 'application/dxf')
  const asmDxf = (a: AnalyzedAssembly) => {
    if (!a.result) return
    const keys: FaceKey[] = a.assembly.linked ? ['A', 'B'] : FACE_KEYS
    download(
      `${project.projectNo}-FA-${a.assembly.code}.dxf`,
      viewsToDxf(
        keys.map((k) => faceView(a.result!.faces[k], `${FACE_LABEL[k]}${a.assembly.linked ? ` (= ด้าน ${k === 'A' ? 'C' : 'D'})` : ''}`)),
        titleLines(`แบบประกอบแบบหล่อ ${a.assembly.code} — ${a.element?.code ?? ''} Rev ${project.revision}`),
      ),
      'application/dxf',
    )
  }

  return (
    <div className="min-h-dvh bg-slate-300/60 print:bg-white">
      <style>{'@page { size: A3 landscape; margin: 0; }'}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-2.5 shadow-sm print:hidden sm:px-6">
        <Link to={`/projects/${project.id}/assembly${asmId ? `?view=asm&asm=${asmId}` : panelId ? `?panel=${panelId}` : '?view=use'}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> กลับ
        </Link>
        <h1 className="text-sm font-semibold">
          Form Assembly · {project.projectNo} · {showPanels.length ? `แบบผลิตแผง ${showPanels.length} แบบ` : ''} {showAsm.length ? `แบบประกอบ ${showAsm.length} ชุด` : ''}
        </h1>
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} aria-label="ย่อ">
            <ZoomOut size={16} />
          </button>
          <span className="num w-12 text-center text-xs text-muted">{Math.round(zoom * 100)}%</span>
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} aria-label="ขยาย">
            <ZoomIn size={16} />
          </button>
        </div>
        <button type="button" onClick={() => window.print()} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Printer size={16} /> พิมพ์ / บันทึก PDF (A3)
        </button>
      </div>

      <main className="shop-zoom flex flex-col items-center gap-6 py-6 print:block print:py-0" style={{ zoom }}>
        {showPanels.map((p) => (
          <div key={p.id} className="flex flex-col items-end gap-1">
            <button type="button" className={`${btn} print:hidden`} onClick={() => panelDxf(p)}>
              <FileDown size={16} /> DXF {p.code}
            </button>
            <PanelSheet p={p} meta={meta} />
          </div>
        ))}
        {showAsm.map((a) => (
          <div key={a.assembly.id} className="flex flex-col items-end gap-1">
            {a.result && (
              <button type="button" className={`${btn} print:hidden`} onClick={() => asmDxf(a)}>
                <FileDown size={16} /> DXF {a.assembly.code}
              </button>
            )}
            <AssemblySheet a={a} meta={meta} />
          </div>
        ))}
        {!showPanels.length && !showAsm.length && <p className="shop-sheet text-center text-muted">ไม่มีแผงหรือชุดประกอบให้พิมพ์</p>}
      </main>
    </div>
  )
}

interface SheetMeta {
  project: Project
  company: string
  drawnBy: string
  checkedBy: string
  today: string
}

function Sheet({ meta, title, no, children, side }: { meta: SheetMeta; title: string; no: string; children: ReactNode; side: ReactNode }) {
  const { project } = meta
  return (
    <div className="shop-sheet">
      <div className="grid h-full grid-cols-[288mm_1fr] gap-[4mm] border border-ink p-[3mm] text-[3.2mm]">
        <div className="flex min-h-0 flex-col gap-[3mm]">{children}</div>
        <div className="flex min-h-0 flex-col gap-[3mm]">
          <div className="min-h-0 flex-1 overflow-hidden">{side}</div>
          <table className="w-full border border-slate-500 text-[2.8mm]">
            <tbody className="[&_td]:border-b [&_td]:border-slate-400 [&_td]:px-[1.5mm] [&_td]:py-[0.6mm]">
              <tr>
                <td className="w-[22mm] text-slate-500">Company</td>
                <td>{meta.company || 'FormWork Studio'}</td>
              </tr>
              <tr>
                <td className="text-slate-500">Project</td>
                <td>
                  {project.name} ({project.projectNo})
                </td>
              </tr>
              <tr>
                <td className="text-slate-500">Title</td>
                <td className="font-semibold">{title}</td>
              </tr>
              <tr>
                <td className="text-slate-500">Drawing No.</td>
                <td className="font-mono font-semibold">{no}</td>
              </tr>
              <tr>
                <td className="text-slate-500">Rev / Date</td>
                <td className="font-mono">
                  {project.revision} · {meta.today}
                </td>
              </tr>
              <tr>
                <td className="text-slate-500">Drawn / Checked</td>
                <td>
                  {meta.drawnBy || '–'} / {meta.checkedBy || '–'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border border-slate-500 text-[2.8mm]">
      <thead className="bg-slate-100">
        <tr>
          {head.map((h) => (
            <th key={h} className="border-b border-slate-500 px-[1.5mm] py-[0.6mm] text-left font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-300">
            {r.map((c, j) => (
              <td key={j} className="px-[1.5mm] py-[0.5mm] font-mono">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PanelSheet({ p, meta }: { p: FormPanel; meta: SheetMeta }) {
  const L = panelLayout(p)
  const sec = getSection(p.stud.sectionId)
  const edges = (Object.keys(p.edges) as (keyof typeof p.edges)[]).filter((e) => p.edges[e]).map((e) => EDGE_LABEL[e])
  return (
    <Sheet
      meta={meta}
      title={`แบบผลิตแผง ${p.code} ${p.width.toFixed(2)} × ${p.height.toFixed(2)} ม.`}
      no={`${meta.project.projectNo}-FA-${p.code}`}
      side={
        <div className="flex flex-col gap-[3mm]">
          <h2 className="text-[4mm] font-bold">แผง {p.code}</h2>
          {p.name && <p>{p.name}</p>}
          <Table
            head={['รายการ', 'ข้อกำหนด']}
            rows={[
              ['ขนาด', `${p.width.toFixed(2)} × ${p.height.toFixed(2)} ม.`],
              ['ไม้อัด', `${getMaterial(p.plywood.materialId).name} ${p.plywood.thicknessMm} มม.`],
              ['วางไม้อัด', LAY_LABEL[p.plywood.lay]],
              ['เคร่า', `${sec.label} ${getMaterial(p.stud.materialId).name}`],
              ['แนว / ระยะ', `${p.stud.dir === 'vertical' ? 'ตั้ง' : 'นอน'} @ไม่เกิน ${p.stud.spacingCm} ซม.`],
              ['เคร่าปิดขอบ', edges.join(' · ') || '–'],
              ['ความหนาแผง', `${(L.thickness * 100).toFixed(1)} ซม.`],
              ['น้ำหนัก (ประมาณ)', `${L.weightKg.toFixed(0)} กก.`],
              ['จำนวนที่ต้องทำ', `${p.stock ?? 0} แผง`],
            ]}
          />
          <Table head={['รายการตัด / 1 แผง', 'ยาว ม.', 'จำนวน']} rows={[[`ไม้อัด ${p.plywood.thicknessMm} มม.`, '', L.ply.length], ...L.cuts.map((c) => [`${MEMBER_LABEL[c.kind]} ${sec.label}`, c.length.toFixed(2), c.qty])]} />
          <ol className="list-decimal pl-[4mm] text-[2.8mm] leading-relaxed">
            <li>ระยะเคร่าวัดศูนย์ถึงศูนย์ (ซม.) ตามรูป มองจากด้านเคร่า</li>
            <li>รอยต่อไม้อัด (เส้นประแดง) ต้องตกบนเคร่าหรือไม้รองรอยต่อ</li>
            <li>เขียนรหัส {p.code} ที่ด้านเคร่าของทุกแผง</li>
          </ol>
        </div>
      }
    >
      <h1 className="text-[5mm] font-bold">แบบผลิตแผง {p.code}</h1>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PanelDrawing panel={p} layout={L} className="max-h-[230mm]" />
      </div>
    </Sheet>
  )
}

function AssemblySheet({ a, meta }: { a: AnalyzedAssembly; meta: SheetMeta }) {
  const { assembly, element, result } = a
  const model = useMemo(() => (result && element?.type === 'footing' ? assembly3d(result, element.input, assembly.through) : undefined), [result, element, assembly.through])
  if (!result || element?.type !== 'footing') return <p className="shop-sheet text-fail">{assembly.code}: ไม่พบฐานรากของชุดประกอบนี้</p>
  const keys: FaceKey[] = assembly.linked ? ['A', 'B'] : FACE_KEYS
  // every face at the same scale: drawing width in proportion to the face length
  const span = (k: FaceKey) => Math.max(result.specs[k].length, ...result.faces[k].courses.map((c) => c.length))
  const widest = Math.max(...keys.map(span))
  const noop = () => {}
  const checks = FACE_KEYS.flatMap((k) => result.faces[k].checks.filter((c) => c.status === 'fail' || c.status === 'warn').map((c) => `ด้าน ${k}: ${c.label}`))
  return (
    <Sheet
      meta={meta}
      title={`แบบประกอบแบบหล่อ ${assembly.code} — ${element.code} ${element.input.lengthX.toFixed(2)} × ${element.input.lengthY.toFixed(2)} × ${element.input.height.toFixed(2)} ม.`}
      no={`${meta.project.projectNo}-FA-${assembly.code}`}
      side={
        <div className="flex flex-col gap-[3mm]">
          <div className="w-[60mm] self-center">
            <PlanView specs={result.specs} lx={element.input.lengthX} ly={element.input.lengthY} selected={'A'} onSelect={noop} />
          </div>
          <Table head={['แผง', 'ขนาด', 'ใช้/ชุด', 'สต็อก']} rows={result.usage.map((u) => [u.panel.code, `${u.panel.width.toFixed(2)}×${u.panel.height.toFixed(2)}`, u.used, u.panel.stock ?? 0])} />
          {result.wales.length > 0 && <Table head={['คานรับเคร่า', 'ยาว ม.', 'ท่อน']} rows={result.wales.map((w) => [`ด้าน ${w.axis === 'x' ? 'A/C' : 'B/D'}`, w.length.toFixed(2), w.count])} />}
          {model && (
            <div>
              <p className="font-semibold">ลำดับการประกอบ</p>
              <ol className="list-decimal pl-[4mm] text-[2.8mm] leading-relaxed">
                {model.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {checks.length > 0 && (
            <div className="text-[2.8mm] text-fail">
              <p className="font-semibold">ข้อควรตรวจ</p>
              {checks.slice(0, 6).map((c) => (
                <p key={c}>• {c}</p>
              ))}
            </div>
          )}
        </div>
      }
    >
      <h1 className="text-[5mm] font-bold">
        แบบประกอบ {assembly.code} <span className="text-[3.5mm] font-normal text-slate-600">ด้านทะลุมุม {assembly.through === 'x' ? 'A/C' : 'B/D'}</span>
      </h1>
      <div className={`grid min-h-0 flex-1 gap-[4mm] ${keys.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {keys.map((k) => (
          <div key={k} className="flex min-h-0 flex-col">
            <p className="font-semibold">
              {FACE_LABEL[k]}
              {assembly.linked ? ` = ด้าน ${k === 'A' ? 'C' : 'D'}` : ''} · ยาว {result.specs[k].length.toFixed(3)} ม.
            </p>
            <div className="min-h-0 flex-1 [&_svg]:max-h-[105mm]" style={{ width: `${Math.max(25, (span(k) / widest) * 100)}%` }}>
              <FaceElevation face={result.faces[k]} editable={false} onSelect={noop} onMove={noop} />
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
