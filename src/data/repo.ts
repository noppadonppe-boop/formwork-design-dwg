// Data access. Firestore when configured, otherwise browser localStorage ("Local mode").
import {
  collection,
  deleteDoc,
  doc,
  type DocumentReference,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  runTransaction,
  setDoc,
  type Transaction,
  writeBatch,
} from 'firebase/firestore'
import { unassignProjectEverywhere } from '@/auth/authService'
import { CATEGORY, db, firebaseEnabled, rootRef } from '@/lib/firebase'
import { ConflictError } from './conflict'
import { deleteFile, type UploadedFile } from './files'
import type { ElementData, FormElement, Project, ProjectData } from './types'

export type Unsubscribe = () => void

export interface Repo {
  /** every project — callers filter by the user's assignments (see useProjects) */
  watchProjects(cb: (p: Project[]) => void, onError?: (e: Error) => void): Unsubscribe
  watchProject(id: string, cb: (p: Project | null) => void): Unsubscribe
  createProject(uid: string, data: ProjectData): Promise<string>
  /** `baseVersion`: the version the edit started from — throws ConflictError if someone saved since (unless `force`) */
  updateProject(id: string, data: Partial<ProjectData>, baseVersion?: number, force?: boolean): Promise<number>
  deleteProject(id: string): Promise<void>
  watchElements(projectId: string, cb: (e: FormElement[]) => void): Unsubscribe
  createElement(projectId: string, data: ElementData): Promise<string>
  updateElement(projectId: string, id: string, data: Partial<ElementData>, baseVersion?: number, force?: boolean): Promise<number>
  deleteElement(projectId: string, id: string): Promise<void>
  /** per-menu settings shared by all users (e.g. optimizer prices) */
  getSetting<T>(key: string): Promise<T | undefined>
  setSetting<T>(key: string, value: T): Promise<void>
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 20)
const byUpdated = <T extends { updatedAt: number }>(a: T, b: T) => b.updatedAt - a.updatedAt
const byCode = (a: FormElement, b: FormElement) => a.code.localeCompare(b.code, undefined, { numeric: true })
export const versionOf = (d: object | null | undefined) => {
  const v = (d as { version?: unknown } | null | undefined)?.version
  return typeof v === 'number' ? v : 0
}

// ---------------------------------------------------------------- Firestore
// RC-FormWork-Design-Web-App/root/users/{email}                    — ผู้ใช้ (src/auth/authService.ts)
// RC-FormWork-Design-Web-App/root/projects/{pid}                   — โครงการ (same level as users)
// RC-FormWork-Design-Web-App/root/projects/{pid}/elements/{eid}    — ชิ้นส่วนของโครงการ
// RC-FormWork-Design-Web-App/root/projects/{pid}/uploads/{fid}     — ไฟล์ของโครงการ (src/data/files.ts)
// RC-FormWork-Design-Web-App/root/settings/{key}                   — ค่าตั้งของแต่ละเมนู
// `version` on projects and elements is bumped by every content save, so concurrent edits are detected.

function firestoreRepo(): Repo {
  const fs = db!
  const projects = collection(rootRef!, CATEGORY.projects)
  const elements = (pid: string) => collection(projects, pid, CATEGORY.elements)
  const settings = collection(rootRef!, CATEGORY.settings)
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
    watchProjects(cb, onError) {
      return onSnapshot(
        projects,
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
    async createProject(uid, data) {
      const id = newId()
      const now = Date.now()
      const p: Omit<Project, 'id'> = { ...data, ownerUid: uid, members: [uid], elementCount: 0, createdAt: now, updatedAt: now, version: 1 }
      await setDoc(doc(projects, id), p)
      return id
    },
    updateProject(id, data, baseVersion, force = false) {
      return versioned(doc(projects, id), data, baseVersion, force)
    },
    async deleteProject(id) {
      // client-side cascade; batches of ≤ 500 writes
      const snap = await getDocs(elements(id))
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(fs)
        snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
      // project files: Storage objects + their records
      const files = await getDocs(collection(projects, id, CATEGORY.uploads))
      await Promise.all(files.docs.map((d) => deleteFile(d.data() as UploadedFile).catch((e) => console.error('delete file', e))))
      await unassignProjectEverywhere(id).catch((e) => console.error('unassign project', e))
      await deleteDoc(doc(projects, id))
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

// ---------------------------------------------------------------- localStorage

interface LocalDb {
  projects: Record<string, Project>
  elements: Record<string, Record<string, FormElement>>
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
    watchProjects(cb) {
      return subscribe(() => cb(Object.values(load().projects).sort(byUpdated)))
    },
    watchProject(id, cb) {
      return subscribe(() => cb(load().projects[id] ?? null))
    },
    async createProject(uid, data) {
      const d = load()
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
      const version = versionOf(p) + 1
      d.projects[id] = { ...p, ...data, updatedAt: Date.now(), version }
      save(d)
      return version
    },
    async deleteProject(id) {
      const d = load()
      delete d.projects[id]
      delete d.elements[id]
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
