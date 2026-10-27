// A tab opened before a deploy keeps running the old engine, which cannot read designs saved by the new one
// (e.g. a new section id → "Unknown section"). Every build gives the entry script a new hashed name, so the app
// checks /index.html when the tab comes back into view and every few minutes, and offers a reload when it changed.
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

const ENTRY = /\/assets\/index-[\w-]+\.js/
const loaded = typeof document === 'undefined' ? undefined : [...document.scripts].map((s) => ENTRY.exec(s.src)?.[0]).find(Boolean)

/** Whether a newer build than the one running has been deployed. */
export async function newerBuild(): Promise<boolean> {
  if (!loaded) return false
  try {
    const html = await (await fetch('/index.html', { cache: 'no-store' })).text()
    const live = ENTRY.exec(html)?.[0]
    return !!live && live !== loaded
  } catch {
    return false
  }
}

export function UpdateBanner() {
  const [stale, setStale] = useState(false)
  useEffect(() => {
    if (!loaded) return // dev server: no hashed entry
    const check = () => void newerBuild().then((n) => n && setStale(true))
    const onVisible = () => document.visibilityState === 'visible' && check()
    const id = window.setInterval(check, 5 * 60_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  if (!stale) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3 bg-ink px-4 py-2.5 text-sm text-white shadow-lg print:hidden">
      มีโปรแกรมเวอร์ชันใหม่ — โหลดหน้าใหม่เพื่อใช้งานต่อ (งานที่บันทึกแล้วไม่หาย)
      <button type="button" className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1 font-medium text-ink" onClick={() => window.location.reload()}>
        <RefreshCw size={14} /> โหลดใหม่
      </button>
    </div>
  )
}
