// Calculation report, laid out as A4 sheets. "Save as PDF" goes through the browser's print dialog so Thai
// text shapes correctly; @page margin boxes carry the running header/footer and page numbers.
import clsx from 'clsx'
import { ChevronLeft, Loader2, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Select, Toggle } from '@/components/ui'
import { elementSize, runDesign, TYPE_LABEL } from '@/data/elements'
import { useElements, useProject } from '@/data/hooks'
import { type Criteria, DEFAULT_CRITERIA, REPORT_LANG_LABEL, type ReportLang } from '@/data/types'
import { HTML_LANG, LOCALE, translate, useTranslatedDom } from '@/i18n/report'
import { ElementReport, InfoGrid, type ReportOptions, Section, Signatures } from '@/report/CalcReport'

const cssString = (s: string) => `"${s.replace(/["\\]/g, '\\$&').replace(/\n/g, ' ')}"`

export function ReportPage() {
  const { projectId, elementId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const { user } = useAuth()
  const [opts, setOpts] = useState<ReportOptions>({ trace: true, drawings: true })
  /** report language: the project's setting, overridable here for this print */
  const [langPick, setLang] = useState<ReportLang>()
  const lang: ReportLang = langPick ?? project?.reportLang ?? 'th'
  const reportRef = useTranslatedDom(lang)
  const tr = (s: string) => translate(s, lang)

  const criteria: Criteria = { ...DEFAULT_CRITERIA, ...project?.criteria }
  const list = useMemo(() => {
    const els = (elements ?? []).filter((e) => !elementId || e.id === elementId).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    return els.map((el) => {
      try {
        return { el, run: runDesign(el, criteria) }
      } catch (e) {
        return { el, error: (e as Error).message }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, elementId, project?.criteria])

  const today = new Date().toLocaleDateString(LOCALE[lang], { year: 'numeric', month: 'short', day: 'numeric' })
  const single = elementId ? list[0]?.el : undefined

  useEffect(() => {
    if (!project) return
    const prev = document.title
    document.title = `${project.projectNo}_${single ? single.code : 'all'}_formwork-calc`
    return () => {
      document.title = prev
    }
  }, [project, single])

  if (project === undefined || elements === undefined)
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!project || (elementId && !single)) return <p className="p-10 text-center text-muted">ไม่พบข้อมูล</p>

  const designer = user?.displayName ?? ''
  const pageCss = `
@page {
  size: A4;
  margin: 16mm 13mm 15mm;
  @top-left { content: ${cssString(`${project.projectNo} · ${project.name}`)}; font: 8pt 'IBM Plex Sans Thai', sans-serif; color: #5b6576; }
  @top-right { content: ${cssString(tr(single ? `รายการคำนวณแบบหล่อ ${single.code} · Rev ${project.revision}` : `รายการคำนวณแบบหล่อ · Rev ${project.revision}`))}; font: 8pt 'IBM Plex Sans Thai', sans-serif; color: #5b6576; }
  @bottom-left { content: ${cssString(tr(`FormWork Studio · พิมพ์ ${today}`))}; font: 8pt 'IBM Plex Sans Thai', sans-serif; color: #5b6576; }
  @bottom-right { content: ${cssString(tr('หน้า') + ' ')} counter(page) " / " counter(pages); font: 8pt 'IBM Plex Sans Thai', sans-serif; color: #5b6576; }
}`

  const back = single ? `/projects/${project.id}/elements/${single.id}` : `/projects/${project.id}`
  return (
    <div className="min-h-dvh bg-slate-300/60 print:bg-white">
      <style>{pageCss}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-white px-4 py-2.5 shadow-sm print:hidden sm:px-6">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> กลับ
        </Link>
        <h1 className="text-sm font-semibold">
          รายการคำนวณ · {project.projectNo} {single ? `· ${single.code}` : `· ทั้งโครงการ (${list.length} ชิ้นส่วน)`}
        </h1>
        <div className="flex items-center gap-4">
          <Toggle label="ขั้นตอนคำนวณละเอียด" checked={opts.trace} onChange={(v) => setOpts({ ...opts, trace: v })} />
          <Toggle label="แบบร่างการจัดวาง" checked={opts.drawings} onChange={(v) => setOpts({ ...opts, drawings: v })} />
          <label className="flex items-center gap-2 text-sm">
            ภาษา
            <Select value={lang} onChange={(e) => setLang(e.target.value as ReportLang)} className="h-9 w-32" aria-label="ภาษารายการคำนวณ">
              {Object.entries(REPORT_LANG_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted md:inline">เลือกปลายทาง “บันทึกเป็น PDF” ในหน้าต่างพิมพ์</span>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover">
            <Printer size={16} /> พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <main key={lang} ref={reportRef} lang={HTML_LANG[lang]} className="report mx-auto flex w-full max-w-[210mm] flex-col gap-6 py-6 print:block print:max-w-none print:py-0">
        {!single && (
          <div className="sheet">
            <header className="border-b-[3px] border-ink pb-3">
              {project.logo && <img src={project.logo} alt="logo" className="mb-3 h-16 max-w-[70mm] object-contain" />}
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Formwork Design Calculation</p>
              <h2 className="text-2xl font-bold">รายการคำนวณออกแบบแบบหล่อคอนกรีต</h2>
              <p className="text-lg">{project.name}</p>
            </header>
            <div className="mt-4">
              <InfoGrid
                rows={[
                  ['Project No.', <span className="num">{project.projectNo}</span>],
                  ['Revision', project.revision],
                  ['Client', project.client],
                  ['Contractor', project.contractor],
                  ['Subcontractor', project.subcontractor],
                  ['Location', project.location],
                  ['ผู้คำนวณ', designer],
                  ['วันที่', today],
                ]}
              />
              {project.note && <p className="mt-2 whitespace-pre-line text-[11.5px] text-slate-700">{project.note}</p>}
            </div>
            <Section n="" title="สารบัญชิ้นส่วนและผลการออกแบบ">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    {['รหัส', 'ชนิด', 'ขนาด', 'ชั้น / โซน', 'จำนวน', 'Ratio', 'ผล'].map((h) => (
                      <th key={h} className="border border-slate-300 px-1.5 py-1 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ el, run }) => (
                    <tr key={el.id}>
                      <td className="num border border-slate-300 px-1.5 py-0.5 font-medium">{el.code}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5">{TYPE_LABEL[el.type]}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5">{elementSize(el)}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5">{el.level || '–'}</td>
                      <td className="num border border-slate-300 px-1.5 py-0.5 text-right">{el.qty}</td>
                      <td className="num border border-slate-300 px-1.5 py-0.5 text-right">{run ? run.design.maxRatio.toFixed(3) : '–'}</td>
                      <td className={clsx('border border-slate-300 px-1.5 py-0.5 text-center font-bold', !run || run.design.status === 'fail' ? 'text-fail' : 'text-ok')}>{!run ? 'ERR' : run.design.status === 'fail' ? 'NG' : 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
            <Signatures designer={designer} />
          </div>
        )}
        {list.map(({ el, run, error }) => (
          <div key={el.id} className="sheet print:break-before-page">
            {run ? <ElementReport project={project} criteria={criteria} el={el} run={run} opts={opts} designer={designer} /> : <p className="text-fail">{el.code}: คำนวณไม่ได้ — {error}</p>}
          </div>
        ))}
        {list.length === 0 && <p className="sheet text-center text-muted">ยังไม่มีชิ้นส่วนในโครงการ</p>}
      </main>
    </div>
  )
}
