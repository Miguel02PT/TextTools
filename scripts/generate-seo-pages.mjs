import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import { createSeoMetadata, escapeHtml, injectPrerenderedApp } from './seo-metadata.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(projectRoot, 'dist')
const defaultSiteUrl = 'https://texttoools.com/'
const siteUrl = (process.env.SITE_URL ?? defaultSiteUrl).replace(/\/+$/, '')
const siteBase = `${siteUrl}/`
const homepageUrl = siteBase
const homepageDescription =
  'Free browser-based text tools for counting, cleaning, formatting, and analyzing text. Your text stays on your device.'
const toolPages = JSON.parse(
  await readFile(path.join(projectRoot, 'src', 'tool-pages.json'), 'utf8'),
)
const chinese = JSON.parse(
  await readFile(path.join(projectRoot, 'src', 'zh-CN.json'), 'utf8'),
)
const spanish = JSON.parse(
  await readFile(path.join(projectRoot, 'src', 'es.json'), 'utf8'),
)
const blogPosts = JSON.parse(
  await readFile(path.join(projectRoot, 'src', 'blog-posts.json'), 'utf8'),
)
const informationPages = [
  {
    slug: 'faq',
    title: 'FAQ | TextToools',
    description: 'Answers to common questions about using TextToools and its browser-based text tools.',
  },
  {
    slug: 'about',
    title: 'About TextToools',
    description: 'Learn about TextToools, a collection of simple browser-based text utilities.',
  },
  {
    slug: 'privacy',
    title: 'Privacy | TextToools',
    description: 'Read how TextToools handles text entered into its browser-based tools.',
  },
  {
    slug: 'terms',
    title: 'Terms and Conditions | TextToools',
    description: 'Terms for using the TextToools browser-based text utilities.',
  },
  {
    slug: 'contact',
    title: 'Contact TextToools',
    description: 'Contact TextToools with a question, suggestion, or feedback.',
  },
  {
    slug: 'report-bug',
    title: 'Report a Bug | TextToools',
    description: 'Report a problem with a TextToools browser-based text utility.',
  },
]
const homepagePath = path.join(outputRoot, 'index.html')
const homepageHtml = await readFile(homepagePath, 'utf8')
const vite = await createServer({
  configFile: path.join(projectRoot, 'vite.config.ts'),
  mode: 'production',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})
const { default: App } = await vite.ssrLoadModule('/src/App.tsx')

function localizedUrls(relativePath) {
  return {
    en: `${siteBase}${relativePath}`,
    zh: `${siteBase}zh-cn/${relativePath}`,
    es: `${siteBase}es/${relativePath}`,
  }
}

function localizedAlternates(relativePath) {
  const urls = localizedUrls(relativePath)
  return [
    { language: 'en', url: urls.en },
    { language: 'zh-CN', url: urls.zh },
    { language: 'es', url: urls.es },
  ]
}

const spanishInformationPages = {
  faq: {
    title: 'Preguntas frecuentes | TextToools',
    description: 'Respuestas a preguntas frecuentes sobre TextToools y sus herramientas de texto.',
  },
  about: {
    title: 'Acerca de TextToools',
    description: 'Conoce TextToools y sus sencillas herramientas de texto que funcionan en el navegador.',
  },
  privacy: {
    title: 'Privacidad | TextToools',
    description: 'Consulta cómo trata TextToools el texto introducido en sus herramientas del navegador.',
  },
  terms: {
    title: 'Términos y condiciones | TextToools',
    description: 'Condiciones de uso de las herramientas de texto de TextToools.',
  },
  contact: {
    title: 'Contacto | TextToools',
    description: 'Contacta con TextToools para enviar preguntas, sugerencias o comentarios.',
  },
  'report-bug': {
    title: 'Informar de un problema | TextToools',
    description: 'Informa de un problema con una de las herramientas de texto de TextToools.',
  },
}

function createPageHtml({
  title,
  description,
  canonicalUrl,
  structuredData,
  image,
  imageAlt,
  routePath,
  locale = 'en',
  alternates,
}) {
  const metadata = createSeoMetadata({
    title,
    description,
    canonicalUrl,
    structuredData,
    image,
    imageAlt,
    alternates,
  })
  const previousWindow = globalThis.window
  globalThis.window = {
    location: {
      pathname: routePath,
      href: new URL(routePath, siteBase).href,
    },
  }

  try {
    const appHtml = renderToString(createElement(App))
    const localizedHtml = homepageHtml
      .replace(/<html\s+lang="[^"]*"/, () => `<html lang="${locale}"`)
      .replace(
        /<meta\s+name="description"[\s\S]*?\/>/,
        () => `<meta name="description" content="${escapeHtml(description)}" />`,
      )
      .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
      .replace('</head>', () => `${metadata}  </head>`)
    return injectPrerenderedApp(localizedHtml, appHtml)
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
}

const homepageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TextToools',
  url: homepageUrl,
  description: homepageDescription,
}
await writeFile(
  homepagePath,
  createPageHtml({
    title: 'TextToools | Simple tools for working with text.',
    description: homepageDescription,
    canonicalUrl: homepageUrl,
    structuredData: homepageStructuredData,
    routePath: new URL(homepageUrl).pathname,
    alternates: localizedAlternates(''),
  }),
  'utf8',
)

const chineseHomepageUrl = `${siteBase}zh-cn/`
const chineseHomepageDescription = chinese.site.homeIntro
const chineseHomepageDestination = path.join(outputRoot, 'zh-cn', 'index.html')
await mkdir(path.dirname(chineseHomepageDestination), { recursive: true })
await writeFile(
  chineseHomepageDestination,
  createPageHtml({
    title: `${chinese.site.homeHeading} | TextToools`,
    description: chineseHomepageDescription,
    canonicalUrl: chineseHomepageUrl,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TextToools',
      url: chineseHomepageUrl,
      description: chineseHomepageDescription,
      inLanguage: 'zh-CN',
    },
    routePath: new URL(chineseHomepageUrl).pathname,
    locale: 'zh-CN',
    alternates: localizedAlternates(''),
  }),
  'utf8',
)

const spanishHomepageUrl = `${siteBase}es/`
const spanishHomepageDestination = path.join(outputRoot, 'es', 'index.html')
await mkdir(path.dirname(spanishHomepageDestination), { recursive: true })
await writeFile(
  spanishHomepageDestination,
  createPageHtml({
    title: `${spanish.site.homeHeading} | TextToools`,
    description: spanish.site.homeIntro,
    canonicalUrl: spanishHomepageUrl,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TextToools',
      url: spanishHomepageUrl,
      description: spanish.site.homeIntro,
      inLanguage: 'es',
    },
    routePath: new URL(spanishHomepageUrl).pathname,
    locale: 'es',
    alternates: localizedAlternates(''),
  }),
  'utf8',
)

for (const tool of toolPages) {
  const canonicalUrl = `${siteBase}tools/${tool.id}/`
  const chineseGuide = chinese.tools[tool.id]
  const spanishGuide = spanish.tools[tool.id]
  const chineseCanonicalUrl = `${siteBase}zh-cn/tools/${tool.id}/`
  const spanishCanonicalUrl = `${siteBase}es/tools/${tool.id}/`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: tool.title,
    description: tool.description,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'TextToools',
      url: siteBase,
    },
  }
  const destination = path.join(outputRoot, 'tools', tool.id, 'index.html')
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(
    destination,
    createPageHtml({
      title: tool.title,
      description: tool.description,
      canonicalUrl,
      structuredData,
      routePath: new URL(canonicalUrl).pathname,
      alternates: localizedAlternates(`tools/${tool.id}/`),
    }),
    'utf8',
  )

  const chineseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: chineseGuide.title,
    description: chineseGuide.meta,
    url: chineseCanonicalUrl,
    inLanguage: 'zh-CN',
    isPartOf: {
      '@type': 'WebSite',
      name: 'TextToools',
      url: siteBase,
    },
  }
  const chineseDestination = path.join(outputRoot, 'zh-cn', 'tools', tool.id, 'index.html')
  await mkdir(path.dirname(chineseDestination), { recursive: true })
  await writeFile(
    chineseDestination,
    createPageHtml({
      title: chineseGuide.title,
      description: chineseGuide.meta,
      canonicalUrl: chineseCanonicalUrl,
      structuredData: chineseStructuredData,
      routePath: new URL(chineseCanonicalUrl).pathname,
      locale: 'zh-CN',
      alternates: localizedAlternates(`tools/${tool.id}/`),
    }),
    'utf8',
  )

  const spanishDestination = path.join(outputRoot, 'es', 'tools', tool.id, 'index.html')
  await mkdir(path.dirname(spanishDestination), { recursive: true })
  await writeFile(
    spanishDestination,
    createPageHtml({
      title: spanishGuide.title,
      description: spanishGuide.meta,
      canonicalUrl: spanishCanonicalUrl,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: spanishGuide.title,
        description: spanishGuide.meta,
        url: spanishCanonicalUrl,
        inLanguage: 'es',
        isPartOf: { '@type': 'WebSite', name: 'TextToools', url: siteBase },
      },
      routePath: new URL(spanishCanonicalUrl).pathname,
      locale: 'es',
      alternates: localizedAlternates(`tools/${tool.id}/`),
    }),
    'utf8',
  )
}

for (const page of informationPages) {
  const canonicalUrl = `${siteBase}${page.slug}/`
  const chineseCanonicalUrl = `${siteBase}zh-cn/${page.slug}/`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'TextToools',
      url: siteBase,
    },
  }
  const destination = path.join(outputRoot, page.slug, 'index.html')
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(
    destination,
    createPageHtml({
      title: page.title,
      description: page.description,
      canonicalUrl,
      structuredData,
      routePath: new URL(canonicalUrl).pathname,
      alternates: localizedAlternates(`${page.slug}/`),
    }),
    'utf8',
  )

  const chineseTitle =
    chinese.site[page.slug === 'report-bug' ? 'reportBug' : page.slug]
  const chineseDescription = `${chineseTitle} | TextToools 提供的免费在线文本工具和相关信息。`
  const chineseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: chineseTitle,
    description: chineseDescription,
    url: chineseCanonicalUrl,
    inLanguage: 'zh-CN',
    isPartOf: {
      '@type': 'WebSite',
      name: 'TextToools',
      url: siteBase,
    },
  }
  const chineseDestination = path.join(outputRoot, 'zh-cn', page.slug, 'index.html')
  await mkdir(path.dirname(chineseDestination), { recursive: true })
  await writeFile(
    chineseDestination,
    createPageHtml({
      title: chineseTitle,
      description: chineseDescription,
      canonicalUrl: chineseCanonicalUrl,
      structuredData: chineseStructuredData,
      routePath: new URL(chineseCanonicalUrl).pathname,
      locale: 'zh-CN',
      alternates: localizedAlternates(`${page.slug}/`),
    }),
    'utf8',
  )

  const spanishCanonicalUrl = `${siteBase}es/${page.slug}/`
  const spanishPage = spanishInformationPages[page.slug]
  const spanishDestination = path.join(outputRoot, 'es', page.slug, 'index.html')
  await mkdir(path.dirname(spanishDestination), { recursive: true })
  await writeFile(
    spanishDestination,
    createPageHtml({
      title: spanishPage.title,
      description: spanishPage.description,
      canonicalUrl: spanishCanonicalUrl,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: spanishPage.title,
        description: spanishPage.description,
        url: spanishCanonicalUrl,
        inLanguage: 'es',
        isPartOf: { '@type': 'WebSite', name: 'TextToools', url: siteBase },
      },
      routePath: new URL(spanishCanonicalUrl).pathname,
      locale: 'es',
      alternates: localizedAlternates(`${page.slug}/`),
    }),
    'utf8',
  )
}

const blogIndexUrls = {
  en: `${siteBase}blog/`,
  zh: `${siteBase}zh-cn/blog/`,
  es: `${siteBase}es/blog/`,
}
for (const locale of ['en', 'zh-CN', 'es']) {
  const canonicalUrl =
    locale === 'en' ? blogIndexUrls.en : locale === 'zh-CN' ? blogIndexUrls.zh : blogIndexUrls.es
  const title =
    locale === 'en' ? 'TextToools Blog' : locale === 'zh-CN' ? chinese.blog.title : spanish.blog.title
  const description =
    locale === 'en'
      ? 'Practical, clear guides to counting, cleaning, and working with text.'
      : locale === 'zh-CN'
        ? chinese.blog.description
        : spanish.blog.description
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: locale,
  }
  const destination = path.join(
    outputRoot,
    ...(locale === 'en' ? ['blog'] : [locale === 'zh-CN' ? 'zh-cn' : 'es', 'blog']),
    'index.html',
  )
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(
    destination,
    createPageHtml({
      title,
      description,
      canonicalUrl,
      structuredData,
      routePath: new URL(canonicalUrl).pathname,
      locale,
      alternates: localizedAlternates('blog/'),
    }),
    'utf8',
  )
}

for (const post of blogPosts) {
  for (const locale of ['en', 'zh-CN', 'es']) {
    const localizedPost =
      locale === 'en'
        ? post
        : locale === 'zh-CN'
          ? chinese.blog.posts[post.slug]
          : spanish.blog.posts[post.slug]
    const localizedPath = `blog/${post.slug}/`
    const canonicalUrl =
      locale === 'en'
        ? localizedUrls(localizedPath).en
        : locale === 'zh-CN'
          ? localizedUrls(localizedPath).zh
          : localizedUrls(localizedPath).es
    const socialImageUrl = new URL(
      localizedPost.image.replace(/\.svg$/i, '.png'),
      siteBase,
    ).href
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: localizedPost.title,
      description: localizedPost.description,
      image: socialImageUrl,
      datePublished: post.published,
      dateModified: localizedPost.modified ?? post.published,
      inLanguage: locale,
      mainEntityOfPage: canonicalUrl,
      publisher: { '@type': 'Organization', name: 'TextToools' },
    }
    const destination = path.join(
      outputRoot,
      ...(locale === 'en'
        ? ['blog', post.slug]
        : [locale === 'zh-CN' ? 'zh-cn' : 'es', 'blog', post.slug]),
      'index.html',
    )
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(
      destination,
      createPageHtml({
        title: localizedPost.title,
        description: localizedPost.description,
        canonicalUrl,
        structuredData,
        image: socialImageUrl,
        imageAlt: localizedPost.imageAlt,
        routePath: new URL(canonicalUrl).pathname,
        locale,
        alternates: localizedAlternates(localizedPath),
      }),
      'utf8',
    )
  }
}

const urls = [
  homepageUrl,
  `${siteBase}zh-cn/`,
  `${siteBase}es/`,
  ...toolPages.map((tool) => `${siteBase}tools/${tool.id}/`),
  ...toolPages.map((tool) => `${siteBase}zh-cn/tools/${tool.id}/`),
  ...toolPages.map((tool) => `${siteBase}es/tools/${tool.id}/`),
  ...informationPages.map((page) => `${siteBase}${page.slug}/`),
  ...informationPages.map((page) => `${siteBase}zh-cn/${page.slug}/`),
  ...informationPages.map((page) => `${siteBase}es/${page.slug}/`),
  blogIndexUrls.en,
  blogIndexUrls.zh,
  blogIndexUrls.es,
  ...blogPosts.flatMap((post) => [
    `${siteBase}blog/${post.slug}/`,
    `${siteBase}zh-cn/blog/${post.slug}/`,
    `${siteBase}es/blog/${post.slug}/`,
  ]),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
await writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap, 'utf8')
await writeFile(
  path.join(outputRoot, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteBase}sitemap.xml\n`,
  'utf8',
)
await writeFile(
  path.join(outputRoot, '404.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,follow" />
    <title>Page not found | TextToools</title>
    <style>
      :root { color-scheme: light; font-family: Inter, "Segoe UI", sans-serif; color: #0f172a; background: #f5f3ef; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      main { width: min(100%, 640px); padding: 40px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; text-align: center; }
      h1 { margin: 8px 0 12px; font-size: clamp(2rem, 6vw, 2.5rem); letter-spacing: -.04em; }
      p { color: #475569; line-height: 1.6; }
      nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 24px; }
      a { border-radius: 8px; padding: 10px 16px; color: #fff; background: #0f172a; font-size: .9rem; font-weight: 600; text-decoration: none; }
      a + a { border: 1px solid #cbd5e1; color: #334155; background: #fff; }
      a:focus-visible { outline: 2px solid #0f172a; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main>
      <p>TextToools · 404</p>
      <h1>Page not found</h1>
      <p>This address does not exist or may have moved.</p>
      <nav aria-label="Page recovery">
        <a href="${escapeHtml(siteBase)}">Go to homepage</a>
        <a href="${escapeHtml(siteBase)}#tools">Browse tools</a>
        <a href="${escapeHtml(siteBase)}zh-cn/">简体中文</a>
        <a href="${escapeHtml(siteBase)}es/">Español</a>
      </nav>
    </main>
  </body>
</html>
`,
  'utf8',
)

await vite.close()

console.log(
  `Pre-rendered English, Simplified Chinese, and Spanish home, tool, information, and blog pages (${urls.length} routes).`,
)
