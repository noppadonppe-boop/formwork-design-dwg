// 3D designer tab: the model built from the current design plus an inspector for the selected part group.
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ElementForm } from '@/components/design/ElementForms'
import { RatioBar, StatusBadge } from '@/components/ui'
import type { AnyDesign } from '@/data/elements'
import type { ElementData } from '@/data/types'
import { fmt, type Status } from '@/engine'
import { applyHandle, elementGroups, elementModel } from '@/model/elementModel'
import { GROUP_COMPONENT, GROUP_LABEL, type Handle, type HandleKey, type PartGroup } from '@/model/formModel'
import { FormViewer } from './FormViewer'

interface Props {
  draft: ElementData
  run: AnyDesign
  setDraft: (fn: (el: ElementData) => ElementData) => void
}

/** Handles whose value is half the dimension (dragging one face of a centred element). */
const HALF: Partial<Record<ElementData['type'], HandleKey[]>> = {
  wall: ['thickness'],
  column: ['b', 'h'],
  beam: ['b'],
  footing: ['lengthX', 'lengthY'],
}

export default function Designer3D({ draft, run, setDraft }: Props) {
  const [selected, setSelected] = useState<PartGroup>()

  const model = useMemo(() => elementModel(draft, run), [draft, run])
  const formatHandle = (h: Handle, v: number) => {
    if (HALF[draft.type]?.includes(h.key)) return h.key === 'lengthX' || h.key === 'lengthY' ? `${(v * 2).toFixed(2)} ม.` : `${Math.round(v * 200)} ซม.`
    if (['height', 'length', 'lengthX', 'lengthY', 'clearHeight'].includes(h.key)) return `${v.toFixed(2)} ม.`
    return `${Math.round(v * 100)} ซม.`
  }
  const status = useMemo(() => {
    const s: Partial<Record<PartGroup, Status>> = {}
    for (const [g, key] of Object.entries(GROUP_COMPONENT)) {
      const c = run.design.components.find((c) => c.key === key)
      if (c) s[g as PartGroup] = c.status
    }
    return s
  }, [run])
  const groups = elementGroups(draft)
  const onHandle = (key: HandleKey, v: number) => setDraft((el) => applyHandle(el, key, v))
  const vertical = run.design.loadKind === 'vertical'

  const comp = selected && run.design.components.find((c) => c.key === GROUP_COMPONENT[selected])
  // the stud check governs column yoke spacing; sill nails ride along with the sheathing
  const extra = selected === 'sheathing' ? run.design.components.find((c) => c.key === 'sill') : undefined

  return (
    <FormViewer model={model} status={status} selected={selected} onSelect={setSelected} onHandle={onHandle} formatHandle={formatHandle} groups={groups}>
      {selected && (
        <aside
          className="absolute inset-x-2 bottom-2 flex max-h-[58%] flex-col overflow-hidden rounded-xl border border-line bg-white/97 shadow-xl backdrop-blur sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-14 sm:max-h-none sm:w-[350px]"
          aria-label={`แก้ไข ${GROUP_LABEL[selected]}`}
        >
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="size-2.5 rounded-sm bg-sel" />
            <h3 className="font-semibold">{GROUP_LABEL[selected]}</h3>
            {comp && <StatusBadge status={comp.status} />}
            <button type="button" onClick={() => setSelected(undefined)} className="ml-auto rounded p-1 text-muted hover:bg-slate-100 hover:text-ink" aria-label="ปิด">
              <X size={16} />
            </button>
          </header>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3">
            {selected === 'concrete' && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                {vertical ? 'น้ำหนักบรรทุกบนแบบ' : 'แรงดันด้านข้างสูงสุด'} <b className="num">{fmt(run.design.pressure.Pmax)}</b> กก./ม.²
                {!vertical && <span className="text-muted"> · ที่ความลึก {run.design.pressure.hCrit.toFixed(2)} ม.</span>}
              </div>
            )}
            {[comp, extra].filter(Boolean).map((c) => (
              <div key={c!.key} className="flex flex-col gap-1.5 text-[13px]">
                <p className="text-slate-600">{c!.spec}</p>
                {c!.spacing && (
                  <p className="text-xs text-muted">
                    {c!.spacing.label} <b className="num text-ink">{c!.spacing.value}</b> ซม. (สูงสุด {c!.spacing.max.toFixed(1)} · คุมโดย{c!.spacing.governing}
                    {c!.spacing.fixed ? ' · กำหนดเอง' : ' · อัตโนมัติ'})
                  </p>
                )}
                {c!.rows.map((r) => (
                  <div key={r.item} className="grid grid-cols-[1fr_70px_36px] items-center gap-2">
                    <span className="truncate text-slate-700" title={r.item}>
                      {r.item}
                    </span>
                    <RatioBar ratio={r.ratio} />
                    <span className={clsx('num text-right font-semibold', r.ratio > 1 ? 'text-fail' : r.ratio >= 0.9 ? 'text-warn' : 'text-ok')}>{r.ratio.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
            <ElementForm el={draft} set={setDraft} only={selected} />
            <p className="text-xs text-muted">ระยะที่เว้นว่างไว้ = ให้ระบบเลือกอัตโนมัติ · การลากจุดสีส้มในโมเดลจะกำหนดระยะเอง</p>
          </div>
        </aside>
      )}
    </FormViewer>
  )
}

