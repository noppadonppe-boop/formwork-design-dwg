// The drawing-reading request, shared by the browser (own API key) and the Cloud Function (server key):
// models, system prompt, structured-output schema and the request parameters. No browser or Firebase imports.
import type Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

export const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (แม่นยำ — ค่าเริ่มต้น)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (เร็ว / ประหยัด)' },
] as const
export type AiModel = (typeof AI_MODELS)[number]['id']

export const DRAWING_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'] as const
export type DrawingType = (typeof DRAWING_TYPES)[number]

const Element = z.object({
  type: z.enum(['column', 'wall', 'beam', 'slab', 'footing']),
  code: z.string().describe('Mark as written on the drawing, e.g. C1, B2, F1. Empty string if none.'),
  count: z.number().int().describe('How many identical items of this mark appear on the sheet (at least 1).'),
  b_cm: z.number().nullable().describe('Column short side / beam width / wall thickness / slab thickness, in cm.'),
  h_cm: z.number().nullable().describe('Column long side / beam total depth, in cm.'),
  length_m: z.number().nullable().describe('Wall or beam length (clear span), in m.'),
  plan_x_m: z.number().nullable().describe('Footing or slab panel plan size in x, in m.'),
  plan_y_m: z.number().nullable().describe('Footing or slab panel plan size in y, in m.'),
  depth_m: z.number().nullable().describe('Footing depth / pour height of a wall or column, in m.'),
  level: z.string().describe('Floor or zone label if shown, else empty string.'),
  evidence: z.string().describe('Where on the drawing this came from (schedule row, plan label, section), one short phrase.'),
})

export const Schedule = z.object({
  drawing_title: z.string(),
  storey_height_m: z.number().nullable().describe('Floor-to-floor height if the drawing states it.'),
  slab_thickness_cm: z.number().nullable(),
  elements: z.array(Element),
  warnings: z.array(z.string()).describe('Anything unreadable, ambiguous or assumed.'),
})
export type AiSchedule = z.infer<typeof Schedule>

const SYSTEM = `You read structural engineering drawings (plans, sections, column/beam/footing schedules) for a concrete formwork design tool.
Report every concrete element that needs formwork: columns, walls, beams, slabs and footings / pile caps.
Read sizes from schedules, labels and dimension strings; Thai and English annotations are both common (เสา = column, คาน = beam, พื้น = slab, ฐานราก = footing, กำแพง = wall).
Count identical marks across the sheet. Never invent a size: leave a field null when the drawing does not give it, and say so in warnings.
Convert units exactly as written (mm → cm for sections, m for lengths).`

/** Parameters for `client.beta.messages.parse` reading one drawing (base64 image or PDF). */
export function scheduleRequest(model: string, mediaType: DrawingType, data: string, hint?: string) {
  const source =
    mediaType === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } as const)
      : ({ type: 'image', source: { type: 'base64', media_type: mediaType, data } } as const)
  return {
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: betaZodOutputFormat(Schedule) },
    system: SYSTEM,
    messages: [{ role: 'user', content: [source, { type: 'text', text: `List the formwork elements on this drawing.${hint ? `\nNotes from the engineer: ${hint}` : ''}` }] }],
  } satisfies Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
}

/** Thai message for a finished response that did not produce a schedule, or undefined when it did. */
export function scheduleProblem(r: { stop_reason: string | null; parsed_output: unknown }): string | undefined {
  if (r.stop_reason === 'refusal') return 'Claude ปฏิเสธการอ่านไฟล์นี้'
  if (r.stop_reason === 'max_tokens') return 'ผลลัพธ์ยาวเกิน — แบ่งแบบเป็นหลายไฟล์แล้วลองใหม่'
  if (!r.parsed_output) return 'อ่านผลลัพธ์ไม่ได้'
  return undefined
}
