import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareText,
  cleanText,
  computeMetrics,
  convertCase,
  countGraphemes,
  countSentences,
  countWords,
  getBlogPageCount,
  getBlogPaginationItems,
  getBlogPagePath,
  formatReadingTime,
  formatTextDiff,
  formatSelectedLinesAsList,
  formatTodoList,
  getLocalDateInputValue,
  getTodoDownloadFilename,
  generateLoremText,
  getKeywordData,
  parseTodoLists,
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
  assert.equal(countWords('Olá!\nTudo bem', 'pt-BR'), 3)
  assert.equal(countWords('Bonjour le monde', 'fr'), 3)
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
  assert.equal(countSentences('Uma frase. Outra!', 'pt-BR'), 2)
  assert.equal(countSentences('Bonjour. Comment allez-vous ?', 'fr'), 2)
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

test('notepad list formatting handles selections, blank lines, and existing markers', () => {
  const bullets = formatSelectedLinesAsList(
    'before\nfirst\n\nsecond\nafter',
    8,
    17,
    'bulleted',
  )
  assert.equal(bullets.text, 'before\n- first\n\n- second\nafter')
  assert.equal(bullets.text.slice(bullets.selectionStart, bullets.selectionEnd), '- first\n\n- second')

  assert.equal(
    formatSelectedLinesAsList('old\n3) second\n', 0, 13, 'numbered').text,
    '1. old\n2. second\n',
  )
  assert.equal(
    formatSelectedLinesAsList('one\ntwo', 5, 5, 'numbered').text,
    'one\n1. two',
  )
})

test('daily task lists validate storage and export the selected date and completion state', () => {
  const date = '2026-11-05'
  const lists = {
    [date]: [
      { id: 'a', text: 'Send the draft', completed: true },
      { id: 'b', text: 'Review the notes', completed: false },
    ],
  }

  assert.equal(getLocalDateInputValue(new Date(2026, 10, 5, 23)), date)
  assert.deepEqual(parseTodoLists(JSON.stringify(lists)), lists)
  assert.equal(
    formatTodoList(date, lists[date], { heading: 'Tasks for', empty: 'No tasks.' }),
    'Tasks for 2026-11-05\n\n[x] Send the draft\n[ ] Review the notes',
  )
  assert.equal(
    formatTodoList(date, [], { heading: 'Tasks for', empty: 'No tasks.' }),
    'Tasks for 2026-11-05\n\nNo tasks.',
  )
  assert.equal(getTodoDownloadFilename(date, 'daily task list'), 'daily task list 2026-11-05.txt')
  assert.equal(
    getTodoDownloadFilename(date, 'lista de tareas del día'),
    'lista de tareas del día 2026-11-05.txt',
  )
  assert.equal(
    getTodoDownloadFilename(date, 'lista de tarefas do dia'),
    'lista de tarefas do dia 2026-11-05.txt',
  )
  assert.equal(
    getTodoDownloadFilename(date, 'liste des tâches du jour'),
    'liste des tâches du jour 2026-11-05.txt',
  )
  assert.equal(
    getTodoDownloadFilename(date, '每日任务清单'),
    '每日任务清单 2026-11-05.txt',
  )
  assert.throws(() => parseTodoLists('null'), TypeError)
  assert.throws(() => parseTodoLists('{"2026-02-30":[]}'), TypeError)
  assert.throws(() => parseTodoLists('{"2026-11-05":[{"id":"a","text":"Task"}]}'), TypeError)
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

test('text comparison reports ordered line additions, removals, and replacements', () => {
  assert.deepEqual(compareText('alpha\nold\nkeep\nend', 'alpha\nnew\nkeep\nextra\nend'), {
    lines: [
      { type: 'unchanged', text: 'alpha' },
      { type: 'removed', text: 'old' },
      { type: 'added', text: 'new' },
      { type: 'unchanged', text: 'keep' },
      { type: 'added', text: 'extra' },
      { type: 'unchanged', text: 'end' },
    ],
    additions: 2,
    deletions: 1,
    error: null,
  })
  assert.equal(formatTextDiff(compareText('first\nold\nlast', 'first\nnew\nlast').lines),
    '  first\n- old\n+ new\n  last')
})

test('text comparison handles empty input, line endings, and repeated lines', () => {
  assert.deepEqual(compareText('', ''), {
    lines: [],
    additions: 0,
    deletions: 0,
    error: null,
  })
  assert.deepEqual(compareText('one\r\ntwo', 'one\ntwo'), {
    lines: [
      { type: 'unchanged', text: 'one' },
      { type: 'unchanged', text: 'two' },
    ],
    additions: 0,
    deletions: 0,
    error: null,
  })
  assert.deepEqual(compareText('same\nsame\nold', 'same\nnew\nsame'), {
    lines: [
      { type: 'unchanged', text: 'same' },
      { type: 'added', text: 'new' },
      { type: 'unchanged', text: 'same' },
      { type: 'removed', text: 'old' },
    ],
    additions: 1,
    deletions: 1,
    error: null,
  })
})

test('text comparison reports when the bounded comparison size is exceeded', () => {
  const manyLines = Array.from({ length: 1414 }, (_, index) => `old-${index}`).join('\n')
  const otherLines = Array.from({ length: 1414 }, (_, index) => `new-${index}`).join('\n')
  assert.deepEqual(compareText(manyLines, otherLines), {
    lines: [],
    additions: 0,
    deletions: 0,
    error: 'too-large',
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
  assert.equal(formatReadingTime(0, 0, 'es'), '0 min 0 s')
  assert.equal(formatReadingTime(1, 30, 'es'), 'menos de 1 min')
  assert.equal(formatReadingTime(200, 60, 'es'), '1 min 0 s')
  assert.equal(formatReadingTime(0, 0, 'pt-BR'), '0 min 0 s')
  assert.equal(formatReadingTime(1, 30, 'pt-BR'), 'menos de 1 min')
  assert.equal(formatReadingTime(200, 60, 'pt-BR'), '1 min 0 s')
  assert.equal(formatReadingTime(0, 0, 'fr'), '0 min 0 s')
  assert.equal(formatReadingTime(1, 30, 'fr'), 'moins d’une minute')
  assert.equal(formatReadingTime(200, 60, 'fr'), '1 min 0 s')
  assert.equal(computeMetrics('one two', 'en', 200).readingSeconds, 1)
  const portugueseMetrics = computeMetrics('Olá!\nTudo bem', 'pt-BR', 200)
  assert.equal(portugueseMetrics.words, 3)
  assert.equal(portugueseMetrics.characters, 13)
  assert.equal(portugueseMetrics.charactersNoSpaces, 11)
  assert.equal(portugueseMetrics.lines, 2)
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
  assert.deepEqual(getKeywordData('o texto texto e texto útil', 'pt-BR'), {
    totalWords: 6,
    entries: [
      { word: 'texto', count: 3, percentage: 50 },
      { word: 'útil', count: 1, percentage: (1 / 6) * 100 },
    ],
  })
  assert.deepEqual(getKeywordData('le texte utile dans le texte', 'fr'), {
    totalWords: 6,
    entries: [
      { word: 'texte', count: 2, percentage: (2 / 6) * 100 },
      { word: 'utile', count: 1, percentage: (1 / 6) * 100 },
    ],
  })
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
  assert.equal(resolveRouteKind('blog/page/2/', tools, pages, [...posts, ...Array(10).fill('post')]), 'blog-index')
  assert.equal(resolveRouteKind('blog/page/3/', tools, pages, posts), 'not-found')
  assert.equal(resolveRouteKind('blog/page/1/', tools, pages, posts), 'not-found')
  assert.equal(resolveRouteKind('blog/word-count-guide/', tools, pages, posts), 'blog-post')
  assert.equal(resolveRouteKind('tools/unknown/', tools, pages, posts), 'not-found')
  assert.equal(resolveRouteKind('blog/not-a-post/', tools, pages, posts), 'not-found')
  assert.equal(resolveRouteKind('unknown/path', tools, pages, posts), 'not-found')
})

test('blog pagination keeps ten posts per page and collapses distant page numbers', () => {
  assert.equal(getBlogPageCount(0), 1)
  assert.equal(getBlogPageCount(10), 1)
  assert.equal(getBlogPageCount(11), 2)
  assert.equal(getBlogPageCount(56 * 10), 56)
  assert.equal(getBlogPagePath(1), 'blog/')
  assert.equal(getBlogPagePath(2), 'blog/page/2/')
  assert.deepEqual(getBlogPaginationItems(1, 5), [1, 2, 3, 4, 5])
  assert.deepEqual(getBlogPaginationItems(1, 56), [1, 2, 3, 4, 5, 'ellipsis', 56])
  assert.deepEqual(getBlogPaginationItems(5, 56), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 56])
  assert.deepEqual(getBlogPaginationItems(56, 56), [1, 'ellipsis', 52, 53, 54, 55, 56])
})
