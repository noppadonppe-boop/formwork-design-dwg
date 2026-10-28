# FormWork Studio

Web app for designing concrete formwork (wall, column, beam, slab, footing and their shoring) following
*Design Form Work* by ดร.เอกสิทธิ์ ลิ้มสุวรรณ (Chulalongkorn). Vite + React + TypeScript + Tailwind, Firebase.

## Run

```bash
npm install
npm run dev      # http://localhost:5180 (own port — 5173 is used by other local projects)
npm test         # engine unit tests (book worked examples)
npm run build
npm run preview  # production build at http://localhost:4180
```

Without Firebase config the app runs in **Local mode** (data in this browser only).

## Connect Firebase

The app uses the Firebase project **`rc-design-ecosystem`** (shared with other apps), hosting site
**`formwork-design-dwg`** (target `site-07`).

1. `.env` (git-ignored) holds the web-app config — copy `.env.example` to `.env` and fill the `VITE_FIREBASE_*` values
   from Firebase console → Project settings → Your apps → Web app. Restart `npm run dev` after editing it.
2. **Authentication** → Sign-in method: *Email/Password* and *Google* are on. Add `formwork-design-dwg.web.app` to
   *Authentication → Settings → Authorized domains*, or Google sign-in fails there with `auth/unauthorized-domain`
   (localhost already works).
3. **Firestore** `(default)` database (asia-southeast3).
4. **Storage** — Console → Storage → *Get started* to create the default bucket
   (`rc-design-ecosystem.firebasestorage.app`; new buckets need the Blaze plan). Until then file uploads fail with a
   message and everything else works.
5. Deploy (run from this folder; `.firebaserc` sets the project and the hosting target):
   ```bash
   firebase login
   npm run build && firebase deploy --only hosting:site-07,functions:formwork
   # a MasterAdmin opens the new app once (fills each project's members), then:
   firebase deploy --only firestore:rules
   firebase deploy --only storage
   ```
   Access is per project (`members`); `npm run test:rules` checks the rules on the emulators.

> **Rules are shared.** Firestore has one ruleset per Firebase project and `rc-design-ecosystem` hosts other apps.
> `firestore.rules` here is the full live ruleset plus the FormWork Studio block — pull the live rules and merge before
> every deploy (from this repo or any other), or one app overwrites the other's rules. The same applies to
> `storage.rules` if other apps start using the bucket.

### Data model

Users and projects sit side by side under one root document; each project keeps its own data underneath it.

```
RC-FormWork-Design-Web-App/                    (collection)
  root/                                        (document)
    users/{email}                              UserProfile — name, position, department, roles[], status, assignedProjects[]
    appMeta/config                             firstUserRegistered, totalUsers, createdAt
    activityLogs/{id}                          REGISTER · LOGIN · LOGOUT · PROFILE_UPDATE · USER_UPDATE
    projects/{projectId}                       โครงการ — info, criteria, shop settings, elementCount, version
      elements/{elementId}                     ชิ้นส่วนของโครงการ — type, input, result summary, version
      uploads/{fileId}                         ไฟล์ของโครงการ — category, name, size, Storage path, url, uploadedBy
    settings/{key}                             ค่าตั้งของเมนู — e.g. settings/optimizer (Optimizer prices)
```

Storage mirrors it: `RC-FormWork-Design-Web-App/root/projects/{projectId}/{attachments|imports}/{fileId}-{name}`
(≤ 50 MB per file). Files come from the **ไฟล์โครงการ** panel on the project page (`attachments`) and from drawings
opened on the import page (`imports`, a copy is kept automatically). Deleting a project deletes its elements, files
and its entry in every user's `assignedProjects`. Documents written by the earlier flat layout (`root/elements`,
`root/uploads`) are moved under their project the first time a MasterAdmin opens the app.

Code: `src/lib/firebase.ts` (init, root path constants, falls back to Local mode if Firebase fails to start),
`src/data/repo.ts` (Firestore + Local mode), `src/data/files.ts` (Storage), `src/components/FilesPanel.tsx`.
Rules: `firestore.rules` (`match /RC-FormWork-Design-Web-App/{document=**}` → signed in), `storage.rules`.
Data saved earlier in Local mode stays in that browser and is not copied to Firebase.

### Users, roles and sign-in

- **Sign-in** (`src/auth/authService.ts`): email + password, or Google (popup). `setPersistence(auth,
  browserLocalPersistence)` runs before every sign-in, so the session survives closing the browser; a 30-day expiry
  (`setSessionExpiry()`, called right after sign-in) signs the user out after that. Registration
  (`/register`) asks for first name, last name and position.
- **First user = MasterAdmin.** A Firestore transaction on `appMeta/config` makes exactly one first user
  (MasterAdmin + approved). Everyone after — by email or Google — starts as Staff + `pending` and waits on `/pending`
  until a MasterAdmin approves them; the page moves on by itself when that happens.
- **No login-page flash** (`src/auth/AuthProvider.tsx`): `onAuthStateChanged` → `{ firebaseUser, userProfile,
  loading }`. While `loading` is true every route shows a spinner; the login form appears only when there is no
  session. The profile is a live snapshot, so role, approval and project changes apply without a refresh.
- **Route guard** (`src/auth/ProtectedRoute.tsx`): loading → not signed in (`/login`) → profile loading → pending
  (`/pending`) → rejected (`/login`) → roles / permission → the `:projectId` must be assigned to the user.
- **Roles** (`src/auth/roles.ts`): MasterAdmin (everything, sees every project, user management), Admin, Engineer,
  Checker, Drafter, Estimator, Staff. A user can hold several roles and gets the union of their permissions
  (`ROLE_PERMISSIONS`); the UI hides buttons and routes the user may not use, and pages without edit rights open
  read-only.
- **Projects per user**: everyone except MasterAdmin sees only the projects in their `assignedProjects`. A user who
  creates a project gets it assigned automatically.
- **User management** (`/admin`, MasterAdmin only, link at the bottom left of the sidebar with a badge for pending
  requests): approve / reject, roles (multi-select), department, position and project assignment, with Google profile
  photos. At least one MasterAdmin always remains, and you cannot demote or reject yourself.
- **Own profile**: avatar menu (top right, Google photo) → *อัปเดตโปรไฟล์* (name, position, department) or
  *ออกจากระบบ*. The sidebar card at the top shows name, position and roles.

> Access rules are enforced in the app. The deployed Firestore/Storage rules let any signed-in user read and write
> `RC-FormWork-Design-Web-App/**` (the rules were not changed for this), so a determined user with API access could
> bypass roles and project assignment. Tighten the rules (role / `assignedProjects` checks) before relying on them for
> confidential data.

### Realtime editing without losing work

Lists and pages update live (Firestore snapshots). Projects and elements carry a `version` number; every save runs in
a transaction that checks the version the edit started from. While you have unsaved edits, someone else's save does
**not** replace what you typed: the project form, element designer (autosave), BOM settings and user editor show a
banner — *โหลดของผู้อื่น* (take theirs) or *บันทึกของฉันทับ* (save yours over it). Save buttons lock while a save is
running, so double clicks do not create duplicates.

### Troubleshooting a white screen

- Open the app on **http://localhost:5180**. Other projects' dev servers listen on 5173 (`127.0.0.1` and `::1` can be
  different apps), so `localhost:5173` may show another app or a stale process.
- Render errors now show an error card with *Reload* (`src/components/ErrorBoundary.tsx`) instead of a blank page; after
  a new deployment, reload once to pick up the new files.

See `docs/00-app-architecture.md`.

## Calculation engine (`src/engine`)

Pure TypeScript, no React — every function returns its result plus a step trace (formula, values, equation/table reference).

| Module | Book reference |
|---|---|
| `pressure.ts` | §2.10 — ACI-347 (eq 2.7–2.9 + caps), CEB (eq 2.12–2.14, Table 2.2), CIRA (Tables 2.3–2.5) |
| `loads.ts` | §2.11 — vertical loads, Table 2.7 |
| `member.ts` | Ch.5 — bending/shear/deflection (wl²/10, 5wl/8, wl⁴/128EI), max-span solvers, timber & steel shores (eq 5.15–5.18), σ = T/A ± M/S |
| `materials.ts`, `sections.ts` | Tables 3.2–3.8, 3.15, 4.6, 5.4 |
| `wall.ts` | Ch.8 — sheathing → studs → wales → ties, sill nails, braces |
| `column.ts` | Ch.9 — sheathing (plywood/boards) → studs → yokes (tension + bending), ties, base, braces |
| `slab.ts` | Ch.6 — deck (plywood/boards) → joists → stringers → shores, shoring lateral bracing |
| `beam.ts` | Ch.7 — sides (γh) → studs [→ wales + ties], bottom/stiffeners → heads (T-head or double post) → shores, top braces |
| `footing.ts` | Ch.10 — side forms with cantilever / braced-to-stakes / wale + tie studs, stake embedment in soil |
| `shoring.ts` | §5.4, Tables 6.10–6.11 — timber/log/pipe posts (Fa, l/d, l/r), rated props & scaffold legs (SWL), base-plate bearing |

Conventions taken from the book's examples: timber nominal 1" = 2.5 cm; deflection l/360 (optional absolute cap);
wale/yoke c/c = net span + 10 cm for double members; tie spacing rounded to plywood modules (30/40/60/80/120 cm).

Timber shear (eq 5.13 with l − 2d, Fv 10) is **on by default** — it reproduces the book's Table 8.4 exactly,
although the book's direct-calculation examples skip it. Toggle it per project under *Deflection & Safety*.

Known book discrepancies are listed in `docs/design-basis/0*.md` and noted in the tests.

## 3D designer and calc report (Phase 2)

- `src/model/formModel.ts` — builds the formwork geometry (plywood sheets, studs, wales/yokes, ties, braces) in metres
  from the engine's layout. The 3D view and the report drawings both use it; the shop drawings will too.
  Also defines the drag handles and how a handle edit maps back to the element input (snapped to 5 cm).
- `src/components/three/` — react-three-fiber viewer (lazy-loaded): orbit/zoom/pan, view presets, colour by
  material or by check status, layer toggles, PNG snapshot, fullscreen. Click a part → inspector with its checks
  and just that part's inputs; drag the orange handles to change H, L, t, b, h and stud/wale/tie/yoke spacing.
- `src/pages/ReportPage.tsx` + `src/report/` — A4 calc report per element (`/projects/:id/elements/:eid/report`)
  or for the whole project (`/projects/:id/report`). PDF = the browser's *Print → Save as PDF*: the browser lays out
  the Thai text correctly, and `@page` margin boxes add the running header/footer and "page X / Y" (Chrome/Edge 131+).
  Sample: `docs/sample-calc-report.pdf`.

## Slab, beam, footing and shoring (Phase 3)

- Slab (Ch.6): w = γt + LL + forms → joist, stringer and shore spacings rounded down to 5 cm as the book does.
  Shore lateral bracing is not computed in the book; the app uses ACI 347 (max of 2 % DL and 150 kg/m per row),
  with one X-brace per row in each direction, each diagonal spanning enough bays to be no steeper than 60°.
- Beam (Ch.7): side pressure γh. Without ties the side studs are checked as a simple span under the triangular
  (fluid) pressure; with ties, between tie rows under the maximum pressure. Heads land on a multiple of the stud
  spacing (Ex 7.1/7.4). Shore load = beam + tributary slab concrete + forms (beam 100 kg/m, slab 50 kg/m²) + live
  load on the beam and tributary slab — the book's examples each include a different subset, so totals differ a little.
- Footing (Ch.10): CEB/ACI/CIRA pressure with d = smaller plan side; the tied case reuses the wall design.
- Shoring: a designed post (timber, round log, steel pipe) or a rated product (scaffold leg / steel prop: enter the
  maker's SWL), plus optional base-plate bearing on the surface below.
- Shear: stringers and beam bottoms are always checked for shear (eq 5.11) as in the book; joists follow the
  project's *timber shear* switch (the book's slab examples skip it).
- Book discrepancies noted in the tests: Ex 7.2 bottom bending printed 146 (recomputed 60, deflection governs anyway);
  Ex 7.4 rounds heads up to 120 cm (Δ +7 %) — the app keeps 80 cm unless you fix 120.

## Shop drawings and BOM (Phase 4)

- `src/model/bom.ts` — bill of materials read from the same geometry as the 3D view: every part is identified
  (section, material, cut length / sheet size) and identical pieces are counted together, so the BOM always matches
  the drawing. Timber volume in ลบ.ฟ. (nominal inches × length in ft / 144), steel weight from kg/m, plywood area →
  sheets of 1.22 × 2.44 (approximate, no nesting or reuse), concrete volume.
- `/projects/:id/elements/:eid/shop` and `/projects/:id/shop` — A3 landscape shop drawing per element: two views at a
  standard scale (1:5 … 1:500, picked to fit), an isometric with numbered callouts keyed to the BOM marks, the BOM,
  general notes and a title block (drawing no. `{projectNo}-FW-{code}`). Long BOMs continue on extra sheets.
  PDF = browser print (A3). **DXF** (R12, full size in mm, one layer per part group, Thai text as `\U+XXXX`) and
  **BOM CSV** (UTF-8 for Excel) downloads. Sample: `docs/sample-shop-drawing.pdf`.
- Sheet 2 of every element: plywood **cutting plan** (`src/model/cutting.ts`, guillotine packing on 1.22 × 2.44 sheets,
  pieces may rotate, pieces larger than a sheet split for joints over studs/joists) and the book's **erection and
  stripping sequence** (`src/report/sequence.ts`, §6.3–§10.3).
- `/projects/:id/bom` — project totals over every element × its quantity: purchase quantity = need × (1 + waste %) ÷
  reuse (plywood counted in cutting-plan sheets; form ties are consumed every pour), editable unit prices and a cost
  estimate (`src/model/cost.ts`), CSV export. The same page holds the shop-drawing settings saved with the project:
  company, drawn / checked / approved names and the revision description shown in every title block.
- DXF also carries the BOM marks (circles with leaders on the first view), the BOM table, notes and a title block.

## Drawing import and optimizer (Phase 5)

- `/projects/:id/import` — **DXF**: `src/import/dxfRead.ts` reads ASCII DXF (LINE, LWPOLYLINE, POLYLINE, CIRCLE, TEXT,
  MTEXT, INSERT/blocks; `$INSUNITS` or a guess from the extent). `src/import/detect.ts` finds rectangles (closed
  polylines or four lines) and circles, classifies them by layer name (editable per layer) or by shape, reads nearby
  marks such as `C1 40x40` / `B2 30x60`, measures labelled beams from the nearest beam line, and merges identical
  items into one element with a quantity. Sample: `docs/sample-plan.dxf`. DWG must be saved as DXF first.
- **AI** (`src/import/ai.ts`, prompt + schema shared in `src/import/aiSchedule.ts`): an image or PDF of the drawing is
  read by Claude (`claude-opus-5-5`, or Sonnet 5.5) with a structured-output schema (`betaZodOutputFormat`) and the
  server-side refusal fallback (`server-side-fallback-2026-07-01`, `fallbacks: "default"`). Two routes:
  - **Company server (default when Firebase is configured)** — the `readDrawing` Cloud Function below; the key never
    reaches the browser.
  - **Own API key** (Local mode, or by choice) — called from the browser with `dangerouslyAllowBrowser`; the key is kept
    in that browser's localStorage only.
- Both end in a review table (type, code, sizes, quantity — all editable); checked rows become elements, computed on
  creation.
- **Optimizer** (element page → *Optimizer* tab, `src/optimizer/`): tries sheathing thickness × member sections ×
  support options (up to ~2,800 designs), lets the engine choose the largest safe spacings, keeps designs whose every
  check passes (ratio ≤ the chosen limit), and ranks them by cost per set — plywood by sheet price, timber by ลบ.ฟ.,
  steel by kg, ties / props / accessories per piece, plus a handling cost per piece. Runs in a Web Worker; prices are
  shared by all users in `root/settings/optimizer` (Local mode: this browser). *Use this design* replaces the element's members and spacings.

## AI import Cloud Function (`functions/`)

`readDrawing` is a callable function (Gen 2, Node 22, region `asia-southeast1`): it requires a signed-in user, validates
the request (type PNG/JPG/WEBP/GIF/PDF, ≤ 10 MB payload ≈ 7 MB file, allowed models only), counts one read per user per
day in `aiUsage/{uid}` (limit `AI_DAILY_LIMIT`, default 30; failed calls are given back; the collection is closed to
clients by `firestore.rules`), calls Claude with the key from Secret Manager, logs token usage, and returns the
schedule plus the reads left today. `functions/build.mjs` bundles it with esbuild so it shares
`src/import/aiSchedule.ts` with the web app.

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY      # paste the company key (Console → API keys)
firebase deploy --only functions:formwork            # own codebase: never touches the other apps' functions
# Firestore rules are shared with other apps — pull and merge the live ruleset before `--only firestore:rules`
```

Optional parameters (asked on first deploy, or set in `functions/.env`): `AI_DAILY_LIMIT`, `FUNCTIONS_REGION` — if you
change the region, set the same value in the web app's `VITE_FUNCTIONS_REGION`. Local testing:
`firebase emulators:start --only auth,functions,firestore` with `VITE_FUNCTIONS_EMULATOR=127.0.0.1:5001` in `.env.local`
(the emulator reads the secret from `functions/.secret.local`). `npm --prefix functions test` checks the request guards.
Cloud Functions with secrets need the Blaze (pay-as-you-go) plan.
