// Shows the error instead of a blank (white) page when a render throws.
import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // a new deployment removed an old lazy chunk → a reload fetches the current one
    const staleChunk = /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(error.message)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h1 className="text-lg font-semibold">เกิดข้อผิดพลาดในการแสดงผล</h1>
          <p className="mt-1 text-sm text-slate-600">{staleChunk ? 'มีการอัปเดตเวอร์ชันใหม่ กรุณาโหลดหน้าใหม่' : 'ข้อมูลของคุณยังถูกบันทึกอยู่ ลองโหลดหน้าใหม่หรือกลับหน้าแรก'}</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-red-700">{error.message}</pre>
          <div className="mt-4 flex gap-2">
            <button type="button" className="h-10 rounded-lg bg-[#E2621B] px-4 text-sm font-medium text-white" onClick={() => location.reload()}>
              โหลดหน้าใหม่
            </button>
            <button type="button" className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium" onClick={() => location.assign('/')}>
              กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>
    )
  }
}
