import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadFullOrder, makeRefs } from '../src/catalog.ts'
import { initialState, recordAnswer } from '../src/practice.ts'

const full = [{ id: 10, question: '原题', options: [{ key: 'A' }, { key: 'B' }], answer: 'B' }]
const selected = [{ ...full[0], chapter: 'C1/C2 精选', explanation: '' }]

test('selected questions share original IDs and answer records with the full bank', () => {
  const fullRef = makeRefs(full, 'full')[0]
  const selectedRef = makeRefs(selected, 'compact')[0]
  assert.equal(fullRef.id, selectedRef.id)
  const answered = recordAnswer(initialState(full), selectedRef.id, 'A', selectedRef.question.answer)
  assert.equal(answered.answers[fullRef.id], 'A')
  assert.deepEqual(answered.favorites, [fullRef.id])
  globalThis.localStorage = { getItem: () => null }
  assert.deepEqual(loadFullOrder([fullRef], initialState(full)).order, ['full:10'])
})

test('the full question order and cursor survive a reload', () => {
  const refs = makeRefs([{ ...full[0], id: 20 }, ...full], 'full')
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ order: ['full:10', 'full:20'], index: 1 }),
  }
  assert.deepEqual(loadFullOrder(refs, initialState(full)), {
    order: ['full:10', 'full:20'], index: 1,
  })
})

test('removed questions disappear from saved order without losing the cursor', () => {
  const refs = makeRefs(full, 'full')
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ order: ['old:1', 'compact:10', 'full:10'], index: 2 }),
  }
  assert.deepEqual(loadFullOrder(refs, initialState(full)), {
    order: ['full:10'], index: 0,
  })
})
