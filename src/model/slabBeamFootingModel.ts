// Geometric models for slab, beam and footing forms (metres; x right, y up, z towards the viewer).
// Same part/handle conventions as `formModel.ts`; used by the 3D designer and the report drawings.
import {
  type BeamDesign,
  beamBracing,
  beamCrossJoist,
  beamRunnerSection,
  beamStringer,
  braceBays,
  braceSets,
  type BeamInput,
  deckThicknessM,
  type FootingDesign,
  type FootingInput,
  type FootingShape,
  footingShapeOf,
  getMaterial,
  getSection,
  isLegShape,
  legBox,
  legLayout,
  legOutline,
  legTies,
  coreTies,
  type MaterialKind,
  polygonBox,
  polygonDims,
  type ShoreParams,
  type SlabDesign,
  type SlabInput,
  spread,
  shoreSectionId,
  DEFAULT_RINGLOCK,
  ringlockStack,
} from '@/engine'
import { bounds, cm, type FormModel, type Handle, type HandleKey, pairOffsets, type Part, tiePlate, regularPlan, round3, roundPlan, sheets, snap, type Vec3, yawFacing } from './formModel'

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

/** Member a U-head cradles: its width across `axis` (the side plates stand on either side) and depth. */
interface Cradle {
  axis: 'x' | 'z'
  width: number
  depth: number
}

/** Width of `count` members of width `w` laid side by side (see `pairOffsets`). */
const pairWidth = (count: number, w: number) => {
  const o = pairOffsets(count, w)
  return o[o.length - 1] - o[0] + w
}

const STEM = 0.034 // screw jack stem Ø, m
const JACK = 0.2 // screw jack length (base and head), m
const PLATE = 0.006 // jack / U-head plate thickness, m

/**
 * One shore (post or rated prop) from the floor to `top`, with an optional base plate. Steel shores (rated props
 * and pipe posts) stand on a screw jack base and carry the member above in a U-head (ก้ามปู) with side plates.
 */
function shorePart(parts: Part[], s: ShoreParams, id: string, x: number, z: number, top: number, cradle?: Cradle) {
  const base = s.baseCm > 0 ? 0.02 : 0
  if (base) parts.push({ id: `${id}-base`, group: 'shore', kind: 'timber', shape: 'box', center: [x, base / 2, z], size: [cm(s.baseCm), base, cm(s.baseCm)] })
  const sid = shoreSectionId(s)
  const sec = sid ? getSection(sid) : undefined
  if (!sec || sec.shape === 'pipe') {
    const dia = sec ? cm(sec.B) : 0.0486
    const nut = (nid: string, y: number) => parts.push({ id: nid, group: 'shore', kind: 'steel', shape: 'box', center: [x, y, z], size: [dia + 0.04, 0.03, dia + 0.04] })
    // jack base: plate, screw stem into the tube, adjusting nut under the tube
    const y0 = base + PLATE
    const y1 = y0 + JACK
    parts.push({ id: `${id}-jack`, group: 'shore', kind: 'steel', shape: 'box', center: [x, base + PLATE / 2, z], size: [0.15, PLATE, 0.15] })
    parts.push({ id: `${id}-jack-s`, group: 'shore', kind: 'steel', shape: 'bar', from: [x, y0, z], to: [x, y1, z], b: STEM, d: STEM, round: true })
    nut(`${id}-jack-n`, y1 - 0.115)
    // U-head: plate under the member, side plates either side of it, screw stem down into the tube
    const w = cradle ? cradle.width + 0.008 : 0.12
    const y2 = top - PLATE - JACK
    const along: Vec3 = cradle?.axis === 'x' ? [w + 2 * PLATE, PLATE, 0.12] : [0.12, PLATE, w + 2 * PLATE]
    parts.push({ id: `${id}-head`, group: 'shore', kind: 'steel', shape: 'box', center: [x, top - PLATE / 2, z], size: along })
    if (cradle) {
      const hArm = Math.min(cradle.depth * 0.8, 0.1)
      for (const [k, sg] of [['a', -1], ['b', 1]] as const) {
        const o = sg * (w / 2 + PLATE / 2)
        parts.push({
          id: `${id}-head-${k}`,
          group: 'shore',
          kind: 'steel',
          shape: 'box',
          center: cradle.axis === 'x' ? [x + o, top + hArm / 2, z] : [x, top + hArm / 2, z + o],
          size: cradle.axis === 'x' ? [PLATE, hArm, 0.12] : [0.12, hArm, PLATE],
        })
      }
    }
    parts.push({ id: `${id}-head-s`, group: 'shore', kind: 'steel', shape: 'bar', from: [x, y2, z], to: [x, top - PLATE, z], b: STEM, d: STEM, round: true })
    nut(`${id}-head-n`, y2 + 0.115)
    parts.push({ id, group: 'shore', kind: 'steel', shape: 'bar', from: [x, y1 - 0.1, z], to: [x, Math.max(y2 + 0.1, y1), z], b: dia, d: dia, round: true })
    return
  }
  const round = sec.shape === 'round'
  const kind = kindOf(s.materialId)
  if (round) parts.push({ id, group: 'shore', kind, shape: 'bar', from: [x, base, z], to: [x, top, z], b: cm(sec.B), d: cm(sec.B), round: true })
  else parts.push({ id, group: 'shore', kind, shape: 'box', center: [x, (base + top) / 2, z], size: [cm(sec.B), top - base, cm(sec.H)] })
}

/** Ringlock ledger / diagonal tube, m */
const RL_TUBE = 0.0483

/**
 * Ringlock members over a grid of standards (xs × zs, floor to `top`): ledgers between neighbouring standards both
 * ways at every ledger level, and vertical diagonals in every lift of the braced bays of the outer lines (both end
 * bays, no more than 3 bays apart).
 */
function ringlockFrame(parts: Part[], s: ShoreParams, xs: number[], zs: number[], top: number) {
  if (s.kind !== 'ringlock') return
  const st = ringlockStack(top, (s.ringlock ?? DEFAULT_RINGLOCK).liftM)
  const bar = (id: string, from: Vec3, to: Vec3) => parts.push({ id, group: 'shore', kind: 'steel', shape: 'bar', from, to, b: RL_TUBE, d: RL_TUBE, round: true })
  st.ledgers.forEach((y, k) => {
    zs.forEach((z, r) => xs.slice(1).forEach((x, i) => bar(`rl-ledger-x${r}-${i}-${k}`, [xs[i], y, z], [x, y, z])))
    xs.forEach((x, c) => zs.slice(1).forEach((z, i) => bar(`rl-ledger-z${c}-${i}-${k}`, [x, y, zs[i]], [x, y, z])))
  })
  const diagonals = (line: string, pts: number[], at: (u: number, y: number) => Vec3) =>
    braceSets(pts.length - 1, 1).forEach((i) =>
      st.ledgers.slice(1).forEach((y, k) => {
        const y0 = st.ledgers[k]
        const up = k % 2 === 0
        bar(`rl-diag-${line}-${i}-${k}`, at(pts[i], up ? y0 : y), at(pts[i + 1], up ? y : y0))
      }),
    )
  if (xs.length > 1) [...new Set([0, zs.length - 1])].forEach((r) => diagonals(`x${r}`, xs, (x, y) => [x, y, zs[r]]))
  if (zs.length > 1) [...new Set([0, xs.length - 1])].forEach((c) => diagonals(`z${c}`, zs, (z, y) => [xs[c], y, z]))
}

const shoreWidth = (s: ShoreParams) => {
  const sid = shoreSectionId(s)
  return sid ? cm(getSection(sid).H) : 0.0486
}

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
  const stringerCradle: Cradle = { axis: 'z', width: pairWidth(inp.stringer.count, sb), depth: sh }
  stringerY.forEach((z, i) => shoreX.forEach((x, j) => shorePart(parts, inp.shore, `shore-${i}-${j}`, x, z, shoreTop, stringerCradle)))
  ringlockFrame(parts, inp.shore, shoreX, stringerY, shoreTop)

  // lateral bracing: an X in the end bays of every row, both directions (Ringlock: its own diagonals)
  if (inp.bracing.enabled && inp.shore.kind !== 'ringlock' && shoreX.length > 1 && stringerY.length > 0) {
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
  const { bottomZ, crossJoistX } = d.layout
  const runner = beamRunnerSection(inp)
  const bw = bottomZ.length ? cm(runner.B) : 0
  const bd = bottomZ.length ? cm(runner.H) : 0
  const cj = getSection(beamCrossJoist(inp).sectionId)
  const jd = crossJoistX.length ? cm(cj.H) : 0
  const he = getSection(inp.head.sectionId)
  const hb = cm(he.B)
  const hd = cm(he.H)
  const yHeadTop = Y - tSh - jd - bd
  const yHeadBot = yHeadTop - hd
  const sgL = d.layout.stringer
  const double = !sgL && inp.shore.layout === 'double'
  const zFace = b / 2 + tSh + sd
  const headLen = Math.max(2 * zFace + 0.5, double || sgL ? inp.shore.postSpacingM + 0.3 : 0)
  const { studX, headX, sideOuter, sideInner, tieLevels } = d.layout
  // deep beam with horizontal studs on vertical wales (strongbacks)
  const hz = d.layout.system === 'horizontal'

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
    if (hz && hs > 0.01)
      spread(hs, d.layout.studSpacing / 100).forEach((lv, i) => {
        const yc = Y + Math.min(Math.max(lv, sb / 2), hs - sb / 2)
        parts.push({ id: `stud${s}-${i}`, group: 'stud', kind: kindOf(inp.stud.materialId), shape: 'box', center: [L / 2, yc, s * (b / 2 + tSh + sd / 2)], size: [L, sb, sd] })
      })
  }
  // runners along the beam (as designed), and the cross joists between them and the bottom sheathing ('across')
  bottomZ.forEach((z, k) => parts.push({ id: `stiff-${k}`, group: 'bottom', kind: kindOf(inp.bottom.materialId), shape: 'box', center: [L / 2, yHeadTop + bd / 2, z], size: [L, bd, bw] }))
  crossJoistX.forEach((x, k) => {
    const xc = Math.min(Math.max(x, cm(cj.B) / 2), L - cm(cj.B) / 2)
    parts.push({ id: `cjoist-${k}`, group: 'joist', kind: kindOf(beamCrossJoist(inp).materialId), shape: 'box', center: [xc, Y - tSh - jd / 2, 0], size: [cm(cj.B), jd, b + 2 * tSh] })
  })
  const posts = double ? [-inp.shore.postSpacingM / 2, inp.shore.postSpacingM / 2] : [0]
  headX.forEach((x, i) => {
    pairOffsets(inp.head.count, hb).forEach((o, k) =>
      parts.push({ id: `head-${i}-${k}`, group: 'head', kind: kindOf(inp.head.materialId), shape: 'box', center: [x + o, yHeadTop - hd / 2, 0], size: [hb, hd, headLen] }),
    )
    if (sgL) return
    posts.forEach((z, k) => shorePart(parts, inp.shore, `shore-${i}-${k}`, x, z, yHeadBot, { axis: 'x', width: pairWidth(inp.head.count, hb), depth: hd }))
    if (!double && inp.shore.kind === 'post') {
      // knee braces of the T-head (ตุ๊กตา)
      const kb = 0.03
      for (const s of [1, -1]) parts.push({ id: `knee-${i}${s}`, group: 'shore', kind: 'timber', shape: 'bar', from: [x, yHeadBot - 0.45, s * 0.03], to: [x, yHeadBot, s * Math.min(headLen / 2 - 0.05, 0.45)], b: kb, d: 0.06 })
    } else if (double) {
      parts.push({ id: `xbr-${i}`, group: 'shore', kind: 'timber', shape: 'bar', from: [x + 0.04, 0.3, -inp.shore.postSpacingM / 2], to: [x + 0.04, yHeadBot - 0.1, inp.shore.postSpacingM / 2], b: 0.025, d: 0.075 })
    }
  })

  if (!sgL) ringlockFrame(parts, inp.shore, headX, posts, yHeadBot)

  // lateral bracing of every post row along the beam: an X in the end bays (as designed), on the outer face of the
  // posts; horizontal runners at the shore brace levels on the inner face (Ringlock: its own ledgers and diagonals)
  const bracing = beamBracing(inp)
  const rl = inp.shore.kind === 'ringlock'
  const levels = inp.shore.kind === 'post' ? inp.shore.braceLevels : 0
  if (sgL) {
    // stringer system: stringer rows under the heads on U-heads and shores at their own spacing; ledgers both ways at
    // the designed levels (inner faces), X-bracing along every row (outer faces) and across at the braced post lines
    const sg = beamStringer(inp)
    const ss = getSection(sg.sectionId)
    const gb = cm(ss.B)
    const gd = cm(ss.H)
    const top = yHeadBot - gd
    const { z: rowZ, shoreX, ledgerY, braceSets: sets, braceBays: k, acrossLines } = sgL
    rowZ.forEach((z, r) =>
      pairOffsets(sg.count, gb).forEach((o, c) => parts.push({ id: `stringer-${r}-${c}`, group: 'stringer', kind: kindOf(sg.materialId), shape: 'box', center: [L / 2, yHeadBot - gd / 2, z + o], size: [L, gd, gb] })),
    )
    rowZ.forEach((z, r) => shoreX.forEach((x, j) => shorePart(parts, inp.shore, `shore-${r}-${j}`, x, z, top, { axis: 'z', width: pairWidth(sg.count, gb), depth: gd })))
    ringlockFrame(parts, inp.shore, shoreX, rowZ, top)
    const br = getSection(bracing.sectionId)
    const bk = br.shape === 'pipe' ? 'steel' : kindOf(bracing.materialId)
    const bw = cm(br.B)
    const off = shoreWidth(inp.shore) / 2 + bw / 2
    const bar = (id: string, from: Vec3, to: Vec3) => parts.push({ id, group: 'bracing', kind: bk, shape: 'bar', from, to, b: bw, d: cm(br.H), round: br.shape === 'pipe' })
    const x0 = shoreX[0]
    const x1 = shoreX[shoreX.length - 1]
    const zLo = rowZ[0]
    const zHi = rowZ[rowZ.length - 1]
    // ledgers at the designed lifts over the posts as drawn (floor → U-head), also when a shore length is entered
    ledgerY.forEach((_, n) => {
      const y = ((n + 1) * top) / (ledgerY.length + 1)
      rowZ.forEach((z, r) => bar(`ledger-${r}-${n}`, [x0 - 0.05, y, z - (z < 0 ? -1 : 1) * off], [x1 + 0.05, y, z - (z < 0 ? -1 : 1) * off]))
      shoreX.forEach((x, j) => bar(`ledgerx-${j}-${n}`, [x + off, y + bw, zLo - 0.05], [x + off, y + bw, zHi + 0.05]))
    })
    if (bracing.enabled && !rl && shoreX.length > 1) {
      const y0 = 0.15
      const y1 = top - 0.1
      rowZ.forEach((z, r) => {
        const zz = z + (z < 0 ? -1 : 1) * off
        sets.forEach((j) => {
          bar(`brx-${r}-${j}a`, [shoreX[j], y0, zz], [shoreX[j + k], y1, zz])
          bar(`brx-${r}-${j}b`, [shoreX[j], y1, zz], [shoreX[j + k], y0, zz])
        })
      })
      acrossLines.forEach((j) => {
        const x = shoreX[j] + (j === shoreX.length - 1 ? off : -off)
        bar(`bry-${j}a`, [x, y0, zLo], [x, y1, zHi])
        bar(`bry-${j}b`, [x, y1, zLo], [x, y0, zHi])
      })
    }
  } else if ((bracing.enabled || levels) && !rl && headX.length > 1) {
    const br = getSection(bracing.sectionId)
    const bk = br.shape === 'pipe' ? 'steel' : kindOf(bracing.materialId)
    const bw = cm(br.B)
    const off = shoreWidth(inp.shore) / 2 + bw / 2
    const bar = (id: string, from: Vec3, to: Vec3) => parts.push({ id, group: 'bracing', kind: bk, shape: 'bar', from, to, b: bw, d: cm(br.H), round: br.shape === 'pipe' })
    const y0 = 0.15
    const y1 = yHeadBot - 0.1
    const k = Math.min(braceBays(d.layout.headSpacing / 100, d.layout.shoreLength), headX.length - 1)
    const sets = headX.length - 1 > 2 * k ? [0, headX.length - 1 - k] : [0]
    posts.forEach((z, r) => {
      const out = z < 0 ? -1 : 1
      if (bracing.enabled)
        sets.forEach((j) => {
          bar(`brx-${r}-${j}a`, [headX[j], y0, z + out * off], [headX[j + k], y1, z + out * off])
          bar(`brx-${r}-${j}b`, [headX[j], y1, z + out * off], [headX[j + k], y0, z + out * off])
        })
      for (let n = 1; n <= levels; n++) {
        const y = (yHeadBot * n) / (levels + 1)
        bar(`run-${r}-${n}`, [headX[0] - 0.05, y, z - out * off], [headX[headX.length - 1] + 0.05, y, z - out * off])
      }
    })
  }

  if (hz && tieLevels.length) {
    // strongbacks: a double member at every strongback position on each side, from the heads to the top of the side;
    // a tie at every one on every tie row, the bearing plate bridging the side-by-side pair
    const wsec = getSection(inp.tie.waleSectionId)
    const wb = cm(wsec.B)
    const wd = cm(wsec.H)
    const tp = tiePlate(2, wb)
    for (const [s, hs] of [
      [1, sideOuter],
      [-1, sideInner],
    ] as const) {
      if (hs <= 0.01) continue
      const top = Y + hs
      d.layout.waleX.forEach((x, j) =>
        pairOffsets(2, wb).forEach((o, k) =>
          parts.push({ id: `wale${s}-${j}-${k}`, group: 'wale', kind: kindOf(inp.tie.waleMaterialId), shape: 'box', center: [x + o, (yHeadTop + top) / 2, s * (zFace + wd / 2)], size: [wb, top - yHeadTop, wd] }),
        ),
      )
    }
    tieLevels.forEach((lv, i) => {
      const y = Y + lv
      d.layout.waleX.forEach((x, j) => {
        parts.push({ id: `tie-${i}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: [x, y, -(zFace + wd + 0.06)], to: [x, y, zFace + wd + 0.06], b: 0.012, d: 0.012, round: true })
        for (const s of [1, -1]) parts.push({ id: `tieplate${s}-${i}-${j}`, group: 'tie', kind: 'steel', shape: 'box', center: [x, y, s * (zFace + wd + tp.t / 2)], size: [tp.across, tp.along, tp.t] })
      })
    })
  } else if (tieLevels.length) {
    const wsec = getSection(inp.tie.waleSectionId)
    const wb = cm(wsec.B)
    const wd = cm(wsec.H)
    const tp = tiePlate(2, wb)
    tieLevels.forEach((lv, i) => {
      const y = Y + lv
      for (const s of [1, -1])
        pairOffsets(2, wb).forEach((o, k) =>
          parts.push({ id: `wale${s}-${i}-${k}`, group: 'wale', kind: kindOf(inp.tie.waleMaterialId), shape: 'box', center: [L / 2, y + o, s * (zFace + wd / 2)], size: [L, wb, wd] }),
        )
      headX.forEach((x, j) => {
        parts.push({ id: `tie-${i}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: [x, y, -(zFace + wd + 0.06)], to: [x, y, zFace + wd + 0.06], b: 0.012, d: 0.012, round: true })
        for (const s of [1, -1]) parts.push({ id: `tieplate${s}-${i}-${j}`, group: 'tie', kind: 'steel', shape: 'box', center: [x, y, s * (zFace + wd + tp.t / 2)], size: [tp.along, tp.across, tp.t] })
      })
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
  if (sgL && sgL.shoreX.length > 1)
    handles.push({ key: 'shoreSpacing', label: 'ระยะเสาค้ำ', position: [sgL.shoreX[1], yHeadBot * 0.6, sgL.z[sgL.z.length - 1] + 0.3], axis: [1, 0, 0], value: sgL.shoreX[1] - sgL.shoreX[0], min: 0.3, max: 3, step: 0.05 })
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
    case 'shoreSpacing':
      return { ...inp, stringer: { ...beamStringer(inp), spacingCm: cmv } }
    default:
      return inp
  }
}

// ---------------------------------------------------------------- footing

/**
 * Round, polygonal or L/T/U footing, centred on the origin: the side form face by face round its outline — plywood,
 * studs, stakes and braces at every stud (or along the wales), wales along the faces mitred at the corners, and an
 * L/T/U's ties through the legs at the inner corners. A round form is drawn in short straight panels.
 */
function shapedFootingModel(inp: FootingInput, d: FootingDesign, shape: Exclude<FootingShape, { kind: 'rect' }>): FormModel {
  const parts: Part[] = []
  const { lengthX: Lx, height: H } = inp
  const tSh = deckThicknessM(inp.sheathing)
  const shKind = inp.sheathing.type === 'plywood' ? 'plywood' : 'timber'
  const stud = getSection(inp.stud.sectionId)
  const sKind = kindOf(inp.stud.materialId)
  const sb = cm(stud.B)
  const sd = cm(stud.H)
  const a = d.layout.studSpacing / 100
  const embed = inp.stake.embedM
  const yStud0 = inp.support === 'cantilever' ? -embed : 0
  const round = shape.kind === 'circle'
  const [bx, bz] = isLegShape(shape) ? legBox(shape) : shape.kind === 'polygon' ? polygonBox(shape.n, Lx) : [Lx, Lx]
  const q: [number, number][] = isLegShape(shape)
    ? legOutline(shape).map(([x, z]) => [x - bx / 2, z - bz / 2])
    : shape.kind === 'polygon'
      ? regularPlan(shape.n, polygonDims(shape.n, Lx).R)
      : roundPlan(Math.max(24, Math.ceil((Math.PI * Lx) / 0.4)), Lx / 2)

  if (inp.leanM > 0) parts.push({ id: 'lean', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, -inp.leanM / 2, 0], size: [bx + 0.4, inp.leanM, bz + 0.4] })
  parts.push({ id: 'concrete', group: 'concrete', kind: 'concrete', shape: 'box', center: [0, H / 2, 0], size: [bx, H, bz], plan: q })

  const n = q.length
  const area2 = q.reduce((s, p, k) => s + p[0] * q[(k + 1) % n][1] - q[(k + 1) % n][0] * p[1], 0)
  const edges = q.map((p, k) => {
    const b = q[(k + 1) % n]
    const L = Math.hypot(b[0] - p[0], b[1] - p[1])
    const dir: [number, number] = [(b[0] - p[0]) / L, (b[1] - p[1]) / L]
    const nn: [number, number] = area2 > 0 ? [dir[1], -dir[0]] : [-dir[1], dir[0]]
    return { a: p, L, dir, n: nn, phi: Math.atan2(nn[1], nn[0]) }
  })
  // tan of half the turn at each corner: + convex, − re-entrant — an offset line is mitred by off·tan(θ/2)
  const tanHalf = edges.map((e, k) => {
    const p = edges[(k - 1 + n) % n].dir
    const turn = Math.atan2(p[0] * e.dir[1] - p[1] * e.dir[0], p[0] * e.dir[0] + p[1] * e.dir[1])
    return Math.tan(turn / 2) * Math.sign(area2)
  })
  const pt = (e: (typeof edges)[number], u: number, off: number): [number, number] => [e.a[0] + e.dir[0] * u + e.n[0] * off, e.a[1] + e.dir[1] * u + e.n[1] * off]
  /** box along edge k, `off` out from the face, mitred at both corners at that offset */
  const along = (id: string, group: Part['group'], kind: Part['kind'], k: number, off: number, y: number, h: number, t: number): Part => {
    const e = edges[k]
    const eA = off * tanHalf[k]
    const eB = off * tanHalf[(k + 1) % n]
    const c = pt(e, (e.L + eB - eA) / 2, off)
    return { id, group, kind, shape: 'box', center: [c[0], y, c[1]], size: [e.L + eA + eB, h, t], yaw: yawFacing(e.phi) }
  }

  const th = (inp.brace.angleDeg * Math.PI) / 180
  const br = getSection(inp.brace.sectionId)
  const stake = getSection(inp.stake.sectionId)
  const levels = d.layout.braceLevels
  const viaWale = inp.support === 'braced' && inp.brace.at === 'wale'
  const w = getSection(inp.wale.sectionId)
  const wb = cm(w.B)
  const wd = cm(w.H)
  const waleLevels = inp.support === 'tied' || viaWale ? d.layout.waleLevels : []
  const r0 = tSh + sd
  const at = (c: [number, number], y: number): Vec3 => [c[0], y, c[1]]
  /** stud, its toe stake and its braces at u along edge e */
  const studAt = (id: string, e: (typeof edges)[number], u: number) => {
    const c = pt(e, u, tSh + sd / 2)
    parts.push({ id: `stud-${id}`, group: 'stud', kind: sKind, shape: 'box', center: at(c, (yStud0 + H) / 2), size: [sb, H - yStud0, sd], yaw: yawFacing(e.phi) })
    if (inp.support === 'braced') parts.push({ id: `kick-${id}`, group: 'stake', kind: 'timber', shape: 'box', center: at(pt(e, u, r0 + cm(stake.H) / 2), (0.15 - embed) / 2), size: [cm(stake.B), 0.15 + embed, cm(stake.H)], yaw: yawFacing(e.phi) })
  }
  const bracesAt = (id: string, e: (typeof edges)[number], u: number) => {
    const rb = viaWale ? r0 + wd : r0
    levels.forEach((y, k) => {
      const run = y / Math.tan(th)
      parts.push({ id: `brace-${id}-${k}`, group: 'brace', kind: kindOf(inp.brace.materialId), shape: 'bar', from: at(pt(e, u, rb), y), to: at(pt(e, u, rb + run), 0), b: cm(br.B), d: cm(br.H) })
    })
    const run = (levels[0] ?? H) / Math.tan(th)
    parts.push({ id: `stake-${id}`, group: 'stake', kind: 'timber', shape: 'box', center: at(pt(e, u, rb + run + 0.05), (0.2 - embed) / 2), size: [cm(stake.B), 0.2 + embed, cm(stake.H)], yaw: yawFacing(e.phi) })
  }

  edges.forEach((_, k) => parts.push(along(`ply-${k}`, 'sheathing', shKind, k, tSh / 2, H / 2, H, tSh)))
  if (round) {
    // studs evenly round the circle, each on the panel it falls on
    const P = Math.PI * Lx
    const m = Math.ceil(P / a - 1e-9)
    for (let i = 0; i < m; i++) {
      const k = Math.min(n - 1, Math.floor((i / m) * n))
      const u = edges[k].L / 2
      studAt(`${i}`, edges[k], u)
      if (inp.support === 'braced') bracesAt(`${i}`, edges[k], u)
    }
  } else
    edges.forEach((e, k) => {
      // studs at both ends of every face (clear of the studs on the next face at an inner corner)
      const mA = tanHalf[k] > 0 ? sb / 2 : r0 + sb / 2
      const mB = tanHalf[(k + 1) % n] > 0 ? sb / 2 : r0 + sb / 2
      const avail = Math.max(e.L - mA - mB, 0)
      const us = spread(avail, a).map((u) => u + mA)
      us.forEach((u, i) => studAt(`${k}-${i}`, e, u))
      waleLevels.forEach((y, i) => pairOffsets(inp.wale.count, wb).forEach((o, j) => parts.push(along(`wale-${k}-${i}-${j}`, 'wale', kindOf(inp.wale.materialId), k, r0 + wd / 2, y + o, wb, wd))))
      if (inp.support === 'braced') {
        const ub = viaWale && d.layout.braceAlong ? spread(avail, d.layout.braceAlong / 100).map((u) => u + mA) : us
        ub.forEach((u, i) => bracesAt(`${k}-${i}`, e, u))
      }
    })

  if (inp.support === 'tied' && isLegShape(shape)) {
    // ties through every leg at the inner corner(s), along the legs and across the core; a bearing plate at both ends
    const tp = d.layout.tiePlate
    const reach = tSh + sd + wd + 0.06
    const nSp = d.layout.legSpans ?? 1
    const lay = legLayout(shape)
    const runs = [
      ...lay.legs.flatMap((g) => legTies(g, nSp, Math.min(r0 + wd, g.L / 3)).map((u) => ({ o: g.o, dir: g.dir, across: g.across, len: g.t, u }))),
      ...[...lay.core, ...lay.ends].flatMap((k) => coreTies(k, nSp).map((u) => ({ o: k.o, dir: k.dir, across: k.across, len: k.len, u }))),
    ]
    runs.forEach((g, ti) => {
      const p0: [number, number] = [g.o[0] - bx / 2 + g.dir[0] * g.u, g.o[1] - bz / 2 + g.dir[1] * g.u]
      const ends: [number, number][] = [
        [p0[0] - g.across[0] * reach, p0[1] - g.across[1] * reach],
        [p0[0] + g.across[0] * (g.len + reach), p0[1] + g.across[1] * (g.len + reach)],
      ]
      d.layout.waleLevels.forEach((y, i) => {
        parts.push({ id: `tie-${i}-${ti}`, group: 'tie', kind: 'tie', shape: 'bar', from: at(ends[0], y), to: at(ends[1], y), b: 0.014, d: 0.014, round: true })
        if (tp)
          ends.forEach((c, s) => {
            const back = s ? -0.06 + tp.tMm / 2000 : 0.06 - tp.tMm / 2000
            parts.push({ id: `tieplate-${i}-${ti}-${s ? 'b' : 'a'}`, group: 'tie', kind: 'steel', shape: 'box', center: at([c[0] + g.across[0] * back, c[1] + g.across[1] * back], y), size: [tp.wCm / 100, tp.hCm / 100, tp.tMm / 1000], yaw: yawFacing(Math.atan2(g.across[1], g.across[0])) })
          })
      })
    })
  }

  const handles: Handle[] = [{ key: 'height', label: 'ความลึกฐาน H', position: [0, H + 0.2, 0], axis: [0, 1, 0], value: H, min: 0.2, max: 6, step: 0.05 }]
  // one size to drag on a round / polygonal footing; an L/T/U is sized in the form
  if (!isLegShape(shape)) handles.push({ key: 'lengthX', label: round ? 'เส้นผ่านศูนย์กลาง D' : 'ระยะข้ามด้านแบน F', position: [bx / 2, H + 0.05, 0], axis: [1, 0, 0], value: Lx / 2, min: 0.25, max: 15, step: 0.025 })
  return { parts, handles, bounds: bounds(parts) }
}

/** Footing centred on the origin, base at y = 0 on lean concrete. */
export function footingModel(inp: FootingInput, d: FootingDesign): FormModel {
  const shape = footingShapeOf(inp)
  if (shape.kind !== 'rect') return shapedFootingModel(inp, d, shape)
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
  // tied with horizontal studs: stud rows round every face (the faces along x run past the corners), vertical wales
  // (strongbacks) at their positions along each face, ties through the footing at every strongback both ways
  const hz = d.layout.system === 'horizontal'
  const longIsX = Lx >= Ly
  const waleXOf = (fi: number) => ((fi < 2) === longIsX ? d.layout.waleXLong : d.layout.waleXShort) ?? []
  faces.forEach((f, fi) => {
    parts.push({ id: `ply-${fi}`, group: 'sheathing', kind: shKind, shape: 'box', ...box(f, 0, f.off + tSh / 2, H / 2, 2 * f.half, H, tSh) })
    if (hz) {
      const rStud = f.off + tSh + sd / 2
      const r0 = f.off + tSh + sd
      const len = 2 * f.half + (fi < 2 ? 2 * sd : 0)
      ;(d.layout.studLevels ?? []).forEach((y, i) => {
        const yc = Math.min(Math.max(y, sb / 2), H - sb / 2)
        parts.push({ id: `stud-${fi}-${i}`, group: 'stud', kind: sKind, shape: 'box', ...box(f, 0, rStud, yc, len, sb, sd) })
      })
      const span = fi < 2 ? Lx : Ly
      waleXOf(fi).forEach((x, i) =>
        pairOffsets(inp.wale.count, wb).forEach((o, k) =>
          parts.push({ id: `wale-${fi}-${i}-${k}`, group: 'wale', kind: kindOf(inp.wale.materialId), shape: 'box', ...box(f, x - span / 2 + o, r0 + wd / 2, H / 2, wb, H, wd) }),
        ),
      )
      return
    }
    const us = spread(2 * f.half - sb, a).map((u) => u - f.half + sb / 2)
    const rStud = f.off + tSh + sd / 2
    const r0 = f.off + tSh + sd
    us.forEach((u, i) => {
      parts.push({ id: `stud-${fi}-${i}`, group: 'stud', kind: sKind, shape: 'box', ...box(f, u, rStud, (yStud0 + H) / 2, sb, H - yStud0, sd) })
      if (inp.support === 'braced') parts.push({ id: `kick-${fi}-${i}`, group: 'stake', kind: 'timber', shape: 'box', ...box(f, u, r0 + cm(stake.H) / 2, (0.15 - embed) / 2, cm(stake.B), 0.15 + embed, cm(stake.H)) })
    })
    // wales round the footing: the long-side wales run past the corners; the short-side wales either
    // run full length one set higher/lower (cross) or are cut to butt against them (butt, Fig 8.11)
    const span = fi < 2 ? Lx : Ly
    const through = fi < 2 ? Lx >= Ly : Ly > Lx
    const cross = d.layout.waleCorner !== 'butt'
    const waleLen = through || cross ? span + 2 * (tSh + sd + wd + 0.1) : span + 2 * (tSh + sd)
    const dy = through ? 0 : (d.layout.waleShift ?? 0)
    waleLevels.forEach((y, i) =>
      pairOffsets(inp.wale.count, wb).forEach((o, k) =>
        parts.push({ id: `wale-${fi}-${i}-${k}`, group: 'wale', kind: kindOf(inp.wale.materialId), shape: 'box', ...box(f, 0, r0 + wd / 2, y + dy + o, waleLen, wb, wd) }),
      ),
    )
    if (inp.support === 'braced') {
      // braces at every stud, or along the wales at the brace spacing
      const along = d.layout.braceAlong
      const ub = viaWale && along ? spread(2 * f.half - sb, along / 100).map((u) => u - f.half + sb / 2) : us
      const rb = viaWale ? r0 + wd : r0
      ub.forEach((u, i) => {
        levels.forEach((y0, k) => {
          const y = viaWale ? y0 + dy : y0
          const run = y / Math.tan(th)
          parts.push({ id: `brace-${fi}-${i}-${k}`, group: 'brace', kind: kindOf(inp.brace.materialId), shape: 'bar', from: at(f, u, rb, y), to: at(f, u, rb + run, 0), b: cm(br.B), d: cm(br.H) })
        })
        const run = (levels[0] ?? H) / Math.tan(th)
        parts.push({ id: `stake-${fi}-${i}`, group: 'stake', kind: 'timber', shape: 'box', ...box(f, u, rb + run + 0.05, (0.2 - embed) / 2, cm(stake.B), 0.2 + embed, cm(stake.H)) })
      })
    }
  })
  if (hz) {
    // a tie at every strongback, through the footing: across y from the faces along x, across x from the others (a bar's
    // width higher so the two directions pass); the bearing plate bridges the side-by-side pair, along the strongback
    const reach = (half: number) => half + tSh + sd + wd + 0.06
    const tp = d.layout.tiePlate
    const plate = tp && { w: tp.wCm / 100, h: tp.hCm / 100, t: tp.tMm / 1000 }
    const runs = [
      { u: waleXOf(0).map((x) => x - Lx / 2), alongX: true, r: reach(Ly / 2), dy: 0 },
      { u: waleXOf(2).map((x) => x - Ly / 2), alongX: false, r: reach(Lx / 2), dy: 0.03 },
    ]
    ;(d.layout.tieLevels ?? []).forEach((y, i) =>
      runs.forEach((g, gi) =>
        g.u.forEach((u, j) => {
          parts.push({ id: `tie-${i}-${gi}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: g.alongX ? [u, y + g.dy, -g.r] : [-g.r, y + g.dy, u], to: g.alongX ? [u, y + g.dy, g.r] : [g.r, y + g.dy, u], b: 0.014, d: 0.014, round: true })
          if (plate)
            for (const sgn of [-1, 1]) {
              const r = sgn * (g.r - 0.06 + plate.t / 2)
              parts.push({ id: `tieplate-${i}-${gi}-${j}-${sgn > 0 ? 'b' : 'a'}`, group: 'tie', kind: 'steel', shape: 'box', center: g.alongX ? [u, y + g.dy, r] : [r, y + g.dy, u], size: g.alongX ? [plate.h, plate.w, plate.t] : [plate.t, plate.w, plate.h] })
            }
        }),
      ),
    )
  } else if (inp.support === 'tied' && d.layout.tieLayout && d.layout.tieLayout !== 'none') {
    // ties through the long faces (across the short side), and through the short faces when both ways;
    // interior points only, spread evenly — the second direction sits a bar's width higher
    const long = Math.max(Lx, Ly)
    const short = Math.min(Lx, Ly)
    const longIsX = Lx >= Ly
    const reach = (half: number) => half + tSh + sd + wd + 0.06
    const evenly = (L: number, n: number) => Array.from({ length: n }, (_, j) => -L / 2 + ((j + 1) * L) / (n + 1))
    const runs: { u: number[]; alongX: boolean; r: number; dy: number }[] = [{ u: evenly(long, d.layout.tiesLong ?? 0), alongX: longIsX, r: reach(short / 2), dy: 0 }]
    // ties through the short faces pass between the short-side wales: at their offset when crossed
    const shortDy = d.layout.waleCorner !== 'butt' && d.layout.waleShift ? d.layout.waleShift : 0.03
    if (d.layout.tieLayout === 'both') runs.push({ u: evenly(short, d.layout.tiesShort ?? 0), alongX: !longIsX, r: reach(long / 2), dy: shortDy })
    const tp = d.layout.tiePlate
    const plate = tp && { w: tp.wCm / 100, h: tp.hCm / 100, t: tp.tMm / 1000 }
    d.layout.waleLevels.forEach((y, i) =>
      runs.forEach((g, gi) =>
        g.u.forEach((u, j) => {
          parts.push({ id: `tie-${i}-${gi}-${j}`, group: 'tie', kind: 'tie', shape: 'bar', from: g.alongX ? [u, y + g.dy, -g.r] : [-g.r, y + g.dy, u], to: g.alongX ? [u, y + g.dy, g.r] : [g.r, y + g.dy, u], b: 0.014, d: 0.014, round: true })
          // steel bearing plate (เหล็กประกับ) across the wale set at both ends
          if (plate)
            for (const sgn of [-1, 1]) {
              const r = sgn * (g.r - 0.06 + plate.t / 2)
              parts.push({ id: `tieplate-${i}-${gi}-${j}-${sgn > 0 ? 'b' : 'a'}`, group: 'tie', kind: 'steel', shape: 'box', center: g.alongX ? [u, y + g.dy, r] : [r, y + g.dy, u], size: g.alongX ? [plate.w, plate.h, plate.t] : [plate.t, plate.h, plate.w] })
            }
        }),
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
  if (us0.length > 1 && !hz) handles.push({ key: 'studSpacing', label: 'ระยะเคร่า', position: [us0[1] - Lx / 2 - tSh + sb / 2, H + 0.08, zOut], axis: [1, 0, 0], value: us0[1] - us0[0], min: 0.1, max: 1, step: 0.05 })
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
    case 'lengthX': {
      // round / polygonal: one size; an L/T/U keeps its sizes in the shape
      const k = footingShapeOf(inp).kind
      const v = round3(snap(value * 2, 0.05))
      return k === 'rect' ? { ...inp, lengthX: v } : k === 'circle' || k === 'polygon' ? { ...inp, lengthX: v, lengthY: v } : inp
    }
    case 'lengthY':
      return footingShapeOf(inp).kind === 'rect' ? { ...inp, lengthY: round3(snap(value * 2, 0.05)) } : inp
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
