// Authentication service: login / register / logout, user profiles and the first-user (MasterAdmin) rule.
// Profiles: RC-FormWork-Design-Web-App/root/users/{email}   App meta: …/root/appMeta/config   Logs: …/root/activityLogs
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { ConflictError } from '@/data/conflict'
import { auth, db, rootRef } from '@/lib/firebase'
import { isRole, sortRoles, type UserRole } from './roles'

export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  position: string
  department: string
  /** highest of `roles` (kept for a single-role view) */
  role: UserRole
  /** every role the user holds — permissions are the union of all of them; assigned by MasterAdmin */
  roles: UserRole[]
  status: UserStatus
  assignedProjects: string[]
  createdAt: Timestamp | null
  updatedAt?: Timestamp | null
  photoURL?: string
  isFirstUser: boolean
  /** bumped on every change; used to detect concurrent edits */
  version?: number
}

export interface AppMetaConfig {
  firstUserRegistered: boolean
  totalUsers: number
  createdAt: Timestamp | null
}

export type ActivityAction = 'REGISTER' | 'LOGIN' | 'LOGOUT' | 'PROFILE_UPDATE' | 'USER_UPDATE'

const users = () => collection(rootRef!, 'users')
const userRef = (email: string) => doc(users(), email.trim().toLowerCase())
const configRef = () => doc(rootRef!, 'appMeta', 'config')

// ---------------------------------------------------------------- session expiry (persistent login, 30 days)

const SESSION_KEY = 'formwork-studio:session-expiry'
const SESSION_DAYS = 30

/** Call right after a successful sign-in, before any other await. */
export function setSessionExpiry() {
  try {
    localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_DAYS * 86_400_000))
  } catch {
    /* storage unavailable — session lives as long as Firebase keeps it */
  }
}

export function sessionExpired(): boolean {
  try {
    const v = Number(localStorage.getItem(SESSION_KEY))
    if (!v) {
      setSessionExpiry() // signed in before expiry tracking existed
      return false
    }
    return Date.now() > v
  } catch {
    return false
  }
}

function clearSessionExpiry() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- profiles

export function normalizeProfile(data: Record<string, unknown>): UserProfile {
  const raw = Array.isArray(data.roles) ? data.roles : [data.role]
  const roles = sortRoles(raw.filter(isRole))
  const finalRoles: UserRole[] = roles.length ? roles : ['Staff']
  return {
    uid: String(data.uid ?? ''),
    email: String(data.email ?? ''),
    firstName: String(data.firstName ?? ''),
    lastName: String(data.lastName ?? ''),
    position: String(data.position ?? ''),
    department: String(data.department ?? ''),
    role: finalRoles[0],
    roles: finalRoles,
    status: data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
    assignedProjects: Array.isArray(data.assignedProjects) ? data.assignedProjects.map(String) : [],
    createdAt: (data.createdAt as Timestamp) ?? null,
    updatedAt: (data.updatedAt as Timestamp) ?? null,
    photoURL: typeof data.photoURL === 'string' && data.photoURL ? data.photoURL : undefined,
    isFirstUser: data.isFirstUser === true,
    version: typeof data.version === 'number' ? data.version : 0,
  }
}

export const fullName = (p: Pick<UserProfile, 'firstName' | 'lastName' | 'email'> | null | undefined) =>
  p ? `${p.firstName} ${p.lastName}`.trim() || p.email : ''

export async function fetchProfile(email: string): Promise<UserProfile | null> {
  const d = await getDoc(userRef(email))
  return d.exists() ? normalizeProfile(d.data()) : null
}

export function watchProfile(email: string, cb: (p: UserProfile | null) => void): () => void {
  return onSnapshot(
    userRef(email),
    (d) => cb(d.exists() ? normalizeProfile(d.data()) : null),
    () => {
      /* permission / network errors are handled by the next refresh */
    },
  )
}

function splitName(displayName: string | null | undefined): [string, string] {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

/**
 * Creates the profile if it does not exist yet. A transaction on appMeta/config makes exactly one user the first one:
 * that user becomes MasterAdmin + approved, everyone after is Staff + pending.
 */
export async function createUserProfile(user: User, extra: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'position'>> = {}): Promise<UserProfile> {
  if (!user.email) throw new Error('บัญชีนี้ไม่มีอีเมล')
  const ref = userRef(user.email)
  const [gFirst, gLast] = splitName(user.displayName)
  const created = await runTransaction(db!, async (tx) => {
    const existing = await tx.get(ref)
    if (existing.exists()) return { profile: normalizeProfile(existing.data()), isNew: false }
    const cfg = await tx.get(configRef())
    const isFirst = !cfg.exists() || cfg.data().firstUserRegistered !== true
    const roles: UserRole[] = isFirst ? ['MasterAdmin'] : ['Staff']
    const data = {
      uid: user.uid,
      email: user.email!.toLowerCase(),
      firstName: extra.firstName?.trim() || gFirst,
      lastName: extra.lastName?.trim() || gLast,
      position: extra.position?.trim() ?? '',
      department: '',
      role: roles[0],
      roles,
      status: isFirst ? 'approved' : 'pending',
      assignedProjects: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      photoURL: user.photoURL ?? '',
      isFirstUser: isFirst,
      version: 1,
    }
    tx.set(ref, data)
    if (cfg.exists()) tx.update(configRef(), { firstUserRegistered: true, totalUsers: increment(1) })
    else tx.set(configRef(), { firstUserRegistered: true, totalUsers: 1, createdAt: serverTimestamp() })
    return { profile: normalizeProfile({ ...data, createdAt: null, updatedAt: null }), isNew: true }
  })
  if (created.isNew) logActivity('REGISTER', user, { firstUser: created.profile.isFirstUser })
  return created.profile
}

/** Existing profile, created on first sign-in if missing; keeps uid and Google photo current. */
async function ensureProfile(user: User): Promise<UserProfile> {
  const p = await fetchProfile(user.email!).catch(() => null)
  if (!p) return createUserProfile(user)
  const patch: Record<string, unknown> = {}
  if (p.uid !== user.uid) patch.uid = user.uid
  if (user.photoURL && p.photoURL !== user.photoURL) patch.photoURL = user.photoURL
  if (Object.keys(patch).length) updateDoc(userRef(p.email), patch).catch(() => {})
  return { ...p, ...patch }
}

// ---------------------------------------------------------------- activity log (never blocks auth)

export function logActivity(action: ActivityAction, user: Pick<User, 'uid' | 'email'> | null, detail: Record<string, unknown> = {}) {
  if (!rootRef) return
  addDoc(collection(rootRef, 'activityLogs'), {
    action,
    uid: user?.uid ?? '',
    email: user?.email ?? '',
    detail,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    at: serverTimestamp(),
  }).catch(() => {})
}

// ---------------------------------------------------------------- auth flows

function requireFirebase() {
  if (!auth || !db || !rootRef) throw new Error('ยังไม่ได้ตั้งค่า Firebase')
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  requireFirebase()
  await setPersistence(auth!, browserLocalPersistence)
  const cred = await signInWithEmailAndPassword(auth!, email.trim(), password)
  setSessionExpiry()
  const profile = await ensureProfile(cred.user)
  logActivity('LOGIN', cred.user, { method: 'email' })
  return profile
}

export async function loginWithGoogle(): Promise<UserProfile> {
  requireFirebase()
  await setPersistence(auth!, browserLocalPersistence)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await signInWithPopup(auth!, provider)
  setSessionExpiry()
  const profile = await ensureProfile(cred.user)
  logActivity('LOGIN', cred.user, { method: 'google' })
  return profile
}

export async function registerWithEmail(email: string, password: string, firstName: string, lastName: string, position: string): Promise<UserProfile> {
  requireFirebase()
  await setPersistence(auth!, browserLocalPersistence)
  const cred = await createUserWithEmailAndPassword(auth!, email.trim(), password)
  setSessionExpiry()
  updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() }).catch(() => {})
  return createUserProfile(cred.user, { firstName, lastName, position })
}

export async function logout() {
  if (!auth) return
  logActivity('LOGOUT', auth.currentUser)
  clearSessionExpiry()
  await signOut(auth)
}

// ---------------------------------------------------------------- profile edits

/** Own profile: name, position, department only (roles / status / projects are set by MasterAdmin). */
export async function updateMyProfile(email: string, patch: Pick<UserProfile, 'firstName' | 'lastName' | 'position' | 'department'>) {
  await updateDoc(userRef(email), {
    firstName: patch.firstName.trim(),
    lastName: patch.lastName.trim(),
    position: patch.position.trim(),
    department: patch.department,
    updatedAt: serverTimestamp(),
    version: increment(1),
  })
  if (auth?.currentUser) {
    updateProfile(auth.currentUser, { displayName: `${patch.firstName} ${patch.lastName}`.trim() }).catch(() => {})
    logActivity('PROFILE_UPDATE', auth.currentUser)
  }
}

// ---------------------------------------------------------------- user management (MasterAdmin)

export function watchUsers(cb: (u: UserProfile[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    users(),
    (snap) => cb(snap.docs.map((d) => normalizeProfile(d.data())).sort((a, b) => (b.createdAt?.toMillis?.() ?? Infinity) - (a.createdAt?.toMillis?.() ?? Infinity))),
    (e) => onError?.(e),
  )
}

export type AdminPatch = Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'position' | 'department' | 'roles' | 'status' | 'assignedProjects'>>

/** Saves only if nobody else changed the user since `baseVersion` (unless `force`). */
export async function updateUserAdmin(email: string, patch: AdminPatch, baseVersion: number | undefined, force = false) {
  const ref = userRef(email)
  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() }
  if (patch.roles) {
    const roles = sortRoles(patch.roles)
    data.roles = roles.length ? roles : ['Staff']
    data.role = (data.roles as UserRole[])[0]
  }
  await runTransaction(db!, async (tx) => {
    const cur = await tx.get(ref)
    if (!cur.exists()) throw new Error('ไม่พบผู้ใช้')
    const v = typeof cur.data().version === 'number' ? cur.data().version : 0
    if (!force && baseVersion !== undefined && v !== baseVersion) throw new ConflictError()
    tx.update(ref, { ...data, version: v + 1 })
  })
  logActivity('USER_UPDATE', auth?.currentUser ?? null, { target: email, fields: Object.keys(patch) })
}

/** Adds a project to a user's assignment list (e.g. the creator of a new project). */
export async function assignProject(email: string, projectId: string) {
  await updateDoc(userRef(email), { assignedProjects: arrayUnion(projectId), version: increment(1) })
}

/** Removes a deleted project from every user that had it. */
export async function unassignProjectEverywhere(projectId: string) {
  const snap = await getDocs(query(users(), where('assignedProjects', 'array-contains', projectId)))
  if (snap.empty) return
  const batch = writeBatch(db!)
  snap.docs.forEach((d) => batch.update(d.ref, { assignedProjects: arrayRemove(projectId), version: increment(1) }))
  await batch.commit()
}

/** Thai message for Firebase Auth errors. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/user-not-found': 'ไม่พบบัญชีผู้ใช้นี้',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/too-many-requests': 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่',
    'auth/email-already-in-use': 'อีเมลนี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบแทน',
    'auth/weak-password': 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร',
    'auth/popup-closed-by-user': 'ปิดหน้าต่าง Google ก่อนเข้าสู่ระบบเสร็จ',
    'auth/cancelled-popup-request': 'ปิดหน้าต่าง Google ก่อนเข้าสู่ระบบเสร็จ',
    'auth/popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่าง Google — อนุญาต Pop-up แล้วลองใหม่',
    'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authentication → Settings → Authorized domains)',
    'auth/operation-not-allowed': 'วิธีเข้าสู่ระบบนี้ยังไม่ได้เปิดใช้ใน Firebase Console',
    'auth/network-request-failed': 'เชื่อมต่อเครือข่ายไม่ได้',
    'permission-denied': 'ไม่มีสิทธิ์เข้าถึงฐานข้อมูล — ตรวจสอบ Firestore rules',
  }
  return map[code] ?? (e as Error).message
}
