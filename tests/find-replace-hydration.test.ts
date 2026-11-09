import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { createElement, StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

async function assertPreRenderedRouteHydrates(
  pathname: string,
  expectedContent?: RegExp,
  initialDarkMode = false,
) {
  const vite = await createServer({
    configFile: join(process.cwd(), 'vite.config.ts'),
    mode: 'production',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const priorDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const priorActFlag = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
  const priorConsoleError = console.error
  let dom: JSDOM | undefined
  let root: ReturnType<typeof import('react-dom/client').hydrateRoot> | undefined
  const errors: string[] = []

  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { pathname } },
    })
    const html = renderToString(createElement(StrictMode, null, createElement(App)))
    if (expectedContent) assert.match(html, expectedContent)

    dom = new JSDOM(`<div id="root" data-prerendered="true">${html}</div>`, {
      url: `https://texttoools.com${pathname}`,
      pretendToBeVisual: true,
    })
    if (initialDarkMode) dom.window.document.documentElement.classList.add('dark')
    dom.window.localStorage.setItem('texttools-ga4-consent', 'accepted')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
    console.error = (...args: unknown[]) => errors.push(args.map(String).join(' '))

    const [{ hydrateRoot }, { act }] = await Promise.all([
      import('react-dom/client'),
      import('react'),
    ])
    await act(async () => {
      root = hydrateRoot(
        dom!.window.document.getElementById('root')!,
        createElement(StrictMode, null, createElement(App)),
      )
    })

    assert.equal(errors.some((message) => /hydration|#418|didn't match/i.test(message)), false, errors.join('\n'))
    if (initialDarkMode) {
      assert.equal(
        dom.window.document.querySelector('[aria-label="Switch to light mode"]') !== null,
        true,
      )
    }
  } finally {
    console.error = priorConsoleError
    if (root) {
      const { act } = await import('react')
      await act(async () => root?.unmount())
    }
    dom?.window.close()
    for (const [key, descriptor] of [
      ['window', priorWindow],
      ['document', priorDocument],
      ['navigator', priorNavigator],
      ['IS_REACT_ACT_ENVIRONMENT', priorActFlag],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
    await vite.close()
  }
}

test('pre-rendered find-replace route hydrates without React mismatch', async () => {
  await assertPreRenderedRouteHydrates('/tools/find-replace/')
})

test('pre-rendered text-diff route hydrates without React mismatch', async () => {
  await assertPreRenderedRouteHydrates('/tools/text-diff/')
})

test('pre-rendered route synchronizes the dark theme after hydration', async () => {
  await assertPreRenderedRouteHydrates('/', undefined, true)
})

test('pre-rendered daily todo list route hydrates without React mismatch', async () => {
  await assertPreRenderedRouteHydrates('/tools/daily-todo-list/')
})

test('paginated blog routes show the correct range and localized navigation', async () => {
  await assertPreRenderedRouteHydrates(
    '/blog/page/2/',
    /Showing 11–20 of \d+ guides/,
  )
  await assertPreRenderedRouteHydrates(
    '/pt-br/blog/page/2/',
    /Exibindo 11–20 de \d+ guias/,
  )
})
