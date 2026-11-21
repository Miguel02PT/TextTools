import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { loadLocalizedContent } from './locale-data'

const root = document.getElementById('root')!

async function renderApp() {
  const [{ default: App }, localizedContent] = await Promise.all([
    import('./App.tsx'),
    loadLocalizedContent(window.location.pathname, import.meta.env.BASE_URL),
  ])
  const app = (
    <StrictMode>
      <App localizedContent={localizedContent} />
    </StrictMode>
  )

  if (root.dataset.prerendered === 'true') {
    hydrateRoot(root, app)
  } else {
    createRoot(root).render(app)
  }
}

function startApp() {
  void renderApp().catch((error: unknown) => {
    console.error('Unable to initialize the TextTools application.', error)
  })
}

if (root.dataset.prerendered === 'true') {
  window.requestAnimationFrame(() => window.requestAnimationFrame(startApp))
} else {
  startApp()
}
