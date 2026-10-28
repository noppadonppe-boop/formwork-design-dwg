// Form Assembly — project summary: panels needed by the assemblies against the stock, materials to build the stock,
// CSV export and the print sheets (panel fabrication and assembly drawings).
import clsx from 'clsx'
import { FileDown, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui'
import type { Criteria, FormAssembly, FormElement, FormPanel, Project } from '@/data/types'
import { getMaterial } from '@/engine'
import { analyzeAll, cutLabel, panelBom, panelUsage } from '@/model/assemblyReport'
import { toCsv } from '@/model/bom'
import { download } from '@/report/dxf'

const USAGE_TEXT = { ok: 'พอ', warn: 'พอเมื่อตั้งทีละชุด', fail: 'ไม่พอ' } as const
const btn = 'inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50'

export function UsageView({ project, elements, panels, assemblies, criteria }: { project: Project; elements: FormElement[]; panels: FormPanel[]; assemblies: FormAssembly[]; criteria: Criteria }) {
  const all = useMemo(() => analyzeAll(assemblies, elements, panels, criteria), [assemblies, elements, panels, criteria])
  const usage = useMemo(() => panelUsage(panels, all), [panels, all])
  const bom = useMemo(() => panelBom(panels), [panels])
  const short = usage.filter((u) => u.status === 'fail').length

  const exportCsv = () =>
    download(
      `${project.projectNo}_form-assembly.csv`,
      toCsv([
        [`${project.name} (${project.projectNo}) — Form Assembly: การใช้แผงและวัสดุทำแผง`],
        [],
        ['แผง', 'กว้าง (ม.)', 'สูง (ม.)', ...assemblies.map((a) => a.code), 'ชุดที่ใช้มากสุด', 'ทุกชุดพร้อมกัน', 'สต็อก', 'สถานะ'],
        ...usage.map((u) => [u.panel.code, u.panel.width.toFixed(2), u.panel.height.toFixed(2), ...assemblies.map((a) => u.perAssembly[a.id] ?? ''), u.maxSet, u.allSets, u.stock, USAGE_TEXT[u.status]]),
        [],
        ['วัสดุสำหรับทำแผงตามสต็อก'],
        ['หมวด', 'รายการ', 'ยาว (ม.)', 'จำนวน', 'หน่วย'],
        ...bom.plywood.map((p) => ['ไม้อัด', `${getMaterial(p.materialId).name} ${p.thicknessMm} มม. (${p.pieces} ชิ้น, ${p.areaM2.toFixed(2)} ม.²)`, '', p.sheets, 'แผ่น 1.22×2.44']),
        ...bom.timber.map((t) => ['ไม้', `${cutLabel(t.kind)} ${t.label}`, t.length.toFixed(2), t.qty, 'ท่อน']),
        ...bom.timberTotals.map((t) => ['ไม้ (รวม)', t.label, t.lengthM.toFixed(2), t.volumeFt3.toFixed(2), 'ลบ.ฟ.']),
      ]),
      'text/csv;charset=utf-8',
    )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['แบบแผง', `${panels.length} แบบ`, `สต็อกรวม ${panels.reduce((a, p) => a + (p.stock ?? 0), 0)} แผง`],
          ['ชุดประกอบ', `${assemblies.length} ชุด`, `${all.filter((a) => a.result?.status === 'ok').length} ชุดผ่านทุกข้อ`],
          ['แผงไม่พอ', `${short} แบบ`, short ? 'แม้ตั้งทีละชุด' : 'ตั้งทีละชุดได้ครบ'],
          ['ไม้อัดสำหรับทำแผง', `${bom.plywood.reduce((a, p) => a + p.sheets, 0)} แผ่น`, 'ตามแผนตัด 1.22 × 2.44'],
        ].map(([k, v, s]) => (
          <div key={k} className="card p-4">
            <div className="text-xs text-muted">{k}</div>
            <div className={clsx('num text-xl font-semibold', k === 'แผงไม่พอ' && short > 0 && 'text-fail')}>{v}</div>
            <div className="text-xs text-muted">{s}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={exportCsv}>
          <FileDown size={16} /> ส่งออก CSV
        </button>
        <Link to={`/projects/${project.id}/assembly/print?what=panels`} target="_blank" className={btn}>
          <Printer size={16} /> แบบผลิตแผงทั้งหมด
        </Link>
        <Link to={`/projects/${project.id}/assembly/print?what=assemblies`} target="_blank" className={btn}>
          <Printer size={16} /> แบบประกอบทุกชุด
        </Link>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="px-4 pt-4 font-semibold">การใช้แผงเทียบสต็อก</h2>
        <p className="px-4 pb-2 text-xs text-muted">“ชุดที่ใช้มากสุด” พอเมื่อตั้งแบบทีละชุดแล้วย้ายไปใช้ซ้ำ · “ทุกชุดพร้อมกัน” เมื่อตั้งทุกชุดในเวลาเดียวกัน</p>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-y border-line bg-slate-50 text-xs text-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium">แผง</th>
              {assemblies.map((a) => (
                <th key={a.id} className="num px-3 py-2 text-right font-medium">
                  {a.code}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">ชุดที่ใช้มากสุด</th>
              <th className="px-3 py-2 text-right font-medium">ทุกชุดพร้อมกัน</th>
              <th className="px-3 py-2 text-right font-medium">สต็อก</th>
              <th className="px-4 py-2 text-left font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {usage.map((u) => (
              <tr key={u.panel.id}>
                <td className="px-4 py-2">
                  <span className="num font-semibold">{u.panel.code}</span> <span className="num text-xs text-muted">{u.panel.width.toFixed(2)}×{u.panel.height.toFixed(2)}</span>
                </td>
                {assemblies.map((a) => (
                  <td key={a.id} className="num px-3 py-2 text-right">
                    {u.perAssembly[a.id] ?? '–'}
                  </td>
                ))}
                <td className="num px-3 py-2 text-right font-semibold">{u.maxSet}</td>
                <td className="num px-3 py-2 text-right">{u.allSets}</td>
                <td className="num px-3 py-2 text-right">{u.stock}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={u.status}>{USAGE_TEXT[u.status]}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">วัสดุสำหรับทำแผงตามสต็อก</h2>
          <p className="mb-3 text-xs text-muted">ทุกแบบแผง × จำนวนในสต็อก</p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {bom.plywood.map((p) => (
                <tr key={`${p.materialId}${p.thicknessMm}`}>
                  <td className="py-1.5">
                    ไม้อัด {p.thicknessMm} มม. <span className="text-xs text-muted">{getMaterial(p.materialId).name} · {p.pieces} ชิ้น · {p.areaM2.toFixed(2)} ม.²</span>
                  </td>
                  <td className="num py-1.5 text-right font-semibold">{p.sheets} แผ่น</td>
                </tr>
              ))}
              {bom.timberTotals.map((t) => (
                <tr key={t.sectionId}>
                  <td className="py-1.5">
                    ไม้ {t.label} <span className="num text-xs text-muted">ยาวรวม {t.lengthM.toFixed(1)} ม.</span>
                  </td>
                  <td className="num py-1.5 text-right font-semibold">{t.volumeFt3.toFixed(2)} ลบ.ฟ.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">รายการตัดไม้</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {bom.timber.map((t) => (
                <tr key={`${t.sectionId}${t.kind}${t.length}`}>
                  <td className="py-1.5">
                    {cutLabel(t.kind)} {t.label} ยาว <span className="num">{t.length.toFixed(2)}</span> ม.
                  </td>
                  <td className="num py-1.5 text-right">{t.qty} ท่อน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {all.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">ชุดประกอบ</h2>
          <ul className="divide-y divide-line text-sm">
            {all.map(({ assembly, element, result }) => (
              <li key={assembly.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="num font-semibold">{assembly.code}</span>
                <span className="text-muted">{element ? element.code : 'ไม่พบชิ้นงาน'}</span>
                {result && <StatusBadge status={result.status} />}
                <Link to={`/projects/${project.id}/assembly/print?asm=${assembly.id}`} target="_blank" className="ml-auto inline-flex items-center gap-1.5 text-sel hover:underline">
                  <Printer size={14} /> แบบประกอบ
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
