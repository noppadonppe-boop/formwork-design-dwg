// Reference: what the lateral-pressure methods are, and every equation the program uses with its source.
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MethodCard } from '@/components/MethodCard'
import { EQUATIONS, METHOD_INFO } from '@/data/references'
import type { PressureMethod } from '@/engine'

const ORDER: PressureMethod[] = ['CEB', 'ACI347', 'CIRA', 'HYDROSTATIC']

export function ReferencePage() {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return EQUATIONS
    return EQUATIONS.map((g) => ({ ...g, rows: g.rows.filter((r) => [g.title, r.ref, r.formula, r.use].some((x) => x.toLowerCase().includes(s))) })).filter((g) => g.rows.length)
  }, [q])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8">
      <div>
        <p className="text-[13px] text-muted">หนังสือ Design Form Work (จุฬาฯ) · ACI 347 · CEB · CIRA</p>
        <h1 className="text-[28px] font-bold tracking-tight">อ้างอิงการคำนวณ (Reference)</h1>
      </div>

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">มาตรฐานแรงดันด้านข้างของคอนกรีตสด</h2>
        <p className="mb-4 text-[13px] text-muted">
          ใช้กับแบบกำแพง เสา และฐานราก — เลือกวิธีได้ที่ Design Criteria ของโครงการ (ค่าตั้งต้น CEB) แบบคานใช้ γh เสมอตาม §7.4. แรงดันเพิ่มตามความลึกแบบของเหลว (γz) จนถึงค่าสูงสุด P ที่ความลึก h = P/γ แล้วคงที่ถึงก้นแบบ
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {ORDER.map((k) => (
            <div key={k} className="rounded-xl border border-line p-4">
              <MethodCard m={METHOD_INFO[k]} />
            </div>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">เปรียบเทียบ</th>
                <th className="px-3 py-2 font-medium">ACI 347</th>
                <th className="px-3 py-2 font-medium">CEB</th>
                <th className="px-3 py-2 font-medium">CIRA</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['รูปแบบ', 'สูตรเดียว (เลือกตามชนิดแบบ/R)', 'ค่าต่ำสุดของ 3 สมการ', 'ค่าต่ำสุดของ 3 ตาราง'],
                ['อัตราการเท R', '✓ (ฟุต/ชม.)', '✓', '✓'],
                ['อุณหภูมิ T', '✓ (°F)', '✓ ผ่านค่า k', '✓ (ถึง 20 °C)'],
                ['ค่ายุบตัว', '— (ใช้ได้ ≤ 10 ซม.)', '✓ ผ่านค่า k', '✓'],
                ['ความหนา/ด้านแคบ d', '—', '✓ สมการ 2.14', '✓ ตาราง 2.5'],
                ['หน่วยน้ำหนักคอนกรีต', 'γ ตามที่กำหนด (2,400)', 'γ ตามที่กำหนด (2,400)', '2,500 คงที่'],
                ['ค่าสูงสุด', '9,760 / 14,640 กก./ม.² และ γH', 'γH', '2,500H'],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-slate-100">
                  {r.map((c, j) => (
                    <td key={j} className={j === 0 ? 'px-3 py-2 font-medium text-ink' : 'px-3 py-2'}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">ตารางสมการอ้างอิง</h2>
            <p className="text-xs text-muted">สมการ/ตาราง/รูป ที่โปรแกรมใช้คำนวณ — เลขอ้างอิงตรงกับคอลัมน์ "อ้างอิง" ในรายการคำนวณ (หน่วย กก., ซม., ม.)</p>
          </div>
          <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-within:border-sel">
            <Search size={15} className="text-muted" aria-hidden />
            <input className="min-w-0 flex-1 outline-none" placeholder="ค้นหา เช่น 5.15, เสาค้ำ, CEB" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted">
                <th className="w-[22%] px-4 py-2 font-medium">อ้างอิง</th>
                <th className="w-[40%] px-4 py-2 font-medium">สมการ / หลักการ</th>
                <th className="px-4 py-2 font-medium">ใช้กับ</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title}>
                <tr className="border-t border-line bg-slate-100">
                  <th colSpan={3} className="px-4 py-2 text-left text-[13px] font-semibold text-ink">
                    {g.title}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={g.title + r.ref + r.formula} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2 font-medium text-ink">{r.ref}</td>
                    <td className="num px-4 py-2">{r.formula}</td>
                    <td className="px-4 py-2 text-slate-700">{r.use}</td>
                  </tr>
                ))}
              </tbody>
            ))}
            {!groups.length && (
              <tbody>
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    ไม่พบสมการที่ตรงกับ "{q}"
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </section>
    </div>
  )
}
