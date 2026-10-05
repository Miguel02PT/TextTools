import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { createSeoMetadata } from '../scripts/seo-metadata.mjs'

const englishPosts = JSON.parse(
  readFileSync(new URL('../src/blog-posts.json', import.meta.url), 'utf8'),
)
const chinesePosts = JSON.parse(
  readFileSync(new URL('../src/zh-CN.json', import.meta.url), 'utf8'),
).blog.posts

test('brand correction changes only the site name, not the canonical URL', () => {
  const html = createSeoMetadata({
    title: 'Word Counter | TextToools',
    description: 'Count words online',
    canonicalUrl: 'https://texttoools.com/tools/word-counter/',
    structuredData: {},
    alternates: [{ language: 'en', url: 'https://texttoools.com/tools/word-counter/' }],
  })

  assert.match(html, /property="og:site_name" content="TextToools"/)
  assert.match(html, /property="og:title" content="Word Counter \| TextToools"/)
  assert.match(html, /rel="canonical" href="https:\/\/texttoools\.com\/tools\/word-counter\/"/)
})

test('blog metadata generates escaped Open Graph and X image cards', () => {
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
  assert.match(html, /name="twitter:image:alt" content="A &quot;useful&quot; &amp; &lt;clear&gt; example"/)
})

test('each localized article image is a local 1200x630 PNG', () => {
  for (const englishPost of englishPosts) {
    const locales = [englishPost, chinesePosts[englishPost.slug]]

    for (const post of locales) {
      assert.ok(post.imageAlt, `${englishPost.slug} has localized alternative text`)
      const imageUrl = new URL(`../public/${post.image}`, import.meta.url)
      assert.ok(existsSync(imageUrl), `${post.image} exists`)

      const png = readFileSync(imageUrl)
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      assert.equal(png.readUInt32BE(16), 1200)
      assert.equal(png.readUInt32BE(20), 630)
    }
  }
})

test('Instagram avatar is a square 1080px PNG using the corrected brand name', () => {
  const avatar = readFileSync(
    new URL('../public/brand/texttoools-instagram-avatar.png', import.meta.url),
  )
  const avatarSvg = readFileSync(
    new URL('../public/brand/texttoools-instagram-avatar.svg', import.meta.url),
    'utf8',
  )

  assert.equal(avatar.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(avatar.readUInt32BE(16), 1080)
  assert.equal(avatar.readUInt32BE(20), 1080)
  assert.match(avatarSvg, /<title>TextToools logo avatar<\/title>/)
})
