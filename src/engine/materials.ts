// Material allowable stresses — book Chapter 3 (Tables 3.4, 3.7, 3.8) and values used in the worked examples.
// Units: kg/cm².

export type MaterialKind = 'timber' | 'plywood' | 'steel'

export interface Material {
  id: string
  kind: MaterialKind
  name: string
  E: number
  /** allowable bending */
  Fb: number
  /** allowable shear (timber ∥ grain / plywood rolling shear / steel web). Undefined = not checked (book practice for plywood). */
  Fv?: number
  /** allowable compression ∥ grain (timber) — caps column formula Fa */
  Fc?: number
  /** allowable compression ⊥ grain (timber bearing) */
  Fcp?: number
  /** allowable tension ∥ grain (timber, Table 3.5 uses Fb value) / steel 0.6Fy */
  Ft?: number
  /** steel yield */
  Fy?: number
  ref: string
}

/** Thai timber species groups — ว.ส.ท. Table 3.4 (E) and กทม. Table 3.5 (Fv). Tension ∥ grain taken = Fb as the book does. */
export const TIMBER: Material[] = [
  // Values behind the book's wall/column design tables (Table 8.4 reproduces exactly with Fv = 10 and l − 2d).
  { id: 'timber-yang', kind: 'timber', name: 'ไม้ยาง/กระบาก (ตารางบทที่ 8–9)', E: 94100, Fb: 80, Fc: 60, Fcp: 16, Fv: 10, Ft: 80, ref: 'ตาราง 3.4, 8.4' },
  { id: 'timber-vsoft', kind: 'timber', name: 'ไม้เนื้ออ่อนมาก', E: 78900, Fb: 60, Fc: 45, Fcp: 12, Fv: 6, Ft: 60, ref: 'ตาราง 3.4/3.5' },
  { id: 'timber-soft', kind: 'timber', name: 'ไม้เนื้ออ่อน (ไม้ยาง, กระบาก)', E: 94100, Fb: 80, Fc: 60, Fcp: 16, Fv: 8, Ft: 80, ref: 'ตาราง 3.4/3.5' },
  { id: 'timber-medium', kind: 'timber', name: 'ไม้เนื้อปานกลาง', E: 112300, Fb: 100, Fc: 75, Fcp: 22, Fv: 10, Ft: 100, ref: 'ตาราง 3.4/3.5' },
  { id: 'timber-hard', kind: 'timber', name: 'ไม้เนื้อแข็ง', E: 136300, Fb: 120, Fc: 90, Fcp: 30, Fv: 12, Ft: 120, ref: 'ตาราง 3.4/3.5' },
  { id: 'timber-vhard', kind: 'timber', name: 'ไม้เนื้อแข็งมาก', E: 189000, Fb: 150, Fc: 110, Fcp: 40, Fv: 15, Ft: 150, ref: 'ตาราง 3.4/3.5' },
]

/**
 * Plywood. The worked examples (Ch.8–10) use APA Class I: Fb 135, E 115,500.
 * Shear is not checked in the book's examples, so Fv is left undefined by default.
 */
export const PLYWOOD: Material[] = [
  { id: 'ply-apa1', kind: 'plywood', name: 'ไม้อัด APA Class I', E: 115500, Fb: 135, ref: 'ตาราง 3.7 (ใช้ในตัวอย่างบทที่ 8–10)' },
  { id: 'ply-apa2', kind: 'plywood', name: 'ไม้อัด APA Class II', E: 100000, Fb: 93, ref: 'ตาราง 3.7' },
  { id: 'ply-generic70', kind: 'plywood', name: 'ไม้อัดทั่วไป (Fb 70)', E: 100000, Fb: 70, ref: 'ตัวอย่าง 5.4 / 5.13' },
]

/** Steel. Examples use Fb = 1,200 and v_allow = 0.5×2,400 = 1,200; E = 2.0×10⁶. */
export const STEEL: Material[] = [
  { id: 'steel-ss400', kind: 'steel', name: 'เหล็กรูปพรรณ (Fy 2,400)', E: 2.0e6, Fb: 1200, Fv: 1200, Ft: 1440, Fy: 2400, ref: 'ตัวอย่าง 8.2/8.3' },
  { id: 'steel-a36', kind: 'steel', name: 'เหล็ก A36 (Fy 2,500, FS 2)', E: 2.0e6, Fb: 1250, Fv: 1000, Ft: 1500, Fy: 2500, ref: 'ตัวอย่าง 5.5 / เทศบัญญัติ กทม.' },
]

export const MATERIALS: Material[] = [...TIMBER, ...PLYWOOD, ...STEEL]

export function getMaterial(id: string): Material {
  const m = MATERIALS.find((x) => x.id === id)
  if (!m) throw new Error(`Unknown material ${id}`)
  return m
}

/** Load-duration increase on allowable stresses (not E) — ว.ส.ท. via §3.2. */
export const LOAD_DURATION = {
  none: 1.0,
  '2months': 1.15,
  '7days': 1.25,
  wind: 1.33,
  impact: 2.0,
} as const
export type LoadDuration = keyof typeof LOAD_DURATION

export function withDuration(m: Material, d: LoadDuration): Material {
  const f = LOAD_DURATION[d]
  if (f === 1) return m
  const s = (x?: number) => (x === undefined ? undefined : x * f)
  return { ...m, Fb: m.Fb * f, Fv: s(m.Fv), Fc: s(m.Fc), Fcp: s(m.Fcp), Ft: s(m.Ft) }
}

/** Form ties — Table 4.6 (tested) and RB-24 round bar Table 5.4. Working loads in kg. */
export interface TieType {
  id: string
  name: string
  swl: number
  ultimate?: number
  ref: string
}

export const TIES: TieType[] = [
  { id: 'tie-3/8', name: 'Form tie Ø3/8" (Inner unit B/C/BC)', swl: 2100, ultimate: 3000, ref: 'ตาราง 4.6' },
  { id: 'tie-1/2', name: 'Form tie Ø1/2" (Inner unit D)', swl: 2800, ultimate: 4000, ref: 'ตาราง 4.6' },
  { id: 'rb-9', name: 'เหล็กกลม RB-24 Ø9 มม.', swl: 920, ref: 'ตาราง 5.4' },
  { id: 'rb-12', name: 'เหล็กกลม RB-24 Ø12 มม.', swl: 1630, ref: 'ตาราง 5.4' },
  { id: 'rb-15', name: 'เหล็กกลม RB-24 Ø15 มม.', swl: 2550, ref: 'ตาราง 5.4' },
  { id: 'rb-19', name: 'เหล็กกลม RB-24 Ø19 มม.', swl: 4100, ref: 'ตาราง 5.4' },
]

export function getTie(id: string): TieType {
  const t = TIES.find((x) => x.id === id)
  if (!t) throw new Error(`Unknown tie ${id}`)
  return t
}

/** Concrete nail Ø4 mm in shear: π(0.4)²/4 × 1,200 ≈ 150 kg — Ex 8.1. */
export const CONCRETE_NAIL_SWL = 150
