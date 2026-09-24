import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const markdownPath = join(root, 'data', '题库.md')
const outputPath = join(root, 'public', 'data', 'catalog.json')
const versionPath = join(root, 'src', 'generated', 'catalog-version.json')
const compactMarkdownPath = join(root, 'data', '科目一_C1C2_原题精选300.md')
const imageRoot = join(root, 'public')

// The user restored original question 342 for the new selected bank. Keep the
// conflicting 341 and its motorcycle duplicate 3554 out of the published data.
// The extra motorcycle copy of question 342 (3555) remains excluded.
export const excludedFullIds = new Set([341, 3554, 3555])

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

export function parseSelectedQuestions(markdown, fullQuestions, imageExists = () => true) {
  const matches = [...markdown.matchAll(/^### (\d{3})\. (.+)$/gm)]
  const chapters = [...markdown.matchAll(/^## (.+)$/gm)]
  const byId = new Map(fullQuestions.map((question) => [question.id, question]))
  const selected = []
  const seen = new Set()
  let chapterIndex = 0

  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index]
    while (chapters[chapterIndex + 1]?.index < heading.index) chapterIndex += 1
    const chapter = chapters[chapterIndex]?.[1]
    const body = markdown.slice(heading.index + heading[0].length, matches[index + 1]?.index ?? markdown.length)
    const meta = body.match(/^原题号：(\d+) · \[查看原题\]\((https:\/\/[^)]+)\)$/m)
    const id = Number(meta?.[1])
    const source = byId.get(id)
    const options = [...body.matchAll(/^- ([A-D])、(.+)$/gm)].map((match) => ({ key: match[1], text: match[2].trim() }))
    const answer = body.match(/^\*\*答案：([A-D])、(.+)\*\*$/m)
    const images = [...body.matchAll(/^!\[[^\]]*\]\((images\/[^)]+)\)$/gm)].map((match) => match[1])

    if (Number(heading[1]) !== index + 1 || !source || seen.has(id) || !chapter || !meta) {
      throw new Error(`精选题 ${index + 1} 缺少有效且唯一的原题号或章节`)
    }
    if (source.question !== heading[2].trim() || source.sourceUrl !== meta[2] ||
        JSON.stringify(source.options) !== JSON.stringify(options) ||
        source.answer !== answer?.[1] || source.options.find((option) => option.key === source.answer)?.text !== answer?.[2] ||
        JSON.stringify(source.images) !== JSON.stringify(images)) {
      throw new Error(`精选题 ${index + 1} 与原题 ${id} 的题干、选项、答案、链接或配图不一致`)
    }
    if (images.some((image) => !imageExists(image))) throw new Error(`精选题 ${id} 的题图不存在`)
    seen.add(id)
    selected.push({ id, chapter: `C1/C2 精选 · ${chapter}` })
  }

  if (selected.length !== 300) throw new Error(`精选题数量不符：${selected.length}`)
  return selected
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
  const publishedQuestions = questions.filter((question) => !excludedFullIds.has(question.id))
  const compactQuestions = parseSelectedQuestions(
    readFileSync(compactMarkdownPath, 'utf8'), questions,
    (image) => existsSync(join(imageRoot, image)),
  )
  if (compactQuestions.some((question) => excludedFullIds.has(question.id))) {
    throw new Error('精选题包含网页已排除的原题')
  }
  const payload = { questions: publishedQuestions, selected: compactQuestions }
  const version = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
  writeFileSync(outputPath, JSON.stringify({ version, ...payload }))
  mkdirSync(dirname(versionPath), { recursive: true })
  writeFileSync(versionPath, JSON.stringify({ version }))
  const withoutExplanation = publishedQuestions.filter((question) => !question.explanation).length
  console.log(`已生成全量题库 ${publishedQuestions.length} 道（题图 ${imageCount} 张、无解析 ${withoutExplanation} 道）及其 C1/C2 精选子集 ${compactQuestions.length} 道。`)
}
