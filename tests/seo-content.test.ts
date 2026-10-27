import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import {
  countGraphemes,
  countSentences,
  countWords,
  getKeywordData,
  removeDuplicateLines,
  sortLines,
} from '../src/tool-logic'
import { createSeoMetadata, injectPrerenderedApp } from '../scripts/seo-metadata.mjs'

const englishBlogPosts = readFileSync(new URL('../src/blog-posts.json', import.meta.url), 'utf8')
const chineseContent = readFileSync(new URL('../src/zh-CN.json', import.meta.url), 'utf8')
const spanishContent = readFileSync(new URL('../src/es.json', import.meta.url), 'utf8')
const portugueseContent = readFileSync(new URL('../src/pt-BR.json', import.meta.url), 'utf8')
const responseHeaders = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
const englishToolGuides = JSON.parse(
  readFileSync(new URL('../src/tool-pages.json', import.meta.url), 'utf8'),
)
const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
const seoGenerator = readFileSync(
  new URL('../scripts/generate-seo-pages.mjs', import.meta.url),
  'utf8',
)
const parsedEnglishBlogPosts = JSON.parse(englishBlogPosts)
const parsedChineseContent = JSON.parse(chineseContent)
const parsedSpanishContent = JSON.parse(spanishContent)
const parsedPortugueseContent = JSON.parse(portugueseContent)
const averageSentenceLengthPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'average-sentence-length',
)
const keywordDensityGuidePost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'keyword-density-guide',
)
const googleDocsWordCountPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'google-docs-word-count',
)
const excelCharacterCountPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'how-to-count-characters-in-excel',
)
const googleSheetsWordCountPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'how-to-count-words-in-google-sheets',
)
const fiveMinuteSpeechPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'five-minute-speech-word-count',
)
const chineseWordCountPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'how-to-count-words-in-chinese',
)
const hyphenatedWordsPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'how-word-counters-count-hyphenated-words',
)
const wordCountEditingPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'how-to-cut-word-count-without-losing-meaning',
)
const chineseHyphenatedWordsPost = parsedChineseContent.blog.posts[
  'how-word-counters-count-hyphenated-words'
]
const chineseWordCountEditingPost = parsedChineseContent.blog.posts[
  'how-to-cut-word-count-without-losing-meaning'
]
const spanishHyphenatedWordsPost = parsedSpanishContent.blog.posts[
  'how-word-counters-count-hyphenated-words'
]
const spanishWordCountEditingPost = parsedSpanishContent.blog.posts[
  'how-to-cut-word-count-without-losing-meaning'
]
const portugueseHyphenatedWordsPost = parsedPortugueseContent.blog.posts[
  'how-word-counters-count-hyphenated-words'
]
const portugueseWordCountEditingPost = parsedPortugueseContent.blog.posts[
  'how-to-cut-word-count-without-losing-meaning'
]

test('duplicate-line guide examples match exact, order-preserving deduplication', () => {
  const post = parsedEnglishBlogPosts.find(
    (article: { slug: string }) => article.slug === 'remove-duplicate-lines-from-text',
  )

  assert.ok(post)
  assert.equal(
    removeDuplicateLines('pear\napple\npear\nApple'),
    'pear\napple\nApple',
  )
  assert.equal(
    removeDuplicateLines('Name\nname\nName \nName'),
    'Name\nname\nName ',
  )
  assert.equal(
    removeDuplicateLines('first\n\nsecond\n\n'),
    'first\n\nsecond',
  )
  for (const localePost of [
    parsedChineseContent.blog.posts[post.slug],
    parsedSpanishContent.blog.posts[post.slug],
    parsedPortugueseContent.blog.posts[post.slug],
  ]) {
    assert.ok(localePost, `${post.slug} is localized`)
    assert.equal(localePost.sections.length, post.sections.length)
  }
})

test('Google Docs character-count guide matches the grapheme counter and official help', () => {
  const slug = 'google-docs-character-count'
  const post = parsedEnglishBlogPosts.find(
    (article: { slug: string }) => article.slug === slug,
  )

  assert.ok(post)
  assert.equal(countGraphemes('Hello, world!'), 13)
  assert.equal(countGraphemes('Hello, world!'.replaceAll(' ', '')), 12)
  assert.ok(post.sources.some(
    (source: { url: string }) => source.url === 'https://support.google.com/docs/answer/39003?hl=en',
  ))
  assert.match(post.sections[1].heading, /selected passage/i)
  assert.match(post.sections[3].paragraphs.join(' '), /headers, footers, and footnotes/)

  for (const localePost of [
    parsedChineseContent.blog.posts[slug],
    parsedSpanishContent.blog.posts[slug],
    parsedPortugueseContent.blog.posts[slug],
  ]) {
    assert.ok(localePost, `${slug} is localized`)
    assert.equal(localePost.sections.length, post.sections.length)
    assert.ok(localePost.sources.some(
      (source: { url: string }) => source.url === 'https://support.google.com/docs/answer/39003?hl=en',
    ))
  }
})

test('default production URL uses the live custom domain for assets and SEO', () => {
  const liveSiteUrl = 'https://texttoools.com/'
  assert.ok(viteConfig.includes(`const defaultSiteUrl = '${liveSiteUrl}'`))
  assert.ok(seoGenerator.includes(`const defaultSiteUrl = '${liveSiteUrl}'`))
})

test('content security policy permits Cloudflare Web Analytics', () => {
  assert.match(responseHeaders, /script-src[^;\n]*https:\/\/static\.cloudflareinsights\.com/)
  assert.match(responseHeaders, /connect-src[^;\n]*https:\/\/cloudflareinsights\.com/)
})

test('blog SEO metadata emits escaped Open Graph and Twitter image previews', () => {
  const html = createSeoMetadata({
    title: 'A guide',
    description: 'Useful guide',
    canonicalUrl: 'https://texttoools.com/blog/guide/',
    structuredData: {},
    alternates: [{ language: 'en', url: 'https://texttoools.com/blog/guide/' }],
    image: 'https://texttoools.com/blog-images/guide.png',
    imageAlt: 'A "useful" & <clear> example',
  })

  assert.match(html, /property="og:image" content="https:\/\/texttoools\.com\/blog-images\/guide\.png"/)
  assert.match(html, /property="og:image:type" content="image\/png"/)
  assert.match(html, /property="og:image:width" content="1200"/)
  assert.match(html, /property="og:image:height" content="630"/)
  assert.match(html, /property="og:image:alt" content="A &quot;useful&quot; &amp; &lt;clear&gt; example"/)
  assert.match(html, /name="twitter:card" content="summary_large_image"/)
  assert.match(html, /name="twitter:image" content="https:\/\/texttoools\.com\/blog-images\/guide\.png"/)
  assert.match(html, /name="twitter:image:alt" content="A &quot;useful&quot; &amp; &lt;clear&gt; example"/)
})

test('pre-rendered app injection preserves literal replacement markers', () => {
  const html = injectPrerenderedApp(
    '<div id="root"></div>',
    'Replacement markers $&, $1, and $$ stay literal.',
  )

  assert.equal(
    html,
    '<div id="root" data-prerendered="true">Replacement markers $&, $1, and $$ stay literal.</div>',
  )
})

test('character-count guidance matches the Unicode grapheme counter in all locales', () => {
  assert.match(englishBlogPosts, /TextToools counts Unicode grapheme clusters/)
  assert.doesNotMatch(englishBlogPosts, /JavaScript string length/)
  assert.match(chineseContent, /TextToools 按 Unicode 字素簇计数/)
  assert.match(spanishContent, /TextToools cuenta grupos de grafemas Unicode/)
  assert.match(portugueseContent, /O TextToools conta grupos de grafemas Unicode/)
  assert.equal(countGraphemes('e\u0301👨‍👩‍👧‍👦'), 2)
})

test('hyphenated-word examples in all locales match the whitespace word counter', () => {
  const englishExamples = hyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const chineseExamples = chineseHyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const spanishExamples = spanishHyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const portugueseExamples = portugueseHyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )

  assert.ok(englishExamples.length >= 5)
  assert.equal(chineseExamples.length, englishExamples.length)
  assert.equal(spanishExamples.length, englishExamples.length)
  assert.equal(portugueseExamples.length, englishExamples.length)
  for (const example of [...englishExamples, ...chineseExamples, ...spanishExamples]) {
    assert.equal(countWords(example.text, 'en'), example.count, example.text)
  }
  for (const example of portugueseExamples) {
    assert.equal(countWords(example.text, 'pt-BR'), example.count, example.text)
  }
})

test('word-count editing examples match their locale word counters', () => {
  const englishExamples = wordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const chineseExamples = chineseWordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const spanishExamples = spanishWordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const portugueseExamples = portugueseWordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )

  assert.equal(englishExamples.length, 4)
  assert.equal(portugueseExamples.length, 4)
  assert.deepEqual(
    chineseExamples.map(({ text, count }: { text: string; count: number }) => ({ text, count })),
    englishExamples.map(({ text, count }: { text: string; count: number }) => ({ text, count })),
  )
  assert.deepEqual(
    spanishExamples.map(({ text, count }: { text: string; count: number }) => ({ text, count })),
    englishExamples.map(({ text, count }: { text: string; count: number }) => ({ text, count })),
  )
  for (const example of [...englishExamples, ...chineseExamples, ...spanishExamples]) {
    assert.equal(countWords(example.text, 'en'), example.count, example.text)
  }
  for (const example of portugueseExamples) {
    assert.equal(countWords(example.text, 'pt-BR'), example.count, example.text)
  }
})

test('every translated tool guide has complete Spanish sections and FAQs', () => {
  assert.deepEqual(
    Object.keys(parsedSpanishContent.tools).sort(),
    Object.keys(parsedChineseContent.tools).sort(),
  )

  for (const guide of englishToolGuides) {
    const localizedGuide = parsedSpanishContent.tools[guide.id]
    assert.ok(localizedGuide, `${guide.id} has Spanish content`)
    assert.ok(localizedGuide.name && localizedGuide.title && localizedGuide.meta)
    assert.equal(localizedGuide.sections.length, guide.sections.length, `${guide.id} sections`)
    assert.equal(localizedGuide.faqs.length, guide.faqs.length, `${guide.id} FAQs`)
    assert.ok(localizedGuide.sections.every(
      (section: { heading: string; paragraphs: string[] }) =>
        section.heading && section.paragraphs.length > 0 && section.paragraphs.every(Boolean),
    ))
  }
})

test('every translated tool guide has complete Portuguese sections and FAQs', () => {
  assert.deepEqual(
    Object.keys(parsedPortugueseContent.tools).sort(),
    Object.keys(parsedChineseContent.tools).sort(),
  )

  for (const guide of englishToolGuides) {
    const localizedGuide = parsedPortugueseContent.tools[guide.id]
    assert.ok(localizedGuide, `${guide.id} has Portuguese content`)
    assert.ok(localizedGuide.name && localizedGuide.title && localizedGuide.meta)
    assert.equal(localizedGuide.sections.length, guide.sections.length, `${guide.id} sections`)
    assert.equal(localizedGuide.faqs.length, guide.faqs.length, `${guide.id} FAQs`)
    assert.ok(localizedGuide.sections.every(
      (section: { heading: string; paragraphs: string[] }) =>
        section.heading && section.paragraphs.length > 0 && section.paragraphs.every(Boolean),
    ))
  }
})

test('Portuguese blog posts include a founder insight and author bio', () => {
  for (const [slug, post] of Object.entries(parsedPortugueseContent.blog.posts)) {
    const authorSection = post.sections.at(-1)
    assert.equal(authorSection.heading, 'Sobre o autor', `${slug} has a final author section`)
    assert.match(authorSection.paragraphs.join(' '), /fundador do TextToools/)
    assert.match(
      post.sections.flatMap(({ paragraphs }) => paragraphs).join(' '),
      /\b(?:percebi|quis|considero|prefiro)\b/i,
      `${slug} has a first-person founder insight`,
    )
  }
})

test('Spanish keyword analysis filters common Spanish words', () => {
  const keywords = getKeywordData('Las herramientas de texto y privacidad', 'es')
  assert.deepEqual(
    keywords.entries.map(({ word }) => word).sort(),
    ['herramientas', 'privacidad', 'texto'],
  )
})

test('Portuguese keyword analysis filters common Portuguese words', () => {
  const keywords = getKeywordData('As ferramentas de texto e privacidade', 'pt-BR')
  assert.deepEqual(
    keywords.entries.map(({ word }) => word).sort(),
    ['ferramentas', 'privacidade', 'texto'],
  )
})

test('Spanish editing illustration uses correctly counted Spanish examples', () => {
  const post = parsedSpanishContent.blog.posts['how-to-cut-word-count-without-losing-meaning']
  const svg = readFileSync(new URL(`../public/${post.image}`, import.meta.url), 'utf8')
  assert.match(svg, /9 PALABRAS/)
  assert.match(svg, /6 PALABRAS/)
  assert.equal(countWords('En este momento el equipo revisa el borrador actualmente.', 'es'), 9)
  assert.equal(countWords('El equipo revisa el borrador ahora.', 'es'), 6)
})

test('every English article has localized Chinese, Spanish, and Portuguese images', () => {
  assert.ok(parsedEnglishBlogPosts.length > 0)

  for (const post of parsedEnglishBlogPosts) {
    const localizedPost = parsedChineseContent.blog.posts[post.slug]
    const spanishPost = parsedSpanishContent.blog.posts[post.slug]
    const portuguesePost = parsedPortugueseContent.blog.posts[post.slug]
    assert.ok(localizedPost, `${post.slug} has Chinese content`)
    assert.ok(spanishPost, `${post.slug} has Spanish content`)
    assert.ok(portuguesePost, `${post.slug} has Portuguese content`)
    assert.ok(spanishPost.image.startsWith('blog-images/es/'), `${post.slug} has a Spanish illustration`)
    assert.notEqual(spanishPost.image, post.image, `${post.slug} uses a localized Spanish illustration`)
    assert.ok(
      portuguesePost.image.startsWith('blog-images/pt-br/'),
      `${post.slug} has a Portuguese illustration`,
    )
    assert.notEqual(
      portuguesePost.image,
      post.image,
      `${post.slug} uses a localized Portuguese illustration`,
    )
    const imagePath = new URL(`../public/${post.image}`, import.meta.url)

    assert.ok(post.imageAlt, `${post.slug} has English alt text`)
    assert.ok(localizedPost.imageAlt, `${post.slug} has Chinese alt text`)
    assert.ok(spanishPost.imageAlt, `${post.slug} has Spanish alt text`)
    assert.ok(portuguesePost.imageAlt, `${post.slug} has Portuguese alt text`)
    assert.ok(existsSync(imagePath), `${post.image} exists`)
    assert.match(readFileSync(imagePath, 'utf8'), /<svg\b/)
    assert.ok(existsSync(new URL(`../public/${localizedPost.image}`, import.meta.url)))
    assert.match(
      readFileSync(new URL(`../public/${localizedPost.image}`, import.meta.url), 'utf8'),
      /<svg\b/,
    )
    assert.ok(existsSync(new URL(`../public/${portuguesePost.image}`, import.meta.url)))
    assert.match(
      readFileSync(new URL(`../public/${portuguesePost.image}`, import.meta.url), 'utf8'),
      /<svg\b/,
    )

    for (const localizedImage of [
      post.image,
      localizedPost.image,
      spanishPost.image,
      portuguesePost.image,
    ]) {
      const pngPath = new URL(
        `../public/${localizedImage.replace(/\.svg$/i, '.png')}`,
        import.meta.url,
      )
      assert.ok(existsSync(pngPath), `${localizedImage} has a PNG social preview`)
      const png = readFileSync(pngPath)
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      assert.equal(png.readUInt32BE(16), 1200)
      assert.equal(png.readUInt32BE(20), 630)
    }
  }
})

test('find-and-replace guide is sourced and has localized author notes', () => {
  const posts = [
    {
      post: parsedEnglishBlogPosts.find(
        (article: { slug: string }) => article.slug === 'find-replace-text-safely',
      ),
      authorHeading: 'About the author',
      authorText: 'Written by the founder of TextToools.',
    },
    {
      post: parsedSpanishContent.blog.posts['find-replace-text-safely'],
      authorHeading: 'Sobre el autor',
      authorText: 'Escrito por el fundador de TextToools.',
    },
    {
      post: parsedChineseContent.blog.posts['find-replace-text-safely'],
      authorHeading: '关于作者',
      authorText: 'TextToools 创始人',
    },
    {
      post: parsedPortugueseContent.blog.posts['find-replace-text-safely'],
      authorHeading: 'Sobre o autor',
      authorText: 'Escrito pelo fundador do TextToools.',
    },
  ]

  for (const { post, authorHeading, authorText } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    assert.ok(post.sections.at(-1).paragraphs.join(' ').includes(authorText))
    assert.deepEqual(
      post.sources.map(({ url }: { url: string }) => url).sort(),
      [
        'https://support.google.com/docs/answer/62754?hl=en',
        'https://support.microsoft.com/en-us/word/training/find-and-replace-text-in-word',
      ].sort(),
    )
  }
})

test('alphabetical sorting guide matches the tool and is localized with a source', () => {
  const posts = [
    {
      post: parsedEnglishBlogPosts.find(
        (article: { slug: string }) => article.slug === 'sort-list-alphabetically',
      ),
      authorHeading: 'About the author',
      authorText: 'Written by the founder of TextToools.',
    },
    {
      post: parsedSpanishContent.blog.posts['sort-list-alphabetically'],
      authorHeading: 'Sobre el autor',
      authorText: 'Escrito por el fundador de TextToools.',
    },
    {
      post: parsedChineseContent.blog.posts['sort-list-alphabetically'],
      authorHeading: '关于作者',
      authorText: 'TextToools 创始人',
    },
    {
      post: parsedPortugueseContent.blog.posts['sort-list-alphabetically'],
      authorHeading: 'Sobre o autor',
      authorText: 'Escrito pelo fundador do TextToools.',
    },
  ]

  for (const { post, authorHeading, authorText } of posts) {
    assert.ok(post)
    assert.ok(post.sections.length >= 5)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    assert.ok(post.sections.at(-1).paragraphs.join(' ').includes(authorText))
    assert.ok(post.sources.some(({ url }: { url: string }) => url ===
      'https://support.google.com/docs/answer/3540681?hl=en'))
  }

  assert.equal(
    sortLines('item 10\napple\nitem 2', 'az', true, false, 'en'),
    'apple\nitem 2\nitem 10',
  )
})

test('sentence-count guide examples match each locale and include localized author notes', () => {
  const posts = [
    {
      post: parsedEnglishBlogPosts.find(
        (article: { slug: string }) => article.slug === 'how-to-count-sentences-in-a-paragraph',
      ),
      locale: 'en' as const,
      authorHeading: 'About the author',
      authorText: 'Written by the founder of TextToools.',
    },
    {
      post: parsedSpanishContent.blog.posts['how-to-count-sentences-in-a-paragraph'],
      locale: 'es' as const,
      authorHeading: 'Sobre el autor',
      authorText: 'Escrito por el fundador de TextToools.',
    },
    {
      post: parsedChineseContent.blog.posts['how-to-count-sentences-in-a-paragraph'],
      locale: 'zh-CN' as const,
      authorHeading: '关于作者',
      authorText: 'TextToools 创始人',
    },
    {
      post: parsedPortugueseContent.blog.posts['how-to-count-sentences-in-a-paragraph'],
      locale: 'pt-BR' as const,
      authorHeading: 'Sobre o autor',
      authorText: 'Escrito pelo fundador do TextToools.',
    },
  ]

  for (const { post, locale, authorHeading, authorText } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    assert.ok(post.sections.at(-1).paragraphs.join(' ').includes(authorText))
    assert.ok(post.sections.some((section: { heading: string }) =>
      section.heading.toLowerCase().includes(
        locale === 'en'
          ? 'founder'
          : locale === 'es'
            ? 'fundador'
            : locale === 'pt-BR'
              ? 'fundador'
              : '创始人',
      ),
    ))
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number; unit?: string }[] }) =>
        section.examples ?? [],
    )
    assert.ok(examples.length >= 4)
    for (const example of examples) {
      assert.equal(example.unit, 'sentence')
      assert.equal(countSentences(example.text, locale), example.count, example.text)
    }
    assert.deepEqual(
      post.sources.map(({ url }: { url: string }) => url).sort(),
      [
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter',
        'https://www.unicode.org/reports/tr29/',
      ].sort(),
    )
  }
})

test('average sentence length examples match each locale word and sentence counter', () => {
  const posts = [
    {
      post: averageSentenceLengthPost,
      locale: 'en' as const,
      words: 21,
      average: 10.5,
      explanation: '21 words ÷ 2 sentences = 10.5 words per sentence.',
    },
    {
      post: parsedSpanishContent.blog.posts['average-sentence-length'],
      locale: 'es' as const,
      words: 24,
      average: 12,
      explanation: '24 palabras ÷ 2 oraciones = 12 palabras por oración.',
    },
    {
      post: parsedPortugueseContent.blog.posts['average-sentence-length'],
      locale: 'pt-BR' as const,
      words: 22,
      average: 11,
      explanation: '22 palavras ÷ 2 frases = 11 palavras por frase.',
    },
    {
      post: parsedChineseContent.blog.posts['average-sentence-length'],
      locale: 'zh-CN' as const,
      words: 24,
      average: 12,
      explanation: '24 个词语 ÷ 2 句 = 平均每句 12 个词语。',
    },
  ]

  for (const { post, locale, words, average, explanation } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, locale === 'en'
      ? 'About the author'
      : locale === 'es'
        ? 'Sobre el autor'
        : locale === 'pt-BR'
          ? 'Sobre o autor'
          : '关于作者')
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number; explanation: string }[] }) =>
        section.examples ?? [],
    )
    assert.equal(examples.length, 1)
    assert.equal(countWords(examples[0].text, locale), words, locale)
    assert.equal(countSentences(examples[0].text, locale), 2, locale)
    assert.equal(words / countSentences(examples[0].text, locale), average, locale)
    assert.equal(examples[0].count, words, locale)
    assert.equal(examples[0].explanation, explanation, locale)
    assert.ok(post.sources.some(({ url }: { url: string }) =>
      url === 'https://www.opm.gov/information-management/plain-language/'))
  }
})

test('keyword density examples match the localized checker and explain its limits', () => {
  const posts = [
    {
      post: keywordDensityGuidePost,
      locale: 'en' as const,
      term: 'clear',
      words: 25,
      percentage: 8,
      explanation: 'The word “clear” appears 2 times: 2 ÷ 25 × 100 = 8.0%.',
      authorHeading: 'About the author',
    },
    {
      post: parsedSpanishContent.blog.posts['keyword-density-guide'],
      locale: 'es' as const,
      term: 'clara',
      words: 16,
      percentage: 12.5,
      explanation: 'La palabra «clara» aparece 2 veces: 2 ÷ 16 × 100 = 12,5 %.',
      authorHeading: 'Sobre el autor',
    },
    {
      post: parsedPortugueseContent.blog.posts['keyword-density-guide'],
      locale: 'pt-BR' as const,
      term: 'clara',
      words: 15,
      percentage: 13.3,
      explanation: 'A palavra “clara” aparece 2 vezes: 2 ÷ 15 × 100 = 13,3%.',
      authorHeading: 'Sobre o autor',
    },
    {
      post: parsedChineseContent.blog.posts['keyword-density-guide'],
      locale: 'zh-CN' as const,
      term: '清晰',
      words: 15,
      percentage: 13.3,
      explanation: '“清晰”出现 2 次：2 ÷ 15 × 100 = 13.3%。',
      authorHeading: '关于作者',
    },
  ]

  for (const { post, locale, term, words, percentage, explanation, authorHeading } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number; explanation: string }[] }) =>
        section.examples ?? [],
    )
    assert.equal(examples.length, 1)
    const keywordData = getKeywordData(examples[0].text, locale)
    assert.equal(keywordData.totalWords, words, locale)
    assert.equal(examples[0].count, words, locale)
    assert.equal(examples[0].explanation, explanation, locale)
    const keywordEntry = keywordData.entries.find(({ word }) => word === term)
    assert.ok(keywordEntry, `${locale} ranks ${term}`)
    assert.equal(keywordEntry.count, 2, locale)
    assert.equal(Math.round(keywordEntry.percentage * 10) / 10, percentage, locale)
    assert.ok(post.sources.some(({ url }: { url: string }) =>
      url === 'https://developers.google.com/search/docs/essentials/spam-policies#keyword-stuffing'))
    const articleText = post.sections.flatMap(
      (section: { paragraphs: string[] }) => section.paragraphs,
    ).join(' ')
    assert.match(articleText, /founder|fundador|创始人/i)
    assert.match(articleText, /checker|contador|统计工具/i)
  }
})

test('Google Docs word-count examples match each locale counter and source its exclusions', () => {
  const posts = [
    {
      post: googleDocsWordCountPost,
      locale: 'en' as const,
      words: 11,
      authorHeading: 'About the author',
      exclusions: /headers, footers, and footnotes/,
    },
    {
      post: parsedSpanishContent.blog.posts['google-docs-word-count'],
      locale: 'es' as const,
      words: 10,
      authorHeading: 'Sobre el autor',
      exclusions: /encabezados, pies de página y notas al pie/,
    },
    {
      post: parsedPortugueseContent.blog.posts['google-docs-word-count'],
      locale: 'pt-BR' as const,
      words: 10,
      authorHeading: 'Sobre o autor',
      exclusions: /cabeçalhos, rodapés e notas de rodapé/,
    },
    {
      post: parsedChineseContent.blog.posts['google-docs-word-count'],
      locale: 'zh-CN' as const,
      words: 11,
      authorHeading: '关于作者',
      exclusions: /页眉、页脚和脚注/,
    },
  ]

  for (const { post, locale, words, authorHeading, exclusions } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number }[] }) =>
        section.examples ?? [],
    )
    assert.equal(examples.length, 1)
    assert.equal(countWords(examples[0].text, locale), words, locale)
    assert.equal(examples[0].count, words, locale)
    assert.match(post.sections.flatMap(
      (section: { paragraphs: string[] }) => section.paragraphs,
    ).join(' '), exclusions)
    assert.deepEqual(
      post.sources.map(({ url }: { url: string }) => url),
      ['https://support.google.com/docs/answer/39003?hl=en'],
    )
  }
})

test('Google Sheets word-count formulas are localized, scoped, and sourced', () => {
  const posts = [
    {
      post: googleSheetsWordCountPost,
      authorHeading: 'About the author',
      founderHeading: 'A note from the founder',
    },
    {
      post: parsedSpanishContent.blog.posts['how-to-count-words-in-google-sheets'],
      authorHeading: 'Sobre el autor',
      founderHeading: 'Una nota del fundador',
    },
    {
      post: parsedPortugueseContent.blog.posts['how-to-count-words-in-google-sheets'],
      authorHeading: 'Sobre o autor',
      founderHeading: 'Uma observação do fundador',
    },
    {
      post: parsedChineseContent.blog.posts['how-to-count-words-in-google-sheets'],
      authorHeading: '关于作者',
      founderHeading: '创始人的一点想法',
    },
  ]
  const sourceUrls = [
    'https://support.google.com/docs/answer/3094136?hl=en',
    'https://support.google.com/docs/answer/3098245?hl=en',
    'https://support.google.com/docs/answer/3094140?hl=en',
    'https://support.google.com/docs/answer/7013992?hl=en',
    'https://github.com/google/re2/blob/main/doc/syntax.txt',
  ]
  const expectedSample = 'The quick brown fox jumps over the lazy dog.'
  let expectedFormulas: string[] | undefined

  for (const { post, authorHeading, founderHeading } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number; explanation: string }[] }) =>
        section.examples ?? [],
    )
    assert.equal(examples.length, 2)
    assert.deepEqual(examples.map(({ count }: { count: number }) => count), [9, 9])
    assert.equal(countWords(expectedSample, 'en'), 9)
    assert.ok(examples[0].explanation.includes(expectedSample))
    assert.ok(examples[1].explanation.includes('The quick brown fox'))
    assert.ok(examples[1].explanation.includes('jumps over the lazy dog.'))
    assert.ok(examples[0].text.includes('REGEXREPLACE'))
    assert.ok(examples[0].text.includes('\\s+'))
    assert.ok(examples[0].text.includes('SPLIT'))
    assert.ok(examples[0].text.includes('COUNTA'))
    assert.ok(examples[0].text.includes('LEN'))
    assert.ok(examples[1].text.includes('TEXTJOIN'))
    assert.ok(examples[1].text.includes('A1:A10'))
    assert.ok(examples.every(({ text }: { text: string }) => text.includes('COUNTA')))
    assert.deepEqual(post.sources.map(({ url }: { url: string }) => url), sourceUrls)

    const headings = post.sections.map(({ heading }: { heading: string }) => heading)
    assert.ok(headings.includes(founderHeading))
    const articleText = post.sections.flatMap(
      ({ paragraphs }: { paragraphs: string[] }) => paragraphs,
    ).join(' ')
    assert.match(articleText, /founder|fundador|创始人/i)
    const formulas = examples.map(({ text }: { text: string }) => text)
    if (expectedFormulas) {
      assert.deepEqual(formulas, expectedFormulas)
    } else {
      expectedFormulas = formulas
    }
  }
})

test('Excel character-count examples match LEN rules in every locale', () => {
  const posts = [
    {
      post: excelCharacterCountPost,
      authorHeading: 'About the author',
      founderHeading: 'A note from the founder',
    },
    {
      post: parsedSpanishContent.blog.posts['how-to-count-characters-in-excel'],
      authorHeading: 'Sobre el autor',
      founderHeading: 'Una nota del fundador',
    },
    {
      post: parsedPortugueseContent.blog.posts['how-to-count-characters-in-excel'],
      authorHeading: 'Sobre o autor',
      founderHeading: 'Uma observação do fundador',
    },
    {
      post: parsedChineseContent.blog.posts['how-to-count-characters-in-excel'],
      authorHeading: '关于作者',
      founderHeading: '创始人的一点想法',
    },
  ]
  const sourceUrls = [
    'https://support.microsoft.com/en-us/excel/functions/len-function',
    'https://support.microsoft.com/en-us/excel/count-characters-in-cells-in-excel',
    'https://support.microsoft.com/en-us/excel/compatibility-versions',
  ]
  const sampleLengths = [20, 19]
  let expectedFormulas: string[] | undefined

  for (const { post, authorHeading, founderHeading } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number }[] }) =>
        section.examples ?? [],
    )
    assert.equal(examples.length, 2)
    assert.deepEqual(
      examples.map(({ count }: { count: number }) => count),
      sampleLengths,
    )
    assert.equal(countGraphemes('The quick brown fox.'), 20)
    assert.equal(countGraphemes('The quick brown') + countGraphemes('fox.'), 19)
    assert.equal(examples[0].text, '=LEN(A1)')
    assert.equal(examples[1].text, '=SUM(LEN(A1),LEN(A2))')
    assert.deepEqual(post.sources.map(({ url }: { url: string }) => url), sourceUrls)

    const headings = post.sections.map(({ heading }: { heading: string }) => heading)
    assert.ok(headings.includes(founderHeading))
    const articleText = post.sections.flatMap(
      ({ paragraphs }: { paragraphs: string[] }) => paragraphs,
    ).join(' ')
    assert.match(articleText, /spaces|espacios|espaços|空格/i)
    assert.match(articleText, /variation selectors|selectores de variación|seletores de variação|变体选择符/i)
    const formulas = examples.map(({ text }: { text: string }) => text)
    if (expectedFormulas) {
      assert.deepEqual(formulas, expectedFormulas)
    } else {
      expectedFormulas = formulas
    }
  }
})

test('PDF word-count guide is accurate, localized, and linked to its text counter', () => {
  const posts = [
    {
      post: parsedEnglishBlogPosts.find(
        (article: { slug: string }) => article.slug === 'how-to-count-words-in-a-pdf',
      ),
      authorHeading: 'About the author',
      authorText: 'Written by the founder of TextToools.',
      founderHeading: 'A note from the founder',
    },
    {
      post: parsedSpanishContent.blog.posts['how-to-count-words-in-a-pdf'],
      authorHeading: 'Sobre el autor',
      authorText: 'Escrito por el fundador de TextToools.',
      founderHeading: 'Una nota del fundador',
    },
    {
      post: parsedChineseContent.blog.posts['how-to-count-words-in-a-pdf'],
      authorHeading: '关于作者',
      authorText: 'TextToools 创始人',
      founderHeading: '创始人的一点想法',
    },
    {
      post: parsedPortugueseContent.blog.posts['how-to-count-words-in-a-pdf'],
      authorHeading: 'Sobre o autor',
      authorText: 'Escrito pelo fundador do TextToools.',
      founderHeading: 'Uma observação do fundador',
    },
  ]

  for (const { post, authorHeading, authorText, founderHeading } of posts) {
    assert.ok(post)
    assert.ok(post.sections.length >= 7)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    assert.ok(post.sections.at(-1).paragraphs.join(' ').includes(authorText))
    assert.ok(post.sections.some((section: { heading: string }) => section.heading === founderHeading))
    const articleText = post.sections.flatMap(
      (section: { paragraphs: string[] }) => section.paragraphs,
    ).join(' ')
    assert.match(articleText, /OCR|reconocimiento óptico|reconhecimento óptico|光学字符识别/i)
    assert.match(articleText, /PDF/)
    assert.deepEqual(
      post.sources.map(({ url }: { url: string }) => url).sort(),
      [
        'https://support.google.com/drive/answer/176692?hl=en',
        'https://support.microsoft.com/en-us/office/opening-pdfs-in-word-0b36fa53-00c1-404c-b3c3-dc26df397aee',
      ].sort(),
    )
  }
})

test('five-minute speech estimates are accurate, localized, and distinguish rehearsal from word count', () => {
  const posts = [
    {
      post: fiveMinuteSpeechPost,
      locale: 'en',
      authorHeading: 'About the author',
      authorText: 'Written by the founder of TextToools.',
      founderHeading: 'A note from the founder',
    },
    {
      post: parsedSpanishContent.blog.posts['five-minute-speech-word-count'],
      locale: 'es',
      authorHeading: 'Sobre el autor',
      authorText: 'Escrito por el fundador de TextToools.',
      founderHeading: 'Una nota del fundador',
    },
    {
      post: parsedPortugueseContent.blog.posts['five-minute-speech-word-count'],
      locale: 'pt-BR',
      authorHeading: 'Sobre o autor',
      authorText: 'Escrito pelo fundador do TextToools.',
      founderHeading: 'Uma observação do fundador',
    },
    {
      post: parsedChineseContent.blog.posts['five-minute-speech-word-count'],
      locale: 'zh-CN',
      authorHeading: '关于作者',
      authorText: 'TextToools 创始人',
      founderHeading: '创始人的一点想法',
    },
  ]

  assert.equal(5 * 120, 600)
  assert.equal(5 * 140, 700)
  assert.equal(5 * 160, 800)

  for (const { post, locale, authorHeading, authorText, founderHeading } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    assert.ok(post.sections.at(-1).paragraphs.join(' ').includes(authorText))
    assert.ok(post.sections.some((section: { heading: string }) =>
      section.heading === founderHeading,
    ))
    const articleText = post.sections.flatMap(
      (section: { paragraphs: string[] }) => section.paragraphs,
    ).join(' ')
    assert.match(articleText, /600/)
    assert.match(articleText, /800/)
    assert.match(articleText, /Toastmasters/)
    assert.match(articleText, /rehears|ensay|ensai|排练/i)
    assert.match(articleText, /pause|pausa|停顿/i)
    assert.deepEqual(
      post.sources.map(({ url }: { url: string }) => url).sort(),
      [
        'https://ccdn.toastmasters.org/medias/files/department-documents/education-documents/199-your-speaking-voice.pdf',
        'https://toastmasters.org/magazine/magazine-issues/2025/feb/manage-your-speaking-time',
      ].sort(),
      locale,
    )
  }
})

test('Chinese word-count examples match the localized segmenter and distinguish words from characters', () => {
  const posts = [
    {
      post: chineseWordCountPost,
      authorHeading: 'About the author',
      authorText: 'Written by the founder of TextToools.',
      founderHeading: 'A note from the founder',
    },
    {
      post: parsedSpanishContent.blog.posts['how-to-count-words-in-chinese'],
      authorHeading: 'Sobre el autor',
      authorText: 'Escrito por el fundador de TextToools.',
      founderHeading: 'Una nota del fundador',
    },
    {
      post: parsedPortugueseContent.blog.posts['how-to-count-words-in-chinese'],
      authorHeading: 'Sobre o autor',
      authorText: 'Escrito pelo fundador do TextToools.',
      founderHeading: 'Uma observação do fundador',
    },
    {
      post: parsedChineseContent.blog.posts['how-to-count-words-in-chinese'],
      authorHeading: '关于作者',
      authorText: 'TextToools 创始人',
      founderHeading: '创始人的一点想法',
    },
  ]

  for (const { post, authorHeading, authorText, founderHeading } of posts) {
    assert.ok(post)
    assert.equal(post.sections.at(-1).heading, authorHeading)
    assert.ok(post.sections.at(-1).paragraphs.join(' ').includes(authorText))
    assert.ok(post.sections.some((section: { heading: string }) =>
      section.heading === founderHeading,
    ))
    const examples = post.sections.flatMap(
      (section: { examples?: { text: string; count: number; explanation: string }[] }) =>
        section.examples ?? [],
    )
    assert.equal(examples.length, 1)
    assert.equal(examples[0].count, 8)
    assert.equal(countWords(examples[0].text, 'zh-CN'), examples[0].count)
    assert.equal(examples[0].text, '\u4eca\u5929\u7684\u5929\u6c14\u5f88\u597d\uff0c\u6211\u4eec\u53bb\u516c\u56ed\u6563\u6b65\u3002')
    const articleText = post.sections.flatMap(
      (section: { paragraphs: string[] }) => section.paragraphs,
    ).join(' ')
    assert.match(articleText, /segmentation|segmentación|segmentação|分词/i)
    assert.match(articleText, /character|caracter|汉字|字符/i)
    assert.deepEqual(
      post.sources.map(({ url }: { url: string }) => url).sort(),
      [
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter',
        'https://www.unicode.org/reports/tr29/',
      ].sort(),
    )
  }
})
