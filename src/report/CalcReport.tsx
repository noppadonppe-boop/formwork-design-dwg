// Printable calculation report for one element (A4). Content = project/criteria header, summary,
// layout drawings, pressure, then every component's calculation trace and checks.
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { PressureDiagram } from '@/components/design/PressureDiagram'
import { fmtVal } from '@/components/design/ResultsPanel'
import type { AnyDesign } from '@/data/elements'
import { elementHeight, elementSize, QUANTITY_LABEL, TYPE_LABEL } from '@/data/elements'
import type { Criteria, ElementData, Project } from '@/data/types'
import { beamBracing, beamCrossJoist, beamHasRunners, type ComponentResult, FOOTING_BRACE_AT_LABEL, FOOTING_SUPPORT_LABEL, FOOTING_TIE_LAYOUT_LABEL, getMaterial, getSection, getTie, type ShoreParams, type Status, type Trace } from '@/engine'
import { Drawing } from './Drawing'
import { elementViews } from './views'

const PRESSURE_LABEL: Record<string, string> = { ACI347: 'ACI 347', CEB: 'CEB', CIRA: 'CIRA', HYDROSTATIC: 'γH (ไฮโดรสแตติก)' }
const OKNG: Record<Status, string> = { ok: 'OK', warn: 'OK', fail: 'NG' }

export function Section({ n, title, children, className }: { n?: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('mt-5', className)}>
      <h3 className="mb-2 border-b-2 border-ink pb-1 text-[13px] font-bold">
        {n && <span className="num mr-2">{n}</span>}
        {title}
      </h3>
      {children}
    </section>
  )
}

export function InfoGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="m-0 font-medium">{v || '–'}</dd>
        </div>
      ))}
    </dl>
  )
}

const th = 'border border-slate-300 bg-slate-100 px-1.5 py-1 text-left font-semibold'
const td = 'border border-slate-300 px-1.5 py-0.5 align-top'

function TraceTable({ trace }: { trace: Trace }) {
  return (
    <table className="w-full border-collapse text-[10.5px]">
      <thead>
        <tr>
          <th className={clsx(th, 'w-6')}>#</th>
          <th className={th}>รายการ</th>
          <th className={th}>การแทนค่า</th>
          <th className={clsx(th, 'text-right')}>ผลลัพธ์</th>
          <th className={clsx(th, 'w-24')}>อ้างอิง</th>
        </tr>
      </thead>
      <tbody>
        {trace.steps.map((s, i) => (
          <tr key={i} className="break-inside-avoid">
            <td className={clsx(td, 'num text-slate-500')}>{i + 1}</td>
            <td className={td}>{s.label}</td>
            <td className={clsx(td, 'num text-slate-700')}>{s.expr}</td>
            <td className={clsx(td, 'num whitespace-nowrap text-right font-medium', s.status === 'fail' && 'text-fail')}>{fmtVal(s.value, s.unit)}</td>
            <td className={clsx(td, 'text-slate-600')}>{s.ref}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CheckTable({ c }: { c: ComponentResult }) {
  return (
    <table className="mt-2 w-full border-collapse text-[10.5px]">
      <thead>
        <tr>
          <th className={th}>การตรวจสอบ</th>
          <th className={clsx(th, 'text-right')}>ค่าที่เกิดขึ้น</th>
          <th className={clsx(th, 'text-right')}>ค่าที่ยอมให้</th>
          <th className={clsx(th, 'text-right')}>อัตราส่วน</th>
          <th className={clsx(th, 'w-12 text-center')}>ผล</th>
        </tr>
      </thead>
      <tbody>
        {c.rows.map((r) => (
          <tr key={r.item} className="break-inside-avoid">
            <td className={td}>
              {r.item}
              {r.ref && <span className="text-slate-500"> ({r.ref})</span>}
            </td>
            <td className={clsx(td, 'num text-right')}>{fmtVal(r.demand, r.unit)}</td>
            <td className={clsx(td, 'num text-right')}>{fmtVal(r.capacity, r.unit)}</td>
            <td className={clsx(td, 'num text-right font-semibold')}>{r.ratio.toFixed(3)}</td>
            <td className={clsx(td, 'text-center font-bold', r.ratio > 1 ? 'text-fail' : 'text-ok')}>{r.ratio > 1 ? 'NG' : 'OK'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Members used by an element: role, section, material. */
type MemberRow = { role: string; sectionId?: string; materialId: string; note?: string }

const deckNote = (sh: { type: 'plywood'; thicknessMm: number } | { type: 'board'; thicknessCm: number }) => (sh.type === 'plywood' ? `หนา ${sh.thicknessMm} มม.` : `ไม้กระดานหนา ${sh.thicknessCm} ซม.`)
const shoreRow = (s: ShoreParams): MemberRow[] =>
  s.kind === 'post' ? [{ role: 'เสาค้ำ', sectionId: s.sectionId, materialId: getSection(s.sectionId).shape === 'pipe' && getMaterial(s.materialId).kind !== 'steel' ? 'steel-a36' : s.materialId }] : []

function members(el: ElementData): MemberRow[] {
  switch (el.type) {
    case 'wall': {
      const i = el.input
      return [
        { role: 'แผ่นผิวแบบ', materialId: i.sheathing.materialId, note: `หนา ${i.sheathing.thicknessMm} มม.` },
        { role: 'เคร่าตั้ง', sectionId: i.stud.sectionId, materialId: i.stud.materialId },
        { role: 'คานรับเคร่า', sectionId: i.wale.sectionId, materialId: i.wale.materialId, note: i.wale.count === 2 ? 'หน้าตัดคู่' : 'เดี่ยว' },
        { role: 'ค้ำยัน', sectionId: i.brace.sectionId, materialId: i.brace.materialId },
      ]
    }
    case 'column': {
      const i = el.input
      return [
        { role: 'แผ่นผิวแบบ', materialId: i.sheathing.materialId, note: i.sheathing.type === 'plywood' ? `หนา ${i.sheathing.thicknessMm} มม.` : `ไม้กระดานหนา ${i.sheathing.thicknessCm} ซม.` },
        ...(i.sheathing.type === 'plywood' && i.stud ? [{ role: 'เคร่าตั้ง', sectionId: i.stud.sectionId, materialId: i.stud.materialId }] : []),
        { role: 'คานรัดแบบ', sectionId: i.yoke.sectionId, materialId: i.yoke.materialId, note: i.yoke.count === 2 ? 'หน้าตัดคู่' : 'เดี่ยว' },
        { role: 'ค้ำยัน', sectionId: i.brace.sectionId, materialId: i.brace.materialId },
      ]
    }
    case 'slab': {
      const i = el.input
      return [
        { role: 'แผ่นพื้นแบบ', materialId: i.sheathing.materialId, note: deckNote(i.sheathing) },
        { role: 'ตง', sectionId: i.joist.sectionId, materialId: i.joist.materialId },
        { role: 'คานรองรับ', sectionId: i.stringer.sectionId, materialId: i.stringer.materialId, note: i.stringer.count === 2 ? 'คู่' : 'เดี่ยว' },
        ...shoreRow(i.shore),
        ...(i.bracing.enabled ? [{ role: 'ค้ำยันทางข้าง', sectionId: i.bracing.sectionId, materialId: i.bracing.materialId }] : []),
      ]
    }
    case 'beam': {
      const i = el.input
      return [
        { role: 'แผ่นผิวแบบ', materialId: i.sheathing.materialId, note: deckNote(i.sheathing) },
        { role: 'เคร่าข้าง', sectionId: i.stud.sectionId, materialId: i.stud.materialId },
        ...(i.bottomDir === 'across' ? [{ role: 'ตงขวางใต้ท้องแบบ', sectionId: beamCrossJoist(i).sectionId, materialId: beamCrossJoist(i).materialId }] : []),
        ...(beamHasRunners(i) ? [{ role: i.bottomDir === 'across' ? 'คร่าวตามยาวรับตงขวาง' : 'ไม้เสริมท้องแบบ', sectionId: i.bottom.sectionId, materialId: i.bottom.materialId, note: `${i.bottom.auto ? 'จำนวนอัตโนมัติ' : `${i.bottom.count} ตัว`} ${i.bottom.flat ? 'วางนอน' : 'วางตั้ง'}` }] : []),
        { role: 'คานขวาง', sectionId: i.head.sectionId, materialId: i.head.materialId, note: i.head.count === 2 ? 'คู่' : 'เดี่ยว' },
        ...shoreRow(i.shore),
        ...(beamBracing(i).enabled ? [{ role: 'ค้ำยันทางข้าง', sectionId: beamBracing(i).sectionId, materialId: beamBracing(i).materialId }] : []),
        ...(i.tie.enabled ? [{ role: 'คานรับเคร่า', sectionId: i.tie.waleSectionId, materialId: i.tie.waleMaterialId, note: 'คู่' }] : i.type !== 'slab' ? [{ role: 'ค้ำยันปากแบบ', sectionId: i.brace.sectionId, materialId: i.brace.materialId }] : []),
      ]
    }
    case 'footing': {
      const i = el.input
      return [
        { role: 'แผ่นผิวข้างแบบ', materialId: i.sheathing.materialId, note: deckNote(i.sheathing) },
        { role: 'เคร่า', sectionId: i.stud.sectionId, materialId: i.stud.materialId },
        ...(i.support === 'braced' ? [{ role: 'ค้ำยันทแยง', sectionId: i.brace.sectionId, materialId: i.brace.materialId }] : []),
        ...(i.support === 'tied' || i.brace.at === 'wale' ? [{ role: 'คานรับเคร่า', sectionId: i.wale.sectionId, materialId: i.wale.materialId, note: `${i.wale.count === 2 ? 'คู่' : 'เดี่ยว'} รอบฐาน` }] : []),
        ...(i.support !== 'tied' ? [{ role: 'หลักยึด', sectionId: i.stake.sectionId, materialId: 'timber-yang' }] : []),
      ]
    }
  }
}

function footingCriteria(el: Extract<ElementData, { type: 'footing' }>, run: AnyDesign): [string, ReactNode][] {
  const i = el.input
  const lay = run.type === 'footing' ? run.design.layout : undefined
  const rows: [string, ReactNode][] = [['การยึดเคร่า', FOOTING_SUPPORT_LABEL[i.support]]]
  if (i.support === 'braced') rows.push(['ตำแหน่งค้ำยัน', FOOTING_BRACE_AT_LABEL[i.brace.at ?? 'stud']])
  if (i.support === 'tied')
    rows.push(['การวางไทร์', `${FOOTING_TIE_LAYOUT_LABEL[lay?.tieLayout ?? 'short']}${(i.tie.layout ?? 'auto') === 'auto' ? ' (เลือกอัตโนมัติ)' : ''}`])
  if (lay?.waleCorner)
    rows.push(['มุมคานรับเคร่า', lay.waleCorner === 'butt' ? 'ตัดชน ระดับเดียวกัน' : `วางไขว้ ยาวเต็มท่อน · คานด้านสั้น${(lay.waleShift ?? 0) < 0 ? 'เลื่อนลง' : 'เลื่อนขึ้น'} ${(Math.abs(lay.waleShift ?? 0) * 100).toFixed(1)} ซม.`])
  if (lay?.tiePlate) rows.push(['เหล็กประกับไทร์', `${lay.tiePlate.wCm}×${lay.tiePlate.hCm} ซม. หนา ${lay.tiePlate.tMm} มม. (A36) ปลายไทร์ทุกจุด`])
  if (i.support !== 'tied') rows.push(['ดินรับแรงแบกทาน', `${i.soilBearing.toLocaleString()} กก./ม.²`])
  return rows
}

/** Criteria rows that depend on the element type. */
function criteriaRows(el: ElementData, run: AnyDesign): [string, ReactNode][] {
  if (el.type === 'slab' || el.type === 'beam') {
    const l = el.input.loads
    return [
      ['น้ำหนักจรระหว่างทำงาน', `${l.liveLoad} กก./ม.²`],
      ['น้ำหนักแบบหล่อ', el.type === 'beam' ? `พื้น ${l.formWeight} กก./ม.² · คาน ${el.input.loads.beamFormWeight} กก./ม.` : `${l.formWeight} กก./ม.²`],
      ['หน่วยน้ำหนักคอนกรีต γ', `${l.gamma.toLocaleString()} กก./ม.³`],
      ...(el.type === 'beam' ? ([['แรงดันข้างคาน', 'γh (ของเหลว) §7.4']] as [string, ReactNode][]) : []),
    ]
  }
  const p = el.input.pressure
  return [
    ['แรงดันด้านข้าง', PRESSURE_LABEL[p.method] ?? p.method],
    ['อัตราเท R / อุณหภูมิ T', `${p.R} ม./ชม. · ${p.T} °C`],
    ['Slump', `${p.slump} ซม.`],
    ...(el.type === 'footing' ? footingCriteria(el, run) : ([['แรงลม', `${el.input.brace.wind} กก./ม.²`]] as [string, ReactNode][])),
  ]
}

function tieNote(el: ElementData): string {
  const id = el.type === 'wall' || el.type === 'column' || el.type === 'footing' || (el.type === 'beam' && el.input.tie.enabled) ? el.input.tie.tieId : undefined
  if (!id || (el.type === 'column' && !el.input.tie.enabled) || (el.type === 'footing' && (el.input.support !== 'tied' || el.input.tie.layout === 'none'))) return ''
  const t = getTie(id)
  return ` · Form tie: ${t.name} (SWL ${t.swl.toLocaleString()} กก.)`
}

export interface ReportOptions {
  trace: boolean
  drawings: boolean
}

export function ElementReport({ project, criteria, el, run, opts, designer }: { project: Project; criteria: Criteria; el: ElementData; run: AnyDesign; opts: ReportOptions; designer: string }) {
  const d = run.design
  const dw = elementViews(el, run)
  const ratioStatus = d.status
  const vertical = d.loadKind === 'vertical'
  let n = 0
  const sec = () => `${++n}.`
  return (
    <article className="report-element">
      <header className="flex items-end justify-between gap-4 border-b-[3px] border-ink pb-2">
        {project.logo && <img src={project.logo} alt="logo" className="h-12 max-w-[45mm] self-center object-contain" />}
        <div className="mr-auto">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            <span className="th-only">รายการคำนวณออกแบบแบบหล่อคอนกรีต · </span>Formwork Design Calculation
          </p>
          <h2 className="text-xl font-bold">
            {`แบบหล่อ${TYPE_LABEL[el.type]}`} <span className="num">{el.code}</span>
            {el.name && <span className="font-normal text-slate-600"> — {el.name}</span>}
          </h2>
        </div>
        <div className={clsx('rounded-md border-2 px-3 py-1 text-center', ratioStatus === 'fail' ? 'border-fail text-fail' : 'border-ok text-ok')}>
          <div className="text-[10px] font-semibold">ผลการออกแบบ</div>
          <div className="text-lg font-bold leading-tight">{ratioStatus === 'fail' ? 'ไม่ผ่าน' : 'ผ่าน'}</div>
          <div className="num text-[10px]">max ratio {d.maxRatio.toFixed(3)}</div>
        </div>
      </header>

      <div className="mt-3">
        <InfoGrid
          rows={[
            ['Project No.', <span className="num">{project.projectNo}</span>],
            ['Project', project.name],
            ['Client', project.client],
            ['Contractor', project.contractor],
            ['Subcontractor', project.subcontractor],
            ['Location', project.location],
            ['ชิ้นส่วน', `${el.code} · ${elementSize(el)}`],
            ['ชั้น / โซน · จำนวน', `${el.level || '–'} · ${el.qty} ชิ้น`],
            ['Revision', project.revision],
            ['ผู้คำนวณ', designer],
          ]}
        />
      </div>

      <Section n={sec()} title="สรุปผลการออกแบบ">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={th}>ส่วนประกอบ</th>
              <th className={th}>ข้อกำหนด / ระยะ</th>
              <th className={clsx(th, 'text-right')}>Ratio สูงสุด</th>
              <th className={clsx(th, 'w-12 text-center')}>ผล</th>
            </tr>
          </thead>
          <tbody>
            {d.components.map((c) => (
              <tr key={c.key} className="break-inside-avoid">
                <td className={clsx(td, 'font-medium')}>{c.title}</td>
                <td className={td}>
                  {c.spec}
                  {c.spacing && (
                    <span className="text-slate-500">
                      {' '}
                      · {c.spacing.label} {c.spacing.value} ซม.{c.spacing.fixed ? ' (กำหนด)' : ''}
                    </span>
                  )}
                </td>
                <td className={clsx(td, 'num text-right font-semibold')}>{c.maxRatio.toFixed(3)}</td>
                <td className={clsx(td, 'text-center font-bold', c.status === 'fail' ? 'text-fail' : 'text-ok')}>{OKNG[c.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.warnings.length > 0 && (
          <ul className="mt-2 list-disc rounded border border-amber-300 bg-amber-50 py-1.5 pl-6 pr-2 text-[11px] text-amber-900">
            {d.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
        {d.advice && <AdviceTable advice={d.advice} />}
      </Section>

      <Section n={sec()} title="เกณฑ์การออกแบบและวัสดุ">
        <InfoGrid
          rows={[
            ...criteriaRows(el, run),
            ...(el.type === 'slab' || el.type === 'beam' ? [] : ([['หน่วยน้ำหนักคอนกรีต γ', `${criteria.gamma.toLocaleString()} กก./ม.³`]] as [string, ReactNode][])),
            ['การแอ่นตัวที่ยอมให้', `L/${criteria.deflectionRatio}${criteria.deflectionAbsMm ? ` ≤ ${criteria.deflectionAbsMm} มม.` : ''}`],
            ['ตรวจแรงเฉือนไม้', criteria.checkTimberShear ? 'ตรวจ (สมการ 5.13, l − 2d)' : 'ไม่ตรวจ'],
            ['อ้างอิง', 'Design Form Work (จุฬาฯ) · ACI 347 · CEB · CIRA'],
          ]}
        />
        <table className="mt-2 w-full border-collapse text-[10.5px]">
          <thead>
            <tr>
              <th className={th}>ส่วนประกอบ</th>
              <th className={th}>หน้าตัด</th>
              <th className={th}>วัสดุ</th>
              <th className={clsx(th, 'text-right')}>E</th>
              <th className={clsx(th, 'text-right')}>Fb</th>
              <th className={clsx(th, 'text-right')}>Fv</th>
              <th className={clsx(th, 'text-right')}>A</th>
              <th className={clsx(th, 'text-right')}>I</th>
              <th className={clsx(th, 'text-right')}>S</th>
            </tr>
          </thead>
          <tbody>
            {members(el).map((m) => {
              const mat = getMaterial(m.materialId)
              const s = m.sectionId ? getSection(m.sectionId) : undefined
              return (
                <tr key={m.role} className="break-inside-avoid">
                  <td className={td}>
                    {m.role}
                    {m.note && <span className="text-slate-500"> ({m.note})</span>}
                  </td>
                  <td className={td}>{s?.label ?? '–'}</td>
                  <td className={td}>{mat.name}</td>
                  <td className={clsx(td, 'num text-right')}>{mat.E.toLocaleString()}</td>
                  <td className={clsx(td, 'num text-right')}>{mat.Fb}</td>
                  <td className={clsx(td, 'num text-right')}>{mat.Fv ?? '–'}</td>
                  <td className={clsx(td, 'num text-right')}>{s ? fmtVal(s.A) : '–'}</td>
                  <td className={clsx(td, 'num text-right')}>{s ? fmtVal(s.Ix) : '–'}</td>
                  <td className={clsx(td, 'num text-right')}>{s ? fmtVal(s.Sx) : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-slate-500">
          หน่วย: E, Fb, Fv กก./ซม.² · A ซม.² · I ซม.⁴ · S ซม.³{tieNote(el)}
        </p>
      </Section>

      {opts.drawings && (
        <Section n={sec()} title="การจัดวางแบบหล่อ (แบบร่างจากผลคำนวณ)" className="break-inside-avoid">
          <div className="grid grid-cols-[1.6fr_1fr] gap-3">
            <Drawing model={dw.a.model} view={dw.a.view} dims={dw.a.dims} title={dw.a.title} width={576} height={360} />
            <Drawing model={dw.b.model} view={dw.b.view} dims={dw.b.dims} title={dw.b.title} width={360} height={360} />
          </div>
        </Section>
      )}

      <Section n={sec()} title={vertical ? 'น้ำหนักบรรทุกแนวดิ่ง' : 'แรงดันคอนกรีตสด'}>
        {vertical ? (
          <InfoGrid rows={d.pressure.trace.steps.map((st) => [st.label, <span className="num">{fmtVal(st.value, st.unit)}</span>] as [string, ReactNode])} />
        ) : (
          <div className="flex items-center gap-6 break-inside-avoid">
            <PressureDiagram H={elementHeight(el)} Pmax={d.pressure.Pmax} hCrit={d.pressure.hCrit} />
            <InfoGrid
              rows={[
                ['วิธีคำนวณ', 'pressure' in el.input ? (PRESSURE_LABEL[el.input.pressure.method] ?? el.input.pressure.method) : 'γh (ของเหลว)'],
                ['แรงดันสูงสุด Pmax', <span className="num">{fmtVal(d.pressure.Pmax, 'กก./ม.²')}</span>],
                ['ความลึกถึง Pmax', <span className="num">{d.pressure.hCrit.toFixed(2)} ม.</span>],
                ['ความสูงเท H', <span className="num">{elementHeight(el).toFixed(2)} ม.</span>],
              ]}
            />
          </div>
        )}
        {opts.trace && !vertical && (
          <div className="mt-2">
            <TraceTable trace={d.pressure.trace} />
          </div>
        )}
      </Section>

      {d.components.map((c) => (
        <Section key={c.key} n={sec()} title={c.title}>
          <p className="mb-1.5 text-[11px]">
            <b>ใช้</b> {c.spec}
            {c.spacing && (
              <>
                {' '}
                · {c.spacing.label} <b className="num">{c.spacing.value}</b> ซม. (สูงสุด {c.spacing.max.toFixed(1)} ซม. คุมโดย{c.spacing.governing})
              </>
            )}
          </p>
          {opts.trace && <TraceTable trace={c.trace} />}
          <CheckTable c={c} />
        </Section>
      ))}

      <Section n={sec()} title="ปริมาณวัสดุโดยประมาณ (ต่อ 1 ชิ้น)" className="break-inside-avoid">
        <Quantities q={d.quantities as unknown as Record<string, number>} />
      </Section>

      <Signatures designer={designer} />
    </article>
  )
}

function Quantities({ q }: { q: Record<string, number> }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <tbody>
        {Object.entries(q)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => (
          <tr key={k}>
            <td className={td}>{QUANTITY_LABEL[k]?.[0] ?? k}</td>
            <td className={clsx(td, 'num w-32 text-right')}>{fmtVal(v)}</td>
            <td className={clsx(td, 'w-16')}>{QUANTITY_LABEL[k]?.[1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Signatures({ designer }: { designer: string }) {
  return (
    <div className="mt-8 grid break-inside-avoid grid-cols-3 gap-6 text-center text-[11px]">
      {[
        ['ผู้คำนวณ', designer],
        ['ผู้ตรวจสอบ', ''],
        ['ผู้อนุมัติ', ''],
      ].map(([role, name]) => (
        <div key={role}>
          <div className="h-12 border-b border-slate-400" />
          <div className="mt-1">({name || '............................................'})</div>
          <div className="font-semibold">{role}</div>
          <div className="text-slate-500">วันที่ ......../......../........</div>
        </div>
      ))}
    </div>
  )
}

function AdviceTable({ advice }: { advice: NonNullable<AnyDesign['design']['advice']> }) {
  return (
    <div className="mt-3 break-inside-avoid">
      <p className="mb-1 text-[11px] font-semibold">{advice.title}</p>
      <ul className="mb-1 list-disc pl-5 text-[10.5px]">
        {advice.summary.map((x) => (
          <li key={x} className={clsx(x.startsWith('แนะนำ') && 'font-semibold')}>
            {x}
          </li>
        ))}
      </ul>
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr>
            <th className={th}>รูปแบบ</th>
            <th className={th}>ปริมาณ / หมายเหตุ</th>
            <th className={clsx(th, 'text-right')}>Ratio สูงสุด</th>
            <th className={clsx(th, 'text-center')}>ผล</th>
          </tr>
        </thead>
        <tbody>
          {advice.options.map((o) => (
            <tr key={o.key} className={clsx(o.recommended && 'bg-green-50')}>
              <td className={td}>
                {o.label}
                {o.current && <b> (ที่ใช้)</b>}
                {o.recommended && <b className="text-ok"> ★ แนะนำ</b>}
              </td>
              <td className={td}>{o.note}</td>
              <td className={clsx(td, 'num text-right')}>{o.ratio > 9.99 ? '>9.99' : o.ratio.toFixed(2)}</td>
              <td className={clsx(td, 'text-center font-bold', o.status === 'fail' ? 'text-fail' : 'text-ok')}>{OKNG[o.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
