// Illustrations for the user manual: schematic sections of each formwork type and the mechanics behind the
// checks. Drawn as SVG so they stay sharp at any size; colours match the 3D view and the shop drawings.
import type { ReactNode } from 'react'
import { useL } from '@/i18n/manual'

const C = {
  conc: '#e9ebee',
  concLine: '#8a94a3',
  ply: '#e7b77f',
  plyLine: '#8c5a22',
  tim: '#f3dcb5',
  timLine: '#8c6a36',
  steel: '#b9c4d3',
  steelLine: '#4b5b70',
  load: '#b9470b',
  lead: '#64748b',
  ink: '#0f172a',
  muted: '#5b6576',
  soil: '#d6c7ad',
}

export function Figure({ title, children, caption }: { title: string; children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="m-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="bg-slate-50/70 p-3 sm:p-4">{children}</div>
      <figcaption className="border-t border-line px-4 py-2.5 text-[13px] leading-relaxed text-slate-600">
        <b className="text-ink">{title}</b>
        {caption && <> — {caption}</>}
      </figcaption>
    </figure>
  )
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill={C.conc} />
        <line x1="0" y1="0" x2="0" y2="7" stroke="#c3c9d2" strokeWidth="1.2" />
      </pattern>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill={C.load} />
      </marker>
      <marker id={`${id}-dim`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2 8L8 2" stroke={C.ink} strokeWidth="1.4" />
      </marker>
    </defs>
  )
}

/** Leader line from a point on the drawing to a label. */
/** Leader from a point to a label; the label sits on the far side of the leader (left labels end at tx). */
function Callout({ x, y, tx, ty, children, middle }: { x: number; y: number; tx: number; ty: number; children: ReactNode; middle?: boolean }) {
  const anchor = middle ? 'middle' : x > tx ? 'end' : 'start'
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={C.lead} strokeWidth="1" />
      <circle cx={x} cy={y} r="2.4" fill={C.ink} />
      <text
        x={tx + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0)}
        y={ty + (middle && ty < y ? -4 : 4)}
        fontSize="12.5"
        fill={C.ink}
        textAnchor={anchor}
        stroke="#f8fafc"
        strokeWidth="4"
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        {children}
      </text>
    </g>
  )
}

const svgProps = (w: number, h: number, label: string) => ({ viewBox: `0 0 ${w} ${h}`, className: 'h-auto w-full', role: 'img', 'aria-label': label, style: { fontFamily: 'var(--font-sans)' } })

// ---------------------------------------------------------------- wall

export function WallSectionFigure() {
  const L = useL()
  const id = 'wall'
  const levels = [92, 172, 252]
  return (
    <svg {...svgProps(670, 360, L('รูปตัดแบบหล่อกำแพง แสดงแผ่นผิว เคร่า คานรับเคร่า ไทร์ และค้ำยัน', 'Wall form section: sheathing, studs, wales, ties and braces', '墙模板剖面:面板、竖楞、围檩、对拉螺栓和斜撑'))}>
      <Defs id={id} />
      <g transform="translate(70 0)">
      <line x1="20" y1="322" x2="580" y2="322" stroke={C.ink} strokeWidth="1.5" />
      {/* concrete, plywood, studs */}
      <rect x="250" y="40" width="60" height="282" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      <rect x="242" y="40" width="8" height="282" fill={C.ply} stroke={C.plyLine} />
      <rect x="310" y="40" width="8" height="282" fill={C.ply} stroke={C.plyLine} />
      <rect x="230" y="40" width="12" height="282" fill={C.tim} stroke={C.timLine} />
      <rect x="318" y="40" width="12" height="282" fill={C.tim} stroke={C.timLine} />
      {levels.map((y) => (
        <g key={y}>
          <line x1="204" y1={y} x2="356" y2={y} stroke={C.ink} strokeWidth="2.2" />
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect x={s < 0 ? 216 : 330} y={y - 14} width="14" height="12" fill={C.tim} stroke={C.timLine} />
              <rect x={s < 0 ? 216 : 330} y={y + 2} width="14" height="12" fill={C.tim} stroke={C.timLine} />
              <rect x={s < 0 ? 208 : 344} y={y - 8} width="8" height="16" fill={C.steel} stroke={C.steelLine} />
            </g>
          ))}
        </g>
      ))}
      {/* braces and stakes */}
      <line x1="216" y1="70" x2="128" y2="320" stroke={C.timLine} strokeWidth="7" strokeLinecap="round" />
      <line x1="344" y1="70" x2="432" y2="320" stroke={C.timLine} strokeWidth="7" strokeLinecap="round" />
      <rect x="116" y="300" width="10" height="40" fill={C.tim} stroke={C.timLine} />
      <rect x="434" y="300" width="10" height="40" fill={C.tim} stroke={C.timLine} />
      <path d="M150 320 A 34 34 0 0 1 140 288" fill="none" stroke={C.lead} />
      <text x="152" y="304" fontSize="11" fill={C.muted}>
        θ ≈ 60°
      </text>
      {/* pressure diagram */}
      <g>
        <path d="M480 40 L480 322 L560 322 L560 160 Z" fill="#fde7d6" stroke={C.load} strokeWidth="1.2" />
        {[80, 130, 180, 230, 280].map((y) => {
          const w = y < 160 ? ((y - 40) / 120) * 80 : 80
          return <line key={y} x1={480 + w} y1={y} x2={484} y2={y} stroke={C.load} strokeWidth="1.3" markerEnd={`url(#${id}-arrow)`} />
        })}
        <text x="520" y="32" fontSize="12" textAnchor="middle" fill={C.load} fontWeight="600">
          {L('แรงดันคอนกรีต P', 'Concrete pressure P', '混凝土侧压力 P')}
        </text>
        <text x="566" y="164" fontSize="11" fill={C.load}>
          Pmax
        </text>
      </g>
      <Callout x={280} y={60} tx={300} ty={16}>
        {L('คอนกรีต (ความหนา t)', 'Concrete (thickness t)', '混凝土(厚度 t)')}
      </Callout>
      <Callout x={246} y={300} tx={200} ty={345}>
        {L('แผ่นผิว (ไม้อัด)', 'Sheathing (plywood)', '面板(胶合板)')}
      </Callout>
      <Callout x={324} y={300} tx={360} ty={345}>
        {L('เคร่าตั้ง (Stud)', 'Vertical stud', '竖楞 (Stud)')}
      </Callout>
      <Callout x={223} y={172} tx={84} ty={172}>
        {L('คานรับเคร่าคู่ (Wale)', 'Double wale', '双围檩 (Wale)')}
      </Callout>
      <Callout x={280} y={252} tx={84} ty={236}>
        {L('Form tie + แผ่นรอง', 'Form tie + plate', '对拉螺栓 + 垫板')}
      </Callout>
      <Callout x={198} y={120} tx={84} ty={104}>
        {L('ค้ำยัน (Brace)', 'Brace', '斜撑 (Brace)')}
      </Callout>
      <Callout x={121} y={330} tx={84} ty={300}>
        {L('หลัก', 'Stake', '木桩')}
      </Callout>
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------- slab

export function SlabSystemFigure() {
  const L = useL()
  const id = 'slab'
  const shores = [96, 236, 376, 516]
  return (
    <svg {...svgProps(780, 380, L('รูปด้านระบบแบบหล่อพื้น แผ่นพื้นแบบ ตง คานรองรับ เสาค้ำ และค้ำยันทางข้าง', 'Slab form elevation: deck, joists, stringers, shores and lateral bracing', '楼板模板立面:底模面板、次楞、主楞、立杆和水平拉结'))}>
      <Defs id={id} />
      {Array.from({ length: 14 }, (_, i) => 60 + i * 38).map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="42" stroke={C.load} strokeWidth="1.4" markerEnd={`url(#${id}-arrow)`} />
      ))}
      <text x="310" y="14" textAnchor="middle" fontSize="12" fill={C.load} fontWeight="600">
        {L('w = γ·t + น้ำหนักจร + น้ำหนักแบบหล่อ (กก./ม.²)', 'w = γ·t + live load + formwork weight (kg/m²)', 'w = γ·t + 施工活荷载 + 模板自重 (kg/m²)')}
      </text>
      <rect x="40" y="44" width="540" height="24" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      <rect x="40" y="68" width="540" height="6" fill={C.ply} stroke={C.plyLine} />
      {Array.from({ length: 14 }, (_, i) => 52 + i * 40).map((x) => (
        <rect key={x} x={x} y="74" width="10" height="16" fill={C.tim} stroke={C.timLine} />
      ))}
      <rect x="40" y="90" width="540" height="18" fill={C.tim} stroke={C.timLine} />
      {shores.map((x) => (
        <g key={x}>
          <rect x={x - 4} y="108" width="8" height="196" fill={C.steel} stroke={C.steelLine} />
          <rect x={x - 14} y="304" width="28" height="6" fill={C.tim} stroke={C.timLine} />
        </g>
      ))}
      <line x1="100" y1="290" x2="232" y2="130" stroke={C.steelLine} strokeWidth="2" />
      <line x1="100" y1="130" x2="232" y2="290" stroke={C.steelLine} strokeWidth="2" />
      <line x1="380" y1="290" x2="512" y2="130" stroke={C.steelLine} strokeWidth="2" />
      <line x1="380" y1="130" x2="512" y2="290" stroke={C.steelLine} strokeWidth="2" />
      <line x1="20" y1="310" x2="600" y2="310" stroke={C.ink} strokeWidth="1.5" />
      {/* dimensions */}
      <g stroke={C.ink} strokeWidth="1">
        <line x1="57" y1="96" x2="57" y2="96" />
        <line x1="236" y1="340" x2="376" y2="340" markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
        <line x1="96" y1="340" x2="236" y2="340" markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
      </g>
      <text x="166" y="334" fontSize="12" textAnchor="middle">
        {L('L (ระยะเสาค้ำ)', 'L (shore spacing)', 'L(立杆间距)')}
      </text>
      <text x="306" y="334" fontSize="12" textAnchor="middle">
        L
      </text>
      <g stroke={C.ink} strokeWidth="1">
        <line x1="417" y1="62" x2="457" y2="62" stroke="none" />
      </g>
      <Callout x={560} y={56} tx={600} ty={50}>
        {L('คอนกรีตพื้น t', 'Slab concrete t', '楼板混凝土 t')}
      </Callout>
      <Callout x={566} y={71} tx={600} ty={74}>
        {L('แผ่นพื้นแบบ', 'Deck sheathing', '底模面板')}
      </Callout>
      <Callout x={537} y={82} tx={600} ty={98}>
        {L('ตง (Joist) @a', 'Joist @a', '次楞 (Joist) @a')}
      </Callout>
      <Callout x={570} y={99} tx={600} ty={122}>
        {L('คานรองรับ (Stringer)', 'Stringer', '主楞 (Stringer)')}
      </Callout>
      <Callout x={516} y={180} tx={600} ty={186}>
        {L('เสาค้ำ', 'Shore', '立杆')}
      </Callout>
      <Callout x={446} y={210} tx={600} ty={240}>
        {L('ค้ำยันทแยง (ไขว้)', 'Diagonal (cross) bracing', '交叉斜撑')}
      </Callout>
      <Callout x={530} y={307} tx={600} ty={300}>
        {L('แป้นรองฐาน', 'Base plate / sole', '底座垫板')}
      </Callout>
      <text x="310" y="372" fontSize="12" textAnchor="middle" fill={C.muted}>
        {L('ตงวางตั้งฉากกับคานรองรับ (ในรูปเห็นเป็นหน้าตัดสี่เหลี่ยมเล็ก ๆ)', 'Joists run across the stringers (shown as the small rectangles)', '次楞垂直于主楞布置(图中小矩形截面)')}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------- beam

export function BeamSectionFigure() {
  const L = useL()
  const id = 'beam'
  return (
    <svg {...svgProps(740, 380, L('รูปตัดแบบหล่อคานที่หล่อร่วมกับพื้น', 'Section of a beam form cast with the slab', '梁与楼板同浇的梁模板剖面'))}>
      <Defs id={id} />
      {/* slab and beam */}
      <rect x="40" y="56" width="200" height="26" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      <rect x="320" y="56" width="200" height="26" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      <rect x="240" y="56" width="80" height="150" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      {/* slab forms */}
      <rect x="40" y="82" width="188" height="6" fill={C.ply} stroke={C.plyLine} />
      <rect x="332" y="82" width="188" height="6" fill={C.ply} stroke={C.plyLine} />
      {[60, 110, 160, 205].map((x) => (
        <rect key={x} x={x} y="88" width="10" height="16" fill={C.tim} stroke={C.timLine} />
      ))}
      {[345, 390, 440, 490].map((x) => (
        <rect key={x} x={x} y="88" width="10" height="16" fill={C.tim} stroke={C.timLine} />
      ))}
      {/* side forms, studs, bottom */}
      <rect x="232" y="82" width="8" height="132" fill={C.ply} stroke={C.plyLine} />
      <rect x="320" y="82" width="8" height="132" fill={C.ply} stroke={C.plyLine} />
      <rect x="232" y="206" width="96" height="8" fill={C.ply} stroke={C.plyLine} />
      <rect x="220" y="104" width="12" height="122" fill={C.tim} stroke={C.timLine} />
      <rect x="328" y="104" width="12" height="122" fill={C.tim} stroke={C.timLine} />
      <rect x="246" y="214" width="26" height="12" fill={C.tim} stroke={C.timLine} />
      <rect x="288" y="214" width="26" height="12" fill={C.tim} stroke={C.timLine} />
      {/* head + T-shore */}
      <rect x="180" y="226" width="200" height="16" fill={C.tim} stroke={C.timLine} />
      <rect x="275" y="242" width="10" height="106" fill={C.tim} stroke={C.timLine} />
      <line x1="280" y1="300" x2="208" y2="243" stroke={C.timLine} strokeWidth="5" />
      <line x1="280" y1="300" x2="352" y2="243" stroke={C.timLine} strokeWidth="5" />
      <rect x="262" y="348" width="36" height="6" fill={C.tim} stroke={C.timLine} />
      <line x1="20" y1="354" x2="580" y2="354" stroke={C.ink} strokeWidth="1.5" />
      {/* side pressure */}
      {[120, 150, 180].map((y, i) => (
        <line key={y} x1={262 - i * 6} y1={y} x2="244" y2={y} stroke={C.load} strokeWidth="1.3" markerEnd={`url(#${id}-arrow)`} />
      ))}
      <text x="280" y="44" fontSize="12" textAnchor="middle" fill={C.load} fontWeight="600">
        {L('แรงดันข้าง = γ·h (สามเหลี่ยม)', 'Side pressure = γ·h (triangular)', '侧压力 = γ·h(三角形分布)')}
      </text>
      <Callout x={236} y={150} tx={196} ty={150}>
        {L('แบบข้างคาน', 'Beam side form', '梁侧模')}
      </Callout>
      <Callout x={226} y={190} tx={196} ty={190}>
        {L('เคร่าข้าง (Stud)', 'Side stud', '侧竖楞 (Stud)')}
      </Callout>
      <Callout x={480} y={96} tx={560} ty={124}>
        {L('ตงพื้นยึดปากแบบ', 'Slab joist ties the form top', '楼板次楞固定梁侧模上口')}
      </Callout>
      <Callout x={300} y={210} tx={560} ty={170}>
        {L('ท้องแบบ', 'Soffit', '底模')}
      </Callout>
      <Callout x={301} y={220} tx={560} ty={198}>
        {L('ไม้เสริมท้องแบบ', 'Soffit battens', '底模加强木')}
      </Callout>
      <Callout x={370} y={234} tx={560} ty={234}>
        {L('คานขวาง (Head)', 'Head', '横担 (Head)')}
      </Callout>
      <Callout x={330} y={258} tx={560} ty={268}>
        {L('เท้าแขน', 'Knee brace', '斜撑臂')}
      </Callout>
      <Callout x={280} y={320} tx={560} ty={310}>
        {L('เสาค้ำ (ตุ๊กตาตัวที)', 'Shore (T-head)', '立杆(T 形支撑)')}
      </Callout>
    </svg>
  )
}

// ---------------------------------------------------------------- footing

export function FootingFigure() {
  const L = useL()
  const id = 'ftg'
  return (
    <svg {...svgProps(600, 300, L('รูปตัดแบบหล่อฐานรากแบบค้ำยันลงหลัก', 'Footing form section braced to stakes', '斜撑至木桩的基础模板剖面'))}>
      <Defs id={id} />
      <path d="M20 60 L120 60 L170 230 L430 230 L480 60 L580 60 L580 290 L20 290 Z" fill={C.soil} opacity="0.55" />
      <rect x="170" y="222" width="260" height="8" fill="#cfd5dd" stroke={C.concLine} />
      <rect x="230" y="110" width="140" height="112" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      <rect x="222" y="104" width="8" height="118" fill={C.ply} stroke={C.plyLine} />
      <rect x="370" y="104" width="8" height="118" fill={C.ply} stroke={C.plyLine} />
      <rect x="210" y="100" width="12" height="122" fill={C.tim} stroke={C.timLine} />
      <rect x="378" y="100" width="12" height="122" fill={C.tim} stroke={C.timLine} />
      {[120, 165].map((y) => (
        <g key={y}>
          <line x1="210" y1={y} x2={210 - (222 - y) * 0.95} y2="222" stroke={C.timLine} strokeWidth="5" />
          <line x1="390" y1={y} x2={390 + (222 - y) * 0.95} y2="222" stroke={C.timLine} strokeWidth="5" />
        </g>
      ))}
      <rect x="104" y="206" width="9" height="46" fill={C.tim} stroke={C.timLine} />
      <rect x="487" y="206" width="9" height="46" fill={C.tim} stroke={C.timLine} />
      <rect x="200" y="210" width="8" height="40" fill={C.tim} stroke={C.timLine} />
      <rect x="392" y="210" width="8" height="40" fill={C.tim} stroke={C.timLine} />
      <Callout x={300} y={160} tx={300} ty={30} middle>
        {L('ฐานราก (ลึก H)', 'Footing (depth H)', '基础(深 H)')}
      </Callout>
      <Callout x={300} y={226} tx={300} ty={278} middle>
        {L('คอนกรีตหยาบ ~5 ซม.', 'Lean concrete ~5 cm', '垫层混凝土 ~5 cm')}
      </Callout>
      <Callout x={226} y={140} tx={196} ty={40}>
        {L('แผ่นผิวข้างแบบ + เคร่า', 'Side sheathing + studs', '侧面板 + 竖楞')}
      </Callout>
      <Callout x={437} y={170} tx={492} ty={104}>
        {L('ค้ำยันทแยง ≤ 45°', 'Brace ≤ 45°', '斜撑 ≤ 45°')}
      </Callout>
      <Callout x={108} y={240} tx={150} ty={282}>
        {L('หลักรับค้ำยัน', 'Brace stake', '斜撑木桩')}
      </Callout>
      <Callout x={396} y={240} tx={420} ty={282}>
        {L('หลักตีนเคร่า', 'Stud toe stake', '竖楞根部木桩')}
      </Callout>
    </svg>
  )
}

/** Regular n-gon of apothem a (flats on top and bottom) about (cx, cy) as an SVG points string. */
const ngon = (n: number, a: number, cx: number, cy: number) => {
  const R = a / Math.cos(Math.PI / n)
  return Array.from({ length: n }, (_, k) => {
    const t = Math.PI / 2 + Math.PI / n + (2 * Math.PI * k) / n
    return `${(cx + R * Math.cos(t)).toFixed(1)},${(cy + R * Math.sin(t)).toFixed(1)}`
  }).join(' ')
}

export function ColumnShapesFigure() {
  const L = useL()
  const id = 'csh'
  const r = 52
  const st = 7 // staves
  const e = (r + st) * Math.SQRT1_2 // yoke boards meet on the circle at 45°
  const bw = 26 // board width
  const N = 22
  return (
    <svg {...svgProps(880, 250, L('แปลนแบบหล่อเสากลม แปดเหลี่ยม หกเหลี่ยม และตัว L', 'Plans of round, octagonal, hexagonal and L-shaped column forms', '圆柱、八边形柱、六边形柱与 L 形柱模板平面'))}>
      <Defs id={id} />
      {/* round: staves in a square frame of cut-out boards */}
      <g transform="translate(110 112)">
        {[1, -1].map((s) => (
          <g key={s}>
            <rect x={s > 0 ? e : -e - bw} y={-e - bw - 8} width={bw} height={2 * (e + bw) + 16} fill={C.tim} stroke={C.timLine} />
            <rect x={-e - bw - 8} y={s > 0 ? e : -e - bw} width={2 * (e + bw) + 16} height={bw} fill={C.tim} stroke={C.timLine} />
          </g>
        ))}
        {Array.from({ length: N }, (_, k) => (
          <rect key={k} x={-4.6} y={r} width={9.2} height={st} fill={C.ply} stroke={C.plyLine} strokeWidth="0.8" transform={`rotate(${(360 * k) / N})`} />
        ))}
        <circle r={r} fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      </g>
      {/* octagon: box of yokes with corner fillers */}
      <g transform="translate(330 112)">
        <rect x={-73} y={-73} width={146} height={146} fill={C.tim} stroke={C.timLine} strokeDasharray="3 2" />
        {[1, -1].map((s) => (
          <g key={s}>
            <rect x={s > 0 ? 73 : -83} y={-92} width={10} height={184} fill={C.tim} stroke={C.timLine} />
            <rect x={-92} y={s > 0 ? 73 : -83} width={184} height={10} fill={C.tim} stroke={C.timLine} />
          </g>
        ))}
        <polygon points={ngon(8, 58, 0, 0)} fill={C.ply} stroke={C.plyLine} />
        <polygon points={ngon(8, 52, 0, 0)} fill={`url(#${id}-hatch)`} stroke={C.concLine} />
      </g>
      {/* hexagon: ring of yokes along the faces */}
      <g transform="translate(550 112)">
        <polygon points={ngon(6, 66, 0, 0)} fill="none" stroke={C.timLine} strokeWidth="13" strokeLinejoin="miter" />
        <polygon points={ngon(6, 66, 0, 0)} fill="none" stroke={C.tim} strokeWidth="11" strokeLinejoin="miter" />
        <polygon points={ngon(6, 58, 0, 0)} fill={C.ply} stroke={C.plyLine} />
        <polygon points={ngon(6, 52, 0, 0)} fill={`url(#${id}-hatch)`} stroke={C.concLine} />
        {ngon(6, 72, 0, 0)
          .split(' ')
          .map((p) => (
            <circle key={p} cx={p.split(',')[0]} cy={p.split(',')[1]} r="3.2" fill={C.steelLine} />
          ))}
      </g>
      {/* L: yokes along the faces, a tie through each leg at the inner corner */}
      <g>
        {[
          [690, 40, 850, 40],
          [842, 30, 842, 100],
          [758, 100, 850, 100],
          [698, 30, 698, 194],
          [758, 100, 758, 194],
          [690, 184, 768, 184],
        ].map(([x1, y1, x2, y2], k) => (
          <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.timLine} strokeWidth="10" />
        ))}
        <polygon points="704,46 836,46 836,94 752,94 752,178 704,178" fill={C.ply} stroke={C.plyLine} />
        <polygon points="710,52 830,52 830,88 746,88 746,172 710,172" fill={`url(#${id}-hatch)`} stroke={C.concLine} />
        <line x1="764" y1="32" x2="764" y2="108" stroke={C.load} strokeWidth="2.4" strokeDasharray="5 3" />
        <line x1="690" y1="106" x2="766" y2="106" stroke={C.load} strokeWidth="2.4" strokeDasharray="5 3" />
      </g>
      <g fontSize="12.5" textAnchor="middle" fill={C.ink}>
        <text x="110" y="226">{L('ไม้ระแนง + คานรัดเจาะโค้ง', 'Staves + cut-out yoke boards', '木条 + 开弧形口柱箍板')}</text>
        <text x="330" y="226">{L('กรอบคานรัด + ไม้อุดมุม', 'Box of yokes + corner fillers', '矩形柱箍框 + 角部填块')}</text>
        <text x="550" y="226">{L('คานรัดวงแหวนตามรูป', 'Ring of yokes along the faces', '沿边环形柱箍')}</text>
        <text x="770" y="226">{L('คานรัดตามหน้า + ไทร์มุมใน', 'Yokes along faces + inner-corner ties', '沿面柱箍 + 内角对拉螺栓')}</text>
      </g>
      <g fontSize="11" textAnchor="middle" fill={C.muted} className="num">
        <text x="110" y="243">F = wD/2 · M = wD²/8</text>
        <text x="330" y="243">{L('= เสาสี่เหลี่ยม F × F', '= F × F rectangle', '= F × F 矩形柱')}</text>
        <text x="550" y="243">T = wF/2 · M = wa²/8</text>
        <text x="770" y="243">{L('แต่ละขา = เสาสี่เหลี่ยม t × L', 'each leg = t × L rectangle', '每肢 = t × L 矩形柱')}</text>
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------- mechanics

export function ContinuousBeamFigure() {
  const L = useL()
  const id = 'cb'
  const sx = [50, 210, 370, 530]
  return (
    <svg {...svgProps(580, 270, L('คานต่อเนื่องรับน้ำหนักแผ่สม่ำเสมอ และแผนภาพโมเมนต์', 'Continuous beam under uniform load, with its moment diagram', '均布荷载下的连续梁及弯矩图'))}>
      <Defs id={id} />
      {Array.from({ length: 17 }, (_, i) => 50 + i * 30).map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="56" stroke={C.load} strokeWidth="1.3" markerEnd={`url(#${id}-arrow)`} />
      ))}
      <line x1="50" y1="22" x2="530" y2="22" stroke={C.load} strokeWidth="1.3" />
      <text x="290" y="14" fontSize="12.5" textAnchor="middle" fill={C.load} fontWeight="600">
        {L('w (กก./ซม.) = แรงดันหรือน้ำหนัก × ระยะห่างของชิ้นส่วน', 'w (kg/cm) = pressure or load × member spacing', 'w (kg/cm) = 压力或荷载 × 构件间距')}
      </text>
      <rect x="40" y="60" width="500" height="12" fill={C.tim} stroke={C.timLine} />
      {sx.map((x) => (
        <path key={x} d={`M${x} 72 L${x - 10} 90 L${x + 10} 90 Z`} fill="#fff" stroke={C.ink} />
      ))}
      {sx.slice(0, 3).map((x, i) => (
        <g key={x}>
          <line x1={x} y1="104" x2={sx[i + 1]} y2="104" stroke={C.ink} markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
          <text x={x + 80} y="100" fontSize="12" textAnchor="middle">
            l
          </text>
        </g>
      ))}
      {/* moment diagram: sagging in spans, hogging at inner supports */}
      <line x1="40" y1="180" x2="540" y2="180" stroke={C.lead} strokeDasharray="4 3" />
      <path d="M50 180 Q130 236 210 150 Q290 222 370 150 Q450 236 530 180" fill="#dbeafe" fillOpacity="0.7" stroke="#1d4ed8" strokeWidth="1.6" />
      <text x="128" y="230" fontSize="12" textAnchor="middle" fill="#1d4ed8">
        M⁺
      </text>
      <text x="210" y="142" fontSize="12" textAnchor="middle" fill="#1d4ed8">
        M⁻ ≈ wl²/10
      </text>
      <text x="40" y="262" fontSize="12" fill={C.muted}>
        {L('ชิ้นส่วนที่พาดต่อเนื่องตั้งแต่ 3 ช่วง: M = wl²/10 · V = 5wl/8 · Δ = wl⁴/128EI', 'Members continuous over 3+ spans: M = wl²/10 · V = 5wl/8 · Δ = wl⁴/128EI', '三跨及以上连续构件:M = wl²/10 · V = 5wl/8 · Δ = wl⁴/128EI')}
      </text>
    </svg>
  )
}

export function BucklingFigure() {
  const L = useL()
  const id = 'bk'
  return (
    <svg {...svgProps(460, 300, L('เสาค้ำไม่มีค้ำยันกับมีค้ำยันกลางความสูง', 'Shore without and with bracing at mid-height', '无拉结与中部设水平拉结的立杆'))}>
      <Defs id={id} />
      {[110, 330].map((x) => (
        <g key={x}>
          <line x1={x} y1="16" x2={x} y2="44" stroke={C.load} strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />
          <text x={x + 10} y="30" fontSize="12" fill={C.load} fontWeight="600">
            P
          </text>
          <rect x={x - 22} y="262" width="44" height="6" fill={C.tim} stroke={C.timLine} />
        </g>
      ))}
      <line x1="110" y1="50" x2="110" y2="262" stroke={C.lead} strokeDasharray="4 3" />
      <path d="M110 50 Q160 156 110 262" fill="none" stroke={C.steelLine} strokeWidth="6" strokeLinecap="round" />
      <line x1="60" y1="50" x2="60" y2="262" stroke={C.ink} markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
      <text x="54" y="160" fontSize="13" textAnchor="end">
        l
      </text>
      <line x1="330" y1="50" x2="330" y2="262" stroke={C.lead} strokeDasharray="4 3" />
      <path d="M330 50 Q356 103 330 156 Q304 209 330 262" fill="none" stroke={C.steelLine} strokeWidth="6" strokeLinecap="round" />
      <line x1="330" y1="156" x2="440" y2="156" stroke={C.timLine} strokeWidth="5" />
      <text x="400" y="148" fontSize="11.5" textAnchor="middle" fill={C.muted}>
        {L('ค้ำยันทางข้าง', 'Lateral brace', '水平拉结')}
      </text>
      <line x1="280" y1="50" x2="280" y2="156" stroke={C.ink} markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
      <line x1="280" y1="156" x2="280" y2="262" stroke={C.ink} markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
      <text x="274" y="106" fontSize="12" textAnchor="end">
        l/2
      </text>
      <text x="274" y="212" fontSize="12" textAnchor="end">
        l/2
      </text>
      <text x="110" y="290" fontSize="12.5" textAnchor="middle">
        {L('ไม่มีค้ำยัน: ยาวไม่ค้ำยัน = l', 'Unbraced: unbraced length = l', '无拉结:计算长度 = l')}
      </text>
      <text x="340" y="290" fontSize="12.5" textAnchor="middle">
        {L('ค้ำกลางความสูง: รับแรงได้ ≈ 4 เท่า', 'Braced at mid-height: ≈ 4× capacity', '中部拉结:承载力 ≈ 4 倍')}
      </text>
    </svg>
  )
}

export function TieAreaFigure() {
  const L = useL()
  const id = 'tie'
  const rows = [70, 140, 210]
  const cols = [60, 160, 260, 360]
  return (
    <svg {...svgProps(540, 276, L('พื้นที่รับแรงของ Form tie หนึ่งตัว', 'Tributary area of one form tie', '单根对拉螺栓的受荷面积'))}>
      <Defs id={id} />
      <text x="20" y="18" fontSize="13" fill={C.load} fontWeight="600">
        {L('T = P × (ระยะคานรับเคร่า × ระยะไทร์) ≤ SWL', 'T = P × (wale spacing × tie spacing) ≤ SWL', 'T = P × (围檩间距 × 螺栓间距) ≤ SWL')}
      </text>
      <rect x="20" y="40" width="400" height="200" fill={C.ply} opacity="0.45" stroke={C.plyLine} />
      {rows.map((y) => (
        <rect key={y} x="20" y={y - 5} width="400" height="10" fill={C.tim} stroke={C.timLine} />
      ))}
      <rect x="110" y="105" width="100" height="70" fill="#fde7d6" stroke={C.load} strokeWidth="1.6" strokeDasharray="5 3" />
      {rows.map((y) => cols.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={C.ink} />))}
      <circle cx="160" cy="140" r="7" fill={C.load} />
      <line x1="110" y1="258" x2="210" y2="258" stroke={C.ink} markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
      <text x="160" y="254" fontSize="12" textAnchor="middle">
        {L('ระยะไทร์', 'Tie spacing', '螺栓间距')}
      </text>
      <line x1="440" y1="70" x2="440" y2="140" stroke={C.ink} markerStart={`url(#${id}-dim)`} markerEnd={`url(#${id}-dim)`} />
      <text x="448" y="100" fontSize="12">
        {L('ระยะคาน', 'Wale', '围檩')}
      </text>
      <text x="448" y="116" fontSize="12">
        {L('รับเคร่า', 'spacing', '间距')}
      </text>
      <text x="448" y="190" fontSize="11.5" fill={C.load}>
        {L('พื้นที่รับแรง', 'Tributary area', '受荷面积')}
      </text>
      <text x="448" y="205" fontSize="11.5" fill={C.load}>
        {L('ของไทร์ 1 ตัว', 'of one tie', '(单根螺栓)')}
      </text>
      <line x1="210" y1="160" x2="444" y2="196" stroke={C.load} strokeWidth="0.8" strokeDasharray="3 3" />
    </svg>
  )
}

/** Five load paths side by side (HTML so it wraps on phones). */
export function LoadPathFigure() {
  const L = useL()
  const rows: [string, string[]][] = L(
    [
      ['กำแพง', ['แรงดันคอนกรีต', 'แผ่นผิว', 'เคร่าตั้ง', 'คานรับเคร่า', 'Form tie / ค้ำยัน']],
      ['เสา', ['แรงดันคอนกรีต', 'แผ่นผิว', 'เคร่าตั้ง', 'คานรัดแบบ', 'สลักเกลียว / ไทร์']],
      ['พื้น', ['น้ำหนักพื้น w', 'แผ่นพื้นแบบ', 'ตง', 'คานรองรับ', 'เสาค้ำ → พื้นล่าง']],
      ['คาน', ['คอนกรีตคาน + พื้น', 'ท้องแบบ', 'คานขวาง', 'เสาค้ำ', 'พื้นล่าง']],
      ['ฐานราก', ['แรงดันคอนกรีต', 'แผ่นผิว', 'เคร่า', 'ค้ำยัน / ไทร์', 'หลัก → ดิน']],
    ],
    [
      ['Wall', ['Concrete pressure', 'Sheathing', 'Vertical studs', 'Wales', 'Form ties / braces']],
      ['Column', ['Concrete pressure', 'Sheathing', 'Vertical studs', 'Column yokes', 'Bolts / ties']],
      ['Slab', ['Slab load w', 'Deck sheathing', 'Joists', 'Stringers', 'Shores → floor below']],
      ['Beam', ['Beam + slab concrete', 'Soffit', 'Heads', 'Shores', 'Floor below']],
      ['Footing', ['Concrete pressure', 'Sheathing', 'Studs', 'Braces / ties', 'Stakes → soil']],
    ],
    [
      ['墙', ['混凝土侧压力', '面板', '竖楞', '围檩', '对拉螺栓 / 斜撑']],
      ['柱', ['混凝土侧压力', '面板', '竖楞', '柱箍', '螺栓 / 对拉螺栓']],
      ['楼板', ['楼板荷载 w', '底模面板', '次楞', '主楞', '立杆 → 下层楼板']],
      ['梁', ['梁及楼板混凝土', '底模', '横担', '立杆', '下层楼板']],
      ['基础', ['混凝土侧压力', '面板', '竖楞', '斜撑 / 对拉螺栓', '木桩 → 土体']],
    ],
  )
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([name, steps]) => (
        <div key={name} className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <span className="w-16 shrink-0 font-semibold">{name}</span>
          {steps.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className={i === 0 ? 'rounded-md bg-brand-soft px-2 py-1 text-brand' : 'rounded-md bg-white px-2 py-1 ring-1 ring-line'}>{s}</span>
              {i < steps.length - 1 && (
                <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
                  <path d="M0 5h12M9 1l4 4-4 4" stroke={C.lead} strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Form Assembly

const ASM = {
  stud: '#0d9488',
  edge: '#115e59',
  panel: '#fde68a',
  panelLine: '#b45309',
  filler: '#fed7aa',
  fillerLine: '#c2410c',
  wale: '#0f766e',
  tie: '#6d28d9',
  clash: '#dc2626',
  through: '#a8a29e',
  throughLine: '#44403c',
}

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: ReactNode }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.ink} />
      <line x1={x1} y1={y - 6} x2={x1} y2={y + 6} stroke={C.ink} />
      <line x1={x2} y1={y - 6} x2={x2} y2={y + 6} stroke={C.ink} />
      <text x={(x1 + x2) / 2} y={y + 18} fontSize="12.5" textAnchor="middle" fill={C.ink}>
        {label}
      </text>
    </g>
  )
}

/** A stock panel seen from the stud side: plywood, studs at ≤ the spacing, edge studs, its code and thickness. */
export function PanelAnatomyFigure() {
  const L = useL()
  const k = 130
  const x0 = 60
  const y0 = 40
  const W = 2.4 * k
  const H = 1.2 * k
  const b = 0.05 * k
  const centres = Array.from({ length: 7 }, (_, i) => x0 + (0.025 + (i * 2.35) / 6) * k)
  const studFill = (i: number) => (i === 0 || i === 6 ? ASM.edge : ASM.stud)
  const ys = 256
  return (
    <svg {...svgProps(600, 300, L('แผงแบบหล่อมองจากด้านเคร่า', 'Form panel seen from the stud side', '从竖楞一侧看的模板单元'))}>
      <rect x={x0} y={y0} width={W} height={H} fill={C.ply} stroke={C.plyLine} />
      {centres.map((c, i) => (
        <rect key={i} x={c - b / 2} y={y0} width={b} height={H} fill={studFill(i)} />
      ))}
      <line x1={centres[1]} y1={y0 - 10} x2={centres[2]} y2={y0 - 10} stroke={C.ink} />
      <line x1={centres[1]} y1={y0 - 15} x2={centres[1]} y2={y0 - 3} stroke={C.ink} />
      <line x1={centres[2]} y1={y0 - 15} x2={centres[2]} y2={y0 - 3} stroke={C.ink} />
      <text x={(centres[1] + centres[2]) / 2} y={y0 - 17} fontSize="12" textAnchor="middle" fill={C.ink}>
        {L('≤ 40 ซม.', '≤ 40 cm', '≤ 40 cm')}
      </text>
      <DimH x1={x0} x2={x0 + W} y={y0 + H + 14} label={L('กว้าง 2.40 ม.', 'width 2.40 m', '宽 2.40 m')} />
      <line x1={x0 - 14} y1={y0} x2={x0 - 14} y2={y0 + H} stroke={C.ink} />
      <line x1={x0 - 20} y1={y0} x2={x0 - 8} y2={y0} stroke={C.ink} />
      <line x1={x0 - 20} y1={y0 + H} x2={x0 - 8} y2={y0 + H} stroke={C.ink} />
      <text x={x0 - 22} y={y0 + H / 2} fontSize="12.5" textAnchor="middle" fill={C.ink} transform={`rotate(-90 ${x0 - 22} ${y0 + H / 2})`}>
        {L('สูง 1.20 ม.', 'height 1.20 m', '高 1.20 m')}
      </text>
      <Callout x={x0 + 0.2 * k} y={y0 + 0.3 * k} tx={410} ty={52}>
        {L('ไม้อัด 1.22 × 2.44 (เต็มแผ่น)', 'Plywood 1.22 × 2.44 (one sheet)', '胶合板 1.22 × 2.44(整张)')}
      </Callout>
      <Callout x={centres[4]} y={y0 + 0.6 * k} tx={410} ty={92}>
        {L('เคร่า (ไม้ หรือ เหล็ก)', 'Stud (timber or steel)', '竖楞(木或钢)')}
      </Callout>
      <Callout x={centres[6]} y={y0 + 0.95 * k} tx={410} ty={132}>
        {L('เคร่าปิดขอบ', 'Edge stud', '封边竖楞')}
      </Callout>
      <g transform="translate(410 160)">
        <rect width="180" height="40" rx="6" fill={C.ink} />
        <text x="10" y="17" fontSize="12" fill="#fff" fontWeight="600">
          {L('รหัสแผง P-2412', 'Panel code P-2412', '模板编号 P-2412')}
        </text>
        <text x="10" y="32" fontSize="11" fill="#cbd5e1">
          {L('= 2.40 × 1.20 ม. (เดซิเมตร)', '= 2.40 × 1.20 m (decimetres)', '= 2.40 × 1.20 m(分米)')}
        </text>
      </g>
      <text x={x0} y={ys - 8} fontSize="12" fill={C.muted}>
        {L('รูปตัด', 'Section', '剖面')}
      </text>
      <rect x={x0} y={ys} width={W} height={4} fill={C.ply} stroke={C.plyLine} strokeWidth="0.8" />
      {centres.map((c, i) => (
        <rect key={i} x={c - b / 2} y={ys + 4} width={b} height={10} fill={studFill(i)} />
      ))}
      <line x1={x0 + W + 12} y1={ys} x2={x0 + W + 12} y2={ys + 14} stroke={C.ink} />
      <line x1={x0 + W + 7} y1={ys} x2={x0 + W + 17} y2={ys} stroke={C.ink} />
      <line x1={x0 + W + 7} y1={ys + 14} x2={x0 + W + 17} y2={ys + 14} stroke={C.ink} />
      <text x={x0 + W + 20} y={ys + 32} fontSize="12" textAnchor="end" fill={C.ink}>
        {L('ความหนาแผง = ไม้อัด + ความลึกเคร่า', 'Panel thickness = plywood + stud depth', '模板厚度 = 胶合板 + 竖楞高度')}
      </text>
    </svg>
  )
}

/** Plans of how the faces meet at the corners: a column/footing (A, C run through) and a beam (sides past the soffit). */
export function AssemblyPlanFigure() {
  const L = useL()
  const t = 14
  const face = (x: number, y: number, w: number, h: number, through: boolean) => (
    <rect x={x} y={y} width={w} height={h} fill={through ? ASM.through : ASM.panel} stroke={through ? ASM.throughLine : ASM.panelLine} />
  )
  const tag = (x: number, y: number, s: string) => (
    <text x={x} y={y} fontSize="14" fontWeight="700" textAnchor="middle" fill={C.ink}>
      {s}
    </text>
  )
  return (
    <svg {...svgProps(600, 225, L('การต่อมุมของแผงในชุดประกอบ', 'How the panels meet at the corners', '模板在转角处的拼接'))}>
      <Defs id="ap" />
      <rect x="110" y="50" width="110" height="110" fill="url(#ap-hatch)" stroke={C.concLine} />
      {face(110 - t, 50 - t, 110 + 2 * t, t, true)}
      {face(110 - t, 160, 110 + 2 * t, t, true)}
      {face(220, 50, t, 110, false)}
      {face(110 - t, 50, t, 110, false)}
      {tag(165, 28, 'A')}
      {tag(250, 110, 'B')}
      {tag(165, 194, 'C')}
      {tag(80, 110, 'D')}
      <text x="165" y="216" fontSize="12" textAnchor="middle" fill={C.muted}>
        {L('เสา / ฐานราก (แปลน) — A, C ทะลุมุม', 'Column / footing (plan) — A, C run through', '柱 / 基础(平面)—— A、C 贯通转角')}
      </text>
      <rect x="420" y="40" width="80" height="120" fill="url(#ap-hatch)" stroke={C.concLine} />
      {face(420 - t, 40, t, 120 + t, true)}
      {face(500, 40, t, 120 + t, true)}
      {face(420, 160, 80, t, false)}
      <Callout x={420 - t / 2} y={90} tx={350} ty={90}>
        {L('ข้างคาน', 'Side', '侧模')}
      </Callout>
      <Callout x={460} y={160 + t / 2} tx={380} ty={200}>
        {L('ท้องคาน (กว้างพอดี)', 'Soffit (exact width)', '底模(宽度精确)')}
      </Callout>
      <text x="460" y="24" fontSize="12" textAnchor="middle" fill={C.muted}>
        {L('คาน (รูปตัด) — ข้างคานทะลุมุม', 'Beam (section) — sides run through', '梁(剖面)—— 侧模贯通')}
      </text>
    </svg>
  )
}

/** One face of an assembly: two courses of stock panels with a filler, joints staggered, wales and form ties. */
export function FaceLayoutFigure() {
  const L = useL()
  const k = 80
  const x0 = 70
  const y0 = 20
  const Y = (m: number) => y0 + (2.4 - m) * k
  const courses: { h0: number; panels: [string, number, boolean?][] }[] = [
    { h0: 0, panels: [['P-2412', 2.4], ['F-20x120', 0.2, true], ['P-2412', 2.4]] },
    { h0: 1.2, panels: [['P-1212', 1.2], ['P-2412', 2.4], ['F-20x120', 0.2, true], ['P-1212', 1.2]] },
  ]
  const wales = [0.3, 0.9, 1.5, 2.1]
  const CLASH = 3.65
  const ties = (y: number) => (y === 2.1 ? [0.6, 1.8, CLASH, 4.4] : [0.6, 1.8, 3.0, 4.4])
  return (
    <svg {...svgProps(680, 260, L('รูปด้านของด้านหนึ่งในชุดประกอบ', 'Elevation of one face of an assembly', '组装中一个面的立面'))}>
      {courses.map((c, ci) => {
        let x = 0
        return c.panels.map(([code, w, filler], i) => {
          const px = x0 + x * k
          x += w
          const cx = px + (w * k) / 2
          const cy = Y(c.h0 + 0.6)
          return (
            <g key={`${ci}-${i}`}>
              <rect x={px} y={Y(c.h0 + 1.2)} width={w * k} height={1.2 * k} fill={filler ? ASM.filler : ASM.panel} stroke={filler ? ASM.fillerLine : ASM.panelLine} />
              <text x={cx} y={cy + 4} fontSize={filler ? 9.5 : 12} textAnchor="middle" fill={C.ink} transform={filler ? `rotate(-90 ${cx} ${cy})` : undefined}>
                {code}
              </text>
            </g>
          )
        })
      })}
      {wales.map((y) => (
        <line key={y} x1={x0 - 10} y1={Y(y)} x2={x0 + 5 * k + 10} y2={Y(y)} stroke={ASM.wale} strokeWidth="4" />
      ))}
      {wales.flatMap((y) => ties(y).map((x) => <circle key={`${y}-${x}`} cx={x0 + x * k} cy={Y(y)} r="4.5" fill={x === CLASH ? ASM.clash : ASM.tie} stroke="#fff" strokeWidth="1.2" />))}
      <text x={x0 - 16} y={Y(0.6) + 4} fontSize="12" textAnchor="end" fill={C.muted}>
        {L('ชั้น 1', 'Course 1', '第 1 层')}
      </text>
      <text x={x0 - 16} y={Y(1.8) + 4} fontSize="12" textAnchor="end" fill={C.muted}>
        {L('ชั้น 2', 'Course 2', '第 2 层')}
      </text>
      <DimH x1={x0} x2={x0 + 5 * k} y={Y(0) + 14} label={L('ด้าน A ยาว 5.00 ม. = 2.40 + 0.20 + 2.40', 'Face A, 5.00 m = 2.40 + 0.20 + 2.40', '面 A 长 5.00 m = 2.40 + 0.20 + 2.40')} />
      <Callout x={x0 + 2.5 * k} y={Y(0.12)} tx={500} ty={Y(0.12)}>
        {L('แผงเสริม', 'Filler panel', '补缺模板')}
      </Callout>
      <Callout x={x0 + 5 * k + 6} y={Y(1.5)} tx={500} ty={Y(1.5)}>
        {L('คานรับเคร่า (ตามที่ออกแบบ)', 'Wale (as designed)', '围檩(按设计)')}
      </Callout>
      <Callout x={x0 + 4.4 * k} y={Y(0.9)} tx={500} ty={Y(0.9)}>
        Form tie
      </Callout>
      <Callout x={x0 + CLASH * k} y={Y(2.1)} tx={500} ty={Y(2.4) + 2}>
        {L('tie ใกล้รอยต่อ < 10 ซม.', 'Tie < 10 cm from a joint', '螺栓距拼缝 < 10 cm')}
      </Callout>
    </svg>
  )
}
