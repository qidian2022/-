export type Mode = 'all' | 'favorites'
export type OptionKey = 'A' | 'B' | 'C' | 'D'

export type Question = {
  id: number
  question: string
  chapter: string
  sourceUrl: string
  options: { key: OptionKey; text: string }[]
  answer: OptionKey
  explanation: string
  images: string[]
}

export type PracticeState = {
  order: number[]
  answers: Record<number, OptionKey>
  favorites: number[]
  allIndex: number
  favoriteIndex: number
  mode: Mode
}

const STORAGE_KEY = 'kemuyi-practice-v1'

export function shuffled(ids: number[]): number[] {
  const result = [...ids]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function initialState(questions: Question[]): PracticeState {
  return {
    order: shuffled(questions.map((question) => question.id)),
    answers: {},
    favorites: [],
    allIndex: 0,
    favoriteIndex: 0,
    mode: 'all',
  }
}

export function loadState(questions: Question[]): PracticeState {
  const fresh = initialState(questions)
  let stored: Partial<PracticeState> | null = null
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return fresh
  }
  if (!stored || typeof stored !== 'object') return fresh

  const byId = new Map(questions.map((question) => [question.id, question]))
  const isId = (value: unknown): value is number =>
    typeof value === 'number' && byId.has(value)
  const order = Array.isArray(stored.order) &&
    stored.order.length === questions.length &&
    stored.order.every(isId) &&
    new Set(stored.order).size === questions.length
    ? stored.order
    : fresh.order
  const favorites = Array.isArray(stored.favorites)
    ? [...new Set(stored.favorites.filter(isId))]
    : []
  const answers: Record<number, OptionKey> = {}
  if (stored.answers && typeof stored.answers === 'object') {
    for (const [rawId, value] of Object.entries(stored.answers)) {
      const question = byId.get(Number(rawId))
      if (question?.options.some((option) => option.key === value)) {
        answers[question.id] = value as OptionKey
      }
    }
  }
  const safeIndex = (value: unknown, size: number) =>
    typeof value === 'number' && Number.isInteger(value)
      ? Math.min(Math.max(value, 0), Math.max(size - 1, 0))
      : 0

  return {
    order,
    answers,
    favorites,
    allIndex: safeIndex(stored.allIndex, order.length),
    favoriteIndex: safeIndex(stored.favoriteIndex, favorites.length),
    mode: stored.mode === 'favorites' ? 'favorites' : 'all',
  }
}

export function saveState(state: PracticeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Practice still works when browser storage is unavailable.
  }
}

export function restartState(previous: PracticeState, questions: Question[]): PracticeState {
  return { ...initialState(questions), favorites: previous.favorites }
}
