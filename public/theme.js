;(() => {
  const storageKey = 'texttools-theme'
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  let preference = null

  function applyTheme() {
    const isDark = preference
      ? preference === 'dark'
      : mediaQuery.matches
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    window.dispatchEvent(new Event('texttools-theme-change'))
  }

  try {
    const storedPreference = window.localStorage.getItem(storageKey)
    preference =
      storedPreference === 'dark' || storedPreference === 'light'
        ? storedPreference
        : null
  } catch (error) {
    console.error('Unable to read the theme preference.', error)
  }

  applyTheme()

  mediaQuery.addEventListener('change', () => {
    if (!preference) applyTheme()
  })

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return
    preference =
      event.newValue === 'dark' || event.newValue === 'light'
        ? event.newValue
        : null
    applyTheme()
  })
})()
