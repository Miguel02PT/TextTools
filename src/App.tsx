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

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toSentenceCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase())
}

function toCamelCase(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+|-/)
    .filter(Boolean)

  if (!words.length) return ''

  return words
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('')
}

function toSnakeCase(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function sortLines(text: string, mode: SortMode) {
  const lines = normalizeText(text).split('\n')
  const sorted = [...lines].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return mode === 'alphabetical' ? sorted.join('\n') : sorted.reverse().join('\n')
}

function getKeywordData(text: string) {
  const tokens = normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token))

  const counts = new Map<string, number>()

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
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
    const readingMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / readingSpeed))

    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs: paragraphs || (normalized.trim() ? 1 : 0),
      readingMinutes,
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
        const cleaned = normalizeText(text)
          .replace(/\s+/g, ' ')
          .replace(/\n\s+/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
        return cleaned
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
  }, [activeTool, caseFormat, findText, paragraphCount, replaceText, sentenceCount, sortMode, text])

  const copyText = async () => {
    const contentToCopy = transformedText || text
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
    const content = transformedText || text
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
      case 'case-converter':
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
                {format}
              </button>
            ))}
          </div>
        )

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

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
              T
            </div>
            <div>
              <p className="text-xl font-medium tracking-[-0.05em] text-slate-900">TextTools</p>
            </div>
          </div>

          <div className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#tools" className="transition hover:text-slate-900">Tools</a>
            <a href="#categories" className="transition hover:text-slate-900">Categories</a>
            <a href="#toolbox" className="transition hover:text-slate-900">Search</a>
          </div>

          <button
            type="button"
            onClick={() => document.getElementById('toolbox')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open toolbox
            <ArrowRight className="h-4 w-4" />
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="border-b border-slate-200 pb-6 pt-2">
          <p className="mb-2 text-sm text-slate-500">Free online text utilities</p>
          <h1 className="text-3xl font-medium tracking-[-0.05em] text-slate-900 sm:text-4xl">
            Text tools
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Quick tools to count, clean, format, and analyze text.
          </p>
        </section>

        <section id="tools" className="py-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-slate-900">All tools</h2>
              <p className="mt-1 text-sm text-slate-500">Choose a tool to get started.</p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 sm:max-w-xs">
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

          <div id="categories" className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`border-b-2 px-3 py-2 text-sm transition ${
                  selectedCategory === category
                    ? 'border-slate-900 font-medium text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid gap-x-8 md:grid-cols-2">
            {filteredTools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(tool.id)}
                  className={`group flex items-start gap-3 border-b border-slate-200 py-4 text-left transition ${
                    isActive
                      ? 'text-slate-900'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium">{tool.name}</h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{tool.description}</p>
                  </div>
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

        <section id="toolbox" className="py-8">
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
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadText}
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
                      {activeTool === 'keyword-density'
                        ? metrics.keywordData.length
                          ? metrics.keywordData
                              .map(([word, count], index) => `${index + 1}. ${word}: ${count}`)
                              .join('\n')
                          : 'No keywords to display yet.'
                        : transformedText || 'Your transformed text will appear here.'}
                    </pre>
                  </div>
                </div>
              </div>

              {renderControls()}

              {activeTool === 'word-counter' || activeTool === 'character-counter' ? (
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
                    <p className="text-sm text-slate-500">Reading time</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.readingMinutes} min</p>
                  </div>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {metrics.keywordData.length ? (
                        metrics.keywordData.map(([keyword, count], index) => (
                          <tr key={keyword}>
                            <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{keyword}</td>
                            <td className="px-4 py-3 text-slate-600">{count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-3 text-slate-500" colSpan={3}>
                            Add some text to calculate keyword density.
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
