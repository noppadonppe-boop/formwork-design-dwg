// Runs the optimizer off the main thread.
import type { Criteria, ElementData } from '@/data/types'
import { evaluate, type OptOptions, optimize } from './optimize'

export type OptRequest = { el: ElementData; criteria: Criteria; opts: OptOptions }
export type OptMessage =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; result: ReturnType<typeof optimize>; current?: ReturnType<typeof evaluate> }
  | { type: 'error'; message: string }

self.onmessage = (e: MessageEvent<OptRequest>) => {
  const { el, criteria, opts } = e.data
  try {
    const current = evaluate(el, criteria, { ...opts, target: Infinity })
    const result = optimize(el, criteria, opts, (done, total) => self.postMessage({ type: 'progress', done, total } satisfies OptMessage))
    self.postMessage({ type: 'done', result, current } satisfies OptMessage)
  } catch (err) {
    self.postMessage({ type: 'error', message: (err as Error).message } satisfies OptMessage)
  }
}
