// AI import: read a structural drawing (image or PDF) with Claude and return the formwork elements it shows.
// Two routes: through the `readDrawing` Cloud Function (server-side key, signed-in users, daily quota) or
// directly from the browser with the user's own API key (Local mode / no server).
import Anthropic from '@anthropic-ai/sdk'
import { getFunctions, httpsCallable, connectFunctionsEmulator, type FunctionsError } from 'firebase/functions'
import type { ElementType } from '@/data/types'
import { app, firebaseEnabled } from '@/lib/firebase'
import { AI_MODELS, type AiSchedule, DRAWING_TYPES, type DrawingType, scheduleProblem, scheduleRequest } from './aiSchedule'
import { type Candidate, type DetectOptions, group } from './detect'

export { AI_MODELS, type AiSchedule } from './aiSchedule'

/** Server route available: Firebase is configured (the function is deployed with the project). */
export const serverAvailable = firebaseEnabled
/** Callable requests are capped at 10 MB; base64 adds a third. */
export const SERVER_MAX_BYTES = 7 * 1024 * 1024

const KEY_STORE = 'formwork-studio:anthropic'

export interface AiSettings {
  /** 'server' = Cloud Function with the company key, 'own' = this browser's key */
  route: 'server' | 'own'
  apiKey: string
  model: string
}

export function loadAiSettings(): AiSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY_STORE) ?? '{}')
    return { route: serverAvailable ? (v.route ?? 'server') : 'own', apiKey: v.apiKey ?? '', model: v.model ?? AI_MODELS[0].id }
  } catch {
    return { route: serverAvailable ? 'server' : 'own', apiKey: '', model: AI_MODELS[0].id }
  }
}

export function saveAiSettings(s: AiSettings) {
  try {
    // the key is kept only when the user chose their own-key route
    localStorage.setItem(KEY_STORE, JSON.stringify({ ...s, apiKey: s.route === 'own' ? s.apiKey : '' }))
  } catch {
    /* storage blocked: settings live for this page only */
  }
}

export function drawingType(file: File): DrawingType | undefined {
  const t = (file.type || '').toLowerCase()
  if ((DRAWING_TYPES as readonly string[]).includes(t)) return t as DrawingType
  if (file.name.toLowerCase().endsWith('.pdf')) return 'application/pdf'
  return undefined
}

/** Read one drawing with the user's own API key, directly from the browser. */
export async function readDrawing(file: File, opts: { apiKey: string; model: string; hint?: string; signal?: AbortSignal }): Promise<AiSchedule> {
  const type = drawingType(file)
  if (!type) throw new Error('รองรับเฉพาะ PNG, JPG, WEBP, GIF และ PDF')
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true })
  const response = await client.beta.messages.parse(scheduleRequest(opts.model, type, await toBase64(file), opts.hint), { signal: opts.signal })
  const problem = scheduleProblem(response)
  if (problem) throw new Error(problem)
  return response.parsed_output!
}

export interface ServerResult {
  schedule: AiSchedule
  model: string
  usage: { input_tokens: number; output_tokens: number }
  /** reads left today for this user */
  remaining: number
}

const SERVER_ERRORS: Record<string, string> = {
  'functions/unauthenticated': 'ต้องเข้าสู่ระบบก่อนใช้ AI อ่านแบบ',
  'functions/resource-exhausted': 'ใช้ AI อ่านแบบครบโควตาวันนี้แล้ว หรือ Claude API ไม่ว่างชั่วคราว — ลองใหม่ภายหลัง',
  'functions/invalid-argument': 'ไฟล์หรือข้อมูลไม่ถูกต้อง',
  'functions/failed-precondition': '',
  'functions/not-found': 'ยังไม่ได้ deploy ฟังก์ชัน readDrawing — ดูวิธีใน README',
  'functions/deadline-exceeded': 'อ่านแบบนานเกินกำหนด — ลองไฟล์ที่เล็กลงหรือแบ่งหน้า',
  'functions/unavailable': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้',
}

let functionsReady = false
function functions() {
  const f = getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || 'asia-southeast1')
  const emu = import.meta.env.VITE_FUNCTIONS_EMULATOR as string | undefined
  if (emu && !functionsReady) {
    const [host, port] = emu.split(':')
    connectFunctionsEmulator(f, host, Number(port))
  }
  functionsReady = true
  return f
}

/** Read one drawing through the `readDrawing` Cloud Function — the API key stays on the server. */
export async function readDrawingServer(file: File, opts: { model: string; hint?: string; signal?: AbortSignal }): Promise<ServerResult> {
  const type = drawingType(file)
  if (!type) throw new Error('รองรับเฉพาะ PNG, JPG, WEBP, GIF และ PDF')
  if (file.size > SERVER_MAX_BYTES) throw new Error(`ไฟล์ใหญ่เกิน ${SERVER_MAX_BYTES / 1024 / 1024} MB — ลดขนาดรูป หรือแยก PDF ทีละหน้า`)
  const call = httpsCallable<{ data: string; mediaType: DrawingType; model: string; hint?: string }, ServerResult>(functions(), 'readDrawing', { timeout: 300_000 })
  const run = call({ data: await toBase64(file), mediaType: type, model: opts.model, hint: opts.hint })
  const aborted = new Promise<never>((_, reject) => opts.signal?.addEventListener('abort', () => reject(new Error('ยกเลิกแล้ว')), { once: true }))
  try {
    return (await Promise.race([run, aborted])).data
  } catch (e) {
    const fe = e as FunctionsError
    throw new Error(SERVER_ERRORS[fe.code] || fe.message || 'เรียกเซิร์ฟเวอร์ไม่สำเร็จ')
  }
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** AI schedule → import candidates (missing sizes fall back to the import defaults and are flagged). */
export function scheduleToCandidates(s: AiSchedule, opt: DetectOptions): Candidate[] {
  const storey = s.storey_height_m ?? opt.storeyH
  const slabT = s.slab_thickness_cm ? s.slab_thickness_cm / 100 : opt.slabT
  const cm = (v: number | null) => (v === null ? undefined : v / 100)
  const items = s.elements.map((e) => {
    const missing: string[] = []
    const need = <T>(v: T | undefined, label: string, def: T): T => {
      if (v === undefined || v === null) {
        missing.push(label)
        return def
      }
      return v
    }
    const t = e.type as ElementType
    let dims: Candidate['dims']
    switch (t) {
      case 'column':
        dims = { b: need(cm(e.b_cm), 'b', 0.4), h: need(cm(e.h_cm) ?? cm(e.b_cm), 'h', 0.4), height: e.depth_m ?? storey - slabT }
        break
      case 'wall':
        dims = { thickness: need(cm(e.b_cm), 'ความหนา', 0.2), length: need(e.length_m ?? undefined, 'ความยาว', 5), height: e.depth_m ?? storey - slabT }
        break
      case 'beam': {
        const h = need(cm(e.h_cm), 'ความลึก', opt.beamH)
        dims = { b: need(cm(e.b_cm), 'ความกว้าง', 0.3), depth: h, length: need(e.length_m ?? undefined, 'ความยาว', 6), slabT, height: storey - h }
        break
      }
      case 'slab':
        dims = { thickness: cm(e.b_cm) ?? slabT, lengthX: need(e.plan_x_m ?? undefined, 'ขนาด X', 6), lengthY: need(e.plan_y_m ?? undefined, 'ขนาด Y', 4), height: storey - (cm(e.b_cm) ?? slabT) }
        break
      case 'footing':
        dims = { lengthX: need(e.plan_x_m ?? undefined, 'ขนาด X', 2), lengthY: need(e.plan_y_m ?? undefined, 'ขนาด Y', e.plan_x_m ?? 2), height: need(e.depth_m ?? undefined, 'ความลึก', opt.footingH) }
        break
    }
    const note = [e.evidence, missing.length ? `ไม่พบ ${missing.join(', ')} — ใช้ค่าเริ่มต้น` : ''].filter(Boolean).join(' · ')
    return { type: t, code: e.code.trim().toUpperCase().replace(/\s|-/g, '') || undefined, dims, qty: Math.max(1, e.count), name: e.level ? `ชั้น ${e.level}` : '', note }
  })
  return group(items, 'ai')
}
