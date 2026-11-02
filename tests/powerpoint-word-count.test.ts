import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { countWords } from '../src/tool-logic.ts'

const englishPosts = JSON.parse(
  readFileSync(new URL('../src/blog-posts.json', import.meta.url), 'utf8'),
)
const locales = [
  {
    name: 'English',
    posts: englishPosts,
  },
  {
    name: 'Chinese',
    posts: JSON.parse(readFileSync(new URL('../src/zh-CN.json', import.meta.url), 'utf8')).blog
      .posts,
  },
  {
    name: 'Spanish',
    posts: JSON.parse(readFileSync(new URL('../src/es.json', import.meta.url), 'utf8')).blog.posts,
  },
  {
    name: 'Portuguese',
    posts: JSON.parse(readFileSync(new URL('../src/pt-BR.json', import.meta.url), 'utf8')).blog
      .posts,
  },
  {
    name: 'French',
    posts: JSON.parse(readFileSync(new URL('../src/fr.json', import.meta.url), 'utf8')).blog.posts,
  },
]

test('PowerPoint word-count guide is sourced and complete in every locale', () => {
  const slug = 'count-words-in-powerpoint'
  const sourceUrl =
    'https://support.microsoft.com/en-us/powerpoint/find-the-word-count-of-your-presentation'
  const englishPost = englishPosts.find(({ slug: postSlug }: { slug: string }) => postSlug === slug)
  assert.ok(englishPost)
  const example = englishPost.sections.flatMap(
    ({ examples }: { examples?: { text: string; count: number }[] }) => examples ?? [],
  )[0]
  assert.ok(example)
  assert.equal(countWords(example.text, 'en'), example.count)
  assert.ok(englishPost.sections.some(({ paragraphs }: { paragraphs: string[] }) =>
    paragraphs.some((paragraph) => paragraph.includes('slides and the notes pages')),
  ))

  for (const { name, posts } of locales) {
    const post = Array.isArray(posts)
      ? posts.find(({ slug: postSlug }: { slug: string }) => postSlug === slug)
      : posts[slug]
    assert.ok(post, `${name} has the PowerPoint article`)
    assert.ok(post.title, `${name} has an article title`)
    assert.ok(post.description, `${name} has a meta description`)
    assert.ok(post.imageAlt, `${name} has localized image alt text`)
    assert.equal(post.sections.length, englishPost.sections.length, `${name} section count`)
    assert.equal(post.sections.at(-1).heading, name === 'English' ? 'About the author' :
      name === 'Chinese' ? '关于作者' :
        name === 'Spanish' ? 'Sobre el autor' :
          name === 'Portuguese' ? 'Sobre o autor' : 'À propos de l’auteur',
    `${name} author section`)
    assert.equal(
      post.sections.flatMap(
        ({ examples }: { examples?: { text: string; count: number }[] }) => examples ?? [],
      )[0]?.count,
      example.count,
      `${name} example count`,
    )
    assert.equal(post.sources?.[0]?.url, sourceUrl, `${name} preserves the official source`)
  }
})
