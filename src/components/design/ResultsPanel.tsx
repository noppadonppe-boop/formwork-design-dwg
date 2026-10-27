import clsx from 'clsx'
import { AlertTriangle, ChevronDown, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import type { ComponentResult, DesignAdvice, DesignResult, Step, Trace } from '@/engine'
import { fmt } from '@/engine'
import { RatioBar, StatusBadge } from '../ui'
import { PressureDiagram } from './PressureDiagram'

export const fmtVal = (v: number | undefined, unit?: string) => {
  if (v === undefined || Number.isNaN(v)) return ''
  const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3
  return `${fmt(v, digits)}${unit ? ` ${unit}` : ''}`
}

function TraceList({ trace }: { trace: Trace }) {
  return (
    <ol className="flex flex-col divide-y divide-slate-100 text-[13px]">
      {trace.steps.map((s: Step, i) => (
        <li key={i} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 py-1.5">
          <span className="text-slate-700">{s.label}</span>
          <span className={clsx('num text-right font-medium', s.status === 'fail' && 'text-fail', s.status === 'ok' && 'text-ok', s.status === 'warn' && 'text-warn')}>{fmtVal(s.value, s.unit)}</span>
          {(s.expr || s.ref) && (
            <span className="num col-span-2 text-xs text-muted">
              {s.expr}
              {s.ref && <span className="ml-2 rounded bg-slate-100 px-1.5 py-px font-sans text-[11px] text-slate-600">{s.ref}</span>}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function ComponentCard({ c }: { c: ComponentResult }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-line">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{c.title}</h3>
            <StatusBadge status={c.status} />
          </div>
          <p className="text-[13px] text-slate-600">{c.spec}</p>
        </div>
        {c.spacing && (
          <div className="text-right text-[13px]">
            <div>
              {c.spacing.label} <b className="num text-base">{c.spacing.value}</b> ซม.
            </div>
            <div className="text-xs text-muted">
              สูงสุด <span className="num">{c.spacing.max.toFixed(1)}</span> · คุมโดย{c.spacing.governing}
              {c.spacing.fixed && ' · กำหนดเอง'}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3">
        {c.rows.map((r) => (
          <div key={r.item} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(80px,1fr)_auto]">
            <span className="text-slate-700">{r.item}</span>
            <span className="num hidden text-xs text-muted sm:block">
              {fmtVal(r.demand)} / {fmtVal(r.capacity)} {r.unit}
            </span>
            <span className="hidden sm:block">
              <RatioBar ratio={r.ratio} />
            </span>
            <span className={clsx('num text-right font-semibold', r.ratio > 1 ? 'text-fail' : r.ratio >= 0.9 ? 'text-warn' : 'text-ok')}>{r.ratio.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-1 border-t border-slate-100 px-4 py-2 text-xs text-sel hover:bg-slate-50">
        <ChevronDown size={14} className={clsx('transition', open && 'rotate-180')} />
        {open ? 'ซ่อนรายการคำนวณ' : 'แสดงรายการคำนวณ'}
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2">
          <TraceList trace={c.trace} />
        </div>
      )}
    </div>
  )
}

/** Alternative arrangements checked with the same members, and the recommended one. */
export function AdviceCard({ advice }: { advice: DesignAdvice }) {
  return (
    <section className="card overflow-hidden" aria-label={advice.title}>
      <div className="flex items-start gap-3 border-b border-slate-100 bg-blue-50/60 px-4 py-3">
        <Lightbulb size={18} className="mt-0.5 shrink-0 text-sel" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-semibold">{advice.title}</h3>
          <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-slate-700">
            {advice.summary.map((s) => (
              <li key={s} className={clsx(s.startsWith('แนะนำ') && 'font-semibold text-ink')}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {advice.options.map((o) => (
          <li key={o.key} className={clsx('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]', o.recommended && 'bg-green-50/60')}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{o.label}</span>
                {o.current && <span className="rounded-full bg-navy-900 px-2 py-px text-[11px] text-white">ที่เลือกอยู่</span>}
                {o.recommended && <span className="rounded-full bg-ok px-2 py-px text-[11px] text-white">แนะนำ</span>}
              </div>
              <div className="text-xs text-muted">{o.note}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={o.status} />
              <span className={clsx('num w-12 text-right font-semibold', o.ratio > 1 ? 'text-fail' : o.ratio >= 0.9 ? 'text-warn' : 'text-ok')}>{o.ratio > 9.99 ? '>9.99' : o.ratio.toFixed(2)}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-muted">ตรวจด้วยหน้าตัดไม้และวัสดุเดียวกับที่เลือก — เปลี่ยนรูปแบบได้ที่ “การยึดเคร่า” / “การวางไทร์” ในแผงด้านซ้าย</p>
    </section>
  )
}

export function ResultsPanel({ result, height, layout }: { result: DesignResult; height: number; layout: { label: string; value: string }[] }) {
  const [showPressure, setShowPressure] = useState(false)
  const vertical = result.loadKind === 'vertical'
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <div>
          <div className="text-xs text-muted">{vertical ? 'น้ำหนักบรรทุกออกแบบ w' : 'แรงดันออกแบบ P'}</div>
          <div className="num text-2xl font-semibold">
            {fmt(result.pressure.Pmax)} <span className="text-sm font-normal text-muted">กก./ม.²</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">อัตราส่วนสูงสุด</div>
          <div className={clsx('num text-2xl font-semibold', result.status === 'fail' ? 'text-fail' : result.status === 'warn' ? 'text-warn' : 'text-ok')}>{result.maxRatio.toFixed(2)}</div>
        </div>
        <StatusBadge status={result.status}>{result.status === 'fail' ? 'ไม่ผ่าน — ปรับระยะหรือขนาด' : result.status === 'warn' ? 'ผ่าน (ใกล้ขีดจำกัด)' : 'ผ่านทุกรายการ'}</StatusBadge>
        <div className="ml-auto flex flex-wrap gap-2">
          {layout.map((l) => (
            <span key={l.label} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs">
              {l.label} <b className="num">{l.value}</b>
            </span>
          ))}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-warn">
          {result.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}

      {result.advice && <AdviceCard advice={result.advice} />}

      <div className="card overflow-hidden">
        <button type="button" onClick={() => setShowPressure(!showPressure)} aria-expanded={showPressure} className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold hover:bg-slate-50">
          <ChevronDown size={16} className={clsx('transition', showPressure && 'rotate-180')} />
          {vertical ? 'น้ำหนักบรรทุกแนวดิ่งบนแบบ' : 'แรงดันด้านข้างของคอนกรีต'}
          <span className="num ml-auto text-sm font-normal text-muted">{fmt(result.pressure.Pmax)} กก./ม.²</span>
        </button>
        {showPressure && (
          <div className="flex flex-wrap gap-6 border-t border-slate-100 p-4">
            <div className="min-w-0 flex-[1_1_320px]">
              <TraceList trace={result.pressure.trace} />
            </div>
            {!vertical && <PressureDiagram H={height} Pmax={result.pressure.Pmax} hCrit={result.pressure.hCrit} />}
          </div>
        )}
      </div>

      {result.components.map((c) => (
        <ComponentCard key={c.key} c={c} />
      ))}
    </div>
  )
}
