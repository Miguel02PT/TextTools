import type { Locale } from './tool-logic'

export function getBrowserLocaleSuggestion(
  preferredLanguages: readonly string[],
): Locale | undefined {
  for (const preferredLanguage of preferredLanguages) {
    const languageTag = preferredLanguage.trim().toLowerCase().replaceAll('_', '-')
    if (languageTag === 'en' || languageTag.startsWith('en-')) return 'en'
    if (languageTag === 'es' || languageTag.startsWith('es-')) return 'es'
    if (
      languageTag === 'zh' ||
      languageTag === 'zh-cn' ||
      languageTag === 'zh-hans' ||
      languageTag.startsWith('zh-hans-')
    ) {
      return 'zh-CN'
    }
  }

  return undefined
}
