import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Grid2X2,
  Hash,
  ListFilter,
  Replace,
  Rows3,
  Search,
  Type,
  Wand2,
  X,
} from 'lucide-react'
import importedToolGuides from './tool-pages.json'
import importedChinese from './zh-CN.json'
import importedBlogPosts from './blog-posts.json'
import { createGoogleAnalyticsCommand } from './google-analytics'
import {
  sendToolAnalyticsEvent,
  type ToolAnalyticsEvent,
} from './analytics'
import {
  cleanText,
  computeMetrics,
  convertCase,
  formatReadingTime,
  generateLoremText,
  getToolOutputContent,
  removeDuplicateLines,
  replaceMatches,
  resolveRouteKind,
  sortLines,
  type CaseFormat,
  type SortMode,
  type ToolId,
} from './tool-logic'

type Category = 'Writing' | 'Text Cleaning' | 'Text Formatting' | 'Text Analysis'

type Tool = {
  id: ToolId
  name: string
  description: string
  category: Category
  icon: LucideIcon
}

type ToolGuide = {
  id: string
  heading: string
  intro: string
  sections: {
    heading: string
    paragraphs: string[]
    bullets?: string[]
    example?: {
      input: string
      output: string
    }
  }[]
  faqs: {
    question: string
    answer: string
  }[]
}
type LocalizedToolGuide = Omit<ToolGuide, 'id'> & {
  name: string
  description: string
  title: string
  meta: string
}
type BlogSection = {
  heading: string
  paragraphs: string[]
  examples?: { text: string; count: number; explanation: string }[]
}
type BlogPost = {
  slug: string
  published: string
  modified?: string
  title: string
  description: string
  summary: string
  image: string
  imageAlt: string
  sections: BlogSection[]
}

const GA_MEASUREMENT_ID = 'G-CDBK2W6TB0'
const ANALYTICS_CONSENT_STORAGE_KEY = 'texttools-ga4-consent'
const GOOGLE_ANALYTICS_SCRIPT_ID = 'google-analytics-script'
const ANALYTICS_CONSENT_CHANGE_EVENT = 'texttools-analytics-consent-change'

type AnalyticsConsent = 'accepted' | 'rejected' | null
let analyticsConsentMemoryFallback: AnalyticsConsent = null
let analyticsConsentStorageUnavailable = false

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    [key: `ga-disable-${string}`]: boolean | undefined
  }
}

function getAnalyticsConsentSnapshot(): AnalyticsConsent {
  if (analyticsConsentStorageUnavailable) return analyticsConsentMemoryFallback

  try {
    const storedConsent = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    return storedConsent === 'accepted' || storedConsent === 'rejected'
      ? storedConsent
      : null
  } catch (error) {
    analyticsConsentStorageUnavailable = true
    console.error('Unable to read the Google Analytics consent preference.', error)
    return analyticsConsentMemoryFallback
  }
}

function getServerAnalyticsConsentSnapshot(): AnalyticsConsent {
  return null
}

function subscribeToAnalyticsConsent(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange)
  }
}

function saveAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>) {
  analyticsConsentMemoryFallback = consent

  if (!analyticsConsentStorageUnavailable) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent)
    } catch (error) {
      analyticsConsentStorageUnavailable = true
      console.error('Unable to save the Google Analytics consent preference.', error)
    }
  }

  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGE_EVENT))
}

function clearGoogleAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((name) => name === '_ga' || name.startsWith('_ga_'))

  for (const cookieName of cookieNames) {
    const domains = [undefined, window.location.hostname, `.${window.location.hostname}`]
    for (const domain of domains) {
      const domainAttribute = domain ? `; domain=${domain}` : ''
      document.cookie = `${cookieName}=; max-age=0; path=/${domainAttribute}; SameSite=Lax`
    }
  }
}

function loadGoogleAnalytics() {
  if (document.getElementById(GOOGLE_ANALYTICS_SCRIPT_ID)) return

  const dataLayer = window.dataLayer ?? []
  window.dataLayer = dataLayer
  const gtag = createGoogleAnalyticsCommand(dataLayer)
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_MEASUREMENT_ID)

  const script = document.createElement('script')
  script.id = GOOGLE_ANALYTICS_SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

const toolList: Tool[] = [
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, sentences, and paragraphs in a flash.',
    category: 'Text Analysis',
    icon: Hash,
  },
  {
    id: 'character-counter',
    name: 'Character Counter',
    description: 'Count characters, including whitespace, lines, and words.',
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
const currentYear = new Date().getFullYear()
const toolGuides: ToolGuide[] = importedToolGuides
const chinese = importedChinese as {
  site: Record<string, string>
  tools: Record<ToolId, LocalizedToolGuide>
  blog: {
    title: string
    description: string
    intro: string
    posts: Record<string, Omit<BlogPost, 'slug' | 'published'>>
  }
}
const blogPosts: BlogPost[] = importedBlogPosts
const informationPages = [
  { slug: 'faq', title: 'Frequently asked questions', label: 'FAQ' },
  { slug: 'about', title: 'About TextToools', label: 'About us' },
  { slug: 'privacy', title: 'Privacy', label: 'Privacy' },
  { slug: 'terms', title: 'Terms and conditions', label: 'Terms' },
  { slug: 'contact', title: 'Contact us', label: 'Contact us' },
  { slug: 'report-bug', title: 'Report a bug', label: 'Report a bug' },
] as const
const commonFaqs = [
  {
    question: 'Is TextToools free to use?',
    answer: 'Yes. The text tools are available to use in your browser without an account.',
  },
  {
    question: 'Is my text uploaded?',
    answer:
      'The text transformations and calculations run in your browser. Text entered into a tool is not sent to a TextToools server for processing.',
  },
  {
    question: 'How do I use a tool?',
    answer:
      'Choose a tool from the home page. Each tool has its own page with the controls, an explanation, examples where useful, and answers to tool-specific questions.',
  },
  {
    question: 'Can I suggest a tool or report a problem?',
    answer:
      'Yes. Use the Contact us or Report a bug form. Form delivery is not enabled yet, so submissions cannot be sent until a secure form service is configured.',
  },
]
const categoryColors: Record<Category, string> = {
  Writing: 'bg-[#f0e9ff] text-[#7251ad]',
  'Text Cleaning': 'bg-[#e3f3e9] text-[#408454]',
  'Text Formatting': 'bg-[#e5efff] text-[#4776b5]',
  'Text Analysis': 'bg-slate-100 text-slate-700',
}

function clampGeneratorCount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(10, Math.max(1, Math.trunc(parsed)))
}

function FeedbackForm({ kind, isChineseLocale }: { kind: 'contact' | 'bug'; isChineseLocale: boolean }) {
  const [submissionMessage, setSubmissionMessage] = useState('')
  const formEndpoint = import.meta.env.VITE_CONTACT_FORM_ENDPOINT
  const text = isChineseLocale ? chinese.site : undefined

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formEndpoint) return

    const form = event.currentTarget
    setSubmissionMessage(text?.sending ?? 'Sending...')

    try {
      const response = await fetch(formEndpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: kind,
          page: window.location.href,
          ...Object.fromEntries(new FormData(form)),
        }),
      })
      if (!response.ok) throw new Error(`Form service returned ${response.status}`)
      form.reset()
      setSubmissionMessage(text?.sent ?? 'Thanks — your message has been sent.')
    } catch (error) {
      console.error('Unable to submit the contact form.', error)
      setSubmissionMessage(text?.sendFailed ?? 'We could not send your message. Please try again later.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          {text?.name ?? 'Name'} <span className="font-normal text-slate-400">({text?.optional ?? 'optional'})</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          {text?.email ?? 'Email for a reply'}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">
        {text?.subject ?? 'Subject'}
        <input
          name="subject"
          type="text"
          required
          defaultValue={kind === 'bug' ? (isChineseLocale ? '问题反馈' : 'Bug report') : ''}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">
        {text?.message ?? 'Message'}
        <textarea
          name="message"
          required
          rows={6}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </label>
      {!formEndpoint ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          {text?.formNotConfigured ?? 'Message sending is not configured yet. Nothing entered here will be sent or stored.'}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!formEndpoint}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {text?.sendMessage ?? 'Send message'}
      </button>
      {submissionMessage ? (
        <p role="status" className="text-sm text-slate-600">
          {submissionMessage}
        </p>
      ) : null}
    </form>
  )
}

function App() {
  const basePath = import.meta.env.BASE_URL
  const pathWithinBase = window.location.pathname.startsWith(basePath)
    ? window.location.pathname.slice(basePath.length)
    : window.location.pathname.replace(/^\/+/, '')
  const [locale] = useState<'en' | 'zh-CN'>(() =>
    pathWithinBase.startsWith('zh-cn/') ? 'zh-CN' : 'en',
  )
  const isChineseLocale = locale === 'zh-CN'
  const relativePath = isChineseLocale ? pathWithinBase.slice('zh-cn/'.length) : pathWithinBase
  const isHomePage = relativePath === '' || relativePath === '/'
  const localeText = isChineseLocale ? chinese.site : undefined
  const localizedHref = (path = '') => `${basePath}${isChineseLocale ? 'zh-cn/' : ''}${path}`
  const englishLanguageHref = `${basePath}${relativePath}`
  const chineseLanguageHref = `${basePath}zh-cn/${relativePath}`
  const routeToolId = relativePath.match(/^tools\/([^/]+)\/?$/)?.[1]
  const routeTool = toolList.find((tool) => tool.id === routeToolId)
  const activeToolGuide = routeTool
    ? isChineseLocale
      ? chinese.tools[routeTool.id]
      : toolGuides.find((guide) => guide.id === routeTool.id)
    : undefined
  const routePageSlug = relativePath.match(/^(faq|about|privacy|terms|contact|report-bug)\/?$/)?.[1]
  const activeInformationPage = informationPages.find((page) => page.slug === routePageSlug)
  const routeBlogSlug = relativePath.match(/^blog\/([^/]+)\/?$/)?.[1]
  const activeBlogPost = routeBlogSlug
    ? blogPosts.find((post) => post.slug === routeBlogSlug)
    : undefined
  const isBlogIndex = relativePath === 'blog' || relativePath === 'blog/'
  const localizedBlogPost =
    isChineseLocale && activeBlogPost
      ? { ...activeBlogPost, ...chinese.blog.posts[activeBlogPost.slug] }
      : activeBlogPost
  const localizedBlogPosts = blogPosts.map((post) => ({
    ...post,
    ...(isChineseLocale ? chinese.blog.posts[post.slug] : undefined),
  }))
  const [featuredBlogPost, ...otherBlogPosts] = localizedBlogPosts
  const [activeTool] = useState<ToolId>(routeTool?.id ?? 'word-counter')
  const routeKind = resolveRouteKind(
    relativePath,
    toolList.map((tool) => tool.id),
    informationPages.map((page) => page.slug),
    blogPosts.map((post) => post.slug),
  )
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false)
  const toolMenuRef = useRef<HTMLDivElement>(null)
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('All')
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [caseFormat, setCaseFormat] = useState<CaseFormat>('upper')
  const [sortMode, setSortMode] = useState<SortMode>('az')
  const [naturalNumberOrder, setNaturalNumberOrder] = useState(true)
  const [removeSorterEmptyLines, setRemoveSorterEmptyLines] = useState(false)
  const [paragraphCount, setParagraphCount] = useState(3)
  const [sentenceCount, setSentenceCount] = useState(5)
  const [startWithLorem, setStartWithLorem] = useState(true)
  const [readingSpeed, setReadingSpeed] = useState(isChineseLocale ? 400 : 200)
  const [trimCleanerLines, setTrimCleanerLines] = useState(true)
  const [collapseCleanerSpaces, setCollapseCleanerSpaces] = useState(true)
  const [removeExtraBlankLines, setRemoveExtraBlankLines] = useState(true)
  const analyticsConsent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsentSnapshot,
    getServerAnalyticsConsentSnapshot,
  )
  const [isConsentSettingsOpen, setIsConsentSettingsOpen] = useState(false)
  const hasTrackedToolStart = useRef(false)

  useEffect(() => {
    if (analyticsConsent === 'rejected') {
      window[`ga-disable-${GA_MEASUREMENT_ID}`] = true
    } else if (analyticsConsent === 'accepted') {
      window[`ga-disable-${GA_MEASUREMENT_ID}`] = false
      loadGoogleAnalytics()
    }
  }, [analyticsConsent])

  function trackToolEvent(eventName: ToolAnalyticsEvent) {
    if (analyticsConsent !== 'accepted') return false
    if (!window.gtag) loadGoogleAnalytics()
    return sendToolAnalyticsEvent(analyticsConsent, window.gtag, eventName, activeTool)
  }

  function trackToolStart() {
    if (hasTrackedToolStart.current) return
    hasTrackedToolStart.current = trackToolEvent('tool_start')
  }

  function chooseAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>) {
    if (consent === 'rejected') {
      window[`ga-disable-${GA_MEASUREMENT_ID}`] = true
      clearGoogleAnalyticsCookies()
    } else {
      window[`ga-disable-${GA_MEASUREMENT_ID}`] = false
      if (
        analyticsConsent !== 'accepted' &&
        document.getElementById(GOOGLE_ANALYTICS_SCRIPT_ID)
      ) {
        window.gtag?.('event', 'page_view')
      }
    }

    saveAnalyticsConsent(consent)
    setIsConsentSettingsOpen(false)
  }

  useEffect(() => {
    if (!isToolMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!toolMenuRef.current?.contains(event.target as Node)) {
        setIsToolMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsToolMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isToolMenuOpen])

  const filteredTools = useMemo(() => {
    return toolList.filter((tool) => {
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory
      const matchesSearch =
        search.trim().length === 0 ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase()) ||
        (locale === 'zh-CN' &&
          `${chinese.tools[tool.id].name} ${chinese.tools[tool.id].description}`.includes(search.trim()))

      return matchesCategory && matchesSearch
    })
  }, [locale, search, selectedCategory])

  const activeToolInfo =
    toolList.find((tool) => tool.id === activeTool) ?? toolList[0]
  const getToolName = (tool: Tool) =>
    isChineseLocale ? chinese.tools[tool.id].name : tool.name
  const getToolDescription = (tool: Tool) =>
    isChineseLocale ? chinese.tools[tool.id].description : tool.description
  const categoryLabel = (category: (typeof categories)[number]) => {
    if (!isChineseLocale) return category
    const categoryKeys: Record<(typeof categories)[number], string> = {
      All: 'allTools',
      Writing: 'categoryWriting',
      'Text Cleaning': 'categoryTextCleaning',
      'Text Formatting': 'categoryTextFormatting',
      'Text Analysis': 'categoryTextAnalysis',
    }
    return chinese.site[categoryKeys[category]]
  }
  const activeToolName = getToolName(activeToolInfo)

  const metrics = useMemo(
    () => computeMetrics(text, locale, readingSpeed),
    [locale, readingSpeed, text],
  )

  const findReplaceResult = useMemo(
    () => replaceMatches(text, findText, replaceText, matchCase, wholeWord),
    [findText, matchCase, replaceText, text, wholeWord],
  )

  const transformedText = useMemo(() => {
    switch (activeTool) {
      case 'case-converter':
        return convertCase(text, caseFormat)

      case 'text-cleaner': {
        return cleanText(text, trimCleanerLines, collapseCleanerSpaces, removeExtraBlankLines)
      }

      case 'duplicate-lines':
        return removeDuplicateLines(text)

      case 'text-sorter':
        return sortLines(text, sortMode, naturalNumberOrder, removeSorterEmptyLines, locale)

      case 'find-replace':
        return findReplaceResult.text

      case 'lorem-ipsum':
        return generateLoremText(paragraphCount, sentenceCount, startWithLorem)

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
    findReplaceResult,
    naturalNumberOrder,
    paragraphCount,
    removeExtraBlankLines,
    sentenceCount,
    sortMode,
    removeSorterEmptyLines,
    startWithLorem,
    text,
    trimCleanerLines,
    locale,
  ])

  const outputContent = useMemo(
    () =>
      getToolOutputContent(
        activeTool,
        transformedText,
        metrics,
        readingSpeed,
        locale,
        locale === 'zh-CN' ? chinese.site : undefined,
      ),
    [activeTool, locale, metrics, readingSpeed, transformedText],
  )

  const copyText = async () => {
    const contentToCopy = outputContent
    setActionMessage('')
    try {
      await navigator.clipboard.writeText(contentToCopy)
      setActionMessage(localeText?.copied ?? 'Copied to clipboard.')
      trackToolEvent('copy_result')
    } catch (clipboardError) {
      const textarea = document.createElement('textarea')
      textarea.value = contentToCopy
      textarea.setAttribute('readonly', '')
      textarea.className = 'fixed left-[-9999px] top-0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        if (!document.execCommand('copy')) {
          throw clipboardError
        }
        setActionMessage(localeText?.copied ?? 'Copied to clipboard.')
        trackToolEvent('copy_result')
      } catch (fallbackError) {
        console.error('Unable to copy tool output.', fallbackError)
        setActionMessage(localeText?.copyFailed ?? 'Copy failed. Select and copy the output manually.')
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  const downloadText = () => {
    setActionMessage('')
    try {
      const blob = new Blob([outputContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${activeToolInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setActionMessage(localeText?.downloadStarted ?? 'Download started.')
      trackToolEvent('download_result')
    } catch (error) {
      console.error('Unable to download tool output.', error)
      setActionMessage(localeText?.downloadFailed ?? 'Download failed. Please try again.')
    }
  }

  const renderControls = () => {
    switch (activeTool) {
      case 'case-converter': {
        const labels: Record<CaseFormat, string> = {
          upper: localeText?.upper ?? 'UPPERCASE',
          lower: localeText?.lower ?? 'lowercase',
          title: localeText?.titleCase ?? 'Title Case',
          sentence: localeText?.sentenceCase ?? 'Sentence case',
          camel: localeText?.camelCase ?? 'camelCase',
          snake: localeText?.snakeCase ?? 'snake_case',
        }
        return (
          <div className="flex flex-wrap gap-2">
            {(['upper', 'lower', 'title', 'sentence', 'camel', 'snake'] as CaseFormat[]).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setCaseFormat(format)}
                aria-pressed={caseFormat === format}
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                {localeText?.find ?? 'Find'}
                <input
                  value={findText}
                  onChange={(event) => setFindText(event.target.value)}
                  placeholder={localeText?.findPlaceholder ?? 'Find text'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                {localeText?.replaceWith ?? 'Replace with'}
                <input
                  value={replaceText}
                  onChange={(event) => setReplaceText(event.target.value)}
                  placeholder={localeText?.replacePlaceholder ?? 'Replace with'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(event) => setMatchCase(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                {localeText?.matchCase ?? 'Match case'}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(event) => setWholeWord(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                {localeText?.wholeWord ?? 'Whole word'}
              </label>
            </div>
            <p className="text-xs text-slate-500">
              {findReplaceResult.count} {findReplaceResult.count === 1
                ? localeText?.replacement ?? 'replacement'
                : localeText?.replacements ?? 'replacements'}
            </p>
          </div>
        )

      case 'text-sorter':
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {([
                ['az', localeText?.az ?? 'A-Z'],
                ['za', localeText?.za ?? 'Z-A'],
                ['reverse', localeText?.reverseOrder ?? 'Reverse order'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  aria-pressed={sortMode === mode}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                    sortMode === mode
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={naturalNumberOrder}
                  onChange={(event) => setNaturalNumberOrder(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                {localeText?.naturalNumberOrder ?? 'Natural number order'}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={removeSorterEmptyLines}
                  onChange={(event) => setRemoveSorterEmptyLines(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                {localeText?.removeEmptyLines ?? 'Remove empty lines'}
              </label>
            </div>
          </div>
        )

      case 'lorem-ipsum':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                {localeText?.paragraphCount ?? 'Paragraphs'}
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={paragraphCount}
                  onChange={(event) => setParagraphCount(clampGeneratorCount(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                {localeText?.sentencesPerParagraph ?? 'Sentences per paragraph'}
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={sentenceCount}
                  onChange={(event) => setSentenceCount(clampGeneratorCount(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={startWithLorem}
                onChange={(event) => setStartWithLorem(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-slate-900"
              />
              {localeText?.startWithLorem ?? 'Start with Lorem ipsum'}
            </label>
          </div>
        )

      case 'reading-time':
        return (
          <label className="space-y-3 text-sm font-medium text-slate-700">
            {localeText?.readingSpeed ?? 'Reading speed'}: {readingSpeed} {isChineseLocale ? '字/分钟' : 'wpm'}
            <input
              type="range"
              min={isChineseLocale ? 100 : 100}
              max={isChineseLocale ? 1200 : 500}
              step={isChineseLocale ? 50 : 10}
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
                label: localeText?.trimLines ?? 'Trim lines',
                checked: trimCleanerLines,
                onChange: setTrimCleanerLines,
              },
              {
                label: localeText?.collapseSpaces ?? 'Collapse extra spaces',
                checked: collapseCleanerSpaces,
                onChange: setCollapseCleanerSpaces,
              },
              {
                label: localeText?.removeBlankLines ?? 'Remove extra blank lines',
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
        <nav
          aria-label={isChineseLocale ? '主导航' : 'Main navigation'}
          onMouseLeave={() => setIsToolMenuOpen(false)}
          className="flex w-full items-center gap-4 px-4 py-3 sm:px-6 lg:px-8"
        >
          <a
            href={localizedHref()}
            aria-label={isChineseLocale ? 'TextToools 首页' : 'TextToools home'}
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
              T
            </span>
            <span className="text-lg font-semibold tracking-[-0.05em] text-slate-900">
              TextToools
            </span>
          </a>

          <div className="hidden min-w-0 flex-1 items-center gap-5 overflow-x-auto pl-5 text-sm font-medium text-slate-600 lg:flex">
            {toolList.slice(0, 4).map((tool) => (
              <a
                key={tool.id}
                href={localizedHref(`tools/${tool.id}/`)}
                aria-current={activeToolGuide && activeTool === tool.id ? 'page' : undefined}
                className={`shrink-0 transition hover:text-slate-950 ${
                  activeToolGuide && activeTool === tool.id ? 'text-slate-950' : ''
                }`}
              >
                {getToolName(tool)}
              </a>
            ))}
            <button
              type="button"
              aria-expanded={isToolMenuOpen}
              aria-controls="all-tools-menu"
              onMouseEnter={() => setIsToolMenuOpen(true)}
              onClick={() => setIsToolMenuOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 transition hover:text-slate-950"
            >
              {localeText?.allTools ?? 'All tools'}
              <ChevronDown className={`h-4 w-4 transition-transform ${isToolMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>

          <div ref={toolMenuRef} className="relative ml-auto shrink-0">
            <button
              type="button"
              aria-label={isToolMenuOpen
                ? (localeText?.closeToolsMenu ?? 'Close all tools menu')
                : (localeText?.openToolsMenu ?? 'Open all tools menu')}
              aria-expanded={isToolMenuOpen}
              aria-controls="all-tools-menu"
              onMouseEnter={() => setIsToolMenuOpen(true)}
              onClick={() => setIsToolMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center gap-0 rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Grid2X2 className="h-5 w-5" aria-hidden="true" />
              <ChevronDown className={`h-3 w-3 transition-transform ${isToolMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {isToolMenuOpen ? (
              <div
                id="all-tools-menu"
                className="absolute right-0 top-12 z-30 max-h-[calc(100dvh-5rem)] w-[min(92vw,48rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">{localeText?.allTextTools ?? 'All text tools'}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {localeText?.chooseTool ?? 'Choose a tool to open its dedicated page.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={localizedHref('#tools')}
                      onClick={() => setIsToolMenuOpen(false)}
                      className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                    >
                      {localeText?.browseAll ?? 'Browse all'}
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsToolMenuOpen(false)}
                      aria-label={localeText?.closeToolsMenu ?? 'Close all tools menu'}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                  {categories.slice(1).map((category) => (
                    <section key={category} aria-label={category}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {categoryLabel(category)}
                      </h3>
                      <div className="grid gap-1">
                        {toolList
                          .filter((tool) => tool.category === category)
                          .map((tool) => {
                            const Icon = tool.icon
                            return (
                              <a
                                key={tool.id}
                                href={localizedHref(`tools/${tool.id}/`)}
                                onClick={() => setIsToolMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                              >
                                <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                                {getToolName(tool)}
                              </a>
                            )
                          })}
                      </div>
                    </section>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm">
                  <a
                    href={localizedHref('faq/')}
                    onClick={() => setIsToolMenuOpen(false)}
                    className="text-slate-600 hover:text-slate-950"
                  >
                    {localeText?.faq ?? 'FAQ'}
                  </a>
                  <a
                    href={localizedHref('about/')}
                    onClick={() => setIsToolMenuOpen(false)}
                    className="text-slate-600 hover:text-slate-950"
                  >
                    {localeText?.about ?? 'About us'}
                  </a>
                  <a
                    href={localizedHref('contact/')}
                    onClick={() => setIsToolMenuOpen(false)}
                    className="text-slate-600 hover:text-slate-950"
                  >
                    {localeText?.contact ?? 'Contact us'}
                  </a>
                  <a
                  href={localizedHref('blog/')}
                  onClick={() => setIsToolMenuOpen(false)}
                  className="text-slate-600 hover:text-slate-950"
                  >
                  {localeText?.blog ?? 'Blog'}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      <main
        className={`mx-auto ${isHomePage ? 'max-w-[1760px]' : 'max-w-7xl'} px-4 pb-20 pt-8 sm:px-6 lg:px-8`}
      >
        {routeKind === 'not-found' ? (
          <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-10">
            <p className="text-sm font-medium text-slate-500">404</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {isChineseLocale ? '找不到此页面' : 'Page not found'}
            </h1>
            <p className="mt-3 text-slate-600">
              {isChineseLocale
                ? '此地址不存在或已移动。'
                : 'This address does not exist or may have moved.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={localizedHref()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                {isChineseLocale ? '返回首页' : 'Go to homepage'}
              </a>
              <a
                href={localizedHref('#tools')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                {isChineseLocale ? '浏览工具' : 'Browse tools'}
              </a>
            </div>
          </section>
        ) : null}

        {routeKind === 'home' ? (
          <>
            <section className="rounded-2xl bg-[#f0eef8] px-5 py-9 text-center sm:px-8 sm:py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            TextToools
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
          {localeText?.homeHeading ?? 'The text tools you need, all in one place'}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-base text-slate-600">
          {localeText?.homeIntro ?? 'Count, clean, format, and analyze text with free tools that work in your browser.'}
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
                  {categoryLabel(category)}
                </button>
              ))}
            </div>
            <label id="search-tools" className="flex w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 sm:max-w-xs">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">{localeText?.searchTools ?? 'Search tools'}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={localeText?.searchTools ?? 'Search tools'}
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredTools.map((tool) => {
              const Icon = tool.icon

              return (
                <a
                  key={tool.id}
                  href={localizedHref(`tools/${tool.id}/`)}
                  className="group min-h-36 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_5px_16px_rgba(30,41,59,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:min-h-40 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-md sm:h-10 sm:w-10 ${categoryColors[tool.category]}`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-900 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                  </div>
                  <h2 className="mt-3 text-base font-semibold leading-6 text-slate-900 sm:mt-4">{getToolName(tool)}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{getToolDescription(tool)}</p>
                </a>
              )
            })}
          </div>
          {filteredTools.length === 0 ? (
            <p className="border-b border-slate-200 py-6 text-sm text-slate-500">
              {localeText?.noToolsFound ?? 'No tools found. Try a different search.'}
            </p>
          ) : null}
        </section>
          </>
        ) : null}

        {activeToolGuide ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <a href={localizedHref()} className="hover:text-slate-900">
              {localeText?.home ?? 'Home'}
            </a>
            <span aria-hidden="true">/</span>
            <a href={localizedHref('#tools')} className="hover:text-slate-900">
              {localeText?.toolBreadcrumb ?? 'All tools'}
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-slate-700">{routeTool ? getToolName(routeTool) : ''}</span>
          </div>
        ) : null}

        {activeToolGuide ? (
          <section className="mb-5 rounded-2xl bg-[#f0eef8] px-5 py-7 sm:px-8">
            <p className="text-sm font-medium text-slate-500">
              {routeTool ? categoryLabel(routeTool.category) : ''}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
              {activeToolGuide.heading}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
              {activeToolGuide.intro}
            </p>
          </section>
        ) : null}

        {activeToolGuide ? (
        <section
          id="toolbox"
          aria-label={`${activeToolName} tool`}
          className="scroll-mt-24 py-3"
          onChange={trackToolStart}
          onClick={trackToolStart}
          onInput={trackToolStart}
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mt-1 text-base text-slate-600">{getToolDescription(activeToolInfo)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyText}
                  title={isChineseLocale ? '复制结果' : 'Copy the output content'}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  {localeText?.copy ?? 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={downloadText}
                  title={isChineseLocale ? '下载结果' : 'Download the output content'}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  {localeText?.download ?? 'Download'}
                </button>
              </div>
            </div>
            <p className="min-h-5 text-sm text-slate-600" aria-live="polite" role="status">
              {actionMessage}
            </p>

            <div className="space-y-5">
              <div
                className={`grid grid-cols-1 gap-4 ${activeTool === 'lorem-ipsum' ? '' : 'lg:grid-cols-2'}`}
              >
                {activeTool !== 'lorem-ipsum' ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="tool-input"
                      className="block text-sm font-medium text-slate-700"
                    >
                      {localeText?.toolInput ?? 'Input text'}
                    </label>
                    <textarea
                      id="tool-input"
                      value={text}
                      onChange={(event) => {
                        setText(event.target.value)
                        setActionMessage('')
                      }}
                      rows={10}
                      placeholder={localeText?.inputPlaceholder ?? 'Paste or type your text here...'}
                      autoCapitalize="off"
                      spellCheck={false}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-900 outline-none transition focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setText('')
                        setActionMessage('')
                      }}
                      disabled={!text}
                      className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {localeText?.clearInput ?? 'Clear input'}
                    </button>
                  </div>
                ) : null}

                <div className="space-y-2 text-sm font-medium text-slate-700">
                  <p id="tool-output-label">{localeText?.output ?? 'Output'}</p>
                  <div className="min-h-[240px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-700">
                    <pre
                      aria-labelledby="tool-output-label"
                      className="h-full min-h-[208px] whitespace-pre-wrap break-words font-sans"
                    >
                      {activeTool === 'text-cleaner' ||
                      activeTool === 'case-converter' ||
                      activeTool === 'lorem-ipsum' ||
                      activeTool === 'find-replace' ||
                      activeTool === 'text-sorter'
                        ? transformedText ||
                          (text
                            ? (localeText?.emptyResult ?? 'The result is empty.')
                            : (localeText?.emptyOutput ?? 'Your result will appear here when you enter text.'))
                        : outputContent || (localeText?.transformedOutput ?? 'Your transformed text will appear here.')}
                    </pre>
                  </div>
                </div>
              </div>

              {renderControls()}

              {activeTool === 'word-counter' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.wordCount ?? 'Words'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.words}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.characters ?? 'Characters'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.characters}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.withoutWhitespace ?? 'No whitespace'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.charactersNoSpaces}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.sentences ?? 'Sentences'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.sentences}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.paragraphs ?? 'Paragraphs'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.paragraphs}</p>
                  </div>
                </div>
              ) : null}

              {activeTool === 'character-counter' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.characters ?? 'Characters'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.characters}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.withoutWhitespace ?? 'No whitespace'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.charactersNoSpaces}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.lines ?? 'Lines'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.lines}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{localeText?.wordCount ?? 'Words'}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metrics.words}</p>
                  </div>
                </div>
              ) : null}

              {activeTool === 'reading-time' ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{isChineseLocale ? '预计阅读时间' : 'Estimated reading time'}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {formatReadingTime(metrics.words, metrics.readingSeconds)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {isChineseLocale
                      ? `${metrics.words} 个词，阅读速度 ${readingSpeed} 字/分钟`
                      : `${metrics.words} words at ${readingSpeed} words per minute`}
                  </p>
                </div>
              ) : null}

              {activeTool === 'keyword-density' ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-700">{localeText?.rank ?? 'Rank'}</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">{localeText?.keyword ?? 'Keyword'}</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">{localeText?.count ?? 'Count'}</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">{localeText?.density ?? 'Density'}</th>
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
                            {localeText?.searchNoResults ?? 'No keywords found. Add text to calculate keyword density.'}
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
        ) : null}

        {activeToolGuide ? (
          <section aria-label={`${activeToolName} guide`} className="space-y-6 py-8">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {activeToolGuide.sections.map((section) => (
                <article
                  key={section.heading}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets ? (
                      <ul className="list-disc space-y-1 pl-5">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                    {section.example ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {localeText?.exampleInput ?? 'Example input'}
                          </p>
                          <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                            {section.example.input}
                          </pre>
                        </div>
                        <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {localeText?.result ?? 'Result'}
                          </p>
                          <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                            {section.example.output}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {localeText?.frequentlyAsked ?? 'Frequently asked questions'}
              </h2>
              {activeToolGuide.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <summary className="cursor-pointer font-medium text-slate-800 marker:text-slate-400">
                    {faq.question}
                  </summary>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>

            <section id="other-tools" className="space-y-4 pt-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {localeText?.exploreTools ?? 'Explore other text tools'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {localeText?.exploreToolsIntro ?? 'Each tool opens on its own page, so you can switch tasks without losing your way.'}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {toolList
                  .filter((tool) => tool.id !== activeTool)
                  .map((tool) => {
                    const Icon = tool.icon
                    return (
                      <a
                        key={tool.id}
                        href={localizedHref(`tools/${tool.id}/`)}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-400"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${categoryColors[tool.category]}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{getToolName(tool)}</span>
                          <span className="block truncate text-sm text-slate-500">
                            {getToolDescription(tool)}
                          </span>
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      </a>
                    )
                  })}
              </div>
            </section>
          </section>
        ) : null}

        {activeInformationPage ? (
          <section className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-2xl bg-[#f0eef8] px-5 py-7 sm:px-8">
              <p className="text-sm font-medium text-slate-500">TextToools</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                {isChineseLocale
                  ? chinese.site[activeInformationPage.slug === 'report-bug' ? 'reportBug' : activeInformationPage.slug]
                  : activeInformationPage.title}
              </h1>
            </div>

            {activeInformationPage.slug === 'faq' ? (
              <div className="space-y-3">
                {(isChineseLocale
                  ? [
                      { question: chinese.site.isFree, answer: chinese.site.yesFree },
                      { question: chinese.site.privacyFaq, answer: chinese.site.noUpload },
                      { question: chinese.site.howToUse, answer: chinese.site.chooseToolAnswer },
                      { question: chinese.site.feedbackFaq, answer: chinese.site.feedbackAnswer },
                    ]
                  : commonFaqs).map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <summary className="cursor-pointer font-medium text-slate-800 marker:text-slate-400">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            ) : null}

            {activeInformationPage.slug === 'about' ? (
              <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 sm:p-6">
                <p>
                  {isChineseLocale
                    ? chinese.site.aboutText
                    : <>TextToools is a collection of focused utilities for counting, cleaning,
                        formatting, and understanding text. The home page helps you choose a task;
                        each tool then opens on its own page with its controls and a practical guide.</>}
                </p>
                <p>
                  {isChineseLocale
                    ? chinese.site.aboutPrivacy
                    : 'Text processing happens in your browser. The text you enter into a tool is not uploaded to TextToools for processing, and no account is required.'}
                </p>
                <p>
                  {isChineseLocale
                    ? chinese.site.aboutGoal
                    : 'The goal is to keep everyday text tasks clear and uncomplicated. Use the Contact us form to send a suggestion once message delivery is enabled.'}
                </p>
              </article>
            ) : null}

            {activeInformationPage.slug === 'privacy' ? (
              <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 sm:p-6">
                <p className="font-medium text-slate-800">{isChineseLocale ? chinese.site.lastUpdated : 'Last updated:'} {currentYear}</p>
                <h2 className="text-lg font-semibold text-slate-900">{isChineseLocale ? chinese.site.privacyInputHeading : 'Text entered into tools'}</h2>
                <p>
                  {isChineseLocale ? chinese.site.privacyInput : 'Text transformations and calculations run in your browser. Text entered into the tools is not sent to a TextToools server for processing. Clearing or closing the page removes the current in-memory tool input.'}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">{isChineseLocale ? chinese.site.privacyFormsHeading : 'Contact forms'}</h2>
                <p>
                  {isChineseLocale ? chinese.site.privacyForms : 'Contact and bug-report forms are not connected to a delivery service yet. While disabled, the information entered in those forms is not submitted or stored by TextToools. This policy must be updated when a form provider is chosen and enabled, to explain what information that provider receives and how it is handled.'}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">{isChineseLocale ? chinese.site.privacyStorageHeading : 'Local storage and analytics'}</h2>
                <p>
                  {isChineseLocale ? chinese.site.privacyStorage : 'TextToools does not save tool input in local storage or require an account. We use Cloudflare Web Analytics to measure aggregate page views, visits, and page performance, including Core Web Vitals. Cloudflare states that Web Analytics does not track individual end users across customer websites or collect or use visitors’ personal data. We also use Google Analytics 4 (GA4) to understand site usage only after you explicitly accept. If you reject or make no choice, the GA4 tag is not loaded and no GA4 requests are sent. With consent, GA4 records page views, which tool you start using, and copy or download actions. Your choice is stored in this browser’s local storage and can be changed at any time using Privacy settings. GA4 never receives text entered into tools, search terms, replacement values, or generated output; all text processing stays in your browser.'}
                </p>
                <p>
                  <a
                    href="https://developers.cloudflare.com/web-analytics/about/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  >
                    {isChineseLocale ? '了解 Cloudflare Web Analytics 如何处理数据。' : 'Learn how Cloudflare Web Analytics handles data.'}
                  </a>
                  {' · '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  >
                    {isChineseLocale ? '了解 Google 如何处理数据。' : 'Learn how Google handles data.'}
                  </a>
                </p>
              </article>
            ) : null}

            {activeInformationPage.slug === 'terms' ? (
              <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 sm:p-6">
                <p className="font-medium text-slate-800">{isChineseLocale ? chinese.site.lastUpdated : 'Last updated:'} {currentYear}</p>
                <h2 className="text-lg font-semibold text-slate-900">{isChineseLocale ? chinese.site.termsUsageHeading : 'Using the tools'}</h2>
                <p>
                  {isChineseLocale ? chinese.site.termsUsage : 'TextToools provides browser-based utilities for general informational and productivity use. You are responsible for reviewing the results and deciding whether they meet your needs. Do not rely on a tool as a substitute for professional advice or for a destination platform’s own limits and rules.'}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">{isChineseLocale ? chinese.site.termsAvailabilityHeading : 'Availability and changes'}</h2>
                <p>
                  {isChineseLocale ? chinese.site.termsAvailability : 'Features may change as the site is improved. The service is provided without a guarantee that it will always be available, error-free, or suitable for a particular purpose. Keep your own copy of important text and review downloads before using them.'}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">{isChineseLocale ? chinese.site.termsContactHeading : 'Contact'}</h2>
                <p>
                  {isChineseLocale ? chinese.site.termsContact : 'If you have a question about these terms, use the Contact us page. These plain-language terms should be reviewed for the applicable business and jurisdiction before the site is launched publicly.'}
                </p>
              </article>
            ) : null}

            {activeInformationPage.slug === 'contact' ||
            activeInformationPage.slug === 'report-bug' ? (
              <div className="space-y-4">
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {activeInformationPage.slug === 'report-bug'
                    ? (localeText?.bugIntro ?? 'Tell us what happened, what you expected, and which tool you were using. Please do not include sensitive text from your documents.')
                    : (localeText?.contactIntro ?? 'Send a question, suggestion, or feedback. Your email address is only included in the message so we can reply; it is not displayed publicly.')}
                </p>
                <FeedbackForm
                  key={activeInformationPage.slug}
                  kind={activeInformationPage.slug === 'report-bug' ? 'bug' : 'contact'}
                  isChineseLocale={isChineseLocale}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {isBlogIndex ? (
          <section className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-2xl bg-[#f0eef8] px-5 py-7 sm:px-8">
              <p className="text-sm font-medium text-slate-500">TextToools</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                {isChineseLocale ? chinese.blog.title : 'TextToools Blog'}
              </h1>
              <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                {isChineseLocale
                  ? chinese.blog.intro
                  : 'Practical, clear guides to counting, cleaning, and working with text.'}
              </p>
            </div>
            {featuredBlogPost ? (
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid md:grid-cols-2">
                <a
                  href={localizedHref(`blog/${featuredBlogPost.slug}/`)}
                  aria-label={featuredBlogPost.title}
                  className="block overflow-hidden bg-[#f0eef8] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-slate-900"
                >
                  <img
                    src={`${basePath}${featuredBlogPost.image}`}
                    alt=""
                    width="1200"
                    height="630"
                    fetchPriority="high"
                    decoding="async"
                    className="h-full min-h-56 w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                </a>
                <div className="flex flex-col justify-center p-5 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                    {isChineseLocale ? '精选指南' : 'Featured guide'}
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {featuredBlogPost.modified
                      ? `${isChineseLocale ? '更新于' : 'Updated:'} ${featuredBlogPost.modified}`
                      : `${localeText?.articleDate ?? 'Published:'} ${featuredBlogPost.published}`}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    <a href={localizedHref(`blog/${featuredBlogPost.slug}/`)} className="hover:underline">
                      {featuredBlogPost.title}
                    </a>
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {featuredBlogPost.summary}
                  </p>
                  <a
                    href={localizedHref(`blog/${featuredBlogPost.slug}/`)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-950"
                  >
                    {isChineseLocale ? '阅读指南' : 'Read guide'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ) : null}
            {otherBlogPosts.length > 0 ? (
              <section aria-labelledby="more-guides-heading">
                <h2 id="more-guides-heading" className="mb-4 text-xl font-semibold tracking-tight text-slate-900">
                  {isChineseLocale ? '更多实用指南' : 'More practical guides'}
                </h2>
                <div className="grid gap-5 md:grid-cols-2">
                  {otherBlogPosts.map((post) => (
                    <article
                      key={post.slug}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <a
                        href={localizedHref(`blog/${post.slug}/`)}
                        aria-label={post.title}
                        className="block overflow-hidden bg-[#f0eef8] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-slate-900"
                      >
                        <img
                          src={`${basePath}${post.image}`}
                          alt=""
                          width="1200"
                          height="630"
                          loading="lazy"
                          decoding="async"
                          className="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                        />
                      </a>
                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <p className="text-xs font-medium text-slate-500">
                          {localeText?.articleDate ?? 'Published:'} {post.published}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                          <a href={localizedHref(`blog/${post.slug}/`)} className="hover:underline">
                            {post.title}
                          </a>
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                          {post.summary}
                        </p>
                        <a
                          href={localizedHref(`blog/${post.slug}/`)}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-800 hover:text-slate-950"
                        >
                          {isChineseLocale ? '阅读指南' : 'Read guide'}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {activeBlogPost && localizedBlogPost ? (
          <article className="mx-auto max-w-4xl space-y-6">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <a href={localizedHref()} className="hover:text-slate-900">
                {localeText?.home ?? 'Home'}
              </a>
              <span aria-hidden="true">/</span>
              <a href={localizedHref('blog/')} className="hover:text-slate-900">
                {localeText?.blog ?? 'Blog'}
              </a>
              <span aria-hidden="true">/</span>
              <span className="text-slate-700">{localizedBlogPost.title}</span>
            </nav>
            <header className="rounded-2xl bg-[#f0eef8] px-5 py-7 sm:px-8">
              <p className="text-sm font-medium text-slate-500">
                <time dateTime={activeBlogPost.published}>
                  {localeText?.articleDate ?? 'Published:'} {activeBlogPost.published}
                </time>
                {activeBlogPost.modified ? (
                  <>
                    {' · '}
                    <time dateTime={activeBlogPost.modified}>
                      {localeText?.lastUpdated ?? 'Updated:'} {activeBlogPost.modified}
                    </time>
                  </>
                ) : null}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                {localizedBlogPost.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {localizedBlogPost.summary}
              </p>
            </header>
            <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f0eef8]">
              <img
                src={`${basePath}${localizedBlogPost.image}`}
                alt={localizedBlogPost.imageAlt}
                width="1200"
                height="630"
                fetchPriority="high"
                decoding="async"
                className="aspect-[1200/630] w-full object-cover"
              />
            </figure>
            <div className="space-y-4">
              {localizedBlogPost.sections.map((section) => (
                <section
                  key={section.heading}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  {section.examples ? (
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {section.examples.map((example) => (
                        <li
                          key={example.text}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <code className="break-all font-medium text-slate-900">{example.text}</code>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {example.count}{' '}
                              {isChineseLocale ? '个词' : example.count === 1 ? 'word' : 'words'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {example.explanation}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
            <nav aria-label={isChineseLocale ? '相关工具' : 'Related tools'} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">
                {isChineseLocale ? '继续使用文本工具' : 'Use a related text tool'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  activeBlogPost.slug === 'clean-pasted-text-without-losing-formatting'
                    ? toolList.filter((tool) => tool.id === 'text-cleaner')
                    : activeBlogPost.slug === 'how-to-count-characters-including-spaces'
                      ? toolList.filter((tool) => tool.id === 'character-counter')
                      : toolList.filter((tool) => tool.id === 'word-counter')
                ).map((tool) => (
                  <a
                    key={tool.id}
                    href={localizedHref(`tools/${tool.id}/`)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                  >
                    {getToolName(tool)}
                  </a>
                ))}
                <a
                  href={localizedHref('blog/')}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  {isChineseLocale ? '所有指南' : 'All guides'}
                </a>
              </div>
            </nav>
          </article>
        ) : null}

      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div
          className={`mx-auto ${isHomePage ? 'max-w-[1760px]' : 'max-w-7xl'} px-4 py-10 sm:px-6 lg:px-8`}
        >
          <div className="grid grid-cols-1 gap-8 border-b border-slate-200 pb-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
            <div className="space-y-2">
              <a href={localizedHref()} className="font-semibold text-slate-900">
                TextToools
              </a>
              <p className="max-w-sm text-sm leading-6 text-slate-500">
                {localeText?.footerDescription ?? 'Free text tools that run in your browser. Text you enter is not sent to a server for processing.'}
              </p>
            </div>

            <nav aria-label={localeText?.product ?? 'Product'} className="grid content-start gap-2 text-sm">
              <h2 className="mb-1 font-semibold text-slate-800">{localeText?.product ?? 'Product'}</h2>
              <a href={localizedHref('#tools')} className="text-slate-500 hover:text-slate-900">
                {localeText?.allTools ?? 'All tools'}
              </a>
              <a href={localizedHref('faq/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.faq ?? 'FAQ'}
              </a>
            </nav>

            <nav aria-label={localeText?.popularTools ?? 'Popular tools'} className="grid content-start gap-2 text-sm">
              <h2 className="mb-1 font-semibold text-slate-800">{localeText?.popularTools ?? 'Popular tools'}</h2>
              {toolList.slice(0, 4).map((tool) => (
                <a
                  key={tool.id}
                  href={localizedHref(`tools/${tool.id}/`)}
                  className="text-slate-500 hover:text-slate-900"
                >
                  {getToolName(tool)}
                </a>
              ))}
            </nav>

            <nav aria-label={localeText?.resources ?? 'Resources'} className="grid content-start gap-2 text-sm">
              <h2 className="mb-1 font-semibold text-slate-800">{localeText?.resources ?? 'Resources'}</h2>
              <a href={localizedHref('about/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.about ?? 'About us'}
              </a>
              <a href={localizedHref('contact/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.contact ?? 'Contact us'}
              </a>
              <a href={localizedHref('report-bug/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.reportBug ?? 'Report a bug'}
              </a>
              <a href={localizedHref('blog/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.blog ?? 'Blog'}
              </a>
            </nav>

            <nav aria-label={localeText?.legal ?? 'Legal'} className="grid content-start gap-2 text-sm">
              <h2 className="mb-1 font-semibold text-slate-800">{localeText?.legal ?? 'Legal'}</h2>
              <a href={localizedHref('privacy/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.privacy ?? 'Privacy'}
              </a>
              <a href={localizedHref('terms/')} className="text-slate-500 hover:text-slate-900">
                {localeText?.terms ?? 'Terms and conditions'}
              </a>
              <button
                type="button"
                onClick={() => setIsConsentSettingsOpen(true)}
                className="w-fit text-left text-slate-500 hover:text-slate-900"
              >
                {localeText?.privacySettings ?? 'Privacy settings'}
              </button>
            </nav>
          </div>

          <div className="flex flex-col gap-3 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} TextToools</p>
            <p>{localeText?.footerTagline ?? 'Simple text tools. Private by design.'}</p>
            <details className="group relative">
              <summary
                aria-label={`${localeText?.language ?? 'Language'}: ${
                  isChineseLocale ? '简体中文' : 'English'
                }`}
                className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 [&::-webkit-details-marker]:hidden"
              >
                <span>{isChineseLocale ? '简体中文' : 'English'}</span>
                <ChevronDown
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="absolute bottom-full right-0 z-30 mb-2 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <a
                  href={englishLanguageHref}
                  aria-current={!isChineseLocale ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 transition hover:bg-slate-50 ${
                    !isChineseLocale ? 'font-medium text-slate-900' : 'text-slate-600'
                  }`}
                >
                  English
                </a>
                <a
                  href={chineseLanguageHref}
                  aria-current={isChineseLocale ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 transition hover:bg-slate-50 ${
                    isChineseLocale ? 'font-medium text-slate-900' : 'text-slate-600'
                  }`}
                >
                  简体中文
                </a>
              </div>
            </details>
          </div>
        </div>
      </footer>
      {analyticsConsent === null || isConsentSettingsOpen ? (
        <section
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[calc(100vh-1.5rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:inset-x-6 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h2 id="analytics-consent-title" className="font-semibold text-slate-900">
                {isChineseLocale ? 'Google Analytics 选择' : 'Google Analytics choice'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isChineseLocale
                  ? 'Cloudflare Web Analytics 仍会用于汇总流量和性能统计。Google Analytics 4 仅在你明确同意后加载；拒绝或不作选择时，不会向 Google 发送 GA4 请求。接受后，GA4 会记录页面浏览、开始使用的工具以及复制和下载操作，但不会收集你输入的文本。你的选择保存在此浏览器中，可随时通过“隐私设置”更改。'
                  : 'Cloudflare Web Analytics remains active for aggregate traffic and performance measurement. Google Analytics 4 loads only if you explicitly accept; if you reject or make no choice, no GA4 requests are sent to Google. After acceptance, GA4 records page views, which tool you start using, and copy or download actions, but never the text you enter. Your choice is saved in this browser and can be changed at any time in Privacy settings.'}
                {' '}
                <a
                  href={localizedHref('privacy/')}
                  className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                >
                  {isChineseLocale ? '隐私政策' : 'Privacy policy'}
                </a>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:min-w-40">
              <button
                type="button"
                onClick={() => chooseAnalyticsConsent('rejected')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {isChineseLocale ? '拒绝 Google Analytics' : 'Reject Google Analytics'}
              </button>
              <button
                type="button"
                onClick={() => chooseAnalyticsConsent('accepted')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {isChineseLocale ? '接受 Google Analytics' : 'Accept Google Analytics'}
              </button>
              {analyticsConsent !== null ? (
                <button
                  type="button"
                  onClick={() => setIsConsentSettingsOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {isChineseLocale ? '关闭' : 'Close'}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default App
