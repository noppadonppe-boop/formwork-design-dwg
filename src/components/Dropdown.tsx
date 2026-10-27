// Dropdown lists for roles / departments / projects. The popover sits on the top layer (z-[10010]).
import clsx from 'clsx'
import { Check, ChevronDown, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export interface Option {
  value: string
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return { open, setOpen, ref }
}

const trigger = 'input flex min-h-10 w-full items-center gap-1.5 text-left'
const panel = 'absolute left-0 right-0 top-full z-[10010] mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-white p-1 shadow-xl'

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'เลือก…',
  label,
  disabled,
  searchable,
}: {
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  label: string
  disabled?: boolean
  searchable?: boolean
}) {
  const { open, setOpen, ref } = usePopover()
  const [q, setQ] = useState('')
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const shown = q ? options.filter((o) => `${o.value} ${typeof o.label === 'string' ? o.label : ''} ${typeof o.hint === 'string' ? o.hint : ''}`.toLowerCase().includes(q.toLowerCase())) : options
  const selected = options.filter((o) => value.includes(o.value))
  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} className={clsx(trigger, 'flex-wrap py-1.5 disabled:opacity-60')} onClick={() => setOpen(!open)}>
        {selected.length === 0 && <span className="text-muted">{placeholder}</span>}
        {selected.map((o) => (
          <span key={o.value} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-sel">
            {o.label}
            {!disabled && !o.disabled && (
              <X
                size={12}
                aria-label="เอาออก"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(o.value)
                }}
              />
            )}
          </span>
        ))}
        <ChevronDown size={16} className="ml-auto shrink-0 text-muted" aria-hidden />
      </button>
      {open && (
        <div className={panel} role="listbox" aria-multiselectable="true" aria-label={label}>
          {searchable && <input autoFocus className="input mb-1 h-9 w-full" placeholder="ค้นหา…" value={q} onChange={(e) => setQ(e.target.value)} />}
          {shown.length === 0 && <p className="px-3 py-2 text-sm text-muted">ไม่มีรายการ</p>}
          {shown.map((o) => {
            const on = value.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                disabled={o.disabled}
                onClick={() => toggle(o.value)}
                className={clsx('flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50', on && 'bg-blue-50/60')}
              >
                <span className={clsx('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-sel bg-sel text-white' : 'border-slate-300')}>{on && <Check size={12} />}</span>
                <span className="min-w-0">
                  <span className="block">{o.label}</span>
                  {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SingleSelect({ options, value, onChange, placeholder = 'เลือก…', label }: { options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string; label: string }) {
  const { open, setOpen, ref } = usePopover()
  const cur = options.find((o) => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} className={trigger} onClick={() => setOpen(!open)}>
        <span className={clsx('truncate', !cur && 'text-muted')}>{cur?.label ?? placeholder}</span>
        <ChevronDown size={16} className="ml-auto shrink-0 text-muted" aria-hidden />
      </button>
      {open && (
        <div className={panel} role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={clsx('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50', o.value === value && 'bg-blue-50/60 font-medium')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
