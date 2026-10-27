// Cloud Functions for FormWork Studio.
// readDrawing — reads a structural drawing with Claude for the AI import. The Anthropic API key lives in Secret
// Manager (ANTHROPIC_API_KEY) and never reaches the browser; callers must be signed in and are limited per day.
import Anthropic from '@anthropic-ai/sdk'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/https'
import { defineInt, defineSecret, defineString } from 'firebase-functions/params'
import { z } from 'zod'
import { AI_MODELS, DRAWING_TYPES, scheduleProblem, scheduleRequest } from '../../src/import/aiSchedule'

initializeApp()

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
/** reads per user per day (UTC) */
const AI_DAILY_LIMIT = defineInt('AI_DAILY_LIMIT', { default: 30 })
const REGION = defineString('FUNCTIONS_REGION', { default: 'asia-southeast1' })

const Input = z.object({
  /** base64 file content; callable payloads are capped at 10 MB */
  data: z.string().min(16).max(10_000_000),
  mediaType: z.enum(DRAWING_TYPES),
  model: z.enum(AI_MODELS.map((m) => m.id) as [string, ...string[]]),
  hint: z.string().max(2000).optional(),
})

/** Count one read for `uid` today; throws when the daily limit is reached. Returns reads left. */
async function takeQuota(uid: string, limit: number): Promise<number> {
  const db = getFirestore()
  const day = new Date().toISOString().slice(0, 10)
  const ref = db.doc(`aiUsage/${uid}`)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const used = snap.exists && snap.get('day') === day ? (snap.get('count') as number) : 0
    if (used >= limit) throw new HttpsError('resource-exhausted', `ใช้ AI อ่านแบบครบ ${limit} ครั้งของวันนี้แล้ว`)
    tx.set(ref, { day, count: used + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return limit - used - 1
  })
}

async function giveBack(uid: string) {
  await getFirestore()
    .doc(`aiUsage/${uid}`)
    .update({ count: FieldValue.increment(-1) })
    .catch(() => undefined)
}

export const readDrawing = onCall(
  { region: REGION, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: '512MiB', maxInstances: 10 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'ต้องเข้าสู่ระบบ')
    const parsed = Input.safeParse(request.data)
    if (!parsed.success) throw new HttpsError('invalid-argument', 'ข้อมูลไม่ถูกต้อง', parsed.error.issues.slice(0, 3))
    const { data, mediaType, model, hint } = parsed.data
    const uid = request.auth.uid

    const remaining = await takeQuota(uid, AI_DAILY_LIMIT.value())
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
    try {
      const response = await client.beta.messages.parse(scheduleRequest(model, mediaType, data, hint))
      logger.info('readDrawing', { uid, model: response.model, stop: response.stop_reason, input: response.usage.input_tokens, output: response.usage.output_tokens })
      const problem = scheduleProblem(response)
      if (problem) throw new HttpsError('failed-precondition', problem)
      return {
        schedule: response.parsed_output!,
        model: response.model,
        usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
        remaining,
      }
    } catch (e) {
      if (e instanceof HttpsError) throw e
      await giveBack(uid) // failed calls do not count against the quota
      if (e instanceof Anthropic.BadRequestError) throw new HttpsError('invalid-argument', `Claude ไม่รับไฟล์นี้: ${e.message}`)
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        logger.error('Anthropic key rejected', { status: e.status })
        throw new HttpsError('internal', 'คีย์ Anthropic บนเซิร์ฟเวอร์ใช้ไม่ได้ — แจ้งผู้ดูแลระบบ')
      }
      if (e instanceof Anthropic.RateLimitError) throw new HttpsError('resource-exhausted', 'Claude API ไม่ว่างชั่วคราว — ลองใหม่ในอีกสักครู่')
      if (e instanceof Anthropic.APIError) {
        logger.error('Anthropic API error', { status: e.status, message: e.message })
        throw new HttpsError('unavailable', 'Claude API ขัดข้อง — ลองใหม่ภายหลัง')
      }
      logger.error('readDrawing failed', e)
      throw new HttpsError('internal', 'อ่านแบบไม่สำเร็จ')
    }
  },
)
