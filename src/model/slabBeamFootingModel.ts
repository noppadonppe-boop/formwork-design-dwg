// Geometric models for slab, beam and footing forms (metres; x right, y up, z towards the viewer).
// Same part/handle conventions as `formModel.ts`; used by the 3D designer and the report drawings.
import {
  type BeamDesign,
  braceBays,
  type BeamInput,
  beamBottomSection,
  deckThicknessM,
  type FootingDesign,
  type FootingInput,
  getMaterial,
  getSection,
  type MaterialKind,
  type ShoreParams,
  type SlabDesign,
  type SlabInput,
  spread,
} from '@/engine'
import { bounds, cm, type FormModel, type Handle, type HandleKey, pairOffsets, type Part, round3, sheets, snap, type Vec3 } from './formModel'

const kindOf = (materialId: string): MaterialKind => getMaterial(materialId).kind

/** Deck: plywood sheets 1.22 × 2.44 or 20 cm boards, over [x0, x0+w] × [z0, z0+d] at top level y. */
function deck(parts: Part[], sh: SlabInput['sheathing'], id: string, x0: number, z0: number, w: number, d: number, yTop: number) {
  const t = deckThicknessM(sh)
  if (sh.type === 'plywood')
    sheets(w, d).forEach((p, i) =>
      parts.push({ id: `${id}-${i}`, group: 'sheathing', kind: 'plywood', shape: 'box', center: [x0 + (p.u0 + p.u1) / 2, yTop - t / 2, z0 + (p.v0 + p.v1) / 2], size: [p.u1 - p.u0, t, p.v1 - p.v0] }),
    )
  else
    for (let z = 0, i = 0; z < d - 1e-6; z += 0.2, i++) {
      const z1 = Math.min(z + 0.2, d)
      parts.push({ id: `${id}-${i}`, group: 'sheathing', kind: 'timber', shape: 'box', center: [x0 + w / 2, yTop - t / 2, z0 + (z + z1) / 2 + 0.001], size: [w, t, z1 - z - 0.003] })
    }
}

/** One shore (post or rated prop) from the floor to `top`, with an optional base plate. */
function shorePart(parts: Part[], s: ShoreParams, id: string, x: number, z: number, top: number) {
  const base = s.baseCm > 0 ? 0.02 : 0
  if (base) parts.push({ id: `${id}-base`, group: 'shore', kind: 'timber', shape: 'box', center: [x, base / 2, z], size: [cm(s.baseCm), base, cm(s.baseCm)] })
  if (s.kind === 'rated') {
    parts.push({ id, group: 'shore', kind: 'steel', shape: 'bar', from: [x, base, z], to: [x, top - 0.006, z], b: 0.0486, d: 0.0486, round: true })
    parts.push({ id: `${id}-head`, group: 'shore', kind: 'steel', shape: 'box', center: [x, top - 0.003, z], size: [0.15, 0.006, 0.15] })
    return
  }
  const sec = getSection(s.sectionId)
  const round = sec.shape === 'pipe' || sec.shape === 'round'
  const kind = sec.shape === 'pipe' ? 'steel' : kindOf(s.materialId)
  if (round) parts.push({ id, group: 'shore', kind, shape: 'bar', from: [x, base, z], to: [x, top, z], b: cm(sec.B), d: cm(sec.B), round: true })
  else parts.push({ id, group: 'shore', kind, shape: 'box', center: [x, (base + top) / 2, z], size: [cm(sec.B), top - base, cm(sec.H)] })
}

const shoreWidth = (s: ShoreParams) => (s.kind === 'rated' ? 0.0486 : cm(getSection(s.sectionId).H))

// ---------------------------------------------------------------- slab

/** Slab panel: x ∈ [0, Lx] along the stringers, z ∈ [0, Ly] along the joists; soffit at the clear height. */
export function slabModel(inp: SlabInput, d: SlabDesign): FormModel {
  const parts: Part[] = []
  const { lengthX: Lx, lengthY: Ly, thickness: t } = inp
  const Y = inp.clearHeight
  const tSh = deckThicknessM(inp.sheathing)
  const jo = getSection(inp.joist.sectionId)
  const st = getSection(inp.stringer.sectionId)
  const jb = cm(jo.B)
  const jh = cm(jo.H)
  const sb = cm(st.B)
  const sh = cm(st.H)
  const { joistX, stringerY, shoreX, shoreTop } = d.layout

  parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [Lx / 2, Y + t / 2, Ly / 2], size: [Lx, t, Ly] })
  deck(parts, inp.sheathing, 'deck', 0, 0, Lx, Ly, Y)
  joistX.forEach((x, i) => {
    const xc = Math.min(Math.max(x, jb / 2), Lx - jb / 2)
    parts.push({ id: `joist-${i}`, group: 'joist', kind: kindOf(inp.joist.materialId), shape: 'box', center: [xc, Y - tSh - jh / 2, Ly / 2], size: [jb, jh, Ly] })
  })
  stringerY.forEach((z, i) =>
    pairOffsets(inp.stringer.count, sb).forEach((o, k) =>
      parts.push({ id: `stringer-${i}-${k}`, group: 'stringer', kind: kindOf(inp.stringer.materialId), shape: 'box', center: [Lx / 2, Y - tSh - jh - sh / 2, z + o], size: [Lx, sh, sb] }),
    ),
  )
  stringerY.forEach((z, i) => shoreX.forEach((x, j) => shorePart(parts, inp.shore, `shore-${i}-${j}`, x, z, shoreTop)))

  // lateral bracing: an X in the end bays of every row, both directions
  if (inp.bracing.enabled && shoreX.length > 1 && stringerY.length > 0) {
    const br = getSection(inp.bracing.sectionId)
    const bk = br.shape === 'pipe' ? 'steel' : kindOf(inp.bracing.materialId)
    const bw = cm(br.B)
    const off = shoreWidth(inp.shore) / 2 + bw / 2
    const y0 = 0.15
    const y1 = shoreTop - 0.1
    const bar = (id: string, from: Vec3, to: Vec3) => parts.push({ id, group: 'bracing', kind: bk, shape: 'bar', from, to, b: bw, d: cm(br.H), round: br.shape === 'pipe' })
    // each diagonal spans k bays so it is no steeper than 60° (as designed); X in the first and last k bays
    const endBays = (count: number, k: number) => (count - 1 > 2 * k ? [0, count - 1 - k] : [0])
    const kx = Math.min(braceBays(d.layout.shoreSpacing / 100, d.layout.shoreLength), shoreX.length - 1)
    stringerY.forEach((z, i) =>
      endBays(shoreX.length, kx).forEach((j) => {
        bar(`brx-${i}-${j}a`, [shoreX[j], y0, z + off], [shoreX[j + kx], y1, z + off])
        bar(`brx-${i}-${j}b`, [shoreX[j], y1, z + off], [shoreX[j + kx], y0, z + off])
      }),
    )
    const ky = Math.min(braceBays(d.layout.stringerSpacing / 100, d.layout.shoreLength), stringerY.length - 1)
    if (stringerY.length > 1)
      [0, shoreX.length - 1].forEach((j) =>
        endBays(stringerY.length, ky).forEach((i) => {
          const x = shoreX[j] + (j === 0 ? -off : off)
          bar(`bry-${j}-${i}a`, [x, y0, stringerY[i]], [x, y1, stringerY[i + ky]])
          bar(`bry-${j}-${i}b`, [x, y1, stringerY[i]], [x, y0, stringerY[i + ky]])
        }),
      )
  }

  const handles: Handle[] = [
    { key: 'thickness', label: 'ความหนาพื้น t', position: [Lx / 2, Y + t + 0.12, Ly / 2], axis: [0, 1, 0], value: t, min: 0.05, max: 1, step: 0.01 },
    { key: 'lengthX', label: 'ความยาว X', position: [Lx + 0.3, Y + t / 2, Ly / 2], axis: [1, 0, 0], value: Lx, min: 0.5, max: 60, step: 0.05 },
    { key: 'lengthY', label: 'ความยาว Y', position: [Lx / 2, Y + t / 2, Ly + 0.3], axis: [0, 0, 1], value: Ly, min: 0.5, max: 60, step: 0.05 },
    { key: 'clearHeight', label: 'ความสูงใต้ท้องพื้น', position: [-0.35, Y, -0.35], axis: [0, 1, 0], value: Y, min: 1, max: 12, step: 0.05 },
  ]
  if (joistX.length > 1) handles.push({ key: 'joistSpacing', label: 'ระยะตง', position: [joistX[1], Y - tSh - jh / 2, -0.25], axis: [1, 0, 0], value: joistX[1] - joistX[0], min: 0.1, max: 1.5, step: 0.05 })
  if (stringerY.length > 1)
    handles.push({ key: 'stringerSpacing', label: 'ระยะคานรองรับ', position: [-0.3, Y - tSh - jh - sh / 2, stringerY[1]], axis: [0, 0, 1], value: stringerY[1] - stringerY[0], min: 0.3, max: 3, step: 0.05 })
  if (shoreX.length > 1 && stringerY.length)
    handles.push({ key: 'shoreSpacing', label: 'ระยะเสาค้ำ', position: [shoreX[1], shoreTop * 0.6, stringerY[0] - 0.3], axis: [1, 0, 0], value: shoreX[1] - shoreX[0], min: 0.3, max: 3, step: 0.05 })
  return { parts, handles, bounds: bounds(parts) }
}

export function applySlabHandle(inp: SlabInput, key: HandleKey, value: number): SlabInput {
  const cmv = Math.round(snap(value, 0.05) * 100)
  switch (key) {
    case 'thickness':
      return { ...inp, thickness: round3(snap(value, 0.01)) }
    case 'lengthX':
      return { ...inp, lengthX: round3(snap(value, 0.05)) }
    case 'lengthY':
      return { ...inp, lengthY: round3(snap(value, 0.05)) }
    case 'clearHeight':
      return { ...inp, clearHeight: round3(snap(value, 0.05)) }
    case 'joistSpacing':
      return { ...inp, joist: { ...inp.joist, spacingCm: cmv } }
    case 'stringerSpacing':
      return { ...inp, stringer: { ...inp.stringer, spacingCm: cmv } }
    case 'shoreSpacing':
      return { ...inp, shore: { ...inp.shore, spacingCm: cmv } }
    default:
      return inp
  }
}

// ---------------------------------------------------------------- beam

/** Beam along x ∈ [0, L], web centred on z = 0, soffit at the clear height; spandrel slab on the −z side. */
export function beamModel(inp: BeamInput, d: BeamDesign): FormModel {
  const parts: Part[] = []
  const { b, h, length: L } = inp
  const Y = inp.clearHeight
  const tSh = deckThicknessM(inp.sheathing)
  const shKind = inp.sheathing.type === 'plywood' ? 'plywood' : 'timber'
  const stud = getSection(inp.stud.sectionId)
  const sb = cm(stud.B)
  const sd = cm(stud.H)
  const bot = beamBottomSection(inp)
  const one = inp.bottom.count > 0 ? getSection(inp.bottom.sectionId) : undefined
  const bw = one ? cm(inp.bottom.flat ? one.H : one.B) : 0
  const bd = one ? cm(bot.section.H) : 0
  const he = getSection(inp.head.sectionId)
  const hb = cm(he.B)
  const hd = cm(he.H)
  const yHeadTop = Y - tSh - bd
  const yHeadBot = yHeadTop - hd
  const double = inp.shore.layout === 'double'
  const zFace = b / 2 + tSh + sd
  const headLen = Math.max(2 * zFace + 0.5, double ? inp.shore.postSpacingM + 0.3 : 0)
  const { studX, headX, sideOuter, sideInner, tieLevels } = d.layout

  parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [L / 2, Y + h / 2, 0], size: [L, h, b] })
  if (inp.type !== 'isolated' && inp.slabT > 0 && inp.slabTribM > 0) {
    const sides: [number, number][] = inp.type === 'slab' ? [[1, inp.slabTribM / 2], [-1, inp.slabTribM / 2]] : [[-1, inp.slabTribM]]
    for (const [s, w] of sides)
      parts.push({ id: `slab${s}`, group: 'concrete', kind: 'concrete', shape: 'box', center: [L / 2, Y + h - inp.slabT / 2, s * (b / 2 + w / 2)], size: [L, inp.slabT, w] })
  }
  parts.push({ id: 'bottom-ply', group: 'sheathing', kind: shKind, shape: 'box', center: [L / 2, Y - tSh / 2, 0], size: [L, tSh, b + 2 * tSh] })
  for (const [s, hs] of [
    [1, sideOuter],
    [-1, sideInner],
  ] as const) {
    parts.push({ id: `side${s}`, group: 'sheathing', kind: shKind, shape: 'box', center: [L / 2, Y + hs / 2, s * (b / 2 + tSh / 2)], size: [L, hs, tSh] })
    studX.forEach((x, i) => {
      const xc = Math.min(Math.max(x, sb / 2), L - sb / 2)
      const top = Y + hs
      parts.push({ id: `stud${s}-${i}`, group: 'stud', kind: kindOf(inp.stud.materialId), shape: 'box', center: [xc, (yHeadTop + top) / 2, s * (b / 2 + tSh + sd / 2)], size: [sb, top - yHeadTop, sd] })
    })
  }
  if (one) {
    const zs = inp.bottom.count === 1 ? [0] : Array.from({ length: inp.bottom.count }, (_, k) => -b / 2 + bw / 2 + (k * (b - bw)) / (inp.bottom.count - 1))
    zs.forEach((z, k) => parts.push({ id: `stiff-${k}`, group: 'bottom', kind: kindOf(inp.bottom.materialId), shape: 'box', center: [L / 2, Y - tSh - bd / 2, z], size: [L, bd, bw] }))
  }
  headX.forEach((x, i) => {
    pairOffsets(inp.head.count, hb).forEach((o, k) =>
      parts.push({ id: `head-${i}-${k}`, group: 'head', kind: kindOf(inp.head.materialId), shape: 'box', center: [x + o, yHeadTop - hd / 2, 0], size: [hb, hd, headLen] }),
    )
    const posts = double ? [-inp.shore.postSpacingM / 2, inp.shore.postSpacingM / 2] : [0]
    posts.forEach((z, k) => shorePart(parts, inp.shore, `shore-${i}-${k}`, x, z, yHeadBot))
    if (!double && inp.shore.kind === 'post') {
      // knee braces of the T-head (ตุ๊กตา)
      const kb = 0.03
      for (const s of [1, -1]) parts.push({ id: `knee-${i}${s}`, group: 'shore', kind: 'timber', shape: 'bar', from: [x, yHeadBot - 0.45, s * 0.03], to: [x, yHeadBot, s * Math.min(headLen / 2 - 0.05, 0.45)], b: kb, d: 0.06 })
    } else if (double) {
      parts.push({ id: `xbr-${i}`, group: 'shore', kind: 'timber', shape: 'bar', from: [x + 0.04, 0.3, -inp.shore.postSpacingM / 2], to: [x + 0.04, yHeadBot - 0.1, inp.shore.postSpacingM / 2], b: 0.025, d: 0.075 })
    }
  })

  if (tieLevels.length) {
    const wsec = getSection(inp.tie.waleSectionId)
    const wb = cm(wsec.B)
    const wd = cm(wsec.H)
    tieLevels.forEach((lv, i) => {
      const y = Y + lv
      for (const s of [1, -1])
        pairOffsets(2, wb).forEach((o, k) =>
          parts.push({ id: `wale${s}-${i}-${k}`, group: 'wale', kind: kindOf(inp.tie.waleMaterialId), shape: 'box', center: [L / 2, y + o, s * (zFace + wd / 2)], size: [L, wb, wd] }),
        )
      headX.forEach((x, j) => parts.push({ id: `tie-${i}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: [x, y, -(zFace + wd + 0.06)], to: [x, y, zFace + wd + 0.06], b: 0.012, d: 0.012, round: true }))
    })
  } else if (inp.type !== 'slab') {
    const br = getSection(inp.brace.sectionId)
    const sides: [number, number][] = inp.type === 'isolated' ? [[1, sideOuter], [-1, sideInner]] : [[1, sideOuter]]
    headX.forEach((x, i) =>
      sides.forEach(([s, hs]) =>
        parts.push({ id: `brace-${i}${s}`, group: 'brace', kind: kindOf(inp.brace.materialId), shape: 'bar', from: [x + hb, Y + hs - 0.03, s * zFace], to: [x + hb, yHeadTop, s * (headLen / 2 - 0.03)], b: cm(br.B), d: cm(br.H) }),
      ),
    )
  }

  const handles: Handle[] = [
    { key: 'length', label: 'ความยาวคาน L', position: [L + 0.3, Y + h / 2, 0], axis: [1, 0, 0], value: L, min: 0.5, max: 30, step: 0.05 },
    { key: 'h', label: 'ความลึกคาน h', position: [L / 2, Y + h + 0.15, 0], axis: [0, 1, 0], value: h, min: 0.15, max: 3, step: 0.05 },
    { key: 'b', label: 'ความกว้างคาน b', position: [L * 0.25, Y + h + 0.05, b / 2], axis: [0, 0, 1], value: b / 2, min: 0.05, max: 1.5, step: 0.025 },
    { key: 'clearHeight', label: 'ความสูงใต้ท้องคาน', position: [-0.3, Y, 0], axis: [0, 1, 0], value: Y, min: 0.8, max: 12, step: 0.05 },
  ]
  if (studX.length > 1) handles.push({ key: 'studSpacing', label: 'ระยะเคร่าข้าง', position: [studX[1], Y + sideOuter + 0.1, zFace], axis: [1, 0, 0], value: studX[1] - studX[0], min: 0.1, max: 1.2, step: 0.05 })
  if (headX.length > 1) handles.push({ key: 'headSpacing', label: 'ระยะคานขวาง', position: [headX[1], yHeadBot - 0.15, headLen / 2], axis: [1, 0, 0], value: headX[1] - headX[0], min: 0.2, max: 2.4, step: 0.05 })
  return { parts, handles, bounds: bounds(parts) }
}

export function applyBeamHandle(inp: BeamInput, key: HandleKey, value: number): BeamInput {
  const cmv = Math.round(snap(value, 0.05) * 100)
  switch (key) {
    case 'length':
      return { ...inp, length: round3(snap(value, 0.05)) }
    case 'h':
      return { ...inp, h: round3(Math.max(snap(value, 0.05), inp.slabT + 0.1)) }
    case 'b':
      return { ...inp, b: round3(snap(value * 2, 0.05)) }
    case 'clearHeight':
      return { ...inp, clearHeight: round3(snap(value, 0.05)) }
    case 'studSpacing':
      return { ...inp, stud: { ...inp.stud, spacingCm: cmv } }
    case 'headSpacing':
      return { ...inp, head: { ...inp.head, spacingCm: cmv } }
    default:
      return inp
  }
}

// ---------------------------------------------------------------- footing

/** Footing centred on the origin, base at y = 0 on lean concrete. */
export function footingModel(inp: FootingInput, d: FootingDesign): FormModel {
  const parts: Part[] = []
  const { lengthX: Lx, lengthY: Ly, height: H } = inp
  const tSh = deckThicknessM(inp.sheathing)
  const shKind = inp.sheathing.type === 'plywood' ? 'plywood' : 'timber'
  const stud = getSection(inp.stud.sectionId)
  const sKind = kindOf(inp.stud.materialId)
  const sb = cm(stud.B)
  const sd = cm(stud.H)
  const a = d.layout.studSpacing / 100
  const embed = inp.stake.embedM
  const yStud0 = inp.support === 'cantilever' ? -embed : 0

  if (inp.leanM > 0) parts.push({ id: 'lean', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, -inp.leanM / 2, 0], size: [Lx + 0.4, inp.leanM, Ly + 0.4] })
  parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, H / 2, 0], size: [Lx, H, Ly] })

  // faces: normal n, half-size along the face, outward offset of the sheathing
  const faces = [
    { n: [0, 0, 1], half: Lx / 2 + tSh, off: Ly / 2 },
    { n: [0, 0, -1], half: Lx / 2 + tSh, off: Ly / 2 },
    { n: [1, 0, 0], half: Ly / 2, off: Lx / 2 },
    { n: [-1, 0, 0], half: Ly / 2, off: Lx / 2 },
  ] as const
  const at = (f: (typeof faces)[number], u: number, r: number, y: number): Vec3 => (f.n[0] !== 0 ? [f.n[0] * r, y, u] : [u, y, f.n[2] * r])
  const box = (f: (typeof faces)[number], u: number, r: number, y: number, along: number, height: number, depth: number): { center: Vec3; size: Vec3 } => ({
    center: at(f, u, r, y),
    size: f.n[0] !== 0 ? [depth, height, along] : [along, height, depth],
  })

  const th = (inp.brace.angleDeg * Math.PI) / 180
  const br = getSection(inp.brace.sectionId)
  const stake = getSection(inp.stake.sectionId)
  const levels = d.layout.braceLevels
  const viaWale = inp.support === 'braced' && inp.brace.at === 'wale'
  const w = getSection(inp.wale.sectionId)
  const wb = cm(w.B)
  const wd = cm(w.H)
  const waleLevels = inp.support === 'tied' || viaWale ? d.layout.waleLevels : []
  faces.forEach((f, fi) => {
    parts.push({ id: `ply-${fi}`, group: 'sheathing', kind: shKind, shape: 'box', ...box(f, 0, f.off + tSh / 2, H / 2, 2 * f.half, H, tSh) })
    const us = spread(2 * f.half - sb, a).map((u) => u - f.half + sb / 2)
    const rStud = f.off + tSh + sd / 2
    const r0 = f.off + tSh + sd
    us.forEach((u, i) => {
      parts.push({ id: `stud-${fi}-${i}`, group: 'stud', kind: sKind, shape: 'box', ...box(f, u, rStud, (yStud0 + H) / 2, sb, H - yStud0, sd) })
      if (inp.support === 'braced') parts.push({ id: `kick-${fi}-${i}`, group: 'stake', kind: 'timber', shape: 'box', ...box(f, u, r0 + cm(stake.H) / 2, (0.15 - embed) / 2, cm(stake.B), 0.15 + embed, cm(stake.H)) })
    })
    // wales round the footing at the same levels: the long-side wales run through past the corners,
    // the short-side wales butt against their inner face (corner detail, Fig 8.11) — no clash
    const span = fi < 2 ? Lx : Ly
    const through = fi < 2 ? Lx >= Ly : Ly > Lx
    const waleLen = through ? span + 2 * (tSh + sd + wd + 0.1) : span + 2 * (tSh + sd)
    waleLevels.forEach((y, i) =>
      pairOffsets(inp.wale.count, wb).forEach((o, k) =>
        parts.push({ id: `wale-${fi}-${i}-${k}`, group: 'wale', kind: kindOf(inp.wale.materialId), shape: 'box', ...box(f, 0, r0 + wd / 2, y + o, waleLen, wb, wd) }),
      ),
    )
    if (inp.support === 'braced') {
      // braces at every stud, or along the wales at the brace spacing
      const along = d.layout.braceAlong
      const ub = viaWale && along ? spread(2 * f.half - sb, along / 100).map((u) => u - f.half + sb / 2) : us
      const rb = viaWale ? r0 + wd : r0
      ub.forEach((u, i) => {
        levels.forEach((y, k) => {
          const run = y / Math.tan(th)
          parts.push({ id: `brace-${fi}-${i}-${k}`, group: 'brace', kind: kindOf(inp.brace.materialId), shape: 'bar', from: at(f, u, rb, y), to: at(f, u, rb + run, 0), b: cm(br.B), d: cm(br.H) })
        })
        const run = (levels[0] ?? H) / Math.tan(th)
        parts.push({ id: `stake-${fi}-${i}`, group: 'stake', kind: 'timber', shape: 'box', ...box(f, u, rb + run + 0.05, (0.2 - embed) / 2, cm(stake.B), 0.2 + embed, cm(stake.H)) })
      })
    }
  })
  if (inp.support === 'tied' && d.layout.tieLayout && d.layout.tieLayout !== 'none') {
    // ties through the long faces (across the short side), and through the short faces when both ways;
    // interior points only, spread evenly — the second direction sits a bar's width higher
    const long = Math.max(Lx, Ly)
    const short = Math.min(Lx, Ly)
    const longIsX = Lx >= Ly
    const reach = (half: number) => half + tSh + sd + wd + 0.06
    const evenly = (L: number, n: number) => Array.from({ length: n }, (_, j) => -L / 2 + ((j + 1) * L) / (n + 1))
    const runs: { u: number[]; alongX: boolean; r: number; dy: number }[] = [{ u: evenly(long, d.layout.tiesLong ?? 0), alongX: longIsX, r: reach(short / 2), dy: 0 }]
    if (d.layout.tieLayout === 'both') runs.push({ u: evenly(short, d.layout.tiesShort ?? 0), alongX: !longIsX, r: reach(long / 2), dy: 0.03 })
    d.layout.waleLevels.forEach((y, i) =>
      runs.forEach((g, gi) =>
        g.u.forEach((u, j) =>
          parts.push({ id: `tie-${i}-${gi}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: g.alongX ? [u, y + g.dy, -g.r] : [-g.r, y + g.dy, u], to: g.alongX ? [u, y + g.dy, g.r] : [g.r, y + g.dy, u], b: 0.014, d: 0.014, round: true }),
        ),
      ),
    )
  }

  const handles: Handle[] = [
    { key: 'height', label: 'ความลึกฐาน H', position: [0, H + 0.2, 0], axis: [0, 1, 0], value: H, min: 0.2, max: 6, step: 0.05 },
    { key: 'lengthX', label: 'ความยาว X', position: [Lx / 2, H + 0.05, 0], axis: [1, 0, 0], value: Lx / 2, min: 0.15, max: 15, step: 0.025 },
    { key: 'lengthY', label: 'ความยาว Y', position: [0, H + 0.05, Ly / 2], axis: [0, 0, 1], value: Ly / 2, min: 0.15, max: 15, step: 0.025 },
  ]
  const zOut = Ly / 2 + tSh + sd
  const us0 = spread(Lx + 2 * tSh - sb, a)
  if (us0.length > 1) handles.push({ key: 'studSpacing', label: 'ระยะเคร่า', position: [us0[1] - Lx / 2 - tSh + sb / 2, H + 0.08, zOut], axis: [1, 0, 0], value: us0[1] - us0[0], min: 0.1, max: 1, step: 0.05 })
  if (inp.support === 'braced' && levels.length > 1)
    handles.push({ key: 'supportSpacing', label: 'ระยะจุดค้ำยัน', position: [-Lx / 2 - 0.25, levels[1], zOut], axis: [0, 1, 0], value: levels[0] - levels[1], min: 0.15, max: 2, step: 0.05 })
  const wl = d.layout.waleLevels
  if (inp.support === 'tied' && wl.length > 1)
    handles.push({ key: 'waleSpacing', label: 'ระยะคานรับเคร่า', position: [-Lx / 2 - 0.3, wl[1], zOut + 0.1], axis: [0, 1, 0], value: wl[1] - wl[0], min: 0.2, max: 3, step: 0.05 })
  return { parts, handles, bounds: bounds(parts) }
}

export function applyFootingHandle(inp: FootingInput, key: HandleKey, value: number): FootingInput {
  const cmv = Math.round(snap(value, 0.05) * 100)
  switch (key) {
    case 'height':
      return { ...inp, height: round3(snap(value, 0.05)) }
    case 'lengthX':
      return { ...inp, lengthX: round3(snap(value * 2, 0.05)) }
    case 'lengthY':
      return { ...inp, lengthY: round3(snap(value * 2, 0.05)) }
    case 'studSpacing':
      return { ...inp, stud: { ...inp.stud, spacingCm: cmv } }
    case 'supportSpacing':
      return { ...inp, brace: { ...inp.brace, spacingCm: cmv } }
    case 'waleSpacing':
      return { ...inp, wale: { ...inp.wale, spacingCm: cmv } }
    default:
      return inp
  }
}
