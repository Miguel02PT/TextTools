export type Locale = 'en' | 'zh-CN'
export type CaseFormat = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'snake'
export type SortMode = 'az' | 'za' | 'reverse'
export type ToolId =
  | 'word-counter'
  | 'character-counter'
  | 'case-converter'
  | 'text-cleaner'
  | 'duplicate-lines'
  | 'text-sorter'
  | 'find-replace'
  | 'lorem-ipsum'
  | 'reading-time'
  | 'keyword-density'

export type KeywordEntry = {
  word: string
  count: number
  percentage: number
}

export type KeywordData = {
  totalWords: number
  entries: KeywordEntry[]
}

export type ToolMetrics = {
  words: number
  characters: number
  charactersNoSpaces: number
  sentences: number
  paragraphs: number
  lines: number
  readingSeconds: number
  keywordData: KeywordData
}

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has',
  'have', 'he', 'her', 'his', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
  'the', 'their', 'there', 'they', 'this', 'to', 'was', 'we', 'with', 'you', 'your',
])
const chineseStopWords = new Set([
  '我们', '你们', '他们', '这个', '那个', '一个', '一些', '以及', '因为', '所以',
  '但是', '如果', '可以', '进行', '使用', '通过', '对于', '已经', '没有', '不是',
  '什么', '如何', '和', '与', '在', '是', '有', '了', '的', '地', '得', '而',
  '或', '及', '把', '被', '为', '从', '到', '对', '中', '上', '下',
])
const chineseWordSegmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const sentenceSegmenters: Record<Locale, Intl.Segmenter> = {
  en: new Intl.Segmenter('en', { granularity: 'sentence' }),
  'zh-CN': new Intl.Segmenter('zh-CN', { granularity: 'sentence' }),
}

const loremWords = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit',
  'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat',
  'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
  'mollit', 'anim', 'id', 'est', 'laborum',
]

export function countWords(text: string, locale: Locale = 'en') {
  if (!text.trim()) return 0
  if (locale === 'zh-CN') {
    return [...chineseWordSegmenter.segment(text)].filter((segment) => segment.isWordLike).length
  }
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function countGraphemes(text: string) {
  let count = 0
  for (const _segment of graphemeSegmenter.segment(text)) count += 1
  return count
}

export function countSentences(text: string, locale: Locale = 'en') {
  if (!text.trim()) return 0

  let count = 0
  let pending = ''
  for (const { segment } of sentenceSegmenters[locale].segment(text)) {
    pending += segment
    if (/[.!?。！？…]["'’”»)\]}]*\s*$/u.test(segment)) {
      if (/[\p{L}\p{N}]/u.test(pending)) count += 1
      pending = ''
    }
  }
  if (/[\p{L}\p{N}]/u.test(pending)) count += 1
  return count
}

export function formatReadingTime(words: number, seconds: number) {
  if (words === 0) return '0 min 0 sec'
  if (seconds < 60) return 'less than 1 min'
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`
}

export function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (word) => {
      const [first, ...rest] = Array.from(word)
      return `${first.toUpperCase()}${rest.join('')}`
    })
}

export function toSentenceCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^[\s\S]*?[\p{L}\p{N}]|[.!?]\s+[\p{L}\p{N}])/gu, (match) => {
      const chars = Array.from(match)
      chars[chars.length - 1] = chars[chars.length - 1].toUpperCase()
      return chars.join('')
    })
}

export function toCamelCase(text: string) {
  return normalizeText(text)
    .split('\n')
    .map((line) => {
      const words = line.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
      return words
        .map((word, index) => {
          if (index === 0) return word
          const [first, ...rest] = Array.from(word)
          return `${first.toUpperCase()}${rest.join('')}`
        })
        .join('')
    })
    .join('\n')
}

export function toSnakeCase(text: string) {
  return normalizeText(text)
    .split('\n')
    .map((line) =>
      line
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .join('_'),
    )
    .join('\n')
}

export function convertCase(text: string, format: CaseFormat) {
  switch (format) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'title':
      return toTitleCase(text)
    case 'sentence':
      return toSentenceCase(text)
    case 'camel':
      return toCamelCase(text)
    case 'snake':
      return toSnakeCase(text)
  }
}

export function cleanText(
  text: string,
  trimLines: boolean,
  collapseSpaces: boolean,
  removeExtraBlankLines: boolean,
) {
  if (!text) return ''

  let lines = normalizeText(text).split('\n')
  if (trimLines) {
    lines = lines.map((line) => line.replace(/^[ \t]+|[ \t]+$/g, ''))
  }
  if (collapseSpaces) {
    lines = lines.map((line) => line.replace(/[ \t]{2,}/g, ' '))
  }

  let cleaned = lines.join('\n')
  if (removeExtraBlankLines) {
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  }
  return cleaned.trim()
}

export function removeDuplicateLines(text: string) {
  const lines = normalizeText(text).split('\n')
  return Array.from(new Set(lines)).join('\n')
}

export function sortLines(
  text: string,
  mode: SortMode,
  naturalNumberOrder: boolean,
  removeEmptyLines: boolean,
  locale: Locale,
) {
  if (!text) return ''

  let lines = normalizeText(text).split('\n')
  if (removeEmptyLines) {
    lines = lines.filter((line) => line.trim().length > 0)
  }
  if (mode === 'reverse') {
    return lines.reverse().join('\n')
  }

  const sorted = [...lines].sort((a, b) =>
    a.localeCompare(b, locale, { sensitivity: 'base', numeric: naturalNumberOrder }),
  )
  if (mode === 'za') sorted.reverse()
  return sorted.join('\n')
}

export function replaceMatches(
  text: string,
  findText: string,
  replaceText: string,
  matchCase: boolean,
  wholeWord: boolean,
) {
  if (!findText) return { text, count: 0 }

  const term = escapeRegExp(findText)
  const pattern = wholeWord ? `(?<![\\p{L}\\p{N}_])${term}(?![\\p{L}\\p{N}_])` : term
  const flags = `${matchCase ? '' : 'i'}gu`
  const count = text.match(new RegExp(pattern, flags))?.length ?? 0
  const replacedText = text.replace(new RegExp(pattern, flags), () => replaceText)
  return { text: replacedText, count }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function generateLoremSentence(paragraphIndex: number, sentenceIndex: number) {
  const seed =
    Math.imul(paragraphIndex + 1, 0x85ebca6b) ^
    Math.imul(sentenceIndex + 1, 0xc2b2ae35)
  const random = createSeededRandom(seed)
  const wordCount = 8 + Math.floor(random() * 9)
  const words = Array.from({ length: wordCount }, (_, index) => {
    if (index === 0) {
      return loremWords[(paragraphIndex * 11 + sentenceIndex * 7) % loremWords.length]
    }
    return loremWords[Math.floor(random() * loremWords.length)]
  })

  if (wordCount >= 10 && random() < 0.35) {
    const commaIndex = 4 + Math.floor(random() * (wordCount - 5))
    words[commaIndex] += ','
  }

  const [first, ...rest] = words
  return `${first.charAt(0).toUpperCase()}${first.slice(1)} ${rest.join(' ')}.`
}

export function generateLoremText(
  paragraphCount: number,
  sentenceCount: number,
  startWithLorem: boolean,
) {
  return Array.from({ length: paragraphCount }, (_, paragraphIndex) => {
    const sentences = Array.from({ length: sentenceCount }, (_, sentenceIndex) => {
      if (startWithLorem && paragraphIndex === 0 && sentenceIndex === 0) {
        return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      }
      return generateLoremSentence(paragraphIndex, sentenceIndex)
    })
    return sentences.join(' ')
  }).join('\n\n')
}

export function getKeywordData(text: string, locale: Locale): KeywordData {
  const normalized = normalizeText(text).toLowerCase()
  const tokens =
    locale === 'zh-CN'
      ? [...chineseWordSegmenter.segment(normalized)]
          .filter((segment) => segment.isWordLike)
          .map((segment) => segment.segment)
      : Array.from(normalized.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu), ([token]) => token)

  const counts = new Map<string, number>()
  for (const token of tokens) {
    if (
      (locale === 'en' && token.length <= 1) ||
      (locale === 'en' ? stopWords.has(token) : chineseStopWords.has(token))
    ) continue
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return {
    totalWords: tokens.length,
    entries: [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        percentage: tokens.length === 0 ? 0 : (count / tokens.length) * 100,
      })),
  }
}

export function computeMetrics(text: string, locale: Locale, readingSpeed: number): ToolMetrics {
  const normalized = normalizeText(text)
  const words = countWords(normalized, locale)
  const characters = countGraphemes(normalized)
  const charactersNoSpaces = countGraphemes(normalized.replace(/\s/gu, ''))
  const sentences = countSentences(normalized, locale)
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .filter((segment) => segment.trim().length > 0).length
  const lines = normalized.length === 0 ? 0 : normalized.split('\n').length
  const readingUnits = locale === 'zh-CN'
    ? Array.from(normalized.replace(/[\s\p{P}\p{S}]/gu, '')).length
    : words
  const readingSeconds =
    readingUnits === 0 ? 0 : Math.ceil((readingUnits / readingSpeed) * 60)

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs: paragraphs || (normalized.trim() ? 1 : 0),
    lines,
    readingSeconds,
    keywordData: getKeywordData(normalized, locale),
  }
}

export function getToolOutputContent(
  tool: ToolId,
  transformedText: string,
  metrics: ToolMetrics,
  readingSpeed: number,
  locale: Locale,
  labels?: Record<string, string>,
) {
  const label = (key: string, fallback: string) => labels?.[key] ?? fallback
  switch (tool) {
    case 'word-counter':
      return [
        `${label('wordCount', 'Words')}: ${metrics.words}`,
        `${label('characters', 'Characters')}: ${metrics.characters}`,
        `${label('withoutWhitespace', 'Characters without whitespace')}: ${metrics.charactersNoSpaces}`,
        `${label('sentences', 'Sentences')}: ${metrics.sentences}`,
        `${label('paragraphs', 'Paragraphs')}: ${metrics.paragraphs}`,
      ].join('\n')
    case 'character-counter':
      return [
        `${label('characters', 'Characters')}: ${metrics.characters}`,
        `${label('withoutWhitespace', 'Characters without whitespace')}: ${metrics.charactersNoSpaces}`,
        `${label('lines', 'Lines')}: ${metrics.lines}`,
        `${label('wordCount', 'Words')}: ${metrics.words}`,
      ].join('\n')
    case 'reading-time': {
      const time = formatReadingTime(metrics.words, metrics.readingSeconds)
      return [
        `${label('wordCount', 'Words')}: ${metrics.words}`,
        `${label('readingSpeed', 'Reading speed')}: ${readingSpeed} ${locale === 'zh-CN' ? '字/分钟' : 'wpm'}`,
        `${locale === 'zh-CN' ? '预计阅读时间' : 'Estimated reading time'}: ${time}`,
      ].join('\n')
    }
    case 'keyword-density':
      return [
        `${label('totalWords', 'Total words')}: ${metrics.keywordData.totalWords}`,
        label('topKeywords', 'Top keywords (count and percentage of total words):'),
        ...(metrics.keywordData.entries.length
          ? metrics.keywordData.entries.map(
              ({ word, count, percentage }, index) =>
                `${index + 1}. ${word}: ${count} (${percentage.toFixed(1)}%)`,
            )
          : [label('noKeywords', 'No keywords found.')]),
      ].join('\n')
    default:
      return transformedText
  }
}

export type RouteKind = 'home' | 'tool' | 'information' | 'blog-index' | 'blog-post' | 'not-found'

export function resolveRouteKind(
  relativePath: string,
  toolIds: readonly string[],
  informationSlugs: readonly string[],
  blogSlugs: readonly string[],
): RouteKind {
  if (relativePath === '' || relativePath === 'index.html') return 'home'
  if (relativePath === 'blog' || relativePath === 'blog/') return 'blog-index'

  const toolSlug = relativePath.match(/^tools\/([^/]+)\/?$/)?.[1]
  if (toolSlug && toolIds.includes(toolSlug)) return 'tool'

  const informationSlug = relativePath.match(/^(faq|about|privacy|terms|contact|report-bug)\/?$/)?.[1]
  if (informationSlug && informationSlugs.includes(informationSlug)) return 'information'

  const blogSlug = relativePath.match(/^blog\/([^/]+)\/?$/)?.[1]
  if (blogSlug && blogSlugs.includes(blogSlug)) return 'blog-post'

  return 'not-found'
}
