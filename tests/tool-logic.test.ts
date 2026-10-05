import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cleanText,
  computeMetrics,
  convertCase,
  countGraphemes,
  countSentences,
  countWords,
  formatReadingTime,
  generateLoremText,
  getKeywordData,
  getToolOutputContent,
  removeDuplicateLines,
  replaceMatches,
  resolveRouteKind,
  sortLines,
} from '../src/tool-logic.ts'

test('word counter handles empty, whitespace, Unicode, and CJK input', () => {
  assert.equal(countWords(''), 0)
  assert.equal(countWords(' \n\t '), 0)
  assert.equal(countWords('Two words 🙂'), 3)
  assert.equal(countWords('你好世界', 'zh-CN'), 2)
})

test('sentence counter counts sentences rather than punctuation fragments', () => {
  assert.equal(countSentences('Hello, world!\nNew line. 🙂'), 2)
  assert.equal(countSentences('One. Two? Three!'), 3)
  assert.equal(countSentences('First line.\nSecond line.'), 2)
  assert.equal(countSentences('Unpunctuated text\ncontinues here'), 1)
  assert.equal(countSentences('Text without punctuation'), 1)
  assert.equal(countSentences('... 🙂'), 0)
  assert.equal(countSentences(' \n\t '), 0)
  assert.equal(countSentences('第一句。第二句！', 'zh-CN'), 2)
})

test('character counter counts Unicode grapheme clusters consistently', () => {
  assert.equal(countGraphemes('ABC'), 3)
  assert.equal(countGraphemes('café'), 4)
  assert.equal(countGraphemes('e\u0301'), 1)
  assert.equal(countGraphemes('🙂'), 1)
  assert.equal(countGraphemes('👩🏽‍💻'), 1)
  assert.equal(countGraphemes('🇵🇹'), 1)
  assert.equal(countGraphemes('你好'), 2)
  const metrics = computeMetrics('A🙂\nB', 'en', 200)
  assert.equal(metrics.characters, 4)
  assert.equal(metrics.charactersNoSpaces, 3)
  assert.equal(computeMetrics('', 'en', 200).characters, 0)
})

test('case converter supports all formats and preserves line separation', () => {
  assert.equal(convertCase('hello WORLD', 'upper'), 'HELLO WORLD')
  assert.equal(convertCase('HELLO WORLD', 'lower'), 'hello world')
  assert.equal(convertCase('a quiet morning', 'title'), 'A Quiet Morning')
  assert.equal(convertCase('hello. WORLD!', 'sentence'), 'Hello. World!')
  assert.equal(convertCase('ação rápida', 'camel'), 'açãoRápida')
  assert.equal(convertCase('ação rápida\nsecond line', 'snake'), 'ação_rápida\nsecond_line')
  assert.equal(convertCase('', 'upper'), '')
})

test('text cleaner returns the exact transformed value, including empty results', () => {
  assert.equal(cleanText('  hello  \n\tworld\t ', true, true, true), 'hello\nworld')
  assert.equal(cleanText(' \t  \n\t ', true, true, true), '')
  assert.equal(cleanText('', true, true, true), '')
  assert.equal(cleanText('a\n\n\nb', false, false, true), 'a\n\nb')
})

test('duplicate-line removal and sorting preserve meaningful empty output', () => {
  assert.equal(removeDuplicateLines('a\nb\na'), 'a\nb')
  assert.equal(removeDuplicateLines(''), '')
  assert.equal(sortLines('c\na\nb', 'az', true, false, 'en'), 'a\nb\nc')
  assert.equal(sortLines('item 10\nitem 2', 'az', true, false, 'en'), 'item 2\nitem 10')
  assert.equal(sortLines('a\n\nb', 'az', true, true, 'en'), 'a\nb')
  assert.equal(sortLines(' \n\t ', 'az', true, true, 'en'), '')
  assert.equal(sortLines('', 'reverse', true, false, 'en'), '')
})

test('find and replace treats the search term literally and supports empty replacements', () => {
  assert.deepEqual(replaceMatches('a+b a+b', 'a+b', '', true, false), {
    text: ' ',
    count: 2,
  })
  assert.deepEqual(replaceMatches('cat scatter CAT', 'cat', 'dog', false, true), {
    text: 'dog scatter dog',
    count: 2,
  })
  assert.deepEqual(replaceMatches('unchanged', '', 'x', true, false), {
    text: 'unchanged',
    count: 0,
  })
})

test('Lorem Ipsum generator is deterministic and respects paragraph and sentence counts', () => {
  const generated = generateLoremText(2, 3, true)
  assert.equal(generated, generateLoremText(2, 3, true))
  assert.equal(generated.split('\n\n').length, 2)
  assert.equal((generated.match(/[.!?](?:\s|$)/g) ?? []).length, 6)
  assert.ok(generated.startsWith('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'))
  assert.equal(generateLoremText(0, 3, false), '')
})

test('reading time calculations and output cover empty and non-empty text', () => {
  assert.equal(formatReadingTime(0, 0), '0 min 0 sec')
  assert.equal(formatReadingTime(1, 1), 'less than 1 min')
  assert.equal(formatReadingTime(200, 60), '1 min 0 sec')
  assert.equal(computeMetrics('one two', 'en', 200).readingSeconds, 1)
})

test('keyword density excludes stop words and calculates frequency', () => {
  assert.deepEqual(getKeywordData('the apple apple pear', 'en'), {
    totalWords: 4,
    entries: [
      { word: 'apple', count: 2, percentage: 50 },
      { word: 'pear', count: 1, percentage: 25 },
    ],
  })
  assert.equal(getKeywordData('我们使用文本工具', 'zh-CN').totalWords, 4)
})

test('copy/download source preserves an intentionally empty transformed result', () => {
  const metrics = computeMetrics('', 'en', 200)
  assert.equal(getToolOutputContent('text-cleaner', '', metrics, 200, 'en'), '')
  assert.equal(getToolOutputContent('text-sorter', '', metrics, 200, 'en'), '')
  assert.equal(getToolOutputContent('find-replace', '', metrics, 200, 'en'), '')
})

test('route resolver distinguishes valid routes from unknown paths', () => {
  const tools = ['word-counter', 'find-replace']
  const pages = ['faq', 'about']
  const posts = ['word-count-guide']
  assert.equal(resolveRouteKind('', tools, pages, posts), 'home')
  assert.equal(resolveRouteKind('tools/word-counter/', tools, pages, posts), 'tool')
  assert.equal(resolveRouteKind('faq', tools, pages, posts), 'information')
  assert.equal(resolveRouteKind('blog/', tools, pages, posts), 'blog-index')
  assert.equal(resolveRouteKind('blog/word-count-guide/', tools, pages, posts), 'blog-post')
  assert.equal(resolveRouteKind('tools/unknown/', tools, pages, posts), 'not-found')
  assert.equal(resolveRouteKind('blog/not-a-post/', tools, pages, posts), 'not-found')
  assert.equal(resolveRouteKind('unknown/path', tools, pages, posts), 'not-found')
})
