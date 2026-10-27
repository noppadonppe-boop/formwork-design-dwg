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
