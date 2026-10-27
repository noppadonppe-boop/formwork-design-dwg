// Project bill of materials: totals over every element × its quantity, purchase quantities (waste, reuse),
// cost estimate with editable unit prices, shop-drawing settings, and each element's own list.
import clsx from 'clsx'
import { Check, ChevronDown, ChevronLeft, FileDown, Loader2, Printer, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { NumField } from '@/components/design/NumField'
import { ProjectNav } from '@/components/ProjectNav'
import { Field } from '@/components/ui'
import { runDesign, TYPE_LABEL } from '@/data/elements'
import { useElements, useProject } from '@/data/hooks'
import { useAuth } from '@/auth/AuthProvider'
import { isConflict } from '@/data/conflict'
import { repo, versionOf } from '@/data/repo'
import { type Criteria, DEFAULT_CRITERIA, type ShopSettings, shopSettings, withPrice } from '@/data/types'
import { fmt } from '@/engine'
import { concreteVolume, elementBom, summarize, toCsv } from '@/model/bom'
import { type CostGroup, costRows, totalCost } from '@/model/cost'
import { packSheets, plywoodPieces } from '@/model/cutting'
import { download } from '@/report/dxf'

const GROUP_TITLE: Record<CostGroup, string> = { plywood: 'แผ่นผิวแบบ', timber: 'ไม้แปรรูป', steel: 'เหล็ก', tie: 'Form tie (ใช้ครั้งเดียว)', other: 'อุปกรณ์และเสาค้ำสำเร็จรูป' }

export function BomPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const elements = useElements(projectId)
  const [open, setOpen] = useState<string>()
  const [settings, setSettings] = useState<ShopSettings>()
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const { can } = useAuth()
  const canEdit = can('bom.edit')
  /** the settings (as JSON) and project version this page's edits are based on */
  const base = useRef<{ json: string; version: number }>(undefined)
  const [remoteChanged, setRemoteChanged] = useState(false)

  const adopt = (s: ShopSettings, version: number) => {
    base.current = { json: JSON.stringify(s), version }
    setSettings(s)
    setRemoteChanged(false)
    setSaved('idle')
  }

  // realtime: follow the stored settings while nothing is unsaved here; otherwise keep the edits and warn
  useEffect(() => {
    if (!project) return
    const remote = shopSettings(project)
    const json = JSON.stringify(remote)
    if (!settings || !base.current) return adopt(remote, versionOf(project))
    if (json === base.current.json) {
      base.current.version = versionOf(project) // only other project fields changed
      return
    }
    const unsaved = JSON.stringify(settings) !== base.current.json
    if (!unsaved) adopt(remote, versionOf(project))
    else setRemoteChanged(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  const criteria: Criteria = { ...DEFAULT_CRITERIA, ...project?.criteria }
  const rows = useMemo(
    () =>
      (elements ?? [])
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
        .flatMap((el) => {
          try {
            const b = elementBom(el, runDesign(el, criteria))
            return [{ el, lines: b.lines, concreteM3: concreteVolume(b.model), sheets: packSheets(plywoodPieces(b.model, b.lines)).length }]
          } catch {
            return []
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elements, project?.criteria],
  )
  const sum = useMemo(() => summarize(rows.map((r) => ({ lines: r.lines, qty: r.el.qty, concreteM3: r.concreteM3 }))), [rows])
  const cost = useMemo(() => {
    if (!settings) return []
    const sheets = new Map<string, number>()
    const ties = new Set<string>()
    for (const r of rows) {
      const ply = r.lines.find((l) => l.category === 'plywood')
      if (ply) sheets.set(ply.description, (sheets.get(ply.description) ?? 0) + r.sheets * r.el.qty)
      for (const l of r.lines) if (l.category === 'tie') ties.add(l.description)
    }
    return costRows(sum, settings, sheets, ties)
  }, [sum, rows, settings])

  if (project === undefined || elements === undefined || (project && !settings))
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
      </div>
    )
  if (!project || !settings) return <p className="p-10 text-center text-muted">ไม่พบโครงการ</p>

  const edit = (s: ShopSettings) => {
    setSettings(s)
    if (saved !== 'conflict') setSaved('idle')
  }
  const save = async (force = false) => {
    if (saved === 'saving' || !canEdit) return
    setSaved('saving')
    try {
      const version = await repo.updateProject(project.id, { shop: settings }, force ? undefined : base.current?.version, force)
      base.current = { json: JSON.stringify(settings), version }
      setRemoteChanged(false)
      setSaved('saved')
    } catch (e) {
      setSaved(isConflict(e) ? 'conflict' : 'error')
    }
  }
  const total = totalCost(cost)
  const priced = cost.filter((r) => r.price !== undefined).length
  const exportCsv = () =>
    download(
      `${project.projectNo}_BOM-purchase.csv`,
      toCsv([
        [`${project.name} (${project.projectNo}) — ปริมาณสั่งซื้อและราคาวัสดุแบบหล่อ`],
        [`เผื่อเศษ: ไม้อัด ${settings.waste.plywood}% · ไม้ ${settings.waste.timber}% · เหล็ก ${settings.waste.steel}% · ใช้แบบซ้ำ ${settings.reuse} รอบ`],
        [],
        ['หมวด', 'รายการ', 'ปริมาณใช้', 'เผื่อ %', 'ใช้ซ้ำ (รอบ)', 'สั่งซื้อ', 'หน่วย', 'ราคา/หน่วย (บาท)', 'จำนวนเงิน (บาท)', 'หมายเหตุ'],
        ...cost.map((r) => [GROUP_TITLE[r.group], r.key, r.need.toFixed(2), r.wastePct, r.reuse, r.buy, r.unit, r.price ?? '', r.amount?.toFixed(2) ?? '', r.info ?? '']),
        ['', 'รวม', '', '', '', '', '', '', total.toFixed(2)],
        [],
        ['คอนกรีต', 'ปริมาตรคอนกรีตทั้งหมด', sum.concreteM3.toFixed(2), '', '', '', 'ม.³'],
      ]),
      'text/csv;charset=utf-8',
    )

  const ply = cost.filter((r) => r.group === 'plywood').reduce((a, r) => a + r.buy, 0)
  const ft3 = cost.filter((r) => r.group === 'timber').reduce((a, r) => a + r.buy, 0)
  const kg = cost.filter((r) => r.group === 'steel').reduce((a, r) => a + r.buy, 0)

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-8">
      <Link to={`/projects/${project.id}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-ink print:hidden">
        <ChevronLeft size={16} /> {project.name}
      </Link>
      <ProjectNav projectId={project.id} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs text-muted">
            <span className="num">{project.projectNo}</span> · Rev {project.revision}
          </p>
          <h1 className="text-2xl font-bold">สรุปวัสดุและราคาแบบหล่อ (BOM)</h1>
        </div>
        <div className="ml-auto flex gap-2 print:hidden">
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">
            <FileDown size={16} /> ส่งออก CSV
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">
            <Printer size={16} /> พิมพ์
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['ไม้อัด (สั่งซื้อ)', `${fmt(ply)} แผ่น`, `ตามแผนตัด + เผื่อ ${settings.waste.plywood}%`],
          ['ไม้แปรรูป (สั่งซื้อ)', `${fmt(ft3, 1)} ลบ.ฟ.`, `เผื่อ ${settings.waste.timber}%`],
          ['เหล็ก (สั่งซื้อ)', `${fmt(kg)} กก.`, `เผื่อ ${settings.waste.steel}%`],
          ['คอนกรีต', `${fmt(sum.concreteM3, 1)} ม.³`, `${rows.reduce((a, r) => a + r.el.qty, 0)} ชุดแบบหล่อ`],
          ['ประมาณราคา', priced ? `${fmt(total)} บาท` : '—', priced ? `มีราคา ${priced}/${cost.length} รายการ` : 'กรอกราคาต่อหน่วยด้านล่าง'],
        ].map(([k, v, s]) => (
          <div key={k} className="card p-4">
            <div className="text-xs text-muted">{k}</div>
            <div className="num text-xl font-semibold">{v}</div>
            <div className="text-xs text-muted">{s}</div>
          </div>
        ))}
      </div>

      <section className="card p-5 print:hidden">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">ตั้งค่า Shop drawing และการสั่งซื้อ</h2>
          <span className="text-xs text-muted">ใช้กับกรอบชื่อแบบของทุกแผ่นและการคำนวณปริมาณสั่งซื้อในหน้านี้</span>
          <button
            type="button"
            onClick={() => save()}
            disabled={!canEdit || saved === 'saving' || saved === 'saved' || saved === 'conflict'}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {saved === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saved === 'saved' ? <Check size={16} /> : <Save size={16} />}
            {saved === 'saved' ? 'บันทึกแล้ว' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
        {saved === 'error' && <p className="mb-2 text-sm text-fail">บันทึกไม่สำเร็จ</p>}
        {!canEdit && <p className="mb-2 text-sm text-muted">ดูอย่างเดียว — การแก้ไขการตั้งค่าและราคาต้องมีสิทธิ์ผู้ประมาณราคา</p>}
        {(remoteChanged || saved === 'conflict') && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn ring-1 ring-amber-200" role="alert">
            มีผู้อื่นบันทึกการตั้งค่านี้ระหว่างที่คุณแก้ไข — ค่าที่คุณกรอกยังอยู่
            <span className="ml-auto flex gap-3">
              <button type="button" className="font-medium underline" onClick={() => adopt(shopSettings(project), versionOf(project))}>
                โหลดของผู้อื่น
              </button>
              {canEdit && (
                <button type="button" className="font-medium underline" onClick={() => save(true)}>
                  บันทึกของฉันทับ
                </button>
              )}
            </span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['company', 'ชื่อบริษัท (กรอบชื่อแบบ)'],
              ['drawnBy', 'ผู้เขียนแบบ / ออกแบบ'],
              ['checkedBy', 'ผู้ตรวจสอบ'],
              ['approvedBy', 'ผู้อนุมัติ'],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l}>
              <input className="input" value={settings[k]} onChange={(e) => edit({ ...settings, [k]: e.target.value })} />
            </Field>
          ))}
          <Field label={`รายละเอียด Rev ${project.revision}`} className="sm:col-span-2">
            <input className="input" value={settings.revisionNote} onChange={(e) => edit({ ...settings, revisionNote: e.target.value })} />
          </Field>
          <NumField label="ใช้แบบซ้ำ" unit="รอบ" hint="ซื้อ = ใช้ ÷ รอบ (ยกเว้น Form tie)" value={settings.reuse} min={1} max={50} onChange={(v) => v && edit({ ...settings, reuse: Math.round(v) })} />
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['plywood', 'เผื่อไม้อัด'],
                ['timber', 'เผื่อไม้'],
                ['steel', 'เผื่อเหล็ก'],
              ] as const
            ).map(([k, l]) => (
              <NumField key={k} label={l} unit="%" value={settings.waste[k]} min={0} max={100} onChange={(v) => v !== undefined && edit({ ...settings, waste: { ...settings.waste, [k]: v } })} />
            ))}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-4 py-2.5 font-semibold">ปริมาณสั่งซื้อและราคา (ทุกชิ้นส่วน × จำนวนชุด)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">รายการ</th>
                <th className="px-3 py-2 text-right font-medium">ปริมาณใช้</th>
                <th className="px-3 py-2 text-right font-medium">เผื่อ</th>
                <th className="px-3 py-2 text-right font-medium">÷ ใช้ซ้ำ</th>
                <th className="px-3 py-2 text-right font-medium">สั่งซื้อ</th>
                <th className="w-36 px-3 py-2 text-right font-medium">ราคา/หน่วย (บาท)</th>
                <th className="px-3 py-2 text-right font-medium">จำนวนเงิน</th>
              </tr>
            </thead>
            {(['plywood', 'timber', 'steel', 'tie', 'other'] as const).map((g) => {
              const rs = cost.filter((r) => r.group === g)
              if (!rs.length) return null
              return (
                <tbody key={g} className="divide-y divide-slate-100 border-t border-line">
                  <tr className="bg-slate-50/60">
                    <td colSpan={7} className="px-3 py-1.5 text-xs font-semibold text-slate-600">
                      {GROUP_TITLE[g]}
                    </td>
                  </tr>
                  {rs.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-1.5">
                        {r.key}
                        {r.info && <span className="ml-2 text-xs text-muted">({r.info})</span>}
                      </td>
                      <td className="num px-3 py-1.5 text-right">
                        {fmt(r.need, r.unit === 'แผ่น' || Number.isInteger(r.need) ? 0 : 2)} {r.unit}
                      </td>
                      <td className="num px-3 py-1.5 text-right">{r.wastePct ? `${r.wastePct}%` : '–'}</td>
                      <td className="num px-3 py-1.5 text-right">{r.reuse > 1 ? `÷${r.reuse}` : '–'}</td>
                      <td className="num px-3 py-1.5 text-right font-semibold">
                        {fmt(r.buy, Number.isInteger(r.buy) ? 0 : 2)} {r.unit}
                      </td>
                      <td className="px-3 py-1">
                        <input
                          className="input num h-8 text-right"
                          inputMode="decimal"
                          aria-label={`ราคาต่อ${r.unit} ${r.key}`}
                          placeholder="—"
                          defaultValue={r.price ?? ''}
                          onBlur={(e) => {
                            const t = e.target.value.trim()
                            const v = t === '' ? undefined : Number(t)
                            if (v === undefined || (Number.isFinite(v) && v >= 0)) edit(withPrice(settings, r.key, v))
                          }}
                        />
                      </td>
                      <td className="num px-3 py-1.5 text-right">{r.amount !== undefined ? fmt(r.amount) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              )
            })}
            <tfoot className="border-t-2 border-line">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-right font-semibold">
                  รวมประมาณราคาวัสดุแบบหล่อ
                </td>
                <td className="num px-3 py-2 text-right text-base font-bold">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          ไม้อัดนับจากแผนการตัดของแต่ละชิ้นส่วน · ราคาต่อหน่วย: ไม้อัด/แผ่น ไม้/ลบ.ฟ. เหล็ก/กก. อุปกรณ์/ชิ้น · กด “บันทึกการตั้งค่า” เพื่อเก็บราคาไว้กับโครงการ · ไม่รวมค่าแรง ตะปู น้ำมันทาแบบ
        </p>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-4 py-2.5 font-semibold">รายการตามชิ้นส่วน (ต่อ 1 ชุด)</h2>
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.el.id}>
              <div className="flex items-center hover:bg-slate-50">
                <button type="button" onClick={() => setOpen(open === r.el.id ? undefined : r.el.id)} aria-expanded={open === r.el.id} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left text-sm">
                  <ChevronDown size={16} className={clsx('shrink-0 transition', open === r.el.id && 'rotate-180')} />
                  <span className="num font-semibold">{r.el.code}</span>
                  <span className="truncate">
                    {TYPE_LABEL[r.el.type]} {r.el.name && `— ${r.el.name}`}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted">
                    {r.lines.length} รายการ{r.sheets ? ` · ไม้อัด ${r.sheets} แผ่น` : ''} · × {r.el.qty} ชุด
                  </span>
                </button>
                <Link to={`/projects/${project.id}/elements/${r.el.id}/shop`} target="_blank" className="mr-4 shrink-0 text-xs text-sel hover:underline print:hidden">
                  Shop drawing
                </Link>
              </div>
              {open === r.el.id && (
                <div className="overflow-x-auto border-t border-slate-100 bg-slate-50/50 px-4 py-2">
                  <table className="w-full min-w-[560px] text-[13px]">
                    <thead>
                      <tr>
                        {['Mark', 'รายการ', 'ขนาด / ความยาว', 'ต่อชุด', 'รวม'].map((h, i) => (
                          <th key={h} className={clsx('py-1 text-left text-xs font-medium text-muted', i > 2 && 'text-right')}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.lines.map((l) => (
                        <tr key={l.mark}>
                          <td className="num py-0.5 font-semibold">{l.mark}</td>
                          <td className="py-0.5">{l.description}</td>
                          <td className="num py-0.5">{l.size}</td>
                          <td className="num py-0.5 text-right">
                            {l.qty} {l.unit}
                          </td>
                          <td className="num py-0.5 text-right">
                            {l.qty * r.el.qty} {l.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
