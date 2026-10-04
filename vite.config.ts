import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const defaultSiteUrl = 'https://miguel02pt.github.io/TextTools/'
const siteUrl = process.env.SITE_URL ?? defaultSiteUrl
const sitePath = new URL(siteUrl).pathname
const base = sitePath.endsWith('/') ? sitePath : `${sitePath}/`

export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : base,
  plugins: [react(), tailwindcss()],
}))
