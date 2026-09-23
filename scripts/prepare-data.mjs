import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const markdownPath = join(root, 'data', '题库.md')
const outputPath = join(root, 'src', 'generated', 'questions.json')
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
  const withoutExplanation = questions.filter((question) => !question.explanation).length
  console.log(`已生成 ${questions.length} 道题；题图 ${imageCount} 张；无解析 ${withoutExplanation} 道。`)
}
