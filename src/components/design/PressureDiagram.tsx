import { fmt } from '@/engine'

/** Lateral pressure envelope: hydrostatic down to h_crit, then constant (book uses the max over the full height). */
export function PressureDiagram({ H, Pmax, hCrit }: { H: number; Pmax: number; hCrit: number }) {
  const W = 220
  const Ht = 220
  const top = 14
  const left = 52
  const plotH = Ht - top - 18
  const plotW = 110
  const y = (z: number) => top + (z / H) * plotH
  const yc = y(hCrit)
  return (
    <figure className="m-0 flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${Ht}`} width={W} height={Ht} role="img" aria-label={`แผนภาพแรงดัน สูงสุด ${fmt(Pmax)} กก./ม.² ที่ความลึก ${hCrit.toFixed(2)} ม.`}>
        <rect x={left - 12} y={top} width={12} height={plotH} fill="#EBCB92" stroke="#946634" />
        <path d={`M${left} ${top} L${left + plotW} ${yc} L${left + plotW} ${top + plotH} L${left} ${top + plotH} Z`} fill="#FDE7D6" stroke="#B9470B" strokeWidth={1.5} />
        <path d={`M${left} ${yc} H${left + plotW}`} stroke="#B9470B" strokeDasharray="4 3" />
        <text x={left + plotW + 4} y={yc + 4} fontSize={10} fill="#8A3408" className="font-mono">
          {fmt(Pmax)}
        </text>
        <path d={`M24 ${top} V${top + plotH} M18 ${top} h12 M18 ${yc} h12 M18 ${top + plotH} h12`} stroke="#334155" />
        <text x={2} y={(top + yc) / 2 + 3} fontSize={10} fill="#334155" className="font-mono">
          {hCrit.toFixed(2)}
        </text>
        {H - hCrit > 0.05 && (
          <text x={2} y={(yc + top + plotH) / 2 + 3} fontSize={10} fill="#334155" className="font-mono">
            {(H - hCrit).toFixed(2)}
          </text>
        )}
      </svg>
      <figcaption className="text-xs text-muted">แผนภาพแรงดัน (กก./ม.², ม.) — ออกแบบด้วยค่าสูงสุดตลอดความสูง</figcaption>
    </figure>
  )
}
