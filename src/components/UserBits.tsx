// Small user widgets: avatar (Google photo or initials), role chips, own-profile dialog, live user list.
import clsx from 'clsx'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { fullName, updateMyProfile, type UserProfile, watchUsers } from '@/auth/authService'
import { DEPARTMENTS, ROLE_LABEL, type UserRole } from '@/auth/roles'
import { firebaseEnabled } from '@/lib/firebase'
import { SingleSelect } from './Dropdown'
import { Button, Field } from './ui'

export function initialsOf(name: string) {
  return (name || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Avatar({ name, photoURL, size = 36, className }: { name: string; photoURL?: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [photoURL])
  const style = { width: size, height: size }
  if (photoURL && !broken)
    return <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={style} className={clsx('shrink-0 rounded-full object-cover', className)} />
  return (
    <span style={{ ...style, fontSize: size * 0.38 }} className={clsx('flex shrink-0 items-center justify-center rounded-full bg-sel font-semibold text-white', className)} aria-hidden>
      {initialsOf(name)}
    </span>
  )
}

export function RoleChips({ roles, dark }: { roles: UserRole[]; dark?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span key={r} className={clsx('rounded-full px-2 py-0.5 text-[11px] leading-4', dark ? 'bg-navy-800 text-navy-300 ring-1 ring-navy-700' : r === 'MasterAdmin' ? 'bg-orange-50 text-brand' : 'bg-blue-50 text-sel')}>
          {ROLE_LABEL[r]}
        </span>
      ))}
    </span>
  )
}

/** Live list of every user (MasterAdmin views only). */
export function useUsers(enabled: boolean) {
  const [users, setUsers] = useState<UserProfile[] | undefined>(firebaseEnabled ? undefined : [])
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!enabled || !firebaseEnabled) return
    return watchUsers(setUsers, (e) => setError(e.message))
  }, [enabled])
  return { users, error }
}

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }))

/** Own profile: name, position, department. Roles / status / projects are shown read-only (set by MasterAdmin). */
export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userProfile, localMode } = useAuth()
  const [f, setF] = useState({ firstName: '', lastName: '', position: '', department: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)

  // load once per opening — later snapshots don't overwrite what the user is typing
  useEffect(() => {
    if (open && userProfile) {
      setF({ firstName: userProfile.firstName, lastName: userProfile.lastName, position: userProfile.position, department: userProfile.department })
      setError(undefined)
      setSaved(false)
    }
  }, [open])

  if (!open || !userProfile) return null
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col gap-4 overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault()
          if (busy) return
          setBusy(true)
          setError(undefined)
          try {
            await updateMyProfile(userProfile.email, f)
            setSaved(true)
            setTimeout(onClose, 600)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="profile-title" className="text-lg font-semibold">
            โปรไฟล์ของฉัน
          </h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={fullName(userProfile)} photoURL={userProfile.photoURL} size={56} />
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName(userProfile)}</p>
            <p className="truncate text-sm text-muted">{userProfile.email}</p>
            <div className="mt-1">
              <RoleChips roles={userProfile.roles} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อ">
            <input className="input" value={f.firstName} onChange={set('firstName')} required />
          </Field>
          <Field label="นามสกุล">
            <input className="input" value={f.lastName} onChange={set('lastName')} />
          </Field>
        </div>
        <Field label="ตำแหน่ง">
          <input className="input" value={f.position} onChange={set('position')} />
        </Field>
        <Field label="แผนก">
          <SingleSelect label="แผนก" options={DEPARTMENT_OPTIONS} value={f.department} onChange={(department) => setF({ ...f, department })} placeholder="เลือกแผนก" />
        </Field>
        <p className="text-xs text-muted">สิทธิ์และโครงการที่ได้รับมอบหมายกำหนดโดย Master Admin · โครงการ {userProfile.assignedProjects.length} รายการ</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-fail">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" variant="primary" disabled={busy || localMode}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {saved ? 'บันทึกแล้ว' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </div>
  )
}
