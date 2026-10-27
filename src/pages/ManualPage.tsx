// User manual: the workflow step by step, the theory behind every check (as the engine applies it, with the
// book's equation numbers), illustrated sections of each formwork type, live material tables and an FAQ.
import clsx from 'clsx'
import { BookOpen, Lightbulb, TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { PressureDiagram } from '@/components/design/PressureDiagram'
import { BeamSectionFigure, BucklingFigure, ContinuousBeamFigure, Figure, FootingFigure, LoadPathFigure, SlabSystemFigure, TieAreaFigure, WallSectionFigure } from '@/components/manual/Figures'
import { RatioBar, StatusBadge } from '@/components/ui'
import { fmt, MATERIALS, TIES } from '@/engine'

const TOC: [string, string, [string, string][]?][] = [
  ['overview', 'ภาพรวมการทำงาน'],
  [
    'steps',
    'ขั้นตอนการใช้งาน',
    [
      ['step-project', '1. สร้างโครงการและ Design Criteria'],
      ['step-elements', '2. เพิ่ม / นำเข้าชิ้นส่วน'],
      ['step-3d', '3. ออกแบบใน 3D Designer'],
      ['step-results', '4. อ่านผลการคำนวณ'],
      ['step-optimizer', '5. Optimizer'],
      ['step-output', '6. รายการคำนวณ · Shop drawing · BOM'],
    ],
  ],
  [
    'theory',
    'ทฤษฎีที่ใช้',
    [
      ['th-loadpath', 'เส้นทางการถ่ายแรง'],
      ['th-pressure', 'แรงดันคอนกรีตสด'],
      ['th-vertical', 'น้ำหนักแนวดิ่ง (พื้น/คาน)'],
      ['th-members', 'ระยะเคร่า ตง คาน'],
      ['th-ties', 'Form tie'],
      ['th-shores', 'เสาค้ำและการโก่งเดาะ'],
      ['th-braces', 'ค้ำยันแบบ'],
      ['th-beam', 'แบบหล่อคาน'],
      ['th-footing', 'แบบหล่อฐานราก'],
      ['th-materials', 'ค่าวัสดุ'],
    ],
  ],
  ['faq', 'คำถามที่พบบ่อย'],
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

const WORKFLOW: [string, string][] = [
  ['สร้างโครงการ', 'ข้อมูลโครงการ ลูกค้า ผู้รับเหมา'],
  ['ตั้ง Design Criteria', 'วิธีคำนวณแรงดัน น้ำหนัก การแอ่นตัว วัสดุเริ่มต้น'],
  ['เพิ่มหรือนำเข้าชิ้นส่วน', 'กด + ทีละชิ้น หรือนำเข้าจาก DXF / ภาพ / PDF'],
  ['ออกแบบใน 3D', 'คลิกแก้ชิ้นส่วน ลากจุดสีส้มปรับขนาด/ระยะ'],
  ['ตรวจผลการคำนวณ', 'ทุกรายการต้องผ่าน (Ratio ≤ 1.00)'],
  ['Optimizer', 'หาแบบที่ถูกที่สุดที่ยังผ่าน'],
  ['รายการคำนวณ (PDF)', 'ส่งตรวจ / อนุมัติ'],
  ['Shop drawing + BOM', 'ส่งหน้างานและฝ่ายจัดซื้อ'],
]

export function ManualPage() {
  const [active, setActive] = useState('overview')
  useEffect(() => {
    const ids = TOC.flatMap(([id, , sub]) => [id, ...(sub ?? []).map(([s]) => s)])
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
  }, [])

  const timber = MATERIALS.filter((m) => m.kind === 'timber')
  const others = MATERIALS.filter((m) => m.kind !== 'timber')

  return (
    <div className="mx-auto flex w-full max-w-[1280px] gap-8 px-4 py-7 sm:px-8">
      <nav aria-label="สารบัญคู่มือ" className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] w-60 shrink-0 self-start overflow-y-auto lg:block">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <BookOpen size={14} aria-hidden /> สารบัญ
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
          <p className="text-[13px] text-muted">คู่มือการใช้งาน</p>
          <h1 className="text-[28px] font-bold tracking-tight text-ink">FormWork Studio — ออกแบบแบบหล่อคอนกรีตทีละขั้น</h1>
          <p className="mt-1 text-slate-600">
            ระบบคำนวณตามหนังสือ <i>Design Form Work</i> (จุฬาฯ) ร่วมกับ ACI 347, CEB และ CIRA แบบหน่วยแรงที่ยอมให้ (ASD) หน่วย กก. · ซม. · ม. ทุกขั้นตอนในรายการคำนวณจะแสดงสูตร
            ค่าที่แทน และอ้างอิงสมการ/ตารางของหนังสือ
          </p>
        </header>

        {/* ------------------------------------------------------------ overview */}
        <H2 id="overview">ภาพรวมการทำงาน</H2>
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
          เมนูของโครงการอยู่ 2 ที่: แถบเมนูด้านบนของทุกหน้าในโครงการ และหมวด <b>โครงการปัจจุบัน</b> ในแถบซ้าย (ถ้ายังไม่ได้เปิดโครงการ แถบซ้ายจะพาไปโครงการล่าสุดที่เปิด) เมนูที่เห็นขึ้นกับบทบาทของคุณ —
          เช่น ผู้ประมาณราคาเห็น BOM แต่ไม่เห็นการนำเข้าแบบ
        </Tip>

        {/* ------------------------------------------------------------ steps */}
        <H2 id="steps">ขั้นตอนการใช้งาน</H2>

        <H3 id="step-project">ขั้นที่ 1 · สร้างโครงการและตั้ง Design Criteria</H3>
        <Steps
          items={[
            <>
              หน้า <b>โครงการ</b> กด <b>โครงการใหม่</b> กรอก Project No., ชื่อโครงการ, Client, Contractor, Subcontractor, ที่ตั้ง และหมายเหตุ
            </>,
            <>
              ตั้ง <b>Design Criteria</b> (ใช้เป็นค่าเริ่มต้นของทุกชิ้นส่วนในโครงการ แต่ละชิ้นส่วนแก้ทับได้) — ตามตารางด้านล่าง
            </>,
            <>กด บันทึก — แก้ภายหลังได้จากเมนู Design Criteria ทุกชิ้นส่วนจะคำนวณใหม่ทันที</>,
          ]}
        />
        <Table
          head={['ค่า', 'ความหมาย', 'ค่าแนะนำ']}
          rows={[
            ['วิธีคำนวณแรงดันด้านข้าง', 'CEB / ACI 347 / CIRA / γH เต็มความสูง (ดูทฤษฎี)', 'CEB (ตามตัวอย่างในหนังสือ)'],
            ['อัตราเท R', 'ความสูงคอนกรีตที่เทขึ้นต่อชั่วโมง — ยิ่งเทเร็วแรงดันยิ่งสูง', '1–2 ม./ชม. สำหรับกำแพง'],
            ['อุณหภูมิ T, Slump', 'คอนกรีตเย็นและเหลวก่อตัวช้า → แรงดันสูงขึ้น', '30 °C, 10 ซม.'],
            ['γ คอนกรีต', 'หน่วยน้ำหนัก', '2,400 กก./ม.³'],
            ['น้ำหนักจร / น้ำหนักแบบ', 'ใช้กับพื้นและคาน (คนงาน เครื่องมือ การเท)', 'หนังสือใช้ 150 + 50 กก./ม.² · ACI ≥ 245'],
            ['การแอ่นตัว', 'Δ ≤ L/360 (และ/หรือ ไม่เกิน x มม.)', 'L/360; ผิวคอนกรีตเปลือยเพิ่ม ≤ 1.5 มม.'],
            ['ตรวจแรงเฉือนไม้', 'ตรวจ fv ของเคร่า/ตง (สมการ 5.13)', 'เปิด (ปลอดภัยกว่า)'],
            ['วัสดุเริ่มต้น', 'ไม้อัด ความหนา ไม้ เหล็ก Form tie', 'ไม้อัด 18 มม. · ไม้ยาง · Ø1/2"'],
          ]}
        />

        <H3 id="step-elements">ขั้นที่ 2 · เพิ่มหรือนำเข้าชิ้นส่วน</H3>
        <p>
          ในหน้าโครงการมีปุ่ม <b>เพิ่มกำแพง / เสา / คาน / พื้น / ฐานราก</b> ระบบจะสร้างชิ้นส่วนพร้อมค่าเริ่มต้นจาก Design Criteria และพาไปหน้าออกแบบทันที ถ้ามีแบบอยู่แล้วใช้เมนู
          <b> นำเข้าแบบ</b>:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <b className="text-ink">ไฟล์ DXF (AutoCAD)</b>
            <Steps
              items={[
                'DWG ให้ Save As เป็น DXF ก่อน แล้วเลือกไฟล์ (อ่านในเบราว์เซอร์ ไม่อัปโหลด)',
                'ตรวจหน่วย (มม./ซม./ม.) — ระบบเดาจากไฟล์ให้แล้ว',
                'กำหนดเลเยอร์ → ชนิด (เสา กำแพง ฐานราก คาน พื้น หรือ ไม่ใช้) ระบบเดาจากชื่อเลเยอร์ให้ก่อน',
                'ดูแปลนสีในตัวอย่าง แล้วแก้ขนาด/จำนวนในตารางตรวจทาน',
                'กด สร้างชิ้นส่วน — ชิ้นที่ขนาดเท่ากันจะรวมเป็นหนึ่งชิ้นส่วนพร้อมจำนวน',
              ]}
            />
          </div>
          <div className="card p-4">
            <b className="text-ink">AI อ่านแบบ (รูป / PDF)</b>
            <Steps
              items={[
                'เลือกรูปแปลน ตารางเสา/คาน/ฐานราก หรือ PDF',
                'เลือก "เซิร์ฟเวอร์ของบริษัท" (ไม่ต้องใส่คีย์) หรือ "API key ของฉัน"',
                'เขียนหมายเหตุช่วย AI ได้ เช่น “หน่วยในแบบเป็นมม.”',
                'ตรวจทุกแถวกับแบบจริง — ช่องที่ AI ไม่พบจะใช้ค่าเริ่มต้นและมีหมายเหตุบอก',
              ]}
            />
          </div>
        </div>
        <Tip>
          DXF ที่อ่านได้ดีที่สุด: เสา/กำแพง/ฐานรากวาดเป็นสี่เหลี่ยมปิด (Polyline) แยกเลเยอร์ และมีป้ายใกล้ ๆ เช่น <span className="num">C1 40x40</span>,{' '}
          <span className="num">B2 30x60</span> (ตัวเลขน้อยกว่า 5 ถือเป็นเมตร มากกว่านั้นเป็นเซนติเมตร) ลองกับไฟล์ตัวอย่าง <span className="num">docs/sample-plan.dxf</span>
        </Tip>

        <H3 id="step-3d">ขั้นที่ 3 · ออกแบบใน 3D Designer</H3>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Steps
            items={[
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
            ]}
          />
          <Figure title="จุดลากปรับค่า">
            <svg viewBox="0 0 200 120" className="h-auto w-full" role="img" aria-label="จุดสีส้มสำหรับลากปรับระยะ">
              <rect x="20" y="40" width="160" height="12" fill="#f3dcb5" stroke="#8c6a36" />
              <rect x="20" y="70" width="160" height="12" fill="#f3dcb5" stroke="#8c6a36" />
              <line x1="100" y1="20" x2="100" y2="100" stroke="#e2621b" strokeWidth="2" strokeDasharray="4 3" />
              <circle cx="100" cy="76" r="9" fill="#e2621b" stroke="#fff" strokeWidth="2" />
              <path d="M100 52 l-6 8h12z M100 100 l-6 -8h12z" fill="#e2621b" />
              <rect x="112" y="88" width="76" height="22" rx="5" fill="#0f172a" />
              <text x="150" y="103" fontSize="11" fill="#fff" textAnchor="middle">
                ระยะ 80 ซม.
              </text>
            </svg>
          </Figure>
        </div>

        <H3 id="step-results">ขั้นที่ 4 · อ่านผลการคำนวณ</H3>
        <p>
          แท็บ <b>ผลการคำนวณ</b> แสดงแรงดัน/น้ำหนักออกแบบ และการ์ดของแต่ละส่วนประกอบ (แผ่นผิว → เคร่า → คานรับเคร่า → ไทร์ → ค้ำยัน …) แต่ละการ์ดบอกระยะที่ใช้ ระยะสูงสุดที่ยอมให้ และตัวที่ควบคุม (แรงดัด
          แรงเฉือน หรือการแอ่นตัว) กด “แสดงรายการคำนวณ” เพื่อดูทุกบรรทัดของการคำนวณ
        </p>
        <div className="card flex flex-col gap-3 p-4">
          <b className="text-ink">อัตราส่วน (Ratio) = ค่าที่เกิดขึ้น ÷ ค่าที่ยอมให้</b>
          {[
            [0.62, 'ok', 'น้อยกว่า 0.90 — ผ่าน มีส่วนเผื่อ'],
            [0.95, 'warn', '0.90 – 1.00 — ผ่าน แต่ใกล้ขีดจำกัด (ปกติของระยะที่ระบบเลือกให้มากที่สุด)'],
            [1.12, 'fail', 'มากกว่า 1.00 — ไม่ผ่าน ต้องแก้'],
          ].map(([r, s, t]) => (
            <div key={String(r)} className="grid grid-cols-[48px_120px_1fr] items-center gap-3 text-sm">
              <span className="num font-semibold">{(r as number).toFixed(2)}</span>
              <RatioBar ratio={r as number} />
              <span className="flex items-center gap-2">
                <StatusBadge status={s as 'ok' | 'warn' | 'fail'} /> {t as string}
              </span>
            </div>
          ))}
        </div>
        <Tip warn>
          <b>เมื่อไม่ผ่าน</b> ให้ดูว่าส่วนไหนแดงแล้วแก้ทีละขั้นจากบนลงล่าง: ลดระยะ (ลบค่าที่กำหนดเองเพื่อให้ระบบเลือก) → เพิ่มขนาดหน้าตัด / ใช้หน้าตัดคู่ → เปลี่ยนวัสดุ → ลดอัตราเท R
          (กำแพง/เสา) → เพิ่มค้ำยันกลางเสาค้ำ (พื้น/คาน) หรือเปิด Optimizer ให้หาให้
        </Tip>

        <H3 id="step-optimizer">ขั้นที่ 5 · Optimizer หาแบบที่ประหยัด</H3>
        <Steps
          items={[
            'แท็บ Optimizer ในหน้าชิ้นส่วน — ใส่ราคาวัสดุของบริษัท (ไม้อัด/แผ่น ไม้/ลบ.ฟ. เหล็ก/กก. ไทร์ ค่าประกอบต่อชิ้น)',
            'กด เริ่มค้นหา — ระบบลองความหนาไม้อัด ขนาดเคร่า/คาน/เสาค้ำ และวิธียึด หลายพันแบบ ภายในไม่กี่วินาที',
            'ทุกแบบในตารางผ่านการตรวจสอบครบ เรียงจากถูกไปแพง เทียบกับแบบปัจจุบันและ % ที่ประหยัด',
            'กด ใช้แบบนี้ แล้วตรวจผลในแท็บผลการคำนวณอีกครั้ง',
          ]}
        />

        <H3 id="step-output">ขั้นที่ 6 · รายการคำนวณ · Shop drawing · BOM</H3>
        <Table
          head={['เมนู', 'ได้อะไร', 'วิธีใช้']}
          rows={[
            [<b>รายการคำนวณ</b>, 'เอกสาร A4: เกณฑ์ วัสดุ แบบร่าง แรงดัน และทุกขั้นตอนการคำนวณพร้อมอ้างอิงหนังสือ ช่องลงนาม', 'กด พิมพ์ / บันทึก PDF → เลือก “บันทึกเป็น PDF”'],
            [<b>Shop drawing</b>, 'แผ่น A3: รูปด้าน/รูปตัดตามมาตราส่วน ภาพ 3 มิติพร้อมหมายเลขชิ้น ตารางวัสดุ หมายเหตุ กรอบชื่อแบบ · แผ่น 2: แผนตัดไม้อัด + ลำดับติดตั้ง/ถอดแบบ', 'พิมพ์ A3 · ดาวน์โหลด DXF (เปิดใน AutoCAD) · BOM CSV'],
            [<b>BOM & ราคา</b>, 'วัสดุรวมทั้งโครงการ × จำนวนชุด ปริมาณสั่งซื้อ (เผื่อเศษ ÷ ใช้ซ้ำ) ราคาประมาณ', 'ใส่ราคาต่อหน่วย % เผื่อ และจำนวนรอบใช้ซ้ำ แล้วกด บันทึกการตั้งค่า'],
          ]}
        />

        {/* ------------------------------------------------------------ theory */}
        <H2 id="theory">ทฤษฎีที่ใช้ในการคำนวณ</H2>

        <H3 id="th-loadpath">เส้นทางการถ่ายแรง (Load path)</H3>
        <p>
          แบบหล่อทุกชนิดคิดแบบเดียวกัน: แรงจากคอนกรีตสดกระทำกับ <b>แผ่นผิว</b> แผ่นผิวพาดอยู่บน <b>เคร่า</b> (หรือ ตง) ซึ่งพาดบน <b>คานรับเคร่า</b> (หรือ คานรองรับ คานรัด) และถ่ายลง{' '}
          <b>ตัวยึด</b> สุดท้าย ระบบคำนวณจากชิ้นที่รับแรงก่อนไปหลัง — ระยะของชิ้นหนึ่งกำหนดโดยความแข็งแรงของชิ้นที่พาดอยู่บนมัน
        </p>
        <LoadPathFigure />
        <div className="grid gap-4">
          <Figure title="แบบหล่อกำแพง" caption="แรงดันดันแผ่นผิวออก → เคร่าตั้ง → คานรับเคร่าคู่ → ไทร์ดึงสองข้างเข้าหากัน ค้ำยันกันล้มและแนวดิ่ง">
            <WallSectionFigure />
          </Figure>
          <Figure title="แบบหล่อพื้น" caption="น้ำหนักลงแผ่นพื้นแบบ → ตง → คานรองรับ → เสาค้ำ → แป้นรองฐาน ค้ำยันทแยงกันเสาโยกทั้งสองทิศทาง">
            <SlabSystemFigure />
          </Figure>
        </div>

        <H3 id="th-pressure">แรงดันคอนกรีตสด (กำแพง เสา ฐานราก)</H3>
        <p>
          คอนกรีตสดดันแบบเหมือนของเหลว (p = γ·h) จนกว่าจะเริ่มก่อตัว เมื่อเทสูงขึ้นคอนกรีตด้านล่างเริ่มแข็งตัว แรงดันจึงหยุดเพิ่มที่ค่าสูงสุด Pmax ปัจจัยที่เพิ่มแรงดัน: เทเร็ว (R สูง) อุณหภูมิต่ำ
          slump สูง การจี้เขย่าแรง หน้าตัดแคบ หนังสือ (และระบบ) ใช้ Pmax คงที่ตลอดความสูง ซึ่งปลอดภัย
        </p>
        <div className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
          <Figure title="แผนภาพแรงดัน" caption="ตัวอย่าง 8.1: H 2.5 ม.">
            <div className="flex justify-center">
              <PressureDiagram H={2.5} Pmax={3620} hCrit={3620 / 2400} />
            </div>
          </Figure>
          <div className="flex flex-col gap-2">
            <Formula note="CEB สมการ 2.12–2.14 · k จากตาราง 2.2 (slump, T)">
              Pmax = min( γ·H , 2400·k·R + 500 , 300·R + 10,000·d + 1,500 )
            </Formula>
            <Formula note="ACI 347 สมการ 2.7–2.9 · psf × 4.882 = กก./ม.² · สูงสุด 9,760 (กำแพง) / 14,640 (เสา)">
              P = 150 + 9,000·R/T (R ฟุต/ชม., T °F) · กำแพง R &gt; 7: 150 + 43,400/T + 2,800·R/T
            </Formula>
            <Formula note="CIRA: ตาราง 2.3–2.5 (ระบบ interpolate ให้)">P = min( 2,500·H , ตารางการก่อตัว , ตารางหน้าตัดบาง )</Formula>
          </div>
        </div>
        <Tip>
          <b>ตัวอย่าง (หนังสือ 8.1):</b> กำแพงหนา 25 ซม. สูง 2.50 ม. R = 2 ม./ชม. T = 30 °C slump 10 ซม. (k = 0.65) → γH = 6,000 · 2400(0.65)(2)+500 = <b>3,620</b> · 300(2)+10,000(0.25)+1,500
          = 4,600 → Pmax = <b>3,620 กก./ม.²</b>
        </Tip>

        <H3 id="th-vertical">น้ำหนักแนวดิ่ง (พื้นและท้องคาน)</H3>
        <Formula note="§6.4 — น้ำหนักจรระหว่างทำงาน (หนังสือ 150, ACI ≥ 245) และน้ำหนักแบบหล่อ (≈ 50 กก./ม.²)">
          w = γ·t + น้ำหนักจร + น้ำหนักแบบหล่อ (กก./ม.²)
        </Formula>
        <Tip>
          <b>ตัวอย่าง 6.1:</b> พื้นหนา 16 ซม. → 2,400 × 0.16 = 384 + 150 + 50 = <b>584 กก./ม.²</b>
        </Tip>

        <H3 id="th-members">การหาระยะเคร่า ตง คาน (ชิ้นส่วนรับแรงดัด)</H3>
        <Figure title="คานต่อเนื่องรับน้ำหนักแผ่" caption="แผ่นผิว เคร่า ตง คานรับเคร่า ส่วนใหญ่พาดต่อเนื่องหลายช่วง">
          <ContinuousBeamFigure />
        </Figure>
        <p>
          ชิ้นส่วนแต่ละตัวรับน้ำหนักแผ่ <span className="num">w = แรงดัน × ระยะห่างของมัน</span> แล้วหาช่วงยาวสูงสุด l ที่ยังผ่าน 3 เงื่อนไข ระบบเลือกค่าน้อยที่สุดแล้ว
          <b>ปัดลงทีละ 5 ซม.</b> (หรือขนาดโมดูล เช่น 30/40/60 ซม. ให้ลงตัวกับไม้อัด 1.22 × 2.44 ม.)
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Formula note="สมการ 5.2, 5.7 · S = bd²/6">แรงดัด: l = √( Fb·S / (0.1·w) )</Formula>
          <Formula note="สมการ 5.11–5.13 · ไม้ใช้ช่วง l − 2d">แรงเฉือน: V = 5wl/8 ≤ 2·Fv·b·d/3</Formula>
          <Formula note="สมการ 5.28, 5.30 · ≈ 0.71·∛(EI/w)">แอ่นตัว: wl⁴/128EI ≤ l/360</Formula>
        </div>
        <Tip>
          <b>ตัวอย่าง 6.1 (ตง 1½"×3" @75 ซม.):</b> w = 584 × 0.75 = 438 กก./ม. → แรงดัด l = 80 ซม. · แอ่นตัว l = 100 ซม. → ใช้ระยะคานรองรับ <b>80 ซม.</b> · คานรับเคร่าแบบคู่ ระยะ c/c
          = ช่วงสุทธิ + 10 ซม. (ความหนาของคานคู่) ตามธรรมเนียมในหนังสือ
        </Tip>

        <H3 id="th-ties">Form tie</H3>
        <div className="grid items-center gap-4 md:grid-cols-[1.1fr_1fr]">
          <Figure title="พื้นที่รับแรงของไทร์หนึ่งตัว">
            <TieAreaFigure />
          </Figure>
          <div className="flex flex-col gap-2">
            <p>
              ไทร์แต่ละตัวรับแรงดันบนพื้นที่ระหว่างคานรับเคร่าและระหว่างไทร์ข้างเคียง แรงดึงต้องไม่เกิน <b>SWL</b> (Safe Working Load) ของไทร์ (ตาราง 4.6 — มีค่าความปลอดภัย 2.0 แล้ว)
            </p>
            <Formula note="ระยะไทร์ = min(จากความแข็งแรงคานรับเคร่า, SWL ÷ (P × ระยะคานรับเคร่า)) ปัดเป็น 30/40/60/80/120 ซม.">T = P × s_คานรับเคร่า × s_ไทร์ ≤ SWL</Formula>
          </div>
        </div>

        <H3 id="th-shores">เสาค้ำ นั่งร้าน และการโก่งเดาะ</H3>
        <div className="grid items-center gap-4 md:grid-cols-[1.1fr_1fr]">
          <Figure title="ความยาวไม่ค้ำยัน" caption="ค้ำยันทางข้างที่กลางความสูงลดความยาวไม่ค้ำยันเหลือครึ่ง">
            <BucklingFigure />
          </Figure>
          <div className="flex flex-col gap-2">
            <Formula note="§6.4 ขั้นที่ 5 · พื้นที่รับน้ำหนักต่อต้น = ระยะคานรองรับ × ระยะเสาค้ำ">P = w × l × L</Formula>
            <Formula note="ไม้ สมการ 5.15–5.16 · d = ด้านแคบ (ไม้กลมใช้เส้นผ่านศูนย์กลาง) · l/d ≤ 50">Fa = 0.30·E / (l/d)² ≤ Fc · P = Fa·A</Formula>
            <Formula note="ท่อเหล็ก สมการ 5.17–5.18 · r = √(OD² + ID²)/4">l/r &lt; 132: Fa = 1,250 − 0.033(l/r)² · l/r ≥ 132: Fa = 10⁷/(l/r)²</Formula>
            <Formula note="นั่งร้าน / Steel prop: ใช้ค่าจากผู้ผลิต">P ต่อขา ≤ SWL · แรงกดใต้แป้นรองฐาน ≤ กำลังรับแรงของพื้น/ดิน</Formula>
          </div>
        </div>
        <Tip>
          <b>ตัวอย่าง 6.1:</b> ท่อ Ø2" บาง สูง 2.80 ม. ไม่มีค้ำยัน → l/r = 138 → Fa = 525 กก./ซม.² → P = 2,745 กก. &gt; 630 กก. ผ่าน · ค้ำยันทางข้างของระบบเสาค้ำ ระบบใช้ ACI 347:
          แรงด้านข้าง ≥ 2% ของน้ำหนักบรรทุกคงที่ หรือ 150 กก./ม. ต่อแถว
        </Tip>

        <H3 id="th-braces">ค้ำยันแบบกำแพง/เสา</H3>
        <p>ค้ำยันมีหน้าที่รักษาแนวดิ่งและกันแบบล้ม ไม่ได้รับแรงดันคอนกรีต (ไทร์รับ) ระบบคิดแรงด้านข้างจากกรณีที่มากที่สุดของ 3 กรณี (§8.4):</p>
        <Table
          head={['กรณี', 'แรงต่อความยาว 1 ม.']}
          rows={[
            ['แรงลม', 'ลม (50–100 กก./ม.²) × ความสูง'],
            ['ระดับคอนกรีตสองข้างต่างกัน', 'γ × (ความหนา)² / 2'],
            ['เยื้องศูนย์ 10%', 'น้ำหนักกำแพง × 0.1·t / ความสูงจุดยึด'],
          ]}
        />
        <Formula note="θ = มุมค้ำยันกับพื้น (แนะนำ 60°) · ค้ำด้านเดียวต้องตรวจแรงดึงด้วย">F = H × ระยะค้ำยัน / cos θ / จำนวนระดับ ≤ Fa·A</Formula>

        <H3 id="th-beam">แบบหล่อคาน</H3>
        <div className="grid items-start gap-4">
          <Figure title="คานหล่อร่วมพื้น">
            <BeamSectionFigure />
          </Figure>
          <div className="flex flex-col gap-2">
            <p>
              คานคิดเป็น 2 ส่วน: <b>แบบข้าง</b> เหมือนกำแพงเตี้ย (แรงดันของเหลว γh เป็นสามเหลี่ยม) และ <b>ท้องแบบ</b> เหมือนพื้น
            </p>
            <Formula note="เคร่าข้างไม่มีไทร์ = คานช่วงเดียวรับแรงสามเหลี่ยม (W = γh²/2 × ระยะเคร่า)">M = 2WL/(9√3) · V = 2W/3</Formula>
            <Formula note="ท้องแบบ (ไม้เสริมวางนอน) รับคอนกรีตคานทั้งหมด · ระยะคานขวางเป็นทวีคูณของระยะเคร่า">w = γ·b·h → ระยะคานขวาง</Formula>
            <Formula note="รูป 7.7 — คอนกรีตคาน + พื้นที่ถ่ายลง + แบบหล่อ (คาน 100 กก./ม., พื้น 50 กก./ม.²) + น้ำหนักจร">P เสาค้ำ = น้ำหนักต่อความยาว × ระยะคานขวาง</Formula>
            <p className="text-sm text-slate-600">คานเดี่ยวหรือคานขอบต้องมีค้ำยันปากแบบ (แรงที่ปากแบบ ≈ γh²/6 ต่อเมตร) คานลึกเกิน 0.9 ม. ควรใช้ไทร์ + คานรับเคร่า</p>
          </div>
        </div>

        <H3 id="th-footing">แบบหล่อฐานราก</H3>
        <div className="grid items-start gap-4">
          <Figure title="ฐานรากแบบค้ำยันลงหลัก">
            <FootingFigure />
          </Figure>
          <div className="flex flex-col gap-2">
            <p>แรงดันคิดเหมือนกำแพง (ใช้ด้านแคบของฐานเป็น d) เคร่ายึดได้ 3 แบบตาม §10.4:</p>
            <Table
              head={['แบบ', 'เหมาะกับ', 'ตรวจอะไร']}
              rows={[
                ['ปลายยื่นตอกลงดิน', 'ฐานตื้น ≤ 0.6 ม. ดินแข็ง', 'M = wL²/2 · การแอ่นปลาย · ความลึกหลัก'],
                ['ค้ำยันทแยงลงหลัก (ทุกเคร่า หรือผ่านคานรับเคร่า)', 'ฐานลึกปานกลาง ดินแข็ง', 'ช่วงระหว่างจุดค้ำ · แรงในค้ำยัน · ความลึกหลัก F/(q·b) · คานรับเคร่าช่วงระหว่างค้ำยัน'],
                ['คานรับเคร่ารอบฐาน (+ ไทร์)', 'ฐานลึก / ดินอ่อน / ฐานใหญ่', 'เคร่าเหมือนกำแพง · คานรับเคร่าแบบคานรัดเสา · แรงในไทร์'],
              ]}
            />
            <p>
              <b>คานรับเคร่ารอบฐาน</b> ทำงานเหมือนคานรัดเสา (§9.4 ตัวอย่าง 9.1): แต่ละด้านรับแรงดัดในช่วงระหว่างไทร์ (หรือมุมถึงมุมถ้าไม่มีไทร์) และรับ<b>แรงดึง</b>จากปลายคานด้านที่ตั้งฉาก จึงตรวจแบบแรงดึงร่วมแรงดัด
            </p>
            <Formula note="w = P × ระยะคานรับเคร่า · ช่วงด้านตั้งฉาก = ระยะไทร์ หรือความยาวด้านนั้นถ้าไม่มีไทร์">T = w × ช่วงด้านตั้งฉาก / 2 · σ = T/A ± M/S ≤ Ft, Fc</Formula>
            <Table
              head={['การวางไทร์', 'ใช้เมื่อ']}
              rows={[
                ['ไม่ใช้ไทร์ (คานรัดรอบฐาน)', 'ฐานเล็ก — ระบบลดระยะคานรับเคร่าทีละ 5 ซม. (ไม่น้อยกว่า 25 ซม.) จนผ่าน'],
                ['ไทร์ขวางด้านสั้น', 'ฐานแคบยาว เช่น คานคอดิน — ด้านสั้นต้องรับช่วงมุมถึงมุมได้'],
                ['ไทร์ทั้งสองทิศทาง', 'ฐานกว้างทั้งสองด้าน เช่น ฐานเข็ม 2.4 × 2.4 ม. ขึ้นไป'],
                ['อัตโนมัติ (ค่าเริ่มต้น)', 'ลองตามลำดับข้างบนแล้วเลือกแบบแรกที่ผ่าน'],
              ]}
            />
            <p>
              <b>มุมคานรับเคร่า</b> — <i>วางไขว้</i> (ค่าเริ่มต้น): คานทุกด้านยาวเต็มท่อนเลยมุม ไม่ต้องตัดไม้ คานด้านสั้นเลื่อนลง (หรือขึ้น) หนึ่งชุดคานเพื่อวางซ้อนคานด้านยาว — อัตโนมัติจะเลื่อนลงก่อนเพราะใกล้แรงดันสูงสุดที่ฐาน ถ้าคานล่างห่างฐานไม่ถึง 3 ซม. จึงเลื่อนขึ้น ·{' '}
              <i>ตัดชน</i>: ทุกด้านระดับเดียวกัน คานด้านสั้นตัดชนผิวในคานด้านยาว (รูป 8.11)
            </p>
            <Formula note="ความกว้างจากแรงกดตั้งฉากเสี้ยนไม้ (Fc⊥) · ความหนาจากแรงดัดคร่อมช่องระหว่างคานคู่ (Fb = 0.6Fy)">
              เหล็กประกับไทร์: T ≤ Fc⊥ × n·b × w · t ≥ √(6·T·L/4 ÷ (w·Fb))
            </Formula>
            <p className="text-sm text-slate-600">
              แท็บ <b>ผลการคำนวณ</b> ของฐานรากมีการ์ด “เปรียบเทียบรูปแบบการยึดแบบฐานราก” ตรวจทั้ง 6 รูปแบบด้วยไม้ชุดเดียวกัน แล้วบอกว่าต้องใช้ Form tie หรือไม่ และแนะนำแบบที่ง่ายที่สุดที่ผ่าน (ดินรับแรงต่ำกว่า 5 ตัน/ม.² จะไม่แนะนำแบบที่ใช้หลักในดิน)
            </p>
          </div>
        </div>

        <H3 id="th-materials">ค่าวัสดุที่ใช้ (กก./ซม.²)</H3>
        <Table
          head={['วัสดุ', 'E', 'Fb', 'Fv', 'Fc', 'อ้างอิง']}
          rows={[...timber, ...others].map((m) => [m.name, <span className="num">{fmt(m.E)}</span>, <span className="num">{m.Fb}</span>, <span className="num">{m.Fv ?? '–'}</span>, <span className="num">{m.Fc ?? '–'}</span>, <span className="text-xs text-muted">{m.ref}</span>])}
        />
        <Table head={['Form tie', 'SWL (กก.)', 'อ้างอิง']} rows={TIES.map((t) => [t.name, <span className="num">{fmt(t.swl)}</span>, <span className="text-xs text-muted">{t.ref}</span>])} />
        <p className="text-sm text-slate-600">ไม้แปรรูปใช้ขนาดตามชื่อ 1" = 2.5 ซม. (เช่น 1½"×3" = 3.75 × 7.5 ซม.) ตามตัวอย่างในหนังสือ · เพิ่ม/ตรวจหน้าตัดทั้งหมดได้ที่เมนู คลังวัสดุ</p>

        {/* ------------------------------------------------------------ FAQ */}
        <H2 id="faq">คำถามที่พบบ่อย</H2>
        <div className="flex flex-col gap-2">
          {(
            [
              ['ทำไมระยะที่ระบบเลือกถึงให้ Ratio ใกล้ 1.00?', 'ระบบเลือกระยะมากที่สุดที่ยังผ่าน (ปัดลงทีละ 5 ซม.) เพื่อใช้วัสดุน้อยที่สุด ถ้าต้องการส่วนเผื่อ ให้กำหนดระยะเองให้น้อยลง หรือตั้ง Ratio สูงสุดใน Optimizer'],
              ['ผลไม่ตรงกับหนังสือเล็กน้อย', 'หนังสือใช้ 1½" = 3.7 ซม. ในบางตัวอย่าง และปัดตัวเลขระหว่างทาง ระบบใช้ 3.75 ซม. และค่าเต็ม จึงต่างกันไม่เกิน 1–5% จุดที่หนังสือพิมพ์ผิดถูกบันทึกไว้ใน README และในชุดทดสอบ'],
              ['ลากจุดสีส้มแล้วระยะไม่กลับเป็นอัตโนมัติ', 'การลากจะกำหนดระยะเอง ให้ลบตัวเลขในช่องระยะ (ช่องจะขึ้นว่า “อัตโนมัติ”)'],
              ['Shop drawing ไม่มีเลขหน้า / ขนาดผิด', 'พิมพ์จาก Chrome หรือ Edge ตั้งกระดาษ A3 แนวนอน ขอบ 0 (ระบบตั้งให้แล้ว) และเลือก “บันทึกเป็น PDF”'],
              ['ไม่เห็นเมนูนำเข้าแบบ / BOM', 'เมนูขึ้นกับบทบาท — ติดต่อ Master Admin ให้เพิ่มบทบาท (เช่น วิศวกรออกแบบ ผู้ประมาณราคา) และมอบหมายโครงการ'],
              ['AI อ่านแบบผิด', 'ใช้ภาพที่ชัด ครอบเฉพาะตารางหรือแปลน หมายเหตุหน่วยให้ AI และตรวจทุกแถวก่อนสร้างชิ้นส่วน — ผลจาก AI ต้องให้วิศวกรตรวจเสมอ'],
            ] as [string, string][]
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
          อ้างอิง: ดร.เอกสิทธิ์ ลิ้มสุวรรณ, <i>Design Form Work</i>, จุฬาลงกรณ์มหาวิทยาลัย · ACI 347 Guide to Formwork for Concrete · CEB · CIRA Report 108 · ผลการคำนวณต้องได้รับการตรวจสอบโดยวิศวกรผู้มีใบอนุญาต
        </p>
      </article>
    </div>
  )
}
