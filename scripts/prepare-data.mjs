import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const markdownPath = join(root, 'data', '题库.md')
const outputPath = join(root, 'src', 'generated', 'questions.json')
const compactMarkdownPath = join(root, 'data', '科目一_C1C2_300题精简题库.md')
const compactOutputPath = join(root, 'src', 'generated', 'compact-questions.json')
const imageRoot = join(root, 'public')

export function parseQuestions(markdown, imageExists = () => true) {
  const matches = [...markdown.matchAll(/^## (\d+)\. (.+)$/gm)]
  const questions = []
  const seen = new Set()
  let imageCount = 0

  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index]
    const body = markdown.slice(
      heading.index + heading[0].length,
      matches[index + 1]?.index ?? markdown.length,
    )
    const meta = body.match(/^题号：(\d+) · 章节：(.+?) · \[原题\]\((https:\/\/[^)]+)\)$/m)
    const answer = body.match(/^\*\*答案：([A-D])\*\*$/m)?.[1]
    const options = [...body.matchAll(/^- ([A-D])、(.+)$/gm)].map((match) => ({
      key: match[1],
      text: match[2].trim(),
    }))
    const images = [...body.matchAll(/^!\[[^\]]*\]\((images\/[^)]+)\)$/gm)].map(
      (match) => match[1],
    )
    const explanation = body.match(/^解析：(.*)$/m)?.[1].trim() ?? ''
    const id = Number(meta?.[1])

    if (!meta || !Number.isSafeInteger(id) || seen.has(id)) {
      throw new Error(`第 ${index + 1} 道题缺少有效且唯一的原题号`)
    }
    if (![2, 4].includes(options.length) || options.some((option, i) => option.key !== 'ABCD'[i])) {
      throw new Error(`原题 ${id} 的选项不完整`)
    }
    if (!answer || !options.some((option) => option.key === answer)) {
      throw new Error(`原题 ${id} 的答案无效`)
    }
    if (images.some((path) => !imageExists(path))) {
      throw new Error(`原题 ${id} 的题图不存在`)
    }

    seen.add(id)
    imageCount += images.length
    questions.push({
      id,
      question: heading[2].trim(),
      chapter: meta[2].replace(/^全部题目、/, ''),
      sourceUrl: meta[3],
      options,
      answer,
      explanation,
      images,
    })
  }

  return { questions, imageCount }
}

export function parseCompactQuestions(markdown) {
  const questions = []
  let chapter = ''
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## ([一二三四五六七八九十]+、.+（30题）)$/)
    if (heading) {
      chapter = heading[1].replace(/（30题）$/, '')
      continue
    }
    const item = line.match(/^(\d{3})\. \*\*(.+?)\*\* (.+)$/)
    if (!item) {
      if (/^\d{3}\. /.test(line)) throw new Error(`精简题格式无效：${line.slice(0, 80)}`)
      continue
    }
    const id = Number(item[1])
    if (!chapter || id !== questions.length + 1) {
      throw new Error(`精简题编号或章节无效：${item[1]}`)
    }
    questions.push({ id, chapter, question: item[2].trim(), answer: item[3].trim() })
  }
  if (questions.length !== 300) throw new Error(`精简题数量不符：${questions.length}`)
  return questions
}

function similarAnswer(a, b) {
  const clean = (value) => value.replace(/[\s，。；、：:（）()]/g, '')
  const left = clean(a)
  const right = clean(b)
  if (left === right || (left.includes(right) || right.includes(left)) &&
      Math.min(left.length, right.length) / Math.max(left.length, right.length) > 0.65) return true
  const polarity = (value) => {
    if (/^(不可以|不能|不可|不得|不需要|没有|否)/.test(value)) return 'no'
    if (/^(可以|能|需要|应当|应|是)/.test(value)) return 'yes'
    return null
  }
  return polarity(left) !== null && polarity(left) === polarity(right)
}

export function makeCompactChoiceQuestions(items) {
  const tokenSets = items.map((item) => {
    const clean = item.question.replace(/[\s，。？！、：:（）()“”]/g, '')
    return new Set(Array.from({ length: Math.max(clean.length - 1, 0) }, (_, i) => clean.slice(i, i + 2)))
  })
  const frequencies = new Map()
  for (const tokens of tokenSets) {
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1)
  }
  const weight = (token) => Math.log(1 + items.length / (frequencies.get(token) ?? items.length))
  const magnitudes = tokenSets.map((tokens) => Math.sqrt(
    [...tokens].reduce((sum, token) => sum + weight(token) ** 2, 0),
  ))
  const questionType = (text) => /吗[？?]?$|能否|可以吗/.test(text)
    ? 'yes-no'
    : /多少|多久|多长|几(?:年|日|米|分|次|岁)|最高|最低|距离/.test(text)
      ? 'number'
      : 'other'
  const answerUnit = (text) => text.match(/周岁|个月|公里\/小时|公里|米|年|日|分|元/)?.[0]

  return items.map((item) => {
    const index = item.id - 1
    const candidates = items
      .filter((other) => other.id !== item.id && !similarAnswer(item.answer, other.answer))
      .map((other) => {
        const otherIndex = other.id - 1
        const left = tokenSets[index]
        const right = tokenSets[otherIndex]
        const shared = [...left].reduce((sum, token) =>
          sum + (right.has(token) ? weight(token) ** 2 : 0), 0)
        const similarity = shared / (magnitudes[index] * magnitudes[otherIndex] || 1)
        return {
          other,
          score: similarity * 10000
            + (other.chapter === item.chapter ? 350 : 0)
            + (questionType(other.question) === questionType(item.question) ? 150 : 0)
            + (answerUnit(item.answer) && answerUnit(other.answer) === answerUnit(item.answer) ? 120 : 0)
            - Math.abs(other.answer.length - item.answer.length) * 2,
        }
      })
      .sort((a, b) => b.score - a.score || a.other.id - b.other.id)
    const distractors = []
    for (const candidate of candidates) {
      if (!distractors.some((chosen) => similarAnswer(chosen.answer, candidate.other.answer))) {
        distractors.push(candidate.other)
      }
      if (distractors.length === 3) break
    }
    if (distractors.length !== 3) throw new Error(`精简题 ${item.id} 无法生成足够选项`)

    const correctPosition = (item.id - 1) % 4
    const optionTexts = distractors.map((candidate) => candidate.answer)
    optionTexts.splice(correctPosition, 0, item.answer)
    return {
      id: item.id,
      question: item.question,
      chapter: item.chapter,
      sourceUrl: '',
      options: optionTexts.map((text, i) => ({ key: 'ABCD'[i], text })),
      answer: 'ABCD'[correctPosition],
      explanation: item.answer,
      images: [],
    }
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const markdown = readFileSync(markdownPath, 'utf8')
  const { questions, imageCount } = parseQuestions(markdown, (path) =>
    existsSync(join(imageRoot, path)),
  )
  if (questions.length !== 1844 || imageCount !== 708) {
    throw new Error(`题库数量不符：${questions.length} 道题、${imageCount} 张题图`)
  }
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, JSON.stringify(questions))
  const compactQuestions = makeCompactChoiceQuestions(
    parseCompactQuestions(readFileSync(compactMarkdownPath, 'utf8')),
  )
  writeFileSync(compactOutputPath, JSON.stringify(compactQuestions))
  const withoutExplanation = questions.filter((question) => !question.explanation).length
  console.log(`已生成全量题库 ${questions.length} 道（题图 ${imageCount} 张、无解析 ${withoutExplanation} 道）和 C1/C2 精简题库 ${compactQuestions.length} 道。`)
}
