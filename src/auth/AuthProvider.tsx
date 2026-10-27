// AuthContext: Firebase user + Firestore profile, kept live with onAuthStateChanged and a profile snapshot.
// `loading` stays true until Firebase has read the stored token, so no page renders the login form before that.
import { onAuthStateChanged, type User } from 'firebase/auth'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { auth, firebaseEnabled } from '@/lib/firebase'
import { createUserProfile, fetchProfile, fullName, logout, sessionExpired, type UserProfile, watchProfile } from './authService'
import { type Permission, permissionsOf } from './roles'

/** Minimal user shape used across the app (report "designed by", project creator, …). */
export interface AppUser {
  uid: string
  displayName: string
  email?: string
  photoURL?: string
}

interface AuthCtx {
  /** true while Firebase is still checking the stored session */
  loading: boolean
  firebaseUser: User | null
  userProfile: UserProfile | null
  /** profile could not be read (e.g. Firestore rules not deployed) */
  profileError?: string
  user: AppUser | null
  localMode: boolean
  /** re-reads the profile — call after login/register, since onAuthStateChanged can fire before the profile exists */
  refreshProfile(): Promise<UserProfile | null>
  can(p: Permission): boolean
  canAccessProject(projectId: string | undefined): boolean
  signOut(): Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

const LOCAL_PROFILE: UserProfile = {
  uid: 'local',
  email: 'local@device',
  firstName: 'ผู้ใช้ในเครื่อง',
  lastName: '',
  position: '',
  department: '',
  role: 'MasterAdmin',
  roles: ['MasterAdmin'],
  status: 'approved',
  assignedProjects: [],
  createdAt: null,
  isFirstUser: true,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(firebaseEnabled)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(firebaseEnabled ? null : LOCAL_PROFILE)
  const [profileError, setProfileError] = useState<string>()
  const current = useRef<User | null>(null)

  useEffect(() => {
    if (!auth) return
    let stopProfile: (() => void) | undefined
    let createTimer: ReturnType<typeof setTimeout> | undefined
    const stopAuth = onAuthStateChanged(auth, (u) => {
      stopProfile?.()
      clearTimeout(createTimer)
      setProfileError(undefined)
      // accounts without an email (old anonymous Guest sessions) and expired sessions are signed out
      if (u && (!u.email || sessionExpired())) {
        logout().catch(() => {})
        return
      }
      current.current = u
      setFirebaseUser(u)
      setUserProfile(null)
      setLoading(false)
      if (!u?.email) return
      const email = u.email
      stopProfile = watchProfile(email, (p) => {
        if (p) {
          clearTimeout(createTimer)
          setUserProfile(p)
          return
        }
        // signed in but no profile yet: login/register is creating it; if nothing appears, create it here (idempotent)
        clearTimeout(createTimer)
        createTimer = setTimeout(() => {
          createUserProfile(u)
            .then(setUserProfile)
            .catch((e) => setProfileError((e as Error).message))
        }, 3000)
      })
      // a first read that fails (rules / network) must not leave the app on a spinner forever
      fetchProfile(email).catch((e) => setProfileError((e as Error).message))
    })
    return () => {
      stopAuth()
      stopProfile?.()
      clearTimeout(createTimer)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const u = current.current
    if (!u?.email) return null
    try {
      const p = await fetchProfile(u.email)
      if (p) setUserProfile(p)
      return p
    } catch {
      return null // silent: the snapshot listener keeps trying
    }
  }, [])

  const value = useMemo<AuthCtx>(() => {
    const perms = permissionsOf(userProfile?.status === 'approved' ? userProfile.roles : [])
    const can = (p: Permission) => perms.has(p)
    return {
      loading,
      firebaseUser,
      userProfile,
      profileError,
      localMode: !firebaseEnabled,
      user: userProfile
        ? { uid: firebaseUser?.uid ?? userProfile.uid, displayName: fullName(userProfile), email: userProfile.email, photoURL: userProfile.photoURL ?? firebaseUser?.photoURL ?? undefined }
        : null,
      refreshProfile,
      can,
      canAccessProject: (id) => !!id && (can('project.viewAll') || !!userProfile?.assignedProjects.includes(id)),
      signOut: logout,
    }
  }, [loading, firebaseUser, userProfile, profileError, refreshProfile])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}
