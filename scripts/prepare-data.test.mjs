import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseQuestions } from './prepare-data.mjs'

test('the supplied question bank has complete answers and local images', () => {
  const root = new URL('..', import.meta.url)
  const markdown = readFileSync(new URL('data/题库.md', root), 'utf8')
  const { questions, imageCount } = parseQuestions(markdown, (path) => {
    const image = new URL(`public/${path}`, root)
    return readFileSync(image).length > 0
  })

  assert.equal(questions.length, 1844)
  assert.equal(imageCount, 708)
  assert.equal(questions.filter((question) => !question.explanation).length, 5)
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length)
  assert.ok(questions.every((question) => question.sourceUrl.startsWith('https://www.aijiaxiao.com/tiba/')))
})
