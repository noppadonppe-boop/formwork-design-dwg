// Vertical loads on slab/beam formwork — book §2.11.
import { Trace } from './trace'

export type VerticalMethod = 'ACI347' | 'CEB' | 'CIRA'

/** Table 2.7 — live load by concrete thickness (CEB/CIRA practice), kg/m². */
export function liveLoadCebCira(thicknessM: number): number {
  if (thicknessM <= 0.2) return 100
  if (thicknessM <= 0.3) return 150
  if (thicknessM <= 0.6) return 200
  return 250
}

export interface VerticalInput {
  method: VerticalMethod
  thickness: number // m
  formWeight?: number // kg/m², default 50
  liveLoad?: number // kg/m², overrides code minimum
  gamma?: number
}

export function verticalLoad(inp: VerticalInput) {
  const trace = new Trace()
  const gamma = inp.gamma ?? (inp.method === 'CIRA' ? 2500 : 2400)
  const dead = trace.add({ label: 'น้ำหนักคอนกรีต', expr: `${gamma} × ${inp.thickness}`, value: gamma * inp.thickness, unit: 'กก./ม.²' })
  const codeLL = inp.method === 'ACI347' ? 245 : liveLoadCebCira(inp.thickness)
  const ll = trace.add({
    label: 'น้ำหนักจร + แรงกระแทก',
    value: Math.max(inp.liveLoad ?? codeLL, codeLL),
    unit: 'กก./ม.²',
    ref: inp.method === 'ACI347' ? 'ACI-347 ≥ 245 กก./ม.²' : 'ตาราง 2.7',
  })
  const form = trace.add({ label: 'น้ำหนักแบบหล่อ', value: inp.formWeight ?? 50, unit: 'กก./ม.²' })
  const total = trace.add({ label: 'น้ำหนักรวม', value: dead + ll + form, unit: 'กก./ม.²' })
  return { dead, live: ll, form, total, trace }
}
