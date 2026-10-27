import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { Permission, UserRole } from './roles'

export function FullScreenSpinner({ label = 'กำลังตรวจสอบการเข้าสู่ระบบ' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted" role="status">
      <Loader2 className="animate-spin" size={28} aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  )
}

function ProfileError({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md rounded-2xl bg-white p-6 text-sm shadow-lg ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">โหลดข้อมูลผู้ใช้ไม่สำเร็จ</h1>
        <p className="mt-2 text-slate-600">{message}</p>
        <p className="mt-2 text-xs text-muted">ถ้าเพิ่งตั้งค่าระบบ ให้ตรวจว่า deploy Firestore rules แล้ว</p>
        <button type="button" onClick={onSignOut} className="mt-4 h-10 rounded-lg border border-slate-300 px-4 font-medium hover:bg-slate-50">
          ออกจากระบบ
        </button>
      </div>
    </div>
  )
}

/**
 * Route guard, checked in this order: auth loading → signed in → profile loaded → pending → rejected →
 * roles → permission → project assignment (for routes with :projectId).
 */
export function ProtectedRoute({
  children,
  requireApproved = true,
  requireRoles,
  requirePermission,
}: {
  children: ReactNode
  requireApproved?: boolean
  requireRoles?: UserRole[]
  requirePermission?: Permission
}) {
  const { loading, firebaseUser, userProfile, profileError, localMode, can, canAccessProject, signOut } = useAuth()
  const location = useLocation()
  const { projectId } = useParams()

  if (loading) return <FullScreenSpinner />
  if (!localMode && !firebaseUser) return <Navigate to="/login" replace state={{ from: location }} />
  if (!userProfile) return profileError ? <ProfileError message={profileError} onSignOut={signOut} /> : <FullScreenSpinner label="กำลังโหลดข้อมูลผู้ใช้" />
  if (requireApproved && userProfile.status === 'pending') return <Navigate to="/pending" replace />
  if (requireApproved && userProfile.status === 'rejected') return <Navigate to="/login" replace />
  if (requireRoles && !requireRoles.some((r) => userProfile.roles.includes(r))) return <Navigate to="/" replace />
  if (requirePermission && !can(requirePermission)) return <Navigate to="/" replace />
  if (projectId && !canAccessProject(projectId)) return <Navigate to="/" replace />
  return <>{children}</>
}
