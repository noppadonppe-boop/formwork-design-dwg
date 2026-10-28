// Data access. Firestore when configured, otherwise browser localStorage ("Local mode").
import {
  arrayUnion,
  collection,
  doc,
  type DocumentReference,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  type Transaction,
  where,
  type WriteBatch,
  writeBatch,
} from 'firebase/firestore'
import { userRef } from '@/auth/authService'
import { CATEGORY, db, firebaseEnabled, rootRef } from '@/lib/firebase'
import { ConflictError, DuplicateProjectNoError } from './conflict'
import { deleteFile, type UploadedFile } from './files'
import type { ElementData, FormElement, FormPanel, PanelData, Project, ProjectData } from './types'

export type Unsubscribe = () => void

/** Projects a user may list: every project (`all`, MasterAdmin) or only those whose `members` hold `uid`. */
export interface ProjectScope {
  uid: string
  all: boolean
}

export interface Repo {
  watchProjects(scope: ProjectScope, cb: (p: Project[]) => void, onError?: (e: Error) => void): Unsubscribe
  watchProject(id: string, cb: (p: Project | null) => void): Unsubscribe
  /** throws DuplicateProjectNoError if the number is taken; `assignTo`: the creator's email, to assign them the new project */
  createProject(uid: string, data: ProjectData, assignTo?: string): Promise<string>
  /** `baseVersion`: the version the edit started from — throws ConflictError if someone saved since (unless `force`) */
  updateProject(id: string, data: Partial<ProjectData>, baseVersion?: number, force?: boolean): Promise<number>
  deleteProject(id: string): Promise<void>
  watchElements(projectId: string, cb: (e: FormElement[]) => void): Unsubscribe
  createElement(projectId: string, data: ElementData): Promise<string>
  updateElement(projectId: string, id: string, data: Partial<ElementData>, baseVersion?: number, force?: boolean): Promise<number>
  deleteElement(projectId: string, id: string): Promise<void>
  watchPanels(projectId: string, cb: (p: FormPanel[]) => void): Unsubscribe
  createPanel(projectId: string, data: PanelData): Promise<string>
  updatePanel(projectId: string, id: string, data: Partial<PanelData>, baseVersion?: number, force?: boolean): Promise<number>
  deletePanel(projectId: string, id: string): Promise<void>
  /** per-menu settings shared by all users (e.g. optimizer prices) */
  getSetting<T>(key: string): Promise<T | undefined>
  setSetting<T>(key: string, value: T): Promise<void>
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 20)
const byUpdated = <T extends { updatedAt: number }>(a: T, b: T) => b.updatedAt - a.updatedAt
const byCode = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code, undefined, { numeric: true })
/** projectNumbers document id: case-insensitive, and safe for any characters ('/' included) */
export const projectNoKey = (projectNo: string) => `n_${encodeURIComponent(projectNo.trim().toLowerCase())}`
export const versionOf = (d: object | null | undefined) => {
  const v = (d as { version?: unknown } | null | undefined)?.version
  return typeof v === 'number' ? v : 0
}

// ---------------------------------------------------------------- Firestore
// RC-FormWork-Design-Web-App/root/users/{email}                    — ผู้ใช้ (src/auth/authService.ts)
// RC-FormWork-Design-Web-App/root/projects/{pid}                   — โครงการ (same level as users); `members` = uids allowed in
// RC-FormWork-Design-Web-App/root/projectNumbers/{key}             — projectNo → projectId (unique project numbers)
// RC-FormWork-Design-Web-App/root/projects/{pid}/elements/{eid}    — ชิ้นส่วนของโครงการ
// RC-FormWork-Design-Web-App/root/projects/{pid}/uploads/{fid}     — ไฟล์ของโครงการ (src/data/files.ts)
// RC-FormWork-Design-Web-App/root/projects/{pid}/panels/{id}       — แผงแบบหล่อในคลังของโครงการ (Form Assembly)
// RC-FormWork-Design-Web-App/root/settings/{key}                   — ค่าตั้งของแต่ละเมนู
// `version` on projects and elements is bumped by every content save, so concurrent edits are detected.

function firestoreRepo(): Repo {
  const fs = db!
  const projects = collection(rootRef!, CATEGORY.projects)
  const elements = (pid: string) => collection(projects, pid, CATEGORY.elements)
  const panels = (pid: string) => collection(projects, pid, CATEGORY.panels)
  const settings = collection(rootRef!, CATEGORY.settings)
  const numberRef = (projectNo: string) => doc(rootRef!, CATEGORY.projectNumbers, projectNoKey(projectNo))
  const logError = (what: string) => (e: Error) => console.error(`Firestore ${what}:`, e)

  /** versioned update in a transaction; `extra` writes (e.g. touching the parent project) go in the same transaction */
  const versioned = (ref: DocumentReference, data: object, baseVersion: number | undefined, force: boolean, extra?: (tx: Transaction) => void) =>
    runTransaction(fs, async (tx) => {
      const cur = await tx.get(ref)
      if (!cur.exists()) throw new Error('ไม่พบข้อมูล (อาจถูกลบไปแล้ว)')
      const v = versionOf(cur.data())
      if (!force && baseVersion !== undefined && v !== baseVersion) throw new ConflictError()
      tx.update(ref, { ...data, version: v + 1, updatedAt: Date.now() })
      extra?.(tx)
      return v + 1
    })

  return {
    watchProjects(scope, cb, onError) {
      // firestore.rules only allow a list query that is itself limited to the user's own projects
      return onSnapshot(
        scope.all ? projects : query(projects, where('members', 'array-contains', scope.uid)),
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Project, 'id'>), id: d.id })).sort(byUpdated)),
        (e) => onError?.(e),
      )
    },
    watchProject(id, cb) {
      return onSnapshot(
        doc(projects, id),
        (d) => cb(d.exists() ? { ...(d.data() as Omit<Project, 'id'>), id: d.id } : null),
        (e) => {
          logError('watchProject')(e)
          cb(null)
        },
      )
    },
    async createProject(uid, data, assignTo) {
      const id = newId()
      const now = Date.now()
      const p: Omit<Project, 'id'> = { ...data, ownerUid: uid, members: [uid], elementCount: 0, createdAt: now, updatedAt: now, version: 1 }
      await runTransaction(fs, async (tx) => {
        if ((await tx.get(numberRef(data.projectNo))).exists()) throw new DuplicateProjectNoError(data.projectNo)
        tx.set(doc(projects, id), p)
        tx.set(numberRef(data.projectNo), { projectId: id, projectNo: data.projectNo, updatedAt: now })
        if (assignTo) tx.update(userRef(assignTo), { assignedProjects: arrayUnion(id), version: increment(1) })
      })
      return id
    },
    updateProject(id, data, baseVersion, force = false) {
      const ref = doc(projects, id)
      return runTransaction(fs, async (tx) => {
        const cur = await tx.get(ref)
        if (!cur.exists()) throw new Error('ไม่พบข้อมูล (อาจถูกลบไปแล้ว)')
        const v = versionOf(cur.data())
        if (!force && baseVersion !== undefined && v !== baseVersion) throw new ConflictError()
        // a new project number moves its projectNumbers entry (all reads before the writes)
        const oldNo = String(cur.data().projectNo ?? '')
        const newNo = data.projectNo
        if (newNo !== undefined && projectNoKey(newNo) !== projectNoKey(oldNo)) {
          const taken = await tx.get(numberRef(newNo))
          if (taken.exists() && taken.data().projectId !== id) throw new DuplicateProjectNoError(newNo)
          const old = oldNo ? await tx.get(numberRef(oldNo)) : undefined
          tx.set(numberRef(newNo), { projectId: id, projectNo: newNo, updatedAt: Date.now() })
          if (old?.exists() && old.data().projectId === id) tx.delete(old.ref)
        }
        tx.update(ref, { ...data, version: v + 1, updatedAt: Date.now() })
        return v + 1
      })
    },
    async deleteProject(id) {
      // client-side cascade; batches of ≤ 500 writes
      for (const sub of [elements(id), panels(id)]) {
        const snap = await getDocs(sub)
        for (let i = 0; i < snap.docs.length; i += 450) {
          const batch = writeBatch(fs)
          snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
          await batch.commit()
        }
      }
      // project files: Storage objects + their records
      const files = await getDocs(collection(projects, id, CATEGORY.uploads))
      await Promise.all(files.docs.map((d) => deleteFile(d.data() as UploadedFile).catch((e) => console.error('delete file', e))))
      const batch = writeBatch(fs)
      const no = (await getDoc(doc(projects, id))).data()?.projectNo
      if (typeof no === 'string' && no) {
        const entry = await getDoc(numberRef(no))
        if (entry.data()?.projectId === id) batch.delete(entry.ref)
      }
      batch.delete(doc(projects, id))
      await batch.commit()
      // users' assignedProjects and anything left behind are cleaned up by the onProjectDeleted function
    },
    watchElements(projectId, cb) {
      return onSnapshot(
        elements(projectId),
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id, projectId }) as FormElement).sort(byCode)),
        (e) => {
          logError('watchElements')(e)
          cb([])
        },
      )
    },
    async createElement(projectId, data) {
      const id = newId()
      const now = Date.now()
      const batch = writeBatch(fs)
      batch.set(doc(elements(projectId), id), { ...data, projectId, createdAt: now, updatedAt: now, version: 1 })
      batch.update(doc(projects, projectId), { elementCount: increment(1), updatedAt: now })
      await batch.commit()
      return id
    },
    updateElement(projectId, id, data, baseVersion, force = false) {
      // touching the project's updatedAt (not its version) keeps the project form free of false conflicts
      return versioned(doc(elements(projectId), id), data, baseVersion, force, (tx) => tx.update(doc(projects, projectId), { updatedAt: Date.now() }))
    },
    async deleteElement(projectId, id) {
      const batch = writeBatch(fs)
      batch.delete(doc(elements(projectId), id))
      batch.update(doc(projects, projectId), { elementCount: increment(-1), updatedAt: Date.now() })
      await batch.commit()
    },
    watchPanels(projectId, cb) {
      return onSnapshot(
        panels(projectId),
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id, projectId }) as FormPanel).sort(byCode)),
        (e) => {
          logError('watchPanels')(e)
          cb([])
        },
      )
    },
    async createPanel(projectId, data) {
      const id = newId()
      const now = Date.now()
      await setDoc(doc(panels(projectId), id), { ...data, projectId, createdAt: now, updatedAt: now, version: 1 })
      return id
    },
    updatePanel(projectId, id, data, baseVersion, force = false) {
      return versioned(doc(panels(projectId), id), data, baseVersion, force)
    },
    async deletePanel(projectId, id) {
      const batch = writeBatch(fs)
      batch.delete(doc(panels(projectId), id))
      await batch.commit()
    },
    async getSetting(key) {
      const d = await getDoc(doc(settings, key))
      return d.exists() ? d.data().value : undefined
    },
    async setSetting(key, value) {
      await setDoc(doc(settings, key), { value, updatedAt: Date.now() })
    },
  }
}

/**
 * One-time move of the earlier flat layout (root/elements, root/uploads with a projectId field) into
 * root/projects/{pid}/elements and …/uploads. Errors are swallowed so they never affect loading the app.
 */
export async function migrateLegacyData(): Promise<number> {
  if (!db || !rootRef) return 0
  let moved = 0
  for (const name of [CATEGORY.elements, CATEGORY.uploads]) {
    try {
      const snap = await getDocs(collection(rootRef, name))
      for (let i = 0; i < snap.docs.length; i += 200) {
        const batch = writeBatch(db)
        for (const d of snap.docs.slice(i, i + 200)) {
          const pid = d.data().projectId
          if (typeof pid === 'string' && pid) batch.set(doc(rootRef, CATEGORY.projects, pid, name, d.id), d.data())
          batch.delete(d.ref)
          moved++
        }
        await batch.commit()
      }
    } catch (e) {
      console.warn(`legacy ${name} check skipped:`, (e as Error).message)
    }
  }
  return moved
}

/**
 * Rebuilds every project's `members` from the users' `assignedProjects` (so access stays exactly what the admin
 * assigned) and adds missing projectNumbers entries. MasterAdmin only; needed once for projects created before
 * per-project rules, harmless to repeat. Returns the number of documents written.
 */
export async function syncProjectAccess(): Promise<number> {
  if (!db || !rootRef) return 0
  const [users, projects, numbers] = await Promise.all([
    getDocs(collection(rootRef, 'users')),
    getDocs(collection(rootRef, CATEGORY.projects)),
    getDocs(collection(rootRef, CATEGORY.projectNumbers)),
  ])
  const members = new Map<string, Set<string>>()
  for (const u of users.docs) {
    const { uid, assignedProjects } = u.data()
    if (typeof uid !== 'string' || !uid || !Array.isArray(assignedProjects)) continue
    for (const pid of assignedProjects.map(String)) members.set(pid, (members.get(pid) ?? new Set()).add(uid))
  }
  const indexed = new Set(numbers.docs.map((d) => d.id))
  const writes: ((b: WriteBatch) => void)[] = []
  for (const p of projects.docs) {
    const want = [...(members.get(p.id) ?? [])].sort()
    const have = Array.isArray(p.data().members) ? p.data().members.map(String).sort() : []
    if (want.join() !== have.join()) writes.push((b) => b.update(p.ref, { members: want }))
    const no = p.data().projectNo
    if (typeof no === 'string' && no.trim() && !indexed.has(projectNoKey(no))) {
      indexed.add(projectNoKey(no))
      writes.push((b) => b.set(doc(rootRef!, CATEGORY.projectNumbers, projectNoKey(no)), { projectId: p.id, projectNo: no, updatedAt: Date.now() }))
    }
  }
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(db)
    writes.slice(i, i + 450).forEach((w) => w(batch))
    await batch.commit()
  }
  return writes.length
}

// ---------------------------------------------------------------- localStorage

interface LocalDb {
  projects: Record<string, Project>
  elements: Record<string, Record<string, FormElement>>
  panels?: Record<string, Record<string, FormPanel>>
  settings?: Record<string, unknown>
}

const KEY = 'formwork-studio:v1'

function localRepo(): Repo {
  const listeners = new Set<() => void>()
  const load = (): LocalDb => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as LocalDb
    } catch {
      /* storage unavailable or corrupt → start empty */
    }
    return { projects: {}, elements: {} }
  }
  const save = (d: LocalDb) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(d))
    } catch {
      /* quota / private mode — keep in memory only */
    }
    listeners.forEach((l) => l())
  }
  const subscribe = (fn: () => void): Unsubscribe => {
    listeners.add(fn)
    fn()
    const onStorage = (e: StorageEvent) => e.key === KEY && fn()
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(fn)
      window.removeEventListener('storage', onStorage)
    }
  }
  const touch = (d: LocalDb, pid: string, delta = 0) => {
    const p = d.projects[pid]
    if (p) d.projects[pid] = { ...p, updatedAt: Date.now(), elementCount: Math.max(0, p.elementCount + delta) }
  }
  return {
    watchProjects(_scope, cb) {
      return subscribe(() => cb(Object.values(load().projects).sort(byUpdated)))
    },
    watchProject(id, cb) {
      return subscribe(() => cb(load().projects[id] ?? null))
    },
    async createProject(uid, data) {
      const d = load()
      if (Object.values(d.projects).some((p) => projectNoKey(p.projectNo) === projectNoKey(data.projectNo))) throw new DuplicateProjectNoError(data.projectNo)
      const id = newId()
      const now = Date.now()
      d.projects[id] = { ...data, id, ownerUid: uid, members: [uid], elementCount: 0, createdAt: now, updatedAt: now, version: 1 }
      save(d)
      return id
    },
    async updateProject(id, data, baseVersion, force = false) {
      const d = load()
      const p = d.projects[id]
      if (!p) throw new Error('ไม่พบโครงการ')
      if (!force && baseVersion !== undefined && versionOf(p) !== baseVersion) throw new ConflictError()
      const no = data.projectNo
      if (no !== undefined && Object.values(d.projects).some((o) => o.id !== id && projectNoKey(o.projectNo) === projectNoKey(no))) throw new DuplicateProjectNoError(no)
      const version = versionOf(p) + 1
      d.projects[id] = { ...p, ...data, updatedAt: Date.now(), version }
      save(d)
      return version
    },
    async deleteProject(id) {
      const d = load()
      delete d.projects[id]
      delete d.elements[id]
      delete d.panels?.[id]
      save(d)
    },
    watchElements(projectId, cb) {
      return subscribe(() => cb(Object.values(load().elements[projectId] ?? {}).sort(byCode)))
    },
    async createElement(projectId, data) {
      const d = load()
      const id = newId()
      const now = Date.now()
      d.elements[projectId] ??= {}
      d.elements[projectId][id] = { ...data, id, projectId, createdAt: now, updatedAt: now, version: 1 } as FormElement
      touch(d, projectId, 1)
      save(d)
      return id
    },
    async updateElement(projectId, id, data, baseVersion, force = false) {
      const d = load()
      const el = d.elements[projectId]?.[id]
      if (!el) throw new Error('ไม่พบชิ้นส่วน')
      if (!force && baseVersion !== undefined && versionOf(el) !== baseVersion) throw new ConflictError()
      const version = versionOf(el) + 1
      d.elements[projectId][id] = { ...el, ...data, updatedAt: Date.now(), version } as FormElement
      touch(d, projectId)
      save(d)
      return version
    },
    async deleteElement(projectId, id) {
      const d = load()
      delete d.elements[projectId]?.[id]
      touch(d, projectId, -1)
      save(d)
    },
    watchPanels(projectId, cb) {
      return subscribe(() => cb(Object.values(load().panels?.[projectId] ?? {}).sort(byCode)))
    },
    async createPanel(projectId, data) {
      const d = load()
      const id = newId()
      const now = Date.now()
      d.panels ??= {}
      d.panels[projectId] ??= {}
      d.panels[projectId][id] = { ...data, id, projectId, createdAt: now, updatedAt: now, version: 1 }
      save(d)
      return id
    },
    async updatePanel(projectId, id, data, baseVersion, force = false) {
      const d = load()
      const p = d.panels?.[projectId]?.[id]
      if (!p) throw new Error('ไม่พบแผง')
      if (!force && baseVersion !== undefined && versionOf(p) !== baseVersion) throw new ConflictError()
      const version = versionOf(p) + 1
      d.panels![projectId][id] = { ...p, ...data, updatedAt: Date.now(), version }
      save(d)
      return version
    },
    async deletePanel(projectId, id) {
      const d = load()
      delete d.panels?.[projectId]?.[id]
      save(d)
    },
    async getSetting<T>(key: string) {
      return load().settings?.[key] as T | undefined
    },
    async setSetting(key, value) {
      const d = load()
      d.settings = { ...d.settings, [key]: value }
      save(d)
    },
  }
}

export const repo: Repo = firebaseEnabled ? firestoreRepo() : localRepo()
