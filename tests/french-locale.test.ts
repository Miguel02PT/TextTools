import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const french = JSON.parse(readFileSync(new URL('../src/fr.json', import.meta.url), 'utf8'))
const spanish = JSON.parse(readFileSync(new URL('../src/es.json', import.meta.url), 'utf8'))
const englishTools = JSON.parse(
  readFileSync(new URL('../src/tool-pages.json', import.meta.url), 'utf8'),
)
const englishPosts = JSON.parse(
  readFileSync(new URL('../src/blog-posts.json', import.meta.url), 'utf8'),
)

test('French locale covers every shared UI string, tool guide, and blog post', () => {
  for (const key of Object.keys(spanish.site)) {
    assert.ok(french.site[key], `French site copy includes ${key}`)
  }
  assert.deepEqual(Object.keys(french.inline).sort(), Object.keys(spanish.inline).sort())
  assert.deepEqual(
    Object.keys(french.tools).sort(),
    englishTools.map(({ id }: { id: string }) => id).sort(),
  )
  assert.deepEqual(
    Object.keys(french.blog.posts).sort(),
    englishPosts.map(({ slug }: { slug: string }) => slug).sort(),
  )
  assert.ok(french.blog.title)
  assert.ok(french.blog.description)
  assert.ok(french.blog.intro)

  for (const tool of englishTools) {
    const guide = french.tools[tool.id]
    assert.ok(guide.name, `${tool.id} has a French name`)
    assert.ok(guide.description, `${tool.id} has a French description`)
    assert.ok(guide.title, `${tool.id} has a French SEO title`)
    assert.ok(guide.meta, `${tool.id} has a French meta description`)
    assert.equal(guide.sections.length, tool.sections.length, `${tool.id} sections`)
    assert.equal(guide.faqs.length, tool.faqs.length, `${tool.id} FAQs`)
  }

  for (const post of englishPosts) {
    const localized = french.blog.posts[post.slug]
    assert.ok(localized.title, `${post.slug} has a French title`)
    assert.ok(localized.description, `${post.slug} has a French description`)
    assert.ok(localized.summary, `${post.slug} has a French summary`)
    assert.ok(localized.imageAlt, `${post.slug} has French image alternative text`)
    assert.equal(localized.sections.length, post.sections.length, `${post.slug} sections`)
    assert.deepEqual(
      (localized.sources ?? []).map(({ url }: { url: string }) => url).sort(),
      (post.sources ?? []).map(({ url }: { url: string }) => url).sort(),
      `${post.slug} preserves source links`,
    )
    assert.equal(localized.image, post.image, `${post.slug} uses the shared artwork`)
    const imagePath = new URL(`../public/${localized.image}`, import.meta.url)
    const previewPath = new URL(
      `../public/${localized.image.replace(/\.svg$/i, '.png')}`,
      import.meta.url,
    )
    assert.ok(existsSync(imagePath), `${post.slug} artwork exists`)
    assert.ok(existsSync(previewPath), `${post.slug} social preview exists`)
    const preview = readFileSync(previewPath)
    assert.equal(preview.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(preview.readUInt32BE(16), 1200)
    assert.equal(preview.readUInt32BE(20), 630)
  }
})
