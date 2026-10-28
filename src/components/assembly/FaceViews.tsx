// Drawings of an assembly: the plan of the four faces (which pair runs past the corners) and the elevation of one
// face, where panels can be dragged within their course to reorder them.
import clsx from 'clsx'
import { type PointerEvent, useRef, useState } from 'react'
import type { FaceKey } from '@/data/types'
import { FACE_KEYS } from '@/data/types'
import type { FaceResult, FaceSpec } from '@/model/assembly'

/** narrow panels (fillers) are drawn in another colour */
const FILLER_W = 0.3

export function PlanView({ specs, lx, ly, selected, onSelect }: { specs: Record<FaceKey, FaceSpec>; lx: number; ly: number; selected: FaceKey; onSelect: (k: FaceKey) => void }) {
  const k = 100
  // faces drawn thicker than to scale so the corners read; through faces run over the corner squares
  const th = Math.max(lx, ly) * k * 0.035
  const pad = th + Math.max(lx, ly) * 12
  const vbW = lx * k + 2 * pad
  const vbH = ly * k + 2 * pad
  const fs = Math.max(lx, ly) * 4.5
  const X = (x: number) => pad + x * k
  const Y = (y: number) => pad + y * k
  // the face bars, outside the concrete; through faces extend over the corners
  const bar = (key: FaceKey) => {
    const ext = specs[key].through ? th : 0
    switch (key) {
      case 'A':
        return { x: X(0) - ext, y: Y(ly), w: lx * k + 2 * ext, h: th, lx: X(lx / 2), ly: Y(ly) + th + fs * 1.2 }
      case 'C':
        return { x: X(0) - ext, y: Y(0) - th, w: lx * k + 2 * ext, h: th, lx: X(lx / 2), ly: Y(0) - th - fs * 0.5 }
      case 'B':
        return { x: X(lx), y: Y(0) - ext, w: th, h: ly * k + 2 * ext, lx: X(lx) + th + fs * 0.9, ly: Y(ly / 2) }
      case 'D':
        return { x: X(0) - th, y: Y(0) - ext, w: th, h: ly * k + 2 * ext, lx: X(0) - th - fs * 0.9, ly: Y(ly / 2) }
    }
  }
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full" role="group" aria-label="ผังด้านแบบหล่อ — เลือกด้าน">
      <rect x={X(0)} y={Y(0)} width={lx * k} height={ly * k} className="fill-slate-200 stroke-slate-400" strokeWidth={0.5} />
      <text x={X(lx / 2)} y={Y(ly / 2)} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500" style={{ fontSize: fs }}>
        {lx.toFixed(2)} × {ly.toFixed(2)}
      </text>
      {FACE_KEYS.map((key) => {
        const b = bar(key)
        const on = key === selected
        return (
          <g key={key} role="button" tabIndex={0} aria-pressed={on} aria-label={`ด้าน ${key}`} className="cursor-pointer outline-none" onClick={() => onSelect(key)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(key)}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} className={on ? 'fill-blue-600' : specs[key].through ? 'fill-amber-500' : 'fill-amber-300'} />
            <text x={b.lx} y={b.ly} textAnchor="middle" dominantBaseline="middle" className={on ? 'fill-blue-700 font-bold' : 'fill-slate-700'} style={{ fontSize: fs * 1.2 }}>
              {key}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export interface Slot {
  course: number
  index: number
}

export function FaceElevation({
  face,
  editable,
  selected,
  onSelect,
  onMove,
}: {
  face: FaceResult
  editable: boolean
  selected?: Slot
  onSelect: (s: Slot | undefined) => void
  onMove: (course: number, from: number, to: number) => void
}) {
  const { spec, placed, courses, ties, wales } = face
  const L = Math.max(spec.length, ...courses.map((c) => c.length), 0.5)
  const H = Math.max(spec.height, face.height, 0.5)
  const k = 100
  const fs = Math.max(L, H) * k * 0.022
  const sw = fs * 0.05
  const [ml, mt, mr, mb] = [fs * 3.4, fs * 2.2, fs * 4.5, fs * 3]
  const X = (x: number) => ml + x * k
  const Y = (y: number) => mt + (H - y) * k
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ course: number; index: number; x0: number; dx: number }>()

  const toX = (e: PointerEvent) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return 0
    const p = svg.current!.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    return p.matrixTransform(m.inverse()).x
  }
  const down = (e: PointerEvent, s: Slot) => {
    onSelect(s)
    if (!editable) return
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDrag({ ...s, x0: toX(e), dx: 0 })
  }
  const move = (e: PointerEvent) => drag && setDrag({ ...drag, dx: toX(e) - drag.x0 })
  const up = () => {
    if (!drag) return
    const row = placed.filter((p) => p.course === drag.course)
    const me = row[drag.index]
    if (me && Math.abs(drag.dx) > 2) {
      const centre = me.x + me.w / 2 + drag.dx / k
      const others = row.filter((p) => p.index !== drag.index)
      let to = others.findIndex((p) => centre < p.x + p.w / 2)
      if (to < 0) to = others.length
      if (to !== drag.index) {
        onMove(drag.course, drag.index, to)
        onSelect({ course: drag.course, index: to })
      }
    }
    setDrag(undefined)
  }

  const bottom = courses[0]
  return (
    <svg ref={svg} viewBox={`0 0 ${L * k + ml + mr} ${H * k + mt + mb}`} className="w-full touch-none select-none" role="img" aria-label={`รูปด้าน ${spec.key}`} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(undefined)}>
      {/* required outline: length × pour height */}
      <rect x={X(0)} y={Y(spec.height)} width={spec.length * k} height={spec.height * k} className="fill-slate-50 stroke-slate-400" strokeWidth={sw} strokeDasharray={`${fs * 0.4} ${fs * 0.3}`} />
      {spec.through && spec.offset > 0 && (
        <g className="fill-slate-200">
          <rect x={X(0)} y={Y(spec.height)} width={spec.offset * k} height={spec.height * k} />
          <rect x={X(spec.length - spec.offset)} y={Y(spec.height)} width={spec.offset * k} height={spec.height * k} />
        </g>
      )}
      {placed.map((p) => {
        const on = selected?.course === p.course && selected.index === p.index
        const dx = drag?.course === p.course && drag.index === p.index ? drag.dx : 0
        const w = p.w * k
        const h = p.h * k
        const filler = p.panel && p.w < FILLER_W
        return (
          <g key={`${p.course}-${p.index}`} transform={`translate(${dx} 0)`} className={clsx(editable && 'cursor-grab')} onPointerDown={(e) => down(e, p)} opacity={dx ? 0.85 : 1}>
            <rect
              x={X(p.x)}
              y={Y(p.y + p.h)}
              width={Math.max(w, 1)}
              height={Math.max(h, 1)}
              className={clsx(!p.panel ? 'fill-red-100 stroke-red-600' : filler ? 'fill-orange-200 stroke-orange-700' : 'fill-amber-100 stroke-amber-700', on && 'stroke-blue-600')}
              strokeWidth={on ? sw * 5 : sw * 2}
            />
            {w > fs * 2.5 && (
              <text x={X(p.x + p.w / 2)} y={Y(p.y + p.h / 2)} textAnchor="middle" dominantBaseline="middle" className="num fill-amber-900 font-semibold" style={{ fontSize: fs * (w > fs * 6 ? 1 : 0.7) }}>
                {p.panel?.code ?? 'ลบแล้ว'}
              </text>
            )}
          </g>
        )
      })}
      {wales.map((y, i) => (
        <line key={i} x1={X(0) - fs * 0.6} x2={X(Math.max(spec.length, ...courses.map((c) => c.length))) + fs * 0.6} y1={Y(y)} y2={Y(y)} className="stroke-teal-700" strokeWidth={fs * 0.35} opacity={0.75} pointerEvents="none" />
      ))}
      {ties.map((t, i) => (
        <circle key={i} cx={X(t.u)} cy={Y(t.y)} r={fs * 0.4} className={t.clash ? 'fill-red-600' : 'fill-violet-700'} pointerEvents="none" />
      ))}
      {/* pour level */}
      <line x1={X(0) - fs} x2={X(spec.length) + fs} y1={Y(spec.height)} y2={Y(spec.height)} className="stroke-red-600" strokeWidth={sw * 2} strokeDasharray={`${fs * 0.6} ${fs * 0.4}`} pointerEvents="none" />
      <text x={X(spec.length) + fs * 1.2} y={Y(spec.height)} dominantBaseline="middle" className="fill-red-700" style={{ fontSize: fs * 0.8 }}>
        เท {spec.height.toFixed(2)}
      </text>
      {/* course heights on the left */}
      {courses.map((c, i) => (
        <text key={i} x={X(0) - fs * 0.8} y={Y(c.y + c.h / 2)} textAnchor="end" dominantBaseline="middle" className="num fill-slate-600" style={{ fontSize: fs * 0.75 }}>
          {c.h.toFixed(2)}
        </text>
      ))}
      {/* widths of the bottom course and the required length */}
      {bottom &&
        placed
          .filter((p) => p.course === 0)
          .map((p, i) => (
            <text key={i} x={X(p.x + p.w / 2)} y={Y(0) + fs * 1.3} textAnchor="middle" className="num fill-slate-600" style={{ fontSize: fs * 0.75 }}>
              {p.w.toFixed(2)}
            </text>
          ))}
      <line x1={X(0)} x2={X(spec.length)} y1={Y(0) + fs * 2} y2={Y(0) + fs * 2} className="stroke-slate-500" strokeWidth={sw} />
      <text x={X(spec.length / 2)} y={Y(0) + fs * 2.8} textAnchor="middle" className="num fill-slate-800" style={{ fontSize: fs * 0.85 }}>
        ต้องการ {spec.length.toFixed(3)} ม.
      </text>
    </svg>
  )
}
