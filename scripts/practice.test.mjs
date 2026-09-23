import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COMPACT_STORAGE_KEY, advanceIfCurrent, initialState, loadState, recordAnswer, restartState, saveState } from '../src/practice.ts'

const questions = [
  { id: 1, options: [{ key: 'A' }, { key: 'B' }], answer: 'B' },
  { id: 2, options: [{ key: 'A' }, { key: 'B' }], answer: 'A' },
]

test('answers, favorites, and current question survive a reload', () => {
  const memory = new Map()
  globalThis.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  }
  const state = initialState(questions)
  state.answers[1] = 'B'
  state.favorites = [1]
  state.allIndex = 1
  state.mode = 'favorites'
  saveState(state)

  assert.deepEqual(loadState(questions), state)

  const restarted = restartState(state, questions)
  assert.deepEqual(restarted.answers, {})
  assert.deepEqual(restarted.favorites, [1])
  assert.equal(restarted.mode, 'all')
  assert.deepEqual(new Set(restarted.order), new Set([1, 2]))
})

test('stale question IDs and invalid answers are ignored', () => {
  globalThis.localStorage = {
    getItem: () => JSON.stringify({
      order: [1, 999],
      favorites: [1, 999, 1],
      answers: { 1: 'C', 2: 'A', 999: 'B' },
      allIndex: 99,
      favoriteIndex: 99,
      mode: 'favorites',
    }),
    setItem: () => {},
  }
  const state = loadState(questions)
  assert.deepEqual(new Set(state.order), new Set([1, 2]))
  assert.deepEqual(state.favorites, [1])
  assert.deepEqual(state.answers, { 2: 'A' })
  assert.equal(state.favoriteIndex, 0)
  assert.equal(state.allIndex, 1)
})

test('the two question banks keep separate answers and favorites', () => {
  const memory = new Map()
  globalThis.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  }
  const full = initialState(questions)
  full.answers[1] = 'B'
  full.favorites = [1]
  saveState(full)

  const compact = initialState(questions)
  compact.answers[2] = 'A'
  compact.favorites = [2]
  saveState(compact, COMPACT_STORAGE_KEY)

  assert.deepEqual(loadState(questions), full)
  assert.deepEqual(loadState(questions, COMPACT_STORAGE_KEY), compact)
})

test('automatic advance moves only from the same visible question and mode', () => {
  const state = {
    order: [1, 2], answers: { 1: 'B' }, favorites: [1, 2],
    allIndex: 0, favoriteIndex: 0, mode: 'all',
  }
  assert.equal(advanceIfCurrent(state, { mode: 'all', questionId: 1 }).allIndex, 1)
  assert.equal(advanceIfCurrent(state, { mode: 'all', questionId: 2 }), state)
  assert.equal(advanceIfCurrent({ ...state, allIndex: 1 }, { mode: 'all', questionId: 1 }).allIndex, 1)
  const favoritesState = { ...state, mode: 'favorites' }
  assert.equal(advanceIfCurrent(favoritesState, { mode: 'all', questionId: 1 }), favoritesState)
  assert.equal(advanceIfCurrent({ ...state, mode: 'favorites' }, { mode: 'favorites', questionId: 1 }).favoriteIndex, 1)
})

test('wrong answers are saved once to favorites while correct answers are not', () => {
  const state = initialState(questions)
  const wrong = recordAnswer(state, 1, 'A', 'B')
  assert.deepEqual(wrong.favorites, [1])
  assert.equal(wrong.answers[1], 'A')
  assert.equal(recordAnswer(wrong, 1, 'A', 'B'), wrong)
  const correct = recordAnswer(wrong, 2, 'A', 'A')
  assert.deepEqual(correct.favorites, [1])
})
