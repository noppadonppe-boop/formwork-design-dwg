// One entry point per element type: geometry, the part groups shown in the 3D layer list, and handle edits.
import type { AnyDesign } from '@/data/elements'
import { beamBracing, beamHasRunners, beamStringer } from '@/engine'
import type { ElementData } from '@/data/types'
import { applyColumnHandle, applyWallHandle, columnModel, type FormModel, type HandleKey, type PartGroup, wallModel } from './formModel'
import { applyBeamHandle, applyFootingHandle, applySlabHandle, beamModel, footingModel, slabModel } from './slabBeamFootingModel'

export function elementModel(el: ElementData, run: AnyDesign): FormModel {
  if (el.type === 'wall' && run.type === 'wall') return wallModel(el.input, run.design)
  if (el.type === 'column' && run.type === 'column') return columnModel(el.input, run.design)
  if (el.type === 'slab' && run.type === 'slab') return slabModel(el.input, run.design)
  if (el.type === 'beam' && run.type === 'beam') return beamModel(el.input, run.design)
  if (el.type === 'footing' && run.type === 'footing') return footingModel(el.input, run.design)
  throw new Error('element / design type mismatch')
}

export function elementGroups(el: ElementData): PartGroup[] {
  switch (el.type) {
    case 'wall':
      return ['concrete', 'sheathing', 'stud', 'wale', 'tie', 'brace']
    case 'column':
      return ['concrete', 'sheathing', ...(el.input.sheathing.type === 'plywood' ? (['stud'] as const) : []), 'yoke', 'tie', 'brace']
    case 'slab':
      return ['concrete', 'sheathing', 'joist', 'stringer', 'shore', ...(el.input.bracing.enabled ? (['bracing'] as const) : [])]
    case 'beam': {
      const deep = el.input.tie.enabled
      return ['concrete', 'sheathing', 'stud', ...(deep ? (['wale', 'tie'] as const) : []), ...(el.input.bottomDir === 'across' ? (['joist'] as const) : []), ...(beamHasRunners(el.input) ? (['bottom'] as const) : []), 'head', ...(beamStringer(el.input).enabled ? (['stringer'] as const) : []), 'shore', ...(beamBracing(el.input).enabled || beamStringer(el.input).enabled || (el.input.shore.kind === 'post' && el.input.shore.braceLevels) ? (['bracing'] as const) : []), ...(!deep && el.input.type !== 'slab' ? (['brace'] as const) : [])]
    }
    case 'footing': {
      const s = el.input.support
      return ['concrete', 'sheathing', 'stud', ...(s === 'braced' ? (el.input.brace.at === 'wale' ? (['wale', 'brace', 'stake'] as const) : (['brace', 'stake'] as const)) : s === 'tied' ? (['wale', 'tie'] as const) : (['stake'] as const))]
    }
  }
}

/** The element with handle `key` dragged to `value`. */
export function applyHandle(el: ElementData, key: HandleKey, value: number): ElementData {
  switch (el.type) {
    case 'wall':
      return { ...el, input: applyWallHandle(el.input, key, value) }
    case 'column':
      return { ...el, input: applyColumnHandle(el.input, key, value) }
    case 'slab':
      return { ...el, input: applySlabHandle(el.input, key, value) }
    case 'beam':
      return { ...el, input: applyBeamHandle(el.input, key, value) }
    case 'footing':
      return { ...el, input: applyFootingHandle(el.input, key, value) }
  }
}
