import { useEffect, useState } from 'react'
import { Field, NumberInput } from '../ui'

/**
 * Numeric field that keeps the typed text locally and commits a number only when it parses.
 * `optional` fields commit `undefined` when cleared (used for "auto" spacings).
 */
export function NumField({
  label,
  unit,
  value,
  onChange,
  optional,
  placeholder,
  hint,
  min,
  max,
  scale = 1,
}: {
  label: string
  unit?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  optional?: boolean
  placeholder?: string
  hint?: string
  min?: number
  max?: number
  /** display = value × scale (e.g. m → cm) */
  scale?: number
}) {
  const show = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * scale * 1000) / 1000))
  const [text, setText] = useState(show(value))
  const [err, setErr] = useState<string>()
  useEffect(() => {
    setText((t) => (Number(t) * 1 === (value ?? NaN) * scale ? t : show(value)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, scale])
  return (
    <Field label={label} hint={hint} error={err}>
      <NumberInput
        unit={unit}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const t = e.target.value
          setText(t)
          if (t.trim() === '') {
            if (optional) {
              setErr(undefined)
              onChange(undefined)
            } else setErr('กรอกค่า')
            return
          }
          const n = Number(t)
          if (!Number.isFinite(n)) return setErr('ตัวเลขไม่ถูกต้อง')
          if ((min !== undefined && n < min) || (max !== undefined && n > max)) return setErr(`ค่า ${min ?? ''}–${max ?? ''}`)
          setErr(undefined)
          onChange(n / scale)
        }}
      />
    </Field>
  )
}
