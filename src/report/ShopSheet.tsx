// A3 landscape shop drawing for one element.
// Sheet 1: two scaled views, an isometric with callout tags keyed to the BOM, the BOM, notes and the title block.
// Sheet 2: plywood cutting plan and the erection / stripping sequence. Long BOMs continue on further sheets.
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { type AnyDesign, layoutSummary, TYPE_LABEL } from '@/data/elements'
import type { ElementData, Project, ShopSettings } from '@/data/types'
import { fmt } from '@/engine'
import { type BomLine, concreteVolume, elementBom } from '@/model/bom'
import { type CutSheet, packSheets, plywoodPieces, SHEET_H, SHEET_W } from '@/model/cutting'
import type { FormModel } from '@/model/formModel'
import { SEQUENCE } from './sequence'
import { ShopView } from './ShopView'
import { elementViews } from './views'

/** BOM rows on the drawing sheet; longer lists continue on extra sheets. */
export const ROWS_ON_SHEET = 20
const ROWS_PER_CONTINUATION = 46

export interface ShopData {
  el: ElementData & { id: string }
  run: AnyDesign
  model: FormModel
  lines: BomLine[]
  concreteM3: number
  views: ReturnType<typeof elementViews>
  /** plywood cutting plan for one set */
  cut: CutSheet[]
}

export function shopData(el: ElementData & { id: string }, run: AnyDesign): ShopData {
  const { model, lines } = elementBom(el, run)
  return { el, run, model, lines, concreteM3: concreteVolume(model), views: elementViews(el, run), cut: packSheets(plywoodPieces(model, lines)) }
}

export const drawingNo = (project: Project, el: ElementData) => `${project.projectNo}-FW-${el.code}`

export function sheetCount(d: ShopData) {
  return 2 + Math.ceil(Math.max(d.lines.length - ROWS_ON_SHEET, 0) / ROWS_PER_CONTINUATION)
}

const cell = 'border border-slate-400 px-1 py-[1px] align-top'

function BomTable({ lines, totals }: { lines: BomLine[]; totals?: ReactNode }) {
  return (
    <table className="w-full border-collapse text-[7pt] leading-tight">
      <thead>
        <tr className="bg-slate-100 text-left">
          <th className={clsx(cell, 'w-7 text-center')}>Mark</th>
          <th className={cell}>รายการ</th>
          <th className={cell}>ขนาด / ความยาว</th>
          <th className={clsx(cell, 'w-9 text-right')}>จำนวน</th>
          <th className={clsx(cell, 'w-8')}>หน่วย</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.mark}>
            <td className={clsx(cell, 'text-center font-mono font-bold')}>{l.mark}</td>
            <td className={cell}>{l.description}</td>
            <td className={clsx(cell, 'font-mono')}>{l.size}</td>
            <td className={clsx(cell, 'text-right font-mono')}>{l.qty}</td>
            <td className={cell}>{l.unit}</td>
          </tr>
        ))}
      </tbody>
      {totals && (
        <tfoot>
          <tr>
            <td colSpan={5} className={clsx(cell, 'bg-slate-50')}>
              {totals}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}

function Totals({ d }: { d: ShopData }) {
  const ft3 = d.lines.reduce((a, l) => a + (l.volumeFt3 ?? 0), 0)
  const kg = d.lines.reduce((a, l) => a + (l.weightKg ?? 0), 0)
  const ply = d.lines.filter((l) => l.category === 'plywood').reduce((a, l) => a + l.areaM2! * l.qty, 0)
  return (
    <span className="font-mono">
      รวมต่อ 1 ชุด: {ply > 0 && <>ไม้อัด {fmt(ply, 1)} ม.² = {d.cut.length} แผ่นตามแผนตัด · </>}
      {ft3 > 0 && <>ไม้ {fmt(ft3, 2)} ลบ.ฟ. · </>}
      {kg > 0 && <>เหล็ก {fmt(kg, 1)} กก. · </>}
      คอนกรีต {fmt(d.concreteM3, 2)} ม.³
    </span>
  )
}

function notes(project: Project, d: ShopData): string[] {
  const { el, run } = d
  const des = run.design
  const out = ['หน่วยเป็นเซนติเมตร (ซม.) เว้นแต่ระบุเป็นเมตร (ม.) — ห้ามวัดขนาดจากแบบ ให้ใช้ตัวเลขที่ระบุ']
  out.push(`ระยะที่ออกแบบ: ${layoutSummary(run).map((l) => `${l.label} ${l.value}`.replace(' @ ', ' @').trim()).join(' · ')} — ระยะจริงในแบบแบ่งเท่ากันไม่เกินค่านี้`)
  if (des.loadKind === 'vertical') out.push(`น้ำหนักบรรทุกออกแบบ w = ${fmt(des.pressure.Pmax)} กก./ม.² (คอนกรีต + น้ำหนักจร + แบบหล่อ)`)
  else if ('pressure' in el.input) out.push(`แรงดันคอนกรีตออกแบบ ${fmt(des.pressure.Pmax)} กก./ม.² — อัตราเทไม่เกิน ${el.input.pressure.R} ม./ชม. ที่อุณหภูมิ ${el.input.pressure.T} °C`)
  else out.push(`แรงดันข้างแบบ γh = ${fmt(des.pressure.Pmax)} กก./ม.² — เทคอนกรีตเป็นชั้น ไม่กระแทกแบบ`)
  out.push(`ออกแบบตามรายการคำนวณ ${drawingNo(project, el)} (อัตราส่วนสูงสุด ${des.maxRatio.toFixed(2)} — ${des.status === 'fail' ? 'ยังไม่ผ่าน ห้ามใช้ก่อสร้าง' : 'ผ่าน'})`)
  if (el.type === 'slab' || el.type === 'beam')
    out.push('ตั้งเสาค้ำบนพื้นที่รับน้ำหนักได้ ใส่แป้นรองฐานและลิ่ม ยึดค้ำยันทางข้างครบก่อนเท ห้ามรื้อเสาค้ำจนคอนกรีตได้กำลังตามข้อกำหนด')
  else out.push('ยึดค้ำยัน/ไทร์ครบก่อนเท ตรวจแนวดิ่งและระดับ อุดรอยต่อกันน้ำปูนรั่ว ทาน้ำยาถอดแบบ')
  out.push('แผนการตัดไม้อัดและลำดับการติดตั้ง/ถอดแบบ ดูแผ่นที่ 2')
  out.push(...des.warnings.slice(0, 2))
  return out
}

function TitleBlock({ project, s, d, sheet, of, today }: { project: Project; s: ShopSettings; d: ShopData; sheet: number; of: number; today: string }) {
  const { el } = d
  const row = 'border-t border-slate-500 px-1.5 py-[2px]'
  return (
    <div className="border-2 border-ink text-[7pt] leading-tight">
      <div className="flex items-center justify-between gap-2 bg-ink px-1.5 py-1 text-white">
        <b className="truncate text-[9pt]">{s.company || 'FormWork Studio'}</b>
        <span className="shrink-0">SHOP DRAWING · แบบหล่อคอนกรีต</span>
      </div>
      <div className="grid grid-cols-[22mm_1fr]">
        <span className={clsx(row, 'border-t-0 text-slate-500')}>Project</span>
        <span className={clsx(row, 'border-t-0 font-semibold')}>
          {project.name} <span className="font-mono font-normal">({project.projectNo})</span>
        </span>
        <span className={clsx(row, 'text-slate-500')}>Client</span>
        <span className={row}>{project.client || '–'}</span>
        <span className={clsx(row, 'text-slate-500')}>Contractor</span>
        <span className={row}>
          {project.contractor || '–'}
          {project.subcontractor && ` / ${project.subcontractor}`}
        </span>
        <span className={clsx(row, 'text-slate-500')}>Location</span>
        <span className={row}>{project.location || '–'}</span>
        <span className={clsx(row, 'text-slate-500')}>Title</span>
        <span className={clsx(row, 'text-[9pt] font-bold')}>
          แบบหล่อ{TYPE_LABEL[el.type]} {el.code}
          {el.name && <span className="font-normal"> — {el.name}</span>}
          <span className="block text-[7pt] font-normal">
            ชั้น/โซน {el.level || '–'} · จำนวน {el.qty} ชุด{sheet === 2 ? ' · แผนตัดไม้อัด + ลำดับงาน' : sheet > 2 ? ' · ตารางวัสดุ (ต่อ)' : ''}
          </span>
        </span>
      </div>
      <table className="w-full border-collapse border-t border-slate-500 text-[6.5pt]">
        <tbody>
          <tr>
            <td className="w-[12mm] border-r border-slate-500 px-1.5 py-[2px] font-mono font-semibold">{project.revision}</td>
            <td className="w-[26mm] whitespace-nowrap border-r border-slate-500 px-1.5 py-[2px] font-mono">{today}</td>
            <td className="px-1.5 py-[2px]">{s.revisionNote || '–'}</td>
          </tr>
        </tbody>
      </table>
      <div className="grid grid-cols-4 border-t border-slate-500 text-center">
        {[
          ['Drawing No.', drawingNo(project, el)],
          ['Sheet', `${sheet} / ${of}`],
          ['Rev', project.revision],
          ['Scale', 'ตามระบุ'],
        ].map(([k, v]) => (
          <div key={k} className="border-l border-slate-500 px-1 py-[2px] first:border-l-0">
            <div className="text-[6pt] text-slate-500">{k}</div>
            <div className="font-mono font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 border-t border-slate-500 text-center">
        {[
          ['Drawn / Designed', s.drawnBy],
          ['Checked', s.checkedBy],
          ['Approved', s.approvedBy],
        ].map(([k, v]) => (
          <div key={k} className="h-[12mm] border-l border-slate-500 px-1 py-[2px] first:border-l-0">
            <div className="text-[6pt] text-slate-500">{k}</div>
            <div className="mt-[4mm] truncate">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Cutting plan: identical full sheets drawn once with a count, every cut sheet drawn to scale. */
function CutPlan({ d, w, h }: { d: ShopData; w: number; h: number }) {
  const full = d.cut.filter((c) => c.full)
  const cut = d.cut.filter((c) => !c.full)
  const tiles = (full.length ? 1 : 0) + cut.length
  const caption = 7
  const gap = 5
  const denom = [20, 25, 30, 40, 50, 60, 75].find((k) => {
    const tw = (SHEET_W * 1000) / k
    const th = (SHEET_H * 1000) / k + caption
    return Math.floor((w + gap) / (tw + gap)) * Math.floor((h + gap) / (th + gap)) >= tiles
  }) ?? 75
  const tw = (SHEET_W * 1000) / denom
  const th = (SHEET_H * 1000) / denom
  const cols = Math.max(1, Math.floor((w + gap) / (tw + gap)))
  const fit = cols * Math.max(1, Math.floor((h + gap) / (th + caption + gap)))
  const show = [...(full.length ? [{ sheet: full[0], label: `แผ่นเต็ม × ${full.length}` }] : []), ...cut.map((c, i) => ({ sheet: c, label: `แผ่นตัด ${i + 1} · ใช้ ${Math.round(c.usage * 100)}%` }))]
  const k = 1000 / denom
  const used = d.cut.reduce((a, c) => a + c.usage, 0)
  return (
    <div>
      <h3 className="mb-1 text-[9pt] font-bold">
        แผนการตัดไม้อัด 1.22 × 2.44 ม. — ต่อ 1 ชุด <span className="font-mono font-normal">SCALE 1:{denom}</span>
      </h3>
      <p className="mb-2 text-[7pt] text-slate-600">
        ใช้ไม้อัด <b>{d.cut.length}</b> แผ่น/ชุด (เต็มแผ่น {full.length} · ตัด {cut.length}) · ประสิทธิภาพการใช้ {d.cut.length ? Math.round((used / d.cut.length) * 100) : 0}% · ตัวเลขในชิ้น = Mark ในตารางวัสดุ · ชิ้นที่ยาวเกินแผ่นแบ่งต่อบนเคร่า/ตง
      </p>
      <div className="flex flex-wrap" style={{ gap: `${gap}mm`, width: `${w}mm` }}>
        {show.slice(0, fit).map(({ sheet, label }, i) => (
          <figure key={i} className="m-0" style={{ width: `${tw}mm` }}>
            <svg width={`${tw}mm`} height={`${th}mm`} viewBox={`0 0 ${tw} ${th}`}>
              <rect width={tw} height={th} fill="#eef0f3" stroke="#475569" strokeWidth={0.3} />
              {sheet.pieces.map((p, j) => {
                const x = p.x * k
                const y = th - (p.y + p.h) * k
                const pw = p.w * k
                const ph = p.h * k
                return (
                  <g key={j}>
                    <rect x={x} y={y} width={pw} height={ph} fill="#e7b77f" stroke="#8c5a22" strokeWidth={0.2} />
                    {pw > 3.5 && ph > 3.5 && (
                      <text x={x + pw / 2} y={y + ph / 2 + 1} fontSize={Math.min(3, pw / 2.5)} textAnchor="middle" fontWeight={700} className="font-mono">
                        {p.mark}
                      </text>
                    )}
                    {pw > 9 && ph > 9 && (
                      <text x={x + pw / 2} y={y + ph / 2 + 4} fontSize={1.8} textAnchor="middle" fill="#5b3a12" className="font-mono">
                        {Math.round(p.w * 100)}×{Math.round(p.h * 100)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            <figcaption className="text-center text-[6.5pt] leading-tight">{label}</figcaption>
          </figure>
        ))}
      </div>
      {show.length > fit && <p className="mt-1 text-[7pt] text-slate-600">+ แผ่นตัดอีก {show.length - fit} แผ่น (ดูจำนวนรวมด้านบน)</p>}
    </div>
  )
}

function Sequence({ d }: { d: ShopData }) {
  const s = SEQUENCE[d.el.type]
  return (
    <div className="text-[7.5pt] leading-snug">
      <h3 className="mb-0.5 text-[9pt] font-bold">
        ลำดับการติดตั้ง <span className="text-[7pt] font-normal text-slate-500">(ตามหนังสือ {s.ref})</span>
      </h3>
      <ol className="list-decimal pl-4">
        {s.erect.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
      <h3 className="mb-0.5 mt-2 text-[9pt] font-bold">ลำดับการถอดแบบ</h3>
      <ol className="list-decimal pl-4">
        {s.strip.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </div>
  )
}

export function ShopSheets({ project, settings, d, today }: { project: Project; settings: ShopSettings; d: ShopData; today: string }) {
  const of = sheetCount(d)
  const first = d.lines.slice(0, ROWS_ON_SHEET)
  const rest = d.lines.slice(ROWS_ON_SHEET)
  const tags = d.lines.filter((l) => l.category !== 'accessory').map((l) => ({ mark: l.mark, partIds: l.partIds }))
  const { a, b } = d.views
  const tb = (sheet: number) => <TitleBlock project={project} s={settings} d={d} sheet={sheet} of={of} today={today} />
  return (
    <>
      <div className="shop-sheet">
        <div className="grid h-full grid-cols-[268mm_1fr] gap-[4mm] border border-ink p-[3mm]">
          <div className="grid grid-rows-[150mm_1fr]">
            <div className="flex items-start justify-between">
              <ShopView model={a.model} view={a.view} dims={a.dims} w={163} h={142} title={a.title.split(' — ')[0]} />
              <ShopView model={b.model} view={b.view} dims={b.dims} w={100} h={142} title={b.title.split(' — ')[0]} />
            </div>
            <ShopView model={d.model} view="iso" w={262} h={110} tags={tags} title="ภาพสามมิติ — หมายเลขชิ้นส่วนตามตารางวัสดุ" />
          </div>
          <div className="flex min-h-0 flex-col gap-[3mm]">
            <div>
              <h3 className="mb-1 text-[8pt] font-bold">ตารางวัสดุ (Bill of Materials) — ต่อ 1 ชุด</h3>
              <BomTable lines={first} totals={rest.length ? <span>ต่อแผ่นที่ 3 ({rest.length} รายการ)</span> : <Totals d={d} />} />
            </div>
            <div className="text-[7pt] leading-snug">
              <h3 className="mb-0.5 text-[8pt] font-bold">หมายเหตุ</h3>
              <ol className="list-decimal pl-4">
                {notes(project, d).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ol>
            </div>
            <div className="mt-auto">{tb(1)}</div>
          </div>
        </div>
      </div>
      <div className="shop-sheet">
        <div className="grid h-full grid-cols-[268mm_1fr] gap-[4mm] border border-ink p-[3mm]">
          <div className="min-h-0 overflow-hidden">
            {d.cut.length ? (
              <CutPlan d={d} w={262} h={250} />
            ) : (
              <p className="text-[8pt] text-slate-600">แผ่นผิวแบบเป็นไม้กระดาน — ไม่มีแผนการตัดไม้อัด (ความยาวไม้กระดานดูตารางวัสดุ)</p>
            )}
          </div>
          <div className="flex min-h-0 flex-col gap-[3mm]">
            <Sequence d={d} />
            <div className="mt-auto">{tb(2)}</div>
          </div>
        </div>
      </div>
      {Array.from({ length: of - 2 }, (_, k) => {
        const part = rest.slice(k * ROWS_PER_CONTINUATION, (k + 1) * ROWS_PER_CONTINUATION)
        const last = k === of - 3
        return (
          <div key={k} className="shop-sheet">
            <div className="grid h-full grid-cols-[268mm_1fr] gap-[4mm] border border-ink p-[3mm]">
              <div>
                <h3 className="mb-1 text-[8pt] font-bold">ตารางวัสดุ (ต่อ) — ต่อ 1 ชุด</h3>
                <BomTable lines={part} totals={last ? <Totals d={d} /> : undefined} />
              </div>
              <div className="mt-auto">{tb(k + 3)}</div>
            </div>
          </div>
        )
      })}
    </>
  )
}
