import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeRefs } from '../src/catalog.ts'
import { initialState, recordAnswer } from '../src/practice.ts'

const full = [{ id: 10, question: '原题', chapter: '原题', sourceUrl: '', options: [{ key: 'A' }, { key: 'B' }], answer: 'B', explanation: '原解析', images: [] }]
const selected = [{ id: 10, chapter: 'C1/C2 精选' }]

test('selected refs reuse the source question and hide its explanation', () => {
  const refs = makeRefs(full, selected)
  assert.equal(refs.full[0].id, refs.compact[0].id)
  assert.equal(refs.compact[0].question.question, '原题')
  assert.equal(refs.compact[0].question.chapter, 'C1/C2 精选')
  assert.equal(refs.compact[0].question.explanation, '')
  assert.equal(refs.full[0].question.explanation, '原解析')
  const state = recordAnswer(initialState(full, selected), 10, 'A', 'B')
  assert.equal(state.answers[refs.full[0].id], 'A')
  assert.deepEqual(state.favorites, [10])
})
