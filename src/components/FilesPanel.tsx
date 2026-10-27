// Project attachments (drawings, PDFs, photos…) stored in Firebase Storage and shared by every user.
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { deleteFile, uploadErrorMessage, uploadFile, uploadsEnabled, useFiles } from '@/data/files'

const CATEGORY_LABEL = { attachments: 'ไฟล์แนบ', imports: 'แบบที่นำเข้า' } as const

const sizeText = (b: number) => (b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 ** 2).toFixed(1)} MB`)

export function FilesPanel({ projectId }: { projectId: string }) {
  const { user, can } = useAuth()
  const { files, error: loadError } = useFiles(projectId)
  const [progress, setProgress] = useState<{ name: string; fraction: number }>()
  const [error, setError] = useState<string>()

  if (!uploadsEnabled) return null

  const onPick = async (list: FileList | null) => {
    if (!list?.length || !user) return
    setError(undefined)
    try {
      for (const f of Array.from(list)) {
        setProgress({ name: f.name, fraction: 0 })
        await uploadFile(f, { projectId, category: 'attachments', uid: user.uid, onProgress: (fraction) => setProgress({ name: f.name, fraction }) })
      }
    } catch (e) {
      setError(uploadErrorMessage(e))
    } finally {
      setProgress(undefined)
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="mr-auto flex items-center gap-2 font-semibold">
          <Paperclip size={16} aria-hidden /> ไฟล์โครงการ ({files?.length ?? 0})
        </h2>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">
          {progress ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {progress ? `${progress.name} · ${Math.round(progress.fraction * 100)}%` : 'อัปโหลดไฟล์'}
          <input type="file" multiple className="sr-only" disabled={!!progress} onChange={(e) => (onPick(e.target.files), (e.target.value = ''))} />
        </label>
      </div>
      {(error || loadError) && <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-fail">{error ?? loadError}</p>}
      {files === undefined && !loadError ? (
        <div className="flex justify-center py-8 text-muted">
          <Loader2 className="animate-spin" aria-label="กำลังโหลด" />
        </div>
      ) : !files?.length ? (
        <p className="px-4 py-6 text-center text-sm text-muted">ยังไม่มีไฟล์ — อัปโหลดแบบ, PDF, รูปถ่ายหน้างาน ฯลฯ</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <FileText size={18} className="shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <a href={f.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-sel">
                  {f.name}
                </a>
                <span className="text-xs text-muted">
                  {CATEGORY_LABEL[f.category]} · {sizeText(f.size)} · {new Date(f.createdAt).toLocaleString('th-TH')}
                </span>
              </div>
              <a href={f.url} target="_blank" rel="noreferrer" aria-label={`ดาวน์โหลด ${f.name}`} title="ดาวน์โหลด" className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-slate-600 hover:bg-slate-50">
                <Download size={16} />
              </a>
              {(f.uploadedBy === user?.uid || can('files.manage')) && (
              <button
                type="button"
                aria-label={`ลบ ${f.name}`}
                title="ลบ"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-fail hover:bg-red-50"
                onClick={async () => {
                  if (!confirm(`ลบไฟล์ ${f.name}?`)) return
                  try {
                    await deleteFile(f)
                  } catch (e) {
                    setError(uploadErrorMessage(e))
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
