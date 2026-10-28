// Project navigation (as in the UX/UI design): a tab bar on every page inside a project, and the
// "current project" module list in the sidebar, which falls back to the last project opened.
import clsx from 'clsx'
import { Box, ClipboardList, DraftingCompass, FileInput, FileText, FolderKanban, LayoutGrid, type LucideIcon, SlidersHorizontal } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import type { Permission } from '@/auth/roles'
import { useElements, useProject } from '@/data/hooks'

const LAST_KEY = 'formwork-studio:last-project'
const TAB_KEY = 'formwork-studio:element-tab'

export function rememberProject(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    /* private mode */
  }
}

export function lastProjectId(): string | undefined {
  try {
    return localStorage.getItem(LAST_KEY) ?? undefined
  } catch {
    return undefined
  }
}

interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  to: string
  /** report and shop drawing pages open in a new tab (print layouts without the app shell) */
  newTab?: boolean
  perm?: Permission
  /** path prefix that marks the item active */
  match: (path: string) => boolean
  onClick?: () => void
}

/** Module links of one project; `elementId` scopes 3D / report / shop drawing to that element. */
function projectItems(pid: string, elementId: string | undefined, firstElementId: string | undefined): NavItem[] {
  const base = `/projects/${pid}`
  const el = elementId ?? firstElementId
  const open3d = () => {
    try {
      localStorage.setItem(TAB_KEY, '3d')
    } catch {
      /* private mode */
    }
  }
  return [
    { key: 'info', label: 'ข้อมูลโครงการ', icon: FolderKanban, to: base, match: (p) => p === base },
    { key: 'import', label: 'นำเข้าแบบ', icon: FileInput, to: `${base}/import`, perm: 'import', match: (p) => p.startsWith(`${base}/import`) },
    { key: '3d', label: '3D Designer', icon: Box, to: el ? `${base}/elements/${el}` : `${base}#elements`, match: (p) => p.startsWith(`${base}/elements/`), onClick: open3d },
    { key: 'assembly', label: 'Form Assembly', icon: LayoutGrid, to: `${base}/assembly`, match: (p) => p.startsWith(`${base}/assembly`) },
    { key: 'report', label: 'รายการคำนวณ', icon: FileText, to: elementId ? `${base}/elements/${elementId}/report` : `${base}/report`, newTab: true, perm: 'report', match: () => false },
    { key: 'shop', label: 'Shop Drawing', icon: DraftingCompass, to: elementId ? `${base}/elements/${elementId}/shop` : `${base}/shop`, newTab: true, perm: 'shop', match: () => false },
    { key: 'bom', label: 'BOM & ราคา', icon: ClipboardList, to: `${base}/bom`, perm: 'bom', match: (p) => p.startsWith(`${base}/bom`) },
    { key: 'criteria', label: 'Design Criteria', icon: SlidersHorizontal, to: `${base}/edit`, perm: 'project.edit', match: (p) => p.startsWith(`${base}/edit`) },
  ]
}

function useItems(pid: string | undefined, elementId?: string) {
  const { can, canAccessProject } = useAuth()
  const elements = useElements(pid && canAccessProject(pid) ? pid : undefined)
  const first = elements?.slice().sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))[0]?.id
  if (!pid || !canAccessProject(pid)) return []
  return projectItems(pid, elementId, first).filter((i) => !i.perm || can(i.perm))
}

/** Tab bar for pages inside a project. */
export function ProjectNav({ projectId, elementId, className }: { projectId: string; elementId?: string; className?: string }) {
  const { pathname } = useLocation()
  const items = useItems(projectId, elementId)
  useEffect(() => rememberProject(projectId), [projectId])
  return (
    <nav aria-label="เมนูโครงการ" className={clsx('-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 [scrollbar-width:none] print:hidden', className)}>
      {items.map((i) => {
        const active = i.match(pathname)
        return (
          <Link
            key={i.key}
            to={i.to}
            target={i.newTab ? '_blank' : undefined}
            onClick={i.onClick}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              '-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm',
              active ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-ink',
            )}
          >
            <i.icon size={16} aria-hidden />
            {i.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Sidebar section: the open project (or the last one opened) and its modules. */
export function SidebarProjectNav({ linkClass }: { linkClass: (s: { isActive: boolean }) => string }) {
  const { projectId, elementId } = useParams()
  const { canAccessProject } = useAuth()
  const last = lastProjectId()
  const pid = projectId ?? (last && canAccessProject(last) ? last : undefined)
  const project = useProject(pid)
  const items = useItems(project ? pid : undefined, projectId ? elementId : undefined)
  const { pathname } = useLocation()

  if (!pid || project === null)
    return (
      <div className="mt-3 hidden rounded-lg border border-dashed border-navy-700 px-3 py-2.5 text-xs leading-relaxed text-navy-400 lg:block">
        เปิดโครงการเพื่อใช้เมนู นำเข้าแบบ · 3D Designer · Form Assembly · รายการคำนวณ · Shop Drawing · BOM
      </div>
    )
  return (
    <div className="flex gap-1 lg:mt-3 lg:flex-col">
      <p className="hidden truncate px-3 pb-1 text-[11px] uppercase tracking-wide text-navy-400 lg:block" title={project?.name}>
        {projectId ? 'โครงการปัจจุบัน' : 'โครงการล่าสุด'} · <span className="normal-case text-navy-300">{project?.projectNo ?? '…'}</span>
      </p>
      {items
        .filter((i) => i.key !== 'info' || !projectId)
        .map((i) =>
          i.newTab ? (
            <a key={i.key} href={i.to} target="_blank" rel="noopener" className={linkClass({ isActive: false })}>
              <i.icon size={18} aria-hidden />
              {i.label}
            </a>
          ) : (
            <NavLink key={i.key} to={i.to} onClick={i.onClick} className={() => linkClass({ isActive: i.match(pathname) })}>
              <i.icon size={18} aria-hidden />
              {i.key === 'info' ? project?.name ?? i.label : i.label}
            </NavLink>
          ),
        )}
    </div>
  )
}
