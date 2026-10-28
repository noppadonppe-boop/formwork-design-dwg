/** Thrown when a save is based on an older version than the one now stored (someone else saved first). */
export class ConflictError extends Error {
  constructor() {
    super('ข้อมูลนี้ถูกแก้ไขโดยผู้ใช้อื่นระหว่างที่คุณแก้ไข')
    this.name = 'ConflictError'
  }
}

export const isConflict = (e: unknown): e is ConflictError => e instanceof ConflictError

/** Thrown when another project already uses the project number (checked against the projectNumbers index). */
export class DuplicateProjectNoError extends Error {
  constructor(projectNo: string) {
    super(`เลขที่โครงการ “${projectNo}” ใช้แล้ว`)
    this.name = 'DuplicateProjectNoError'
  }
}

export const isDuplicateProjectNo = (e: unknown): e is DuplicateProjectNoError => e instanceof DuplicateProjectNoError
