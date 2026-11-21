import assert from 'node:assert/strict'
import test from 'node:test'
import { loadLocalizedContent } from '../src/locale-data'

test('loads only the locale selected by the route and respects the deployment base', async () => {
  const [english, chinese, spanish, portuguese, french, unknown] = await Promise.all([
    loadLocalizedContent('/', '/'),
    loadLocalizedContent('/zh-cn/tools/word-counter/', '/'),
    loadLocalizedContent('/app/es/tools/word-counter/', '/app/'),
    loadLocalizedContent('/pt-br/blog/', '/'),
    loadLocalizedContent('/fr/about/', '/'),
    loadLocalizedContent('/de/tools/word-counter/', '/'),
  ])

  assert.equal(english, undefined)
  assert.equal(unknown, undefined)
  assert.equal(chinese?.site.language, '简体中文')
  assert.equal(spanish?.site.language, 'Español')
  assert.equal(portuguese?.site.language, 'Português')
  assert.equal(french?.site.switchToDarkMode, 'Activer le mode sombre')
})
