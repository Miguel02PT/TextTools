import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  Copy,
  Download,
  FileText,
  Hash,
  ListFilter,
  Replace,
  Rows3,
  Search,
  Type,
  Wand2,
} from 'lucide-react'

type Category = 'Writing' | 'Text Cleaning' | 'Text Formatting' | 'Text Analysis'
type ToolId =
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

type Tool = {
  id: ToolId
  name: string
  description: string
  category: Category
  icon: LucideIcon
}

type CaseFormat = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'snake'
type SortMode = 'alphabetical' | 'reverse'

const toolList: Tool[] = [
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, sentences, and reading time in a flash.',
    category: 'Text Analysis',
    icon: Hash,
  },
  {
    id: 'character-counter',
    name: 'Character Counter',
    description: 'Measure character totals and non-space counts instantly.',
    category: 'Text Analysis',
    icon: FileText,
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    description: 'Switch between upper, lower, title, and more.',
    category: 'Text Formatting',
    icon: Type,
  },
  {
    id: 'text-cleaner',
    name: 'Text Cleaner',
    description: 'Trim, normalize spacing, and tidy messy text.',
    category: 'Text Cleaning',
    icon: Wand2,
  },
  {
    id: 'duplicate-lines',
    name: 'Remove Duplicate Lines',
    description: 'Deduplicate repeated lines while keeping the rest intact.',
    category: 'Text Cleaning',
    icon: Rows3,
  },
  {
    id: 'text-sorter',
    name: 'Text Sorter',
    description: 'Arrange lines alphabetically or reverse order.',
    category: 'Text Formatting',
    icon: ListFilter,
  },
  {
    id: 'find-replace',
    name: 'Find & Replace',
    description: 'Update repeated entries across your full text block.',
    category: 'Text Formatting',
    icon: Replace,
  },
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum Generator',
    description: 'Generate instantly usable placeholder text for layouts.',
    category: 'Writing',
    icon: BookOpen,
  },
  {
    id: 'reading-time',
    name: 'Reading Time Calculator',
    description: 'Estimate how long it takes to read your content.',
    category: 'Text Analysis',
    icon: Clock3,
  },
  {
    id: 'keyword-density',
    name: 'Keyword Density Checker',
    description: 'See the most frequent words in your text.',
    category: 'Text Analysis',
    icon: BarChart3,
  },
]

const categories = ['All', 'Writing', 'Text Cleaning', 'Text Formatting', 'Text Analysis'] as const
const categoryColors: Record<Category, string> = {
  Writing: 'bg-[#f0e9ff] text-[#7251ad]',
  'Text Cleaning': 'bg-[#e3f3e9] text-[#408454]',
  'Text Formatting': 'bg-[#e5efff] text-[#4776b5]',
  'Text Analysis': 'bg-slate-100 text-slate-700',
}

const sampleText = `The best tools are the ones that remove friction from everyday work. With TextTools, you can clean, sort, transform, and analyze text without leaving your browser. Whether you are writing a blog post, preparing social content, or refining a draft, the fastest way to work is with clear, simple tools built for focus.`

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'he',
  'her',
  'his',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'there',
  'they',
  'this',
  'to',
  'was',
  'we',
  'with',
  'you',
  'your',
])

const dummyParagraphs = [
  'Clean writing is clear thinking made visible. It helps readers move quickly through ideas without friction.',
  'Good text tools support focus instead of distraction. They make small improvements feel effortless and consistent.',
  'A polished workflow saves time and reduces errors. The right utility can turn raw notes into useful final content.',
]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countWords(text: string) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function formatReadingTime(words: number, seconds: number) {
  if (words === 0) return '0 min 0 sec'
  if (seconds < 60) return 'less than 1 min'
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (word) => {
      const [first, ...rest] = Array.from(word)
      return `${first.toUpperCase()}${rest.join('')}`
    })
}

function toSentenceCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^[\s\S]*?[\p{L}\p{N}]|[.!?]\s+[\p{L}\p{N}])/gu, (match) => {
      const chars = Array.from(match)
      chars[chars.length - 1] = chars[chars.length - 1].toUpperCase()
      return chars.join('')
    })
}

function toCamelCase(text: string) {
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

function toSnakeCase(text: string) {
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

function sortLines(text: string, mode: SortMode) {
  const lines = normalizeText(text).split('\n')
  const sorted = [...lines].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return mode === 'alphabetical' ? sorted.join('\n') : sorted.reverse().join('\n')
}

function getKeywordData(text: string) {
  const tokens = Array.from(
    normalizeText(text).toLowerCase().matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu),
    ([token]) => token,
  )

  const counts = new Map<string, number>()

  for (const token of tokens) {
    if (token.length <= 1 || stopWords.has(token)) continue
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

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('word-counter')
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('All')
  const [search, setSearch] = useState('')
  const [text, setText] = useState(sampleText)
  const [findText, setFindText] = useState('text')
  const [replaceText, setReplaceText] = useState('content')
  const [caseFormat, setCaseFormat] = useState<CaseFormat>('upper')
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical')
  const [paragraphCount, setParagraphCount] = useState(3)
  const [sentenceCount, setSentenceCount] = useState(5)
  const [readingSpeed, setReadingSpeed] = useState(200)
  const [trimCleanerLines, setTrimCleanerLines] = useState(true)
  const [collapseCleanerSpaces, setCollapseCleanerSpaces] = useState(true)
  const [removeExtraBlankLines, setRemoveExtraBlankLines] = useState(true)

  const filteredTools = useMemo(() => {
    return toolList.filter((tool) => {
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory
      const matchesSearch =
        search.trim().length === 0 ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [search, selectedCategory])

  const activeToolInfo =
    toolList.find((tool) => tool.id === activeTool) ?? toolList[0]

  const metrics = useMemo(() => {
    const normalized = normalizeText(text)
    const words = countWords(normalized)
    const characters = normalized.length
    const charactersNoSpaces = normalized.replace(/\s/g, '').length
    const sentences = normalized.split(/[.!?]+/).filter((segment) => segment.trim().length > 0).length
    const paragraphs = normalized
      .split(/\n\s*\n/)
      .filter((segment) => segment.trim().length > 0).length
    const lines = normalized.length === 0 ? 0 : normalized.split('\n').length
    const readingSeconds = words === 0 ? 0 : Math.ceil((words / readingSpeed) * 60)

    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs: paragraphs || (normalized.trim() ? 1 : 0),
      lines,
      readingSeconds,
      keywordData: getKeywordData(normalized),
    }
  }, [readingSpeed, text])

  const transformedText = useMemo(() => {
    switch (activeTool) {
      case 'case-converter':
        if (!text) return ''
        if (caseFormat === 'upper') return text.toUpperCase()
        if (caseFormat === 'lower') return text.toLowerCase()
        if (caseFormat === 'title') return toTitleCase(text)
        if (caseFormat === 'sentence') return toSentenceCase(text)
        if (caseFormat === 'camel') return toCamelCase(text)
        if (caseFormat === 'snake') return toSnakeCase(text)
        return text

      case 'text-cleaner': {
        if (!text) return ''

        let lines = normalizeText(text).split('\n')
        if (trimCleanerLines) {
          lines = lines.map((line) => line.replace(/^[ \t]+|[ \t]+$/g, ''))
        }
        if (collapseCleanerSpaces) {
          lines = lines.map((line) => line.replace(/[ \t]{2,}/g, ' '))
        }

        let cleaned = lines.join('\n')
        if (removeExtraBlankLines) {
          cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
        }
        return cleaned.trim()
      }

      case 'duplicate-lines': {
        const lines = normalizeText(text).split('\n')
        const uniqueLines = Array.from(new Set(lines))
        return uniqueLines.join('\n')
      }

      case 'text-sorter':
        return sortLines(text, sortMode)

      case 'find-replace': {
        if (!findText) return text
        return text.replace(new RegExp(escapeRegExp(findText), 'gi'), replaceText)
      }

      case 'lorem-ipsum': {
        const generated: string[] = []

        for (let index = 0; index < paragraphCount; index += 1) {
          const words = Array.from({ length: sentenceCount }, (_, sentenceIndex) => {
            const base = dummyParagraphs[sentenceIndex % dummyParagraphs.length]
            return base
          })

          generated.push(words.join(' '))
        }

        return generated.join('\n\n')
      }

      case 'reading-time':
        return text

      case 'keyword-density':
        return text

      default:
        return text
    }
  }, [
    activeTool,
    caseFormat,
    collapseCleanerSpaces,
    findText,
    paragraphCount,
    removeExtraBlankLines,
    replaceText,
    sentenceCount,
    sortMode,
    text,
    trimCleanerLines,
  ])

  const outputContent = useMemo(() => {
    switch (activeTool) {
      case 'word-counter':
        return [
          `Words: ${metrics.words}`,
          `Characters: ${metrics.characters}`,
          `Characters without spaces: ${metrics.charactersNoSpaces}`,
          `Sentences: ${metrics.sentences}`,
          `Paragraphs: ${metrics.paragraphs}`,
        ].join('\n')
      case 'character-counter':
        return [
          `Characters: ${metrics.characters}`,
          `Characters without spaces: ${metrics.charactersNoSpaces}`,
          `Lines: ${metrics.lines}`,
          `Words: ${metrics.words}`,
        ].join('\n')
      case 'reading-time': {
        const time = formatReadingTime(metrics.words, metrics.readingSeconds)
        return [
          `Words: ${metrics.words}`,
          `Reading speed: ${readingSpeed} wpm`,
          `Estimated reading time: ${time}`,
        ].join('\n')
      }
      case 'keyword-density':
        return [
          `Total words: ${metrics.keywordData.totalWords}`,
          'Top keywords (count and percentage of total words):',
          ...(metrics.keywordData.entries.length
            ? metrics.keywordData.entries.map(
                ({ word, count, percentage }, index) =>
                  `${index + 1}. ${word}: ${count} (${percentage.toFixed(1)}%)`,
              )
            : ['No keywords found.']),
        ].join('\n')
      default:
        return transformedText || text
    }
  }, [activeTool, metrics, readingSpeed, text, transformedText])

  const copyText = async () => {
    const contentToCopy = outputContent
    try {
      await navigator.clipboard.writeText(contentToCopy)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = contentToCopy
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  const downloadText = () => {
    const content = outputContent
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${activeToolInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderControls = () => {
    switch (activeTool) {
      case 'case-converter': {
        const labels: Record<CaseFormat, string> = {
          upper: 'UPPERCASE',
          lower: 'lowercase',
          title: 'Title Case',
          sentence: 'Sentence case',
          camel: 'camelCase',
          snake: 'snake_case',
        }
        return (
          <div className="flex flex-wrap gap-2">
            {(['upper', 'lower', 'title', 'sentence', 'camel', 'snake'] as CaseFormat[]).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setCaseFormat(format)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  caseFormat === format
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {labels[format]}
              </button>
            ))}
          </div>
        )
      }

      case 'find-replace':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Find
              <input
                value={findText}
                onChange={(event) => setFindText(event.target.value)}
                placeholder="Find text"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Replace with
              <input
                value={replaceText}
                onChange={(event) => setReplaceText(event.target.value)}
                placeholder="Replace with"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>
        )

      case 'text-sorter':
        return (
          <div className="flex flex-wrap gap-2">
            {(['alphabetical', 'reverse'] as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  sortMode === mode
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {mode === 'alphabetical' ? 'Alphabetical' : 'Reverse'}
              </button>
            ))}
          </div>
        )

      case 'lorem-ipsum':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Paragraphs
              <input
                type="number"
                min={1}
                max={12}
                value={paragraphCount}
                onChange={(event) => setParagraphCount(Number(event.target.value) || 1)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Sentences per paragraph
              <input
                type="number"
                min={1}
                max={10}
                value={sentenceCount}
                onChange={(event) => setSentenceCount(Number(event.target.value) || 1)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>
        )

      case 'reading-time':
        return (
          <label className="space-y-3 text-sm font-medium text-slate-700">
            Reading speed: {readingSpeed} wpm
            <input
              type="range"
              min={100}
              max={500}
              step={10}
              value={readingSpeed}
              onChange={(event) => setReadingSpeed(Number(event.target.value))}
              className="w-full accent-slate-900"
            />
          </label>
        )

      case 'text-cleaner':
        return (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {[
              {
                label: 'Trim lines',
                checked: trimCleanerLines,
                onChange: setTrimCleanerLines,
              },
              {
                label: 'Collapse extra spaces',
                checked: collapseCleanerSpaces,
                onChange: setCollapseCleanerSpaces,
              },
              {
                label: 'Remove extra blank lines',
                checked: removeExtraBlankLines,
                onChange: setRemoveExtraBlankLines,
              },
            ].map(({ label, checked, onChange }) => (
              <label key={label} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                {label}
              </label>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6fa] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
              T
            </div>
            <p className="text-lg font-semibold tracking-[-0.05em] text-slate-900">TextTools</p>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6">
            <a href="#tools" className="hover:text-slate-900">Tools</a>
            <a href="#categories" className="hidden hover:text-slate-900 sm:inline">Categories</a>
            <a href="#search-tools" className="hidden hover:text-slate-900 sm:inline">Search</a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl bg-[#f0eef8] px-5 py-9 text-center sm:px-8 sm:py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            TextTools
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
            The text tools you need, all in one place
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-base text-slate-600">
            Count, clean, format, and analyze text with free tools that work in your browser.
          </p>
        </section>

        <section id="tools" className="scroll-mt-20 py-7">
          <div className="mb-5 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div id="categories" className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  aria-pressed={selectedCategory === category}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    selectedCategory === category
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-500 hover:text-slate-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <label id="search-tools" className="flex w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 sm:max-w-xs">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Search tools</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tools"
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredTools.map((tool) => {
              const Icon = tool.icon

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool.id)
                    document.getElementById('toolbox')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="group min-h-36 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_5px_16px_rgba(30,41,59,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:min-h-40 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-md sm:h-10 sm:w-10 ${categoryColors[tool.category]}`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-900 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                  </div>
                  <h2 className="mt-3 text-base font-semibold leading-6 text-slate-900 sm:mt-4">{tool.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{tool.description}</p>
                </button>
              )
            })}
          </div>
          {filteredTools.length === 0 ? (
            <p className="border-b border-slate-200 py-6 text-sm text-slate-500">
              No tools found. Try a different search.
            </p>
          ) : null}
        </section>

        <section id="toolbox" className="scroll-mt-24 py-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{activeToolInfo.category}</p>
              <h2 className="mt-1 text-2xl font-medium tracking-tight text-slate-900">{activeToolInfo.name}</h2>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">{activeToolInfo.category}</p>
                <p className="mt-1 text-base text-slate-600">{activeToolInfo.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyText}
                  title="Copy the output content"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadText}
                  title="Download the output content"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Input text
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={12}
                    placeholder="Paste or type your text here..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>

                <div className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Output</span>
                  <div className="min-h-[288px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-700">
                    <pre className="h-full min-h-[252px] whitespace-pre-wrap break-words font-sans">
                      {activeTool === 'text-cleaner' || activeTool === 'case-converter'
                        ? transformedText
                        : outputContent || 'Your transformed text will appear here.'}
                    </pre>
                  </div>
                </div>
              </div>

              {renderControls()}

              {activeTool === 'word-counter' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Words</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.words}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Characters</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.characters}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">No spaces</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.charactersNoSpaces}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Sentences</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.sentences}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Paragraphs</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.paragraphs}</p>
                  </div>
                </div>
              ) : null}

              {activeTool === 'character-counter' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Characters</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.characters}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">No spaces</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.charactersNoSpaces}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Lines</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.lines}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Words</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.words}</p>
                  </div>
                </div>
              ) : null}

              {activeTool === 'reading-time' ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Estimated reading time</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {formatReadingTime(metrics.words, metrics.readingSeconds)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {metrics.words} words at {readingSpeed} words per minute
                  </p>
                </div>
              ) : null}

              {activeTool === 'keyword-density' ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-700">Rank</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Keyword</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Count</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Density</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {metrics.keywordData.entries.length ? (
                        metrics.keywordData.entries.map(({ word, count, percentage }, index) => (
                          <tr key={word}>
                            <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{word}</td>
                            <td className="px-4 py-3 text-slate-600">{count}</td>
                            <td className="px-4 py-3 text-slate-600">{percentage.toFixed(1)}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-3 text-slate-500" colSpan={4}>
                            No keywords found. Add text to calculate keyword density.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

export default App
