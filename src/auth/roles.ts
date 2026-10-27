// Roles and module permissions. A user may hold several roles; their permissions are the union of all of them.

export const ROLES = ['MasterAdmin', 'Admin', 'Engineer', 'Checker', 'Drafter', 'Estimator', 'Staff'] as const
export type UserRole = (typeof ROLES)[number]

export const ROLE_LABEL: Record<UserRole, string> = {
  MasterAdmin: 'Master Admin',
  Admin: 'ผู้ดูแลระบบ',
  Engineer: 'วิศวกรออกแบบ',
  Checker: 'ผู้ตรวจสอบ',
  Drafter: 'ผู้เขียนแบบ',
  Estimator: 'ผู้ประมาณราคา',
  Staff: 'ผู้ใช้ทั่วไป',
}

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  MasterAdmin: 'ดำเนินการได้ทุกอย่าง · เห็นทุกโครงการ · จัดการผู้ใช้',
  Admin: 'ทุกเมนูในโครงการที่ได้รับมอบหมาย · สร้าง/ลบโครงการ',
  Engineer: 'สร้าง/แก้ไขโครงการ · ออกแบบชิ้นส่วน · นำเข้าแบบ · รายการคำนวณ',
  Checker: 'ตรวจรายการคำนวณ · เปลี่ยนสถานะโครงการ · ดู Shop drawing/BOM',
  Drafter: 'Shop drawing · รายการคำนวณ',
  Estimator: 'BOM และราคา (แก้ไขได้) · รายการคำนวณ',
  Staff: 'ดูโครงการที่ได้รับมอบหมาย · คลังวัสดุ',
}

/** Modules / actions the UI guards. */
export const PERMISSIONS = [
  'users', // จัดการผู้ใช้
  'project.viewAll', // เห็นทุกโครงการ (ไม่ต้อง assign)
  'project.create',
  'project.edit',
  'project.delete',
  'element.edit', // ออกแบบชิ้นส่วน
  'import',
  'report',
  'shop',
  'bom',
  'bom.edit',
  'library',
  'files.manage', // ลบไฟล์ของผู้อื่น
] as const
export type Permission = (typeof PERMISSIONS)[number]

const ALL = [...PERMISSIONS]

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  MasterAdmin: ALL,
  Admin: ALL.filter((p) => p !== 'users' && p !== 'project.viewAll'),
  Engineer: ['project.create', 'project.edit', 'element.edit', 'import', 'report', 'shop', 'bom', 'library'],
  Checker: ['project.edit', 'report', 'shop', 'bom', 'library'],
  Drafter: ['shop', 'report', 'library'],
  Estimator: ['bom', 'bom.edit', 'report', 'library'],
  Staff: ['library'],
}

export const DEPARTMENTS = ['บริหาร', 'วิศวกรรมออกแบบ', 'เขียนแบบ', 'ประมาณราคา', 'ก่อสร้าง / หน้างาน', 'จัดซื้อ', 'QA / QC', 'อื่น ๆ'] as const

export const isRole = (r: unknown): r is UserRole => typeof r === 'string' && (ROLES as readonly string[]).includes(r)

/** Union of the permissions of every role. */
export function permissionsOf(roles: readonly UserRole[] | undefined): Set<Permission> {
  return new Set((roles ?? []).flatMap((r) => ROLE_PERMISSIONS[r] ?? []))
}

/** Highest role first (ROLES order), for display. */
export const sortRoles = (roles: readonly UserRole[]) => [...roles].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b))
