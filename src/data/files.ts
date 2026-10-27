// File uploads → Firebase Storage, metadata → RC-FormWork-Design-Web-App/root/projects/{projectId}/uploads/{id}.
// Storage path mirrors Firestore: RC-FormWork-Design-Web-App/root/projects/{projectId}/{category}/{id}-{name}
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { useEffect, useState } from 'react'
import { CATEGORY, ROOT_COLLECTION, ROOT_DOC, rootRef, storage, storageEnabled } from '@/lib/firebase'
import type { Unsubscribe } from './repo'

/** menu the file was uploaded from */
export type UploadCategory = 'attachments' | 'imports'

export interface UploadedFile {
  id: string
  projectId: string
  category: UploadCategory
  name: string
  size: number
  contentType: string
  /** Storage object path */
  path: string
  url: string
  uploadedBy: string
  createdAt: number
}

export const uploadsEnabled = storageEnabled && Boolean(rootRef)

const uploads = (projectId: string) => collection(rootRef!, CATEGORY.projects, projectId, CATEGORY.uploads)
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 20)
const safeName = (n: string) => n.replace(/[\\/#?[\]*]+/g, '_')

export async function uploadFile(
  file: File,
  opts: { projectId: string; category: UploadCategory; uid: string; onProgress?: (fraction: number) => void },
): Promise<UploadedFile> {
  if (!uploadsEnabled) throw new Error('ยังไม่ได้ตั้งค่า Firebase Storage')
  const id = newId()
  const path = `${ROOT_COLLECTION}/${ROOT_DOC}/${CATEGORY.projects}/${opts.projectId}/${opts.category}/${id}-${safeName(file.name)}`
  const task = uploadBytesResumable(ref(storage!, path), file, { contentType: file.type || 'application/octet-stream' })
  await new Promise<void>((resolve, reject) =>
    task.on('state_changed', (s) => opts.onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), reject, () => resolve()),
  )
  const meta: UploadedFile = {
    id,
    projectId: opts.projectId,
    category: opts.category,
    name: file.name,
    size: file.size,
    contentType: file.type || 'application/octet-stream',
    path,
    url: await getDownloadURL(task.snapshot.ref),
    uploadedBy: opts.uid,
    createdAt: Date.now(),
  }
  await setDoc(doc(uploads(opts.projectId), id), meta)
  return meta
}

export async function deleteFile(f: UploadedFile): Promise<void> {
  try {
    await deleteObject(ref(storage!, f.path))
  } catch (e) {
    // object already gone → still drop the record
    if ((e as { code?: string }).code !== 'storage/object-not-found') throw e
  }
  await deleteDoc(doc(uploads(f.projectId), f.id))
}

export function watchFiles(projectId: string, cb: (f: UploadedFile[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    uploads(projectId),
    (snap) => cb(snap.docs.map((d) => d.data() as UploadedFile).sort((a, b) => b.createdAt - a.createdAt)),
    (e) => onError?.(e),
  )
}

export function useFiles(projectId: string | undefined) {
  const [files, setFiles] = useState<UploadedFile[]>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!projectId || !uploadsEnabled) return
    return watchFiles(projectId, setFiles, (e) => setError(e.message))
  }, [projectId])
  return { files, error }
}

/** Thai message for common Storage failures */
export function uploadErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  if (code === 'storage/unauthorized') return 'ไม่มีสิทธิ์อัปโหลด — ตรวจสอบ Storage rules หรือเข้าสู่ระบบใหม่'
  if (code === 'storage/bucket-not-found' || code === 'storage/project-not-found' || code === 'storage/unknown')
    return 'ยังไม่ได้เปิดใช้ Firebase Storage ในโปรเจกต์ (Firebase Console → Storage → Get started)'
  if (code === 'storage/retry-limit-exceeded') return 'อัปโหลดไม่สำเร็จ — การเชื่อมต่อขาดหาย'
  return (e as Error).message
}
