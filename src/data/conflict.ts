/** Thrown when a save is based on an older version than the one now stored (someone else saved first). */
export class ConflictError extends Error {
  constructor() {
    super('ข้อมูลนี้ถูกแก้ไขโดยผู้ใช้อื่นระหว่างที่คุณแก้ไข')
    this.name = 'ConflictError'
  }
}

export const isConflict = (e: unknown): e is ConflictError => e instanceof ConflictError
