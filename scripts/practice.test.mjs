import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COMPACT_STORAGE_KEY, initialState, loadState, restartState, saveState } from '../src/practice.ts'

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
