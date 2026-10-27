// User manual language: the manual is written in all three languages side by side — L(th, en, zh) picks one.
import { createContext, useContext } from 'react'
import type { ReportLang } from '@/data/types'

export type ManualLang = ReportLang

export const ManualLangContext = createContext<ManualLang>('th')

const KEY = 'manualLang'

export function storedManualLang(): ManualLang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'th' || v === 'en' || v === 'zh') return v
  } catch {
    /* storage blocked */
  }
  return 'th'
}

export function storeManualLang(lang: ManualLang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* storage blocked */
  }
}

export const pick =
  (lang: ManualLang) =>
  <T>(th: T, en: T, zh: T): T =>
    lang === 'en' ? en : lang === 'zh' ? zh : th

/** L(th, en, zh) for the manual's current language. */
export function useL() {
  return pick(useContext(ManualLangContext))
}
