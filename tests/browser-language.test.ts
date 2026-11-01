import assert from 'node:assert/strict'
import test from 'node:test'
import { getBrowserLocaleSuggestion } from '../src/browser-language'

test('browser language suggestions match supported language tags', () => {
  assert.equal(getBrowserLocaleSuggestion(['es-MX']), 'es')
  assert.equal(getBrowserLocaleSuggestion(['zh-Hans-CN']), 'zh-CN')
  assert.equal(getBrowserLocaleSuggestion(['pt-BR']), 'pt-BR')
  assert.equal(getBrowserLocaleSuggestion(['pt']), 'pt-BR')
  assert.equal(getBrowserLocaleSuggestion(['fr-FR']), 'fr')
  assert.equal(getBrowserLocaleSuggestion(['fr_CA']), 'fr')
  assert.equal(getBrowserLocaleSuggestion(['en-GB']), 'en')
})

test('browser language suggestion respects preference order', () => {
  assert.equal(getBrowserLocaleSuggestion(['en-US', 'es-ES']), 'en')
  assert.equal(getBrowserLocaleSuggestion(['pt-BR', 'es-MX']), 'pt-BR')
  assert.equal(getBrowserLocaleSuggestion(['de-DE', 'fr-FR', 'es-ES']), 'fr')
})

test('unsupported or traditional Chinese preferences do not trigger a wrong-language suggestion', () => {
  assert.equal(getBrowserLocaleSuggestion(['pt-PT']), undefined)
  assert.equal(getBrowserLocaleSuggestion(['zh-TW']), undefined)
})
