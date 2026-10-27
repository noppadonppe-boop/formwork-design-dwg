import { Clock } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { fullName } from '@/auth/authService'
import { Button } from '@/components/ui'
import { AuthCard } from './LoginPage'

/** Signed-in users waiting for approval. The profile is live, so approval moves them on without a refresh. */
export function PendingApprovalPage() {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (userProfile?.status === 'approved') navigate('/dashboard', { replace: true })
    if (userProfile?.status === 'rejected') navigate('/login', { replace: true })
  }, [userProfile, navigate])

  return (
    <AuthCard title="รอการอนุมัติ">
      <div className="mt-4 flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-warn">
          <Clock size={24} aria-hidden />
        </span>
        <p className="text-sm text-slate-600">
          บัญชี <strong>{fullName(userProfile)}</strong>
          <br />
          <span className="text-muted">{userProfile?.email}</span>
          <br />
          ลงทะเบียนเรียบร้อยแล้ว กำลังรอ Master Admin อนุมัติและกำหนดสิทธิ์
        </p>
        <p className="text-xs text-muted">หน้านี้จะเปลี่ยนเองเมื่อได้รับอนุมัติ ไม่ต้องรีเฟรช</p>
        <Button className="mt-2 h-10 w-full" onClick={() => signOut()}>
          ออกจากระบบ
        </Button>
      </div>
    </AuthCard>
  )
}
