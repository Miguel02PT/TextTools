import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const themeScript = readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8')
const locales = ['es', 'pt-BR', 'fr', 'zh-CN'].map((name) =>
  JSON.parse(readFileSync(new URL(`../src/${name}.json`, import.meta.url), 'utf8')),
)

function createThemeWindow(systemPrefersDark: boolean, savedPreference?: string) {
  const dom = new JSDOM('', {
    url: 'https://texttoools.com/',
    runScripts: 'outside-only',
  })
  const mediaListeners = new Set<(event: { matches: boolean }) => void>()
  let systemPreference = systemPrefersDark

  if (savedPreference) dom.window.localStorage.setItem('texttools-theme', savedPreference)
  Object.defineProperty(dom.window, 'matchMedia', {
    value: () => ({
      get matches() {
        return systemPreference
      },
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
        mediaListeners.add(listener),
    }),
  })
  dom.window.eval(themeScript)

  return {
    dom,
    setSystemPreference(matches: boolean) {
      systemPreference = matches
      for (const listener of mediaListeners) listener({ matches })
    },
  }
}

test('theme starts in light mode regardless of the system preference', () => {
  const { dom, setSystemPreference } = createThemeWindow(true)

  assert.equal(dom.window.document.documentElement.classList.contains('dark'), false)
  assert.equal(dom.window.document.documentElement.style.colorScheme, 'light')
  setSystemPreference(true)
  assert.equal(dom.window.document.documentElement.classList.contains('dark'), false)
  setSystemPreference(false)
  assert.equal(dom.window.document.documentElement.classList.contains('dark'), false)
  assert.equal(dom.window.document.documentElement.style.colorScheme, 'light')
  dom.window.close()
})

test('saved theme takes precedence over system changes and follows cross-tab changes', () => {
  const { dom, setSystemPreference } = createThemeWindow(false, 'dark')
  const root = dom.window.document.documentElement

  assert.equal(root.classList.contains('dark'), true)
  setSystemPreference(false)
  assert.equal(root.classList.contains('dark'), true)

  dom.window.dispatchEvent(
    new dom.window.StorageEvent('storage', {
      key: 'texttools-theme',
      newValue: 'light',
    }),
  )
  assert.equal(root.classList.contains('dark'), false)

  dom.window.dispatchEvent(
    new dom.window.StorageEvent('storage', {
      key: 'texttools-theme',
      newValue: null,
    }),
  )
  setSystemPreference(true)
  assert.equal(root.classList.contains('dark'), false)
  dom.window.close()
})

test('all translated locales include dark-mode controls and storage errors', () => {
  for (const locale of locales) {
    assert.ok(locale.site.switchToDarkMode)
    assert.ok(locale.site.switchToLightMode)
    assert.ok(locale.site.themeSaveError)
  }
})
