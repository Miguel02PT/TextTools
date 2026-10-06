import assert from 'node:assert/strict'
import test from 'node:test'
import { getBrowserLocaleSuggestion } from '../src/browser-language'

test('browser language suggestions match supported language tags', () => {
  assert.equal(getBrowserLocaleSuggestion(['es-MX']), 'es')
  assert.equal(getBrowserLocaleSuggestion(['zh-Hans-CN']), 'zh-CN')
  assert.equal(getBrowserLocaleSuggestion(['en-GB']), 'en')
})

test('browser language suggestion respects preference order', () => {
  assert.equal(getBrowserLocaleSuggestion(['en-US', 'es-ES']), 'en')
  assert.equal(getBrowserLocaleSuggestion(['pt-BR', 'es-MX']), 'es')
})

test('unsupported or traditional Chinese preferences do not trigger a wrong-language suggestion', () => {
  assert.equal(getBrowserLocaleSuggestion(['pt-BR']), undefined)
  assert.equal(getBrowserLocaleSuggestion(['zh-TW']), undefined)
})
