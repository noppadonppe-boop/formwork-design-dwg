// Panel elevation seen from the back (stud side): plywood pieces and joints, studs, edge studs, caps, blocking,
// overall dimensions and the stud spacing chain. Units on the drawing: m, spacings in cm.
import clsx from 'clsx'
import type { PanelData } from '@/data/types'
import type { PanelLayout, PanelMemberKind } from '@/model/panel'

const MEMBER_FILL: Record<PanelMemberKind, string> = {
  stud: 'fill-teal-600',
  edge: 'fill-teal-800',
  cap: 'fill-orange-600',
  block: 'fill-violet-500',
}

export function PanelDrawing({ panel, layout, compact, className }: { panel: PanelData; layout: PanelLayout; compact?: boolean; className?: string }) {
  const W = panel.width
  const H = panel.height
  // drawing units: 1 m = 100; text and margins scale with the panel so the drawing reads the same at any size
  const k = 100
  const fs = Math.max(W, H) * k * 0.025
  const sw = fs * 0.05
  const vertical = panel.stud.dir === 'vertical'
  const [ml, mt, mr, mb] = compact ? [4, 4, 4, 4] : [fs * 2.2, fs * 2, vertical ? fs * 0.5 : fs * 2.5, vertical ? fs * 2.4 : fs * 0.5]
  const vbW = W * k + ml + mr
  const vbH = H * k + mt + mb
  const X = (x: number) => ml + x * k
  const Y = (y: number) => mt + (H - y) * k

  const studs = layout.members.filter((s) => s.kind === 'stud' || s.kind === 'edge')
  const centres = studs.map((s) => (vertical ? s.x + s.w / 2 : s.y + s.h / 2)).sort((a, b) => a - b)

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={clsx('w-full', className)} role="img" aria-label={`แผง ${panel.code} ${W.toFixed(2)} × ${H.toFixed(2)} ม. มองจากด้านเคร่า`}>
      {layout.ply.map((p, i) => (
        <rect key={i} x={X(p.x)} y={Y(p.y + p.h)} width={p.w * k} height={p.h * k} className="fill-amber-100 stroke-amber-500" strokeWidth={0.4} />
      ))}
      {layout.members.map((s, i) => (
        <rect key={i} x={X(s.x)} y={Y(s.y + s.h)} width={s.w * k} height={s.h * k} className={MEMBER_FILL[s.kind]} opacity={0.9} />
      ))}
      {layout.seams.map((j, i) =>
        j.axis === 'x' ? (
          <line key={i} x1={X(j.at)} x2={X(j.at)} y1={Y(H)} y2={Y(0)} className="stroke-red-600" strokeWidth={0.6} strokeDasharray="2 1.5" />
        ) : (
          <line key={i} x1={X(0)} x2={X(W)} y1={Y(j.at)} y2={Y(j.at)} className="stroke-red-600" strokeWidth={0.6} strokeDasharray="2 1.5" />
        ),
      )}
      {!compact && (
        <g className="fill-slate-700" style={{ fontSize: fs }}>
          {/* overall width (top) and height (left) */}
          <line x1={X(0)} x2={X(W)} y1={Y(H) - fs * 0.6} y2={Y(H) - fs * 0.6} className="stroke-slate-500" strokeWidth={sw} />
          <text x={X(W / 2)} y={Y(H) - fs * 0.9} textAnchor="middle">
            {W.toFixed(2)} ม.
          </text>
          <line x1={X(0) - fs * 0.6} x2={X(0) - fs * 0.6} y1={Y(H)} y2={Y(0)} className="stroke-slate-500" strokeWidth={sw} />
          <text x={X(0) - fs * 0.9} y={Y(H / 2)} textAnchor="middle" transform={`rotate(-90 ${X(0) - fs * 0.9} ${Y(H / 2)})`}>
            {H.toFixed(2)} ม.
          </text>
          {/* stud spacing chain along the bottom (vertical studs) or the right side (horizontal studs) */}
          {centres.slice(1).map((c, i) => {
            const a = centres[i]
            const label = ((c - a) * 100).toFixed(0)
            return vertical ? (
              <g key={i}>
                <line x1={X(a)} x2={X(c)} y1={Y(0) + fs * 0.6} y2={Y(0) + fs * 0.6} className="stroke-slate-500" strokeWidth={sw} />
                <line x1={X(a)} x2={X(a)} y1={Y(0) + fs * 0.3} y2={Y(0) + fs * 0.9} className="stroke-slate-500" strokeWidth={sw} />
                <text x={X((a + c) / 2)} y={Y(0) + fs * 1.6} textAnchor="middle" style={{ fontSize: fs * 0.8 }}>
                  {label}
                </text>
              </g>
            ) : (
              <g key={i}>
                <line x1={X(W) + fs * 0.6} x2={X(W) + fs * 0.6} y1={Y(a)} y2={Y(c)} className="stroke-slate-500" strokeWidth={sw} />
                <text x={X(W) + fs * 0.9} y={Y((a + c) / 2)} dominantBaseline="middle" style={{ fontSize: fs * 0.8 }}>
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

export const MEMBER_SWATCH: Record<PanelMemberKind, string> = {
  stud: 'bg-teal-600',
  edge: 'bg-teal-800',
  cap: 'bg-orange-600',
  block: 'bg-violet-500',
}
