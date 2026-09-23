import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { makeCompactChoiceQuestions, parseCompactQuestions, parseQuestions } from './prepare-data.mjs'

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

test('the C1/C2 concise bank contains 300 consecutive question and answer cards', () => {
  const root = new URL('..', import.meta.url)
  const markdown = readFileSync(new URL('data/科目一_C1C2_300题精简题库.md', root), 'utf8')
  const questions = parseCompactQuestions(markdown)
  assert.equal(questions.length, 300)
  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 300 }, (_, i) => i + 1))
  assert.equal(new Set(questions.map((question) => question.chapter)).size, 10)
  assert.ok(questions.every((question) => question.question && question.answer))
  const choices = makeCompactChoiceQuestions(questions)
  assert.equal(choices.length, 300)
  for (const [index, question] of choices.entries()) {
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map((option) => option.text)).size, 4)
    assert.equal(question.options.find((option) => option.key === question.answer)?.text, questions[index].answer)
  }
})
