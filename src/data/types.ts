import type { BeamInput, ColumnInput, FootingInput, PressureMethod, SlabInput, Status, VerticalMethod, WallInput } from '@/engine'

export type ProjectStatus = 'design' | 'review' | 'issued'

export interface Criteria {
  pressureMethod: PressureMethod
  verticalMethod: VerticalMethod
  /** rate of placement, m/hr */
  R: number
  /** concrete temperature, °C */
  T: number
  /** slump, cm */
  slump: number
  /** concrete unit weight, kg/m³ */
  gamma: number
  /** vibration increase, fraction */
  vibrationFactor: number
  liveLoad: number
  formWeight: number
  deflectionRatio: number
  /** optional absolute deflection cap, mm (null = l/ratio only, as in the book's examples) */
  deflectionAbsMm: number | null
  checkTimberShear: boolean
  windLoad: number
  defaults: {
    plywoodId: string
    plywoodThicknessMm: number
    timberId: string
    steelId: string
    tieId: string
  }
}

export interface ProjectData {
  projectNo: string
  name: string
  client: string
  contractor: string
  subcontractor: string
  location: string
  note: string
  revision: string
  status: ProjectStatus
  criteria: Criteria
  /** shop drawing / BOM settings (optional for projects created before Phase 4) */
  shop?: ShopSettings
  /** language of the calculation report (default Thai) */
  reportLang?: ReportLang
  /** company logo for the title block and report header — a small PNG data URL (resized on upload) */
  logo?: string
}

export type ReportLang = 'th' | 'en' | 'zh'
export const REPORT_LANG_LABEL: Record<ReportLang, string> = { th: 'ภาษาไทย', en: 'English', zh: '中文' }

export interface ShopSettings {
  /** company shown in the title block */
  company: string
  drawnBy: string
  checkedBy: string
  approvedBy: string
  /** description of the current revision */
  revisionNote: string
  /** waste allowance, % */
  waste: { plywood: number; timber: number; steel: number }
  /** times one set of forms is used (purchase = need ÷ reuse; form ties are consumed every pour) */
  reuse: number
  /** unit prices, บาท, by BOM summary description (a list: descriptions contain '.' and '/', unsafe as Firestore keys) */
  prices: { key: string; price: number }[]
}

export const DEFAULT_SHOP: ShopSettings = {
  company: '',
  drawnBy: '',
  checkedBy: '',
  approvedBy: '',
  revisionNote: 'ออกแบบครั้งแรก',
  waste: { plywood: 10, timber: 10, steel: 3 },
  reuse: 1,
  prices: [],
}

export const shopSettings = (p: { shop?: Partial<ShopSettings> } | null | undefined): ShopSettings => ({
  ...DEFAULT_SHOP,
  ...p?.shop,
  waste: { ...DEFAULT_SHOP.waste, ...p?.shop?.waste },
  prices: Array.isArray(p?.shop?.prices) ? p.shop.prices : [],
})

export interface Project extends ProjectData {
  id: string
  ownerUid: string
  members: string[]
  elementCount: number
  createdAt: number
  updatedAt: number
  /** bumped by every content save (concurrent-edit detection) */
  version?: number
}

export type ElementType = 'wall' | 'column' | 'slab' | 'beam' | 'footing'

interface ElementBase {
  code: string
  name: string
  level: string
  qty: number
  result?: { status: Status; maxRatio: number; pressure: number }
}

export type ElementData =
  | (ElementBase & { type: 'wall'; input: WallInput })
  | (ElementBase & { type: 'column'; input: ColumnInput })
  | (ElementBase & { type: 'slab'; input: SlabInput })
  | (ElementBase & { type: 'beam'; input: BeamInput })
  | (ElementBase & { type: 'footing'; input: FootingInput })

export type FormElement = ElementData & { id: string; projectId: string; createdAt: number; updatedAt: number; version?: number }

export const DEFAULT_CRITERIA: Criteria = {
  pressureMethod: 'CEB',
  verticalMethod: 'ACI347',
  R: 2,
  T: 30,
  slump: 10,
  gamma: 2400,
  vibrationFactor: 0,
  liveLoad: 245,
  formWeight: 50,
  deflectionRatio: 360,
  deflectionAbsMm: null,
  checkTimberShear: true,
  windLoad: 50,
  defaults: {
    plywoodId: 'ply-apa1',
    plywoodThicknessMm: 18,
    timberId: 'timber-yang',
    steelId: 'steel-ss400',
    tieId: 'tie-1/2',
  },
}

export const EMPTY_PROJECT: ProjectData = {
  projectNo: '',
  name: '',
  client: '',
  contractor: '',
  subcontractor: '',
  location: '',
  note: '',
  revision: 'R0',
  status: 'design',
  criteria: DEFAULT_CRITERIA,
  reportLang: 'th',
  logo: '',
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  design: 'กำลังออกแบบ',
  review: 'รอตรวจ',
  issued: 'ออกแบบแล้ว',
}

export const priceOf = (s: ShopSettings, key: string) => s.prices.find((p) => p.key === key)?.price
export const withPrice = (s: ShopSettings, key: string, price: number | undefined): ShopSettings => ({
  ...s,
  prices: [...s.prices.filter((p) => p.key !== key), ...(price !== undefined ? [{ key, price }] : [])],
})

// ---------------------------------------------------------------- Form Assembly: panels (แผงแบบหล่อ)

export type PanelEdge = 'left' | 'right' | 'top' | 'bottom'
/** stud direction on the panel face: 'vertical' = studs run up the panel height */
export type StudDir = 'vertical' | 'horizontal'
/** plywood sheet orientation on the panel: long side (2.44) along the panel width or height */
export type SheetLay = 'auto' | 'long-width' | 'long-height'

/** A prefabricated formwork panel kept in the project's stock, re-used by any assembly. */
export interface PanelData {
  /** unique within the project, e.g. P-2412 */
  code: string
  name: string
  /** m */
  width: number
  height: number
  plywood: { materialId: string; thicknessMm: number; lay: SheetLay }
  stud: { sectionId: string; materialId: string; dir: StudDir; spacingCm: number }
  /** edge (closing) studs on each side */
  edges: Record<PanelEdge, boolean>
  /** panels on hand */
  stock: number
  note: string
  /** element whose design the panel is checked against */
  refElementId?: string
}

export type FormPanel = PanelData & { id: string; projectId: string; createdAt: number; updatedAt: number; version?: number }

export const DEFAULT_PANEL: PanelData = {
  code: '',
  name: '',
  width: 2.4,
  height: 1.2,
  plywood: { materialId: 'ply-apa1', thicknessMm: 18, lay: 'auto' },
  stud: { sectionId: 'timber-2x3', materialId: 'timber-yang', dir: 'vertical', spacingCm: 40 },
  edges: { left: true, right: true, top: false, bottom: false },
  stock: 0,
  note: '',
}
