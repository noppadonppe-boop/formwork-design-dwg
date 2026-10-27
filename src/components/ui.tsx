import clsx from 'clsx'
import { X } from 'lucide-react'
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useEffect, useId, useRef } from 'react'
import type { Status } from '@/engine'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft'

export function Button({ variant = 'secondary', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand font-semibold text-white hover:bg-brand-hover',
        variant === 'secondary' && 'border border-slate-300 bg-white text-ink hover:bg-slate-50',
        variant === 'danger' && 'border border-red-200 bg-white text-fail hover:bg-red-50',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'soft' && 'border border-sel bg-blue-50 text-sel hover:bg-blue-100',
        className,
      )}
      {...rest}
    />
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={clsx('inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white text-slate-600 hover:bg-slate-50', className)} {...rest}>
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('label', className)}>
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-fail">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function NumberInput({ unit, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { unit?: string }) {
  return (
    <span className={clsx('flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-sel focus-within:ring-2 focus-within:ring-blue-100', className)}>
      {/* no spin buttons: they take the room of two digits */}
      <input
        type="number"
        step="any"
        inputMode="decimal"
        className="num min-w-0 flex-1 [appearance:textfield] px-2.5 text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...rest}
      />
      {unit && <span className="flex items-center whitespace-nowrap border-l border-line bg-slate-50 px-2 text-xs text-muted">{unit}</span>}
    </span>
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx('input pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 text-sm">
      <span>{label}</span>
      <input id={id} type="checkbox" className="size-4 accent-brand" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx('h-8 rounded-md px-3 text-[13px] transition', value === o.value ? 'bg-white font-semibold text-ink shadow-sm' : 'text-slate-600 hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const STATUS_STYLE: Record<Status, string> = {
  ok: 'bg-green-50 text-ok ring-green-200',
  warn: 'bg-amber-50 text-warn ring-amber-200',
  fail: 'bg-red-50 text-fail ring-red-200',
}
const STATUS_TEXT: Record<Status, string> = { ok: 'ผ่าน', warn: 'ใกล้ขีดจำกัด', fail: 'ไม่ผ่าน' }

export function StatusBadge({ status, children }: { status: Status; children?: ReactNode }) {
  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1', STATUS_STYLE[status])}>{children ?? STATUS_TEXT[status]}</span>
}

export function RatioBar({ ratio }: { ratio: number }) {
  const color = ratio > 1 ? 'bg-red-600' : ratio >= 0.9 ? 'bg-amber-500' : 'bg-green-600'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={Number(ratio.toFixed(2))} aria-valuemin={0} aria-valuemax={1} aria-label="อัตราส่วนการใช้งาน">
      <div className={clsx('h-full rounded-full', color)} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl p-0 backdrop:bg-slate-900/45">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="ปิด" onClick={onClose} className="border-0">
            <X size={18} />
          </IconButton>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  )
}
