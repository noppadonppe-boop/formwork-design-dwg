// User manual: the workflow step by step, the theory behind every check (as the engine applies it, with the
// book's equation numbers), illustrated sections of each formwork type, live material tables and an FAQ.
// Written in Thai, English and Chinese side by side (L(th, en, zh)); material names and the few engine strings
// left in Thai are translated through the report dictionary.
import clsx from 'clsx'
import { BookOpen, Languages, Lightbulb, TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { PressureDiagram } from '@/components/design/PressureDiagram'
import { BeamSectionFigure, BucklingFigure, ColumnShapesFigure, ContinuousBeamFigure, Figure, FootingFigure, LoadPathFigure, SlabSystemFigure, TieAreaFigure, WallSectionFigure } from '@/components/manual/Figures'
import { RatioBar, StatusBadge } from '@/components/ui'
import { REPORT_LANG_LABEL } from '@/data/types'
import { fmt, MATERIALS, TIES } from '@/engine'
import { type ManualLang, ManualLangContext, pick, storedManualLang, storeManualLang } from '@/i18n/manual'
import { HTML_LANG, useTranslatedDom } from '@/i18n/report'

type Lfn = ReturnType<typeof pick>

const toc = (L: Lfn): [string, string, [string, string][]?][] => [
  ['overview', L('ภาพรวมการทำงาน', 'Workflow overview', '工作流程概览')],
  [
    'steps',
    L('ขั้นตอนการใช้งาน', 'Step by step', '使用步骤'),
    [
      ['step-project', L('1. สร้างโครงการและ Design Criteria', '1. Project and design criteria', '1. 创建项目与设计准则')],
      ['step-elements', L('2. เพิ่ม / นำเข้าชิ้นส่วน', '2. Add / import elements', '2. 添加 / 导入构件')],
      ['step-3d', L('3. ออกแบบใน 3D Designer', '3. Design in the 3D Designer', '3. 在 3D 设计器中设计')],
      ['step-results', L('4. อ่านผลการคำนวณ', '4. Reading the results', '4. 查看计算结果')],
      ['step-optimizer', L('5. Optimizer', '5. Optimizer', '5. 优化器')],
      ['step-output', L('6. รายการคำนวณ · Shop drawing · BOM', '6. Calculation report · Shop drawing · BOM', '6. 计算书 · 加工图 · 材料表')],
    ],
  ],
  [
    'theory',
    L('ทฤษฎีที่ใช้', 'Theory', '计算理论'),
    [
      ['th-loadpath', L('เส้นทางการถ่ายแรง', 'Load path', '传力路径')],
      ['th-pressure', L('แรงดันคอนกรีตสด', 'Fresh concrete pressure', '新浇混凝土侧压力')],
      ['th-vertical', L('น้ำหนักแนวดิ่ง (พื้น/คาน)', 'Vertical loads (slab/beam)', '竖向荷载(楼板/梁)')],
      ['th-members', L('ระยะเคร่า ตง คาน', 'Stud, joist and beam spacing', '竖楞、次楞、主楞间距')],
      ['th-ties', L('Form tie', 'Form ties', '对拉螺栓')],
      ['th-shores', L('เสาค้ำและการโก่งเดาะ', 'Shores and buckling', '立杆与屈曲')],
      ['th-braces', L('ค้ำยันแบบ', 'Form bracing', '模板斜撑')],
      ['th-column-shapes', L('เสากลม หลายเหลี่ยม และตัว L/T/U', 'Round, polygonal and L/T/U columns', '圆柱、多边形柱与 L/T/U 形柱')],
      ['th-beam', L('แบบหล่อคาน', 'Beam forms', '梁模板')],
      ['th-footing', L('แบบหล่อฐานราก', 'Footing forms', '基础模板')],
      ['th-materials', L('ค่าวัสดุ', 'Material values', '材料参数')],
    ],
  ],
  ['faq', L('คำถามที่พบบ่อย', 'FAQ', '常见问题')],
]

function H2({ id, children, kicker }: { id: string; children: ReactNode; kicker?: string }) {
  return (
    <h2 id={id} className="scroll-mt-6 border-b-2 border-ink pb-2 pt-4 text-2xl font-bold">
      {kicker && <span className="mr-2 text-base font-semibold text-brand">{kicker}</span>}
      {children}
    </h2>
  )
}

function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-6 pt-2 text-lg font-semibold">
      {children}
    </h3>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="num mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span>
          <span className="leading-relaxed">{t}</span>
        </li>
      ))}
    </ol>
  )
}

function Formula({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <div className="num text-[15px] leading-relaxed text-ink">{children}</div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  )
}

function Tip({ children, warn }: { children: ReactNode; warn?: boolean }) {
  const Icon = warn ? TriangleAlert : Lightbulb
  return (
    <div className={clsx('flex gap-3 rounded-lg px-4 py-3 text-[14px] leading-relaxed', warn ? 'bg-amber-50 text-amber-900' : 'bg-blue-50 text-blue-950')}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-slate-50 text-left text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LangSwitch({ lang, onChange }: { lang: ManualLang; onChange: (l: ManualLang) => void }) {
  return (
    <div role="radiogroup" aria-label="Language / ภาษา / 语言" translate="no" className="inline-flex items-center gap-1 rounded-lg border border-line bg-white p-1 text-sm">
      <Languages size={16} className="mx-1 text-muted" aria-hidden />
      {(['th', 'en', 'zh'] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => onChange(l)}
          className={clsx('rounded-md px-2.5 py-1 font-medium', lang === l ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100')}
        >
          {REPORT_LANG_LABEL[l]}
        </button>
      ))}
    </div>
  )
}

export function ManualPage() {
  const [lang, setLangState] = useState<ManualLang>(storedManualLang)
  const setLang = (l: ManualLang) => {
    setLangState(l)
    storeManualLang(l)
  }
  const L = pick(lang)
  const TOC = toc(L)
  const contentRef = useTranslatedDom(lang)
  const [active, setActive] = useState('overview')
  useEffect(() => {
    const ids = toc(pick('th')).flatMap(([id, , sub]) => [id, ...(sub ?? []).map(([s]) => s)])
    const obs = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (v) setActive(v.target.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [lang])

  const timber = MATERIALS.filter((m) => m.kind === 'timber')
  const others = MATERIALS.filter((m) => m.kind !== 'timber')

  const WORKFLOW: [string, string][] = L(
    [
      ['สร้างโครงการ', 'ข้อมูลโครงการ ลูกค้า ผู้รับเหมา'],
      ['ตั้ง Design Criteria', 'วิธีคำนวณแรงดัน น้ำหนัก การแอ่นตัว วัสดุเริ่มต้น'],
      ['เพิ่มหรือนำเข้าชิ้นส่วน', 'กด + ทีละชิ้น หรือนำเข้าจาก DXF / ภาพ / PDF'],
      ['ออกแบบใน 3D', 'คลิกแก้ชิ้นส่วน ลากจุดสีส้มปรับขนาด/ระยะ'],
      ['ตรวจผลการคำนวณ', 'ทุกรายการต้องผ่าน (Ratio ≤ 1.00)'],
      ['Optimizer', 'หาแบบที่ถูกที่สุดที่ยังผ่าน'],
      ['รายการคำนวณ (PDF)', 'ส่งตรวจ / อนุมัติ'],
      ['Shop drawing + BOM', 'ส่งหน้างานและฝ่ายจัดซื้อ'],
    ],
    [
      ['Create a project', 'Project data, client, contractor'],
      ['Set design criteria', 'Pressure method, loads, deflection, default materials'],
      ['Add or import elements', 'Press + one by one, or import from DXF / image / PDF'],
      ['Design in 3D', 'Click a part to edit it, drag the orange handles to resize / respace'],
      ['Check the results', 'Every check must pass (ratio ≤ 1.00)'],
      ['Optimizer', 'Find the cheapest design that still passes'],
      ['Calculation report (PDF)', 'For review / approval'],
      ['Shop drawing + BOM', 'For site and purchasing'],
    ],
    [
      ['创建项目', '项目信息、业主、承包商'],
      ['设定设计准则', '侧压力计算方法、荷载、挠度、默认材料'],
      ['添加或导入构件', '逐个点击 + 添加,或从 DXF / 图片 / PDF 导入'],
      ['3D 设计', '点击构件修改,拖动橙色控制点调整尺寸/间距'],
      ['检查计算结果', '所有项目必须满足(比值 ≤ 1.00)'],
      ['优化器', '寻找仍满足要求的最经济方案'],
      ['计算书 (PDF)', '提交审核 / 批准'],
      ['加工图 + 材料表', '交付现场与采购部门'],
    ],
  )

  const statusText = { ok: L('ผ่าน', 'Pass', '满足'), warn: L('ใกล้ขีดจำกัด', 'Near limit', '接近限值'), fail: L('ไม่ผ่าน', 'Fail', '不满足') }

  return (
    <ManualLangContext.Provider value={lang}>
      <div key={lang} ref={contentRef} lang={HTML_LANG[lang]} className="mx-auto flex w-full max-w-[1280px] gap-8 px-4 py-7 sm:px-8">
        <nav aria-label={L('สารบัญคู่มือ', 'Manual contents', '手册目录')} className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] w-60 shrink-0 self-start overflow-y-auto lg:block">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <BookOpen size={14} aria-hidden /> {L('สารบัญ', 'Contents', '目录')}
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {TOC.map(([id, label, sub]) => (
              <li key={id}>
                <a href={`#${id}`} className={clsx('block rounded-md px-2 py-1.5 font-medium', active === id ? 'bg-brand-soft text-brand' : 'hover:bg-slate-100')}>
                  {label}
                </a>
                {sub && (
                  <ul className="ml-2 border-l border-line pl-2">
                    {sub.map(([s, l]) => (
                      <li key={s}>
                        <a href={`#${s}`} className={clsx('block rounded-md px-2 py-1 text-[13px]', active === s ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-100')}>
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <article className="flex min-w-0 max-w-[880px] flex-1 flex-col gap-5 text-[15px] leading-relaxed text-slate-800">
          <header>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] text-muted">{L('คู่มือการใช้งาน', 'User manual', '使用手册')}</p>
              <LangSwitch lang={lang} onChange={setLang} />
            </div>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight text-ink">
              {L('FormWork Studio — ออกแบบแบบหล่อคอนกรีตทีละขั้น', 'FormWork Studio — concrete formwork design, step by step', 'FormWork Studio — 混凝土模板分步设计')}
            </h1>
            <p className="mt-1 text-slate-600">
              {L(
                <>
                  ระบบคำนวณตามหนังสือ <i>Design Form Work</i> (จุฬาฯ) ร่วมกับ ACI 347, CEB และ CIRA แบบหน่วยแรงที่ยอมให้ (ASD) หน่วย กก. · ซม. · ม. ทุกขั้นตอนในรายการคำนวณจะแสดงสูตร ค่าที่แทน
                  และอ้างอิงสมการ/ตารางของหนังสือ
                </>,
                <>
                  Calculations follow the book <i>Design Form Work</i> (Chulalongkorn University) together with ACI 347, CEB and CIRA, by allowable stress design (ASD) in kg · cm · m. Every step
                  in the calculation report shows the formula, the values substituted and the book's equation/table reference.
                </>,
                <>
                  按教材 <i>Design Form Work</i>(朱拉隆功大学)并结合 ACI 347、CEB 和 CIRA,采用容许应力法 (ASD) 计算,单位为 kg · cm · m。计算书中每一步均列出公式、代入数值以及教材的公式/表格编号。
                </>,
              )}
            </p>
          </header>

          {/* ------------------------------------------------------------ overview */}
          <H2 id="overview">{L('ภาพรวมการทำงาน', 'Workflow overview', '工作流程概览')}</H2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map(([t, d], i) => (
              <li key={t} className="card flex gap-3 p-3">
                <span className="num inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{i + 1}</span>
                <span>
                  <b className="block text-[14px] text-ink">{t}</b>
                  <span className="text-[13px] text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <Tip>
            {L(
              <>
                เมนูของโครงการอยู่ 2 ที่: แถบเมนูด้านบนของทุกหน้าในโครงการ และหมวด <b>โครงการปัจจุบัน</b> ในแถบซ้าย (ถ้ายังไม่ได้เปิดโครงการ แถบซ้ายจะพาไปโครงการล่าสุดที่เปิด) เมนูที่เห็นขึ้นกับบทบาทของคุณ —
                เช่น ผู้ประมาณราคาเห็น BOM แต่ไม่เห็นการนำเข้าแบบ
              </>,
              <>
                Project menus are in two places: the menu bar at the top of every project page, and the <b>Current project</b> group in the left sidebar (with no project open, the sidebar takes
                you to the last one you opened). The menus you see depend on your role — an estimator, for example, sees the BOM but not drawing import.
              </>,
              <>
                项目菜单位于两处:项目内每页顶部的菜单栏,以及左侧栏的 <b>当前项目</b> 分组(未打开项目时,左侧栏会进入最近打开的项目)。可见菜单取决于您的角色 —— 例如造价员可见材料表,但看不到图纸导入。
              </>,
            )}
          </Tip>

          {/* ------------------------------------------------------------ steps */}
          <H2 id="steps">{L('ขั้นตอนการใช้งาน', 'Step by step', '使用步骤')}</H2>

          <H3 id="step-project">{L('ขั้นที่ 1 · สร้างโครงการและตั้ง Design Criteria', 'Step 1 · Create a project and set the design criteria', '第 1 步 · 创建项目并设定设计准则')}</H3>
          <Steps
            items={L(
              [
                <>
                  หน้า <b>โครงการ</b> กด <b>โครงการใหม่</b> กรอก Project No., ชื่อโครงการ, Client, Contractor, Subcontractor, ที่ตั้ง และหมายเหตุ
                </>,
                <>
                  ตั้ง <b>Design Criteria</b> (ใช้เป็นค่าเริ่มต้นของทุกชิ้นส่วนในโครงการ แต่ละชิ้นส่วนแก้ทับได้) — ตามตารางด้านล่าง
                </>,
                <>กด บันทึก — แก้ภายหลังได้จากเมนู Design Criteria ทุกชิ้นส่วนจะคำนวณใหม่ทันที</>,
              ],
              [
                <>
                  On the <b>Projects</b> page press <b>New project</b> and fill in the project no., name, client, contractor, subcontractor, location and notes.
                </>,
                <>
                  Set the <b>Design criteria</b> (the defaults for every element in the project; each element can override them) — see the table below.
                </>,
                <>Press Save — edit later from the Design Criteria menu; every element is recalculated at once.</>,
              ],
              [
                <>
                  在 <b>项目</b> 页点击 <b>新建项目</b>,填写项目编号、项目名称、业主、总包、分包、地点和备注。
                </>,
                <>
                  设定 <b>设计准则</b>(作为项目内所有构件的默认值,各构件可单独修改)—— 见下表。
                </>,
                <>点击保存 —— 之后可在“设计准则”菜单中修改,所有构件立即重新计算。</>,
              ],
            )}
          />
          <Table
            head={L(['ค่า', 'ความหมาย', 'ค่าแนะนำ'], ['Setting', 'Meaning', 'Suggested'], ['参数', '含义', '建议值'])}
            rows={L(
              [
                ['วิธีคำนวณแรงดันด้านข้าง', 'CEB / ACI 347 / CIRA / γH เต็มความสูง (ดูทฤษฎี)', 'CEB (ตามตัวอย่างในหนังสือ)'],
                ['อัตราเท R', 'ความสูงคอนกรีตที่เทขึ้นต่อชั่วโมง — ยิ่งเทเร็วแรงดันยิ่งสูง', '1–2 ม./ชม. สำหรับกำแพง'],
                ['อุณหภูมิ T, Slump', 'คอนกรีตเย็นและเหลวก่อตัวช้า → แรงดันสูงขึ้น', '30 °C, 10 ซม.'],
                ['γ คอนกรีต', 'หน่วยน้ำหนัก', '2,400 กก./ม.³'],
                ['น้ำหนักจร / น้ำหนักแบบ', 'ใช้กับพื้นและคาน (คนงาน เครื่องมือ การเท)', 'หนังสือใช้ 150 + 50 กก./ม.² · ACI ≥ 245'],
                ['การแอ่นตัว', 'Δ ≤ L/360 (และ/หรือ ไม่เกิน x มม.)', 'L/360; ผิวคอนกรีตเปลือยเพิ่ม ≤ 1.5 มม.'],
                ['ตรวจแรงเฉือนไม้', 'ตรวจ fv ของเคร่า/ตง (สมการ 5.13)', 'เปิด (ปลอดภัยกว่า)'],
                ['วัสดุเริ่มต้น', 'ไม้อัด ความหนา ไม้ เหล็ก Form tie', 'ไม้อัด 18 มม. · ไม้ยาง · Ø1/2"'],
              ],
              [
                ['Lateral pressure method', 'CEB / ACI 347 / CIRA / full-height γH (see Theory)', 'CEB (as in the book examples)'],
                ['Rate of placement R', 'Height of concrete placed per hour — the faster, the higher the pressure', '1–2 m/h for walls'],
                ['Temperature T, slump', 'Cold, fluid concrete sets slowly → higher pressure', '30 °C, 10 cm'],
                ['Concrete γ', 'Unit weight', '2,400 kg/m³'],
                ['Live load / form weight', 'For slabs and beams (workers, equipment, placing)', 'Book: 150 + 50 kg/m² · ACI ≥ 245'],
                ['Deflection', 'Δ ≤ L/360 (and/or not more than x mm)', 'L/360; exposed concrete also ≤ 1.5 mm'],
                ['Timber shear check', 'Check fv of studs/joists (eq. 5.13)', 'On (safer)'],
                ['Default materials', 'Plywood and its thickness, timber, steel, form tie', 'Plywood 18 mm · Yang timber · Ø1/2"'],
              ],
              [
                ['侧压力计算方法', 'CEB / ACI 347 / CIRA / 全高 γH(见计算理论)', 'CEB(与教材例题一致)'],
                ['浇筑速度 R', '每小时浇筑的混凝土高度 —— 浇得越快侧压力越大', '墙 1–2 m/h'],
                ['温度 T、坍落度', '低温、流动性大的混凝土凝结慢 → 侧压力更大', '30 °C, 10 cm'],
                ['混凝土 γ', '重度', '2,400 kg/m³'],
                ['施工活荷载 / 模板自重', '用于楼板和梁(工人、机具、浇筑)', '教材取 150 + 50 kg/m² · ACI ≥ 245'],
                ['挠度', 'Δ ≤ L/360(和/或不超过 x mm)', 'L/360;清水混凝土另加 ≤ 1.5 mm'],
                ['木材抗剪验算', '验算竖楞/次楞的 fv(公式 5.13)', '开启(更安全)'],
                ['默认材料', '胶合板及厚度、木材、钢材、对拉螺栓', '胶合板 18 mm · 油楠木 · Ø1/2"'],
              ],
            )}
          />

          <H3 id="step-elements">{L('ขั้นที่ 2 · เพิ่มหรือนำเข้าชิ้นส่วน', 'Step 2 · Add or import elements', '第 2 步 · 添加或导入构件')}</H3>
          <p>
            {L(
              <>
                ในหน้าโครงการมีปุ่ม <b>เพิ่มกำแพง / เสา / คาน / พื้น / ฐานราก</b> ระบบจะสร้างชิ้นส่วนพร้อมค่าเริ่มต้นจาก Design Criteria และพาไปหน้าออกแบบทันที ถ้ามีแบบอยู่แล้วใช้เมนู
                <b> นำเข้าแบบ</b>:
              </>,
              <>
                The project page has <b>Add wall / column / beam / slab / footing</b> buttons; the element is created with the design-criteria defaults and opens straight in the designer. If you
                already have drawings, use <b>Import drawings</b>:
              </>,
              <>
                项目页面有 <b>添加墙 / 柱 / 梁 / 楼板 / 基础</b> 按钮,系统按设计准则的默认值创建构件并直接进入设计页面。已有图纸时使用 <b>导入图纸</b> 菜单:
              </>,
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <b className="text-ink">{L('ไฟล์ DXF (AutoCAD)', 'DXF file (AutoCAD)', 'DXF 文件 (AutoCAD)')}</b>
              <Steps
                items={L(
                  [
                    'DWG ให้ Save As เป็น DXF ก่อน แล้วเลือกไฟล์ (อ่านในเบราว์เซอร์ ไม่อัปโหลด)',
                    'ตรวจหน่วย (มม./ซม./ม.) — ระบบเดาจากไฟล์ให้แล้ว',
                    'กำหนดเลเยอร์ → ชนิด (เสา กำแพง ฐานราก คาน พื้น หรือ ไม่ใช้) ระบบเดาจากชื่อเลเยอร์ให้ก่อน',
                    'ดูแปลนสีในตัวอย่าง แล้วแก้ขนาด/จำนวนในตารางตรวจทาน',
                    'กด สร้างชิ้นส่วน — ชิ้นที่ขนาดเท่ากันจะรวมเป็นหนึ่งชิ้นส่วนพร้อมจำนวน',
                  ],
                  [
                    'Save a DWG as DXF first, then pick the file (it is read in the browser, not uploaded)',
                    'Check the units (mm/cm/m) — already guessed from the file',
                    'Map each layer → type (column, wall, footing, beam, slab or unused); a guess from the layer name comes first',
                    'Look over the coloured plan preview, then fix sizes/quantities in the review table',
                    'Press Create elements — identical sizes are merged into one element with a quantity',
                  ],
                  [
                    'DWG 需先另存为 DXF,再选择文件(在浏览器中读取,不上传)',
                    '检查单位 (mm/cm/m) —— 系统已根据文件推测',
                    '指定图层 → 类型(柱、墙、基础、梁、楼板或不使用),系统先按图层名推测',
                    '查看彩色平面预览,然后在核对表中修改尺寸/数量',
                    '点击“创建构件” —— 尺寸相同的构件合并为一个并计数量',
                  ],
                )}
              />
            </div>
            <div className="card p-4">
              <b className="text-ink">{L('AI อ่านแบบ (รูป / PDF)', 'AI drawing reader (image / PDF)', 'AI 识图(图片 / PDF)')}</b>
              <Steps
                items={L(
                  [
                    'เลือกรูปแปลน ตารางเสา/คาน/ฐานราก หรือ PDF',
                    'เลือก "เซิร์ฟเวอร์ของบริษัท" (ไม่ต้องใส่คีย์) หรือ "API key ของฉัน"',
                    'เขียนหมายเหตุช่วย AI ได้ เช่น “หน่วยในแบบเป็นมม.”',
                    'ตรวจทุกแถวกับแบบจริง — ช่องที่ AI ไม่พบจะใช้ค่าเริ่มต้นและมีหมายเหตุบอก',
                  ],
                  [
                    'Pick a plan image, a column/beam/footing schedule, or a PDF',
                    'Choose "Company server" (no key needed) or "My API key"',
                    'Add a hint for the AI if needed, e.g. “dimensions are in mm”',
                    'Check every row against the drawing — fields the AI could not find use defaults and are flagged',
                  ],
                  [
                    '选择平面图、柱/梁/基础表或 PDF',
                    '选择“公司服务器”(无需密钥)或“我的 API key”',
                    '可为 AI 添加提示,例如“图中单位为 mm”',
                    '逐行与实际图纸核对 —— AI 未识别的字段采用默认值并附有说明',
                  ],
                )}
              />
            </div>
          </div>
          <Tip>
            {L(
              <>
                DXF ที่อ่านได้ดีที่สุด: เสา/กำแพง/ฐานรากวาดเป็นสี่เหลี่ยมปิด (Polyline) แยกเลเยอร์ และมีป้ายใกล้ ๆ เช่น <span className="num">C1 40x40</span>,{' '}
                <span className="num">B2 30x60</span> (ตัวเลขน้อยกว่า 5 ถือเป็นเมตร มากกว่านั้นเป็นเซนติเมตร) ลองกับไฟล์ตัวอย่าง <span className="num">docs/sample-plan.dxf</span> · วงกลม (CIRCLE) และ Polyline ปิดรูปตัว L / T / U (มุมฉาก หมุนได้) หรือหก/แปดเหลี่ยมด้านเท่า จะได้เสาหรือฐานรากรูปนั้นทันที (ขนาดยาวสุด ≤ 1.50 ม. เป็นเสา ใหญ่กว่าเป็นฐานราก)
              </>,
              <>
                DXF reads best when columns/walls/footings are closed rectangles (polylines) on separate layers with a label nearby, such as <span className="num">C1 40x40</span>,{' '}
                <span className="num">B2 30x60</span> (numbers below 5 are metres, larger ones centimetres). Try the sample file <span className="num">docs/sample-plan.dxf</span>. Circles and closed L / T / U polylines (square corners, any rotation) or regular hexagons/octagons come in as columns or footings of that shape (up to 1.50 m across a column, larger a footing).
              </>,
              <>
                最易识别的 DXF:柱/墙/基础绘制为闭合矩形(多段线)、分图层,并在附近标注,如 <span className="num">C1 40x40</span>、<span className="num">B2 30x60</span>(小于 5
                的数字视为米,否则为厘米)。可用示例文件 <span className="num">docs/sample-plan.dxf</span> 试用。圆(CIRCLE)以及闭合的 L / T / U 形多段线(直角,可旋转)或正六/八边形,会直接导入为该形状的柱或基础(最大尺寸 ≤ 1.50 m 为柱,更大为基础)。
              </>,
            )}
          </Tip>

          <H3 id="step-3d">{L('ขั้นที่ 3 · ออกแบบใน 3D Designer', 'Step 3 · Design in the 3D Designer', '第 3 步 · 在 3D 设计器中设计')}</H3>
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <Steps
              items={L(
                [
                  <>
                    <b>หมุน / เลื่อน / ซูม</b> — ลากเมาส์ซ้าย / ขวา / ล้อเลื่อน ปุ่ม 3D หน้า ข้าง บน เปลี่ยนมุมมอง
                  </>,
                  <>
                    <b>คลิกชิ้นส่วน</b> (เช่น เคร่า) — แผงด้านขวาแสดงผลตรวจสอบของชิ้นส่วนนั้นและช่องแก้ขนาด/วัสดุ/ระยะ
                  </>,
                  <>
                    <b>ลากจุดสีส้ม</b> เพื่อปรับความสูง ความยาว ความหนา หรือระยะเคร่า/คานรับเคร่า/ไทร์/ตง/เสาค้ำ (ปัดทีละ 5 ซม.) — ระยะที่ลากจะถูก “กำหนดเอง” ลบค่าในช่องเพื่อให้ระบบเลือกอัตโนมัติอีกครั้ง
                  </>,
                  <>
                    <b>ปุ่มสี</b> — สลับสีตามวัสดุ หรือสีตามผลตรวจ (เขียว ผ่าน · เหลือง ใกล้ขีดจำกัด · แดง ไม่ผ่าน) เพื่อหาชิ้นที่มีปัญหาเร็ว
                  </>,
                  <>
                    <b>ชั้นการแสดงผล</b> ซ่อน/แสดงคอนกรีต แผ่นผิว ฯลฯ · <b>บันทึกภาพ PNG</b> · <b>เต็มจอ</b>
                  </>,
                ],
                [
                  <>
                    <b>Orbit / pan / zoom</b> — left drag / right drag / mouse wheel; the 3D, front, side and top buttons change the view
                  </>,
                  <>
                    <b>Click a part</b> (a stud, say) — the right panel shows that part's checks and fields for its size/material/spacing
                  </>,
                  <>
                    <b>Drag the orange handles</b> to change height, length, thickness, or the stud/wale/tie/joist/shore spacing (in 5 cm steps) — a dragged spacing becomes “custom”; clear the field
                    to let the system choose again
                  </>,
                  <>
                    <b>Colour button</b> — colour by material or by check result (green pass · yellow near limit · red fail) to find problem parts fast
                  </>,
                  <>
                    <b>Layers</b> hide/show concrete, sheathing, etc. · <b>Save PNG</b> · <b>Full screen</b>
                  </>,
                ],
                [
                  <>
                    <b>旋转 / 平移 / 缩放</b> —— 鼠标左键拖动 / 右键拖动 / 滚轮;3D、正、侧、顶视图按钮切换视角
                  </>,
                  <>
                    <b>点击构件</b>(如竖楞)—— 右侧面板显示该构件的验算结果及尺寸/材料/间距输入框
                  </>,
                  <>
                    <b>拖动橙色控制点</b> 调整高度、长度、厚度或竖楞/围檩/螺栓/次楞/立杆间距(以 5 cm 取整)—— 拖动后的间距为“自定义”,清空输入框即恢复自动选择
                  </>,
                  <>
                    <b>颜色按钮</b> —— 按材料着色或按验算结果着色(绿 满足 · 黄 接近限值 · 红 不满足),快速找到问题构件
                  </>,
                  <>
                    <b>图层</b> 显示/隐藏混凝土、面板等 · <b>保存 PNG</b> · <b>全屏</b>
                  </>,
                ],
              )}
            />
            <Figure title={L('จุดลากปรับค่า', 'Drag handle', '拖动控制点')}>
              <svg viewBox="0 0 200 120" className="h-auto w-full" role="img" aria-label={L('จุดสีส้มสำหรับลากปรับระยะ', 'Orange handle for dragging a spacing', '用于拖动调整间距的橙色控制点')}>
                <rect x="20" y="40" width="160" height="12" fill="#f3dcb5" stroke="#8c6a36" />
                <rect x="20" y="70" width="160" height="12" fill="#f3dcb5" stroke="#8c6a36" />
                <line x1="100" y1="20" x2="100" y2="100" stroke="#e2621b" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="100" cy="76" r="9" fill="#e2621b" stroke="#fff" strokeWidth="2" />
                <path d="M100 52 l-6 8h12z M100 100 l-6 -8h12z" fill="#e2621b" />
                <rect x="112" y="88" width="76" height="22" rx="5" fill="#0f172a" />
                <text x="150" y="103" fontSize="11" fill="#fff" textAnchor="middle">
                  {L('ระยะ 80 ซม.', 'Spacing 80 cm', '间距 80 cm')}
                </text>
              </svg>
            </Figure>
          </div>

          <H3 id="step-results">{L('ขั้นที่ 4 · อ่านผลการคำนวณ', 'Step 4 · Reading the results', '第 4 步 · 查看计算结果')}</H3>
          <p>
            {L(
              <>
                แท็บ <b>ผลการคำนวณ</b> แสดงแรงดัน/น้ำหนักออกแบบ และการ์ดของแต่ละส่วนประกอบ (แผ่นผิว → เคร่า → คานรับเคร่า → ไทร์ → ค้ำยัน …) แต่ละการ์ดบอกระยะที่ใช้ ระยะสูงสุดที่ยอมให้ และตัวที่ควบคุม
                (แรงดัด แรงเฉือน หรือการแอ่นตัว) กด “แสดงรายการคำนวณ” เพื่อดูทุกบรรทัดของการคำนวณ
              </>,
              <>
                The <b>Results</b> tab shows the design pressure/load and a card for each component (sheathing → studs → wales → ties → braces …). Each card gives the spacing used, the largest
                allowed spacing and what governs it (bending, shear or deflection). Press “Show calculation” to see every line of the calculation.
              </>,
              <>
                <b>计算结果</b> 选项卡显示设计侧压力/荷载以及各组成部分的卡片(面板 → 竖楞 → 围檩 → 对拉螺栓 → 斜撑 …)。每张卡片给出采用间距、容许最大间距及控制因素(弯曲、剪力或挠度)。点击“显示计算过程”可查看每一行计算。
              </>,
            )}
          </p>
          <div className="card flex flex-col gap-3 p-4">
            <b className="text-ink">{L('อัตราส่วน (Ratio) = ค่าที่เกิดขึ้น ÷ ค่าที่ยอมให้', 'Ratio = actual ÷ allowable', '比值 (Ratio) = 实际值 ÷ 容许值')}</b>
            {(
              [
                [0.62, 'ok', L('น้อยกว่า 0.90 — ผ่าน มีส่วนเผื่อ', 'Below 0.90 — passes with margin', '小于 0.90 —— 满足,有富余')],
                [0.95, 'warn', L('0.90 – 1.00 — ผ่าน แต่ใกล้ขีดจำกัด (ปกติของระยะที่ระบบเลือกให้มากที่สุด)', '0.90 – 1.00 — passes but near the limit (normal for the largest spacing the system picks)', '0.90 – 1.00 —— 满足但接近限值(系统选取最大间距时属正常)')],
                [1.12, 'fail', L('มากกว่า 1.00 — ไม่ผ่าน ต้องแก้', 'Above 1.00 — fails, must be fixed', '大于 1.00 —— 不满足,必须修改')],
              ] as const
            ).map(([r, s, t]) => (
              <div key={r} className="grid grid-cols-[48px_120px_1fr] items-center gap-3 text-sm">
                <span className="num font-semibold">{r.toFixed(2)}</span>
                <RatioBar ratio={r} />
                <span className="flex items-center gap-2">
                  <StatusBadge status={s}>{statusText[s]}</StatusBadge> {t}
                </span>
              </div>
            ))}
          </div>
          <Tip warn>
            {L(
              <>
                <b>เมื่อไม่ผ่าน</b> ให้ดูว่าส่วนไหนแดงแล้วแก้ทีละขั้นจากบนลงล่าง: ลดระยะ (ลบค่าที่กำหนดเองเพื่อให้ระบบเลือก) → เพิ่มขนาดหน้าตัด / ใช้หน้าตัดคู่ → เปลี่ยนวัสดุ → ลดอัตราเท R
                (กำแพง/เสา) → เพิ่มค้ำยันกลางเสาค้ำ (พื้น/คาน) หรือเปิด Optimizer ให้หาให้
              </>,
              <>
                <b>When a check fails</b>, find the red part and fix it step by step from the top: reduce the spacing (clear custom values so the system chooses) → a larger section / a double
                section → another material → a lower rate of placement R (walls/columns) → mid-height bracing on the shores (slabs/beams) — or let the Optimizer search for you.
              </>,
              <>
                <b>不满足时</b>,找到红色构件并自上而下逐步修改:减小间距(清除自定义值让系统选择)→ 加大截面 / 采用双拼截面 → 更换材料 → 降低浇筑速度 R(墙/柱)→ 立杆中部加水平拉结(楼板/梁),或使用优化器自动寻找。
              </>,
            )}
          </Tip>

          <H3 id="step-optimizer">{L('ขั้นที่ 5 · Optimizer หาแบบที่ประหยัด', 'Step 5 · Optimizer: the most economical design', '第 5 步 · 优化器:寻找最经济方案')}</H3>
          <Steps
            items={L(
              [
                'แท็บ Optimizer ในหน้าชิ้นส่วน — ใส่ราคาวัสดุของบริษัท (ไม้อัด/แผ่น ไม้/ลบ.ฟ. เหล็ก/กก. ไทร์ ค่าประกอบต่อชิ้น)',
                'กด เริ่มค้นหา — ระบบลองความหนาไม้อัด ขนาดเคร่า/คาน/เสาค้ำ และวิธียึด หลายพันแบบ ภายในไม่กี่วินาที',
                'ทุกแบบในตารางผ่านการตรวจสอบครบ เรียงจากถูกไปแพง เทียบกับแบบปัจจุบันและ % ที่ประหยัด',
                'กด ใช้แบบนี้ แล้วตรวจผลในแท็บผลการคำนวณอีกครั้ง',
              ],
              [
                'Optimizer tab on the element page — enter your company prices (plywood/sheet, timber/ft³, steel/kg, ties, assembly per piece)',
                'Press Start search — thousands of combinations of plywood thickness, stud/beam/shore sizes and restraint methods are tried in a few seconds',
                'Every design in the table passes all checks, sorted cheapest first and compared with the current design and the % saved',
                'Press Use this design, then check the Results tab again',
              ],
              [
                '构件页的“优化器”选项卡 —— 输入公司材料单价(胶合板/张、木材/ft³、钢材/kg、对拉螺栓、每件安装费)',
                '点击“开始搜索” —— 系统在数秒内尝试数千种胶合板厚度、竖楞/梁/立杆尺寸及固定方式的组合',
                '表中所有方案均通过全部验算,按造价由低到高排序,并与当前方案比较节省百分比',
                '点击“采用此方案”,然后在计算结果选项卡中再次检查',
              ],
            )}
          />

          <H3 id="step-output">{L('ขั้นที่ 6 · รายการคำนวณ · Shop drawing · BOM', 'Step 6 · Calculation report · Shop drawing · BOM', '第 6 步 · 计算书 · 加工图 · 材料表')}</H3>
          <Table
            head={L(['เมนู', 'ได้อะไร', 'วิธีใช้'], ['Menu', 'What you get', 'How'], ['菜单', '输出内容', '使用方法'])}
            rows={L(
              [
                [<b>รายการคำนวณ</b>, 'เอกสาร A4: เกณฑ์ วัสดุ แบบร่าง แรงดัน และทุกขั้นตอนการคำนวณพร้อมอ้างอิงหนังสือ ช่องลงนาม', 'กด พิมพ์ / บันทึก PDF → เลือก “บันทึกเป็น PDF”'],
                [<b>Shop drawing</b>, 'แผ่น A3: รูปด้าน/รูปตัดตามมาตราส่วน ภาพ 3 มิติพร้อมหมายเลขชิ้น ตารางวัสดุ หมายเหตุ กรอบชื่อแบบ · แผ่น 2: แผนตัดไม้อัด + ลำดับติดตั้ง/ถอดแบบ', 'พิมพ์ A3 · ดาวน์โหลด DXF (เปิดใน AutoCAD) · BOM CSV'],
                [<b>BOM & ราคา</b>, 'วัสดุรวมทั้งโครงการ × จำนวนชุด ปริมาณสั่งซื้อ (เผื่อเศษ ÷ ใช้ซ้ำ) ราคาประมาณ', 'ใส่ราคาต่อหน่วย % เผื่อ และจำนวนรอบใช้ซ้ำ แล้วกด บันทึกการตั้งค่า'],
              ],
              [
                [<b>Calculation report</b>, 'A4 document: criteria, materials, sketches, pressure and every calculation step with book references, signature boxes', 'Press Print / Save PDF → choose “Save as PDF”'],
                [<b>Shop drawing</b>, 'A3 sheet: scaled elevations/sections, 3D view with part marks, BOM, notes, title block · Sheet 2: plywood cutting plan + erection/stripping sequence', 'Print A3 · download DXF (opens in AutoCAD) · BOM CSV'],
                [<b>BOM & prices</b>, 'Project-wide materials × number of sets, order quantities (waste ÷ reuse), estimated cost', 'Enter unit prices, waste % and reuse count, then press Save settings'],
              ],
              [
                [<b>计算书</b>, 'A4 文件:设计准则、材料、示意图、侧压力及全部计算步骤并附教材出处,签字栏', '点击“打印 / 保存 PDF” → 选择“另存为 PDF”'],
                [<b>加工图</b>, 'A3 图纸:按比例的立面/剖面图、带构件编号的 3D 视图、材料表、说明、图签 · 第 2 张:胶合板裁切图 + 安装/拆模顺序', '打印 A3 · 下载 DXF(可在 AutoCAD 打开)· BOM CSV'],
                [<b>材料表与造价</b>, '全项目材料 × 套数、采购数量(损耗 ÷ 周转次数)、估算造价', '输入单价、损耗 % 和周转次数,然后点击“保存设置”'],
              ],
            )}
          />

          {/* ------------------------------------------------------------ theory */}
          <H2 id="theory">{L('ทฤษฎีที่ใช้ในการคำนวณ', 'Theory used in the calculations', '计算理论')}</H2>

          <H3 id="th-loadpath">{L('เส้นทางการถ่ายแรง (Load path)', 'Load path', '传力路径 (Load path)')}</H3>
          <p>
            {L(
              <>
                แบบหล่อทุกชนิดคิดแบบเดียวกัน: แรงจากคอนกรีตสดกระทำกับ <b>แผ่นผิว</b> แผ่นผิวพาดอยู่บน <b>เคร่า</b> (หรือ ตง) ซึ่งพาดบน <b>คานรับเคร่า</b> (หรือ คานรองรับ คานรัด) และถ่ายลง <b>ตัวยึด</b>{' '}
                สุดท้าย ระบบคำนวณจากชิ้นที่รับแรงก่อนไปหลัง — ระยะของชิ้นหนึ่งกำหนดโดยความแข็งแรงของชิ้นที่พาดอยู่บนมัน
              </>,
              <>
                Every formwork type works the same way: the fresh concrete loads the <b>sheathing</b>, the sheathing spans over <b>studs</b> (or joists), which span over <b>wales</b> (or stringers,
                yokes) and finally into the <b>restraints</b>. The system calculates in that order — the spacing of each member is set by the strength of the member spanning across it.
              </>,
              <>
                各类模板的计算思路相同:新浇混凝土的荷载作用于 <b>面板</b>,面板支承在 <b>竖楞</b>(或次楞)上,竖楞支承在 <b>围檩</b>(或主楞、柱箍)上,最后传给 <b>固定件</b>。系统按受力先后顺序计算 —— 某构件的间距由支承于其上的构件的承载力决定。
              </>,
            )}
          </p>
          <LoadPathFigure />
          <div className="grid gap-4">
            <Figure
              title={L('แบบหล่อกำแพง', 'Wall form', '墙模板')}
              caption={L(
                'แรงดันดันแผ่นผิวออก → เคร่าตั้ง → คานรับเคร่าคู่ → ไทร์ดึงสองข้างเข้าหากัน ค้ำยันกันล้มและแนวดิ่ง',
                'Pressure pushes the sheathing out → studs → double wales → ties pull both sides together; braces keep it plumb and stop it toppling',
                '侧压力将面板向外推 → 竖楞 → 双围檩 → 对拉螺栓将两侧拉紧;斜撑保持垂直并防止倾覆',
              )}
            >
              <WallSectionFigure />
            </Figure>
            <Figure
              title={L('แบบหล่อพื้น', 'Slab form', '楼板模板')}
              caption={L(
                'น้ำหนักลงแผ่นพื้นแบบ → ตง → คานรองรับ → เสาค้ำ → แป้นรองฐาน ค้ำยันทแยงกันเสาโยกทั้งสองทิศทาง',
                'Load onto the deck → joists → stringers → shores → base plates; diagonal bracing stops the shores swaying both ways',
                '荷载作用于底模面板 → 次楞 → 主楞 → 立杆 → 底座垫板;交叉斜撑防止立杆双向晃动',
              )}
            >
              <SlabSystemFigure />
            </Figure>
          </div>

          <H3 id="th-pressure">{L('แรงดันคอนกรีตสด (กำแพง เสา ฐานราก)', 'Fresh concrete pressure (walls, columns, footings)', '新浇混凝土侧压力(墙、柱、基础)')}</H3>
          <p>
            {L(
              'คอนกรีตสดดันแบบเหมือนของเหลว (p = γ·h) จนกว่าจะเริ่มก่อตัว เมื่อเทสูงขึ้นคอนกรีตด้านล่างเริ่มแข็งตัว แรงดันจึงหยุดเพิ่มที่ค่าสูงสุด Pmax ปัจจัยที่เพิ่มแรงดัน: เทเร็ว (R สูง) อุณหภูมิต่ำ slump สูง การจี้เขย่าแรง หน้าตัดแคบ หนังสือ (และระบบ) ใช้ Pmax คงที่ตลอดความสูง ซึ่งปลอดภัย',
              'Fresh concrete presses on the form like a liquid (p = γ·h) until it starts to set; as the pour rises the concrete below stiffens, so the pressure stops growing at a maximum Pmax. Pressure rises with fast placing (high R), low temperature, high slump, heavy vibration and thin sections. The book (and the system) uses Pmax over the full height, which is safe.',
              '新浇混凝土在初凝前像液体一样对模板产生压力 (p = γ·h);随着浇筑升高,下部混凝土开始硬化,侧压力在最大值 Pmax 处不再增加。使侧压力增大的因素:浇筑快(R 高)、温度低、坍落度大、振捣强、截面窄。教材(及本系统)沿全高采用恒定的 Pmax,偏于安全。',
            )}
          </p>
          <div className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
            <Figure title={L('แผนภาพแรงดัน', 'Pressure diagram', '侧压力分布图')} caption={L('ตัวอย่าง 8.1: H 2.5 ม.', 'Example 8.1: H 2.5 m', '例 8.1:H 2.5 m')}>
              <div className="flex justify-center">
                <PressureDiagram H={2.5} Pmax={3620} hCrit={3620 / 2400} />
              </div>
            </Figure>
            <div className="flex flex-col gap-2">
              <Formula note={L('CEB สมการ 2.12–2.14 · k จากตาราง 2.2 (slump, T)', 'CEB eqs. 2.12–2.14 · k from Table 2.2 (slump, T)', 'CEB 公式 2.12–2.14 · k 查表 2.2(坍落度, T)')}>
                Pmax = min( γ·H , 2400·k·R + 500 , 300·R + 10,000·d + 1,500 )
              </Formula>
              <Formula
                note={L(
                  'ACI 347 สมการ 2.7–2.9 · psf × 4.882 = กก./ม.² · สูงสุด 9,760 (กำแพง) / 14,640 (เสา)',
                  'ACI 347 eqs. 2.7–2.9 · psf × 4.882 = kg/m² · max 9,760 (walls) / 14,640 (columns)',
                  'ACI 347 公式 2.7–2.9 · psf × 4.882 = kg/m² · 上限 9,760(墙)/ 14,640(柱)',
                )}
              >
                {L('P = 150 + 9,000·R/T (R ฟุต/ชม., T °F) · กำแพง R > 7: 150 + 43,400/T + 2,800·R/T', 'P = 150 + 9,000·R/T (R ft/h, T °F) · walls R > 7: 150 + 43,400/T + 2,800·R/T', 'P = 150 + 9,000·R/T(R ft/h, T °F)· 墙 R > 7:150 + 43,400/T + 2,800·R/T')}
              </Formula>
              <Formula note={L('CIRA: ตาราง 2.3–2.5 (ระบบ interpolate ให้)', 'CIRA: Tables 2.3–2.5 (interpolated by the system)', 'CIRA:表 2.3–2.5(系统自动插值)')}>
                {L('P = min( 2,500·H , ตารางการก่อตัว , ตารางหน้าตัดบาง )', 'P = min( 2,500·H , setting table , thin-section table )', 'P = min( 2,500·H , 凝结表 , 薄截面表 )')}
              </Formula>
            </div>
          </div>
          <Tip>
            {L(
              <>
                <b>ตัวอย่าง (หนังสือ 8.1):</b> กำแพงหนา 25 ซม. สูง 2.50 ม. R = 2 ม./ชม. T = 30 °C slump 10 ซม. (k = 0.65) → γH = 6,000 · 2400(0.65)(2)+500 = <b>3,620</b> ·
                300(2)+10,000(0.25)+1,500 = 4,600 → Pmax = <b>3,620 กก./ม.²</b>
              </>,
              <>
                <b>Example (book 8.1):</b> wall 25 cm thick, 2.50 m high, R = 2 m/h, T = 30 °C, slump 10 cm (k = 0.65) → γH = 6,000 · 2400(0.65)(2)+500 = <b>3,620</b> ·
                300(2)+10,000(0.25)+1,500 = 4,600 → Pmax = <b>3,620 kg/m²</b>
              </>,
              <>
                <b>例(教材 8.1):</b>墙厚 25 cm,高 2.50 m,R = 2 m/h,T = 30 °C,坍落度 10 cm(k = 0.65)→ γH = 6,000 · 2400(0.65)(2)+500 = <b>3,620</b> ·
                300(2)+10,000(0.25)+1,500 = 4,600 → Pmax = <b>3,620 kg/m²</b>
              </>,
            )}
          </Tip>

          <H3 id="th-vertical">{L('น้ำหนักแนวดิ่ง (พื้นและท้องคาน)', 'Vertical loads (slabs and beam soffits)', '竖向荷载(楼板与梁底)')}</H3>
          <Formula
            note={L(
              '§6.4 — น้ำหนักจรระหว่างทำงาน (หนังสือ 150, ACI ≥ 245) และน้ำหนักแบบหล่อ (≈ 50 กก./ม.²)',
              '§6.4 — construction live load (book 150, ACI ≥ 245) and formwork weight (≈ 50 kg/m²)',
              '§6.4 —— 施工活荷载(教材 150,ACI ≥ 245)及模板自重(≈ 50 kg/m²)',
            )}
          >
            {L('w = γ·t + น้ำหนักจร + น้ำหนักแบบหล่อ (กก./ม.²)', 'w = γ·t + live load + formwork weight (kg/m²)', 'w = γ·t + 施工活荷载 + 模板自重 (kg/m²)')}
          </Formula>
          <Tip>
            {L(
              <>
                <b>ตัวอย่าง 6.1:</b> พื้นหนา 16 ซม. → 2,400 × 0.16 = 384 + 150 + 50 = <b>584 กก./ม.²</b>
              </>,
              <>
                <b>Example 6.1:</b> 16 cm slab → 2,400 × 0.16 = 384 + 150 + 50 = <b>584 kg/m²</b>
              </>,
              <>
                <b>例 6.1:</b>板厚 16 cm → 2,400 × 0.16 = 384 + 150 + 50 = <b>584 kg/m²</b>
              </>,
            )}
          </Tip>

          <H3 id="th-members">{L('การหาระยะเคร่า ตง คาน (ชิ้นส่วนรับแรงดัด)', 'Spacing of studs, joists and beams (bending members)', '竖楞、次楞、主楞间距(受弯构件)')}</H3>
          <Figure
            title={L('คานต่อเนื่องรับน้ำหนักแผ่', 'Continuous beam under uniform load', '均布荷载下的连续梁')}
            caption={L('แผ่นผิว เคร่า ตง คานรับเคร่า ส่วนใหญ่พาดต่อเนื่องหลายช่วง', 'Sheathing, studs, joists and wales mostly span continuously over several supports', '面板、竖楞、次楞、围檩大多为多跨连续')}
          >
            <ContinuousBeamFigure />
          </Figure>
          <p>
            {L(
              <>
                ชิ้นส่วนแต่ละตัวรับน้ำหนักแผ่ <span className="num">w = แรงดัน × ระยะห่างของมัน</span> แล้วหาช่วงยาวสูงสุด l ที่ยังผ่าน 3 เงื่อนไข ระบบเลือกค่าน้อยที่สุดแล้ว
                <b>ปัดลงทีละ 5 ซม.</b> (หรือขนาดโมดูล เช่น 30/40/60 ซม. ให้ลงตัวกับไม้อัด 1.22 × 2.44 ม.)
              </>,
              <>
                Each member carries a uniform load <span className="num">w = pressure × its spacing</span>; the longest span l that still passes the three conditions is found, the smallest is taken
                and <b>rounded down in 5 cm steps</b> (or to a module such as 30/40/60 cm to suit 1.22 × 2.44 m plywood).
              </>,
              <>
                每根构件承受均布荷载 <span className="num">w = 压力 × 其间距</span>,求出满足 3 个条件的最大跨度 l,系统取其中最小值并 <b>以 5 cm 向下取整</b>(或取模数,如 30/40/60 cm,以适配 1.22 × 2.44 m 胶合板)。
              </>,
            )}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Formula note={L('สมการ 5.2, 5.7 · S = bd²/6', 'Eqs. 5.2, 5.7 · S = bd²/6', '公式 5.2、5.7 · S = bd²/6')}>{L('แรงดัด', 'Bending', '弯曲')}: l = √( Fb·S / (0.1·w) )</Formula>
            <Formula note={L('สมการ 5.11–5.13 · ไม้ใช้ช่วง l − 2d', 'Eqs. 5.11–5.13 · timber uses span l − 2d', '公式 5.11–5.13 · 木材取跨度 l − 2d')}>{L('แรงเฉือน', 'Shear', '剪力')}: V = 5wl/8 ≤ 2·Fv·b·d/3</Formula>
            <Formula note={L('สมการ 5.28, 5.30 · ≈ 0.71·∛(EI/w)', 'Eqs. 5.28, 5.30 · ≈ 0.71·∛(EI/w)', '公式 5.28、5.30 · ≈ 0.71·∛(EI/w)')}>{L('แอ่นตัว', 'Deflection', '挠度')}: wl⁴/128EI ≤ l/360</Formula>
          </div>
          <Tip>
            {L(
              <>
                <b>ตัวอย่าง 6.1 (ตง 1½"×3" @75 ซม.):</b> w = 584 × 0.75 = 438 กก./ม. → แรงดัด l = 80 ซม. · แอ่นตัว l = 100 ซม. → ใช้ระยะคานรองรับ <b>80 ซม.</b> · คานรับเคร่าแบบคู่ ระยะ c/c
                = ช่วงสุทธิ + 10 ซม. (ความหนาของคานคู่) ตามธรรมเนียมในหนังสือ
              </>,
              <>
                <b>Example 6.1 (joists 1½"×3" @75 cm):</b> w = 584 × 0.75 = 438 kg/m → bending l = 80 cm · deflection l = 100 cm → stringer spacing <b>80 cm</b> · for double wales, c/c spacing =
                clear span + 10 cm (the double member's thickness), following the book's convention
              </>,
              <>
                <b>例 6.1(次楞 1½"×3" @75 cm):</b>w = 584 × 0.75 = 438 kg/m → 弯曲 l = 80 cm · 挠度 l = 100 cm → 主楞间距取 <b>80 cm</b> · 双围檩的中心距 = 净跨 + 10 cm(双拼构件厚度),按教材惯例
              </>,
            )}
          </Tip>

          <H3 id="th-ties">{L('Form tie', 'Form ties', '对拉螺栓 (Form tie)')}</H3>
          <div className="grid items-center gap-4 md:grid-cols-[1.1fr_1fr]">
            <Figure title={L('พื้นที่รับแรงของไทร์หนึ่งตัว', 'Tributary area of one tie', '单根对拉螺栓的受荷面积')}>
              <TieAreaFigure />
            </Figure>
            <div className="flex flex-col gap-2">
              <p>
                {L(
                  <>
                    ไทร์แต่ละตัวรับแรงดันบนพื้นที่ระหว่างคานรับเคร่าและระหว่างไทร์ข้างเคียง แรงดึงต้องไม่เกิน <b>SWL</b> (Safe Working Load) ของไทร์ (ตาราง 4.6 — มีค่าความปลอดภัย 2.0 แล้ว)
                  </>,
                  <>
                    Each tie carries the pressure on the area between adjacent wales and adjacent ties. The tension must not exceed the tie's <b>SWL</b> (safe working load; Table 4.6 — already
                    includes a safety factor of 2.0).
                  </>,
                  <>
                    每根螺栓承受相邻围檩之间、相邻螺栓之间面积上的侧压力,拉力不得超过螺栓的 <b>SWL</b>(安全工作荷载,表 4.6 —— 已含安全系数 2.0)。
                  </>,
                )}
              </p>
              <Formula
                note={L(
                  'ระยะไทร์ = min(จากความแข็งแรงคานรับเคร่า, SWL ÷ (P × ระยะคานรับเคร่า)) ปัดเป็น 30/40/60/80/120 ซม.',
                  'Tie spacing = min(from wale strength, SWL ÷ (P × wale spacing)), rounded to 30/40/60/80/120 cm',
                  '螺栓间距 = min(按围檩强度, SWL ÷ (P × 围檩间距)),取整为 30/40/60/80/120 cm',
                )}
              >
                {L('T = P × s_คานรับเคร่า × s_ไทร์ ≤ SWL', 'T = P × s_wale × s_tie ≤ SWL', 'T = P × s_围檩 × s_螺栓 ≤ SWL')}
              </Formula>
            </div>
          </div>

          <H3 id="th-shores">{L('เสาค้ำ นั่งร้าน และการโก่งเดาะ', 'Shores, scaffolding and buckling', '立杆、脚手架与屈曲')}</H3>
          <div className="grid items-center gap-4 md:grid-cols-[1.1fr_1fr]">
            <Figure
              title={L('ความยาวไม่ค้ำยัน', 'Unbraced length', '计算长度')}
              caption={L('ค้ำยันทางข้างที่กลางความสูงลดความยาวไม่ค้ำยันเหลือครึ่ง', 'Lateral bracing at mid-height halves the unbraced length', '中部水平拉结使计算长度减半')}
            >
              <BucklingFigure />
            </Figure>
            <div className="flex flex-col gap-2">
              <Formula note={L('§6.4 ขั้นที่ 5 · พื้นที่รับน้ำหนักต่อต้น = ระยะคานรองรับ × ระยะเสาค้ำ', '§6.4 step 5 · tributary area per shore = stringer spacing × shore spacing', '§6.4 第 5 步 · 每根立杆受荷面积 = 主楞间距 × 立杆间距')}>P = w × l × L</Formula>
              <Formula note={L('ไม้ สมการ 5.15–5.16 · d = ด้านแคบ (ไม้กลมใช้เส้นผ่านศูนย์กลาง) · l/d ≤ 50', 'Timber eqs. 5.15–5.16 · d = least dimension (diameter for round poles) · l/d ≤ 50', '木材 公式 5.15–5.16 · d = 截面短边(圆木取直径)· l/d ≤ 50')}>
                Fa = 0.30·E / (l/d)² ≤ Fc · P = Fa·A
              </Formula>
              <Formula note={L('ท่อเหล็ก สมการ 5.17–5.18 · r = √(OD² + ID²)/4', 'Steel tube eqs. 5.17–5.18 · r = √(OD² + ID²)/4', '钢管 公式 5.17–5.18 · r = √(OD² + ID²)/4')}>
                l/r &lt; 132: Fa = 1,250 − 0.033(l/r)² · l/r ≥ 132: Fa = 10⁷/(l/r)²
              </Formula>
              <Formula note={L('นั่งร้าน / Steel prop: ใช้ค่าจากผู้ผลิต', 'Scaffold / steel props: manufacturer values', '脚手架 / 钢支撑:采用厂家数据')}>
                {L('P ต่อขา ≤ SWL · แรงกดใต้แป้นรองฐาน ≤ กำลังรับแรงของพื้น/ดิน', 'P per leg ≤ SWL · bearing under the base plate ≤ capacity of the floor/soil', '每根立杆 P ≤ SWL · 底座垫板下压力 ≤ 楼板/地基承载力')}
              </Formula>
            </div>
          </div>
          <Tip>
            {L(
              <>
                <b>ตัวอย่าง 6.1:</b> ท่อ Ø2" บาง สูง 2.80 ม. ไม่มีค้ำยัน → l/r = 138 → Fa = 525 กก./ซม.² → P = 2,745 กก. &gt; 630 กก. ผ่าน · ค้ำยันทางข้างของระบบเสาค้ำ ระบบใช้ ACI 347:
                แรงด้านข้าง ≥ 2% ของน้ำหนักบรรทุกคงที่ หรือ 150 กก./ม. ต่อแถว
              </>,
              <>
                <b>Example 6.1:</b> thin Ø2" tube, 2.80 m high, unbraced → l/r = 138 → Fa = 525 kg/cm² → P = 2,745 kg &gt; 630 kg, passes · lateral bracing of the shoring follows ACI 347:
                lateral force ≥ 2% of the dead load or 150 kg/m per row
              </>,
              <>
                <b>例 6.1:</b>Ø2" 薄壁钢管,高 2.80 m,无拉结 → l/r = 138 → Fa = 525 kg/cm² → P = 2,745 kg &gt; 630 kg,满足 · 立杆体系的水平拉结按 ACI 347:水平力 ≥ 恒载的 2% 或每排 150 kg/m
              </>,
            )}
          </Tip>

          <H3 id="th-braces">{L('ค้ำยันแบบกำแพง/เสา', 'Wall and column form bracing', '墙/柱模板斜撑')}</H3>
          <p>
            {L(
              'ค้ำยันมีหน้าที่รักษาแนวดิ่งและกันแบบล้ม ไม่ได้รับแรงดันคอนกรีต (ไทร์รับ) ระบบคิดแรงด้านข้างจากกรณีที่มากที่สุดของ 3 กรณี (§8.4):',
              'Braces keep the form plumb and stop it toppling; they do not take the concrete pressure (the ties do). The lateral force is the largest of three cases (§8.4):',
              '斜撑用于保持模板垂直并防止倾覆,不承受混凝土侧压力(由对拉螺栓承受)。水平力取以下 3 种情况中的最大值(§8.4):',
            )}
          </p>
          <Table
            head={L(['กรณี', 'แรงต่อความยาว 1 ม.'], ['Case', 'Force per 1 m length'], ['工况', '每米长度的力'])}
            rows={L(
              [
                ['แรงลม', 'ลม (50–100 กก./ม.²) × ความสูง'],
                ['ระดับคอนกรีตสองข้างต่างกัน', 'γ × (ความหนา)² / 2'],
                ['เยื้องศูนย์ 10%', 'น้ำหนักกำแพง × 0.1·t / ความสูงจุดยึด'],
              ],
              [
                ['Wind', 'Wind (50–100 kg/m²) × height'],
                ['Unequal concrete levels on the two sides', 'γ × (thickness)² / 2'],
                ['10% eccentricity', 'Wall weight × 0.1·t / height of the brace point'],
              ],
              [
                ['风荷载', '风压 (50–100 kg/m²) × 高度'],
                ['两侧混凝土浇筑高度不同', 'γ × (厚度)² / 2'],
                ['10% 偏心', '墙重 × 0.1·t / 支撑点高度'],
              ],
            )}
          />
          <Formula
            note={L(
              'θ = มุมค้ำยันกับพื้น (แนะนำ 60°) · ค้ำด้านเดียวต้องตรวจแรงดึงด้วย',
              'θ = brace angle to the ground (60° recommended) · one-sided bracing must also be checked in tension',
              'θ = 斜撑与地面夹角(建议 60°)· 单侧支撑还须验算受拉',
            )}
          >
            {L('F = H × ระยะค้ำยัน / cos θ / จำนวนระดับ ≤ Fa·A', 'F = H × brace spacing / cos θ / number of levels ≤ Fa·A', 'F = H × 斜撑间距 / cos θ / 层数 ≤ Fa·A')}
          </Formula>

          <H3 id="th-column-shapes">{L('เสากลม หลายเหลี่ยม และตัว L/T/U', 'Round, polygonal and L/T/U columns', '圆柱、多边形柱与 L/T/U 形柱')}</H3>
          <p>
            {L(
              <>
                ในกลุ่ม <b>ขนาดเสา</b> เลือกรูปหน้าตัดได้ 7 แบบ: สี่เหลี่ยม (b × h) กลม (กรอก D) หกเหลี่ยมและแปดเหลี่ยม (กรอก F = ระยะข้ามด้านแบน ระบบแสดงยาวด้าน a ให้) และตัว L / T / U (กรอกขนาดรวมและความหนาของแต่ละขา) แรงดันคอนกรีตคิดด้วยความหนา d = D, F หรือขาที่บางที่สุด
              </>,
              <>
                In the <b>Column size</b> group pick one of seven sections: rectangle (b × h), round (enter D), hexagon or octagon (enter F, the distance across the flats; the side a is shown), and L / T / U (enter the overall sizes and the thickness of each leg). The concrete pressure uses d = D, F or the thinnest leg.
              </>,
              <>
                在 <b>柱尺寸</b> 中可选 7 种截面:矩形(b × h)、圆形(输入 D)、六边形和八边形(输入 F = 对边距离,系统显示边长 a),以及 L / T / U 形(输入总尺寸和各肢厚度)。混凝土侧压力按 d = D、F 或最薄肢计算。
              </>,
            )}
          </p>
          <Figure title={L('ระบบแบบหล่อที่ระบบคำนวณ', 'Form systems the calculator designs', '系统计算的模板体系')} caption={L('ตามรูป 9.2 และตัวอย่าง 9.2', 'after Fig 9.2 and Example 9.2', '依据图 9.2 与例 9.2')}>
            <ColumnShapesFigure />
          </Figure>
          <Table
            head={L(['หน้าตัด', 'ระบบแบบหล่อ', 'สิ่งที่ตรวจ'], ['Section', 'Form system', 'What is checked'], ['截面', '模板体系', '验算内容'])}
            rows={L(
              [
                ['กลม', 'ไม้ระแนงตั้ง + กรอบคานรัดไม้กระดานกว้างเจาะโค้ง (ค่าเริ่มต้น 1"×10")', 'ระแนงเป็นคานต่อเนื่องระหว่างคานรัด · คานรัดแต่ละแผ่นช่วง D: F = wD/2, M = wD²/8 บนหน้าตัดสุทธิที่รอยเจาะ'],
                ['กลม', 'แบบเหล็กสำเร็จรูป 2 ซีก', 'แรงดัน ≤ ค่าที่ผู้ผลิตรับรอง · สลักปีกแบบ T = P × D/2 × ระยะสลัก'],
                ['กลม', 'ท่อกระดาษ', 'แรงดัน ≤ ค่าที่ผู้ผลิตรับรอง'],
                ['หก/แปดเหลี่ยม', 'กรอบคานรัดสี่เหลี่ยม + ไม้อุดมุม (ค่าเริ่มต้น)', 'เหมือนเสาสี่เหลี่ยมขนาดเท่ากรอบ (แปดเหลี่ยม F × F, หกเหลี่ยม 2R × F) ใช้ไทร์ได้'],
                ['หก/แปดเหลี่ยม', 'คานรัดวงแหวนตามรูป', 'แต่ละด้านช่วง a: M = wa²/8 ร่วมกับแรงดึง T = wF/2 · ไม่ใช้ไทร์'],
                ['ตัว L / T / U', 'คานรัดตามทุกหน้า + Form tie ที่มุมใน (ค่าเริ่มต้น)', 'แยกเป็นขาสี่เหลี่ยม แต่ละขาเหมือนเสาสี่เหลี่ยมที่โคนยึดด้วยไทร์ · ไทร์มุมในบังคับ L 2, T 3, U 4 แถว · แบ่งช่วงด้วยไทร์เพิ่มได้ (ตามขา ผ่านมุม และผ่านปลายขา) · ตัว U ตรวจช่องในว่าวางแบบในสองฝั่งได้'],
                ['ตัว L / T / U', 'กรอบคานรัดสี่เหลี่ยม + กล่องไม้อุดที่มุมเว้า (รูป 9.2)', 'เหมือนเสาสี่เหลี่ยมขนาดเท่ากรอบ ใช้ไทร์ได้ · เหมาะกับเสาเล็กที่มุมเว้าไม่ใหญ่'],
              ],
              [
                ['Round', 'Vertical staves + a frame of wide boards cut out to the circle (default 1"×10")', 'Staves as a continuous beam between yokes · each yoke board spans D: F = wD/2, M = wD²/8 on the net section at the cut-out'],
                ['Round', 'Ready-made steel form in two halves', 'Pressure ≤ maker rating · flange bolts T = P × D/2 × bolt spacing'],
                ['Round', 'Cardboard tube', 'Pressure ≤ maker rating'],
                ['Hexagon/octagon', 'Box of yokes + corner fillers (default)', 'As a rectangular column the size of the box (octagon F × F, hexagon 2R × F); ties allowed'],
                ['Hexagon/octagon', 'Ring of yokes along the faces', 'Each face spans a: M = wa²/8 with tension T = wF/2 · no ties'],
                ['L / T / U', 'Yokes along every face + form ties at the inner corners (default)', 'Split into rectangular legs, each like a rectangular column held at its root by the tie · inner-corner ties required: L 2, T 3, U 4 rows · more ties may split the legs, the corner spans and the end faces · a U checks there is room for the inner forms'],
                ['L / T / U', 'Rectangular box of yokes + filler boxes in the re-entrant corners (Fig 9.2)', 'As a rectangular column the size of the box; ties allowed · suits small columns with small re-entrant corners'],
              ],
              [
                ['圆形', '竖向木条 + 开弧形口的宽木板柱箍框(默认 1"×10")', '木条按柱箍间连续梁 · 每块柱箍板跨度 D:F = wD/2, M = wD²/8,按开口处净截面'],
                ['圆形', '两半式定型钢模板', '压力 ≤ 厂家额定值 · 法兰螺栓 T = P × D/2 × 螺栓间距'],
                ['圆形', '纸管模板', '压力 ≤ 厂家额定值'],
                ['六/八边形', '矩形柱箍框 + 角部填块(默认)', '按与框同尺寸的矩形柱计算(八边形 F × F,六边形 2R × F),可用对拉螺栓'],
                ['六/八边形', '沿边环形柱箍', '每边跨度 a:M = wa²/8 并受拉 T = wF/2 · 不用对拉螺栓'],
                ['L / T / U 形', '沿各面柱箍 + 内角对拉螺栓(默认)', '拆分为矩形肢,每肢按根部由对拉螺栓固定的矩形柱计算 · 内角螺栓必需:L 2、T 3、U 4 排 · 可加螺栓沿肢、穿过角部及肢端分跨 · U 形验算内模空间'],
                ['L / T / U 形', '矩形柱箍框 + 凹角填充木箱(图 9.2)', '按与框同尺寸的矩形柱计算,可用对拉螺栓 · 适合凹角较小的小柱'],
              ],
            )}
          />
          <Formula
            note={L(
              'ค่าเริ่มต้น: ขอบในของไม้ 4 ด้านพบกันบนวงกลมที่ 45° · r₀ = D/2 + ความหนาระแนง · กรอกเองได้ในช่อง “ความลึกสุทธิที่รอยเจาะ”',
              'Default: the inner edges of the four boards meet on the circle at 45° · r₀ = D/2 + stave thickness · enter your own in “Net depth at the cut-out”',
              '默认:四块板内边在圆上 45° 处相交 · r₀ = D/2 + 木条厚度 · 可在“开口处净高”中自行输入',
            )}
          >
            {L('ความลึกสุทธิ = กว้างไม้ − r₀(1 − cos 45°)', 'net depth = board width − r₀(1 − cos 45°)', '净高 = 板宽 − r₀(1 − cos 45°)')}
          </Formula>
          <Tip warn>
            {L(
              'ไม้อัดดัดโค้งได้เฉพาะรัศมีใหญ่ (หนา 18 มม. ต้อง R ≥ 3.6 ม.) เสากลมจึงใช้ระแนงหรือไม้อัดตัดเป็นแถบ · ค่าแรงดันที่ผู้ผลิตรับรองของแบบเหล็ก/ท่อกระดาษเป็นค่าตัวอย่าง ต้องกรอกค่าจริงของผลิตภัณฑ์ที่ใช้',
              'Plywood only bends to large radii (18 mm needs R ≥ 3.6 m), so a round column uses staves or plywood cut into strips · the rated pressure of a steel form or tube is a placeholder — enter the figure of the product used',
              '胶合板只能弯成大半径(18 mm 需 R ≥ 3.6 m),所以圆柱采用木条或切成条的胶合板 · 钢模板/纸管的额定压力为示例值,须输入所用产品的实际数值',
            )}
          </Tip>

          <H3 id="th-beam">{L('แบบหล่อคาน', 'Beam forms', '梁模板')}</H3>
          <div className="grid grid-cols-1 items-start gap-4">
            <Figure title={L('คานหล่อร่วมพื้น', 'Beam cast with the slab', '梁板同浇')}>
              <BeamSectionFigure />
            </Figure>
            <div className="flex flex-col gap-2">
              <p>
                {L(
                  <>
                    คานคิดเป็น 2 ส่วน: <b>แบบข้าง</b> เหมือนกำแพงเตี้ย (แรงดันของเหลว γh เป็นสามเหลี่ยม) และ <b>ท้องแบบ</b> เหมือนพื้น
                  </>,
                  <>
                    A beam is designed in two parts: the <b>side forms</b> like a low wall (triangular liquid pressure γh) and the <b>soffit</b> like a slab.
                  </>,
                  <>
                    梁分两部分计算:<b>侧模</b> 按矮墙计算(三角形液体压力 γh),<b>底模</b> 按楼板计算。
                  </>,
                )}
              </p>
              <Formula note={L('เคร่าข้างไม่มีไทร์ = คานช่วงเดียวรับแรงสามเหลี่ยม (W = γh²/2 × ระยะเคร่า)', 'Side studs without ties = single span under triangular load (W = γh²/2 × stud spacing)', '无螺栓的侧竖楞 = 承受三角形荷载的单跨梁(W = γh²/2 × 竖楞间距)')}>
                M = 2WL/(9√3) · V = 2W/3
              </Formula>
              <Formula note={L('ท้องแบบ (ไม้เสริมวางนอน) รับคอนกรีตคานทั้งหมด · ระยะคานขวางเป็นทวีคูณของระยะเคร่า', 'The soffit (battens laid flat) carries all the beam concrete · head spacing is a multiple of the stud spacing', '底模(加强木平放)承受全部梁混凝土 · 横担间距为竖楞间距的整数倍')}>
                {L('w = γ·b·h → ระยะคานขวาง', 'w = γ·b·h → head spacing', 'w = γ·b·h → 横担间距')}
              </Formula>
              <Formula
                note={L(
                  'รูป 7.7 — คอนกรีตคาน + พื้นที่ถ่ายลง + แบบหล่อ (คาน 100 กก./ม., พื้น 50 กก./ม.²) + น้ำหนักจร',
                  'Fig. 7.7 — beam concrete + slab bearing on it + formwork (beam 100 kg/m, slab 50 kg/m²) + live load',
                  '图 7.7 —— 梁混凝土 + 传来的楼板荷载 + 模板(梁 100 kg/m,板 50 kg/m²)+ 施工活荷载',
                )}
              >
                {L('P เสาค้ำ = น้ำหนักต่อความยาว × ระยะคานขวาง', 'P shore = load per length × head spacing', 'P 立杆 = 线荷载 × 横担间距')}
              </Formula>
              <p className="text-sm text-slate-600">
                {L(
                  'คานเดี่ยวหรือคานขอบต้องมีค้ำยันปากแบบ (แรงที่ปากแบบ ≈ γh²/6 ต่อเมตร) คานลึกเกิน 0.9 ม. ควรใช้ไทร์ + คานรับเคร่า',
                  'Isolated or edge beams need bracing at the top of the side form (force at the top ≈ γh²/6 per metre); beams deeper than 0.9 m should use ties + wales.',
                  '独立梁或边梁须在侧模上口设支撑(上口力 ≈ γh²/6 每米);梁高超过 0.9 m 宜采用对拉螺栓 + 围檩。',
                )}
              </p>
            </div>
          </div>

          <H3 id="th-footing">{L('แบบหล่อฐานราก', 'Footing forms', '基础模板')}</H3>
          <div className="grid grid-cols-1 items-start gap-4">
            <Figure title={L('ฐานรากแบบค้ำยันลงหลัก', 'Footing braced to stakes', '斜撑至木桩的基础模板')}>
              <FootingFigure />
            </Figure>
            <div className="flex flex-col gap-2">
              <p>
                {L(
                  'แรงดันคิดเหมือนกำแพง (ใช้ด้านแคบของฐานเป็น d) เคร่ายึดได้ 3 แบบตาม §10.4:',
                  'Pressure is taken as for a wall (the narrow side of the footing is d). Studs can be restrained in three ways (§10.4):',
                  '侧压力按墙计算(以基础短边作为 d)。竖楞有 3 种固定方式(§10.4):',
                )}
              </p>
              <Table
                head={L(['แบบ', 'เหมาะกับ', 'ตรวจอะไร'], ['Type', 'Suits', 'Checks'], ['方式', '适用于', '验算内容'])}
                rows={L(
                  [
                    ['ปลายยื่นตอกลงดิน', 'ฐานตื้น ≤ 0.6 ม. ดินแข็ง', 'M = wL²/2 · การแอ่นปลาย · ความลึกหลัก'],
                    ['ค้ำยันทแยงลงหลัก (ทุกเคร่า หรือผ่านคานรับเคร่า)', 'ฐานลึกปานกลาง ดินแข็ง', 'ช่วงระหว่างจุดค้ำ · แรงในค้ำยัน · ความลึกหลัก F/(q·b) · คานรับเคร่าช่วงระหว่างค้ำยัน'],
                    ['คานรับเคร่ารอบฐาน (+ ไทร์)', 'ฐานลึก / ดินอ่อน / ฐานใหญ่', 'เคร่าเหมือนกำแพง · คานรับเคร่าแบบคานรัดเสา · แรงในไทร์'],
                  ],
                  [
                    ['Cantilever driven into the ground', 'Shallow footings ≤ 0.6 m, firm soil', 'M = wL²/2 · tip deflection · stake depth'],
                    ['Diagonal braces to stakes (every stud, or via a wale)', 'Medium-depth footings, firm soil', 'Span between brace points · brace force · stake depth F/(q·b) · wale span between braces'],
                    ['Wales around the footing (+ ties)', 'Deep / soft soil / large footings', 'Studs as for a wall · wales as column yokes · tie force'],
                  ],
                  [
                    ['悬臂插入土中', '浅基础 ≤ 0.6 m,硬土', 'M = wL²/2 · 端部挠度 · 木桩入土深度'],
                    ['斜撑至木桩(每根竖楞或经围檩)', '中等深度基础,硬土', '支撑点间跨度 · 斜撑力 · 木桩深度 F/(q·b) · 斜撑间围檩跨度'],
                    ['基础四周围檩(+ 对拉螺栓)', '深基础 / 软土 / 大基础', '竖楞按墙计算 · 围檩按柱箍计算 · 螺栓拉力'],
                  ],
                )}
              />
              <p>
                {L(
                  <>
                    <b>คานรับเคร่ารอบฐาน</b> ทำงานเหมือนคานรัดเสา (§9.4 ตัวอย่าง 9.1): แต่ละด้านรับแรงดัดในช่วงระหว่างไทร์ (หรือมุมถึงมุมถ้าไม่มีไทร์) และรับ<b>แรงดึง</b>จากปลายคานด้านที่ตั้งฉาก
                    จึงตรวจแบบแรงดึงร่วมแรงดัด
                  </>,
                  <>
                    <b>Wales around a footing</b> act like column yokes (§9.4, example 9.1): each side bends over the span between ties (or corner to corner without ties) and takes{' '}
                    <b>tension</b> from the ends of the perpendicular wales, so it is checked for combined tension and bending.
                  </>,
                  <>
                    <b>基础四周的围檩</b> 的受力与柱箍相同(§9.4 例 9.1):每边在螺栓之间(无螺栓时为角到角)受弯,同时承受垂直方向围檩端部传来的 <b>拉力</b>,因此按拉弯构件验算。
                  </>,
                )}
              </p>
              <Formula
                note={L(
                  'w = P × ระยะคานรับเคร่า · ช่วงด้านตั้งฉาก = ระยะไทร์ หรือความยาวด้านนั้นถ้าไม่มีไทร์',
                  'w = P × wale spacing · perpendicular span = tie spacing, or that side’s length without ties',
                  'w = P × 围檩间距 · 垂直边跨度 = 螺栓间距,无螺栓时取该边长度',
                )}
              >
                {L('T = w × ช่วงด้านตั้งฉาก / 2 · σ = T/A ± M/S ≤ Ft, Fc', 'T = w × perpendicular span / 2 · σ = T/A ± M/S ≤ Ft, Fc', 'T = w × 垂直边跨度 / 2 · σ = T/A ± M/S ≤ Ft, Fc')}
              </Formula>
              <Table
                head={L(['การวางไทร์', 'ใช้เมื่อ'], ['Tie layout', 'Use when'], ['螺栓布置', '适用情况'])}
                rows={L(
                  [
                    ['ไม่ใช้ไทร์ (คานรัดรอบฐาน)', 'ฐานเล็ก — ระบบลดระยะคานรับเคร่าทีละ 5 ซม. (ไม่น้อยกว่า 25 ซม.) จนผ่าน'],
                    ['ไทร์ขวางด้านสั้น', 'ฐานแคบยาว เช่น คานคอดิน — ด้านสั้นต้องรับช่วงมุมถึงมุมได้'],
                    ['ไทร์ทั้งสองทิศทาง', 'ฐานกว้างทั้งสองด้าน เช่น ฐานเข็ม 2.4 × 2.4 ม. ขึ้นไป'],
                    ['อัตโนมัติ (ค่าเริ่มต้น)', 'ลองตามลำดับข้างบนแล้วเลือกแบบแรกที่ผ่าน'],
                  ],
                  [
                    ['No ties (wales yoke the footing)', 'Small footings — the wale spacing is reduced in 5 cm steps (not below 25 cm) until it passes'],
                    ['Ties across the short side', 'Long narrow footings such as grade beams — the short side must span corner to corner'],
                    ['Ties both ways', 'Footings wide both ways, e.g. pile caps 2.4 × 2.4 m and larger'],
                    ['Automatic (default)', 'Tries the above in order and takes the first that passes'],
                  ],
                  [
                    ['不设螺栓(围檩箍住基础)', '小基础 —— 系统以 5 cm 递减围檩间距(不小于 25 cm)直至满足'],
                    ['短边方向设螺栓', '窄长基础,如地梁 —— 短边须能承受角到角跨度'],
                    ['双向设螺栓', '两向均宽的基础,如 2.4 × 2.4 m 及以上的承台'],
                    ['自动(默认)', '按上述顺序尝试,取第一个满足的方案'],
                  ],
                )}
              />
              <p>
                {L(
                  <>
                    <b>มุมคานรับเคร่า</b> — <i>วางไขว้</i> (ค่าเริ่มต้น): คานทุกด้านยาวเต็มท่อนเลยมุม ไม่ต้องตัดไม้ คานด้านสั้นเลื่อนลง (หรือขึ้น) หนึ่งชุดคานเพื่อวางซ้อนคานด้านยาว — อัตโนมัติจะเลื่อนลงก่อนเพราะใกล้แรงดันสูงสุดที่ฐาน
                    ถ้าคานล่างห่างฐานไม่ถึง 3 ซม. จึงเลื่อนขึ้น · <i>ตัดชน</i>: ทุกด้านระดับเดียวกัน คานด้านสั้นตัดชนผิวในคานด้านยาว (รูป 8.11)
                  </>,
                  <>
                    <b>Wale corners</b> — <i>Lapped</i> (default): every wale runs full length past the corner, no cutting; the short-side wales shift down (or up) one wale depth to sit on the
                    long-side wales — automatic shifts down first, nearer the peak pressure at the base, and up only if the lower wale would be less than 3 cm above the base · <i>Butted</i>: all
                    sides at one level, the short-side wales cut to butt against the inside face of the long-side wales (Fig. 8.11)
                  </>,
                  <>
                    <b>围檩转角</b> —— <i>交叉搭接</i>(默认):各边围檩整根通过转角,无需截断;短边围檩下移(或上移)一个围檩高度叠放在长边围檩上 —— 自动模式优先下移(更接近底部最大侧压力),若下层围檩距基底不足 3 cm 才上移 ·{' '}
                    <i>对接</i>:各边同一标高,短边围檩截断顶在长边围檩内侧(图 8.11)
                  </>,
                )}
              </p>
              <Formula
                note={L(
                  'ความกว้างจากแรงกดตั้งฉากเสี้ยนไม้ (Fc⊥) · ความหนาจากแรงดัดคร่อมช่องระหว่างคานคู่ (Fb = 0.6Fy)',
                  'Width from bearing across the grain (Fc⊥) · thickness from bending across the gap between the double wale (Fb = 0.6Fy)',
                  '宽度按横纹承压 (Fc⊥) 确定 · 厚度按跨越双拼围檩间隙的弯曲确定 (Fb = 0.6Fy)',
                )}
              >
                {L('เหล็กประกับไทร์: T ≤ Fc⊥ × n·b × w · t ≥ √(6·T·L/4 ÷ (w·Fb))', 'Tie washer plate: T ≤ Fc⊥ × n·b × w · t ≥ √(6·T·L/4 ÷ (w·Fb))', '螺栓垫板:T ≤ Fc⊥ × n·b × w · t ≥ √(6·T·L/4 ÷ (w·Fb))')}
              </Formula>
              <p className="text-sm text-slate-600">
                {L(
                  <>
                    แท็บ <b>ผลการคำนวณ</b> ของฐานรากมีการ์ด “เปรียบเทียบรูปแบบการยึดแบบฐานราก” ตรวจทั้ง 6 รูปแบบด้วยไม้ชุดเดียวกัน แล้วบอกว่าต้องใช้ Form tie หรือไม่ และแนะนำแบบที่ง่ายที่สุดที่ผ่าน (ดินรับแรงต่ำกว่า 5
                    ตัน/ม.² จะไม่แนะนำแบบที่ใช้หลักในดิน)
                  </>,
                  <>
                    A footing's <b>Results</b> tab has a “Compare footing restraint options” card that checks all six options with the same timber, says whether form ties are needed and
                    recommends the simplest one that passes (with soil bearing below 5 t/m², options using stakes in the ground are not recommended).
                  </>,
                  <>
                    基础的 <b>计算结果</b> 选项卡中有“基础模板固定方式比较”卡片,用同一套木材验算全部 6 种方式,说明是否需要对拉螺栓,并推荐满足要求的最简单方式(地基承载力低于 5 t/m² 时不推荐使用木桩的方式)。
                  </>,
                )}
              </p>
            </div>
          </div>
          <p>
            {L(
              <>
                <b>รูปแปลนฐานราก</b> เลือกได้ 7 แบบเหมือนเสา เคร่า ค้ำยัน และหลัก คิดต่อความยาวหน้า จึงใช้ได้กับทุกรูป (จำนวนตามเส้นรอบรูป) ส่วนที่ต่างกันคือคานรับเคร่ารอบฐาน:
              </>,
              <>
                <b>Footing plan</b>: the same seven shapes as a column. Studs, braces and stakes work per metre of face, so they suit every shape (counted round the perimeter); what differs is the wales:
              </>,
              <>
                <b>基础平面形状</b> 与柱相同共 7 种。竖楞、斜撑和木桩按每米面长计算,适用于所有形状(按周长计数);不同之处在于围檩:
              </>,
            )}
          </p>
          <Table
            head={L(['รูป', 'คานรับเคร่ารอบฐาน (+ ไทร์)', 'หมายเหตุ'], ['Shape', 'Wales round the footing (+ ties)', 'Note'], ['形状', '基础周边围檩(+ 对拉螺栓)', '说明'])}
            rows={L(
              [
                ['สี่เหลี่ยม', 'เหมือนเดิม: ไม่ใช้ไทร์ / ขวางด้านสั้น / สองทิศทาง', 'มุมคานวางไขว้หรือตัดชน'],
                ['กลม', 'ใช้ไม่ได้ (ไม่มีคานรับเคร่าตรง)', 'เคร่าปลายยื่นหรือค้ำยันทุกเคร่า · ไม้อัดดัดโค้ง 9 มม. R ≥ 0.9 ม., 12 มม. R ≥ 1.8 ม.'],
                ['หก/แปดเหลี่ยม', 'วงแหวนตามหน้า M = wa²/8, T = wF/2 ไม่ใช้ไทร์', 'ต่อมุมด้วยเหล็กประกับ'],
                ['ตัว L / T / U', 'คานตามทุกหน้า + ไทร์มุมใน (L 2, T 3, U 4 แถว) ระบบเพิ่มไทร์กลางขาเองถ้าจำเป็น', 'แต่ละขาคิดเหมือนเสาสี่เหลี่ยม · เหล็กประกับที่ปลายไทร์'],
              ],
              [
                ['Rectangle', 'As before: no ties / across the short side / both ways', 'Wale corners crossed or butted'],
                ['Round', 'Not used (no straight wales)', 'Cantilever studs or braces at every stud · plywood bends to R ≥ 0.9 m at 9 mm, 1.8 m at 12 mm'],
                ['Hexagon/octagon', 'Ring along the faces M = wa²/8, T = wF/2, no ties', 'Corners joined with steel plates'],
                ['L / T / U', 'Wales on every face + inner-corner ties (L 2, T 3, U 4 rows); ties along the legs added when needed', 'Each leg as a rectangular column · bearing plates at the tie ends'],
              ],
              [
                ['矩形', '同前:不用螺栓 / 横穿短边 / 双向', '围檩角部交叉或对接'],
                ['圆形', '不适用(无直围檩)', '悬臂竖楞或每根竖楞设斜撑 · 胶合板 9 mm 可弯至 R ≥ 0.9 m,12 mm 至 1.8 m'],
                ['六/八边形', '沿面环形 M = wa²/8, T = wF/2,不用螺栓', '角部用钢夹板连接'],
                ['L / T / U 形', '各面围檩 + 内角螺栓(L 2、T 3、U 4 排),需要时自动增加肢中部螺栓', '每肢按矩形柱计算 · 螺栓端部设钢垫板'],
              ],
            )}
          />

          <H3 id="th-materials">{L('ค่าวัสดุที่ใช้ (กก./ซม.²)', 'Material values (kg/cm²)', '材料参数 (kg/cm²)')}</H3>
          <Table
            head={[L('วัสดุ', 'Material', '材料'), 'E', 'Fb', 'Fv', 'Fc', L('อ้างอิง', 'Reference', '出处')]}
            rows={[...timber, ...others].map((m) => [m.name, <span className="num">{fmt(m.E)}</span>, <span className="num">{m.Fb}</span>, <span className="num">{m.Fv ?? '–'}</span>, <span className="num">{m.Fc ?? '–'}</span>, <span className="text-xs text-muted">{m.ref}</span>])}
          />
          <Table
            head={['Form tie', L('SWL (กก.)', 'SWL (kg)', 'SWL (kg)'), L('อ้างอิง', 'Reference', '出处')]}
            rows={TIES.map((t) => [t.name, <span className="num">{fmt(t.swl)}</span>, <span className="text-xs text-muted">{t.ref}</span>])}
          />
          <p className="text-sm text-slate-600">
            {L(
              'ไม้แปรรูปใช้ขนาดตามชื่อ 1" = 2.5 ซม. (เช่น 1½"×3" = 3.75 × 7.5 ซม.) ตามตัวอย่างในหนังสือ · เพิ่ม/ตรวจหน้าตัดทั้งหมดได้ที่เมนู คลังวัสดุ',
              'Sawn timber uses nominal sizes, 1" = 2.5 cm (e.g. 1½"×3" = 3.75 × 7.5 cm), as in the book examples · add or review every section in the Materials library menu',
              '锯材按名义尺寸 1" = 2.5 cm 计(如 1½"×3" = 3.75 × 7.5 cm),与教材例题一致 · 可在“材料库”菜单中添加/查看所有截面',
            )}
          </p>

          {/* ------------------------------------------------------------ FAQ */}
          <H2 id="faq">{L('คำถามที่พบบ่อย', 'Frequently asked questions', '常见问题')}</H2>
          <div className="flex flex-col gap-2">
            {L<[string, string][]>(
              [
                ['ทำไมระยะที่ระบบเลือกถึงให้ Ratio ใกล้ 1.00?', 'ระบบเลือกระยะมากที่สุดที่ยังผ่าน (ปัดลงทีละ 5 ซม.) เพื่อใช้วัสดุน้อยที่สุด ถ้าต้องการส่วนเผื่อ ให้กำหนดระยะเองให้น้อยลง หรือตั้ง Ratio สูงสุดใน Optimizer'],
                ['ผลไม่ตรงกับหนังสือเล็กน้อย', 'หนังสือใช้ 1½" = 3.7 ซม. ในบางตัวอย่าง และปัดตัวเลขระหว่างทาง ระบบใช้ 3.75 ซม. และค่าเต็ม จึงต่างกันไม่เกิน 1–5% จุดที่หนังสือพิมพ์ผิดถูกบันทึกไว้ใน README และในชุดทดสอบ'],
                ['ลากจุดสีส้มแล้วระยะไม่กลับเป็นอัตโนมัติ', 'การลากจะกำหนดระยะเอง ให้ลบตัวเลขในช่องระยะ (ช่องจะขึ้นว่า “อัตโนมัติ”)'],
                ['Shop drawing ไม่มีเลขหน้า / ขนาดผิด', 'พิมพ์จาก Chrome หรือ Edge ตั้งกระดาษ A3 แนวนอน ขอบ 0 (ระบบตั้งให้แล้ว) และเลือก “บันทึกเป็น PDF”'],
                ['ไม่เห็นเมนูนำเข้าแบบ / BOM', 'เมนูขึ้นกับบทบาท — ติดต่อ Master Admin ให้เพิ่มบทบาท (เช่น วิศวกรออกแบบ ผู้ประมาณราคา) และมอบหมายโครงการ'],
                ['AI อ่านแบบผิด', 'ใช้ภาพที่ชัด ครอบเฉพาะตารางหรือแปลน หมายเหตุหน่วยให้ AI และตรวจทุกแถวก่อนสร้างชิ้นส่วน — ผลจาก AI ต้องให้วิศวกรตรวจเสมอ'],
              ],
              [
                ['Why does the spacing the system picks give a ratio close to 1.00?', 'It picks the largest spacing that still passes (rounded down in 5 cm steps) to use the least material. For more margin, set a smaller spacing yourself or set a maximum ratio in the Optimizer.'],
                ['The results differ slightly from the book', 'Some book examples use 1½" = 3.7 cm and round numbers along the way; the system uses 3.75 cm and full precision, so results differ by no more than 1–5%. Misprints in the book are noted in the README and the test suite.'],
                ['After dragging an orange handle the spacing no longer goes back to automatic', 'Dragging sets a custom spacing — clear the number in the spacing field (it then shows “Auto”).'],
                ['The shop drawing has no page numbers / the wrong size', 'Print from Chrome or Edge on A3 landscape with zero margins (already set by the system) and choose “Save as PDF”.'],
                ["I can't see the drawing import / BOM menus", 'Menus depend on your role — ask a Master Admin to add a role (such as design engineer or estimator) and assign you to the project.'],
                ['The AI misread the drawing', 'Use a clear image cropped to the schedule or plan, tell the AI the units, and check every row before creating elements — AI results must always be checked by an engineer.'],
              ],
              [
                ['为什么系统选择的间距使比值接近 1.00?', '系统选取仍满足要求的最大间距(以 5 cm 向下取整)以使用最少材料。如需更多富余,可自行设定较小间距,或在优化器中设定最大比值。'],
                ['结果与教材略有不同', '教材部分例题取 1½" = 3.7 cm 并在中间步骤取整;系统取 3.75 cm 并保留全精度,差异不超过 1–5%。教材的印刷错误已记录在 README 和测试用例中。'],
                ['拖动橙色控制点后间距不再恢复自动', '拖动会设定自定义间距 —— 清空间距输入框中的数字(输入框将显示“自动”)。'],
                ['加工图没有页码 / 尺寸不对', '请用 Chrome 或 Edge 打印,A3 横向、页边距 0(系统已预设),并选择“另存为 PDF”。'],
                ['看不到图纸导入 / 材料表菜单', '菜单取决于角色 —— 请联系 Master Admin 添加角色(如设计工程师、造价员)并分配项目。'],
                ['AI 识图有误', '使用清晰的图片,仅裁取表格或平面,告诉 AI 单位,并在创建构件前逐行核对 —— AI 结果必须始终由工程师复核。'],
              ],
            ).map(([q, a]) => (
              <details key={q} className="card group px-4 py-3">
                <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
                  <span className="mr-2 text-brand group-open:hidden">+</span>
                  <span className="mr-2 hidden text-brand group-open:inline">−</span>
                  {q}
                </summary>
                <p className="mt-2 text-[14px] text-slate-700">{a}</p>
              </details>
            ))}
          </div>
          <p className="border-t border-line pt-4 text-xs text-muted">
            {L(
              <>
                อ้างอิง: ดร.เอกสิทธิ์ ลิ้มสุวรรณ, <i>Design Form Work</i>, จุฬาลงกรณ์มหาวิทยาลัย · ACI 347 Guide to Formwork for Concrete · CEB · CIRA Report 108 ·
                ผลการคำนวณต้องได้รับการตรวจสอบโดยวิศวกรผู้มีใบอนุญาต
              </>,
              <>
                References: Dr. Ekasit Limsuwan, <i>Design Form Work</i>, Chulalongkorn University · ACI 347 Guide to Formwork for Concrete · CEB · CIRA Report 108 · Results must be checked by a
                licensed engineer.
              </>,
              <>
                参考文献:Dr. Ekasit Limsuwan,<i>Design Form Work</i>,朱拉隆功大学 · ACI 347 Guide to Formwork for Concrete · CEB · CIRA Report 108 · 计算结果须经持证工程师审核。
              </>,
            )}
          </p>
        </article>
      </div>
    </ManualLangContext.Provider>
  )
}
