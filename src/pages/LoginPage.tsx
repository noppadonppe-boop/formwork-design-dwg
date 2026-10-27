import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { authErrorMessage, loginWithEmail, loginWithGoogle, logout } from '@/auth/authService'
import { FullScreenSpinner } from '@/auth/ProtectedRoute'
import { Logo } from '@/components/AppShell'
import { Button, Field } from '@/components/ui'

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="-mx-7 -mt-7 mb-6 rounded-t-2xl bg-navy-900 px-7 py-5">
          <Logo />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export function GoogleButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <Button className="h-11 w-full" disabled={disabled} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      ดำเนินการต่อด้วย Google
    </Button>
  )
}

export function LoginPage() {
  const { loading, firebaseUser, userProfile, profileError, localMode, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  // redirect as soon as the profile is known (it also arrives live from the snapshot listener)
  useEffect(() => {
    if (!userProfile) return
    if (userProfile.status === 'pending') navigate('/pending', { replace: true })
    else if (userProfile.status === 'approved') navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
  }, [userProfile, from, navigate])

  // 1) still reading the stored token → spinner, never the form (no login-page flash)
  if (loading) return <FullScreenSpinner />
  if (localMode) return <Navigate to="/" replace />
  // 2) signed in, profile on its way → spinner until the effect above redirects
  if (firebaseUser && !userProfile && !profileError) return <FullScreenSpinner label="กำลังโหลดข้อมูลผู้ใช้" />
  if (userProfile && userProfile.status !== 'rejected') return <FullScreenSpinner label="กำลังเข้าสู่ระบบ" />

  const rejected = userProfile?.status === 'rejected'

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(undefined)
    try {
      await fn()
      await refreshProfile() // onAuthStateChanged may have fired before a new profile was written
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  // 3) no session (or rejected) → the full login form
  return (
    <AuthCard title="เข้าสู่ระบบ" subtitle="ออกแบบแบบหล่อคอนกรีตตามหนังสือ Design Form Work">
      {rejected && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-fail">
          บัญชี {userProfile.email} ไม่ได้รับอนุมัติให้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ
          <button type="button" className="ml-1 font-medium underline" onClick={() => logout()}>
            ใช้บัญชีอื่น
          </button>
        </div>
      )}
      {profileError && !rejected && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-fail">โหลดข้อมูลผู้ใช้ไม่สำเร็จ: {profileError}</p>}
      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => loginWithEmail(email, password))
        }}
      >
        <Field label="อีเมล">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="รหัสผ่าน">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-fail">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy} className="mt-1 h-11">
          เข้าสู่ระบบ
        </Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        หรือ
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton disabled={busy} onClick={() => run(loginWithGoogle)} />
      <p className="mt-5 text-center text-sm text-muted">
        ยังไม่มีบัญชี?{' '}
        <Link to="/register" className="font-medium text-sel hover:underline">
          สร้างบัญชี
        </Link>
      </p>
    </AuthCard>
  )
}
