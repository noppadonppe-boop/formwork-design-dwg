# 04 — Wall, Column and Footing Formwork (Design Basis)

Source: "Design Form Work", Dr. Ekasit Limsuwan (ดร.เอกสิทธิ์ ลิ้มสุวรรณ), Chulalongkorn University.
Chapter 8 (book p.259–318), Chapter 9 (book p.319–371), Chapter 10 (book p.372–423).
Extracted from scanned page images (PDF p133–p216). Book page numbers are cited as `[p.NNN]`.

Units used by the book (keep them in the calculator, convert at the UI): kg (กก.), cm, m;
pressure kg/m² (กก./ม.²); stresses kg/cm² (กก./ซม.²); line load W in kg/cm or kg/m as noted.
Lumber nominal sizes in inches, but the book uses **dressed/actual** dimensions in calcs:
1½"×3" → b = 3.7 (sometimes 3.75) cm, d = 7.5 cm; 2"×4" → b = 5 cm, d = 10 cm (book takes nominal 5×10 for 2×4).

Equation references in the book that are used here (defined in earlier chapters, see other design-basis files):
- Eq 2.12 liquid head: `P = γ·H` (γ = 2,400 kg/m³)
- Eq 2.13 (CEB, setting/rate effect): `Ps = 2,400·K·R + 500` (kg/m²); K from Table 2.2 (K = 0.65 at 30 °C, used in all examples); R = rate of rise m/h
- Eq 2.14 (CEB, narrow-form effect): `Pa = 300·R + 10,000·d + 1,500` (kg/m²); d = wall/form thickness (m)
- CEB rule: design pressure = **minimum** of {P liquid (2.12), Ps (2.13), Pa (2.14)}  (book: "เลือกค่าต่ำที่สุด")
- Table 5.3 / continuous beam (≥3 spans): `M = W·l²/10`; Eq 5.9 `V = (5/8)·W·l` (book uses 5/8 W l for max shear in steel examples; see notes)
- Eq 5.7 `Fb = 6M/(b·d²)` ; Eq 5.4 `S = M/F` ; Eq 5.2 `σ = M/S`
- Eq 5.28 deflection (continuous): `Δ = W·l⁴ / (128·E·I)`; limit `Δallow = l/360`
- Eq 5.30 span from deflection: `l = ∛( (128/360)·E·I / W )` (Δ = l/360); also used `a = 0.71·∛(EI/W)` ≈ same
- Eq 5.14 shear stress (steel channel): `v = V/(b_w·d)`
- Eq 5.15 timber column (shore/brace) allowable: `Fa = 0.30·E/(l/d)²`
- Eq 5.16 `P = Fa·A`
- Eq 5.17 steel pipe column: `Fa = 1,250 − 0.033·(l/r)²` (kg/cm²)
- Table 3.5: soft wood tension parallel to grain `F// = 80 kg/cm²`
- Table 4.6: form-tie safe loads (ø3/8" → 2,100 kg; ø1/2" → 2,800 kg)
- Table 4.7: hanger (ตัวแขวน) capacities (ø3/8" → 1,200 kg) — only on the tail of Ch.7 [p.258]

Material constants used in the examples:
| Material | E (kg/cm²) | Fb (kg/cm²) | Fv / other |
|---|---|---|---|
| Plywood (ไม้อัด) | 115,500 | 135 | — |
| Soft wood / ไม้ยาง (rubber wood) studs, wales, braces | 94,100 | 80 | F// tension 80 |
| Steel (cold-formed / hot-rolled shapes) | 2.0×10⁶ | 1,200 (Ex 8.2/8.3), tables use fy = 2,500 | va = 0.50×2,400 = 1,200 |
| Concrete nail ø4 mm | — | allow 1,200 kg/cm² shear → 150 kg / nail | — |

---

## PART A — CHAPTER 8: WALL FORMWORK (แบบหล่อกำแพง) [p.259–318]

### A.1 Classification [p.259–260]
By construction method, 3 main types:
1. **Built-in-place (แบบสร้างในที่)** — for low reuse or special shapes; sheathing of plywood, timber studs; member sizes by tie spacing, concrete type and placement.
2. **Semi-prefabricated (แบบกึ่งสำเร็จรูป)** — most common: prefabricated panels (plywood or other) with walers/wales, or a special structure resisting lateral pressure; flexible sizing.
3. **Prefabricated / gang forms (แบบสำเร็จรูป)** — large heavy panels needing crane, bolted together at a few points, few ties; high reuse in one project.
Choice by cost comparison of quantity of formwork vs reuse rate.

### A.2 Components (ชิ้นส่วนประกอบ) — Fig 8.1 [p.260–266]
Fig 8.1 (elevation + section): sheathing panel with vertical studs; double horizontal wales (คานแนวราบรับเคร่า) on the studs; form ties (เหล็กยึดรั้ง) passing through the wall between the double wales; strongbacks (คานเสริมหลัง, vertical, outside the wales) at intervals; inclined lateral braces (ค้ำยันทางข้าง) from strongback/top wale to ground; top plate (ขอบแบบบน, "คานแนวราบรับเคร่า" at top); bottom plate/sill (ธรณีแบบ) on a kicker (ขอบเตะแบบ); thickness spreader (ตัวบังคับความหนา).

| Thai | English | Function / typical |
|---|---|---|
| แผ่นผิว | Sheathing | Formerly boards ¾"×8", ¾"×10", 1"×8", 1"×10" (joints leak, shrink; fix with oil-paint/tape). Now plywood 6–25 mm or prefabricated panels (steel/aluminium-framed). Thickness governed by pressure and stud spacing. |
| เคร่ายึดแผ่นผิว (เคร่าตั้ง) | Studs | Usually **vertical only**. Timber, steel or aluminium. Size depends on wale spacing; stud spacing controlled by sheathing thickness/strength. |
| คานแนวราบรับเคร่า | Wales (walers) | Horizontal, collect stud reactions, supported at points by ties and braces. Usually **double members** (คานคู่) so ties pass between them; square-ish section to resist overturning/sag. |
| คานเสริมหลัง | Strongbacks | Vertical, outside wales, mainly to attach braces and keep form vertical/straight; spaced to match tie points (every tie point or every 2nd); may become a truss for tall walls; equalise tie loads; prevent twisting. |
| เหล็กยึดรั้ง | Form ties | Bolted at both ends through the form; supports the wales and controls wall thickness. In service a **tension** member (pressures balance both sides). Before pour must take wind (tension **and compression**). Load = pressure × tributary area (Fig 8.4). |
| ค้ำยันทางข้าง | Lateral braces / kickers | Keep form plumb; inclined to the ground slab; must resist compressive load under assumed lateral loads. If braced on one side only, must take tension too (bolted/nailed connections). |
| ธรณีแบบ | Bottom plate / sill | Closes the bottom ends of studs; with top plate acts as lifting edges; must resist lifting at ≥4 points during erection; aligns form. Nailed to slab with concrete nails. After pour wales/strongbacks take pressure. |
| ขอบแบบบน | Top plate | Like sill at top; keeps form in plane during lifting/erection. |
| ขอบเตะแบบ | Kicker | Concrete/mortar strip ≥ 2 cm high cast with the floor slab along wall line; locates and levels form; can embed water-stop. |
| ตัวบังคับความหนา | Spreader | Keeps the two faces at wall thickness. Timber 1"×1" or 1½"×1½" cut to wall thickness, tied with wire and pulled out during pour (not popular). Today form ties with cones/spreader function are used. |
| เหล็กเดือยหมู | Embedded anchor bolts (she-bolt dowels) | Fig 8.3a: hooked bars cast in previous lift to anchor single-sided / very thick wall forms without ground support; Fig 8.3b form ties used for normal 2-sided walls. Details in Ch.10 [sic — book says บทที่ 10]. |

### A.3 Assembly sequence [p.266–268]
1. Check line, level and wall thickness.
2. Choose bracing points/method to suit site.
3. Cast kicker (ขอบเตะแบบ) with floor (or previous lift).
4. Assemble sheathing to studs, sill and top plate as per details (job-built or prefab panels).
5. Fix reinforcement plumb and in line both layers, with spacers between layers and cover blocks.
6. Lift first side; fix sill to kicker with concrete nails so bottom fits kicker (line & level reference).
7. Plumb/align with temporary braces; check rebar and cover; place form ties through the erected side; lift second side and connect.
8. Install wales row by row from bottom up with ties; tighten against spreaders.
9. Install strongbacks at specified spacing, tighten with ties (only for very tall walls).
10. Install lateral braces at every row; adjust plumb/line; fix.
11. Build temporary working platform and hopper/chute for placing.
Note: tie installation — fix one end of each tie to the first erected side, tighten into wales so ties are perpendicular; the second side then slides over aligned ties.

**Stripping** = reverse: after required age remove braces, loosen ties, remove wales and strongbacks, remove sill nails, lift panels. Erection may start at any corner; stripping usually starts from middle panels toward ends/corners (corners have ties in several directions).

### A.4 Design (การคำนวณออกแบบ) [p.268–283]

**Lateral pressure** — per section 2.10, 3 methods ACI-347, CEB, CIRA. Parameters: concrete slump, rate of placement, temperature, wall height. Use the **maximum** pressure computed and assume it **uniform over the whole panel** (for simplicity and uniform construction). (Note: Ex 8.1 note [p.295] says for tall walls the pressure distribution with depth may be used per Ch.2 — variable spacing with depth not worked in this chapter.)

**Sheathing**: governed by strength and deflection of sheathing material (sections 5.2, 5.7). Choose stud spacing and sheathing thickness from allowable pressure Tables 8.1–8.3.

**Studs**: in practice choose stud size first, then find wale spacing (span of stud) satisfying strength and deflection. Tables 8.4–8.5 give allowable wale spacing for given stud size, stud spacing and pressure. Steel tables based on fy = 2,500 kg/cm².

**Wales**: continuous beam supported at ties; tie spacing controlled by wale size. Usually double members; ties pass between, plate washers bear on both. Plastic cone washers allow re-tightening. Tables 8.6–8.7 give tie spacing for double wales with load per metre = pressure × wale spacing (assuming wale spacing 100 cm in the table heading, load uniform).

**Form ties**: tension = max pressure × tributary area (wale spacing × tie spacing) (Fig 8.4: dashed rectangle around a tie between adjacent wales/ties). Equivalently = reaction of wale. Choose prefabricated tie (section 4.5, Table 4.6) or design: check thread/anchor at both ends and the bearing of washer plate on wale (crushing perpendicular to grain).

**Bottom plate & top plate**: during lifting, no wales yet: plate acts as beam carrying studs and sheathing; lift at corners; weight × impact factor 1.2–1.5 (Fig 8.5 practice uses **1.5**); check bending, shear, deflection; size not smaller than studs.

**Strongbacks (เสริมหลัง)**: stiffen large panels against twisting during lifting (Fig 8.5 photo). Design for lifting points, wales take axial, strongback takes transverse; impact factor 1.5.

**Lateral braces** [p.282]: ties take all concrete pressure; braces take wind on panels during construction and accidental unbalanced loads. Wind for Thailand 50–100 kg/m². Unbalanced pressure: ACI-347 suggests 10–20 % of max pressure; Maklin suggests 1,500 kg/m². Spacing matched to strongbacks/studs/panel length. Brace force = horizontal force / cos θ (compressive); design as column (section 5.4). One-sided bracing must also take tension → check tension and end connections. Tables 8.8–8.9 brace capacities.

Brace load cases used in the examples (per 1 m of wall, brace at 60° to horizontal):
1. Wind: `F = w·H·1.0 / cos60°` (w = 50 kg/m²)
2. Unequal concrete level both sides (Δh): `F = (γ·1.0·Δh²/2)/cos60°` (book Ex 8.1 writes `/2` then divides; see numbers)
3. Eccentricity of wall (≤10 % of thickness): moment = wall weight × e; horizontal = M/H; `F = (M/H)/cos60°`
→ use the largest.

### A.5 Allowable-load tables (Ch.8)
Superscript 1 = governed by shear (ควบคุมโดยแรงตัด) where printed; 2 = governed by deflection. Values below with superscripts dropped except where noted.

**Table 8.1 Allowable concrete pressure on board sheathing (kg/m²)** — rows board thickness (in), columns stud spacing (cm)
| t (in) | 15 | 20 | 30 | 40 | 60 | 80 | 120 |
|---|---|---|---|---|---|---|---|
| 1/2 | 8,500¹ | 4,800¹ | 1,730² | 730² | 215² | 90² | 25² |
| 3/4 | 20,800¹ | 11,700¹ | 5,195¹ | 2,870² | 840² | 360² | 100² |
| 1 | 36,950¹ | 20,800¹ | 9,235¹ | 5,200¹ | 2,000² | 850² | 250² |
| 1½ | 83,550¹ | 47,000¹ | 20,850¹ | 11,750¹ | 5,215¹ | 2,900² | 850² |

**Table 8.2 Allowable concrete pressure on plywood sheathing (kg/m²)**
| t (mm) | 15 | 20 | 30 | 40 | 60 | 80 | 120 |
|---|---|---|---|---|---|---|---|
| 3.2 | 325² | 130² | 40² | 15² | 5² | 2² | — |
| 4 | 645² | 250² | 80² | 30² | 10² | 4² | — |
| 6 | 2,190² | 900² | 250² | 115² | 30² | 10² | 4² |
| 10 | 10,000¹ | 4,250² | 1,250² | 530² | 150² | 60² | 20² |
| 15 | 22,500¹ | 12,650² | 4,250² | 1,775² | 500² | 200² | 50² |
| 20 | 40,000¹ | 22,500¹ | 10,100² | 4,250² | 1,250² | 525² | 150² |
(Values < 1 kg/m² not recorded.)

**Table 8.3 Allowable concrete pressure on steel plate sheathing (kg/m²)**
| t (mm) | 15 | 20 | 30 | 40 | 60 | 80 | 120 |
|---|---|---|---|---|---|---|---|
| 2.3 | 2,150² | 900² | 250² | 110² | 30² | 10² | 4² |
| 3.0 | 4,925² | 2,085² | 600² | 250² | 75² | 30² | 8² |
| 3.2 | 5,800² | 2,450² | 725² | 300² | 90² | 35² | 10² |
| 4.5 | 16,300² | 6,890² | 2,040² | 850² | 250² | 100² | 30² |
| 6.0 | 33,330¹ | 16,300² | 4,830² | 2,025² | 600² | 250² | 75² |

**Table 8.4 Allowable wale spacing (cm) for timber studs** (columns = stud spacing cm; rows = pressure kg/m²). Lumber: soft wood (ไม้ยาง/ไม้กระบาก). Mostly shear-governed (¹).
| P | 1½×3: 15 | 20 | 30 | 40 | 50 | 60 | 2×4: 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 130 | 115 | 95 | 80 | 70 | 65 | 210 | 180 | 145 | 125 | 115 | 105 |
| 2,000 | 95 | 80 | 65 | 55 | 50 | 45 | 145 | 125 | 105 | 90 | 80 | 70 |
| 3,000 | 75 | 65 | 55 | 45 | 40 | 35 | 120 | 105 | 85 | 70 | 65 | 60 |
| 4,000 | 65 | 55 | 45 | 40 | 35 | 30 | 105 | 90 | 70 | 60 | 55 | 50 |
| 5,000 | 60 | 50 | 40 | 35 | 30 | 30 | 90 | 80 | 65 | 55 | 50 | 45 |
| 6,000 | 55 | 45 | 35 | 30 | 30 | 25 | 85 | 70 | 60 | 50 | 45 | 40 |
| 7,000 | 50 | 40 | 35 | 30 | 25 | 25 | 80 | 65 | 55 | 45 | 40 | 35 |
| 8,000 | 45 | 40 | 30 | 25 | 25 | 20 | 70 | 60 | 50 | 45 | 40 | 35 |
| 9,000 | 40 | 35 | 30 | 25 | 20 | 20 | 70 | 60 | 45 | 40 | 35 | 35 |
| 10,000 | 40 | 35 | 30 | 25 | 20 | 20 | 65 | 55 | 45 | 40 | 35 | 30 |

**Table 8.5 Allowable wale spacing (cm) for steel studs** (fy = 2,500 kg/cm²; same layout; columns stud spacing 15/20/30/40/50/60 cm)

8.5 ก — Angle L40×40×4 | Angle L50×50×5
| P | 15 | 20 | 30 | 40 | 50 | 60 | 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 110 | 95 | 80 | 65 | 60 | 55 | 170 | 150 | 120 | 100 | 90 | 85 |
| 2,000 | 80 | 65 | 55 | 45 | 40 | 40 | 120 | 105 | 85 | 75 | 65 | 60 |
| 3,000 | 65 | 55 | 45 | 40 | 35 | 30 | 100 | 85 | 70 | 60 | 50 | 50 |
| 4,000 | 55 | 45 | 40 | 30 | 30 | 25 | 85 | 75 | 60 | 50 | 45 | 40 |
| 5,000 | 50 | 40 | 35 | 30 | 25 | 25 | 75 | 65 | 50 | 45 | 40 | 35 |
| 6,000 | 45 | 40 | 30 | 25 | 25 | 20 | 70 | 60 | 50 | 40 | 35 | 35 |
| 7,000 | 40 | 35 | 30 | 25 | 20 | 20 | 55 | 55 | 45 | 40 | 35 | 30 |
| 8,000 | 40 | 30 | 25 | 20 | 20 | 20 | 60 | 50 | 40 | 35 | 30 | 30 |
| 9,000 | 35 | 30 | 25 | 20 | 20 | 15 | 55 | 50 | 40 | 35 | 30 | 25 |
| 10,000 | 35 [uncertain] | 30 | 25 | 20 | 15 | 15 | 40 | 45 | 35 | 30 | 30 | 25 |
(7,000/L50/15 printed "55"[uncertain]; 10,000/L50 row printed as shown — scan values, non-monotonic.)

8.5 ข — Channel [75×40×5 | Channel [100×50×5
| P | 15 | 20 | 30 | 40 | 50 | 60 | 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 330² | 300² | 260² | 240² | 220² | 205 | 450² | 410² | 355² | 325² | 300² | 280 |
| 2,000 | 260² | 240² | 205 | 175 | 155 | 145 | 355² | 325² | 280 | 240 | 215 | 195 |
| 3,000 | 230² | 205 | 165 | 145 | 130 | 115 | 310² | 280 | 230 | 200 | 175 | 160 |
| 4,000 | 205 | 175 | 145 | 125 | 110 | 100 | 280 | 240 | 200 | 170 | 150 | 140 |
| 5,000 | 180 | 155 | 130 | 110 | 100 | 90 | 250 | 215 | 175 | 150 | 135 | 125 |
| 6,000 | 165 | 145 | 115 | 100 | 90 | 80 | 230 | 195 | 160 | 140 | 125 | 110 |
| 7,000 | 155 | 130 | 105 | 95 | 85 | 75 | 210 | 180 | 150 | 130 | 115 | 105 |
| 8,000 | 145 | 125 | 100 | 85 | 80 | 70 | 195 | 170 | 140 | 120 | 105 | 100 |
| 9,000 | 135 | 115 | 95 | 80 | 75 | 65 | 185 | 160 | 130 | 110 | 100 | 90 |
| 10,000 | 130 | 110 | 90 | 80 | 70 | 60 | 175 | 150 | 125 | 105 | 95 | 85 |

8.5 ค — Light channel [60×30×2.3 | Light channel [80×40×2.3
| P | 15 | 20 | 30 | 40 | 50 | 60 | 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 165² | 170 | 140 | 120 | 105 | 95 | 250² | 230 | 190² | 165 | 145 | 135 |
| 2,000 | 140 | 120 | 95 | 85 | 75 | 70 | 190 | 165 | 135 | 115 | 100 | 95 |
| 3,000 | 115 | 95 | 80 | 70 | 60 | 55 | 155 | 135 | 110 | 95 | 85 | 75 |
| 4,000 | 95 | 85 | 70 | 60 | 50 | 50 | 135 | 115 | 95 | 80 | 70 | 65 |
| 5,000 | 85 | 75 | 60 | 50 | 45 | 40 | 120 | 100 | 85 | 70 | 65 | 60 |
| 6,000 | 80 | 70 | 55 | 50 | 40 | 40 | 110 | 95 | 75 | 65 | 60 | 55 |
| 7,000 | 75 | 65 | 50 | 45 | 40 | 35 | 100 | 85 | 70 | 60 | 55 | 50 |
| 8,000 | 70 | 60 | 50 | 40 | 35 | 35 | 95 | 80 | 65 | 55 | 50 | 45 |
| 9,000 | 65 | 55 | 45 | 40 | 35 | 30 | 90 | 75 | 60 | 55 | 45 | 45 |
| 10,000 | 60 | 50 | 40 | 35 | 30 | 30 | 85 | 70 | 60 | 50 | 45 | 40 |

8.5 ง — Lipped channel [60×30×10×2.3 | [75×45×15×2.3
| P | 15 | 20 | 30 | 40 | 50 | 60 | 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 195² | 175² | 145 | 125 | 110 | 100 | 260² | 235² | 200 | 175 | 155 | 140 |
| 2,000 | 150 | 125 | 100 | 90 | 80 | 70 | 210 | 175 | 140 | 120 | 110 | 100 |
| 3,000 | 120 | 100 | 85 | 70 | 65 | 60 | 170 | 140 | 115 | 100 | 90 | 80 |
| 4,000 | 105 | 90 | 70 | 60 | 55 | 50 | 145 | 120 | 100 | 85 | 75 | 70 |
| 5,000 | 95 | 80 | 65 | 55 | 50 | 45 | 130 | 110 | 90 | 75 | 70 | 60 |
| 6,000 | 85 | 70 | 60 | 50 | 45 | 40 | 120 | 100 | 80 | 70 | 60 | 55 |
| 7,000 | 80 | 65 | 55 | 45 | 40 | 35 | 110 | 90² | 75 | 65 | 55 | 50 |
| 8,000 | 75 | 60 | 50 | 45 | 40 | 35 | 100 | 85 | 70 | 60 | 55 | 50 |
| 9,000 | 70 | 60 | 45 | 40 | 35 | 35 | 95 | 80 | 65 | 55 | 50 | 45 |
| 10,000 | 65 | 55 | 45 | 40 | 35 | 30 | 90 | 75 | 60 | 55 | 45 | 45 |

8.5 ง (cont.) — Lipped channel [100×50×20×2.3 | [150×50×20×2.3
| P | 15 | 20 | 30 | 40 | 50 | 60 | 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 335² | 305² | 255 | 220 | 200 | 180 | 460² | 415 | 340 | 295 | 260 | 240 |
| 2,000 | 265 | 220 | 180 | 155 | 140 | 125 | 355 | 295 | 240 | 205 | 185 | 170 |
| 3,000 | 215 | 180 | 150 | 130 | 115 | 105 | 290 | 240 | 195 | 170 | 150 | 135 |
| 4,000 | 185 | 155 | 125 | 110 | 100 | 90 | 250 | 205 | 170 | 145 | 130 | 120 |
| 5,000 | 170 | 140 | 115 | 100 | 85 | 80 | 225 | 185 | 150 | 130 | 115 | 105 |
| 6,000 | 150 | 125 | 105 | 90 | 80 | 75 | 205 | 170 | 135 | 120 | 105 | 95 |
| 7,000 | 140 | 115 | 95 | 85 | 75 | 65 | 185 | 155 | 125 | 110 | 100 | 90 |
| 8,000 | 130 | 110 | 90 | 75 | 70 | 65 | 175 | 145 | 120 | 105 | 90 | 85 |
| 9,000 | 125 | 105 | 85 | 75 | 65 | 60 | 165 | 135 | 110 | 95 | 85 | 80 |
| 10,000 | 120 | 100 | 80 | 70 | 60 | 55 | 155 | 130 | 105 | 90 | 80 | 75 |

8.5 จ — Light square tube □25×50×1.6 | □50×50×1.6
| P | 15 | 20 | 30 | 40 | 50 | 60 | 15 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,000 | 130 | 110 | 90 | 80 | 70 | 65 | 195² | 180² | 155² | 140 | 125 | 115 |
| 2,000 | 90 | 80 | 65 | 55 | 50 | 45 | 155² | 140 | 115 | 100 | 85 | 80 |
| 3,000 | 75 | 65 | 50 | 45 | 40 | 35 | 130 | 115 | 90 | 80 | 70 | 65 |
| 4,000 | 65 | 55 | 45 | 40 | 35 | 30 | 115 | 100 | 80 | 70 | 60 | 55 |
| 5,000 | 55 | 50 | 40 | 35 | 30 | 25 | 100 | 85 | 70 | 60 | 55 | 50 |
| 6,000 | 50 | 45 | 35 | 30 | 30 | 25 | 90 | 80 | 65 | 55 | 50 | 45 |
| 7,000 | 50 | 40 | 35 | 30 | 25 | 20 | 85 | 75 | 60 | 50 | 45 | 40 |
| 8,000 | 45 | 40 | 30 | 25 | 25 | 20 | 80 | 70 | 55 | 50 | 40 | 40 |
| 9,000 | 40 | 35 | 30 | 25 | 20 | 20 | 75 | 65 | 50 | 45 | 40 | 35 |
| 10,000 | 40 | 35 | 25 | 25 | 20 | 20 | 70 | 60 | 50 | 40 | 35 | 35 |
(Headline printed "25×50×1.6" for the first tube.)

**Table 8.6 Tie spacing (cm) for double timber wales** — row = load on wale kg/m (= pressure × wale spacing); "considering wale spacing 100 cm". All shear-governed.
| w (kg/m) | 2-1½"×3" | 2-2"×2" | 2-2"×4" | 2-3"×3" | 2-4"×4" | 2-6"×6" |
|---|---|---|---|---|---|---|
| 1,000 | 70 | 55 | 115 | 105 | 160 | 300 |
| 2,000 | 50 | 40 | 80 | 70 | 115 | 210 |
| 3,000 | 40 | 30 | 65 | 60 | 90 | 170 |
| 4,000 | 35 | 25 | 55 | 50 | 80 | 150 |
| 5,000 | 30 | 25 | 50 | 45 | 70 | 130 |
| 6,000 | 30 | 20 | 45 | 40 | 65 | 120 |
| 7,000 | 25 | 20 | 40 | 40 | 60 | 110 |
| 8,000 | 25 | 20 | 40 | 35 | 55 | 105 |
| 9,000 | 25 | 15 | 35 | 35 | 50 | 100 |
| 10,000 | 20 | 15 | 35 | 30 | 50 | 95 |

**Table 8.7 Tie spacing (cm) for double steel wales** (row = kg/m)
ก Angles: 2-L25×25×3 | 2-L30×30×3 | 2-L40×40×3 | 2-L40×40×4 | 2-L50×50×4 | 2-L50×50×5
| w | a | b | c | d | e | f |
|---|---|---|---|---|---|---|
| 1,000 | 30 | 40 | 50 | 60 | 75 | 95 |
| 2,000 | 20 | 25 | 35 | 40 | 55 | 65 |
| 3,000 | 20 | 20 | 30 | 35 | 45 | 55 |
| 4,000 | 15 | 20 | 25 | 30 | 35 | 45 |
| 5,000 | 15 | 15 | 20 | 25 | 35 | 40 |
| 6,000 | 10 | 15 | 20 | 25 | 30 | 35 |
| 7,000 | 10 | 15 | 20 | 20 | 30 | 35 |
| 8,000 | 10 | 10 | 15 | 20 | 25 | 30 |
| 9,000 | 10 | 10 | 15 | 20 | 25 | 30 |
| 10,000 | 10 | 10 | 15 | 20 | 25 | 30 |

ข Channels: 2-[75×40×5 | 2-[100×50×5 | 2-[125×65×6 | 2-[150×75×6.5 | 2-[180×75×7 | 2-[200×80×7.5
| w | a | b | c | d | e | f |
|---|---|---|---|---|---|---|
| 1,000 | 220² | 300² | 395² | 500² | 505² | 655² |
| 2,000 | 160 | 215 | 290 | 380 | 435 | 490 |
| 3,000 | 130 | 175 | 235 | 310 | 355 | 400 |
| 4,000 | 110 | 150 | 205 | 265 | 310 | 345 |
| 5,000 | 100 | 135 | 180 | 240 | 275 | 310 |
| 6,000 | 90 | 125 | 165 | 215 | 250 | 285 |
| 7,000 | 85 | 115 | 155 | 200 | 230 | 260 |
| 8,000 | 80 | 105 | 145 | 190 | 220 | 245 |
| 9,000 | 75 | 100 | 135 | 175 | 205 | 230 |
| 10,000 | 70 | 95 | 130 | 170 | 195 | 220 |

ค I-beams: 2-I100×75×5 | 2-I125×75×5.5 | 2-I150×75×5.5 | 2-I200×100×9 | 2-I200×150×9
| w | a | b | c | d | e |
|---|---|---|---|---|---|
| 1,000 | 345² [uncertain] | 425² | 490² | 675² | 865² |
| 2,000 | 265 | 325 | 365 | 520 | 685² |
| 3,000 | 210 | 265 | 300 | 425 | 600² |
| 4,000 | 185 | 230 | 260 | 365 | 525 |
| 5,000 | 165 | 200 | 230 | 325 | 470 |
| 6,000 | 150 | 185 | 210 | 300 | 430 |
| 7,000 | 140 | 175 | 195 | 275 | 400 |
| 8,000 | 130 | 160 | 185 | 260 | 370 |
| 9,000 | 125 | 150 | 170 | 245 | 350 |
| 10,000 | 115 | 145 | 165 | 230 | 330 |

ง Light channels: 2-[60×30×2.3 | 2-[80×40×2.3 | 2-[100×50×2.3 | 2-[100×50×3.2 | 2-[150×75×4.0
| w | a | b | c | d | e |
|---|---|---|---|---|---|
| 1,000 | 105 | 145 | 185 | 215 | 365 |
| 2,000 | 75 | 100 | 130 | 150 | 255 |
| 3,000 | 60 | 85 | 105 | 120 | 210 |
| 4,000 | 50 | 70 | 90 | 105 | 180 |
| 5,000 | 45 | 65 | 80 | 95 | 160 |
| 6,000 | 40 | 60 | 75 | 85 | 150 |
| 7,000 | 40 | 55 | 65 | 80 | 135 |
| 8,000 | 35 | 50 | 65 | 75 | 130 |
| 9,000 | 35 | 45 | 60 | 70 | 120 |
| 10,000 | 30 | 45 | 55 | 65 | 115 |

จ Lipped channels: 2-[60×30×10×2.3 | 2-[75×45×15×2.3 | 2-[100×50×20×2.3 | 2-[150×50×20×2.3
| w | a | b | c | d |
|---|---|---|---|---|
| 1,000 | 110 | 155 | 200 | 265 |
| 2,000 | 80 | 110 | 140 | 185 |
| 3,000 | 65 | 90 | 115 | 150 |
| 4,000 | 55 | 75 | 100 | 130 |
| 5,000 | 50 | 70 | 85 | 115 |
| 6,000 | 45 | 60 | 80 | 105² |
| 7,000 | 40 | 55 | 75 | 100 |
| 8,000 | 40 | 55 | 70 | 90 |
| 9,000 | 35 | 50 | 65 | 85 |
| 10,000 | 35 | 45 | 60 | 80 |

ฉ Light square/rect tubes: 2-□25×25×1.6 | 2-□38×38×1.6 | 2-□50×50×2.3 | 2-□25×50×1.6 | 2-□45×75×2.3 | 2-□50×100×2.3
| w | a | b | c | d | e | f |
|---|---|---|---|---|---|---|
| 1,000 | 50 | 80 | 125 | 80 | 160 | 205 |
| 2,000 | 35 | 55 | 85 | 55 | 110 | 145 |
| 3,000 | 25 | 45 | 70 | 45 | 90 | 115 |
| 4,000 | 25 | 40 | 60 | 40 | 80 | 100 |
| 5,000 | 20 | 35 | 55 | 35 | 70 | 90 |
| 6,000 | 20 | 30 | 50 | 30 | 65 | 80 |
| 7,000 | 15 | 30 | 45 | 30 | 60 | 75 |
| 8,000 | 15 | 25 | 40 | 30 | 55 | 65 |
| 9,000 | 15 | 25 | 40 | 25 | 50 | 65 |
| 10,000 | 15 | 25 | 40 | 25 | 50 | 65 |

**Table 8.8 Compressive capacity of timber braces (kg)** — length (m) vs size (in×in)
| L (m) | 1½×3 | 2×4 | 3×3 | 4×4 |
|---|---|---|---|---|
| 2 | 275 | 880 | 1,425 | 7,055 |
| 3 | 120 | 390 | 725 | 3,135 |
| 4 | 70 | 220 | 440 | 1,760 |
| 5 | 45 | 140 | 295 | 1,125 |
| 6 | 30 | 95 | 245 | 780 |
| 7 | 20 | 70 | 180 | 575 |
| 8 | 15 | 55 | 140 | 440 |
| 9 | 10 | 40 | 110 | 345 |
| 10 | 10 | 35 | 85 | 260 |

**Table 8.9 Compressive capacity of steel pipe braces (kg)** — * = l/r ≤ 132, otherwise l/r > 132; L = wall 2.3 mm, M = wall 3.2 mm
| L (m) | □50×50×2.3 | □75×75×2.3 | □100×100×2.3 | ø2" L | ø2" M | ø2½" L | ø2½" M | ø3" L | ø3" M |
|---|---|---|---|---|---|---|---|---|---|
| 2 | 3,800* | 7,200* | 10,250* | 4,860* | 6,015* | 7,705* | 8,685* | 9,535* | 11,880* |
| 3 | 1,760 | 5,950* | 9,300* | 2,395 | 2,960 | 5,890* | 6,640* | 7,985* | 9,950* |
| 4 | 990 | 3,550 | 8,050* | 1,345 | 1,665 | 3,050 | 3,435 | 4,945 | 6,160* |
| 5 | 630 | 2,280 | 6,425* | 860 | 1,065 | 1,950 | 2,200 | 3,165 | 3,940 |
| 6 | 440 | 1,580 | 3,850 | 595 | 740 | 1,355 | 1,525 | 2,195 | 2,735 |
| 7 | 320 | 1,160 | 2,850 | 440 | 540 | 995 | 1,120 | 1,615 | 2,010 |
| 8 | 240 | 890 | 2,150 | 335 | 415 | 760 | 855 | 1,235 | 1,540 |
| 9 | 195 | 700 | 1,725 | 265 | 325 | 600 | 675 | 975 | 1,210 |
| 10 | 150 | 570 | 1,400 | 215 | 265 | 485 | 550 | 790 | 985 |

**Table interpolation rule** (used in every "by table" example): linear interpolation on pressure (or load) between tabulated rows, e.g. `s = s₃₀₀₀ + (P−3000)/(4000−3000)·(s₄₀₀₀ − s₃₀₀₀)`.

### A.6 Special walls (กำแพงรูปร่างพิเศษ) [p.283–289]
- **Battered / inclined wall (กำแพงลาดเอียง)** Fig 8.6: one face vertical, other sloping; components same as vertical wall, ties have different lengths along height. Erect vertical side first, then sloping side; top/bottom plates sized for dimensions; tie lengths computed from slope, distance from base and thicknesses. Design per 8.4 / tables.
- **Wall with thickness change (กำแพงลดความหนา)** Fig 8.7: Plan A — scab (ไม้ประกับ) splice joining upper and lower panels (with filler) for low pressure/short panels; Plan B — extend lower studs to overlap upper part with filler (for tall/high-pressure). Components labelled: sheathing, stud, wale, wedge clamp, scab, washers, filler, form tie.
- **Wall with pilaster/haunch/attached beam (กำแพงที่มีบ่าหรือคานแนบ)** Fig 8.8: extra studs in the projecting zone, long enough to develop and resist pressure; extra ties and wales there (labels: sheathing, stud, wale, scab, washers, filler, wedge clamp, form tie).
- **Wall with attached column (pilaster form)** Fig 8.9: like a column form + wall form; column side panels perpendicular to wall erected first, then parallel face; clamp with timber/steel yokes; braces from wall wales to pilaster studs; ties balanced across wale spans.
- **Curved wall (กำแพงโค้ง)** Fig 8.10: plywood bent to radius limits (Table 3.6 ข); else narrow vertical boards (1" vertical plank sheathing). Studs horizontal (templet rings 2"×8" cut to radius), wales vertical (2-2"×4"), more ties than normal; braces 2"×4" at 6'–8' centres.
- **Wall corners (มุมกำแพง)** Fig 8.11: sheathing butt tightly at corner; edge studs to prevent bulging; wales continuous and locked at corner with 2"×4" scabs and 1"×6" ties ("A"), form ties strongest at corner.

### A.7 Worked examples — Chapter 8

#### Example 8.1 [p.290–300] — basement wall, timber studs, plywood
Input: wall thickness 25 cm, height H = 2.50 m; plywood 15 mm sheathing; studs 1½"×3" timber; choose ties and wales; braced one side only.
(Figure: isometric with labels ระยะเคร่า (stud spacing), ระยะคานรับเคร่า (wale spacing), ระยะยึดรั้ง (tie spacing).)

**ก. Direct calculation**
1) Pressure (CEB, take minimum):
- 1.1 Liquid: `P = 2,400×2.50 = 6,000 kg/m²`
- 1.2 Setting: slump 10 cm, R = 2 m/h, internal vibration, concrete temp 30 °C: `Ps = 2,400·K·R + 500`, K = 0.65 (Table 2.2) → `2,400(0.65)(2)+500 = 3,620 kg/m²`
- 1.3 Narrow form: `Pa = 300R + 10,000d + 1,500 = 300×2 + 10,000×0.25 + 1,500 = 4,600 kg/m²`
- Design pressure = **3,620 kg/m²**
2) Sheathing & stud spacing (strip b = 100 cm, d = 1.5 cm):
- 2.1 Bending: `M = W a²/10`, `Fb = 6M/(bd²)`: `135 = 6/(100×1.5²) × (36.20) a²/10` → **a = 37 cm** (W = 36.20 kg/cm)
- 2.2 Deflection: `a/360 = W a⁴/(128 EI)` → `a = ∛((128/360)·EI/W) = ∛((128/360)×115,500×28/36.20)` → **a = 31 cm** (book I = 28 cm⁴ for 100 cm strip of 15 mm plywood; note 100×1.5³/12 = 28.1)
- Choose stud spacing **30 cm**.
3) Wale spacing (stud 1½"×3", b = 3.75, d = 7.5, Fb = 80):
- 3.1 Bending: `80 = 6/(3.75×7.5²) × (3,620×0.3/100 × a²/10)` → **a = 51 cm**
- 3.2 Deflection: `a = ∛((128/360)×94,100×132/(3,620×0.30/100))` → **a = 74 cm**
- Bending governs → ~50 cm. (Wale spacing tight → try reduce stud spacing:)
- With stud spacing 15 cm: b = 3.7, d = 7.5, Fb = 80: `80 = 6/(3.7×7.5²)×(3,620×0.15/100)a²/10` → **a = 71 cm**; deflection E = 94,100, I = 3.7×7.5³/12 = 130 cm⁴, W = 3,620×0.15/100 = 5.43 kg/cm → `a = ∛((128/360)×94,100×130/5.43) = ∛801,014` = **93 cm**.
- Wale spacing (net) 71 cm + double wale thickness ~10 cm → **80 cm c/c**. (Final layout uses studs @15 cm.)
4) Bottom plate (ธรณีแบบ) and edges — nailed to slab, controlled by shear:
- Load per m: `P = 3,620×0.10×1.00 = 362 kg` (bottom 10 cm strip)
- Concrete nail ø4 mm, allowable 1,200 kg/cm²: per nail `π(0.4)²/4 × 1,200 = 150 kg`; spacing `150/362 = 0.40 m`
- Check plate bending: `M = W a²/10 = 362×0.40²/10 = 5.79 kg·m`; 1½"×3": `Fb = 6(5.79×100)/(3.75×7.5²) = 16.48 < 80` OK.
- Deflection: `Δ = W a⁴/(128 E I) = 3.62×40⁴/(128×94,100×(3.75×7.5³/12)) = 0.006 cm`; allow 40/360 = 0.11 > 0.006 OK.
- Note: max pressure used everywhere since wall is low; for tall walls, use pressure distribution from Ch.2 per height.
5) Braces — per 1 m wall, brace at 60° to horizontal; max of 3 cases:
- 5.1 Wind 50 kg/m²: `50×2.5×1.0/cos60° = 250 kg/m`
- 5.2 Concrete level difference 0.25 m: `2,400×1.0×0.25²/2 / cos60°` = **150 kg/m** (printed)
- 5.3 Eccentricity ≤10 %: moment `(2,400×2.5×0.25×1.0)×(0.1×0.25) = 37.5`; horizontal `37.5/2.5`; brace `37.5/2.5/cos60° = 30 kg/m`
- Use **250 kg/m**. Try 1½"×3" braces @1.20 m, braced at mid-length: force = 250×1.20 = **300 kg**
- Compression: `Fa = 0.30E/(l/d)² = 0.30×94,100/((290/2)/3.75)² = 18.9 kg/cm²`; `P = 18.9×(3.75×7.5) = 531 kg` > 300 OK. (brace length 290 cm, unbraced 145 cm, d = 3.75)
- Tension: F// = 80 (Table 3.5): `P = 80×3.75×7.5 = 2,250 kg`.
- Use 1½"×3" @ 1.20 m. One-sided bracing → bolt/nail connection for tension; ties must transfer brace load across.
6) Form ties: ø3/8" safe load 2,100 kg (Table 4.6) → area `2,100/3,620 = 0.58 m²`; with wale spacing 0.80 m → tie spacing `0.58/0.80 = 0.725 m` → use **60 cm** (to fit plywood module).
7) Wales (tie spacing 60 cm, continuous > 3 spans), load = 3,620 kg/m (book uses 3,620 kg/m i.e. per 1 m strip):
- 7.1 Bending `M = 3,620(0.60)²/10 = 130 kg·m`; `S = 130×100/80 = 162.5 cm³`
- 7.2 Deflection `60/360 = (1/128)(3,620×1.0/100)(60)⁴/(94,100 I)` → I = 233 cm⁴
- 2-2"×4": `S = 2(5×10²/6) = 166 > 162 OK`; `I = 2(5×10³/12) = 833 > 233 OK` → **wales 2-2"×4"**.
Final layout figure [p.299]: studs @0.15, ties @0.60 horizontally, wales @0.80 vertical, bottom wale 0.10 above base.

**ข. By tables**
1) Pressure 3,620 kg/m².
2) Table 8.2, 15 mm plywood, 3,620 → stud spacing **30 cm** (allows 4,250).
3) Table 8.4, stud 1½"×3", spacing 30 cm: `55 + (3,620−3,000)/(4,000−3,000)×(45−55) = 49 cm`. With stud spacing 15 cm: `75 + 0.62×(65−75) = 70 cm`; + double wale ~10 cm → **80 cm c/c**.
4) Table 8.6: load = 0.80×3,620 = 2,896 kg/m; 2-2"×4": `80 + (2,896−2,000)/(3,000−2,000)×(65−80) = 67 cm` → use **60 cm** ties.
Ties, braces etc. as method 1.

#### Example 8.2 [p.301–306] — same wall, prefabricated steel-framed panels
Input: from Ex 8.1, sheathing as prefabricated panels 0.60×1.20 m adequate for **vertical stud spacing 0.60 m** ... (panels laid horizontally so in 1.20 m panel length studs @60 cm, 3 studs); try lipped channel studs [100×50×20×2.3; steel; pipe braces.
**ก. Direct**
1) Pressure = 3,620 kg/m².
2) Stud size & wale spacing (studs [100×50×20×2.3, tributary 1.20 m as printed):
- 2.1 Bending: `M = (3,620×1.20/100) l²/10` (1); σ = 1,200, Sx = 16.1 cm³; `M = 3(1,200×16.1)` (2) [three studs per panel]; → `l² = 3(1,200×16.1)×10×100/(3,620×1.20)` = 13,342 → **l = 115 cm**
- 2.2 Deflection: W = 3,620×1.20/100, E = 2.0×10⁶, Ix = 80.7 cm⁴; for 3 studs `l³ = (128/360)×2.0×10⁶×80.7 / (3,620×1.20/100)` … = ∛1,320,000 → **l = 111 cm** (book; 3× factor applied in I)
- Choose wale spacing **1.00 m c/c**.
3) Wales:
- 3.1 `M = 3,620×1.0×1.2²/10 = 521 kg·m`; `S = 521×100/1,200 = 43 cm³` → use **2-[150×50×20×2.3** (lipped channel)
- 3.2 Deflection: W = 36.2 kg/cm, l = 120, E = 2.0×10⁶, Ix = 210 cm⁴ (per channel; printed "ซม.³"); `Δ = (1/128)×36.2×120⁴/(2.0×10⁶×(210×2)) = 0.07 cm` ≤ 120/360 = 0.33 OK.
- 3.3 Shear `V = 5/8 W l = 5/8×3,620×1.0×1.2 = 2,715 kg`; `v = V/(b_w d) = 2,715/((2×0.23)×15) = 393 < 1,200 kg/cm²` OK.
4) Form ties: ø3/8" 2,100 kg → area 0.58 m²; wale spacing 1.00 m → 0.58 m → use **60 cm**.
5) Bottom plate: load from lower half of first wale gap (3 wale pairs in figure): `F = 3,620×0.30/2 = 543 kg/m`; 1½"×3" nailed with ø4 mm concrete nails (150 kg each): `n = 543/150 = 4 /m` → **2 ø4 mm @ 50 cm** (as printed).
6) Braces: from Ex 8.1, 250 kg/m; brace @1.20 m (tie spacing) → `F = 1.20/1.0 × 250 = 300 kg`. Pipe ø2" no mid-brace: `l/r = 290/2.03 = 142.8`; `Fa = 1,250 − 0.033(142.8)² = 577 kg/cm²`; `P = 577×5.22 = 3,012 kg > 300` OK → **ø2" @ 1.20 m**. Steel braces need anchor/base details for tension and compression.
**ข. By tables**
1) 3,620 kg/m². 2) Stud spacing 60 cm, stud [100×50×20×2.3, Table 8.5 ง: `105 − (3,620−3,000)/(4,000−3,000)×15 ≈ 95.7`; + double wale ~10 → ≈105 → use **100 cm**.
3) Wales 2-[150×50×20×2.3, pressure 3,620, wale spacing 100 cm, Table 8.7 จ: `150 − 0.62×20 ≈ 137 cm` → use tie spacing **60 cm**.
Figure [p.306]: panels 0.60 wide, wales @1.00 m, bottom wale 0.30 above base.

#### Example 8.3 [p.307–318] — 40 cm wall, H = 5.00 m, single pour
Input: plywood 20 mm; studs 1½"×3" or 2"×4" timber; wales and braces steel.
**ก. Direct**
1) Pressure (CEB):
- Liquid `2,400×5.0 = 12,000 kg/m²`
- Setting: k = 0.65, R = 2.5 m/h: `2,400(0.65×2.5)+500 = 4,400 kg/m²`
- Narrow: `300×2.5 + 10,000×0.40 + 1,500 = 6,250 kg/m²`
- Design **4,400 kg/m²**.
2) Stud spacing (plywood Fb = 135, b = 100, d = 2.0): `135 = 6/(100×2.0²)×(4,400×1.0/100 × a²/10)` → a = √2,045 = **45 cm**. Deflection: E = 115,500, I = 100×2.0³/12 = 66.66 cm⁴, W = 44.0 kg/cm → `a = ∛((128/360)×115,500×66.66/44.0)` = **39 cm** → deflection governs; choose ≤ 30 cm to suit studs/wales/plywood module. (Uses 20 cm in step 3.)
3) Wale spacing — studs 1½"×3" @ 0.20 m:
- 3.1 Bending (ไม้ยาง Fb = 80, b = 3.7, d = 7.5): `M = 4,400×0.20/100 · l²/10 = 0.88 l²`; `80 = 6(0.88 l²)/(3.7×7.5²)` → l = √3,153 = **56 cm**
- 3.2 Deflection: E = 94,100, I = 130, W = 8.8 kg/cm → `l = ∛494,260` = **79 cm**. Bending governs (56 cm).
- To widen: (a) bigger studs, (b) closer studs.
- 3.3 2"×4" (b = 5, d = 10): `80 = 6×0.88 l²/(5×10²)` → **87 cm**; deflection I = 5×10³/12 = 416.67, W = 8.8 → **116.5 cm**.
- 3.4 1½"×3" @ 15 cm: `M = 4,400×0.15/100 × l²/10 = 0.66 l²` → l = √4,205 = **65 cm**; deflection W = 6.6 → `∛659,000` = **87 cm**.
- Conclusion: use **2"×4" studs, wale spacing 80 cm** (better than keeping 1½"×3" @15).
4) Wales — ties every 60 cm horizontally; wale spacing c/c ≈ 80 + 10 = **90 cm**:
- 4.1 l = 0.60 m, W = 4,400×0.90 = 3,960 kg/m; `M = 3,960×0.60²/10 = 142.56 kg·m`; F = 1,200 → `S = 142.56×100/1,200 = 11.88 cm³`; try 2-[100×50×20×2.3: S = 2×16.1 = 32.2 > 11.88 OK.
- 4.2 Deflection: W = 39.60 kg/cm, l = 60, E = 2.0×10⁶: `60/360 = 39.60×60⁴/(128×2.0×10⁶×Ix)` → Ix = 12.0 cm⁴; 2-[ : 2×80.7 = 161.4 > 12 OK.
- 4.3 Shear: `Vmax = 5/8×3,960×0.60 = 1,485 kg`; `v = 1,485/(2×0.23×10) = 322 kg/cm²`; allow va = 0.50×2,400 = 1,200 > 322 OK.
5) Form ties: load `0.90×0.60×4,400 = 2,376 kg`; use ø1/2" (2,800 kg, Table 4.6).
6) Bottom plate & top plate same size as studs; bottom plate force `F = W l/2 = 4,400×0.30/2 = 660 kg/m`; ø4 mm concrete nails 150 kg each → n = 660/150 = 5 → **ø4 mm @ 20 cm**.
7) Braces: 2 sets — at top and at mid-height; top set at 60°:
- 7.1 Wind 50 kg/m²: horizontal 50×5.00×1.00 = 250 kg/m; brace 250/cos60° = **500 kg/m**
- 7.2 Level difference 0.40 m: `2,400×0.40²/2 = 192 kg/m`; brace 192/cos60° = 384 kg/m
- 7.3 Eccentricity 10 % thickness: wall weight `2,400×0.40×5.0 = 4,800 kg/m`; moment `4,800×0.10×0.40 = 192 kg·m/m`; horizontal 192/5.0; brace `(192/5.0)/cos60° = 77 kg/m`
- Use 500 kg/m. Paired braces every **1.20 m**: per brace `1.20/1.00 × 500/2 = 300 kg`. Pipe ø2" braced at mid-length: `l/r = (577/2)/2.03 = 142.8` (brace length 577 cm); `Fa = 1,250 − 0.033(142.8)² = 577 kg/cm²`; `P = 577×5.22 = 3,012 kg > 300` OK.
Figure [p.316]: studs @0.20, ties @0.60, wales 0.90 apart, lowest wale 0.30 above base; two inclined pipe braces (one to top, one to mid) with a strut.
**ข. By tables**
1) 4,400 kg/m². 2) 20 mm plywood, Table 8.2: `40 − (4,400−4,250)/(10,100−4,250)×10 ≈ 39` → use **20 cm** stud spacing.
3) 1½"×3" @ 20 cm, Table 8.4: `55 − (4,400−4,000)/(5,000−4,000)×5 ≈ 53 cm`. Prefer bigger studs: 2"×4" @20: `90 − 0.4×5 = 88 cm` (as printed; table difference is 10 → 86) → use **80 cm**; c/c 80 + 10 = **90 cm**.
4) Ties horizontally 60 cm; load on wale `0.9×4,400 = 3,960 kg/m`; Table 8.7 with "2-100×50×70×2.3" (printed; = 2-[100×50×20×2.3 lipped): `115 − (3,960−3,000)/(4,000−3,000)×15 = 100 cm` → wales **2-[100×50×20×2.3** OK.

---

## PART B — CHAPTER 9: COLUMN FORMWORK (แบบหล่อเสา) [p.319–371]

### B.1 Introduction & section shapes [p.319–321]
Columns take higher lateral pressure than other members (tall vs small plan area → fast rise). Forms need strong side-clamping, lateral bracing and tight fit to the base to prevent movement and loss of plumb.
Fig 9.1 section shapes: square, rectangle, circle, L, T, octagon, cross (+), L with rounded corner, oblong (rounded ends).
- **Square**: 4 identical side panels; only corner detail differs.
- **Rectangular**: if sides similar, as square; if very different, narrow-side parts differ, especially clamps; may need form ties across the long side to reduce member sizes.
- **Round**: usually 2 halves joined; sheathing narrow staves or steel; also fibre/paper tubes (single use), or clay/concrete pipes left in place.
- **Other shapes** (Fig 9.2): keep ≤ 4 side pieces; curved/re-entrant parts are inserts (fillers) inside a rectangular outer frame; outer yoke frame stays rectangular (L/T column: rectangular frame with timber filler boxes nailed in the corner; octagon: corner fillets; oblong: curved fillers at ends).

### B.2 Components (ชิ้นส่วนแบบหล่อเสา) [p.322–325]
| Thai | English | Notes |
|---|---|---|
| แผ่นผิว | Sheathing | Small columns: vertical boards 6", 8", 10", 12" wide; thickness ¾" or 1" common, by form height and yoke spacing; one board per face for small columns, else join with cleats. Plywood (no plastering) needs studs/edge stiffening because thin; reusable. |
| เคร่า (เคร่ายึด) | Studs (vertical) | Needed with plywood or steel sheet. Timber 1½"×3", 2"×4", 3"×3", 4"×4"; may be laid flat (weak axis) when pressure low and width small; steel: angle, channel, flat bar. Yokes tie studs together. |
| คานรัด / คานรัดแบบ | Yokes (column clamps, horizontal) | Resist **bending** (perpendicular) **and tension** (axial, from the perpendicular yokes bearing on them). Spacing controlled by pressure and form width. Timber 1½"×3" or 2"×4"; steel flat bar, channel, light tube. Single yoke for small columns, **double (pair)** for large. |
| เหล็กยึดรั้ง | Form ties | For large columns, through the column to split yoke span; one direction for thin-wide columns, both directions when width ≈ depth. |
| เหล็กรัดแบบ | Steel bands / column clamps | Tension-only; for round and square columns not too wide; require studs strong enough; force perpendicular to studs — arrange studs so the band acts radially like a hoop (Fig 9.4, 9.5 hoop force). Check studs at corners against rolling. |
| ฐานบังคับแบบ | Base template | Timber frame fixed to slab with concrete nails or anchors cast earlier; locates column; resist shear at the base. Set centre lines before. |
| ค้ำยัน | Braces | Keep plumb during pour, resist vibration and impact; normally 4 sides; if only 2 sides (e.g. edge column) braces must take tension and compression. Fix ends with anchor bolts/concrete nails. Fig 9.3: braces tie between adjacent columns in two directions (effective when columns close); otherwise inclined to ground. |
| ช่องเปิดเพื่อเป่าขยะ | Clean-out opening | At form bottom to blow out debris; re-closable, strong enough for pressure. |
| แท่นยืน | Working platform | Near top; extend sheathing as hopper; check studs/yokes carrying it. |

### B.3 Assembly & stripping [p.325–327]
Job-built forms:
1. Tie column rebar and cover blocks.
2. Clean old concrete surface (blow, wash, chip or sand-blast).
3. Set column centre and form position; fix base template firmly (dress rough floor edge to prevent leakage).
4. Erect side panels starting from one side, then the adjoining ones. If form ties are needed, start from the wider panel, then the opposite one to close.
5. Align panels to the template lines & level; tighten yokes.
6. Plumb; fix braces on 4 sides (2 sides → tension-capable braces).
7. Working platform; if rebar projects above, make sheathing extension and cut/seal later.
Stripping: remove tie nuts, side braces and base template; loosen yoke bolts; tap panels off one by one; clean and oil.
Semi-prefabricated (4 panels joined by hinges at yokes so the form wraps the column as one unit): 1) rebar & cover; 2) clean, mark centre/lines; 3) lift form in, align, lock, fix base template; 4) plumb, brace; 5) platform + hopper at top. Stripping: release braces, unlock, pull the set off whole, clean before next use. Used for columns with similar width/depth and big enough to stand on its own.

### B.4 Design (การคำนวณออกแบบ) [p.327–343]
**Lateral pressure**: ACI, CEB or CIRA (Ch.2). ACI-347: column formula **Eq 2.9** applies when column height < 6.00 m and width ≤ 2.0 m; otherwise use the wall formula. CEB & CIRA: same formulas as walls (Eq 2.12–2.14 CEB; Tables 2.2–2.4 CIRA). Pressure max at bottom; **use the maximum pressure for all components** (uniform).

**Sheathing** — 2 types:
1. Sheathing spans directly between yokes (boards; like beam bottom) → Table 9.1 (boards, vs yoke spacing).
2. Sheathing on studs (plywood / steel sheet) → Table 9.2 (plywood vs stud spacing), Table 9.3 (steel sheet vs stud spacing).
Design by strength and deflection per sections 5.2 & 5.7.

**Studs**: timber vertical along column, strong or weak axis. Table 9.4 timber; Tables 9.5–9.8 steel (fy 2,500 kg/cm², deflection within limits) — allowable pressure vs stud spacing and yoke spacing.

**Yokes**: bending perpendicular to main axis + axial tension (= reaction of the perpendicular yokes). Size by force and form width; if too wide add ties to split the span. Usually pairs; single only for very narrow columns. Combined bending+tension check (σ = P/A ± M/S) — Tables 9.9–9.12 give capacity vs form width (or tie spacing) and yoke spacing.

**Other components** (ties, braces, base template, clamps): as walls (Ch.8). Base template mostly by experience — put the first yoke as close to the floor as possible so the template only locates the column; nailing not designed.

Brace load cases (per column, brace at 60°):
1. Wind 50 kg/m² × column width × height;
2. Unequal concrete level Δh (= column dimension): `γ·b·Δh²/2`;
3. Out-of-plumb 10 %: moment = column weight × 0.10 × dimension; horizontal = M / brace height.
Force in brace = horizontal / cos θ (see note on cos in examples). Brace capacity: timber `Fa = 0.30E/(l/d)²`, `F = Fa·A`.

### B.5 Allowable-load tables (Ch.9)
**Table 9.1 Max allowable concrete pressure for column side boards (kg/m²)** — rows yoke spacing (cm), cols board thickness
| Yoke sp. | ½" | ¾" | 1" | 1½" | 2" |
|---|---|---|---|---|---|
| 10 | 19,200¹ | 43,200¹ | 83,360¹ | 132,560¹ | 333,600¹ |
| 20 | 4,800¹ | 10,800¹ | 20,840¹ | 45,540¹ | 83,400¹ |
| 30 | 1,780² | 4,800¹ | 9,260¹ | 20,280¹ | 37,050¹ |
| 40 | 750² | 2,540² | 5,210¹ | 11,410¹ | 20,850¹ |
| 50 | — | 1,300² | 3,330¹ | 7,300¹ | 13,340¹ |
| 60 | — | 750² | 2,015² | 5,070¹ | 9,260² |
| 70 | — | — | 1,270² | 3,725¹ | 6,800¹ |
| 80 | — | — | 850² | 2,755² | 5,210¹ |
| 90 | — | — | 595² | 1,935² | 4,110¹ |
| 100 | — | — | — | 1,410² | 3,330¹ |
| 120 | — | — | — | — | 2,015² |
| 150 | — | — | — | — | 1,030² |

**Table 9.2 Max allowable pressure for plywood sheathing (kg/m²)** — rows stud spacing (cm)
| Stud sp. | 3.2 mm | 6 | 10 | 15 | 20 |
|---|---|---|---|---|---|
| 10 | 1,100² | 7,392² | 21,600¹ | 50,625¹ | 89,775¹ |
| 20 | — | 920² | 4,100² | 12,650¹ | 22,440¹ |
| 30 | — | — | 1,215² | 4,255² | 9,975¹ |
| 40 | — | — | 510² | 1,795² | 4,265² |
| 50 | — | — | 260² | 920² | 2,185² |
| 60 | — | — | 150² | 530² | 1,260² |
| 70 | — | — | 95² | 335² | 795² |
| 80 | — | — | 60² | 220² | 530² |
| 90 | — | — | 45² | 155² | 375² |
| 100 | — | — | 30² | 115² | 270² |
| 120 | — | — | 15² | 65² | 155² |
(values < 2 kg/m² not recorded)

**Table 9.3 Max allowable pressure for steel sheet sheathing (kg/m²)** — rows stud spacing
| Stud sp. | 1.6 mm | 2.3 | 3.2 | 4 | 4.5 | 5.0 |
|---|---|---|---|---|---|---|
| 10 | 2,170² | 7,250² | 19,580² | 32,500¹ | 42,125¹ | 51,250¹ |
| 20 | — | 905² | 2,445² | 4,800² | 6,800² | 9,065² |
| 30 | — | — | 725² | 1,420² | 2,010² | 2,680² |
| 40 | — | — | — | 600² | 850² | 1,130² |
| 50 | — | — | — | — | — | 580² |
| 60–120 | — | — | — | — | — | — |
(values < 500 kg/m² not recorded)

**Table 9.4 Max allowable pressure for timber studs (kg/m²)** — columns = yoke spacing (cm) 20/30/40/50/60/70/90/120/150; "แกนหลัก" = strong axis, "แกนรอง" = weak axis (flat)
| Size | Axis | Stud sp. | 20 | 30 | 40 | 50 | 60 | 70 | 90 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1½×3 | strong | 10 | 70,300 | 31,200 | 17,600 | 11,200 | 7,800 | 5,700 | 3,500 | 1,900 | 1,250 |
| | | 20 | 35,150 | 15,600 | 8,800 | 5,600 | 3,900 | 2,900 | 1,700 | 1,000 | 625 |
| | | 30 | 23,400 | 10,400 | 5,900 | 3,700 | 2,600 | 1,900 | 1,100 | 650 | 420 |
| | | 40 | 17,600 | 7,800 | 4,400 | 2,800 | 1,900 | 1,400 | 900 | 500 | 310 |
| 1½×3 | weak | 10 | 35,200 | 15,600 | 8,800 | 5,600 | 3,900 | 2,900 | 1,510² | 635² | 325² |
| | | 20 | 17,600 | 7,800 | 4,400 | 2,800 | 1,900 | 1,400 | 755² | 315² | 160² |
| | | 30 | 11,700 | 5,200 | 2,900 | 2,900 | 1,300 | 960 | 500² | 210² | 105² |
| | | 40 | 8,800 | 3,900 | 2,200 | 1,400 | 980 | 720 | 375² | 160² | 80² |
| 3×3 | strong | 10 | 140,600 | 62,500 | 35,100 | 22,500 | 15,600 | 11,500 | 6,900 | 3,900 | 2,500 |
| | | 20 | 70,300 | 31,200 | 17,600 | 11,200 | 7,800 | 5,700 | 3,500 | 1,900 | 1,250 |
| | | 30 | 46,900 | 20,800 | 11,700 | 7,500 | 5,200 | 3,800 | 2,300 | 1,300 | 830 |
| | | 40 | 35,100 | 15,600 | 8,800 | 5,600 | 3,900 | 2,900 | 1,700 | 980 | 620 |
| 3×3 | weak | (same as strong) | | | | | | | | | |
| 2×4 | strong | 10 | 166,700 | 74,100 | 41,700 | 26,700 | 18,500 | 13,600 | 8,200 | 4,600 | 2,610² |
| | | 20 | 83,300 | 37,000 | 20,800 | 13,300 | 9,200 | 6,800 | 4,100 | 2,300 | 1,305² |
| | | 30 | 55,500 | 24,700 | 13,900 | 8,900 | 6,200 | 4,500 | 2,700 | 1,500 | 870² |
| | | 40 | 41,700 | 18,500 | 10,400 | 6,700 | 4,600 | 3,400 | 2,000 | 1,100 | 650² |
| 2×4 | weak | 10 | 83,300 | 37,000 | 20,800 | 13,300 | 9,300 | 6,800 | 4,100 | 2,015² | 1,030² |
| | | 20 | 41,700 | 18,500 | 10,400 | 6,700 | 4,600 | 3,400 | 2,000 | 1,005² | 515² |
| | | 30 | 27,800 | 12,300 | 6,900 | 4,400 | 3,100 | 2,300 | 1,400 | 670² | 340² |
| | | 40 | 20,835 | 9,300 | 5,200 | 3,300 | 2,300 | 1,700 | 1,000 | 500² | 255² |
| 4×4 | strong & weak (identical) | 10 | 333,300 | 148,100 | 83,300 | 53,300 | 37,000 | 27,200 | 16,500 | 9,300 | 5,900 |
| | | 20 | 166,700 | 74,000 | 41,700 | 26,700 | 18,500 | 13,600 | 8,200 | 4,600 | 2,900 |
| | | 30 | 111,100 | 49,400 | 27,800 | 17,800 | 12,300 | 9,100 | 5,500 | 3,100 | 2,000 |
| | | 40 | 83,300 | 37,000 | 20,800 | 13,300 | 9,300 | 6,800 | 4,100 | 2,300 | 1,500 |
(1½×3 weak 30/50 printed "2,900" [uncertain, pattern suggests 1,900].)

**Table 9.5 Max allowable pressure for flat-bar steel studs (kg/m²)** (all shear¹); cols yoke spacing 20/30/40/50/60/70/90/120/150
| Bar (mm) | Stud sp. | 20 | 30 | 40 | 50 | 60 | 70 | 90 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|
| 3×75 | 10 | 87,800 | 39,000 | 21,900 | 14,000 | 9,800 | 7,200 | 4,300 | 2,400 | 1,600 |
| | 20 | 43,900 | 19,500 | 11,000 | 7,000 | 4,900 | 3,600 | 2,200 | 1,200 | 800 |
| | 30 | 29,300 | 13,000 | 7,300 | 4,700 | 3,200 | 2,400 | 1,400 | 800 | 520 |
| | 40 | 21,900 | 9,800 | 5,500 | 3,500 | 2,400 | 1,800 | 1,100 | 600 | 400 |
| 3×100 | 10 | 156,300 | 69,400 | 39,100 | 25,000 | 17,400 | 12,700 | 7,700 | 4,300 | 2,800 |
| | 20 | 78,100 | 34,700 | 19,500 | 12,500 | 8,700 | 6,400 | 3,800 | 2,200 | 1,400 |
| | 30 | 52,100 | 23,100 | 13,000 | 8,300 | 5,800 | 4,200 | 2,600 | 1,400 | 900 |
| | 40 | 39,100 | 17,400 | 9,800 | 6,300 | 4,300 | 3,200 | 1,900 | 1,100 | 700 |
| 6×75 | 10 | 175,600 | 78,100 | 43,900 | 28,100 | 19,500 | 14,300 | 8,700 | 4,900 | 3,100 |
| | 20 | 87,800 | 39,000 | 22,000 | 14,100 | 9,800 | 7,200 | 4,300 | 2,400 | 1,600 |
| | 30 | 58,500 | 26,000 | 14,600 | 9,400 | 6,500 | 4,800 | 2,900 | 1,600 | 1,000 |
| | 40 | 43,900 | 19,500 | 11,000 | 7,000 | 4,900 | 3,600 | 2,200 | 1,200 | 700 |
| 6×100 | 10 | 312,800 | 138,900 | 78,100 | 50,000 | 34,700 | 25,500 | 15,400 | 8,700 | 5,600 |
| | 20 | 156,300 | 69,400 | 39,100 | 25,000 | 17,400 | 12,800 | 7,700 | 4,300 | 2,800 |
| | 30 | 104,200 | 46,300 | 26,000 | 16,700 | 11,600 | 8,500 | 5,100 | 2,900 | 1,900 |
| | 40 | 78,100 | 34,700 | 19,500 | 12,500 | 8,700 | 6,400 | 3,900 | 2,200 | 1,400 |

**Table 9.6 Max allowable pressure for angle studs (kg/m²)** (shear¹)
| Angle (mm) | Stud sp. | 20 | 30 | 40 | 50 | 60 | 70 | 90 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|
| L50×50×4 | 10 | 77,800 | 34,600 | 19,500 | 12,500 | 8,600 | 6,400 | 3,800 | 2,200 | 1,400 |
| | 20 | 38,900 | 17,300 | 9,700 | 6,200 | 4,300 | 3,200 | 1,900 | 1,100 | 700 |
| | 30 | 25,900 | 11,500 | 6,500 | 4,200 | 2,900 | 2,100 | 1,300 | 700 | 500 |
| | 40 | 19,500 | 8,600 | 4,900 | 3,100 | 2,200 | 1,600 | 900 | 500 | 300 |
| L50×50×6 | 10 | 110,900 | 49,300 | 27,700 | 17,850 | 12,300 | 9,100 | 5,500 | 3,000 | 1,900 |
| | 20 | 55,500 | 24,700 | 13,900 | 8,900 | 6,200 | 4,500 | 2,700 | 1,500 | 1,000 |
| | 30 | 37,000 | 16,400 | 9,200 | 5,900 | 4,100 | 3,000 | 1,800 | 1,000 | 700 |
| | 40 | 27,700 | 12,300 | 6,900 | 4,400 | 3,100 | 2,300 | 1,400 | 700 | 500 |
| L65×65×6 | 10 | 195,900 | 87,100 | 49,000 | 31,400 | 21,800 | 16,000 | 9,700 | 5,400 | 3,500 |
| | 20 | 98,000 | 43,500 | 24,500 | 15,700 | 10,900 | 8,000 | 4,800 | 2,700 | 1,700 |
| | 30 | 65,000 | 29,000 | 16,300 | 10,500 | 7,800 | 5,300 | 3,200 | 1,800 | 1,200 |
| | 40 | 49,000 | 21,800 | 12,200 | 7,800 | 5,400 | 4,000 | 2,400 | 1,400 | 900 |
| L75×75×6 | 10 | 264,700 | 117,600 | 66,200 | 42,400 | 29,400 | 21,600 | 13,100 | 7,400 | 4,700 |
| | 20 | 132,300 | 58,800 | 33,100 | 21,200 | 14,700 | 10,800 | 6,500 | 3,700 | 2,400 |
| | 30 | 88,200 | 39,200 | 22,100 | 14,100 | 9,800 | 7,200 | 4,400 | 2,500 | 1,600 |
| | 40 | 66,200 | 29,400 | 16,500 | 10,600 | 7,400 | 5,400 | 3,300 | 1,800 | 1,200 |
| L75×75×9 | 10 | 378,100 | 168,100 | 94,500 | 60,500 | 42,000 | 30,900 | 18,700 | 10,500 | 6,700 |
| | 20 | 189,100 | 84,000 | 47,300 | 30,300 | 21,000 | 15,400 | 9,300 | 5,300 | 3,400 |
| | 30 | 126,000 | 56,000 | 31,500 | 20,200 | 14,000 | 10,300 | 6,200 | 3,500 | 2,200 |
| | 40 | 94,500 | 42,000 | 23,600 | 15,100 | 10,500 | 7,700 | 4,700 | 2,600 | 1,700 |

**Table 9.7 Max allowable pressure for light channel & lipped channel (title says "คานรัด", header = stud spacing) (kg/m²)**
| Section (mm) | Stud sp. | 20 | 30 | 40 | 50 | 60 | 70 | 90 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|
| [40×20×2.3 | 10 | 60,300 | 26,900 | 15,100 | 9,700 | 6,700 | 4,900 | 3,000 | 1,585² | 810² |
| | 20 | 30,200 | 13,400 | 7,500 | 4,800 | 3,400 | 2,500 | 1,500 | 790² | 405² |
| | 30 | 20,100 | 8,900 | 5,000 | 3,200 | 2,200 | 1,600 | 1,000 | 525² | 270² |
| | 40 | 15,100 | 6,700 | 3,800 | 2,400 | 1,700 | 1,200 | 700 | 395² | 200² |
| [60×30×2.3 | 10 | 147,500 | 65,600 | 36,900 | 23,600 | 16,400 | 12,000 | 7,300 | 4,100 | 2,600 |
| | 20 | 73,800 | 32,800 | 18,400 | 11,800 | 8,200 | 6,000 | 3,600 | 2,000 | 1,300 |
| | 30 | 49,200 | 21,900 | 12,300 | 7,900 | 5,500 | 4,000 | 2,400 | 1,400 | 900 |
| | 40 | 36,900 | 16,400 | 9,200 | 5,900 | 4,100 | 3,000 | 1,800 | 1,000 | 700 |
| [80×40×2.3 | 10 | 272,800 | 121,300 | 68,200 | 43,700 | 30,300 | 22,300 | 13,500 | 7,600 | 4,850 |
| | 20 | 136,400 | 60,600 | 34,100 | 21,800 | 15,200 | 11,100 | 6,700 | 3,800 | 2,400 |
| | 30 | 90,900 | 40,400 | 22,700 | 14,600 | 10,100 | 7,400 | 4,500 | 2,500 | 1,600 |
| | 40 | 68,000 | 30,300 | 17,100 | 10,900 | 7,600 | 5,600 | 3,400 | 1,900 | 1,200 |
| [60×30×10×2.3 | 10 | 162,500 | 72,200 | 40,600 | 26,000 | 18,100 | 13,300 | 8,000 | 4,500 | 2,900 |
| | 20 | 81,300 | 36,100 | 20,300 | 13,000 | 9,000 | 6,600 | 4,000 | 2,300 | 1,400 |
| | 30 | 54,200 | 24,100 | 13,500 | 8,700 | 6,000 | 4,400 | 2,700 | 1,500 | 1,000 |
| | 40 | 40,600 | 18,100 | 10,200 | 6,500 | 4,500 | 3,300 | 2,000 | 1,100 | 700 |
| [75×45×15×2.3 | 10 | 309,400 | 137,500 | 77,300 | 49,500 | 34,400 | 25,300 | 15,300 | 8,600 | 5,500 |
| | 20 | 154,700 | 68,800 | 38,700 | 24,800 | 17,200 | 12,600 | 7,600 | 4,300 | 2,800 |
| | 30 | 103,100 | 45,800 | 45,800 [uncertain; pattern ≈25,800] | 16,500 | 11,500 | 8,400 | 5,100 | 2,900 | 1,800 |
| | 40 | 77,300 | 34,400 | 19,300 | 12,400 | 8,500 | 6,300 | 3,800 | 2,100 | 1,400 |

**Table 9.8 Max allowable pressure for hollow rectangular/square tube studs (kg/m²)**
| Section | Axis | Stud sp. | 20 | 30 | 40 | 50 | 60 | 70 | 90 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| □50×25×2.3 | strong | 10 | 116,300 | 51,700 | 29,100 | 18,600 | 12,900 | 9,500 | 5,700 | 3,200 | 1,960² |
| | | 20 | 58,100 | 25,800 | 14,500 | 9,300 | 6,500 | 4,700 | 2,900 | 1,600 | 980² |
| | | 30 | 38,800 | 17,200 | 9,700 | 6,200 | 4,300 | 3,200 | 1,900 | 1,100 | 650² |
| | | 40 | 29,100 | 12,900 | 7,300 | 4,700 | 3,200 | 2,400 | 1,400 | 800 | 490² |
| □50×25×2.3 | weak | 10 | 38,800 | 17,200 | 9,700 | 6,200 | 4,300 | 3,200 | 1,900 | 1,100 | 650² |
| | | 20 | 19,400 | 8,600 | 4,800 | 3,100 | 2,200 | 1,600 | 1,000 | 500 | 325² |
| | | 30 | 12,900 | 5,700 | 3,200 | 2,100 | 1,400 | 1,100 | 600 | 400 | 210² |
| | | 40 | 9,700 | 4,300 | 2,400 | 1,600 | 1,100 | 800 | 500 | 300 | 160² |
| □75×45×2.3 | strong | 10 | 323,800 | 143,900 | 80,900 | 51,800 | 36,000 | 26,400 | 16,000 | 9,000 | 5,800 |
| | | 20 | 161,900 | 71,900 | 40,500 | 25,900 | 18,000 | 13,200 | 8,000 | 4,500 | 2,900 |
| | | 30 | 107,900 | 48,000 | 27,000 | 17,300 | 12,000 | 8,800 | 5,300 | 3,000 | 1,900 |
| | | 40 | 80,900 | 36,000 | 20,200 | 13,000 | 9,000 | 6,600 | 4,000 | 2,200 | 1,400 |
| □75×45×2.3 | weak | 10 | 146,600 | 65,100 | 36,600 | 23,500 | 16,300 | 12,000 | 7,200 | 4,100 | 2,600 |
| | | 20 | 73,300 | 32,600 | 18,300 | 11,700 | 8,100 | 6,000 | 3,600 | 2,000 | 1,300 |
| | | 30 | 48,900 | 21,700 | 12,200 | 7,800 | 5,400 | 4,000 | 2,400 | 1,400 | 900 |
| | | 40 | 36,700 | 16,300 | 9,200 | 5,900 | 4,100 | 3,000 | 1,800 | 1,000 | 700 |
| □50×50×2.3 | strong = weak | 10 | 198,100 | 88,100 | 49,500 | 31,700 | 22,000 | 16,200 | 9,800 | 5,500 | 3,350² |
| | | 20 | 99,100 | 44,000 | 24,800 | 15,900 | 11,000 | 8,100 | 4,900 | 2,800 | 1,675² |
| | | 30 | 66,000 | 29,400 | 16,500 | 10,600 | 7,300 | 5,400 | 3,300 | 1,800 | 1,115² |
| | | 40 | 49,500 | 22,000 | 12,400 | 7,900 | 5,500 | 4,000 | 2,400² | 1,400 | 835² |
| □75×75×2.3 | strong = weak | 10 | 475,000 | 211,100 | 118,800 | 76,000 | 52,800 | 38,800 | 23,500 | 13,200 | 8,400 |
| | | 20 | 237,500 | 105,600 | 59,400 | 38,000 | 26,400 | 19,400 | 11,800 | 6,600 | 4,200 |
| | | 30 | 158,300 | 70,400 | 39,600 | 25,300 | 17,600 | 12,900 | 7,800 | 4,400 | 2,800 |
| | | 40 | 118,800 | 52,800 | 29,700 | 19,000 | 13,200 | 9,700 | 5,900 | 3,300 | 2,100 |

**Yoke capacity tables 9.9–9.12 (allowable concrete pressure, kg/m²)** — rows yoke spacing (cm), columns **form width or tie spacing** (cm) 30/40/50/60/80/100/120. Values for the yoke **pair** acting in bending + tension (book does not state single/double explicitly; treat as given).

Table 9.9 Timber yokes
| Size | Yoke sp. | 30 | 40 | 50 | 60 | 80 | 100 | 120 |
|---|---|---|---|---|---|---|---|---|
| 1½"×3" | 40 | 5,270 | 3,075 | 2,010 | 1,420 | 810 | 525 | 365 |
| | 60 | 3,515 | 2,050 | 1,340 | 945 | 540 | 350 | 245 |
| | 80 | 2,635 | 1,535 | 1,005 | 710 | 405 | 260 | 185 |
| | 120 | 1,755 | 1,025 | 670 | 470 | 270 | 175 | 120 |
| 2"×4" | 40 | 12,080 | 7,115 | 4,690 | 3,320 | 1,915 | 1,245 | 870 |
| | 60 | 8,050 | 4,745 | 3,125 | 2,210 | 1,275 | 830 | 580 |
| | 80 | 6,040 | 3,560 | 2,340 | 1,660 | 955 | 620 | 435 |
| | 120 | 4,025 | 2,370 | 1,560 | 1,105 | 635 | 415 | 290 |
| 2"×2" | 40 | 3,210 | 1,850 | 1,200 | 840 | 480 | 310 | 215 |
| | 60 | 2,140 | 1,230 | 800 | 560 | 320 | 205 | 140 |
| | 80 | 1,605 | 925 | 600 | 420 | 240 | 155 | 105 |
| | 120 | 1,070 | 615 | 400 | 260 | 160 | 100 | 70 |
| 4"×4" | 40 | 24,160 | 14,239 | 9,375 | 6,640 | 3,830 | 2,490 | 1,745 |
| | 60 | 16,105 | 9,490 | 6,250 | 4,425 | 2,550 | 1,660 | 1,165 |
| | 80 | 12,080 | 7,115 | 4,685 | 3,320 | 1,915 | 1,245 | 870 |
| | 120 | 8,050 | 4,745 | 3,125 | 2,210 | 1,275 | 830 | 580 |

Table 9.10 Angle yokes (column "10" in header = 100)
| Size | Yoke sp. | 30 | 40 | 50 | 60 | 80 | 100 | 120 |
|---|---|---|---|---|---|---|---|---|
| L50×50×4 | 40 | 6,370 | 3,655 | 2,365 | 1,655 | 940 | 600 | 420 |
| | 60 | 4,245 | 2,435 | 1,580 | 1,105 | 625 | 400 | 280 |
| | 80 | 3,185 | 1,825 | 1,180 | 825 | 470 | 300 | 210 |
| | 120 | 2,120 | 1,215 | 790 | 550 | 310 | 200 | 140 |
| L50×50×6 | 40 | 9,095 | 5,215 | 3,380 | 2,365 | 1,340 | 865 | 600 |
| | 60 | 6,065 | 3,275 | 2,250 | 1,575 | 895 | 575 | 400 |
| | 80 | 4,545 | 2,605 | 1,690 | 1,180 | 670 | 430 | 300 |
| | 120 | 3,030 | 1,735 | 1,125 | 785 | 445 | 205 | 200 |
| L65×65×6 | 40 | 15,650 | 9,030 | 5,870 | 4,115 | 2,345 | 1,510 | 1,055 |
| | 60 | 10,435 | 6,020 | 3,910 | 2,745 | 1,565 | 1,010 | 705 |
| | 80 | 7,825 | 4,515 | 2,935 | 2,055 | 1,170 | 755 | 525 |
| | 120 | 5,215 | 3,010 | 1,955 | 1,370 | 780 | 505 | 350 |
| L75×75×9 | 40 | 29,820 | 17,260 | 11,240 | 7,900 | 4,510 | 2,910 | 2,035 |
| | 60 | 19,880 | 11,505 | 7,495 | 5,265 | 3,005 | 1,940 | 1,355 |
| | 80 | 14,910 | 8,630 | 5,620 | 3,950 | 2,255 | 1,455 | 1,015 |
| | 120 | 9,940 | 5,750 | 3,745 | 2,630 | 1,500 | 970 | 675 |

Table 9.11 Light-channel / lipped-channel yokes
| Size | Yoke sp. | 30 | 40 | 50 | 60 | 80 | 100 | 120 |
|---|---|---|---|---|---|---|---|---|
| [60×30×2.3 | 40 | 10,545 | 6,235 | 4,115 | 2,920 | 1,690 | 1,100 | 770 |
| | 60 | 7,030 | 4,155 | 2,745 | 1,945 | 1,125 | 730 | 515 |
| | 80 | 5,270 | 3,115 | 2,060 | 1,460 | 845 | 550 | 385 |
| | 120 | 3,515 | 2,075 | 1,370 | 970 | 560 | 365 | 255 |
| [80×40×2.3 | 40 | 18,210 | 10,923 | 7,280 | 5,200 | 3,030 | 1,985 | 1,400 |
| | 60 | 12,140 | 7,280 | 4,850 | 3,465 | 2,020 | 1,320 | 930 |
| | 80 | 9,105 | 5,460 | 3,640 | 2,600 | 1,515 | 990 | 700 |
| | 120 | 6,070 | 3,640 | 2,425 | 1,730 | 1,010 | 660 | 465 |
| [60×30×10×2.3 | 40 | 11,630 | 6,875 | 4,450 | 3,220 | 1,860 | 1,210 | 850 |
| | 60 | 7,755 | 4,585 | 3,025 | 2,145 | 1,240 | 805 | 565 |
| | 80 | 5,815 | 3,435 | 2,270 | 1,610 | 930 | 605 | 425 |
| | 120 | 3,875 | 2,290 | 1,510 | 1,070 | 670 | 400 | 280 |
| [75×45×15×2.3 | 40 | 20,850 | 12,480 | 8,310 | 5,930 | 3,450 | 2,255 | 1,590 |
| | 60 | 13,900 | 8,320 | 5,540 | 3,950 | 2,300 | 1,505 | 1,060 |
| | 80 | 10,425 | 6,240 | 4,155 | 2,965 | 1,725 | 1,125 | 795 |
| | 120 | 6,950 | 4,160 | 2,770 | 1,875 | 1,150 | 750 | 530 |
| [100×50×20×2.3 | 40 | 31,600 | 19,180 | 12,885 | 9,255 | 5,440 | 3,575 | 2,530 |
| | 60 | 21,065 | 12,785 | 8,590 | 6,170 | 3,625 | 2,385 | 1,685 |
| | 80 | 15,800 | 9,590 | 6,440 | 4,625 | 2,720 | 1,790 | 1,265 |
| | 120 | 10,530 | 6,390 | 4,295 | 3,085 | 1,810 | 1,190 | 840 |
| [150×50×20×2.3 | 40 | 48,895 | 30,315 | 20,670 | 15,010 | 8,950 | 5,945 | 4,235 |
| | 60 | 32,595 | 20,210 | 13,780 | 10,005 | 5,965 | 3,960 | 2,820 |
| | 80 | 24,445 | 15,155 | 10,335 | 7,505 | 4,475 | 2,970 | 2,115 |
| | 120 | 16,295 | 10,105 | 6,890 | 5,000 | 2,985 | 1,980 | 1,410 |

Table 9.12 Hollow-tube yokes (header "นิ้ว×นิ้ว" but sizes are mm)
| Size | Yoke sp. | 30 | 40 | 50 | 60 | 80 | 100 | 120 |
|---|---|---|---|---|---|---|---|---|
| □25×50×1.6 | 40 | 6,725 | 3,920 | 2,560 | 1,800 | 1,035 | 670 | 465 |
| | 60 | 4,485 | 2,610 | 1,705 | 1,200 | 690 | 445 | 310 |
| | 80 | 3,360 | 1,960 | 1,280 | 900 | 515 | 335 | 230 |
| | 120 | 2,240 | 1,305 | 850 | 600 | 345 | 220 | 155 |
| □30×60×2.3 | 40 | 13,010 | 7,635 | 5,015 | 3,545 | 2,040 | 1,320 | 925 |
| | 60 | 8,675 | 5,090 | 3,340 | 2,360 | 1,360 | 880 | 615 |
| | 80 | 6,505 | 3,815 | 2,505 | 1,770 | 1,020 | 660 | 460 |
| | 120 | 4,335 | 2,545 | 1,670 | 1,180 | 680 | 440 | 305 |
| □50×50×2.3 | 40 | 14,690 | 8,620 | 5,660 | 4,000 | 2,300 | 1,495 | 1,045 |
| | 60 | 9,790 | 5,745 | 3,775 | 2,670 | 1,535 | 995 | 700 |
| | 80 | 7,345 | 4,310 | 2,830 | 2,000 | 1,150 | 745 | 520 |
| | 120 | 4,895 | 2,870 | 1,885 | 1,335 | 765 | 495 | 350 |
| □75×75×2.3 | 40 | 32,065 | 19,200 | 12,780 | 9,120 | 5,310 | 3,470 | 2,445 |
| | 60 | 21,375 | 12,800 | 8,520 | 6,080 | 3,540 | 2,315 | 1,630 |
| | 80 | 16,030 | 9,600 | 6,390 | 4,560 | 2,655 | 1,735 | 1,220 |
| | 120 | 10,685 | 6,400 | 4,260 | 3,040 | 1,770 | 1,155 | 816 |

Observation for the calculator: tabulated values scale ≈ 1/(yoke spacing) (strength-governed), so linear-in-1/s extrapolation reproduces e.g. Ex 9.1 (1½×3, width 40, yoke 20 cm → 6,155 ≈ 2×3,075).

### B.6 Column-yoke mechanics (as used in examples)
For a rectangular column b (narrow) × h (long), yoke spacing s, pressure p:
- Line load on a yoke: `w = p·s` (kg/m) (Ex 9.1: 5,180×0.40 = 2,072 kg/m).
- Yoke on face of width L: bending `M = w·L²/8` (simple span between bolts) or `w·l²/10` when ties split it into ≥3 spans.
- Axial **tension** in a yoke = reaction of the perpendicular pair: `T = w·L_perp/2` (Ex 9.1: P₁ = 2,072×0.40/2 = 414 kg; Ex 9.3: long yoke T = 6,000×0.50×0.30/2 = 450 kg, short yoke T = 6,000×0.50×0.40/2 = 600 kg with long side split into 3 spans of 40 cm).
- Combined: `σ = P/A ± M/S`; tension side ≤ F// (tension parallel, 80) and compression side ≤ Fc// (60) for soft wood (book compares the "+" value to 80 and "−" value to 60).
- Deflection simple span `Δ = 5wL⁴/(384EI) ≤ L/360`; continuous `wl⁴/(128EI)`.
- Bolt position: Ex 9.1 sketch shows bolts 0.0375 m outside each face (span 0.40 used).
- Round column clamp (Ex 9.2): yoke board 1"×10" cut to semicircle, min net depth 17.5 cm; force per side `F = p·s·D/2`; `M = p·s·D²/8`.

### B.7 Worked examples — Chapter 9

#### Example 9.1 [p.345–354] — square column 0.40×0.40 m, H = 3.50 m; boards ¾"×8", other members 1½"×3"
Figure: boards vertical, horizontal double yokes on alternating faces with bolts/wedges.
**ก. Direct**
1) Pressure (CEB): liquid `2,400×3.50 = 8,400`; setting k = 0.65, R = 3 m/h → `2,400(0.65×3)+500 = 5,180`; narrow form `300×3 + 10,000×0.40 + 1,500 = 6,400` → **5,180 kg/m²**.
2) Yoke spacing (boards span between yokes; ไม้กระบาก Fb = 80, E = 94,100; face 40 cm = 2 boards 20 cm, t = 1.87 cm):
- Bending: `M = (5,180×0.40)a²/10` (1); `M = Fb·bd²/6 = 80(2×20×1.87²)/6` (2) → `a = √(80(2×20×1.87²)×10/6 ÷ (5,180×0.40/100…))` printed result **a = 136 cm**
- Deflection: `a = 0.71∛(94,100(40×1.87³/12)/(0.40×5,180/100)) = 0.71∛98,993` = **46 cm** → deflection governs → **40 cm**.
- VERIFICATION NOTE: recomputing, S = 40×1.87²/6 = 23.3 cm³, w = 20.72 kg/cm → bending a = √(80×23.3×10/20.72) ≈ **30 cm**; deflection 0.71×∛98,993 = 0.71×46.3 ≈ **33 cm**. The printed 136 and 46 appear to be arithmetic slips (46 omits the 0.71 factor). The table method (29.36 → 20 cm) agrees with ≈30 cm. Use the formula, not the printed values, for unit tests (or test both, flagged).
3) Yokes (yoke = stud = form beam; boards stiff, edges only top & bottom). w = 5,180×0.40 = 2,072 kg/m, span 0.40 (bolts 0.0375 beyond faces):
- Tension `P₁ = 2,072×0.40/2 = 414 kg`; bending `M = wl²/8 = 2,072(0.40)²/8 = 41.4 kg·m`
- 1½"×3": A = 3.75×7.5 = 28.1 cm², S = 35 cm³: `σ = 414/28.1 ± 41.4×100/35 = 14.7 ± 118` = **133 (tension) / 103 (comp)** > allowable (comp 60, tension 80) → NG. Options: (a) bigger yoke, (b) smaller spacing.
- (a) 2"×4": A = 50, S = 83, I = 417: `σ = 8.3 ± 49.9 = 57.2 (t); 41.3 (c)` < 80 / 60 OK; `Δ = 5/384 × (2,072/100)(40)⁴/(94,100×417) = 0.018 cm` < 40/360 = 0.11 OK → **2"×4" @ 40 cm**.
- (b) 1½"×3" @ 20 cm: A = 28.1, S = 35, I = 132; w = 5,180×0.20 = 1,036 kg/m; `P₁ = 1,036×0.40/2 = 207.2 kg`; `M = 1,036×0.40²/8 = 20.72 kg·m`; `σ = 7.37 ± 59.2 = 66.6 (t); 51.83 (c)` OK; `Δ = 5/384 × (1,036/100)(40)⁴/(94,100×132) = 0.02` < 0.11 OK → **1½"×3" @ 20 cm**.
4) Base (sill) nails: (a) spacing 40: `H = 5,180(0.20)×0.40 = 414 kg` → ø4 mm concrete nails 150 kg each → **3 nails per side**; (b) spacing 20: `H = 5,180(0.10)×0.40 = 207 kg` → **2 nails per side**.
5) Braces — diagonal braces on all 4 sides at 60° to horizontal:
- 5.1 Wind 50 kg/m²: `50×0.40×3.50 = 70 kg` → brace `70/cos60°` printed **80.1 kg** (numerically = 70/cos30°)
- 5.2 Level difference 0.40 m: `2,400×0.40×0.40²/2 = 76.8 kg` → brace printed **88.7 kg** (= 76.8/0.866)
- 5.3 Overturning 10 %: `(2,400×0.40×0.40×3.5)×(0.1×0.40) = 53.8 kg·m`; brace 3.00 m above floor → `53.8/3.0 = 18 kg` → brace printed **20.8 kg**
- Use 88.7 kg. 1½"×3": length `3.00/sin60° = 3.46 m`; `l/d = 346/3.75 = 92`; `Fa = 0.30×94,100/92² = 3.3 kg/cm²`; `F = 3.3×3.75×7.5 = 92 kg`; use **2-1½"×3" per side → 184 > 88.7 OK**.
- NOTE (book inconsistency): Ch.9 examples divide by 0.866 although labelled cos 60°; Ch.8 uses /0.5. Calculator should use the actual brace angle; keep these printed numbers only as legacy test values.
Final details [p.353]: plan — wedge seat cleats (บ่ารับลิ่ม), yokes 1½"×3" (also act as studs/form beams), timber wedges (ลิ่มไม้), diagonal braces 2-1½"×3" on all 4 sides, sheathing ¾"×8" + ¾"×10" (2-¾"×8" per face). Elevation: yokes **16 @ 0.20 = 3.20 m**, top 0.10, bottom 0.20 above floor, A-frame braces.
**ข. By tables**
1) 8,400 / 5,180 / 6,400 → 5,180 kg/m².
2) Table 9.1, ¾": `30 − (5,180−4,800)/(10,800−4,800)×10 = 29.36 cm` → use **20 cm**.
3) Table 9.9, 1½"×3", spacing 20: allowable **6,155 > 5,180 OK** → 1½"×3".
4) Braces as method 1: 80.1 / 88.7 / 20.8 → design 88.7 → 2-1½"×3" (184 kg).
Remark: details must be drawn to standard; working platform/hopper not shown.

#### Example 9.2 [p.355–362] — round column D = 0.60 m, H = 3.0 m, 1"×1" planed staves
Figure: plan — circle of staves inside square yoke frame (1"×10" yokes cut to semicircle) with wedges at four corners; elevation — staves vertical, yokes 12 @ 0.25 = 3.00.
**ก. Direct**
1) Pressure: liquid `2,400×3.00 = 7,200`; setting R = 4.0 m/h: `2,400(0.65×4.0)+500 = 6,740`; narrow R = 3 (as printed), d = 0.60: `300×3 + 10,000×0.60 + 1,500 = 8,400` → **6,740 kg/m²**.
2) Stud (yoke) spacing — staves 1"×1" ไม้ยาง Fb 80, E 94,100, per 1.0 m: W = 67.40 kg/cm; S = 100×2.5²/6 = 104 cm³/m:
- Bending `67.40a²/10 = 80×104` → a = √1,234 = **35 cm**
- Deflection I = 100×2.5³/12 = 130; `a = 0.71∛(94,100×130/67.40) = 0.71∛181,500` = **40 cm**
- Bending governs (of staves) → use **25 cm**.
3) Yoke size — 1"×10" boards cut round, narrowest net 17.5 cm:
- Tension `F = 6,740×0.25×0.60/2 = 505.5 kg`; `M = 6,740×0.25×0.60²/8 = 75.8 kg·m`
- A = 2.5×17.5 = 43.7 cm², S = 2.5×17.5²/6 = 128 cm³; `σ = 505.5/43.7 ± 75.8×100/128 = 11.5 ± 59.2` = 48 (comp) ; 70.7 (tension); allow Fc// = 60, Fb = 80 → **1"×10" OK**.
4) Sill: spacing ≤ 25 cm, `H = 6,740×0.60×0.25/2 = 505.5 kg` → ø4 mm nails (150 kg) → **at least 4 nails**.
5) Braces (2 sides, 60°):
- Wind `50×0.60×3.0 = 90 kg` → brace printed **105 kg**
- Level difference 0.60 m: `2,400×0.60×(0.60)²/2 = 259 kg` → brace printed **301 kg**
- Overturning 10 %: `2,400×π(0.60)²/4×3.0×(0.10×0.60) = 122 kg·m`; brace ~2.5 m above floor → `122/2.5 = 49 kg` → brace **57 kg**
- Design 301 kg; 2"×4", length `2.50/sin60° = 2.87 m`; `Fa = 0.30×94,100/(287/5.0)² = 8.6 kg/cm²`; `F = 8.6×5×10 = 430 kg`; **2-2"×4" → 860 > 301 OK**.
**ข. By tables**
1) 7,200 / 6,740 / 8,400 → 6,740. 2) Staves 1" thick, Table 9.1: `40 − (6,740−5,210)/(9,260−5,210)×10 = 36.2` → use **25 cm**. 3) Yoke per method 1 (shape differs from Table 9.9). Sill, braces as method 1.

#### Example 9.3 [p.363–369(+370–371)] — rectangular column 0.30×1.20 m, H = 3.50 m; plywood sheathing, studs 1½"×3"
Figure: vertical studs on all faces, double yokes, ties through long side.
**ก. Direct**
1) Pressure: liquid `2,400×3.50 = 8,400`; setting R = 5.0: `2,400(0.65×5.0)+500 = 8,300`; narrow d = 0.30: `300×5.0 + 10,000×0.30 + 1,500 = 6,000` → **6,000 kg/m²**.
2) Stud spacing — plywood 20 mm, studs vertical, yokes horizontal: W = 60.0 kg/cm; Fb = 135; S = 100×2.0²/6 = 67:
- Bending `60.0a²/10 = 135×67` → a = √1,507 = **39 cm**
- Deflection E = 110,000, I = 100×2.0³/12 = 67: `a = 0.71∛(110,000×67/60) = 0.71∛122,830` = **35 cm** → use **30 cm**.
3) Yoke spacing — studs 1½"×3" @30, strong axis: W = 6,000×0.30/100 = 18 kg/cm; Fb 80, S = 3.75×7.5²/6 = 35:
- Bending `18 l²/10 = 80×35` → **l = 40 cm**; deflection I = 130: `0.71∛(94,100×130/18) = 0.71∛679,611` = **62 cm**
- Use yoke spacing **50 cm c/c** (40 net + double yoke).
4) Yokes — long side split into **3 equal spans by ties** (continuous), short side simple span with tension:
Long side yokes, try 2-1½"×3" @ 0.50 m:
- 4.1 Tension `F = 6,000×0.50×0.30/2 = 450 kg`; W = 6,000×0.50/100 = 30 kg/cm; l = 120/3 = 40 cm; `M = 30×40²/10 = 4,800 kg·cm`; A = 2×3.75×7.5 = 56, S = 2(3.75×7.5²/6) = 70: `σ = 450/56 ± 4,800/70 = 8 ± 68` → **76 (tension), 60 (comp)** OK.
- 4.2 Deflection `Δ = (1/128)×30(40)⁴/(94,100×262) = 0.02 cm` ≤ 40/360 = 0.11 OK → 2-1½"×3" OK.
Short side yokes:
- 4.3 Tension `F = 6,000×0.50×0.40/2 = 600 kg`; W = 30 kg/cm, l = 30 cm: `M = 30(30)²/8 = 3,375 kg·cm`; 2-1½"×3": A = 56, S = 70: `σ = 600/56 ± 3,375/70 = 10.7 ± 48.2` = **58.9 (tension), 37.5 (comp)**; compare Fb 80, Fc// 60 OK.
- 4.4 Deflection (Eq 5.27) `Δ = 5/384 × 30(30)⁴/(94,100×260) = 0.01 cm` ≤ 30/360 = 0.08 OK.
**ข. By tables** (start [p.369]): pressures 8,400 / 8,300 / 6,000 → 6,000; plywood 20 mm, studs 1½"×3", pressure 6,000 … continuation on book p.370–371 is **missing from the scan** [illegible / not present]. (Use Tables 9.2, 9.4, 9.9 analogously.)

### B.8 Round and polygonal columns in the calculator (`src/engine/planShape.ts`)
A column input may carry `shape`; without it the column is the rectangle b × h and every result is unchanged. A round column keeps D in b = h, a regular hexagon/octagon keeps F (distance across the flats) in b = h. Lateral pressure uses d = D or F.

**Round — staves + cut-out yoke boards** (default; Ex 9.2, Fig 9.2):
- Staves (boards, or plywood cut into strips, no wider than 7.5 cm round the circle) span vertically between the yokes as a continuous beam on a 1 m strip → max yoke spacing from bending / deflection, as boards between yokes (B.4 type 1).
- Yokes: a square frame of four wide boards (1"×8", 1"×10", 1"×12"; flat, wedged or bolted at the corners), each cut out to the circle. Each board spans D: `w = p·s`, `F = w·D/2`, `M = w·D²/8`, `σ = F/A ± M/S` on the **net section** at the cut-out, Δ = 5wD⁴/384EI ≤ D/360. Auto spacing steps down 5 cm from the stave limit until the yoke passes.
- Net depth: entered, or by default board width − r₀(1 − cos 45°), r₀ = D/2 + stave thickness (the boards' inner edges meet on the circle at 45°). Ex 9.2 uses 17.5 cm on a 1"×10" (25 cm) board; the default rule gives 16.9 cm there (slightly conservative).
- Check (unit test): Ex 9.2 → P = 6,740 kg/m², staves a = 35 cm (bending), yokes @25 cm, σ = 11.6 ± 59.4 = 71.0 (t) / 47.9 (c) vs book 70.7 / 48.
- Plywood does not bend to a small radius (dry, across the face grain, APA): 6 mm R ≥ 0.6 m, 9 mm 0.9 m, 12 mm 1.8 m, 15 mm 2.4 m, 18 mm 3.6 m — so plywood is only used as strips on a column.

**Round — ready-made forms**: steel form in two halves — pressure ≤ the maker's rated pressure (default 6,000 kg/m², to be replaced) and flange bolts down both seams `T = p·(D/2)·s_bolt ≤ SWL` (auto spacing ≤ 50 cm); cardboard tube — pressure ≤ rated (default 3,000 kg/m²) only. Braces as for any column (width = D).

**Hexagon / octagon**:
- *Box of yokes + corner fillers* (default; Fig 9.2 "octagon: corner fillets"): yokes form the rectangle round the polygon (octagon F × F, hexagon 2R × F), timber fillers behind the sloping faces carry their pressure to the yokes; designed exactly as the rectangular column of that box, ties allowed. Studs on the flats against the box; side a = F·tan(π/n).
- *Ring of yokes along the faces*: every member spans a face a, simply supported at bolted corner brackets: `M = w·a²/8`, axial `T = w·F/2` (equilibrium of half the ring), combined as B.6; no ties.

**Quantities / drawings**: form area = perimeter × H (πD·H; n·a·H); concrete = section area × H (πD²/4; n·a·F/4). The 3D/2D model draws turned boxes for faces and staves and a prism for round/polygonal concrete; the BOM counts a steel form half or a tube once.

---

## PART C — CHAPTER 10: FOOTING FORMWORK (แบบหล่อฐานราก) [p.372–423]

### C.1 Introduction & footing types [p.372–374, Table 10.1]
Footing forms resist lateral pressure like a thick, low wall form. Parts in contact with the ground can use soil as bracing or as the form itself.
By soil: (1) **Spread footing (ฐานแผ่)** on firm soil; size by load and bearing capacity. (2) **Pile footing (ฐานลึก)** on soft soil; thickness ~0.75–1.50 m for piles 35–50 t safe load; may exceed 2.00 m for piles ≥ 100 t (punching shear governs).
Shapes: mostly square/rectangular; also circular, triangular, pentagonal, hexagonal, octagonal to suit pile layout; thickness may be sloped or stepped (thin at edges) to save concrete, at the cost of formwork effort.
By superstructure (Table 10.1 plan sketches):
| Type | Thai | Form character |
|---|---|---|
| Column footing | ฐานรากรับเสา | Single footing (one column); combined when columns close |
| Wall footing | ฐานรากรับกำแพง | Narrow, long strip under wall, like a wide beam using soil as bottom form |
| Box/core wall footing | ฐานรากรับกำแพงแบบปล่อง | Large mat under lift/shear core; like mass concrete |
| Grade beam | คานคอดิน | Beam on soil over full length, wide but shallow; pressure not critical; may act as strip footing |
| Combined/strap footing | ฐานรากเชิงประกอบ | Footing + large beam cast together (eccentric property-line footing) |
| Bridge pier footing | ฐานรากตอม่อสะพาน | Under water: cofferdam/sheet-pile, dewater; octagonal pile cap with 2 piers |
| Machine foundation | ฐานรากแท่นเครื่อง | Large and thick, vibration; embedded anchor bolts at exact level & centre |

### C.2 Components [p.374–379, Fig 10.1, 10.2]
| Thai | English | Notes |
|---|---|---|
| คอนกรีตหยาบ | Lean concrete / blinding | ~5 cm; on firm soil a plastic sheet; on mud/soft soil dewater, sand, compact, then lean concrete; keeps rebar/form setting-out clean; take care concrete not falling into puddles. |
| แผ่นผิวข้างแบบ | Side sheathing | Boards ¾"×6", 1"×8" or 1"×10"; or plywood / prefab panels (plywood or steel sheet); studs inside as stiffeners. Stud spacing governs thickness. |
| เคร่ายึดข้างแบบ | Side studs | Small footing: panels fixed at corners (Fig 10.1 ก) or stakes driven at bottom & braces at top (Fig 10.1 ข). Thick footing: like wall forms with wales; stakes at bottom; braces at top/mid (Fig 10.1 ค). |
| ชิ้นส่วนยึดรั้ง | Ties | (ก) embedded in concrete — usually round bars, bolted through (Fig 10.2 ก); (ข) external ties across the top of studs above concrete level (Fig 10.2 ข); (ค) external diagonal corner bracing for wide footings (Fig 10.2 ค). External ties only where sides higher than studs can cantilever from ground; timber, angle or round bar. Very large footings: ties impractical → braces. |
| ค้ำยันทางข้าง | Kickers / braces | From top/stud to excavation side or to stakes; soil must have capacity & stability (pad with boards or drive stakes deeper); check movement. |
| คานรับเคร่า | Wales | For soft/variable soil or long footings: at bottom & top edges to equalise stud movement; distributes stud loads, reduces braces/ties. |
| หลัก | Stakes | Transfer vertical & lateral loads to soil; may act as studs if embedment & strength controllable; short timber stakes pulled & reused, long ones left; steel stakes with eye at top for extraction. |

Fig 10.1 (sections in excavation): ก — two vertical stakes driven each side act as studs, sheathing inside, lean concrete; ข — stakes plus a horizontal strut at top or an inclined brace to an outer stake on the slope; ค — studs with bottom kicker stakes and two rows of inclined braces to stakes on the excavation slope.
Fig 10.2 (plans): ก — through-ties embedded with nuts/washers on studs; ข — external horizontal ties across the top over the footing between opposite studs/wales; ค — external ties plus diagonal corner braces (45°) at all four corners.

### C.3 Assembly & stripping [p.379–380]
1. Level the excavation bottom; in soft wet soil pump out water, sand, level.
2. Lean concrete ~5.0 cm, larger than footing plan.
3. Set centre and lines of footing for side forms and stake positions (or cast lean concrete with raised kicker edge).
4. Place prefabricated side panels (sheathing + studs + edge members); corners tight.
5. Kick the bottom edge against stakes driven along the lean-concrete edge, against the kicker, or nail to lean concrete with concrete nails.
6. Tie/brace the top edges per pressure; sometimes several rows of braces.
7. Seal bottom gaps; clean; rebar and concrete (sometimes rebar before forms, per plan).
Stripping reverse: remove braces/ties, then side fixings and panels one by one; easy as forms sit on ground; pull stakes for reuse if possible (in tight excavations stakes may be left).

### C.4 Design (การคำนวณแบบหล่อฐานราก) [p.380–402]
Same as wall forms but smaller pressures (lower, slower pours). Parts:
- **Lateral pressure**: as section 2.10 — ACI-347 Eq 2.7 or 2.8 (wall formulas), CEB Eq 2.12–2.14 (Table 2.1 for adjusting), or CIRA Tables 2.2–2.4.
- **Sheathing**: mostly timber (mud and water; steel rusts — use oil/other coatings). Choose thickness first, then stud spacing; book says Tables 10.2–10.4 for board/plywood/steel sheathing [sic — the examples use Tables 8.1 / 8.2]. Typical side height ≤ 3.00 m → **max pressure ≤ 7,500 kg/m²**.
- **Studs** — 3 support cases:
  1. **Cantilever (ปลายยื่น)**: thin footing, low side; studs driven into soil (embedment by soil) or stakes at stud spacing projecting to nail studs → Table 10.2ก/10.3ก/10.4ก (H = height of stud above support).
  2. **Single span (คานช่วงเดียว)**: thicker footing; top held by tie or brace, bottom by stake/kicker; stakes need not equal stud count but every stud bottom must be held → Tables ข (H = span).
  3. **Continuous (คานต่อเนื่อง ≥ 2 spans)**: thick footing; wales + through-ties or external braces against sheet piles/slope; stakes anchor braces at each stud or wale → Tables ค (H = wale spacing).
- **Wales (คานรับเคร่า)** [p.402]: only when sides are high enough to need ties/braces; carry stud reactions (point loads ≈ uniform), continuous over tie/brace points; analyse as continuous beam (section 5.2) or Tables 10.5–10.7 (timber / hot-rolled steel / light steel). **Table values are for a single member; for double members use 2×.**
- **Braces**: as section 5.4. Bracing against soil, sheet piles or structure: check bearing and settlement of the soil; if excavation slope unstable drive stakes deep and brace to them.
- **Soil checks** in Ex 10.1: stake/board bearing area × allowable soil pressure (10 t/m²) ≥ force.
- Steel tables use fy-based allowable (2,500 kg/cm² strength basis); timber soft wood Fb [value blank in scan — illegible].

### C.5 Allowable-load tables (Ch.10)
Timber stud tables (Table 10.2) — allowable concrete pressure (kg/m²), columns = stud spacing (cm) 15/20/25/30/40/50/60/80.

**10.2 ก Cantilever studs (H = height, cm)**
| Size | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| 1½"×3" | 30 | 4,030 | 3,020 | 2,415 | 2,015 | 1,510 | 1,205 | 1,005 | 755 |
| | 40 | 2,265 | 1,700 | 1,360 | 1,130 | 850 | 680 | 565 | — |
| | 50 | 1,450² | 1,085² | 870² | 725² | 540² | — | — | — |
| | 60 | 835² | 625² | 500² | — | — | — | — | — |
| 2"×4" | 30 | 9,835 | 7,375 | 5,900 | 4,915 | 3,635 | 2,950 | 2,460 | 1,840 |
| | 40 | 5,530 | 4,150 | 3,320 | 2,765 | 2,075 | 1,660 | 1,380 | 1,035 |
| | 50 | 3,540 | 2,655 | 2,125 | 1,770 | 1,325 | 1,060 | 885 | 660 |
| | 60 | 2,455 | 1,840 | 1,475 | 1,230 | 920 | 735 | 615 | — |
| | 80 | 1,130² | 850² | 680² | 565² | — | — | — | — |
| | 100 | 580² | — | — | — | — | — | — | — |
| 2"×6" | 30 | 22,160 | 16,620 | 13,295 | 11,080 | 8,310 | 6,645 | 5,540 | 4,155 |
| | 40 | 12,465 | 9,350 | 7,480 | 6,230 | 4,675 | 3,740 | 3,115 | 2,335 |
| | 50 | 7,975 | 5,980 | 4,785 | 3,985 | 2,990 | 2,390 | 1,995 | 1,495 |
| | 60 | 5,540 | 4,155 | 3,320 | 2,770 | 2,075 | 1,660 | 1,385 | 1,035 |
| | 80 | 3,115 | 2,335 | 1,870 | 1,555 | 1,165 | 935 | 775 | 580 |
| | 100 | 1,955² | 1,465² | 1,175² | 975² | 730² | 585² | — | — |
| 2"×2" | 30 | 2,370 | 1,775 | 1,420 | 1,135 | 885 | 710 | 590 | — |
| | 40 | 1,130² | 850² | 680² | 565² | — | — | — | — |
| | 50 | 580² | — | — | — | — | — | — | — |
| 3"×3" | 30 | 8,295 | 6,220 | 4,975 | 4,145 | 3,110 | 2,485 | 2,070 | 1,555 |
| | 40 | 4,665 | 3,500 | 2,800 | 2,330 | 1,750 | 1,400 | 1,165 | 875 |
| | 50 | 2,930² | 2,200² | 1,760² | 1,465² | 1,100² | 880² | 730² | 550² |
| | 60 | 1,695² | 1,270² | 1,015² | 845² | 635² | 505² | — | — |
| | 80 | 715² | 535² | — | — | — | — | — | — |
| 4"×4" | 30 | 19,670 | 14,755 | 11,800 | 9,835 | 7,375 | 5,900 | 4,915 | 3,685 |
| | 40 | 11,065 | 8,300 | 6,640 | 5,530 | 4,150 | 3,320 | 2,765 | 2,075 |
| | 50 | 7,080 | 5,310 | 4,250 | 3,540 | 2,655 | 2,125 | 1,770 | 1,325 |
| | 60 | 4,915 | 3,685 | 2,950 | 2,455 | 1,840 | 1,475 | 1,230 | 920 |
| | 80 | 2,265² | 1,700² | 1,360² | 1,130² | 850² | 680² | 565² | — |
| | 100 | 1,160² | 870² | 695² | 580² | — | — | — | — |

**10.2 ข Single-span studs (H = span, cm)**
| Size | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| 1½"×3" | 50 | 5,800 [printed "'5,800"] | 4,350 | 3,480 | 2,900 | 2,175 | 1,740 | 1,450 | 1,085 |
| | 100 | 1,450 | 1,085 | 870 | 725 | 540 | — | — | — |
| | 150 | 515² | — | — | — | — | — | — | — |
| 2"×4" | 50 | 14,165 | 10,620 | 8,500 | 7,080 | 5,310 | 4,250 | 3,540 | 2,655 |
| | 100 | 3,540 | 2,655 | 2,125 | 1,770 | 1,325 | 1,060 | 885 | 660 |
| | 150 | 1,570 | 1,180 | 940 | 785 | 590 | — | — | — |
| | 200 | 695² | 520² | — | — | — | — | — | — |
| 2"×6" | 50 | 31,915 | 23,935 | 19,145 | 15,955 | 11,965 | 9,570 | 7,975 | 5,980 |
| | 100 | 7,975 | 5,980 | 4,785 | 3,985 | 2,990 | 2,390 | 1,990 | 1,495 |
| | 150 | 3,545 | 2,660 | 2,125 | 1,770 | 1,330 | 1,060 | 885 | 665 |
| | 200 | 1,995 | 1,495 | 1,195 | 995 | 745 | 595 | — | — |
| | 250 | 1,200² | 900² | 720² | 600² | — | — | — | — |
| | 300 | 695² | 520² | — | — | — | — | — | — |
| 2"×2" | 50 | 3,410 | 2,560 | 2,045 | 1,705 | 1,280 | 1,020 | 850 | 640 |
| | 100 | 695² | 520² | 415² | 345² | 260² | 200² | 170² | 130² |
| 3"×3" | 50 | 11,945 | 8,960 | 7,165 | 5,970 | 4,480 | 3,580 | 2,985 | 2,240 |
| | 100 | 2,985 | 2,240 | 1,790 | 1,490 | 1,120 | 895 | 745 | 560 |
| | 150 | 1,040² | 780² | 625² | 520² | — | — | — | — |
| 4"×4" | 50 | 28,330 | 21,245 | 17,000 | 14,165 | 10,620 | 8,500 | 7,080 | 5,310 |
| | 100 | 7,080 | 5,310 | 4,250 | 3,540 | 2,655 | 2,125 | 1,770 | 1,325 |
| | 150 | 3,145 | 2,360 | 1,885 | 1,570 | 1,180 | 940 | 785 | 590 |
| | 200 | 1,390² | 1,045² | 835² | 695² | 520² | — | — | — |
| | 250 | 710² | 535² | — | — | — | — | — | — |

**10.2 ค Continuous studs (H = wale spacing, cm)**
| Size | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| 1½"×3" | 50 | 7,250 | 5,440 | 4,350 | 3,625 | 2,720 | 2,175 | 1,810 | 1,360 |
| | 100 | 1,810 | 1,360 | 1,085 | 905 | 680 | 540 | — | — |
| | 150 | 800 | 600 | — | — | — | — | — | — |
| 2"×4" | 50 | 17,700 | 13,280 | 10,620 | 8,850 | 6,640 | 5,310 | 4,425 | 3,320 |
| | 100 | 4,425 | 3,320 | 2,655 | 2,210 | 1,660 | 1,325 | 1,105 | 830 |
| | 150 | 1,965 | 1,475 | 1,180 | 980 | 735 | 590 | — | — |
| | 200 | 1,105 | 830 | 660 | 550 | — | — | — | — |
| | 250 | 590² | — | — | — | — | — | — | — |
| 2"×6" | 50 | 39,890 | 29,920 | 23,935 | 19,945 | 14,960 | 11,965 | 9,970 | 7,480 |
| | 100 | 9,970 | 7,480 | 5,980 | 4,985 | 3,740 | 2,990 | 2,490 | 1,870 |
| | 150 | 4,430 | 3,320 | 2,660 | 2,215 | 1,660 | 1,330 | 1,108 | 530 [uncertain] |
| | 200 | 2,490 | 1,870 | 1,495 | 1,245 | 935 | 745 | 620 | — |
| | 250 | 1,595 | 1,195 | 955 | 795 | 595 | — | — | — |
| | 300 | 1,100 | 830 | 665 | 550 | — | — | — | — |
| 2"×2" | 50 | 4,265 | 3,200 | 2,560 | 2,130 | 1,600 | 1,280 | 1,065 | 800 |
| | 100 | 1,065 | 800 | 640 | 530 | — | — | — | — |
| 3"×3" | 50 | 14,930 | 11,200 | 8,960 | 7,465 | 5,600 | 4,480 | 3,730 | 2,800 |
| | 100 | 3,730 | 2,800 | 2,240 | 1,865 | 1,400 | 1,120 | 930 | 700 |
| | 150 | 1,660 | 1,240 | 995 | 830 | 620 | — | — | — |
| | 200 | 730² | 550² | — | — | — | — | — | — |
| 4"×4" | 50 | 35,410 | 26,560 | 21,245 | 17,700 | 13,280 | 10,620 | 8,850 | 6,640 |
| | 100 | 8,850 | 6,640 | 5,310 | 4,425 | 3,320 | 2,655 | 2,210 | 1,660 |
| | 150 | 3,930 | 2,950 | 2,360 | 1,965 | 1,475 | 1,180 | 980 | 735 |
| | 200 | 2,210 | 1,660 | 1,325 | 1,100 | 830 | 665 | 550 | — |
| | 250 | 1,185² | 890² | 710² | 595² | — | — | — | — |
| | 300 | 685² | 515² | — | — | — | — | — | — |

**Table 10.3 Light channel / lipped channel studs (kg/m²)** (columns stud spacing 15/20/25/30/40/50/60/80)
10.3 ก Cantilever (H = height)
| Section | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| [60×30×2.3 | 30 | 8,740 | 6,555 | 5,240 | 4,370 | 3,275 | 2,620 | 2,185 | 1,635 |
| | 40 | 4,915 | 3,685 | 2,950 | 2,455 | 1,840 | 1,475 | 1,225 | 920 |
| | 50 | 3,145 | 2,360 | 1,885 | 1,570 | 1,180 | 940 | 765 | 590 |
| | 60 | 1,985² | 1,490² | 1,190² | 990² | 745² | 595² | — | — |
| | 80 | 835² | 625² | 500² | — | — | — | — | — |
| [80×40×2.3 | 30 | 16,165 | 12,125 | 9,700 | 8,080 | 6,060 | 4,850 | 4,040 | 3,030 |
| | 40 | 9,090 | 6,820 | 5,455 | 4,545 | 3,410 | 2,725 | 2,270 | 1,705 |
| | 50 | 5,820 | 4,365 | 3,490 | 2,910 | 2,180 | 1,745 | 1,455 | 1,090 |
| | 60 | 4,040 | 3,030 | 2,425 | 2,020 | 1,515 | 1,210 | 1,010 | 755 |
| | 80 | 2,060² | 1,545² | 1,235² | 1,030² | 772² | 618² | 515² | — |
| | 100 | 1,054² | 791² | 630² | 525² | — | — | — | — |
| [60×30×10×2.3 | 30 | 9,630 | 7,220 | 5,775 | 4,815 | 3,610 | 2,885 | 2,405 | 1,805 |
| | 40 | 5,415 | 4,060 | 3,250 | 2,705 | 2,030 | 1,625 | 1,350 | 1,015 |
| | 50 | 3,465 | 2,600 | 2,080 | 1,730 | 1,300 | 1,040 | 865 | 650 |
| | 60 | 2,180² | 1,635² | 1,305² | 1,090² | 815² | 655² | 545² | — |
| | 80 | 920² | 690² | 550² | 460² | — | — | — | — |
| [75×45×15×2.3 | 30 | 18,330 | 13,750 | 11,000 | 9,165 | 6,875 | 5,500 | 4,580 | 3,435 |
| | 40 | 10,310 | 7,730 | 6,185 | 5,155 | 3,865 | 3,090 | 2,575 | 1,930 |
| | 50 | 6,600 | 4,950 | 3,960 | 3,300 | 2,475 | 1,980 | 1,650 | 1,235 |
| | 60 | 4,580 | 3,435 | 2,750 | 2,290 | 1,715 | 1,375 | 1,145 | 860 |
| | 80 | 2,190² | 1,640² | 1,310² | 1,095² | 820² | 655² | 545² | — |
| | 100 | 1,120² | 840² | 670² | 560² | — | — | — | — |

10.3 ข Single span (H = span)
| Section | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| [60×30×2.3 | 50 | 12,585 | 9,440 | 7,550 | 6,290 | 4,720 | 3,775 | 3,145 | 2,360 |
| | 100 | 3,145 | 2,360 | 1,880 | 1,570 | 1,180 | 940 | 785 | 590 |
| | 150 | 1,220² | 915² | 730² | 610² | — | — | — | — |
| | 200 | 515² | — | — | — | — | — | — | — |
| [80×40×2.3 | 50 | 23,280 | 17,460 | 13,965 | 11,640 | 8,730 | 6,980 | 5,820 | 4,365 |
| | 100 | 5,820 | 4,365 | 3,490 | 2,910 | 2,180 | 1,745 | 1,455 | 1,090 |
| | 150 | 2,585 | 1,940 | 1,550 | 1,290 | 970 | 775 | 645 | — |
| | 200 | 1,265² | 945² | 750² | 630² | — | — | — | — |
| | 250 | 645² | — | — | — | — | — | — | — |
| [60×30×10×2.3 | 50 | 13,865 | 10,400 | 8,320 | 6,930 | 5,200 | 4,160 | 3,465 | 2,600 |
| | 100 | 3,465 | 2,600 | 2,080 | 1,730 | 1,300 | 1,040 | 865 | 650 |
| | 150 | 1,340² | 1,005² | 800² | 670² | 500² | — | — | — |
| | 200 | 565² | — | — | — | — | — | — | — |
| [75×45×15×2.3 | 50 | 26,400 | 19,800 | 15,840 | 13,200 | 9,900 | 7,920 | 6,600 | 4,950 |
| | 100 | 6,600 | 4,950 | 3,960 | 3,300 | 2,475 | 1,980 | 1,650 | 1,235 |
| | 150 | 2,930 | 2,200 | 1,760 | 1,465 | 1,100 | 880 | 730 | 550 |
| | 200 | 1,345² | 1,005² | 805² | 670² | 500 | — | — | — |
| | 250 | 685² | 515² | — | — | — | — | — | — |

10.3 ค Continuous (H = wale spacing)
| Section | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| [60×30×2.3 | 50 | 15,730 | 11,800 | 9,440 | 7,865 | 5,900 | 4,720 | 3,930 | 2,950 |
| | 100 | 3,930 | 2,950 | 2,360 | 1,965 | 1,475 | 1,180 | 980 | 735 |
| | 150 | 1,745 | 1,310 | 1,045 | 870 | 655 | 520 | — | — |
| | 200 | 855² | 640² | 515² | — | — | — | — | — |
| [80×40×2.3 | 50 | 29,100 | 21,825 | 17,460 | 14,550 | 10,910 | 8,730 | 7,275 | 5,455 |
| | 100 | 7,275 | 5,455 | 4,365 | 3,635 | 2,725 | 2,180 | 1,815 | 1,360 |
| | 150 | 3,230 | 2,425 | 1,940 | 1,615 | 1,210 | 970 | 805 | 605 |
| | 200 | 1,815 | 1,360 | 1,090 | 905 | 680 | 545 | — | — |
| | 250 | 1,080² | 810² | 645² | 540² | — | — | — | — |
| | 300 | 625² | — | — | — | — | — | — | — |
| [60×30×10×2.3 | 50 | 17,330 | 13,000 | 10,400 | 8,665 | 6,500 | 5,200 | 4,330 | 3,250 |
| | 100 | 4,330 | 3,250 | 2,600 | 2,165 | 1,625 | 1,300 | 1,080 | 810 |
| | 150 | 1,925 | 1,440 | 1,155 | 960 | 720 | 575 | — | — |
| | 200 | 940² | 700² | 565² | — | — | — | — | — |
| [75×45×15×2.3 | 50 | 33,000 | 24,750 | 19,800 | 16,500 | 12,375 | 9,900 | 8,250 | 6,185 |
| | 100 | 8,250 | 6,185 | 4,950 | 4,125 | 3,090 | 2,475 | 2,060 | 1,545 |
| | 150 | 3,665 | 2,750 | 2,200 | 1,830 | 1,375 | 1,100 | 915 | 685 |
| | 200 | 2,060 | 1,545 | 1,235 | 1,030 | 770 | 615 | 515 | — |
| | 250 | 1,145² | 860² | 685² | 470² | — | — | — | — |
| | 300 | 660² | 500² | — | — | — | — | — | — |

**Table 10.4 Hollow rectangular/square tube studs (kg/m²)**
10.4 ก Cantilever (H = height)
| Section | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| □25×50×1.6 | 30 | 5,200 | 3,900 | 3,120 | 2,600 | 1,950 | 1,560 | 1,300 | 975 |
| | 40 | 2,925 | 2,195 | 1,755 | 1,460 | 1,095 | 875 | 730 | 545 |
| | 50 | 1,695² | 1,270² | 1,015² | 845² | 635² | 505² | — | — |
| | 60 | 980² | 735² | 585² | — | — | — | — | — |
| □30×60×2.3 | 30 | 10,385 | 7,790 | 6,230 | 5,190 | 3,895 | 3,115 | 2,595 | 1,945 |
| | 40 | 5,840 | 4,380 | 3,505 | 2,920 | 2,190 | 1,750 | 1,460 | 1,095 |
| | 50 | 3,740 | 2,805 | 2,244 | 1,870 | 1,400 | 1,120 | 935 | 700 |
| | 60 | 2,350² | 1,765² | 1,410² | 1,175² | 880² | 705² | 585 | — |
| | 80 | 990² | 740² | 595² | — | — | — | — | — |
| | 100 | 505² | — | — | — | — | — | — | — |
| □50×50×2.3 | 30 | 11,740 | 8,805 | 7,040 | 5,870 | 4,400 | 3,520 | 2,935 | 2,200 |
| | 40 | 6,600 | 4,950 | 3,960 | 3,300 | 2,475 | 1,980 | 1,650 | 1,235 |
| | 50 | 3,830² | 2,875² | 2,300² | 1,915² | 1,435² | 1,150² | 955² | 715² |
| | 60 | 2,215² | 1,660² | 1,330² | 1,110² | 830² | 665² | 555² | — |
| | 80 | 935² | 700² | 560² | 465² | — | — | — | — |
| □75×75×2.3 | 30 | 28,200 | 21,150 | 16,920 | 14,100 | 10,575 | 8,460 | 7,050 | 5,285 |
| | 40 | 15,865 | 11,895 | 9,515 | 7,930 | 5,950 | 4,755 | 3,965 | 2,970 |
| | 50 | 10,150 | 7,615 | 6,090 | 5,075 | 3,805 | 3,045 | 2,535 | 1,900 |
| | 60 | 7,050 | 5,285 | 4,230 | 3,525 | 2,640 | 2,115 | 1,760 | 1,320 |
| | 80 | 3,370² | 2,525² | 2,020² | 1,685² | 1,260² [uncertain] | 1,010² | 840² | 630² |
| | 100 | 1,725² | 1,290² | 1,035² | 860² | 645² | 515² | — | — |

10.4 ข Single span (H = span)
| Section | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| □25×50×1.6 | 50 | 7,490 | 5,620 | 4,495 | 3,745 | 2,810 | 2,245 | 1,870 | 1,405 |
| | 100 | 1,870 | 1,405 | 1,120 | 935 | 700 | 560 | — | — |
| | 150 | 600² | — | — | — | — | — | — | — |
| □30×60×2.3 | 50 | 14,960 | 11,220 | 8,975 | 7,480 | 5,610 | 4,480 | 3,740 | 2,805 |
| | 100 | 3,740 | 2,805 | 2,240 | 1,870 | 1,400 | 1,120 | 935 | 700 |
| | 150 | 1,445² | 1,080² | 865² | 720² | 540² | — | — | — |
| | 200 | 610² | — | — | — | — | — | — | — |
| □50×50×2.3 | 50 | 16,900 | 12,680 | 10,140 | 8,450 | 6,340 | 5,070 | 4,225 | 3,170 |
| | 100 | 4,225 | 3,170 | 2,536 | 2,110 | 1,585 | 1,265 | 1,055 | 790 |
| | 150 | 1,360² | 1,020² | 815² | 680² | 510² | — | — | — |
| | 200 | 575² | — | — | — | — | — | — | — |
| □75×75×2.3 | 50 | 40,610 | 30,460 | 24,365 | 20,300 | 15,230 | 12,180 | 10,150 | 7,615 |
| | 100 | 10,150 | 7,615 | 6,090 | 5,075 | 3,805 | 3,045 | 2,535 | 1,900 |
| | 150 | 4,510 | 3,380 | 2,705 | 2,255 | 1,690 | 1,350 | 1,125 | 845 |
| | 200 | 2,070² | 1,550² | 1,240 | 1,035 | 775 | 620² | 515² | — |
| | 250 | 1,060² | 795² | 635 | 530 | — | — | — | — |
| | 300 | 510² | — | — | — | — | — | — | — |

10.4 ค Continuous (H = wale spacing)
| Section | H | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| □25×50×1.6 | 50 | 9,365 | 7,025 | 5,620 | 4,680 | 3,510 | 2,810 | 2,340 | 1,755 |
| | 100 | 2,340 | 1,755 | 1,405 | 1,170 | 875 | 700 | 585 | — |
| | 150 | 1,005² | 750² | 600² | 500² | — | — | — | — |
| □30×60×2.3 | 50 | 18,700 | 14,025 | 11,220 | 9,350 | 7,010 | 5,610 | 4,675 | 3,505 |
| | 100 | 4,675 | 3,505 | 2,805 | 2,335 | 1,750 | 1,400 | 1,165 | 875 |
| | 150 | 2,075 | 1,555 | 1,245 | 1,035 | 775 | 620 | 520 | — |
| | 200 | 1,015² | 760² | 610² | 505² | — | — | — | — |
| | 250 | 520² | — | — | — | — | — | — | — |
| □50×50×2.3 | 50 | 21,130 | 15,850 | 12,680 | 10,565 | 7,925 | 6,340 | 5,280 | 3,960 |
| | 100 | 5,280 | 3,960 | 3,170 | 2,640 | 1,980 | 1,585 | 1,320 | 990 |
| | 150 | 2,270² | 1,700² | 1,360² | 1,135² | 850² | 680² | 565² | — |
| | 200 | 955² | 715² | 575² | — | — | — | — | — |
| □75×75×2.3 | 50 | 33,000 | 24,750 | 19,800 | 16,500 | 12,375 | 9,900 | 8,250 | 6,185 |
| | 100 | 8,250 | 6,185 | 4,950 | 4,125 | 3,090 | 2,475 | 2,060 | 1,545 |
| | 150 | 3,665 | 2,750 | 2,200 | 1,830 | 1,375 | 1,100 | 915 | 685 |
| | 200 | 2,060 | 1,545 | 1,235 | 1,030 | 770 | 615 | 515 | — |
| | 250 | 1,145² | 860² | 685² | 570² | — | — | — | — |
| | 300 | 660² | 495² | — | — | — | — | — | 125² [as printed] |
| □100×50×2.3 | 50 | 56,565 | 42,425 | 33,940 | 28,280 | 21,210 | 16,970 | 14,140 | 10,605 |
| | 100 | 14,140 | 10,605 | 8,485 | 7,070 | 5,300 | 4,240 | 3,535 | 2,650 |
| | 150 | 6,285 | 4,710 | 3,770 | 3,140 | 2,355 | 1,885 | 1,570 | 1,175 |
| | 200 | 3,535 | 2,650 | 2,120 | 1,765 | 1,325 | 1,060 | 880 | 660 |
| | 250 | 2,260 | 1,695 | 1,355 | 1,130 | 845 | 675 | 565 | — |
| | 300 | 1,515² | 1,135² | 910² | 755² | 565² | — | — | — |
(The 75×75 values in 10.4ค are identical to 75×45×15 lipped in 10.3ค as printed.)

**Wale tables (คานรับเคร่า)** — allowable concrete pressure (kg/m²); rows H = wale spacing (cm); columns = **brace/tie spacing** (ระยะค้ำยัน, cm) 30/40/50/60/80/90/100/120/150. **Single member values; ×2 for double wales.**

Table 10.5 Timber wales
| Size | H | 30 | 40 | 50 | 60 | 80 | 90 | 100 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1½"×3" | 50 | 6,040 | 3,400 | 2,175 | 1,510 | 850 | 670 | — | — | — |
| | 100 | 3,020 | 1,700 | 1,085 | 755 | — | — | — | — | — |
| | 150 | 2,015 | 1,130 | 725 | 500 | — | — | — | — | — |
| | 200 | 1,510 | 850 | 540 | — | — | — | — | — | — |
| | 250 | 1,205 | 680 | — | — | — | — | — | — | — |
| | 300 | 1,005 | 565 | — | — | — | — | — | — | — |
| 2"×4" | 50 | 14,755 | 8,300 | 5,310 | 3,685 | 2,075 | 1,640 | 1,320 | 920 | 590 |
| | 100 | 7,375 | 4,150 | 2,655 | 1,840 | 1,035 | 820 | 660 | — | — |
| | 150 | 4,915 | 2,765 | 1,770 | 1,225 | 690 | 545 | — | — | — |
| | 200 | 3,685 | 2,075 | 1,325 | 920 | 515 | — | — | — | — |
| | 250 | 2,950 | 1,660 | 1,060 | 735 | — | — | — | — | — |
| | 300 | 2,460 | 1,380 | 885 | 615 | — | — | — | — | — |
| 2"×6" | 50 | 33,240 | 18,700 | 11,965 | 8,310 | 4,675 | 3,690 | 2,990 | 2,075 | 1,330 |
| | 100 | 16,620 | 9,350 | 5,980 | 4,155 | 2,335 | 1,845 | 1,495 | 1,035 | 665 |
| | 150 | 11,080 | 6,230 | 3,990 | 2,770 | 1,555 | 1,230 | 995 | 690 | — |
| | 200 | 8,310 | 4,675 | 2,990 | 2,075 | 1,165 | 920 | 745 | 515 | — |
| | 250 | 6,645 | 3,740 | 2,390 | 1,660 | 935 | 735 | 595 | — | — |
| | 300 | 5,540 | 3,115 | 1,995 | 1,385 | 775 | 615 | — | — | — |
| 2"×2" | 50 | 3,555 | 2,000 | 1,280 | 885 | 500 | — | — | — | — |
| | 100 | 1,775 | 1,000 | 640 | — | — | — | — | — | — |
| | 150 | 1,185 | 665 | — | — | — | — | — | — | — |
| | 200 | 885 | 500 | — | — | — | — | — | — | — |
| | 250 | 710 | — | — | — | — | — | — | — | — |
| 3"×3" | 50 | 12,440 | 7,000 | 4,480 | 3,110 | 1,750 | 1,380 | 1,120 | 775 | — |
| | 100 | 6,220 | 3,500 | 2,240 | 1,555 | 875 | 690 | — | — | — |
| | 150 | 4,145 | 2,330 | 1,490 | 1,035 | 580 | — | — | — | — |
| | 200 | 3,110 | 1,750 | 1,120 | 775 | — | — | — | — | — |
| | 250 | 2,485 | 1,400 | 895 | 620 | — | — | — | — | — |
| | 300 | 2,070 | 1,165 | 745 | 515 | — | — | — | — | — |
| 4"×4" | 50 | 29,510 | 16,600 | 10,620 | 7,375 | 4,150 | 3,275 | 2,655 | 1,840 | 1,180 |
| | 100 | 14,755 | 8,300 | 5,310 | 3,685 | 2,075 | 1,640 | 1,325 | 920 | 590 |
| | 150 | 9,835 | 5,530 | 3,540 | 2,460 | 1,380 | 1,090 | 885 | 615 | — |
| | 200 | 7,375 | 4,150 | 2,655 | 1,840 | 1,035 | 820 | 660 | — | — |
| | 250 | 5,900 | 3,320 | 2,125 | 1,475 | 830 | 655 | 530 | — | — |
| | 300 | 4,915 | 2,765 | 1,770 | 1,230 | 690 | 545 | — | — | — |

Table 10.6 Hot-rolled steel wales (ก angle, ข channel "C", ค WF)
| Section | H | 30 | 40 | 50 | 60 | 80 | 90 | 100 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|
| L50×50×6 | 50 | 9,860 | 5,545 | 3,550 | 2,465 | 1,365 | 1,095 | 885 | 615 | — |
| | 100 | 4,930 | 2,770 | 1,775 | 1,230 | 690 | 545 | — | — | — |
| | 150 | 3,285 | 1,845 | 1,180 | 820 | — | — | — | — | — |
| | 200 | 2,465 | 1,385 | 885 | 615 | — | — | — | — | — |
| | 250 | 1,970 | 1,110 | 710 | — | — | — | — | — | — |
| | 300 | 1,640 | 920 | 590 | — | — | — | — | — | — |
| L65×65×6 | 50 | 17,415 | 9,795 | 6,270 | 4,350 | 2,445 | 1,935 | 1,565 | 1,085 | 695 |
| | 100 | 8,705 | 4,895 | 3,135 | 2,175 | 1,220 | 965 | 780 | 540 | — |
| | 150 | 5,805 | 3,265 | 2,090 | 1,450 | 815 | 645 | 520 | — | — |
| | 200 | 4,350 | 2,445 | 1,565 | 1,085 | 610 | — | — | — | — |
| | 250 | 3,480 | 1,955 | 1,250 | 870 | — | — | — | — | — |
| | 300 | 2,900 | 1,630 | 1,045 | 725 | — | — | — | — | — |
| L75×75×9 | 50 | 33,610 | 18,900 | 12,100 | 8,400 | 4,725 | 3,730 | 3,025 | 2,100 | 1,340 |
| | 100 | 16,805 | 9,450 | 6,050 | 4,200 | 2,360 | 1,865 | 1,510 | 1,050 | 670 |
| | 150 | 11,200 | 6,300 | 4,030 | 2,800 | 1,575 | 1,240 | 1,005 | 700 | — |
| | 200 | 8,400 | 4,725 | 3,025 | 2,100 | 1,180 | 930 | 755 | 520 | — |
| | 250 | 6,720 | 3,780 | 2,420 | 1,680 | 945 | 745 | 605 | — | — |
| | 300 | 5,600 | 3,150 | 2,015 | 1,400 | 785 | 620 | 500 | — | — |
| [75×40×5 | 50 | 55,830 | 31,405 | 20,100 | 13,960 | 7,850 | 6,200 | 5,025 | 3,490 | 2,230 |
| | 100 | 27,915 | 15,700 | 10,050 | 6,980 | 3,925 | 3,100 | 2,510 | 1,745 | 1,115 |
| | 150 | 18,610 | 10,465 | 6,700 | 4,650 | 2,615 | 2,065 | 1,675 | 1,160 | 740 |
| | 200 | 13,955 | 7,850 | 5,025 | 3,490 | 1,960 | 1,550 | 1,255 | 870 | 555 |
| | 250 | 11,165 | 6,280 | 4,020 | 2,790 | 1,570 | 1,240 | 1,005 | 695 | 445 |
| | 300 | 9,305 | 5,230 | 3,350 | 2,325 | 1,305 | 1,030 | 835 | 580 | 370 |
| [100×50×5 | 50 | 104,400 | 58,750 | 37,600 | 26,110 | 14,685 | 11,600 | 9,400 | 6,525 | 4,175 |
| | 100 | 52,220 | 29,375 | 18,800 | 13,055 | 7,340 | 5,800 | 4,700 | 3,260 | 2,085 |
| | 150 | 34,810 | 19,580 | 12,530 | 8,700 | 4,895 | 3,865 | 3,130 | 2,175 | 1,390 |
| | 200 | 26,110 | 14,685 | 9,400 | 6,525 | 3,670 | 2,900 | 2,350 | 1,530 | 1,040 |
| | 250 | 20,880 | 11,750 | 7,520 | 5,220 | 2,935 | 2,320 | 1,880 | 1,305 | 835 |
| | 300 | 17,400 | 9,790 | 6,265 | 4,350 | 2,445 | 1,930 | 1,565 | 1,085 | 695 |
| WF100×50×5×7 | 50 | 104,160 | 58,590 | 37,500 | 26,040 | 14,645 | 11,570 | 9,375 | 6,510 | 4,165 |
| | 100 | 52,080 | 29,295 | 18,750 | 13,020 | 7,320 | 5,785 | 4,685 | 3,255 | 2,080 |
| | 150 | 34,720 | 19,530 | 12,500 | 8,680 | 4,880 | 3,855 | 3,125 | 2,170 | 1,385 |
| | 200 | 26,040 | 14,645 | 9,375 | 6,510 | 3,660 | 2,890 | 2,340 | 1,625 | 1,040 |
| | 250 | 20,830 | 11,715 | 7,500 | 5,205 | 2,930 | 2,310 | 1,875 | 1,300 | 830 |
| | 300 | 17,360 | 9,765 | 6,250 | 4,340 | 2,440 | 1,925 | 1,560 | 1,085 | 690 |
| WF150×75×5×7 | 50 | 246,660 | 138,750 | 88,800 | 61,660 | 34,685 | 27,405 | 22,200 | 15,415 | 9,865 |
| | 100 | 123,330 | 69,375 | 44,400 | 30,830 | 17,340 | 13,700 | 11,100 | 7,705 | 4,930 |
| | 150 | 82,220 | 46,250 | 29,600 | 20,555 | 11,560 | 9,135 | 7,400 | 5,135 | 3,285 |
| | 200 | 61,660 | 34,685 | 22,200 | 15,415 | 8,670 | 6,850 | 5,550 | 3,850 | 2,465 |
| | 250 | 49,330 | 27,750 | 17,760 | 12,330 | 6,935 | 5,480 | 4,440 | 3,080 | 1,970 |
| | 300 | 41,110 | 23,125 | 14,800 | 10,275 | 5,780 | 4,565 | 3,700 | 2,565 | 1,640 |

Table 10.7 Light-gauge steel wales (ก light channel, ข lipped channel, ค hollow tube)
| Section | H | 30 | 40 | 50 | 60 | 80 | 90 | 100 | 120 | 150 |
|---|---|---|---|---|---|---|---|---|---|---|
| [60×30×2.3 | 50 | 13,110 | 7,375 | 4,720 | 3,275 | 1,840 | 1,455 | 1,180 | 815 | 520 |
| | 100 | 6,555 | 3,685 | 2,360 | 1,635 | 920 | 725 | 590 | — | — |
| | 150 | 4,370 | 2,455 | 1,570 | 1,090 | 610 | — | — | — | — |
| | 200 | 3,275 | 1,840 | 1,180 | 820 | — | — | — | — | — |
| | 250 | 2,620 | 1,475 | 940 | 655 | — | — | — | — | — |
| | 300 | 2,185 | 1,225 | 785 | 545 | — | — | — | — | — |
| [80×40×2.3 | 50 | 21,415 | 12,045 | 7,710 | 5,350 | 3,010 | 2,380 | 1,925 | 1,335 | 855 |
| | 100 | 10,705 | 6,020 | 3,855 | 2,675 | 1,505 | 1,190 | 960 | 665 | — |
| | 150 | 7,135 | 4,015 | 2,570 | 1,780 | 1,000 | 790 | 640 | — | — |
| | 200 | 5,350 | 3,010 | 1,925 | 1,335 | 750 | 595 | — | — | — |
| | 250 | 4,280 | 2,405 | 1,540 | 1,070 | 600 | — | — | — | — |
| | 300 | 3,565 | 2,005 | 1,285 | 890 | 500 | — | — | — | — |
| [60×30×10×2.3 | 50 | 14,440 | 8,125 | 5,200 | 3,610 | 2,030 | 1,605 | 1,300 | 900 | 575 |
| | 100 | 7,220 | 4,060 | 2,600 | 1,805 | 1,015 | 800 | 650 | — | — |
| | 150 | 4,815 | 2,705 | 1,730 | 1,200 | 675 | 535 | — | — | — |
| | 200 | 3,610 | 2,030 | 1,300 | 900 | 505 | — | — | — | — |
| | 250 | 2,885 | 1,625 | 1,040 | 720 | — | — | — | — | — |
| | 300 | 2,405 | 1,350 | 865 | 600 | — | — | — | — | — |
| [75×45×15×2.3 | 50 | 27,500 | 15,465 | 9,900 | 6,875 | 3,865 | 3,055 | 2,475 | 1,715 | 1,100 |
| | 100 | 13,750 | 7,730 | 4,950 | 3,435 | 1,930 | 1,525 | 1,235 | 855 | 550 |
| | 150 | 9,165 | 5,155 | 3,300 | 2,290 | 1,285 | 1,015 | 825 | 570 | — |
| | 200 | 6,875 | 3,865 | 2,475 | 1,715 | 955 | 760 | 615 | — | — |
| | 250 | 5,500 | 3,090 | 1,980 | 1,375 | 770 | 610 | 495 | — | — |
| | 300 | 4,580 | 2,575 | 1,650 | 1,145 | 640 | 505 | — | — | — |

Table 10.7 ค Hollow tube wales (extra columns 160/180/200)
| Section | H | 30 | 40 | 50 | 60 | 80 | 90 | 100 | 120 | 150 | 160 | 180 | 200 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| □30×60×2.3 | 50 | 15,580 | 8,765 | 5,610 | 3,895 | 2,190 | 1,730 | 1,400 | 970 | 620 | 545 | 415² | 305² |
| | 100 | 7,790 | 4,380 | 2,805 | 1,945 | 1,095 | 865 | 700 | 485 | 310 | 270 | 205² | 150² |
| | 150 | 5,190 | 2,920 | 1,870 | 1,295 | 730 | 575 | 465 | 320 | 205 | 180 | 135² | 100² |
| | 200 | 3,895 | 2,190 | 1,400 | 970 | 545 | 430 | 350 | 240 | 155 | 135 | 100² | — |
| | 250 | 3,115 | 1,750 | 1,120 | 775 | 435 | 345 | 280 | 195 | 125 | 110 | — | — |
| | 300 | 2,595 | 1,460 | 935 | 645 | 365 | 285 | 230 | 160 | 100 | — | — | — |
| □50×50×2.3 | 50 | 17,610 | 9,905 | 6,340 | 4,400 | 2,475 | 1,955 | 1,585 | 1,100 | 680² | 560² | 390² | 285² |
| | 100 | 8,805 | 4,950 | 3,170 | 2,200 | 1,235 | 975 | 790 | 550 | 340² | 280² | 195² | 140² |
| | 150 | 5,870 | 3,300 | 2,110 | 1,465 | 825 | 650 | 525 | 365 | 225² | 185² | 130² | — |
| | 200 | 4,400 | 2,475 | 1,585 | 1,100 | 615 | 485 | 395 | 275 | 170² | 140² | — | — |
| | 250 | 3,520 | 1,980 | 1,265 | 880 | 495 | 390 | 315 | 220 | 135² | 110² | — | — |
| | 300 | 2,935 | 1,650 | 1,055 | 730 | 410 | 325 | 260 | 180 | 110² | — | — | — |
| □100×100×2.3 | 50 | 77,635 | 43,670 | 27,950 | 19,405 | 10,915 | 8,625 | 6,985 | 4,850 | 3,105 | 2,725 | 2,155 | 1,745 |
| | 100 | 38,815 | 21,835 | 13,975 | 9,700 | 5,455 | 4,310 | 3,490 | 2,425 | 1,550 | 1,360 | 1,075 | 870 |
| | 150 | 25,875 | 14,555 | 9,315 | 6,465 | 3,635 | 2,875 | 2,325 | 1,615 | 1,035 | 905 | 715 | 580 |
| | 200 | 19,405 | 10,915 | 6,985 | 4,805 | 2,725 | 2,155 | 1,745 | 1,210 | 775 | 680 | 535 | 435 |
| | 250 | 15,525 | 8,730 | 5,590 | 3,880 | 2,180 | 1,725 | 1,395 | 970 | 620 | 545 | 430 | 345 |
| | 300 | 12,935 | 7,275 | 4,655 | 3,230 | 1,815 | 1,435 | 1,160 | 805 | 515 | 450 | 355 | 290 |
(Columns of 10.7 ค as printed: 30, 40, 50, 60, 80, 90, 100, 120, 150, 160, 180, 200.)

### C.6 Worked examples — Chapter 10

#### Example 10.1 [p.403–409] — grade beam 0.40 m wide × 1.20 m high on compacted soil, lean concrete below; board sheathing; ไม้ยาง 1½"×3" studs and diagonal braces
Figure: two side forms 0.40 apart; studs vertical, two inclined braces each side from stud to a stake on the excavation slope; bottom kicker stakes; height 1.20.
**ก. Direct**
1) Pressure (CEB): liquid `2,400×1.20 = 2,880`; setting R = 2: `2,400×0.65×2+500 = 3,620`; narrow d = 0.40: `300×2+10,000(0.40)+1,500 = 6,100` → use minimum **2,880 kg/m²**.
2) Stud spacing — boards ¾"×8" (b = 20 cm, t = 1.9 cm), Fb 80, E 94,100; W = 2,880×0.20/100 = 5.76 kg/cm:
- Bending: S = 20×1.9²/6 = 12.0; `5.76a²/10 = 80×12` → a = √1,666 = **41 cm**
- Deflection: I = 20×1.9³/12 = 11.4; `a = 0.71∛(94,100×11.4/5.76) = 0.71×57.2` = **41 cm** → use **40 cm**.
3) Brace (support) spacing along stud — pressure assumed uniform over depth; studs 1½"×3" @ 0.40; stud = 2-span beam, `M = Wl²/8`:
- W = 0.40×2,880/100 = 11.52 kg/cm; S = 3.7(7.5)²/6 = 34.7; `11.52 l²/8 = 80×34.7` → l = √1,928 = **44 cm**
- Deflection I = 130: `l = 0.71∛(94,100×130/11.52) = 0.71∛1,061,900` = **72 cm**
- Support spacing **45 cm**; plus 2 supports ≈ 10 cm → top overhang ≈ 20 cm (check if desired).
4) Braces — horizontal-ish at every stud, max 45°:
- Horizontal force `F = w·a·l = 2,880×0.40(0.45/2 + 0.20) = 484 kg`
- Along brace `484/cos45° = 484/0.709 = 683 kg`
- 1½"×3", length 90/cos45° = 127 cm, d = 3.7: `Fa = 0.30×94,100/(127/3.7)² = 24 kg/cm²`; `F = 24×(3.7×7.5) = 666 ≈ 680 kg` OK.
5) Soil bearing for outer stake: horizontal `2×484 = 968 kg`; soil 10 t/m²; 10" board (0.25 m wide) behind stake: `10,000×0.25·l = 968` → **l = 0.39 m**.
6) Sill (ธรณีแบบ): load `2,880×0.45/2 = 648 kg/m`; stake at every stud: `648×0.40 = 259 kg`; stake 1½"×3": `10,000×0.037·l = 259` → **l = 0.70 m** → stakes **70 cm deep @ 0.40 m**.
Remark: suitable for firm soil only; on soft soil use ties and wales like a wall form so the two sides balance, braces only for alignment.
**ข. By tables**
1) 2,880 / 3,620 / 6,100 → 2,880.
2) Boards ¾"×8", Table 8.1: `40 − (2,880−2,870)/(5,195−2,870)×10 = 39.9` → **40 cm**.
3) Studs 1½"×3" @40, Table 10.2 ค: `100 − (2,880−680)/(2,720−680)×50 = 46` → **45 cm** (as method 1). Braces as method 1.
Figure [p.409]: elevation studs @0.40 with two rows of brace connections; section with two braces each side to ground stakes, kicker stakes at bottom.

#### Example 10.2 [p.410–416] — bridge pier footing on 2 rows of piles, 2.40 × 10.00 m plan, 4.00 m high; plywood 20 mm; studs & other parts steel; use form ties
Figure: plan 10.00 × 2.40 with vertical studs all round, diagonal corner braces inside ends; elevation 4.00 high with studs (เคร่า), double wales (คานรับเคร่า) and ties (เหล็กยึดรั้ง), 4 wale rows.
**ก. Direct**
1) Pressure: liquid `2,400×4.0 = 9,600`; setting R = 2.0: `3,620`; narrow d = 2.40: printed `300×2 + 1,000×2.40 = 24,600` (formula with 10,000·d +1,500 gives 26,100) → **3,620 kg/m²**.
2) Stud spacing — plywood 20 mm, Fb 135, E 110,000; W = 36.2 kg/cm; S = 100×2²/6 = 67:
- Bending `36.20a²/10 = 135×67` → a = √2,499 = **50 cm**
- Deflection I = 100×2³/12 = 67: `a = 0.71∛(110,000×67/36.20) = 0.71∛203,590` = **42 cm** → **40 cm**.
3) Wale spacing — studs □100×50×2.3 @ 0.40 m (Fb = 1,250, Sx = 17 cm³, Ix = 84.8 cm⁴):
- W = 3,620×0.40/100 = 14.48 kg/cm; `14.48 l²/10 = 1,250×17` → l = √14,675 = **121 cm**
- Deflection E = 2,000,000: `l = 0.71∛(2,000,000×84.8/14.48) = 0.71∛11,713,000` = **162 cm**
- Strength governs → **1.20 m**.
4) Wales — ties every 1.20 m horizontally:
- W = 3,620×1.20 = 4,344 kg/m, l = 1.20: `M = 4,344×1.20²/10 = 625 kg·m`; `S = 625×100/1,250 = 50 cm³` → **2-□100×100×2.3**: S = 27.9×2 = 55.8 > 50 OK.
- Deflection W = 43.44 kg/cm, l = 120, E = 2,000,000, I = 2×140: `Δ = 43.44(120)⁴/(128×2,000,000×2×140) = 0.12 cm` < 120/360 = 0.33 OK.
5) Ties: tributary `1.20×1.20 = 1.44 m²`; tension `1.44×3,620 = 5,213 kg`; Ft = 0.60×2,400 = 1,440 kg/cm²; area `5,213/1,440 = 3.6 cm²` → **2-ø20 mm welded to ø25 mm bolts**.
Figure: elevation studs @0.40, wales @1.20.
**ข. By tables**
1) 9,600 / 3,620 / 24,600 → 3,620.
2) Plywood 20 mm (book cites Table 8.1, values are Table 8.2): `60 − (3,620−1,250)/(4,250−1,250)×20 ≈ 44` → use **40 cm**.
3) Studs □100×50×2.3 @40, Table 10.4 ค: `150 − (3,620−2,355)/(5,300−2,355)×50 = 128.5` → **1.20 m**. (Table 10.4 ค □100×50×2.3 @40: H100 = 5,300, H150 = 2,355.)
4) Wales 2-□100×100×2.3, tie spacing 1.20, wale spacing 1.20; Table 10.7 ค (brace spacing 120 col; H between 100 & 150): `2(1,615 + (150−120)/(150−100)×810) = 4,202 kg/m² > 3,620` OK.
Ties etc. as method 1.

#### Example 10.3 [p.417–423] — pile cap 2.40 × 3.60 m, 2.00 m thick; plywood 15 mm; ไม้ยาง studs 1½"×3"; steel wales; ties as appropriate
Figure: plan 3.60 × 2.40 with studs all round, internal diagonal ties at corners and through ties; elevation 2.00 high with 4 wale rows.
**ก. Direct**
1) Pressure: liquid `2,400×2.0 = 4,800`; setting R = 1.5: `2,400×0.65×1.5+500 = 2,840`; narrow d = 2.40: `300×1.5 + 10,000(2.40) + 1,500 = 25,950` → **2,840 kg/m²**.
2) Stud spacing — plywood 15 mm Fb 135, E 110,000; W = 28.40 kg/cm; S = 100×1.5²/6 = 37.5:
- Bending `28.4a²/10 = 135×37.5` → a = √1,782 = **42 cm**
- Deflection I = 100×1.5³/12 = 28.1: `a = 0.71∛(110,000×28.1/28.4) = 0.71∛108,840` = **34 cm** → **30 cm**.
3) Wale spacing — studs 1½"×3" @ 0.30: W = 2,840×0.30/100 = 8.52 kg/cm; S = 3.7×7.5²/6 = 34.7:
- `8.52 l²/10 = 80×34.7` → **l = 57 cm**; deflection I = 130: `0.71∛(94,100×130/8.52) = 0.71∛1,435,800` = **80 cm** → **60 cm**.
4) Support (tie) spacing for wales — wale "□100×100×2.3 @ 60 cm" (calc uses S = 17 cm³, Ix = 84.8 cm⁴, i.e. □100×50×2.3 properties — book inconsistency):
- W = 2,840×0.60/100 = 17.04 kg/cm; Fb = 1,250: `17.04 l²/10 = 1,250×17` → l = √12,470 = **111 cm**
- Deflection E = 2,000,000, Ix = 84.8: `0.71∛(2,000,000×84.8/17.04) = 0.71∛9,953,000` = **153 cm**
- To suit footing size (and supports ≥ 10 cm) use **1.20 m**.
5) Ties: tributary `0.60×1.20`; `T = 2,840×0.60×1.20 = 2,045 kg`; `Ft = 0.60×2,400`; `As = 2,045/(0.60×2,400) = 1.4 cm²` → **2-ø12 mm with ø15 mm bolts**.
Figure [p.422]: elevation ties @1.20 horizontally, studs @0.30, wales @0.60.
**ข. By tables**
1) 4,800 / 2,840 / 25,950 → 2,840.
2) Plywood 15 mm, Table 8.2: `40 − (2,840−1,775)/(4,250−1,775)×10 ≈ 35.7` → **30 cm**.
3) Studs 1½"×3" @30, Table 10.2 ค: `50 + (3,625−2,840)/(3,625−905)×50 = 64` → **60 cm**.
4) Ties: wale □100×100×2.3, wale spacing 60, pressure 2,840; Table 10.7 ค at tie spacing 120 (col 120: H50 = 4,850, H100 = 2,425): `2,425 + (100−60)/(100−50)×2,425 = 4,365 > 2,840` OK → **tie spacing 1.20 m**.

---

## PART D — CALCULATOR IMPLEMENTATION NOTES (synthesised from the three chapters)

### D.1 Common design pipeline (wall / column / footing side)
1. **Pressure** p_design = min(P_liquid = 2400·H, Ps = 2400·K·R + 500, Pa = 300R + 10,000·d + 1,500) (CEB); option ACI-347 / CIRA from Ch.2. Apply uniformly over height (book practice). Optional: depth-varying envelope for tall walls (book allows but does not work an example).
2. **Sheathing → stud spacing a** (1 m strip, continuous ≥3 spans):
   - bending `a = √(10·Fb·S / w)`, w = p/100 (kg/cm per 1 m strip), S = 100t²/6
   - deflection `a = ∛((128/360)·E·I / w)` ≈ `0.71∛(EI/w)`, I = 100t³/12, Δ ≤ l/360
   - (columns with boards spanning between yokes: strip width = face width, w = p·b)
   - round down to practical module (e.g. 15/20/25/30/40 cm; plywood 1.20 × 2.40 m modules; prefab 0.60 × 1.20).
3. **Studs → wale (or yoke) spacing l**: w = p·a/100 (kg/cm); same two formulas with stud S, I; walls/footings continuous (`/10`, `/128`); footing grade beam uses `/8` (two-span); then add ~10 cm for double-wale thickness to get c/c spacing (book convention).
4. **Wales → tie spacing**: w = p·(wale spacing c/c); `M = wl²/10`, `S_req = M/Fb`, `I_req` from `Δ = wl⁴/(128EI) ≤ l/360`, shear steel `V = 5/8·wl`, `v = V/(b_w·d) ≤ 0.5·Fy`. Usually double members.
5. **Ties**: T = p × (wale spacing × tie spacing) ≤ tie safe load (Table 4.6: ø3/8" 2,100 kg, ø1/2" 2,800 kg) or `As = T/(0.60·Fy)` (Fy 2,400). Spacing = (SWL/p)/wale spacing, rounded to panel module.
6. **Bottom plate / sill**: line load = p × (half of lowest wale gap or 0.10 m); concrete nails ø4 mm @ 150 kg each → nail spacing.
7. **Braces / kickers**: horizontal load per m = max(wind 50 kg/m² × H; γ·Δh²/2 with Δh = thickness; e = 10 % thickness → (W_wall·e)/H) (column: × width); brace force = horizontal × spacing / cos θ (θ to horizontal); timber `Fa = 0.30E/(l/d)²`, steel pipe `Fa = 1,250 − 0.033(l/r)²`; `P = Fa·A`; one-sided bracing → check tension (F// = 80).
8. **Column yokes**: w = p·s; tension `T = w·L_perp/2`; bending `wL²/8` (simple) or `/10` with ties; `σ = T/A ± M/S` vs F_t = 80 / F_c// = 60 (soft wood) ; Δ = 5wL⁴/384EI ≤ L/360.
9. **Footing studs**: choose support case (cantilever / single span / continuous) and Table 10.2–10.4; stakes: embedment `l = F/(q_soil·b)` with q_soil = 10 t/m².

### D.2 Typical dimensions and conventions for 3D/shop drawings
- Plywood 6–25 mm (examples 15, 20 mm); boards ¾"×8", ¾"×10", 1"×8", 1"×10"; staves 1"×1" for round columns.
- Studs: 1½"×3" (3.7/3.75×7.5 cm), 2"×4" (5×10 cm); steel lipped channel [100×50×20×2.3 (Sx 16.1, Ix 80.7, t 0.23), [150×50×20×2.3 (Ix 210); □100×50×2.3 (S 17, I 84.8); □100×100×2.3 (S 27.9, I 140).
- Wales double (2-2"×4", 2-[…), ties pass between, plate washers; wale c/c = net + ~10 cm.
- Wall layouts from examples: (8.1) studs @0.15, wales @0.80, ties @0.60, bottom wale +0.10; (8.2) panels 0.60 wide, wales @1.00, bottom wale +0.30; (8.3) studs @0.20, wales @0.90, ties @0.60, bottom wale +0.30, two-level pipe braces.
- Column 0.40×0.40×3.50: yokes 16 @ 0.20, first at +0.20, top 0.10 below top; A-frame 2-1½"×3" braces on four sides; wedges on cleats.
- Round column D 0.60 × 3.0: yokes 12 @ 0.25, 1"×10" with semicircle cut-out, wedges at corners.
- Kicker (ขอบเตะแบบ) ≥ 2 cm high; brace at 60° (walls/columns), ≤ 45° (footing kickers); stakes ~70 cm deep @ stud spacing.
- Lean concrete 5 cm under footing.

### D.3 Known book discrepancies to flag in tests
- Ex 8.3 table step: `90 − 0.4×5 = 88` (table difference is 10 → 86).
- Ex 9.1 sheathing: printed 136 cm / 46 cm vs recomputed ≈ 30 / 33 cm.
- Ch.9 brace forces divided by 0.866 although labelled cos 60°.
- Ex 10.2 Pa printed 24,600 (should be 26,100 by Eq 2.14) — no effect (Ps governs).
- Ex 10.3 wale labelled □100×100×2.3 but uses □100×50×2.3 section properties.
- Ex 10.2/10.3 cite "Table 8.1" for plywood; values are from Table 8.2.
- Book p.370–371 (end of Ex 9.3 table method) not present in the scanned PDF (PDF p188 → p189 jumps from book p.369 to p.372).
