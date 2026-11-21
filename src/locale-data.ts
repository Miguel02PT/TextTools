import type { Locale } from './tool-logic'
import type { LocalizedContent } from './App'

type TranslatedLocale = Exclude<Locale, 'en'>

const localeLoaders: Record<TranslatedLocale, () => Promise<LocalizedContent>> = {
  'zh-CN': async () => (await import('./zh-CN.json')).default,
  es: async () => (await import('./es.json')).default,
  'pt-BR': async () => (await import('./pt-BR.json')).default,
  fr: async () => (await import('./fr.json')).default,
}

export async function loadLocalizedContent(
  pathname: string,
  basePath: string,
): Promise<LocalizedContent | undefined> {
  const pathWithinBase = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname.replace(/^\/+/, '')
  const localePrefix = pathWithinBase.split('/')[0]
  switch (localePrefix) {
    case 'zh-cn':
      return localeLoaders['zh-CN']()
    case 'es':
      return localeLoaders.es()
    case 'pt-br':
      return localeLoaders['pt-BR']()
    case 'fr':
      return localeLoaders.fr()
    default:
      return undefined
  }
}
