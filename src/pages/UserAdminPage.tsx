// User management (MasterAdmin): approve / reject, roles (multi), department, and project assignment.
// Everything is live; an open editor keeps its unsaved changes when someone else saves the same user.
import clsx from 'clsx'
import { Check, Loader2, RotateCcw, Search, ShieldAlert, UserCheck, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { type AdminPatch, fullName, updateUserAdmin, type UserProfile, type UserStatus } from '@/auth/authService'
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES, type UserRole } from '@/auth/roles'
import { MultiSelect, SingleSelect } from '@/components/Dropdown'
import { Button, Field } from '@/components/ui'
import { Avatar, DEPARTMENT_OPTIONS, RoleChips, useUsers } from '@/components/UserBits'
import { isConflict } from '@/data/conflict'
import { useProjects } from '@/data/hooks'

const STATUS_LABEL: Record<UserStatus, string> = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' }
const STATUS_STYLE: Record<UserStatus, string> = {
  pending: 'bg-amber-50 text-warn ring-amber-200',
  approved: 'bg-green-50 text-ok ring-green-200',
  rejected: 'bg-red-50 text-fail ring-red-200',
}
const FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'pending', label: 'รออนุมัติ' },
  { id: 'approved', label: 'อนุมัติแล้ว' },
  { id: 'rejected', label: 'ไม่อนุมัติ' },
] as const

type Draft = Required<Pick<AdminPatch, 'firstName' | 'lastName' | 'position' | 'department' | 'roles' | 'status' | 'assignedProjects'>>
const toDraft = (u: UserProfile): Draft => ({
  firstName: u.firstName,
  lastName: u.lastName,
  position: u.position,
  department: u.department,
  roles: u.roles,
  status: u.status,
  assignedProjects: u.assignedProjects,
})
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b)

function StatusBadge({ status }: { status: UserStatus }) {
  return <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs ring-1', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
}

export function UserAdminPage() {
  const { userProfile: me, localMode } = useAuth()
  const { users, error } = useUsers(true)
  const { projects } = useProjects({ all: true })
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string>()
  const [quick, setQuick] = useState<string>()

  const counts = useMemo(() => {
    const c = { all: users?.length ?? 0, pending: 0, approved: 0, rejected: 0 }
    users?.forEach((u) => c[u.status]++)
    return c
  }, [users])
  const list = (users ?? []).filter((u) => (filter === 'all' || u.status === filter) && `${fullName(u)} ${u.email} ${u.position} ${u.department}`.toLowerCase().includes(q.toLowerCase()))
  const current = users?.find((u) => u.email === selected)
  const masterCount = users?.filter((u) => u.roles.includes('MasterAdmin') && u.status === 'approved').length ?? 0

  useEffect(() => {
    if (!selected && list.length) setSelected(list[0].email)
  }, [selected, list])

  const quickApprove = async (u: UserProfile) => {
    if (quick) return
    setQuick(u.email)
    try {
      await updateUserAdmin(u.email, { status: 'approved' }, u.version)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setQuick(undefined)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <p className="text-[13px] text-muted">Workspace / ผู้ใช้งาน</p>
          <h1 className="text-[28px] font-bold tracking-tight">จัดการผู้ใช้งาน</h1>
        </div>
        {counts.pending > 0 && (
          <button type="button" onClick={() => setFilter('pending')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-50 px-4 text-sm font-medium text-warn ring-1 ring-amber-200">
            <ShieldAlert size={16} /> มีผู้ขอเข้าใช้งานรออนุมัติ {counts.pending} คน
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-fail">โหลดรายชื่อผู้ใช้ไม่สำเร็จ: {error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="card flex flex-col overflow-hidden">
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={clsx('h-8 rounded-full px-3 text-sm', filter === f.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {f.label} ({counts[f.id]})
              </button>
            ))}
            <label className="relative ml-auto w-full sm:w-52">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input className="input h-8 w-full pl-8 text-sm" placeholder="ค้นหาชื่อ / อีเมล" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาผู้ใช้" />
            </label>
          </div>
          {users === undefined && !error ? (
            <div className="flex justify-center py-12 text-muted">
              <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
            </div>
          ) : list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">{localMode ? "Local mode — ไม่มีระบบผู้ใช้ (ตั้งค่า Firebase ใน .env)" : "ไม่พบผู้ใช้"}</p>
          ) : (
            <ul className="max-h-[calc(100dvh-260px)] divide-y divide-slate-100 overflow-auto">
              {list.map((u) => (
                <li key={u.email}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(u.email)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(u.email)}
                    className={clsx('flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50', selected === u.email && 'bg-blue-50/60')}
                  >
                    <Avatar name={fullName(u)} photoURL={u.photoURL} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {fullName(u)}
                        {u.email === me?.email && <span className="text-xs font-normal text-muted">(คุณ)</span>}
                      </p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                      <div className="mt-1">
                        <RoleChips roles={u.roles} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={u.status} />
                      {u.status === 'pending' && (
                        <button
                          type="button"
                          disabled={quick === u.email}
                          onClick={(e) => {
                            e.stopPropagation()
                            quickApprove(u)
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-ok px-2 text-xs font-medium text-white disabled:opacity-60"
                        >
                          {quick === u.email ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} อนุมัติ
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {current ? (
          <UserEditor key={current.email} user={current} isSelf={current.email === me?.email} lastMaster={masterCount <= 1 && current.roles.includes('MasterAdmin')} projects={projects ?? []} />
        ) : (
          <section className="card grid place-items-center p-10 text-sm text-muted">เลือกผู้ใช้ทางซ้ายเพื่อแก้ไข</section>
        )}
      </div>
    </div>
  )
}

function UserEditor({ user, isSelf, lastMaster, projects }: { user: UserProfile; isSelf: boolean; lastMaster: boolean; projects: { id: string; name: string; projectNo: string }[] }) {
  const [base, setBase] = useState(user)
  const [draft, setDraft] = useState<Draft>(() => toDraft(user))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'conflict'; text: string }>()
  const dirty = !same(draft, toDraft(base))
  const remoteChanged = (user.version ?? 0) !== (base.version ?? 0)

  // live: follow remote changes while there is nothing unsaved; otherwise keep the draft and say so
  useEffect(() => {
    if (!remoteChanged) return
    if (!dirty) {
      setBase(user)
      setDraft(toDraft(user))
    }
  }, [user, remoteChanged, dirty])

  const loadLatest = () => {
    setBase(user)
    setDraft(toDraft(user))
    setMsg(undefined)
  }

  const save = async (force = false) => {
    if (busy) return
    if (lastMaster && !draft.roles.includes('MasterAdmin')) return setMsg({ kind: 'err', text: 'ต้องมี Master Admin อย่างน้อย 1 คน' })
    setBusy(true)
    setMsg(undefined)
    try {
      await updateUserAdmin(user.email, draft, base.version, force)
      setBase({ ...user, ...draft, version: (force ? user.version ?? 0 : base.version ?? 0) + 1 })
      setMsg({ kind: 'ok', text: 'บันทึกแล้ว' })
    } catch (e) {
      if (isConflict(e)) setMsg({ kind: 'conflict', text: 'ผู้ใช้นี้ถูกแก้ไขโดยผู้อื่นระหว่างที่คุณแก้ไข — ข้อมูลที่คุณกรอกยังอยู่' })
      else setMsg({ kind: 'err', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const roleOptions = ROLES.map((r) => ({
    value: r,
    label: ROLE_LABEL[r],
    hint: ROLE_DESCRIPTION[r],
    disabled: r === 'MasterAdmin' && (isSelf || lastMaster) && draft.roles.includes('MasterAdmin'),
  }))
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.projectNo} · ${p.name}` }))
  const missing = draft.assignedProjects.filter((id) => !projects.some((p) => p.id === id))
  const set = (k: 'firstName' | 'lastName' | 'position') => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value })
  const isMasterDraft = draft.roles.includes('MasterAdmin')

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <Avatar name={fullName(user)} photoURL={user.photoURL} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{fullName(user)}</h2>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="text-xs text-muted">
            ลงทะเบียน {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString('th-TH') : '—'}
            {user.isFirstUser && ' · ผู้ใช้คนแรก'}
          </p>
        </div>
        <StatusBadge status={base.status} />
      </div>

      {remoteChanged && dirty && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn ring-1 ring-amber-200">
          มีผู้อื่นแก้ไขผู้ใช้นี้แล้ว — ข้อมูลที่คุณกรอกยังไม่หาย
          <button type="button" onClick={loadLatest} className="ml-auto inline-flex items-center gap-1 font-medium underline">
            <RotateCcw size={14} /> โหลดข้อมูลล่าสุด
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ชื่อ">
          <input className="input" value={draft.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="นามสกุล">
          <input className="input" value={draft.lastName} onChange={set('lastName')} />
        </Field>
        <Field label="ตำแหน่ง">
          <input className="input" value={draft.position} onChange={set('position')} />
        </Field>
        <Field label="แผนก">
          <SingleSelect label="แผนก" options={DEPARTMENT_OPTIONS} value={draft.department} onChange={(department) => setDraft({ ...draft, department })} placeholder="เลือกแผนก" />
        </Field>
      </div>

      <Field label="สิทธิ์ (เลือกได้หลาย Role — ได้สิทธิ์รวมทุก Role)">
        <MultiSelect label="สิทธิ์" options={roleOptions} value={draft.roles} onChange={(r) => setDraft({ ...draft, roles: r as UserRole[] })} placeholder="ผู้ใช้ทั่วไป (Staff)" />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">สถานะการใช้งาน</span>
        <div className="flex flex-wrap gap-2">
          {(['approved', 'pending', 'rejected'] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={isSelf && s !== 'approved'}
              onClick={() => setDraft({ ...draft, status: s })}
              className={clsx('inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm ring-1 disabled:opacity-40', draft.status === s ? STATUS_STYLE[s] + ' font-medium' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}
            >
              {s === 'approved' ? <UserCheck size={15} /> : s === 'rejected' ? <UserX size={15} /> : null}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <Field label={`โครงการที่มอบหมาย (${draft.assignedProjects.length})`} hint={isMasterDraft ? 'Master Admin เห็นทุกโครงการอยู่แล้ว' : 'ผู้ใช้จะเห็นเฉพาะโครงการที่เลือกที่นี่'}>
        <MultiSelect label="โครงการที่มอบหมาย" searchable options={projectOptions} value={draft.assignedProjects.filter((id) => !missing.includes(id))} onChange={(v) => setDraft({ ...draft, assignedProjects: v })} placeholder="ยังไม่ได้มอบหมายโครงการ" />
      </Field>
      {missing.length > 0 && <p className="-mt-2 text-xs text-muted">มี {missing.length} โครงการที่ถูกลบแล้ว จะถูกเอาออกเมื่อบันทึก</p>}

      {msg && (
        <div className={clsx('flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm', msg.kind === 'ok' ? 'bg-green-50 text-ok' : msg.kind === 'conflict' ? 'bg-amber-50 text-warn ring-1 ring-amber-200' : 'bg-red-50 text-fail')}>
          {msg.text}
          {msg.kind === 'conflict' && (
            <span className="ml-auto flex gap-3">
              <button type="button" className="font-medium underline" onClick={loadLatest}>
                โหลดข้อมูลล่าสุด
              </button>
              <button type="button" className="font-medium underline" onClick={() => save(true)}>
                บันทึกทับ
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button disabled={!dirty || busy} onClick={loadLatest}>
          ยกเลิกการแก้ไข
        </Button>
        <Button variant="primary" disabled={!dirty || busy} onClick={() => save()} className="min-w-28">
          {busy && <Loader2 size={16} className="animate-spin" />}
          บันทึก
        </Button>
      </div>
    </section>
  )
}
