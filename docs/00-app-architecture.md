# FormWork Studio — App Architecture & Recommendations

Design basis: *Design Form Work* (ดร.เอกสิทธิ์ ลิ้มสุวรรณ, จุฬาฯ) — see `docs/design-basis/01–04`.
UX/UI prototype: https://claude.ai/artifact/B4H4USqkX2F4MyLHb3saKT (6 screens).

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| App | **Vite + React 18 + TypeScript** | Requested; TS is essential for a calc engine (units, typed members) |
| UI | Tailwind CSS + Radix UI primitives (shadcn/ui), IBM Plex Sans Thai | Professional look, accessible, Thai glyphs |
| State | Zustand (editor state) + TanStack Query (Firestore cache) | Undo/redo for 3D edits is simple with Zustand + immer patches |
| 3D | **three.js via @react-three/fiber + @react-three/drei** | Orbit/pan/zoom, TransformControls (drag handles), section planes, instanced meshes for hundreds of shores |
| 2D drawings | Own SVG generator → PDF (`jspdf` + `svg2pdf.js`), DXF (`dxf-writer`) | Shop drawings stay vector, editable in AutoCAD |
| Reports | React-PDF or HTML print CSS → PDF; Excel via SheetJS | Calc report with formula + book reference per line |
| Backend | **Firebase**: Auth, Firestore, Storage, Cloud Functions, Hosting | Requested |
| Drawing import (AI) | Cloud Function → Claude vision API (latest model) to read PDF/image plans → JSON elements; DXF parsed client-side (`dxf-parser`) | Upload a plan → detected footings/columns/walls/beams/slabs for review |
| Tests | Vitest — every worked example in the book becomes a unit test | Guarantees calc engine matches the reference |

## 2. Module layout

```
src/
  app/            routes, layout, auth guard
  features/
    projects/     list, create/edit/delete, criteria
    import/       manual forms, upload + AI detect, review table
    designer/     3D scene, element tree, property panel, checks bar
    report/       calc report renderer
    shopdrawing/  sheet composer, title block, BOM
    library/      materials DB (plywood, timber, steel sections, ties, shores)
  engine/         ← pure TS, no React, 100% unit-tested
    units.ts      MKS (kg, cm, m) internally; SI display option
    pressure/     aci347.ts, ceb.ts, cira.ts, vertical.ts
    beams.ts      span coefficients (simple / 2-span / ≥3-span), M, V, Δ
    checks/       bending, shear, deflection, bearing, buckling, tension
    systems/      slab.ts, beam.ts, wall.ts, column.ts, footing.ts
    optimize.ts   max spacing per check → pick min → round to module
    layout/       generate member geometry (for 3D + drawings) from design
  lib/firebase.ts
```

The **engine** is the core: input = element geometry + criteria + chosen system → output = member sizes/spacings, utilisation ratios, a step-by-step trace (formula, values, equation no., book page) used by both the report and the 3D colour-coding.

## 3. Design flow per element (from the book)

1. Loads: lateral pressure (ACI 347 / CEB / CIRA, user selects; caps at γh) or vertical load (DL concrete + formwork + LL ≥ 245 kg/m²).
2. Sheathing (plywood) → max span of studs/joists from bending, shear (rolling), deflection.
3. Secondary members (studs / joists) → max span = spacing of wales/stringers.
4. Primary members (wales / stringers, single or **double** section) → max span = tie or shore spacing.
5. Ties: T = P × tributary area ≤ SWL (Table 4.6) — or **no-tie** option → external bracing/kickers/yokes.
6. Shores: load per shore ≤ allowable (wood Fa = 0.30E/(l/d)², steel AISC formula, or manufacturer SWL table by height).
7. Columns: yokes/clamps at variable spacing increasing with height (pressure envelope).
8. Bracing / wind / lateral 2% of vertical load for shoring.

Member options: plywood (thickness, grain direction), timber (species groups, nominal sizes), steel square/rectangular tube, C (lip channel), channel, angle — single or double; ties (tie rod Ø⅜"/½", she-bolt, snap tie); shoring (adjustable steel prop, frame scaffold, timber post, ringlock/cuplock tower).

## 4. Firestore data model

**As built (2026-10-27).** Users and projects are siblings under one root document; each project keeps its own data
in sub-collections. Who sees a project is decided by the user's `assignedProjects` (MasterAdmin sees all).

```
RC-FormWork-Design-Web-App/root/                     Firebase project rc-design-ecosystem
  users/{email}                                      UserProfile
     uid, email, firstName, lastName, position, department,
     role (highest), roles[] (multi), status: pending|approved|rejected,
     assignedProjects[], photoURL (Google), isFirstUser, createdAt, updatedAt, version
  appMeta/config
     firstUserRegistered, totalUsers, createdAt      first-user detection (transaction)
  activityLogs/{id}
     action: REGISTER|LOGIN|LOGOUT|PROFILE_UPDATE|USER_UPDATE, uid, email, detail, userAgent, at
  projects/{projectId}
     projectNo, name, client, contractor, subcontractor, location, note, revision, status,
     criteria { pressureMethod, verticalMethod, R, T, slump, gamma, vibrationFactor, liveLoad,
                formWeight, deflectionRatio, deflectionAbsMm, checkTimberShear, windLoad, defaults {...} },
     shop { company, drawnBy, checkedBy, approvedBy, revisionNote, waste, reuse, prices[] },
     elementCount, ownerUid (creator), members[], createdAt, updatedAt, version
    elements/{elementId}
       projectId, code (C1, B2…), type: footing|column|wall|beam|slab, name, level, qty,
       input {...type-specific}, result { status, maxRatio, pressure }, createdAt, updatedAt, version
    uploads/{fileId}
       projectId, category: attachments|imports, name, size, contentType, path (Storage), url,
       uploadedBy, createdAt
  settings/{key}
     value, updatedAt                                   e.g. settings/optimizer = Optimizer prices
```

`version` is bumped by every content save inside a transaction that checks the version the edit started from
(`ConflictError` otherwise); element saves touch the project's `updatedAt` but not its `version`, so the project form
never sees false conflicts. Projects are listed in full and filtered client-side by the user's assignments.

Storage mirrors Firestore: `RC-FormWork-Design-Web-App/root/projects/{projectId}/{attachments|imports}/{fileId}-{name}`.
Project delete is a client-side cascade: elements (batched), files (object + `uploads` record), the project id in
every user's `assignedProjects`, then the project. The earlier flat `root/elements` and `root/uploads` are moved under
their projects once, when a MasterAdmin opens the app (`migrateLegacyData`, errors ignored).

Roles (`src/auth/roles.ts`, union of permissions when a user has several):

| Role | Permissions |
|---|---|
| MasterAdmin | everything; sees every project; user management |
| Admin | every module in assigned projects; create / delete projects |
| Engineer | create / edit projects, design elements, import, report, shop drawing, BOM (view), library |
| Checker | edit project (status), report, shop drawing, BOM (view), library |
| Drafter | shop drawing, report, library |
| Estimator | BOM incl. settings and prices, report, library |
| Staff | assigned projects (read-only), library |

Security rules: Firestore `match /RC-FormWork-Design-Web-App/{document=**}` and Storage
`match /RC-FormWork-Design-Web-App/root/{allPaths=**}` allow any signed-in user (Storage writes ≤ 50 MB). Roles,
approval and project assignment are enforced by the app (routes, hidden actions), not by these rules. The
Firestore ruleset is shared with the other apps in `rc-design-ecosystem` (its default is deny-all), so
`firestore.rules` in this repo is the full live ruleset plus this block — always merge with the live rules before
deploying. `aiUsage/{uid}` (AI import quota, top level) is written only by the Cloud Function and is closed to clients.

Local mode (no Firebase config, or Firebase fails to start): the same shapes in browser localStorage
(`formwork-studio:v1`), no file uploads.

Hosting: site `formwork-design-dwg`, target `site-07` (`firebase deploy --only hosting:site-07`).

<details><summary>Original plan (superseded)</summary>

```
users/{uid}                         profile, role
projects/{projectId}                info, criteria, ownerUid, members{uid: role}
projects/{id}/elements/{elementId}  geometry, system, result, transform
projects/{id}/drawings/{drawingId}  sheet no, elementIds, revision, svg/pdf storage path
projects/{id}/imports/{importId}    file path, status, detected[] (pending review)
library/{materialId}                shared materials DB (seeded from book tables)
projects/{id}/library/{materialId}  project-specific materials (overrides)
```
Storage: `projects/{id}/imports/*`, `projects/{id}/drawings/*.pdf|dxf`.
Security rules: read/write only if `request.auth.uid in resource.data.members`; delete project only by owner.
</details>

## 5. Recommended extras (beyond the original brief)

1. **Auto-optimize** — engine finds the most economical spacing / section from stock sizes (rounded to 5 cm modules and plywood 1.22×2.44 sheet layout).
2. **Pour-rate guard** — reverse calc: “max allowable pour rate R for this form” printed on the shop drawing.
3. **Stock / inventory** — company's own available plywood, steel sections, props; the optimizer prefers what is in stock.
4. **Reuse & cost** — number of reuses, BOM cost per m² of contact area, quantity rollup per floor.
5. **Pour & strip schedule** — stripping times per element (book §1.4 / §5), back-propping notes for slabs.
6. **Checklist & QA** — pre-pour inspection checklist per element (plumb, ties, shore bases), photo upload from site (mobile layout).
7. **Revision control** — every issue of a shop drawing locks a snapshot (R0, R1…) with change cloud.
8. **Roles** — Engineer (edit), Checker (approve), Site (view + checklist).
9. **Offline/PWA** — Firestore offline persistence for site use.

## 6. Delivery phases

| Phase | Scope |
|---|---|
| 1 | Project CRUD + criteria + Firebase auth/rules; engine for pressure + beam formulas + wall & column; unit tests from book examples |
| 2 | 3D designer (wall, column) with property panel + live checks; calc report PDF |
| 3 | Slab & beam with shoring; footing; materials library UI |
| 4 | Shop drawing generator (SVG→PDF/DXF) + BOM |
| 5 | Drawing import (DXF parse + AI vision for PDF/images), optimizer, extras |
