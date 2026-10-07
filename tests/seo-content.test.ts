import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { countGraphemes, countWords, getKeywordData } from '../src/tool-logic'
import { createSeoMetadata, injectPrerenderedApp } from '../scripts/seo-metadata.mjs'

const englishBlogPosts = readFileSync(new URL('../src/blog-posts.json', import.meta.url), 'utf8')
const chineseContent = readFileSync(new URL('../src/zh-CN.json', import.meta.url), 'utf8')
const spanishContent = readFileSync(new URL('../src/es.json', import.meta.url), 'utf8')
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
  assert.equal(countGraphemes('e\u0301👨‍👩‍👧‍👦'), 2)
})

test('hyphenated-word examples in all locales match the English word counter', () => {
  const englishExamples = hyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const chineseExamples = chineseHyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const spanishExamples = spanishHyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )

  assert.ok(englishExamples.length >= 5)
  assert.equal(chineseExamples.length, englishExamples.length)
  assert.equal(spanishExamples.length, englishExamples.length)
  for (const example of [...englishExamples, ...chineseExamples, ...spanishExamples]) {
    assert.equal(countWords(example.text, 'en'), example.count, example.text)
  }
})

test('word-count editing examples in all locales match the English word counter', () => {
  const englishExamples = wordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const chineseExamples = chineseWordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const spanishExamples = spanishWordCountEditingPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )

  assert.equal(englishExamples.length, 4)
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

test('Spanish keyword analysis filters common Spanish words', () => {
  const keywords = getKeywordData('Las herramientas de texto y privacidad', 'es')
  assert.deepEqual(
    keywords.entries.map(({ word }) => word).sort(),
    ['herramientas', 'privacidad', 'texto'],
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

test('every English article has localized Chinese and Spanish alt text and social images', () => {
  assert.ok(parsedEnglishBlogPosts.length > 0)

  for (const post of parsedEnglishBlogPosts) {
    const localizedPost = parsedChineseContent.blog.posts[post.slug]
    const spanishPost = parsedSpanishContent.blog.posts[post.slug]
    assert.ok(localizedPost, `${post.slug} has Chinese content`)
    assert.ok(spanishPost, `${post.slug} has Spanish content`)
    assert.ok(spanishPost.image.startsWith('blog-images/es/'), `${post.slug} has a Spanish illustration`)
    assert.notEqual(spanishPost.image, post.image, `${post.slug} uses a localized Spanish illustration`)
    const imagePath = new URL(`../public/${post.image}`, import.meta.url)

    assert.ok(post.imageAlt, `${post.slug} has English alt text`)
    assert.ok(localizedPost.imageAlt, `${post.slug} has Chinese alt text`)
    assert.ok(spanishPost.imageAlt, `${post.slug} has Spanish alt text`)
    assert.ok(existsSync(imagePath), `${post.image} exists`)
    assert.match(readFileSync(imagePath, 'utf8'), /<svg\b/)
    assert.ok(existsSync(new URL(`../public/${localizedPost.image}`, import.meta.url)))
    assert.match(
      readFileSync(new URL(`../public/${localizedPost.image}`, import.meta.url), 'utf8'),
      /<svg\b/,
    )

    for (const localizedImage of [post.image, localizedPost.image, spanishPost.image]) {
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
