// Optimizer tab: price settings, run the search in a worker, compare the cheapest passing designs with the current one.
import clsx from 'clsx'
import { Check, Loader2, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { NumField } from '@/components/design/NumField'
import { Toggle } from '@/components/ui'
import { repo } from '@/data/repo'
import type { Criteria, ElementData } from '@/data/types'
import { fmt } from '@/engine'
import { DEFAULT_PRICES, type OptPrices, type OptResult } from '@/optimizer/optimize'
import type { OptMessage, OptRequest } from '@/optimizer/worker'

const PRICE_KEY = 'formwork-studio:optimizer'

type OptSettings = { prices: OptPrices; target: number; allowSteel: boolean }

function normalize(v: Partial<OptSettings> | undefined): OptSettings {
  return { prices: { ...DEFAULT_PRICES, ...v?.prices, plywood: { ...DEFAULT_PRICES.plywood, ...v?.prices?.plywood } }, target: v?.target ?? 1, allowSteel: v?.allowSteel ?? false }
}

function loadSettings(): OptSettings {
  try {
    const v = JSON.parse(localStorage.getItem(PRICE_KEY) ?? '{}')
    return normalize(v)
  } catch {
    return normalize(undefined)
  }
}

export function OptimizerPanel({ draft, criteria, onApply }: { draft: ElementData; criteria: Criteria; onApply: (el: ElementData) => void }) {
  const [s, setS] = useState(loadSettings)
  // the shared prices are saved only by users who may design elements (firestore.rules allow no one else)
  const canSave = useAuth().can('element.edit')
  const [progress, setProgress] = useState<{ done: number; total: number }>()
  const [out, setOut] = useState<{ results: OptResult[]; tried: number; passed: number; current?: OptResult }>()
  const [error, setError] = useState<string>()
  const [applied, setApplied] = useState<number>()
  const worker = useRef<Worker | undefined>(undefined)

  const loaded = useRef(false)

  useEffect(() => () => worker.current?.terminate(), [])
  // shared prices: RC-FormWork-Design-Web-App/root/settings/optimizer
  useEffect(() => {
    repo
      .getSetting<OptSettings>('optimizer')
      .then((v) => v && setS(normalize(v)))
      .catch((e) => console.error('load optimizer settings', e))
      .finally(() => (loaded.current = true))
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(PRICE_KEY, JSON.stringify(s))
    } catch {
      /* private mode */
    }
    if (!loaded.current || !canSave) return
    const t = setTimeout(() => repo.setSetting('optimizer', s).catch((e) => console.error('save optimizer settings', e)), 800)
    return () => clearTimeout(t)
  }, [s, canSave])

  const run = () => {
    worker.current?.terminate()
    const w = new Worker(new URL('../../optimizer/worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    setOut(undefined)
    setError(undefined)
    setApplied(undefined)
    setProgress({ done: 0, total: 1 })
    w.onmessage = (e: MessageEvent<OptMessage>) => {
      const m = e.data
      if (m.type === 'progress') setProgress({ done: m.done, total: m.total })
      else {
        setProgress(undefined)
        if (m.type === 'error') setError(m.message)
        else setOut({ ...m.result, current: m.current })
        w.terminate()
      }
    }
    w.postMessage({ el: draft, criteria, opts: s } satisfies OptRequest)
  }

  const p = s.prices
  const setP = (q: Partial<OptPrices>) => setS({ ...s, prices: { ...p, ...q } })
  const best = out?.results[0]
  const saving = best && out?.current ? (out.current.cost - best.cost) / out.current.cost : undefined

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">ค้นหาแบบหล่อที่ประหยัดที่สุด</h2>
          <span className="text-xs text-muted">ลองความหนาแผ่นผิว ขนาดเคร่า/คาน/เสาค้ำ และวิธียึด แล้วให้ระบบเลือกระยะที่มากที่สุดที่ยังผ่านทุกการตรวจสอบ</span>
          <button type="button" onClick={() => setS({ ...s, prices: DEFAULT_PRICES })} className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
            <RotateCcw size={13} /> ราคาเริ่มต้น
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {[12, 15, 18, 20].map((t) => (
            <NumField key={t} label={`ไม้อัด ${t} มม.`} unit="฿/แผ่น" value={p.plywood[t]} min={0} onChange={(v) => v !== undefined && setP({ plywood: { ...p.plywood, [t]: v } })} />
          ))}
          <NumField label="ไม้แปรรูป" unit="฿/ลบ.ฟ." value={p.timberFt3} min={0} onChange={(v) => v !== undefined && setP({ timberFt3: v })} />
          <NumField label="เหล็ก / ท่อ" unit="฿/กก." value={p.steelKg} min={0} onChange={(v) => v !== undefined && setP({ steelKg: v })} />
          <NumField label="Form tie" unit="฿/ชุด" value={p.tie} min={0} onChange={(v) => v !== undefined && setP({ tie: v })} />
          <NumField label="Steel prop / ขานั่งร้าน" unit="฿/ต้น" value={p.ratedShore} min={0} onChange={(v) => v !== undefined && setP({ ratedShore: v })} />
          <NumField label="อุปกรณ์อื่น" unit="฿/ชิ้น" value={p.accessory} min={0} onChange={(v) => v !== undefined && setP({ accessory: v })} />
          <NumField label="ค่าประกอบ/ขนย้าย" unit="฿/ชิ้น" hint="ลดจำนวนชิ้น" value={p.laborPerPiece} min={0} onChange={(v) => v !== undefined && setP({ laborPerPiece: v })} />
          <NumField label="Ratio สูงสุดที่ยอมรับ" hint="1.00 = พอดีขีดจำกัด" value={s.target} min={0.5} max={1} onChange={(v) => v && setS({ ...s, target: v })} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle label="ลองเคร่า/คานเหล็ก (C, □) ด้วย" checked={s.allowSteel} onChange={(v) => setS({ ...s, allowSteel: v })} />
          <button type="button" onClick={run} disabled={!!progress} className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {progress ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {progress ? 'กำลังค้นหา…' : 'เริ่มค้นหา'}
          </button>
        </div>
        {progress && (
          <div className="h-1.5 overflow-hidden rounded bg-slate-100" role="progressbar" aria-valuenow={Math.round((progress.done / progress.total) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-fail">ค้นหาไม่สำเร็จ: {error}</p>}
      </section>

      {out && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-3 text-sm">
            <span>
              ลอง <b className="num">{fmt(out.tried)}</b> แบบ · ผ่าน <b className="num">{fmt(out.passed)}</b>
            </span>
            {out.current && (
              <span>
                แบบปัจจุบัน <b className="num">{fmt(out.current.cost)}</b> ฿/ชุด (ratio <span className="num">{out.current.maxRatio.toFixed(2)}</span>)
              </span>
            )}
            {saving !== undefined && saving > 0.005 && (
              <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-ok">
                ประหยัดได้ {(saving * 100).toFixed(0)}% ({fmt(out.current!.cost - best!.cost)} ฿/ชุด · {fmt((out.current!.cost - best!.cost) * draft.qty)} ฿ ทั้ง {draft.qty} ชุด)
              </span>
            )}
          </div>
          {out.results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">ไม่พบแบบที่ผ่านตามเกณฑ์ — ลองเพิ่ม Ratio สูงสุด หรือเปิดตัวเลือกเหล็ก</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-xs text-muted">
                  <tr>
                    <th className="w-8 px-3 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">วัสดุและขนาด</th>
                    <th className="px-2 py-2 text-left font-medium">ระยะ (ซม.)</th>
                    <th className="px-2 py-2 text-right font-medium">ชิ้น</th>
                    <th className="px-2 py-2 text-right font-medium">Ratio</th>
                    <th className="px-2 py-2 text-right font-medium">฿/ชุด</th>
                    <th className="px-2 py-2 text-right font-medium">฿/ม.²</th>
                    <th className="w-28 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {out.results.map((r, k) => (
                    <tr key={k} className={clsx(k === 0 && 'bg-emerald-50/50')}>
                      <td className="num px-3 py-2 text-muted">{k + 1}</td>
                      <td className="px-2 py-2">{r.choices.join(' · ')}</td>
                      <td className="num px-2 py-2 text-xs text-slate-600">{r.layout}</td>
                      <td className="num px-2 py-2 text-right">{r.pieces}</td>
                      <td className={clsx('num px-2 py-2 text-right', r.maxRatio >= 0.9 ? 'text-warn' : 'text-ok')}>{r.maxRatio.toFixed(2)}</td>
                      <td className="num px-2 py-2 text-right font-semibold">{fmt(r.cost)}</td>
                      <td className="num px-2 py-2 text-right text-muted">{fmt(r.perM2)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onApply({ ...draft, input: r.el.input } as ElementData)
                            setApplied(k)
                          }}
                          className={clsx('inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium', applied === k ? 'border-ok text-ok' : 'border-slate-300 hover:bg-slate-50')}
                        >
                          {applied === k ? (
                            <>
                              <Check size={14} /> ใช้แล้ว
                            </>
                          ) : (
                            'ใช้แบบนี้'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-line px-4 py-2 text-xs text-muted">
            ราคาต่อ 1 ชุดจากตารางวัสดุของแต่ละแบบ (ไม้อัดคิดตามพื้นที่) รวมค่าประกอบต่อชิ้น · ระยะที่กำหนดเองจะถูกปล่อยให้ระบบเลือกใหม่ · ตรวจผลในแท็บผลการคำนวณหลังกดใช้แบบ
          </p>
        </section>
      )}
    </div>
  )
}
