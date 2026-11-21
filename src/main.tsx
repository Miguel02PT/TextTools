import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'

const root = document.getElementById('root')!

async function renderApp() {
  const { default: App } = await import('./App.tsx')
  const app = (
    <StrictMode>
      <App />
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
