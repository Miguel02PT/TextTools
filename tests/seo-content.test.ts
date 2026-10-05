import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { countGraphemes, countWords } from '../src/tool-logic'
import { createSeoMetadata } from '../scripts/seo-metadata.mjs'

const englishBlogPosts = readFileSync(new URL('../src/blog-posts.json', import.meta.url), 'utf8')
const chineseContent = readFileSync(new URL('../src/zh-CN.json', import.meta.url), 'utf8')
const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
const seoGenerator = readFileSync(
  new URL('../scripts/generate-seo-pages.mjs', import.meta.url),
  'utf8',
)
const parsedEnglishBlogPosts = JSON.parse(englishBlogPosts)
const parsedChineseContent = JSON.parse(chineseContent)
const hyphenatedWordsPost = parsedEnglishBlogPosts.find(
  (post: { slug: string }) => post.slug === 'how-word-counters-count-hyphenated-words',
)
const chineseHyphenatedWordsPost = parsedChineseContent.blog.posts[
  'how-word-counters-count-hyphenated-words'
]

test('default production URL uses the live custom domain for assets and SEO', () => {
  const liveSiteUrl = 'https://texttoools.com/'
  assert.ok(viteConfig.includes(`const defaultSiteUrl = '${liveSiteUrl}'`))
  assert.ok(seoGenerator.includes(`const defaultSiteUrl = '${liveSiteUrl}'`))
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

test('character-count guidance matches the Unicode grapheme counter in both locales', () => {
  assert.match(englishBlogPosts, /TextToools counts Unicode grapheme clusters/)
  assert.doesNotMatch(englishBlogPosts, /JavaScript string length/)
  assert.match(chineseContent, /TextToools 按 Unicode 字素簇计数/)
  assert.equal(countGraphemes('e\u0301👨‍👩‍👧‍👦'), 2)
})

test('hyphenated-word examples in both locales match the English word counter', () => {
  const englishExamples = hyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )
  const chineseExamples = chineseHyphenatedWordsPost.sections.flatMap(
    (section: { examples?: { text: string; count: number }[] }) => section.examples ?? [],
  )

  assert.ok(englishExamples.length >= 5)
  assert.equal(chineseExamples.length, englishExamples.length)
  for (const example of [...englishExamples, ...chineseExamples]) {
    assert.equal(countWords(example.text, 'en'), example.count, example.text)
  }
})

test('every English and Chinese blog article has an original local illustration and alt text', () => {
  assert.ok(parsedEnglishBlogPosts.length > 0)

  for (const post of parsedEnglishBlogPosts) {
    const localizedPost = parsedChineseContent.blog.posts[post.slug]
    assert.ok(localizedPost, `${post.slug} has Chinese content`)
    const imagePath = new URL(`../public/${post.image}`, import.meta.url)

    assert.ok(post.imageAlt, `${post.slug} has English alt text`)
    assert.ok(localizedPost.imageAlt, `${post.slug} has Chinese alt text`)
    assert.ok(existsSync(imagePath), `${post.image} exists`)
    assert.match(readFileSync(imagePath, 'utf8'), /<svg\b/)
    assert.ok(existsSync(new URL(`../public/${localizedPost.image}`, import.meta.url)))
    assert.match(
      readFileSync(new URL(`../public/${localizedPost.image}`, import.meta.url), 'utf8'),
      /<svg\b/,
    )

    for (const localizedImage of [post.image, localizedPost.image]) {
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
