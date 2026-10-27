import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { authErrorMessage, loginWithGoogle, registerWithEmail } from '@/auth/authService'
import { FullScreenSpinner } from '@/auth/ProtectedRoute'
import { Button, Field } from '@/components/ui'
import { AuthCard, GoogleButton } from './LoginPage'

export function RegisterPage() {
  const { loading, firebaseUser, userProfile, localMode, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({ firstName: '', lastName: '', position: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (userProfile?.status === 'pending') navigate('/pending', { replace: true })
    else if (userProfile?.status === 'approved') navigate('/dashboard', { replace: true })
    else if (userProfile?.status === 'rejected') navigate('/login', { replace: true })
  }, [userProfile, navigate])

  if (loading) return <FullScreenSpinner />
  if (localMode) return <Navigate to="/" replace />
  if (firebaseUser) return <FullScreenSpinner label="กำลังโหลดข้อมูลผู้ใช้" />

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(undefined)
    try {
      await fn()
      await refreshProfile()
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="สร้างบัญชี" subtitle="บัญชีใหม่ต้องรอผู้ดูแลระบบอนุมัติก่อนใช้งาน (ผู้ลงทะเบียนคนแรกเป็น Master Admin)">
      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (f.password !== f.confirm) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
          run(() => registerWithEmail(f.email, f.password, f.firstName, f.lastName, f.position))
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อ">
            <input className="input" value={f.firstName} onChange={set('firstName')} required autoComplete="given-name" />
          </Field>
          <Field label="นามสกุล">
            <input className="input" value={f.lastName} onChange={set('lastName')} required autoComplete="family-name" />
          </Field>
        </div>
        <Field label="ตำแหน่ง">
          <input className="input" value={f.position} onChange={set('position')} autoComplete="organization-title" />
        </Field>
        <Field label="อีเมล">
          <input className="input" type="email" value={f.email} onChange={set('email')} required autoComplete="email" />
        </Field>
        <Field label="รหัสผ่าน">
          <input className="input" type="password" value={f.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
        </Field>
        <Field label="ยืนยันรหัสผ่าน">
          <input className="input" type="password" value={f.confirm} onChange={set('confirm')} required minLength={6} autoComplete="new-password" />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-fail">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy} className="mt-1 h-11">
          สร้างบัญชี
        </Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        หรือ
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton disabled={busy} onClick={() => run(loginWithGoogle)} />
      <p className="mt-5 text-center text-sm text-muted">
        มีบัญชีแล้ว?{' '}
        <Link to="/login" className="font-medium text-sel hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthCard>
  )
}
