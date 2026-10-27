// Shop drawings (A3 landscape) for one element or the whole project; print → PDF, DXF and BOM CSV export.
import { ChevronLeft, FileDown, Loader2, Printer, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { runDesign, TYPE_LABEL } from '@/data/elements'
import { useElements, useProject } from '@/data/hooks'
import { type Criteria, DEFAULT_CRITERIA, shopSettings } from '@/data/types'
import { toCsv } from '@/model/bom'
import { download, toDxf } from '@/report/dxf'
import { drawingNo, type ShopData, shopData, ShopSheets } from '@/report/ShopSheet'

const btn = 'inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50'

export function ShopPage() {
  const { projectId, elementId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const { user } = useAuth()
  const [zoom, setZoom] = useState(() => Math.min(1, Math.max(0.35, (window.innerWidth - 48) / 1600)))

  const criteria: Criteria = { ...DEFAULT_CRITERIA, ...project?.criteria }
  const list = useMemo(() => {
    const els = (elements ?? []).filter((e) => !elementId || e.id === elementId).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    return els.map((el) => {
      try {
        return { el, d: shopData(el, runDesign(el, criteria)) }
      } catch (e) {
        return { el, error: (e as Error).message }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, elementId, project?.criteria])
  const single = elementId ? list[0]?.el : undefined

  useEffect(() => {
    if (!project) return
    const prev = document.title
    document.title = `${project.projectNo}_${single ? single.code : 'all'}_shop-drawing`
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

  const base = shopSettings(project)
  const settings = { ...base, drawnBy: base.drawnBy || user?.displayName || '' }
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  const ready = list.filter((x): x is { el: (typeof list)[number]['el']; d: ShopData } => 'd' in x && !!x.d)

  const dxf = (d: ShopData) =>
    download(
      `${drawingNo(project, d.el)}.dxf`,
      toDxf(
        [
          { ...d.views.a, title: d.views.a.title.split(' — ')[0] },
          { ...d.views.b, title: d.views.b.title.split(' — ')[0] },
        ],
        [`${project.name} (${project.projectNo})`, `SHOP DRAWING แบบหล่อ${TYPE_LABEL[d.el.type]} ${d.el.code} — ${drawingNo(project, d.el)} Rev ${project.revision}`, 'หน่วย: มิลลิเมตร (ขนาดจริง) · ตัวเลขบอกระยะเป็นเซนติเมตร'],
        {
          marks: d.lines.filter((l) => l.category !== 'accessory').map((l) => ({ mark: l.mark, partIds: l.partIds })),
          table: [['Mark', 'รายการ', 'ขนาด / ความยาว', 'จำนวน', 'หน่วย'], ...d.lines.map((l) => [String(l.mark), l.description, l.size, String(l.qty), l.unit])],
          notes: [`ไม้อัดตามแผนตัด ${d.cut.length} แผ่น/ชุด`, `จำนวน ${d.el.qty} ชุด · ชั้น/โซน ${d.el.level || '–'}`, 'แผนการตัดไม้อัดและลำดับงาน ดู Shop drawing PDF แผ่นที่ 2'],
          titleBlock: [
            ['Company', settings.company || 'FormWork Studio'],
            ['Project', `${project.name} (${project.projectNo})`],
            ['Client', project.client || '-'],
            ['Title', `แบบหล่อ${TYPE_LABEL[d.el.type]} ${d.el.code}${d.el.name ? ` — ${d.el.name}` : ''}`],
            ['Drawing No.', drawingNo(project, d.el)],
            ['Rev / Date', `${project.revision} · ${today} · ${settings.revisionNote}`],
            ['Drawn', settings.drawnBy],
            ['Checked', settings.checkedBy],
            ['Approved', settings.approvedBy],
          ],
        },
      ),
      'application/dxf',
    )
  const csv = () =>
    download(
      `${project.projectNo}_${single ? single.code : 'all'}_BOM.csv`,
      toCsv([
        ['Drawing No.', 'ชิ้นส่วน', 'จำนวนชุด', 'Mark', 'กลุ่ม', 'รายการ', 'ขนาด / ความยาว', 'ต่อชุด', 'หน่วย', 'รวมทุกชุด', 'ลบ.ฟ. (รวม)', 'กก. (รวม)'],
        ...ready.flatMap(({ d }) =>
          d.lines.map((l) => [
            drawingNo(project, d.el),
            d.el.code,
            d.el.qty,
            l.mark,
            l.group,
            l.description,
            l.size,
            l.qty,
            l.unit,
            l.qty * d.el.qty,
            l.volumeFt3 !== undefined ? (l.volumeFt3 * d.el.qty).toFixed(3) : '',
            l.weightKg !== undefined ? (l.weightKg * d.el.qty).toFixed(2) : '',
          ]),
        ),
      ]),
      'text/csv;charset=utf-8',
    )

  const back = single ? `/projects/${project.id}/elements/${single.id}` : `/projects/${project.id}`
  return (
    <div className="min-h-dvh bg-slate-300/60 print:bg-white">
      <style>{'@page { size: A3 landscape; margin: 0; }'}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-2.5 shadow-sm print:hidden sm:px-6">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> กลับ
        </Link>
        <h1 className="text-sm font-semibold">
          Shop drawing · {project.projectNo} {single ? `· ${single.code}` : `· ทั้งโครงการ (${list.length} ชิ้นส่วน)`}
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {single && ready[0] && (
            <button type="button" className={btn} onClick={() => dxf(ready[0].d)}>
              <FileDown size={16} /> DXF
            </button>
          )}
          <button type="button" className={btn} onClick={csv}>
            <FileDown size={16} /> BOM (CSV)
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover">
            <Printer size={16} /> พิมพ์ / บันทึก PDF (A3)
          </button>
        </div>
      </div>

      <main className="shop-zoom flex flex-col items-center gap-6 py-6 print:block print:py-0" style={{ zoom }}>
        {list.map((x) =>
          'd' in x && x.d ? (
            <div key={x.el.id} className="flex flex-col items-end gap-1">
              {!single && (
                <button type="button" className={`${btn} print:hidden`} onClick={() => dxf(x.d!)}>
                  <FileDown size={16} /> DXF {x.el.code}
                </button>
              )}
              <ShopSheets project={project} settings={settings} d={x.d} today={today} />
            </div>
          ) : (
            <p key={x.el.id} className="shop-sheet text-fail">
              {x.el.code}: เขียนแบบไม่ได้ — {'error' in x ? x.error : ''}
            </p>
          ),
        )}
        {list.length === 0 && <p className="shop-sheet text-center text-muted">ยังไม่มีชิ้นส่วนในโครงการ</p>}
      </main>
    </div>
  )
}
