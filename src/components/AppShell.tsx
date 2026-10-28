import clsx from 'clsx'
import { BookOpen, FolderOpen, LogOut, Ruler, Sigma, UserCog, UserPen, Users } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { migrateLegacyData, syncProjectAccess } from '@/data/repo'
import { SidebarProjectNav } from './ProjectNav'
import { Avatar, ProfileDialog, RoleChips, useUsers } from './UserBits'

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* same mark as public/favicon.svg: a beam in its form, on a head over two braced shores */}
      <svg width={small ? 26 : 30} height={small ? 26 : 30} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E9722A" />
            <stop offset="1" stopColor="#B9470B" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#logo-g)" />
        <rect x="21" y="11" width="22" height="19" rx="1.5" fill="#FFE6D3" />
        <path d="M17 9v24h30V9" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 38.5h40" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M23 41v11.5M41 41v11.5" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M23.5 44.5l17 7" stroke="#fff" strokeOpacity=".75" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18.5 54.5h9M36.5 54.5h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col leading-tight">
        <strong className="text-[15px] text-white">FormWork Studio</strong>
        {!small && <span className="text-[11px] text-navy-400">Formwork design &amp; shop drawing</span>}
      </div>
    </div>
  )
}

const nav = [
  { to: '/', label: 'โครงการ', icon: FolderOpen, end: true },
  { to: '/library', label: 'คลังวัสดุ', icon: Ruler, perm: 'library' as const },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx('flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm', isActive ? 'bg-navy-800 font-medium text-white' : 'hover:bg-navy-800/60 hover:text-white')

let migrationChecked = false

export function AppShell({ children }: { children: ReactNode }) {
  const { user, userProfile, signOut, localMode, can } = useAuth()
  const isMaster = !!userProfile?.roles.includes('MasterAdmin') && userProfile.status === 'approved'
  const { users } = useUsers(isMaster && !localMode)
  const pending = users?.filter((u) => u.status === 'pending').length ?? 0
  const [menu, setMenu] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const name = user?.displayName ?? ''

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  // earlier flat layout (root/elements, root/uploads) → per-project sub-collections, then project `members` rebuilt
  // from the users' assignments (what firestore.rules check); never blocks loading
  useEffect(() => {
    if (!isMaster || localMode || migrationChecked) return
    migrationChecked = true
    migrateLegacyData()
      .then((n) => n && console.info(`moved ${n} legacy documents into projects/{id}/…`))
      .catch(() => {})
      .then(syncProjectAccess)
      .then((n) => n && console.info(`synced project access: ${n} documents updated`))
      .catch((e) => console.error('sync project access', e))
  }, [isMaster, localMode])

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-1 bg-navy-900 px-3.5 py-4 text-navy-300 lg:sticky lg:top-0 lg:h-dvh lg:w-60">
        <div className="flex items-center justify-between px-2 pb-4 lg:pb-4">
          <Logo />
        </div>
        {userProfile && (
          <div className="mb-3 hidden items-start gap-2.5 rounded-xl bg-navy-800/70 p-3 lg:flex">
            <Avatar name={name} photoURL={user?.photoURL} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white" title={name}>
                {name}
              </p>
              <p className="mb-1.5 truncate text-[11px] text-navy-400" title={userProfile.position || userProfile.email}>
                {[userProfile.position, userProfile.department].filter(Boolean).join(' · ') || userProfile.email}
              </p>
              <RoleChips roles={userProfile.roles} dark />
            </div>
          </div>
        )}
        <nav aria-label="หลัก" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav
            .filter((n) => !n.perm || can(n.perm))
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon size={18} aria-hidden />
                {label}
              </NavLink>
            ))}
          {isMaster && (
            <NavLink to="/admin" className={(s) => clsx(navClass(s), 'lg:hidden')}>
              <Users size={18} aria-hidden />
              จัดการผู้ใช้งาน
              {pending > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{pending}</span>}
            </NavLink>
          )}
        </nav>
        <SidebarProjectNav linkClass={navClass} />
        <NavLink to="/manual" className={(s) => clsx(navClass(s), 'lg:mt-1')}>
          <BookOpen size={18} aria-hidden />
          คู่มือการใช้งาน
        </NavLink>
        <NavLink to="/reference" className={navClass}>
          <Sigma size={18} aria-hidden />
          อ้างอิงการคำนวณ
        </NavLink>
        <div className="mt-auto hidden flex-col gap-2 lg:flex">
          {isMaster && (
            <NavLink to="/admin" className={navClass} title={pending ? `มีผู้ขอเข้าใช้งานรออนุมัติ ${pending} คน` : undefined}>
              <span className="relative">
                <Users size={18} aria-hidden />
                {pending > 0 && <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-brand" aria-hidden />}
              </span>
              จัดการผู้ใช้งาน
              {pending > 0 && (
                <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white" aria-label={`รออนุมัติ ${pending} คน`}>
                  {pending}
                </span>
              )}
            </NavLink>
          )}
          <Link to="/reference" className="rounded-xl bg-navy-800/70 p-3 text-xs leading-relaxed text-navy-400 hover:bg-navy-800" title="มาตรฐานและตารางสมการอ้างอิง">
            อ้างอิงการคำนวณ
            <br />
            <span className="text-white">ACI 347 · CEB · CIRA</span>
            <br />
            หนังสือ Design Form Work (จุฬาฯ)
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 sm:px-8">
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1',
              localMode ? 'bg-amber-50 text-warn ring-amber-200' : 'bg-green-50 text-ok ring-green-200',
            )}
            title={localMode ? 'ยังไม่ได้ตั้งค่า Firebase (.env) — ข้อมูลบันทึกในเบราว์เซอร์นี้เท่านั้น' : 'เชื่อมต่อ Firebase'}
          >
            <span className={clsx('size-1.5 rounded-full', localMode ? 'bg-amber-500' : 'bg-green-600')} />
            {localMode ? 'Local mode · บันทึกในเครื่อง' : 'Firebase · ซิงค์อัตโนมัติ'}
          </span>
          <div ref={menuRef} className="relative ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-slate-600 sm:inline">{name}</span>
            <button type="button" onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu} aria-label="เมนูผู้ใช้" className="rounded-full ring-offset-2 hover:ring-2 hover:ring-slate-200">
              <Avatar name={name} photoURL={user?.photoURL} />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-full z-[10010] mt-2 w-64 rounded-xl border border-line bg-white p-1.5 shadow-xl">
                <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5 pt-1.5">
                  <Avatar name={name} photoURL={user?.photoURL} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted">{userProfile?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  disabled={localMode}
                  onClick={() => {
                    setMenu(false)
                    setProfileOpen(true)
                  }}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <UserPen size={16} aria-hidden /> อัปเดตโปรไฟล์
                </button>
                {isMaster && (
                  <NavLink to="/admin" role="menuitem" onClick={() => setMenu(false)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50">
                    <UserCog size={16} aria-hidden /> จัดการผู้ใช้งาน
                  </NavLink>
                )}
                {!localMode && (
                  <button type="button" role="menuitem" onClick={() => signOut()} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fail hover:bg-red-50">
                    <LogOut size={16} aria-hidden /> ออกจากระบบ
                  </button>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
