import type { PracticeState, Question } from './practice'

export type Bank = 'full' | 'compact'
export type Page = Bank | 'favorites'
export type QuestionRef = { bank: Bank; id: number; key: string; question: Question }

export const FULL_ORDER_KEY = 'kemuyi-full-order-v2'
export const ACTIVE_PAGE_KEY = 'kemuyi-active-page-v2'
export const FAVORITE_INDEX_KEY = 'kemuyi-favorite-index-v2'

export function makeRefs(questions: Question[], bank: Bank): QuestionRef[] {
  return questions.map((question) => ({ bank, id: question.id, key: `${bank}:${question.id}`, question }))
}

export function shuffledKeys(refs: QuestionRef[]): string[] {
  const result = refs.map((ref) => ref.key)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function loadFullOrder(refs: QuestionRef[], legacy: PracticeState): { order: string[]; index: number } {
  const fresh = shuffledKeys(refs)
  try {
    const stored = JSON.parse(localStorage.getItem(FULL_ORDER_KEY) ?? 'null')
    const validKeys = new Set(fresh)
    if (stored && Array.isArray(stored.order)) {
      const kept = stored.order.filter((key: unknown): key is string => typeof key === 'string' && validKeys.has(key))
      if (kept.length === fresh.length && new Set(kept).size === fresh.length) {
        const oldIndex = Number.isInteger(stored.index) ? Math.max(stored.index, 0) : 0
        const index = stored.order.slice(0, oldIndex).filter((key: unknown) => validKeys.has(key as string)).length
        return { order: kept, index: Math.min(index, fresh.length - 1) }
      }
    }
  } catch { /* A fresh practice order is safe when storage is unavailable. */ }

  const previousQuestion = `full:${legacy.order[legacy.allIndex]}`
  return { order: fresh, index: Math.max(fresh.indexOf(previousQuestion), 0) }
}
