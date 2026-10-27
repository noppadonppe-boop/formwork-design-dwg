# Design Basis 01: Loads, Concrete Pressure and Member Calculation Methods

Source: *Design Form Work*, ดร.เอกสิทธิ์ ลิ้มสุวรรณ (Chulalongkorn). The source is a scanned book. This file was transcribed from page images.
- Chapter 2 (book p.23-51): concrete weight, lateral pressure (ACI-347, CEB, CIRA) and vertical loads.
- Chapter 5 (book p.127-165): formwork member calculation (bending, shear, compression/buckling, bearing, tension, deflection).

Conventions: book units are kg/m², kg/cm², kg-m, kg-cm, m, cm, °C, m/hr. ACI formulas are in US units (psf, ft/hr, °F).
Conversions used by the book: 1 psf = 4.882 kg/m², 1 ft = 0.3048 m, °F = 1.8·°C + 32.
Items marked **[illegible]** or **[uncertain]** could not be read reliably from the scan. Items marked **[book typo?]** are transcribed exactly as printed but look inconsistent.

---

## PART A — Chapter 2: Concrete Weight and Pressure

### A.1 Factors affecting lateral pressure (§2.1)
The factors are: (1) mix, (2) concrete temperature, (3) setting, (4) rate of placement, (5) placing and vibration method, (6) form shape and size, (7) amount and layout of reinforcement, and (8) unit weight of concrete and form depth.
Fig 2.1 test conditions: R ≈ 1.2 m/hr, T ≈ 20-24 °C. Measured pressure follows hydrostatic only near the top. It then drops away from hydrostatic once the pour height or time exceeds about 1 hr.

### A.2 Mix (§2.2, Fig 2.2, Roby, R = 1.2 m/hr, 20-24 °C)
- Rich, wet mix: peak ≈ 4,800 kg/m², at a height of about 2.50 m and about 2 hr after placing starts.
- Normal mix (slump 7.5-12.5 cm): peak ≈ 3,500 kg/m², at about 1.90 m and about 1.5 hr.
- Dry mix: peak ≈ 2,800 kg/m² (read from the graph), at about 1.50 m and about 1.5 hr.
- The theoretical hydrostatic line in the figure is drawn for 2,400 kg/m³.

### A.3 Temperature (§2.3, Fig 2.3)
Fig 2.3 plots relative pressure (% of the pressure at 21 °C) against concrete temperature. Approximate curve points: 35 °C ≈ 78-80 %, 25 °C ≈ 90 %, 20 °C ≈ 100 %, 15 °C ≈ 113 %, 10 °C ≈ 130 %, 5 °C ≈ 152 % (read from the graph, approximate).
For Thai average temperatures, the pressure is about **75-85 %** of the pressure at 21 °C. Placing temperature should not exceed about 30 °C. At 35-40 °C, use ice or chilled water.

### A.4 Setting and admixtures (§2.4)
For retarders (ACI-622), the author recommends treating the concrete as liquid for the retarded period. Take the liquid head as the height placed during the delay, and add this hydrostatic pressure to the normal-setting pressure.
Example: a 2 hr delay with 2.50 m placed in that time gives an extra γh = 2,400 × 2.50 = **6,000 kg/m²**.

### A.5 Rate of placement (§2.5)
- Macklin (1:2:4 mix): `Pm = 150·R^(1/2 + 1/2·√R)` (2.1) **[uncertain exponent form]**. Pm is in lb/ft² and R is in ft/hr.
- Rodin:
  - `Pm = 400·R^(1/3)` (2.2) lb/ft²
  - `Hm = 3.6·R^(1/3)` (2.3) ft. This is the concrete height at which the maximum pressure occurs.
  - `Tm = 3.6 / R^(2/3)` (2.4) hr. This is the time from the start of placing until the maximum pressure.
  - `Pm = 110·Hm` (2.5)
- Fig 2.4(a) at 21 °C and Fig 2.4(b) at 10 °C are the Universal Clamp / PCA charts. They plot pressure (kg/m²) against depth for R = 0.5, 1.0, 1.5, 2.0 and 2.5 m/hr. These are graphs only and are not digitised.

### A.6 Placing and vibration (§2.6)
- ACI-622 recommends adding **10-20 %** to the pressure for vibration: about +10 % for light hand rodding and about +20 % for high-energy vibrators.
- Maklin recommends adding **1,463 kg/m² (300 lb/ft²)** for vibrator impact.
- Teller (column 60×20 cm, height 3.60 m, 1:2:4 mix, 1½" aggregate, 9-17 °C, R ≈ 6 m/hr, vibrator 3,600 rpm): with vibration, the pressure is about liquid at 2,400 kg/m³ over the full height.

**Table 2.1 (Teller, hand rodding)**

| Slump (cm) | Height of max pressure (m) | Max pressure (kg/m²) |
|---|---|---|
| 9 | 1.68 | 1,845 |
| 19 | 2.59 | 2,194 |

Stanton test (wall 5 m high, 65 cm thick at base, 45 cm at top, slump 10 cm, R = 4.3 m/hr), Fig 2.5: re-vibration increased pressure by about **38 %** about 60 cm above the vibrator head.

### A.7 Reinforcement (§2.8)
Heavy reinforcement reduces lateral pressure because the cage confines the concrete, but there is no quantitative rule. The author recommends ignoring this effect in design.

### A.8 Unit weight (§2.9, §2.11)
| Concrete | Unit weight (kg/m³) |
|---|---|
| Normal (typical design value) | **2,400** |
| Generic "about" value quoted in §2.9 | 2,000 |
| Lightweight (expanded clay aggregate) | 1,700 |
| Heavyweight (steel punchings / iron ore aggregate, e.g. shielding) | up to 5,400 |
| Normal range including rebar (§2.11) | 1,700 (light) - 2,700 (heavy) |
| CEB | 2,400 |
| CIRA | 2,500 |

General form (2.6): `P = C·W·H^k`. P is pressure, W is unit weight, H is form height (taken as less than the critical height), k is a power that depends on the mix, and C is a correction coefficient.
The text states that pressure does not increase above a critical height.

### A.9 Lateral pressure for design (§2.10)

#### A.9.1 ACI-347 (§2.10 ก)
Applicability limits:
- R ≤ 10 ft/hr (≈ 3.0 m/hr)
- slump ≤ 4 in (≈ 10 cm)
- internal vibration depth ≤ 4 ft (1.20 m) below the concrete surface

Variables: P is lateral pressure (lb/ft²), R is rate of placement (ft/hr), and T is concrete temperature (°F).

**Walls**
- R ≤ 7 ft/hr (≈ 2 m/hr): `P = 150 + 9,000·R/T` (2.7)
- R > 7 ft/hr (≈ 2 m/hr): `P = 150 + 43,400/T + 2,800·R/T` (2.8)
- Cap: P ≤ **2,000 lb/ft² (9,760 kg/m²)** and P ≤ 150·h lb/ft² (= 2,400·h kg/m², h = height of fresh concrete placed). Use whichever is less.

**Columns**
- `P = 150 + 9,000·R/T` (2.9)
- Cap: P ≤ **3,000 lb/ft² (14,640 kg/m²)** and P ≤ 150·h (2,400·h kg/m²).
- Eq 2.9 applies only to columns of height < 18 ft (≈ 6.0 m) with plan width or length ≤ 6 ft (≈ 2.0 m). Otherwise use the wall formula.

**Slipform**
- `P = 100 + 6,000·R/T` (2.10)
- For slipform, ACI-622 gives a pressure slightly lower than normal forms. If the concrete is re-vibrated through the full depth, use the wall formula.

**Tunnel forms**
- Pump pressure can reach 3,000 lb/ft² (14,640 kg/m²). ACI-622 recommends designing for at least 1,000 lb/ft² (4,880 kg/m²) normal to the form.
- The crown (top) region is defined at 45° from the vertical face line. Design it for 1,000 psf pump pressure plus the self-weight of concrete.
- Other parts: `P = 150 + 9,000·R/T` (2.11), with P ≥ 1,000 lb/ft² (4,880 kg/m²).

Implementation note: convert R from m/hr to ft/hr (÷ 0.3048) and T from °C to °F. Compute P in psf, multiply by 4.882 to get kg/m², then apply the caps.

#### A.9.2 CEB (§2.10 ข) — compute three cases and **use the MINIMUM**
1. Liquid: `P = γ·H` (2.12). P in kg/m², γ = 2,400 kg/m³, H = height of concrete placed (m).
2. Setting: `Ps = 2,400·k·R + 500` (2.13). Ps in kg/m², R in m/hr, k from Table 2.2.
3. Thin section: `Pa = 300·R + 10,000·d + 1,500` (2.14). Pa in kg/m², R in m/hr, d = form thickness (least dimension) in m.

**Table 2.2 CEB k (rows = slump in cm, columns = concrete temperature at placing in °C)**

| Slump (cm) \ T (°C) | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|
| 2.5 | 1.45 | 1.10 | 0.80 | 0.60 | 0.45 | 0.35 |
| 5.0 | 1.90 | 1.45 | 1.10 | 0.80 | 0.60 | 0.45 |
| 7.5 | 2.35 | 1.80 | 1.35 | 1.00 | 0.75 | 0.55 |
| 10.0 | 2.75 | 2.10 | 1.60 | 1.15 | 0.90 | 0.65 |

#### A.9.3 CIRA (§2.10 ค) — three cases, **use the MINIMUM**
1. Liquid, γ = 2,500 kg/m³.

**Table 2.3 (liquid pressure, CIRA)**

| Concrete height (m) | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| P (kg/m²) | 2,500 | 5,000 | 7,500 | 10,000 | 12,500 | 15,000 |

2. Setting. Table 2.4 gives P (kg/m²) by slump, temperature (5-20 °C) and R (1.0 to ≥ 8 m/hr). It covers slump 5.0-15.0 cm. Values outside the table are left to engineering judgement, because the data cover UK conditions only.

**Table 2.4 CIRA (P in kg/m²)**

| Slump (cm) | T (°C) | R=1.0 | 1.5 | 2.0 | 2.5 | 3.0 | 4.0 | 5.0 | 6.0 | 7.0 | ≥8.0 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5.0 | 5 | 5,000 | 7,000 | 9,500 | 11,500 | 13,500 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 |
| 5.0 | 10 | 4,000 | 5,500 | 7,000 | 8,500 | 10,000 | 13,500 | 15,000 | 15,000 | 15,000 | 15,000 |
| 5.0 | 15 | 4,000 | 4,500 | 5,500 | 6,500 | 7,500 | 10,000 | 12,500 | 15,000 | 15,000 | 15,000 |
| 5.0 | 20 | 3,500 | 4,000 | 4,500 | 5,000 | 5,500 | 7,000 | 9,000 | 10,500 | 12,500 | 15,000 |
| 7.5 | 5 | 6,000 | 8,500 | 11,000 | 14,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 |
| 7.5 | 10 | 5,000 | 6,500 | 8,500 | 10,500 | 12,500 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 |
| 7.5 | 15 | 4,000 | 5,000 | 6,500 | 8,000 | 9,500 | 12,500 | 15,000 | 15,000 | 15,000 | 15,000 |
| 7.5 | 20 | 3,500 | 4,000 | 5,000 | 6,000 | 7,000 | 9,000 | 11,500 | 13,500 | 15,000 | 15,000 |
| 10.0-15.0* | 5 | 7,000 | 10,000 | 13,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 |
| 10.0-15.0* | 10 | 5,500 | 7,500 | 10,000 | 12,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 |
| 10.0-15.0* | 15 | 4,500 | 6,000 | 7,500 | 9,000 | 11,000 | 15,000 | 15,000 | 15,000 | 15,000 | 15,000 |
| 10.0-15.0* | 20 | 3,500 | 4,500 | 5,500 | 7,000 | 8,000 | 11,000 | 13,000 | 15,000 | 15,000 | 15,000 |

\*The first half of the table is labelled "10.0-15.0" and the continuation is labelled "10.5-15.0". The maximum value is 15,000 kg/m², which equals the liquid head at 6 m with γ = 2,500.

3. Thin section (arching). Table 2.5 gives P (kg/m²) by section thickness and R (m/hr).

**Table 2.5 CIRA**

| Thickness (cm) | R=1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 15 | 20 | 30 | ≥40 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 15 | 3,500 | 3,500 | 4,000 | 4,500 | 4,500 | 5,000 | 5,500 | 6,000 | 7,500 | 9,000 | 12,000 | 15,000 |
| 20 | 4,000 | 4,000 | 4,500 | 5,000 | 5,000 | 5,500 | 6,000 | 6,500 | 8,000 | 9,500 | 12,500 | 15,000 |
| 30 | 5,000 | 5,000 | 5,500 | 6,000 | 6,000 | 6,500 | 7,000 | 7,500 | 9,000 | 10,500 | 13,500 | 15,000 |
| 40 | 6,000 | 6,000 | 6,500 | 7,000 | 7,000 | 7,500 | 8,000 | 8,500 | 10,000 | 11,500 | 14,500 | 15,000 |
| 50 | 7,000 | 7,000 | 7,500 | 8,000 | 8,000 | 8,500 | 9,000 | 9,500 | 11,000 | 12,500 | 15,000 | 15,000 |

Interpolation between table entries is not specified in the book. The worked examples use the nearest available column, e.g. 20 °C in place of 30 °C because the table stops at 20 °C. Interpolation for intermediate values is an implementation choice.

#### A.9.4 Worked Example 2.1 (unit test)
Inputs: slump 10 cm, R = 2 m/hr, internal vibration, T = 30 °C, form height H = 3.00 m, section thickness d = 0.30 m.

- **ACI** (eq 2.7, R = 6.56 ft/hr ≤ 7, T = 86 °F): P = 150 + 9000·6.56/86 = **836 psf = 4,080 kg/m²**.
- **CEB**:
  - (1) 2,400·3.0 = 7,200 kg/m²
  - (2) k = 0.65 (30 °C, slump 10): Ps = 2400·0.65·2 + 500 = **3,620 kg/m²**. The book prints "+50", which is a typo; the result 3,620 uses +500.
  - (3) Pa = 300·2 + 10,000·0.30 + 1,500 = 5,100 kg/m²
  - Design value = min = **3,620 kg/m²**.
- **CIRA**:
  - (1) Table 2.3 at 3 m: 7,500 kg/m²
  - (2) Table 2.4 using 20 °C (30 °C is not tabulated), slump 10, R = 2: 5,500 kg/m²
  - (3) Table 2.5 at 30 cm, R = 2: 5,000 kg/m²
  - Design value = min = **5,000 kg/m²**.
- Conclusion in the book: ACI and CIRA give about 5,000 kg/m². CEB is about 10 % lower at 3,620 kg/m².

#### A.9.5 Worked Example 2.2 (R varied, same other data) — expected outputs

ACI (kg/m²):

| R (m/hr) | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| P | 2,406 | 4,080 | 4,758 | 5,280 | 5,802 | 6,324 |

For R ≥ 3 m/hr (> 7 ft/hr), eq 2.8 is used. Check at 3 m/hr: 150 + 43400/86 + 2800·9.84/86 ≈ 975 psf ≈ 4,758 kg/m². The book applies **no** h-cap here. Note that 150h = 7,200 kg/m² at h = 3 m, so the cap is not governing.

CEB (kg/m²):

| R | Eq 2.12 | Eq 2.13 | Eq 2.14 | Design (min) |
|---|---|---|---|---|
| 1 | 2,400 | 2,060 | 4,800 | 2,060 |
| 2 | 4,800 | 3,620 | 5,100 | 3,620 |
| 3 | 7,200 | 5,180 | 5,400 | 5,180 |
| 4 | 9,600 | 6,740 | 5,700 | 5,700 |
| 5 | 12,000 | 8,300 | 6,000 | 6,000 |
| 6 | 14,400 | 9,860 | 6,300 | 6,300 |

The Eq 2.12 column equals 2,400·R, i.e. the book takes H = R × 1 hr. This is inconsistent with Example 2.1, which used H = 3.0 m and gave 7,200 kg/m² at R = 2. It is transcribed as printed and does not change the governing minimum except at R = 1.

CIRA (kg/m²):

| R | Table 2.3 | Table 2.4 | Table 2.5 | Design (min) |
|---|---|---|---|---|
| 1 | 2,500 | 3,500 | 5,000 | 2,500 |
| 2 | 5,000 | 5,500 | 5,000 | 5,000 |
| 3 | 7,500 | 8,000 | 5,500 | 5,500 |
| 4 | 10,000 | 11,000 | 6,000 | 6,000 |
| 5 | 12,500 | 13,000 | 6,000 | 6,000 |
| 6 | 15,000 | 15,000 | 6,500 | 6,500 |

Fig 2.6 plots these three methods (T = 30 °C, slump 10 cm, form 30 cm). For R > 2 m/hr, CIRA is slightly higher than CEB and ACI is lowest, with less than 10 % difference. For R < 2 m/hr, CEB is lowest, ACI slightly higher, and CIRA highest, with differences within about 10 %.

### A.10 Vertical loads (§2.11)
- Concrete including rebar: 2,400 kg/m³ (range 1,700-2,700).
- Formwork self-weight: typically **15-75 kg/m²**. Many engineers use **50 kg/m²**.
- Live load plus impact during placing: **200-500 kg/m²**, depending on conditions.

#### A.10.1 ACI-347
- Use the actual concrete weight. For normal reinforced concrete use **2,400 kg/m³**.
- Live load (workers, equipment, impact) must be **≥ 245 kg/m² (50 psf)**.
- Table 2.6 values = concrete + 245 kg/m² live load. Formwork self-weight is **not included** and must be added.

**Table 2.6(ก) Solid slab — total vertical load (kg/m²) by slab thickness (cm)**

| Concrete \ thickness (cm) | 7.5 | 10.0 | 12.5 | 15.0 | 17.5 | 20.0 | 22.5 | 25.0 | 27.5 | 30.0 |
|---|---|---|---|---|---|---|---|---|---|---|
| ~1,600 kg/m³ [label partly illegible] | 386 | 405 | 449 | 488 | 527 | 571 | 610 | 649 | 693 | 732 |
| 2,000 kg/m³ | 395 | 449 | 498 | 551 | 600 | 654 | 703 | 752 | 805 | 854 |
| 2,400 kg/m³ [label partly illegible] | 429 | 488 | 551 | 610 | 673 | 732 | 795 | 854 | 917 | 976 |

**Table 2.6(ข) Joist slab — total vertical load (kg/m²)**

The table has two pan widths, 50 cm and 75 cm. Each entry is indexed by form depth (cm), joist width (cm) and slab thickness (cm).

Pan width 50 cm (slab thickness 5.00 / 6.25 / 7.50 cm):

| Depth | Joist width 10.0 | Joist width 12.5 | Joist width 15.0 |
|---|---|---|---|
| 15 | 434 / 464 / 498 | 449 / 478 / 512 | 459 / 488 / 522 |
| 20 | 464 / 493 / 527 | 478 / 508 / 542 | 493 / 522 / 556 |
| 25 | 488 / 517 / 551 | 508 / 537 / 571 | 527 / 556 / 590 |
| 30 | 522 / 551 / 581 | 542 / 571 / 605 | 566 / 595 / 625 |
| 35 | 551 / 586 / 615 | 576 / 610 / 639 | 600 / 634 / 664 |

Pan width 75 cm (slab thickness 6.25 / 7.50 / 8.75 cm). Joist widths are 10.0, 12.5, 15.0 for depths 15-25 and 12.5, 15.0, 17.5 for depths 30-35.

| Depth | Joist 1 | Joist 2 | Joist 3 |
|---|---|---|---|
| 15 | (10.0) 444 / 478 / - | (12.5) 454 / 488 / 517 | (15.0) 464 / 498 / 527 |
| 20 | (10.0) 464 / 493 / - | (12.5) 478 / 508 / 542 | (15.0) 488 / 517 / 551 |
| 25 | (10.0) 488 / 517 / - | (12.5) 498 / 527 / 566 | (15.0) 512 / 542 / 576 |
| 30 | (12.5) 508 / 537 / - | (15.0) 522 / 551 / 586 | (17.5) 542 / 571 / 605 |
| 35 | (12.5) 547 / 576 / 605 | (15.0) 566 / 595 / 634 | (17.5) 586 / 615 / 649 |

The small print in this table was hard to read. Treat the values as **[uncertain ±1 digit]** and verify before relying on them.

**Table 2.6(ค) Waffle slab — total vertical load (kg/m²) by topping thickness above form (cm)**

| Depth (cm) | Outer (cm) | Inner (cm) | 5.00 | 6.25 | 7.50 | 8.75 | 11.25 |
|---|---|---|---|---|---|---|---|
| 10 | 60×60 | 47.5×47.5 | 468 | 503 | 532 | 561 | - |
| 15 | 60×60 | 47.5×47.5 | 532 | 566 | 595 | 625 | - |
| 20 | 60×60 | 47.5×47.5 | 600 | 630 | 659 | 688 | - |
| 20 | 90×90 | 75.0×75.0 | 542 | 571 | 600 | 634 | 698 |
| 25 | 60×60 | 47.5×47.5 | 630 | 664 | 693 | 722 | - |
| 25 | 90×90 | 75.0×75.0 | 586 | 625 | 649 | 678 | 742 |
| 30 | 60×60 | 47.5×47.5 | 708 | 742 | 771 | 800 | - |
| 30 | 90×90 | 75.0×75.0 | 649 | 678 | 708 | 742 | 805 |
| 35 | 90×90 | 75.0×75.0 | 688 | 722 | 752 | 781 | 844 |

#### A.10.2 CEB / CIRA
No fixed values are given. Concrete unit weight is 2,400 kg/m³ for CEB and 2,500 kg/m³ for CIRA. Formwork weight is per actual site conditions. Live load and impact by thickness are given in Table 2.7.

**Table 2.7 Design live load (CEB/CIRA practice)**

| Concrete thickness (m) | Live load (kg/m²) |
|---|---|
| 0 - 0.20 | 100 |
| 0.20 - 0.30 | 150 |
| 0.30 - 0.60 | 200 |
| > 0.60* | 250 |

The * footnote was not legible.

#### A.10.3 Worked Example 2.3 (unit test)
Flat slab 16 cm thick, formwork 50 kg/m².

| Item | ACI direct | ACI via Table 2.6 | CEB | CIRA |
|---|---|---|---|---|
| Concrete | 384 (2400·0.16) | — | 384 | 400 (2500·0.16) |
| Live + impact | 245 | 635 (concrete + LL, interpolated) | 100 | 100 |
| Formwork | 50 | 50 | 50 | 50 |
| **Total (kg/m²)** | **679** | **685** | **534** | **550** |

---

## PART B — Chapter 5: Formwork Calculation

### B.1 Assumptions (§5.1)
1. Loads on each member are uniformly distributed (sheathing, joists, stringers). Member sizes are kept the same throughout.
2. Beams or slabs with **3 or more spans** are treated as continuous, and approximate formulas may be used.
3. Members with only **2 spans** may be checked with **single-span** formulas, which is conservative for deflection.
4. The strength of nails and connectors is ignored in member sizing, except at shore splices.

**Table 5.1 Safety factors for formwork accessories (from ACI-622)**

| Accessory | Construction type | FS |
|---|---|---|
| Form ties (เหล็กยึดรั้ง) | Light formwork, height ≤ 5.0 m | 1.5 |
| | Heavy formwork, height > 5.0 m | 2.0 |
| Anchors (สมอยึด) | Light, no risk to life or property | 1.5 |
| | Heavy, risk to life or property, normal load | 2.0 |
| | Formwork subject to impact | 3.0 |
| Hangers (เหล็กแขวน) | Light: live load 250 kg/m² or total ≤ 500 kg/m² | 1.5 |
| | Heavy: total > 500 kg/m² and higher-than-normal risk | 2.0 |

Allowable stress: `Fb = ft / FS` (5.3). ft is the tested strength (kg/cm²) and FS is the factor of safety. For steel, ft is the yield stress. For wood, use code values (ว.ส.ท. timber standard, Table 3.3/3.4/3.5 of the book; Chapter 3 is outside this extract) or the manufacturer's data.

### B.2 Bending (§5.2)

#### B.2.1 Sheathing on a grid of joists — plate behaviour
`M = k1·w·a²` (5.1). M is bending moment per unit width (kg-m/m), w is uniform pressure (kg/m²), and a is the **short** span of the supporting grid (m). k1 comes from Table 5.2.
Use this formula when the sheathing is continuous over more than 2 spans. Use linear interpolation between table values. For b/a beyond the table, use the last (maximum) value.

**Table 5.2 Coefficients k1 (moment, eq 5.1) and k2 (deflection, eq 5.31)**

Supported on 4 sides (2-way):

| b/a | 1.00 | 1.25 | 1.50 | 1.75 | 2.00 | >2.00 (printed "2.00") |
|---|---|---|---|---|---|---|
| k1 | 0.0513 | 0.0665 | 0.0757 | 0.0806 | 0.0829 | 0.0833 |
| k2 | 0.0138 | 0.0199 | 0.0240 | 0.0264 | 0.0277 | 0.0284 |

Supported on 2 parallel sides (1-way, joists only):

| b/a | 1.0 | 1.5 | 2.0 | 3.0 | 4.0 | 5.0 | >5.0 |
|---|---|---|---|---|---|---|---|
| k1 | 0.0479 | 0.0812 | 0.1017 | 0.1189 | 0.1235 | 0.1246 | 0.1250 |
| k2 | 0.0443 | 0.0843 | 0.1106 | 0.1336 | 0.1400 | 0.1416 | 0.1428 |

The 1-way limit k1 → 1/8 = 0.125 corresponds to a simple span. The k2 limit of 0.1428 is transcribed as printed.

**Example 5.1** (w = 450 kg/m², a = 0.40 m):
- 4-side grid 0.40 × 0.40: b/a = 1.0, k1 = 0.0513, giving M = 0.0513·450·0.40² = **3.7 kg-m/m**.
- Joists only at 0.40 m under a 1.20 m wide panel: b/a = 3.0, k1 = 0.1189, giving M = **8.6 kg-m/m**.

#### B.2.2 Beam formulas — Table 5.3 (w = load per unit length, P = point load, l = span)

| # | Case | Vmax | Mmax | Δmax |
|---|---|---|---|---|
| 1 | Cantilever, full UDL | w·l | w·l²/2 | w·l⁴/(8EI) |
| 2 | Cantilever, partial UDL from distance a to b (from free end) | w(b−a) | w(b²−a²)/2 | 6w(b−a)/(575 EI)·[4l(a²+ab+b²) − a³ − ab² − a²b − b³] **[uncertain / book typo?]** |
| 3 | Cantilever, point load at tip | P | P·l | P·l³/(3EI) |
| 4 | Cantilever, point load at distance b from support | P | P·b | P·b²/(6EI)·(3l − b) |
| 5 | Simple span, UDL | w·l/2 | w·l²/8 | 5w·l⁴/(384EI) |
| 6 | Simple span, partial UDL of length b (a from left, c to right) | R1 = wb/(2l)·(2c+b) when a < c; R2 = wb/(2l)·(2a+b) when a > c | at x = a + R1/w: M = R1·(a + R1/(2w)) | — |
| 7 | Simple span, central point load | P/2 | P·l/4 | P·l³/(48EI) |
| 8 | Simple span, point load at a from left (b = l − a) | R1 = P·b/l (a < b); R2 = P·a/l (a > b) | P·a·b/l | P·a·b(a+2b)·√(3a(a+2b)) / (27·EI·l) at x = √(a(a+2b)/3), a > b |
| 9 | Simple span l with overhang a, UDL over l + a | w/(2l)·(l² + a²) | w/(8l²)·(l+a)² **[book prints this; likely (l+a)²(l−a)²]** | w·a/(24EI)·(4a²l − l³ + 3a³) |
| 10 | Overhang a loaded only (UDL w on overhang) | w·a | w·a²/2 | 0.3208·w·a²·l²/(EI) **[likely 0.03208]** (between supports) or w·a³/(24EI)·(4l + 3a) (tip) |
| 11 | Point load P at overhang tip | P | P·a | 0.6415·P·a·l²/(EI) **[likely 0.06415]** or P·a²/(3EI)·(l + a) |
| 12 | **Continuous, 3 equal spans, UDL** | (5/8)·w·l | **w·l²/10** | **w·l⁴/(145 EI)** |
| 13 | Continuous, point loads at mid-spans | (5/8)·P | **3P·l/16** | 5P·l³/(385 EI) [as printed] |
| 14 | Point loads, span l with overhangs a | P | P·a or P·l/4 − P·a | P·a/(EI)·(l²/16 − a·l/2 − a²/3) **[uncertain]** or P·l/(EI)·(l²/96 …) **[illegible]** |
| 15 | UDL, span l with overhangs a both ends | w·l/2 or w·a | w·l²/8 − w·a²/2 or w·a²/2 | w·a/(4EI)·(l³/6 − a²·l − a³/2) or w·l²/(EI)·(l²/77 − a²/16) |

#### B.2.3 Stringer under joist point loads — Examples 5.2 and 5.3 (unit tests)
**Example 5.2.** A simple-span stringer of 2.40 m carries 1,440 kg/m equivalent from joists.
- Joists @1.20: P = 1,728 kg, M = P·l/4 = 1,728·2.40/4 = **1,037 kg-m**.
- Joists @0.60: P = 864 kg, M = P·l/2 = **1,037 kg-m**.
- Joists @0.40: P = 576 kg, M = 3P·l/4 = **1,037 kg-m**.
- Joist spacing does not change M, which equals w·l²/8 for the same total load.

**Example 5.3.** A continuous stringer has joists @0.60 m with P = 864 kg each and shores at 1.20, 1.80 and 2.40 m. The formulas are from Table 5.3 and the appendix:
- Shores @1.20: M = 3P·l/16 = 194.4 kg-m (Table 5.3, P at midspan). With P on the support arrangement, M = P·l/4 = 259.2 kg-m (appendix).
- Shores @1.80: M = P·l/3 = 518.4 kg-m, or M = 5P·l/12 = 648.0 kg-m (appendix; depends on load position relative to shores).
- Shores @2.40: M = P·l/2 = 1,036.8 kg-m, or M = 3P·l/4 = 1,555.2 kg-m.
- Conclusion: moment rises sharply with shore spacing, so shore spacing must be controlled.

#### B.2.4 Bending stress and section sizing
- `F = M·c/I = M/S` (5.2). F in kg/cm², M in kg-cm, c in cm, I in cm⁴, S in cm³.
- Required section modulus: `S = I/c = M/Fb` (5.4).
- For a rectangular section: `I = b·d³/12` (5.5) and `S = b·d²/6` (5.6), so `b·d² = 6M/Fb` (5.7). b and d are in cm.

**Example 5.4.** Plywood sheathing, M = 8.6 kg-m/m, Fb = 70 kg/cm², b = 100 cm.
- bd² = 6·8.6·100/70 = 73.7 cm³.
- d = √(73.7/100) = **0.86 cm**, so use 12 mm plywood.

**Example 5.5.** Stringer, span 2.40 m, M = 1,037 kg-m.
- Steel A-36: Fy = 2,500 kg/cm², FS = 2, Fb = 1,250 kg/cm². S = 1,037·100/1,250 = **83 cm³**, so use I 125×75×16.4 (16.4 kg/m).
- Softwood: Fb = 90 kg/cm² (Bangkok municipal code). bd² = 6·1,037·100/90 = **6,913 cm³**.
  - 2 pieces of 2" (b = 2 × 5.0 = 10 cm): d = 26.3 cm, use 2-2"×12".
  - 4 pieces (b = 20 cm): d = 18.6 cm, use 4-2"×8".
  - The book takes nominal 2" = 5.0 cm here.

### B.3 Shear (§5.3)
- Approximate end shear for a single span: `V = w·l/2` (5.8). For a continuous member: `V = 5w·l/8` (5.9). V in kg, w in kg/m, l in m.
- General shear stress: `v = V·Q/(I·b)` (5.10). v in kg/cm², Q in cm³, I in cm⁴, b in cm.
- Rectangular (wood): `v = 3V/(2·b·d)` (5.11).
- For wood members the span may be reduced by 2d, i.e. by d at each end (American lumber association rule). Single span: `V = (w/2)·(l − 2d)` (5.12). Continuous: `V = (5w/8)·(l − 2d)` (5.13).
- Steel I/C/box sections use the web only: `v = V/(bw·d)` (5.14).
- Allowable shear: medium-hardwood parallel to grain **10 kg/cm²**. Steel A-36 **1,000 kg/cm²** (Bangkok code). Cold-formed steel follows the ว.ส.ท. cold-formed code, which includes web crippling.

**Example 5.6.** 2×6" joist (b = 5, d = 15 cm), w = 460 kg/m², spacing 0.60 m, so w = 276 kg/m. Continuous over stringers @2.40 m.
- Without reduction: V = 5·276·2.4/8 = **414 kg**, v = 1.5·414/(5·15) = **8.3 kg/cm²**.
- With reduction: V = (5/8)·276·(2.40 − 0.30) = **362 kg**, v = **7.2 kg/cm²** (about 10 % lower).
- Both are ≤ 10 kg/cm², so OK.

**Example 5.7.** Simple stringer 2.40 m with 3 point loads of 864 kg (joists @0.60).
- V = 3P/2 = **1,296 kg**.
- With I 125×75×16.4 (bw = 0.55 cm, d = 12.5 cm): v = 1,296/(0.55·12.5) = **188 kg/cm²**, which is less than 1,000, so OK.
- Span reduction is not applied for point loads.

### B.4 Compression — shores and props (§5.4)
Design considerations: (1) material strength, (2) slenderness, and (3) eccentricity from splices, out-of-plumb shores and uneven bearing.

#### B.4.1 Wood shores (US forest products association)
- `Fa = 0.30·E / (l/d)²` (5.15). Fa in kg/cm², E in kg/cm², l = unbraced length in cm, d = least dimension in cm.
- `P = Fa·A` (5.16). P in kg, A in cm².
- Limits: Fa ≤ allowable compression parallel to grain (Table 3.3), and **l/d ≤ 50**.
- Mid-height bracing halves the effective l/d in the braced direction. Check both axes.

**Example 5.8.** Yang wood 1½"×3" (3.75 × 7.5 cm), height 2.40 m. E = 113,651 kg/cm² and C∥ = 60 kg/cm² (ว.ส.ท.).
- Unbraced: l/d = 240/3.75 = 64 (> 50, not acceptable for permanent work but used here for temporary). Fa = 0.30·113,651/64² = **8.32 kg/cm²** (book prints 8.2 then uses 8.32). P = 8.32·3.75·7.5 = **234 kg**.
- Braced at mid-height on the narrow face: l/d = 240/7.50 = 32 (< 50). Fa = **33.30 kg/cm²** (< 60, OK). P = 33.30·3.75·7.5 = **936 kg**.
- Braced both ways at mid-height: l/d = 120/3.75 = 32, Fa = 33.30, P = **936 kg**. There is no gain over bracing one face only.

#### B.4.2 Steel shores (AASHO 1969 parabolic)
- `Fa = 1,250 − 0.033·(l/r)²` (5.17) when l/r < 132.
- `Fa = 10,000,000/(l/r)²` (5.18) when l/r ≥ 132.
- `P = Fa·A` (5.19).
- Variables: Fa in kg/cm², l in cm, r = √(I/A) in cm.
- Note: the two equations are discontinuous at l/r = 132 (675 vs 574 kg/cm²). This is transcribed as printed.
- Fa must not exceed the allowable value (Table 3.3). The Bangkok municipal code limits A-36 to **1,000 kg/cm²**.
- Tube properties as used in the book: `r = √(ID² + OD²)/4` and `A = π/4·(OD² − ID²)`.

**Example 5.9.** Thin tube Ø2" (OD = 6.03 cm, ID = 5.45 cm), height 2.50 m.
- r = **2.03 cm** and A = **5.23 cm²**.
- Unbraced: l/r = 250/2.03 = 123. Fa = 1,250 − 0.033·123² = **751 kg/cm²**. P = 751·5.23 = **3,927 kg** (text says 3,920).
- Braced at mid-height: l/r = 125/2.03 = 61. Fa = 1,250 − 0.033·61² = **1,127 kg/cm²**. P = **5,894 kg** (text says 5,882).
- With the Bangkok cap Fa = 1,000: P = 1,000·5.23 = **5,230 kg** (text says 5,220).

### B.5 Bearing (§5.5)
- Steel: `Fp = 0.90·Fy` (5.20) and `P = Ap·Fp` (5.21). Fp in kg/cm², Ap = bearing area in cm².
- Steel bearing plate bending: `Fb = 0.75·Fy` (5.22).
- Concrete (ว.ส.ท. EIT-001-16): `Fp = 0.25·f'ci` (5.23). f'ci is the concrete strength at the time of loading (kg/cm²).
- Wood perpendicular to grain: use C⊥ from Table 3.4. Yang wood C⊥ = 16 kg/cm². ACI-347 increase factor:
  - `X = (l + 1.0)/l` (5.24), where l = bearing length along grain in cm.
  - Applies only when l < 15 cm and the bearing is more than 7.5 cm from the member end.
  - For round plates, use l = diameter.
  - The increase can reach about 80 % for very narrow bearing.

**Table 5.3 (book numbering, second Table 5.3) — bearing increase factor X**

| Width (in) | Bearing length (cm) | X |
|---|---|---|
| ½ | 1.25 | 1.80 |
| ¾ | 1.87 | 1.53 |
| 1 | 2.50 | 1.40 |
| 1½ | 3.75 | 1.27 |
| 2 | 5.00 | 1.20 |
| 2½ | 6.25 | 1.16 |
| 3 | 7.50 | 1.13 |
| 4 | 10.0 | 1.10 |
| 5 | 12.5 | 1.08 |
| ≥ 6 | 15.0 | 1.00 |

**Example 5.10.** Joist 1½"×4" bears on stringer 1½"×8", R = 270 kg.
- Ap = 3.75·3.75 = 14.1 cm², fp = 270/14.1 = **19.1 kg/cm²**.
- C⊥ = 16; X = 1.27 gives 20.3 kg/cm², which is ≥ 19.1, so OK.
- Without X the check would fail.

**Example 5.11.** Stringer (Yang 1½"×8") on a Ø1½" steel shore (OD 48.6 mm), P = 1,080 kg, bearing plate.
- Fp = C⊥ = 16 (no increase). Ap = 1,080/16 = **67.5 cm²**. Width 3.75 cm gives plate length **18 cm**.
- Plate thickness: w = 1,080/(3.75·18) = 16 kg/cm². Cantilever 6.6 cm: M = 16·6.6²/2 = **348 kg-cm** (per cm). Fb = 0.75·2,500 = 1,875 kg/cm².
- d² = 348/1,875·6/3.75 = 0.297 cm², d = 0.54 cm, so use a **6 mm** plate. [Book divides by 3.75; transcribed as printed.]

**Example 5.12.** Steel shore on a slab with f'ci = 150 kg/cm², P = 1,080 kg, plate 10×10 cm.
- fp = 1,080/100 = **10.8 kg/cm²**. Allowable = 0.25·150 = **37.5 kg/cm²**, so OK.

### B.6 Tension — ties and hangers (§5.6)
- `Ft = 0.60·Fy` (5.25) and `T = At·Ft` (5.26). Ft in kg/cm², T in kg, At in cm² (net area).
- For thin tubes, also check bearing at the connections.
- For wood in tension: Ft = C∥ (Table 3.5), using the net section after bolt holes and defects.

**Table 5.4 Allowable tension of round bar RB-24 (มอก., Fy = 2,400 kg/cm², Ft = 0.6·Fy)**

| Dia (mm) | Area (cm²) | Yield (kg) | Allowable (kg) |
|---|---|---|---|
| 6 | 0.28 | 670 | 400 |
| 9 | 0.64 | 1,540 | 920 |
| 12 | 1.13 | 2,710 | 1,630 |
| 15 | 1.77 | 4,250 | 2,550 |
| 19 | 2.85 | 6,840 | 4,100 |
| 25 | 4.91 | 11,780 | 7,070 |

### B.7 Deflection (§5.7)
Criteria stated in the book:
- Common limit: **l/360**.
- Many engineers instead cap absolute deflection at **1.5 mm for sheathing** and **3.0 mm for other members**.
- For long spans (≥ 1.50 m), up to **5 mm** may be allowed.
- Exposed (fair-face) surfaces need stricter control.
- Members other than sheathing: max deflection about **0.3 cm** (Example 5.14).

ACI-347 beam deflection:
- Single span: `Δmax = 5·w·l⁴/(384·E·I)` (5.27).
- Continuous, more than 3 spans: `Δmax = w·l⁴/(128·E·I)` (5.28).
- Critical span for Δ = l/360:
  - Single span: `l_cr = 0.60·(E·I/w)^(1/3)` (5.29).
  - Continuous: `l_cr = 0.71·(E·I/w)^(1/3)` (5.30).
- Units (consistent): w in kg/cm, l in cm, E in kg/cm², I in cm⁴.

Sheathing plate deflection (Ricouard):
- `Δmax = k2·w·a⁴/(E·h³)` (5.31). Δ in cm, w = pressure in kg/cm², a = short grid span in cm, E in kg/cm², h = sheathing thickness in cm. k2 is from Table 5.2.
- For Δ = a/360: `a³ = E·h³/(360·k2·w)`, so `a_cr = 0.14·h·(E/(k2·w))^(1/3)` (5.32).

**Example 5.13.** Plywood 20 mm (h = 2.0 cm), E = 1.0×10⁵ kg/cm², w = 800 kg/m² = 800×10⁻⁴ kg/cm², grid b/a = 1, k2 = 0.0138.
- a = 40 cm: Δ = 0.0138·0.08·40⁴/(1e5·2³) = **0.0035 cm** (limit l/360 = 0.11 cm, OK).
- a = 60 cm: Δ = **0.018 cm** (limit 0.17 cm, OK). This is about 5 times larger than at a = 40 cm.

**Example 5.14.** Continuous joists (more than 3 spans), Yang 1½"×4", I = 3.75·10³/12 = **312.5 cm⁴**, E = 1.1×10⁵ kg/cm², w = 480 kg/m = 4.80 kg/cm.
- l_cr = 0.71·(1.1e5·312.5/4.80)^(1/3) = **140 cm** (the exact calculation gives ≈ 137).
- At l = 120 cm: Δ = 120⁴·4.80/(128·1.1e5·312.5) = **0.23 cm**, which is ≤ 120/360 = 0.33 cm and ≤ 0.3 cm, so OK.

---

## PART C — Implementation checklist (derived)

1. **Lateral pressure (wall/column/footing side):** compute ACI-347 (eq 2.7/2.8/2.9 with caps), CEB (min of 2.12, 2.13, 2.14) and CIRA (min of Tables 2.3, 2.4, 2.5). Let the user pick a method. The book's examples suggest CEB can be about 10 % lower than ACI/CIRA.
   - Optional modifiers: vibration +10-20 %, retarder liquid-head addition (§2.4), tunnel/pump minimum of 4,880 kg/m².
   - Always cap at γ·H (liquid head), using γ = 2,400 (ACI/CEB) or 2,500 (CIRA).
2. **Vertical load (slab/beam bottom):** q = γc·t + formwork DL (default 50 kg/m², range 15-75) + LL.
   - LL is ≥ 245 kg/m² for ACI, or from Table 2.7 by thickness for CEB/CIRA (100/150/200/250).
3. **Sheathing:**
   - M = k1·w·a² (Table 5.2) or the beam formulas.
   - bd² = 6M/Fb with b = 100 cm.
   - Δ = k2·w·a⁴/(E·h³) ≤ min(a/360, 1.5 mm).
4. **Joists/stringers/walers:**
   - M = wl²/8 (simple / 2-span), wl²/10 (3+ span continuous), or point-load cases (Table 5.3).
   - V = wl/2 or 5wl/8, optionally reduced to (l − 2d) for wood.
   - v = 3V/(2bd) ≤ Fv.
   - Δ = 5wl⁴/384EI (simple) or wl⁴/128EI (continuous) ≤ min(l/360, 3 mm); up to 5 mm allowed for l ≥ 1.5 m.
5. **Shores:**
   - Wood: Fa = 0.30E/(l/d)² ≤ C∥, with l/d ≤ 50.
   - Steel: AASHO eq 5.17/5.18, capped at 1,000 kg/cm² (Bangkok) or 1,250.
   - P = Fa·A ≥ the load from the tributary area.
6. **Bearing:** wood ⊥ grain C⊥·X (eq 5.24, Table 5.3b); steel 0.9Fy; concrete 0.25f'ci; bearing plate thickness from Fb = 0.75Fy.
7. **Ties/hangers:** T_allow = 0.6·Fy·At (RB-24 Table 5.4), with the FS from Table 5.1 applied to the ultimate tie capacity.
