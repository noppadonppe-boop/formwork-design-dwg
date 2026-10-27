// Calculation report in English or Chinese: the engine and the report build their text in Thai, so the report
// is translated as it is shown — units first, then every run of Thai words through the phrase dictionary
// (a run not found whole is split into dictionary words). Numbers, symbols and Latin text pass through.
import { useLayoutEffect, useState } from 'react'
import type { ReportLang } from '@/data/types'
import { REPORT_DICT } from './reportDict'

const THAI = /[฀-๿]/
/** A run of Thai words separated by single spaces. */
export const THAI_RUN = /[฀-๿]+(?: [฀-๿]+)*/g

// unit abbreviations (with their dots) → SI symbols, longest first; not inside a Thai word
const UNITS: [string, string][] = [
  ['กก./ซม.²', 'kg/cm²'],
  ['กก./ซม.', 'kg/cm'],
  ['กก./ม.²', 'kg/m²'],
  ['กก./ม.³', 'kg/m³'],
  ['กก./ม.', 'kg/m'],
  ['กก.-ซม.', 'kg·cm'],
  ['กก.-ม.', 'kg·m'],
  ['ตัน/ม.²', 't/m²'],
  ['ม./ชม.', 'm/h'],
  ['ลบ.ฟ.', 'ft³'],
  ['ลบ.ม.', 'm³'],
  ['ซม.⁴', 'cm⁴'],
  ['ซม.³', 'cm³'],
  ['ซม.²', 'cm²'],
  ['ซม.', 'cm'],
  ['มม.', 'mm'],
  ['กก.', 'kg'],
  ['ม.²', 'm²'],
  ['ม.³', 'm³'],
  ['ม.', 'm'],
]
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const UNIT_RE = new RegExp(`(?<![\\u0E00-\\u0E7F])(${UNITS.map(([t]) => esc(t)).join('|')})`, 'g')
const UNIT_MAP = new Map(UNITS)

const DICT: Record<Exclude<ReportLang, 'th'>, Map<string, string>> = {
  en: new Map(REPORT_DICT.map(([th, en]) => [th, en])),
  zh: new Map(REPORT_DICT.map(([th, , zh]) => [th, zh])),
}
const MAX_KEY = Math.max(...REPORT_DICT.map(([th]) => th.length))

/** Split a Thai word into the fewest dictionary words (Thai is written without spaces); undefined if it can't. */
function segment(word: string, dict: Map<string, string>): string[] | undefined {
  const best: (string[] | undefined)[] = [[]]
  for (let i = 1; i <= word.length; i++)
    for (let j = Math.max(0, i - MAX_KEY); j < i; j++) {
      const head = best[j]
      const piece = dict.get(word.slice(j, i))
      if (head && piece !== undefined && (!best[i] || head.length + 1 < best[i]!.length)) best[i] = [...head, piece]
    }
  return best[word.length]
}

function phrase(run: string, lang: Exclude<ReportLang, 'th'>): string {
  const dict = DICT[lang]
  const whole = dict.get(run)
  if (whole !== undefined) return whole
  const sep = lang === 'zh' ? '' : ' '
  return run
    .split(' ')
    .map((w) => dict.get(w) ?? segment(w, dict)?.join(sep) ?? w)
    .join(lang === 'zh' ? '' : ' ')
}

/** The text in `lang`; Thai is returned unchanged. */
export function translate(text: string, lang: ReportLang): string {
  if (lang === 'th' || !THAI.test(text)) return text
  return text.replace(UNIT_RE, (u) => UNIT_MAP.get(u) ?? u).replace(THAI_RUN, (run) => phrase(run, lang))
}

export const LOCALE: Record<ReportLang, string> = { th: 'th-TH', en: 'en-GB', zh: 'zh-CN' }
export const HTML_LANG: Record<ReportLang, string> = { th: 'th', en: 'en', zh: 'zh-CN' }

/**
 * Translate everything rendered inside the element given the returned ref — text nodes (SVG text included)
 * and title/aria-label/alt — and keep it translated as React updates the tree. Remount the container (key it
 * by language) when switching back to Thai.
 */
export function useTranslatedDom(lang: ReportLang): (el: HTMLElement | null) => void {
  const [root, setRoot] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (!root || lang === 'th') return
    const fixText = (n: Node) => {
      const v = n.nodeValue
      if (v && THAI.test(v)) {
        let t = translate(v, lang)
        // Thai runs on without spaces: English words from adjacent text nodes need one between them
        const prev = n.previousSibling
        if (lang === 'en' && /^[฀-๿]/.test(v) && prev?.nodeType === Node.TEXT_NODE && /[A-Za-z0-9)]$/.test(prev.nodeValue ?? '')) t = ' ' + t
        if (t !== v) n.nodeValue = t
      }
    }
    const fixAttrs = (el: Element) => {
      for (const a of ['title', 'aria-label', 'alt']) {
        const v = el.getAttribute(a)
        if (v && THAI.test(v)) el.setAttribute(a, translate(v, lang))
      }
    }
    const fixTree = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) return fixText(node)
      if (node.nodeType !== Node.ELEMENT_NODE) return
      fixAttrs(node as Element)
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeType === Node.TEXT_NODE ? fixText(n) : fixAttrs(n as Element)
    }
    fixTree(root)
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') fixText(m.target)
        else if (m.type === 'attributes') fixAttrs(m.target as Element)
        else m.addedNodes.forEach(fixTree)
      }
    })
    mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'alt'] })
    return () => mo.disconnect()
  }, [root, lang])
  return setRoot
}
