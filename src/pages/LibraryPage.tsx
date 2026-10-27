import type { ReactNode } from 'react'
import { fmt, MATERIALS, PIPES, STEEL_SECTIONS, TIES, TIMBER_SECTIONS } from '@/engine'

function Table({ title, note, head, rows }: { title: string; note?: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-muted">
              {head.map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {r.map((c, j) => (
                  <td key={j} className={j === 0 ? 'px-4 py-2' : 'num px-4 py-2'}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const n = (x?: number, d = 0) => (x === undefined ? '—' : fmt(x, d))

export function LibraryPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8">
      <div>
        <p className="text-[13px] text-muted">อ้างอิงหนังสือ Design Form Work บทที่ 3–5</p>
        <h1 className="text-[28px] font-bold tracking-tight">คลังวัสดุ</h1>
      </div>
      <Table
        title="หน่วยแรงที่ยอมให้"
        note="กก./ซม.² · ตาราง 3.4, 3.5, 3.7 และค่าที่ใช้ในตัวอย่าง"
        head={['วัสดุ', 'E', 'Fb', 'Fv', 'Fc∥', 'Fc⊥', 'Ft', 'อ้างอิง']}
        rows={MATERIALS.map((m) => [m.name, n(m.E), n(m.Fb), n(m.Fv), n(m.Fc), n(m.Fcp), n(m.Ft), <span className="font-sans text-xs text-muted">{m.ref}</span>])}
      />
      <Table
        title="ไม้แปรรูป"
        note={'ขนาดตามหนังสือ: 1" = 2.5 ซม. (เช่น 1½"×3" = 3.75×7.5 ซม.)'}
        head={['ขนาด', 'b (ซม.)', 'h (ซม.)', 'A (ซม.²)', 'Ix (ซม.⁴)', 'Sx (ซม.³)']}
        rows={TIMBER_SECTIONS.map((s) => [s.label, n(s.B, 2), n(s.H, 2), n(s.A, 1), n(s.Ix, 1), n(s.Sx, 2)])}
      />
      <Table
        title="เหล็กรูปพรรณ / ท่อ"
        note="ตาราง 3.13, 3.15 · Ix = Zx·H/2"
        head={['หน้าตัด', 'น้ำหนัก (กก./ม.)', 'A (ซม.²)', 'Ix (ซม.⁴)', 'Sx (ซม.³)', 'r min (ซม.)']}
        rows={[...STEEL_SECTIONS, ...PIPES].map((s) => [s.label, n(s.w, 2), n(s.A, 2), n(s.Ix, 1), n(s.Sx, 2), n(s.rMin, 2)])}
      />
      <Table title="Form tie" note="ตาราง 4.6 (ทดสอบ) และตาราง 5.4 (RB-24)" head={['ชนิด', 'Working load (กก.)', 'Ultimate (กก.)', 'อ้างอิง']} rows={TIES.map((t) => [t.name, n(t.swl), n(t.ultimate), t.ref])} />
    </div>
  )
}
