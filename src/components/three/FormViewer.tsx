// Interactive 3D view of a formwork model: orbit / zoom / pan, click a part to select its group,
// drag the orange handles to change dimensions and spacings.
import { Edges, GizmoHelper, GizmoViewport, Grid, Html, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber'
import clsx from 'clsx'
import { Box, Camera, Eye, Layers, Maximize2, Minimize2, Palette, Scan } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
/** the part of drei's OrbitControls we touch */
type OrbitControlsImpl = { enabled: boolean; target: THREE.Vector3; update: () => void }
import type { Status } from '@/engine'
import { type BarPart, type BoxPart, type FormModel, GROUP_LABEL, type Handle, type HandleKey, type Part, type PartGroup, type Vec3 } from '@/model/formModel'

export type ColorMode = 'material' | 'status'
type View = 'iso' | 'front' | 'side' | 'top'

const KIND_COLOR: Record<string, string> = {
  concrete: '#9aa4b1',
  plywood: '#c98a45',
  timber: '#e6c38d',
  steel: '#8193ab',
  tie: '#2b2f36',
}
const STATUS_COLOR: Record<Status | 'none', string> = { ok: '#22a05a', warn: '#e09412', fail: '#dc3b3b', none: '#a8b0bb' }
const SEL = new THREE.Color('#2563eb')

const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12)
const UP = new THREE.Vector3(0, 1, 0)

function barTransform(p: BarPart) {
  const a = new THREE.Vector3(...p.from)
  const b = new THREE.Vector3(...p.to)
  const dir = b.clone().sub(a)
  const len = dir.length()
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())
  return { position: a.add(b).multiplyScalar(0.5), quaternion: q, scale: new THREE.Vector3(p.b, len, p.d) }
}

/** Prism of a box part with a plan outline (round / polygonal concrete), extruded from its base up. */
function PlanMesh({ part, material, edges, ...ev }: { part: BoxPart; material: THREE.Material; edges: boolean } & Record<string, unknown>) {
  const geo = useMemo(() => {
    // shape in (x, −z), extruded along +z, then turned so the extrusion runs up +y
    const s = new THREE.Shape(part.plan!.map(([x, z]) => new THREE.Vector2(x, -z)))
    const g = new THREE.ExtrudeGeometry(s, { depth: part.size[1], bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }, [part])
  useEffect(() => () => geo.dispose(), [geo])
  const [cx, cy, cz] = part.center
  return (
    <mesh geometry={geo} material={material} position={[cx, cy - part.size[1] / 2, cz]} rotation={[0, part.yaw ?? 0, 0]} receiveShadow {...ev}>
      {edges && <Edges color="#00000033" threshold={20} />}
    </mesh>
  )
}

interface Props {
  model: FormModel
  /** status per part group (from the design result) */
  status: Partial<Record<PartGroup, Status>>
  selected?: PartGroup
  onSelect: (g: PartGroup | undefined) => void
  onHandle: (key: HandleKey, value: number) => void
  /** formatted value shown while dragging a handle */
  formatHandle: (h: Handle, value: number) => string
  /** overlay (inspector) rendered over the canvas */
  children?: ReactNode
  groups: PartGroup[]
}

export function FormViewer({ model, status, selected, onSelect, onHandle, formatHandle, children, groups }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<ColorMode>('material')
  const [hidden, setHidden] = useState<Set<PartGroup>>(new Set())
  const [view, setView] = useState<{ v: View; n: number }>({ v: 'iso', n: 0 })
  const [hover, setHover] = useState<PartGroup>()
  const [layersOpen, setLayersOpen] = useState(false)
  const [full, setFull] = useState(false)
  const [showHandles, setShowHandles] = useState(true)

  useEffect(() => {
    const h = () => setFull(document.fullscreenElement === wrap.current)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const toggle = (g: PartGroup) =>
    setHidden((s) => {
      const n = new Set(s)
      if (n.has(g)) n.delete(g)
      else n.add(g)
      return n
    })

  const snapshot = () => {
    const c = wrap.current?.querySelector('canvas')
    if (!c) return
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = 'formwork-3d.png'
    a.click()
  }

  return (
    <div ref={wrap} className={clsx('relative overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200', full ? 'h-dvh' : 'h-[min(72dvh,640px)] min-h-[420px] rounded-xl border border-line')}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 35, near: 0.05, far: 500 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onPointerMissed={() => onSelect(undefined)}
        aria-label="โมเดล 3 มิติของแบบหล่อ"
      >
        <hemisphereLight args={['#ffffff', '#c7ccd4', 1.4]} />
        <directionalLight position={[8, 14, 10]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} />
        <directionalLight position={[-6, 5, -8]} intensity={0.5} />
        <Parts model={model} status={status} mode={mode} hidden={hidden} selected={selected} hover={hover} setHover={setHover} onSelect={onSelect} />
        {showHandles && model.handles.map((h) => <DragHandle key={h.key} h={h} onChange={onHandle} format={formatHandle} />)}
        <Grid position={[0, -0.001, 0]} args={[10, 10]} cellSize={0.1} cellThickness={0.5} cellColor="#b9c1cc" sectionSize={1} sectionThickness={1} sectionColor="#8f9aa8" fadeDistance={40} fadeStrength={1.5} infiniteGrid />
        <CameraRig model={model} view={view} />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#dc3b3b', '#22a05a', '#2563eb']} labelColor="white" />
        </GizmoHelper>
      </Canvas>

      {/* toolbar */}
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        <div className="flex rounded-lg border border-line bg-white/95 p-0.5 shadow-sm" role="group" aria-label="มุมมอง">
          {(
            [
              ['iso', '3D'],
              ['front', 'หน้า'],
              ['side', 'ข้าง'],
              ['top', 'บน'],
            ] as [View, string][]
          ).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setView((s) => ({ v, n: s.n + 1 }))} className={clsx('rounded-md px-2.5 py-1 text-xs font-medium', view.v === v ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
              {l}
            </button>
          ))}
        </div>
        <ToolButton label={mode === 'status' ? 'สีตามวัสดุ' : 'สีตามผลตรวจสอบ'} active={mode === 'status'} onClick={() => setMode(mode === 'status' ? 'material' : 'status')}>
          <Palette size={15} />
        </ToolButton>
        <div className="relative">
          <ToolButton label="ชั้นการแสดงผล" active={layersOpen} onClick={() => setLayersOpen(!layersOpen)}>
            <Layers size={15} />
          </ToolButton>
          {layersOpen && (
            <div className="absolute left-0 top-10 z-10 w-52 rounded-lg border border-line bg-white p-2 shadow-lg">
              {groups.map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={!hidden.has(g)} onChange={() => toggle(g)} className="accent-sel" />
                  {GROUP_LABEL[g]}
                </label>
              ))}
            </div>
          )}
        </div>
        <ToolButton label={showHandles ? 'ซ่อนจุดลากแก้ไข' : 'แสดงจุดลากแก้ไข'} active={showHandles} onClick={() => setShowHandles(!showHandles)}>
          <Scan size={15} />
        </ToolButton>
        <ToolButton label="บันทึกภาพ PNG" onClick={snapshot}>
          <Camera size={15} />
        </ToolButton>
        <ToolButton label={full ? 'ออกจากเต็มจอ' : 'เต็มจอ'} onClick={() => (full ? document.exitFullscreen() : wrap.current?.requestFullscreen())}>
          {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </ToolButton>
      </div>

      {mode === 'status' && (
        <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg border border-line bg-white/95 px-3 py-1.5 text-xs shadow-sm">
          {(['ok', 'warn', 'fail'] as Status[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
              {s === 'ok' ? 'ผ่าน' : s === 'warn' ? 'ใกล้เกณฑ์ ≥ 0.9' : 'ไม่ผ่าน'}
            </span>
          ))}
        </div>
      )}
      {mode === 'material' && !selected && (
        <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-lg bg-white/85 px-3 py-1.5 text-xs text-slate-600 sm:block">
          <Eye size={13} className="mr-1 inline" /> ลากเมาส์ซ้ายเพื่อหมุน · ขวาเพื่อเลื่อน · ล้อเพื่อซูม · คลิกชิ้นส่วนเพื่อแก้ไข · ลาก <Box size={12} className="inline text-brand-mark" /> สีส้มเพื่อปรับขนาด/ระยะ
        </p>
      )}
      {children}
    </div>
  )
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} onClick={onClick} className={clsx('grid size-8 place-items-center rounded-lg border shadow-sm', active ? 'border-sel bg-blue-50 text-sel' : 'border-line bg-white/95 text-slate-600 hover:text-ink')}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- parts

function Parts({
  model,
  status,
  mode,
  hidden,
  selected,
  hover,
  setHover,
  onSelect,
}: {
  model: FormModel
  status: Props['status']
  mode: ColorMode
  hidden: Set<PartGroup>
  selected?: PartGroup
  hover?: PartGroup
  setHover: (g: PartGroup | undefined) => void
  onSelect: (g: PartGroup) => void
}) {
  // one material per (group, kind) so a whole group highlights together
  const materials = useMemo(() => {
    const map = new Map<string, THREE.MeshStandardMaterial>()
    for (const p of model.parts) {
      const k = `${p.group}|${p.kind}`
      if (map.has(k)) continue
      const isConcrete = p.kind === 'concrete'
      const color = mode === 'status' && !isConcrete ? STATUS_COLOR[status[p.group] ?? 'none'] : KIND_COLOR[p.kind]
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: p.kind === 'steel' || p.kind === 'tie' ? 0.45 : 0.8,
        metalness: p.kind === 'steel' || p.kind === 'tie' ? 0.45 : 0,
        transparent: isConcrete,
        opacity: isConcrete ? 0.32 : 1,
        depthWrite: !isConcrete,
      })
      if (p.group === selected) m.emissive = SEL.clone().multiplyScalar(0.45)
      else if (p.group === hover) m.emissive = SEL.clone().multiplyScalar(0.2)
      map.set(k, m)
    }
    return map
  }, [model, status, mode, selected, hover])
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  const events = (g: PartGroup) => ({
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect(g)
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setHover(g)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHover(undefined)
      document.body.style.cursor = ''
    },
  })

  return (
    <group>
      {model.parts.map((p: Part) => {
        if (hidden.has(p.group)) return null
        const mat = materials.get(`${p.group}|${p.kind}`)!
        const edges = p.kind !== 'tie' && p.kind !== 'concrete'
        if (p.shape === 'box' && p.plan) return <PlanMesh key={p.id} part={p} material={mat} edges={edges} {...events(p.group)} />
        if (p.shape === 'box')
          return (
            <mesh key={p.id} geometry={boxGeo} material={mat} position={p.center} rotation={[0, p.yaw ?? 0, 0]} scale={p.size} castShadow={p.kind !== 'concrete'} receiveShadow {...events(p.group)}>
              {edges && <Edges color="#00000033" threshold={20} />}
            </mesh>
          )
        const t = barTransform(p)
        return (
          <mesh key={p.id} geometry={p.round ? cylGeo : boxGeo} material={mat} position={t.position} quaternion={t.quaternion} scale={t.scale} castShadow {...events(p.group)}>
            {edges && !p.round && <Edges color="#00000033" threshold={20} />}
          </mesh>
        )
      })}
    </group>
  )
}

// ---------------------------------------------------------------- camera

function CameraRig({ model, view }: { model: FormModel; view: { v: View; n: number } }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null }
  const fitted = useRef(false)
  const { min, max } = model.bounds
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2

  const apply = () => {
    const dist = (radius / Math.sin(((camera.fov / 2) * Math.PI) / 180)) * 1.05
    const dir: Record<View, Vec3> = { iso: [0.75, 0.55, 1], front: [0, 0.02, 1], side: [1, 0.02, 0], top: [0, 1, 0.001] }
    const d = new THREE.Vector3(...dir[view.v]).normalize().multiplyScalar(dist)
    camera.position.set(center[0] + d.x, center[1] + d.y, center[2] + d.z)
    camera.far = dist * 20
    camera.updateProjectionMatrix()
    controls?.target.set(...center)
    controls?.update()
  }

  // fit once the controls exist, then on every view change (not on every model edit — keeps the user's orbit)
  useEffect(() => {
    if (!controls || fitted.current) return
    fitted.current = true
    apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])
  useEffect(() => {
    if (view.n > 0) apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  return <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} />
}

// ---------------------------------------------------------------- drag handles

function DragHandle({ h, onChange, format }: { h: Handle; onChange: (k: HandleKey, v: number) => void; format: (h: Handle, v: number) => string }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: OrbitControlsImpl | null }
  const drag = useRef<{ plane: THREE.Plane; t0: number; v0: number } | null>(null)
  const [active, setActive] = useState(false)
  const [hot, setHot] = useState(false)
  const [live, setLive] = useState<number>()
  const axis = useMemo(() => new THREE.Vector3(...h.axis).normalize(), [h.axis])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, axis), [axis])

  const along = (ray: THREE.Ray, plane: THREE.Plane) => {
    const hit = new THREE.Vector3()
    if (!ray.intersectPlane(plane, hit)) return undefined
    return hit.dot(axis)
  }

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const origin = new THREE.Vector3(...h.position)
    // plane through the handle containing the axis, facing the camera as much as possible
    const view = camera.position.clone().sub(origin)
    const n = view.sub(axis.clone().multiplyScalar(view.dot(axis))).normalize()
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, origin)
    const t0 = along(e.ray, plane)
    if (t0 === undefined) return
    drag.current = { plane, t0, v0: h.value }
    if (controls) controls.enabled = false
    setActive(true)
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const t = along(e.ray, drag.current.plane)
    if (t === undefined) return
    const v = Math.min(h.max, Math.max(h.min, Math.round((drag.current.v0 + t - drag.current.t0) / h.step) * h.step))
    setLive(v)
    if (Math.abs(v - h.value) > 1e-6) onChange(h.key, v)
  }
  const up = (e: ThreeEvent<PointerEvent>) => {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    drag.current = null
    if (controls) controls.enabled = true
    setActive(false)
    setLive(undefined)
  }

  const color = active ? '#2563eb' : hot ? '#f97316' : '#e2621b'
  return (
    <group position={h.position} quaternion={quat}>
      <mesh
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHot(true)
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          setHot(false)
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[0.07, 20, 12]} />
        <meshStandardMaterial color={color} depthTest={false} transparent opacity={0.95} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, s * 0.11, 0]} rotation={[s > 0 ? 0 : Math.PI, 0, 0]} raycast={() => null}>
          <coneGeometry args={[0.035, 0.07, 16]} />
          <meshStandardMaterial color={color} depthTest={false} transparent opacity={0.95} />
        </mesh>
      ))}
      {(hot || active) && (
        <Html center position={[0, 0.24, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-md bg-navy-900 px-2 py-1 text-xs text-white shadow">
            {h.label} <b className="num">{format(h, live ?? h.value)}</b>
          </div>
        </Html>
      )}
    </group>
  )
}
