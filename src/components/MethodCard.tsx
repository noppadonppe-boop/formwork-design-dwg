// One lateral-pressure method explained (Reference page and Design Criteria).
import type { MethodInfo } from '@/data/references'

export function MethodCard({ m, compact }: { m: MethodInfo; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-slate-700">
      {!compact && <h3 className="text-base font-semibold text-ink">{m.name}</h3>}
      <p className="text-xs text-muted">{m.origin}</p>
      <p>{m.idea}</p>
      <ul className="num flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-ink">
        {m.formula.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p>
        <b className="text-ink">ข้อมูลที่ใช้:</b> {m.inputs}
      </p>
      <div>
        <b className="text-ink">ข้อจำกัด:</b>
        <ul className="ml-4 list-disc">
          {m.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
      <p>
        <b className="text-ink">ควรใช้เมื่อ:</b> {m.use}
      </p>
    </div>
  )
}
