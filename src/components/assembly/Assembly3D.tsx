// 3D view of an assembly: exploded view (faces pulled outward, courses lifted) and the assembly sequence step by step.
// Clicking a panel selects it (the editor shows it in the face elevation). Loaded lazily with three.js.
import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { FaceKey } from '@/data/types'
import type { Asm3D, AsmPart } from '@/model/assembly3d'
import type { Vec3 } from '@/model/formModel'

export interface Pick {
  face: FaceKey
  course: number
  index: number
}

const COLOR: Record<AsmPart['kind'] | 'filler' | 'sel', string> = {
  concrete: '#9aa4b1',
  ply: '#d39a55',
  filler: '#e07b39',
  stud: '#ead2a4',
  wale: '#2f8f83',
  tie: '#2b2f36',
  plate: '#7b8794',
  sel: '#2563eb',
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
const UP = new THREE.Vector3(0, 1, 0)

/** how far the exploded view pulls faces out and lifts courses, m at full explode */
const PULL = 1.1
const LIFT = 0.45

export default function Assembly3D({ model, selected, onPick }: { model: Asm3D; selected?: Pick; onPick: (p: Pick | undefined) => void }) {
  const last = model.steps.length
  const [step, setStep] = useState(last)
  const [explode, setExplode] = useState(0)
  const [concrete, setConcrete] = useState(true)
  const [playing, setPlaying] = useState(false)

  // a new model (layout edited) shows everything again
  useEffect(() => setStep(model.steps.length), [model.steps.length])
  useEffect(() => {
    if (!playing) return
    if (step >= last) return setPlaying(false)
    const t = setTimeout(() => setStep((s) => s + 1), 1300)
    return () => clearTimeout(t)
  }, [playing, step, last])
  // the current step is highlighted while stepping through, not in the complete view
  const highlight = playing || step < last

  const play = () => {
    if (playing) return setPlaying(false)
    if (step >= last) setStep(1)
    setPlaying(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[min(64dvh,560px)] min-h-[380px] overflow-hidden rounded-xl border border-line bg-gradient-to-b from-slate-100 to-slate-200">
        <Canvas dpr={[1, 2]} camera={{ fov: 35, near: 0.05, far: 500 }} onPointerMissed={() => onPick(undefined)} aria-label="โมเดล 3 มิติของชุดประกอบ">
          <hemisphereLight args={['#ffffff', '#c7ccd4', 1.5]} />
          <directionalLight position={[8, 14, 10]} intensity={1.5} />
          <directionalLight position={[-6, 5, -8]} intensity={0.5} />
          {model.parts.map((p) => (
            <PartMesh key={p.id} p={p} step={step} highlight={highlight} explode={explode} concrete={concrete} selected={selected} onPick={onPick} />
          ))}
          <Fit bounds={model.bounds} />
        </Canvas>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-white/95 px-2.5 py-1.5 text-xs shadow-sm">
            <input type="checkbox" className="accent-brand" checked={concrete} onChange={(e) => setConcrete(e.target.checked)} /> คอนกรีต
          </label>
        </div>
        <p className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-500">ลากเพื่อหมุน · ล้อเมาส์ซูม · คลิกแผงเพื่อเลือก</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="ขั้นก่อนหน้า" className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white hover:bg-slate-50 disabled:opacity-40" disabled={step <= 1} onClick={() => (setPlaying(false), setStep((s) => Math.max(1, s - 1)))}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label={playing ? 'หยุด' : 'เล่นลำดับการประกอบ'} className="inline-flex size-9 items-center justify-center rounded-lg border border-sel bg-blue-50 text-sel hover:bg-blue-100" onClick={play}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" aria-label="ขั้นถัดไป" className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white hover:bg-slate-50 disabled:opacity-40" disabled={step >= last} onClick={() => (setPlaying(false), setStep((s) => Math.min(last, s + 1)))}>
              <ChevronRight size={18} />
            </button>
            <input type="range" min={1} max={last} step={1} value={step} onChange={(e) => (setPlaying(false), setStep(Number(e.target.value)))} className="mx-2 flex-1 accent-sel" aria-label="ขั้นการประกอบ" />
            <span className="num w-12 text-right text-sm">
              {step}/{last}
            </span>
          </div>
          <ol className="flex flex-col gap-0.5 text-sm">
            {model.steps.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => (setPlaying(false), setStep(i + 1))} className={clsx('w-full rounded-md px-2 py-1 text-left', i + 1 === step ? 'bg-blue-50 font-semibold text-sel' : i + 1 < step ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 hover:bg-slate-50')}>
                  <span className="num mr-2">{i + 1}.</span>
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex min-w-48 flex-1 items-center gap-3 text-[13px] text-slate-700">
            <span className="whitespace-nowrap">แยกชิ้น</span>
            <input type="range" min={0} max={1} step={0.05} value={explode} onChange={(e) => setExplode(Number(e.target.value))} className="flex-1 accent-brand" aria-label="แยกชิ้น (exploded)" />
          </label>
          <button type="button" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm hover:bg-slate-50" onClick={() => (setExplode(0), setStep(last), setPlaying(false))}>
            <RotateCcw size={14} /> ประกอบครบ
          </button>
          <p className="w-full text-xs text-muted">ชิ้นที่เรืองสีน้ำเงินคือชิ้นที่ประกอบในขั้นปัจจุบัน</p>
        </div>
      </div>
    </div>
  )
}

function PartMesh({ p, step, highlight, explode, concrete, selected, onPick }: { p: AsmPart; step: number; highlight: boolean; explode: number; concrete: boolean; selected?: Pick; onPick: (p: Pick | undefined) => void }) {
  const visible = p.kind === 'concrete' ? concrete : p.step < step
  const current = highlight && p.step === step - 1
  const isSel = !!selected && p.face === selected.face && p.course === selected.course && p.index === selected.index
  const material = useMemo(() => {
    const color = new THREE.Color(isSel ? COLOR.sel : p.kind === 'ply' && p.filler ? COLOR.filler : COLOR[p.kind])
    // parts of the current step: tinted towards blue
    if (current && !isSel) color.lerp(new THREE.Color('#60a5fa'), 0.55)
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: p.kind === 'concrete', opacity: p.kind === 'concrete' ? 0.35 : 1 })
  }, [p.kind, p.filler, isSel, current])
  useEffect(() => () => material.dispose(), [material])
  if (!visible) return null

  // exploded: faces move out along their normal, courses lift, wales (and the tie plates on them) go further out than the panels
  const pull = explode * PULL * (p.kind === 'wale' || p.kind === 'plate' ? 1.6 : 1)
  const lift = explode * LIFT * p.course
  const shift: Vec3 = [p.n[0] * pull, lift, p.n[2] * pull]
  const click =
    p.face && p.index !== undefined
      ? (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onPick({ face: p.face!, course: p.course, index: p.index! })
        }
      : undefined

  if (p.kind === 'tie' && p.from && p.to) {
    const a = new THREE.Vector3(...p.from)
    const b = new THREE.Vector3(...p.to)
    const dir = b.clone().sub(a)
    const len = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())
    return <mesh geometry={cylGeo} material={material} position={a.add(b).multiplyScalar(0.5)} quaternion={q} scale={[0.014, len, 0.014]} />
  }
  return (
    <mesh geometry={boxGeo} material={material} position={[p.center[0] + shift[0], p.center[1] + shift[1], p.center[2] + shift[2]]} scale={p.size} onClick={click}>
      {p.kind !== 'concrete' && <Edges color="#00000030" threshold={20} />}
    </mesh>
  )
}

function Fit({ bounds }: { bounds: Asm3D['bounds'] }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null }
  const { min, max } = bounds
  const key = [...min, ...max].map((v) => v.toFixed(2)).join()
  useEffect(() => {
    if (!controls) return
    const c = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    // room for the exploded view
    const r = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 + PULL
    const dist = (r / Math.sin(((camera.fov / 2) * Math.PI) / 180)) * 0.95
    const d = new THREE.Vector3(0.75, 0.6, 1).normalize().multiplyScalar(dist)
    camera.position.set(c.x + d.x, c.y + d.y, c.z + d.z)
    camera.far = dist * 20
    camera.updateProjectionMatrix()
    controls.target.copy(c)
    controls.update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, key])
  return <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} />
}
