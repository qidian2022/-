import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { excludedFullIds, parseSelectedQuestions, parseQuestions } from './prepare-data.mjs'

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
  const published = questions.filter((question) => !excludedFullIds.has(question.id))
  assert.equal(published.length, 1841)
  assert.ok(published.every((question) => question.id !== 341 && question.id !== 3554 && question.id !== 3555))
  assert.ok(published.some((question) => question.id === 342))
})

test('the 300 selected questions are original full-bank questions with valid images', () => {
  const root = new URL('..', import.meta.url)
  const full = parseQuestions(readFileSync(new URL('data/题库.md', root), 'utf8')).questions
  const markdown = readFileSync(new URL('data/科目一_C1C2_原题精选300.md', root), 'utf8')
  const selected = parseSelectedQuestions(markdown, full, (path) =>
    readFileSync(new URL(`public/${path}`, root)).length > 0)
  const publishedIds = new Set(full.filter((question) => !excludedFullIds.has(question.id)).map((question) => question.id))
  assert.equal(selected.length, 300)
  assert.equal(new Set(selected.map((question) => question.id)).size, 300)
  assert.ok(selected.every((question) => publishedIds.has(question.id)))
  assert.ok(selected.every((question) => question.options.some((option) => option.key === question.answer)))
  assert.equal(selected.reduce((count, question) => count + question.images.length, 0), 128)
  assert.ok(selected.some((question) => question.id === 342))
  assert.ok(selected.every((question) => question.explanation === ''))
})
