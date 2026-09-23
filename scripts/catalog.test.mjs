import assert from 'node:assert/strict'
import { test } from 'node:test'
import { favoriteKeys, loadFullOrder, makeRefs } from '../src/catalog.ts'
import { initialState } from '../src/practice.ts'

const full = [{ id: 1, question: '原题', options: [{ key: 'A' }, { key: 'B' }], answer: 'A' }]
const compact = [{ id: 1, question: '精简题', options: [{ key: 'A' }, { key: 'B' }], answer: 'B' }]

test('question sources stay separate even when their numeric IDs match', () => {
  const refs = [...makeRefs(full, 'full'), ...makeRefs(compact, 'compact')]
  assert.deepEqual(refs.map((ref) => ref.key), ['full:1', 'compact:1'])
  globalThis.localStorage = { getItem: () => null }
  const result = loadFullOrder(makeRefs(full, 'full'), initialState(full))
  assert.deepEqual(result.order, ['full:1'])
})

test('favorites from both question sources appear in one shared list', () => {
  const fullState = initialState(full)
  const compactState = initialState(compact)
  fullState.favorites = [1]
  compactState.favorites = [1]
  assert.deepEqual(favoriteKeys(fullState, compactState), new Set(['full:1', 'compact:1']))
})

test('the full question order and cursor survive a reload', () => {
  const refs = makeRefs([{ ...full[0], id: 2 }, ...full], 'full')
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ order: ['full:1', 'full:2'], index: 1 }),
  }
  assert.deepEqual(loadFullOrder(refs, initialState(full)), {
    order: ['full:1', 'full:2'], index: 1,
  })
})

test('removed questions disappear from saved order without losing the cursor', () => {
  const refs = makeRefs(full, 'full')
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ order: ['old:1', 'compact:1', 'full:1'], index: 2 }),
  }
  assert.deepEqual(loadFullOrder(refs, initialState(full)), {
    order: ['full:1'], index: 0,
  })
})
