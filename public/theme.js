;(() => {
  const storageKey = 'texttools-theme'
  let preference = 'light'

  function applyTheme() {
    const isDark = preference === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    window.dispatchEvent(new Event('texttools-theme-change'))
  }

  try {
    const storedPreference = window.localStorage.getItem(storageKey)
    preference =
      storedPreference === 'dark' || storedPreference === 'light'
        ? storedPreference
        : 'light'
  } catch (error) {
    console.error('Unable to read the theme preference.', error)
  }

  applyTheme()

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return
    preference =
      event.newValue === 'dark' || event.newValue === 'light'
        ? event.newValue
        : 'light'
    applyTheme()
  })
})()
