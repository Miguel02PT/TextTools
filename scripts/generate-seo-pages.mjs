import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(projectRoot, 'dist')
const defaultSiteUrl = 'https://miguel02pt.github.io/TextTools/'
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
const blogPosts = JSON.parse(
  await readFile(path.join(projectRoot, 'src', 'blog-posts.json'), 'utf8'),
)
const informationPages = [
  {
    slug: 'faq',
    title: 'FAQ | TextTools',
    description: 'Answers to common questions about using TextTools and its browser-based text tools.',
  },
  {
    slug: 'about',
    title: 'About TextTools',
    description: 'Learn about TextTools, a collection of simple browser-based text utilities.',
  },
  {
    slug: 'privacy',
    title: 'Privacy | TextTools',
    description: 'Read how TextTools handles text entered into its browser-based tools.',
  },
  {
    slug: 'terms',
    title: 'Terms and Conditions | TextTools',
    description: 'Terms for using the TextTools browser-based text utilities.',
  },
  {
    slug: 'contact',
    title: 'Contact TextTools',
    description: 'Contact TextTools with a question, suggestion, or feedback.',
  },
  {
    slug: 'report-bug',
    title: 'Report a Bug | TextTools',
    description: 'Report a problem with a TextTools browser-based text utility.',
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

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function createSeoMetadata({ title, description, canonicalUrl, structuredData, alternates }) {
  const alternateLinks = alternates
    .map(
      ({ language, url }) =>
        `    <link rel="alternate" hreflang="${language}" href="${escapeHtml(url)}" />\n`,
    )
    .join('')
  return `    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TextTools" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
${alternateLinks}    <link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates[0].url)}" />
    <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>
`
}

function createPageHtml({
  title,
  description,
  canonicalUrl,
  structuredData,
  routePath,
  locale = 'en',
  alternates,
}) {
  const metadata = createSeoMetadata({
    title,
    description,
    canonicalUrl,
    structuredData,
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
    return homepageHtml
      .replace(/<html\s+lang="[^"]*"/, `<html lang="${locale}"`)
      .replace(
        /<meta\s+name="description"[\s\S]*?\/>/,
        `<meta name="description" content="${escapeHtml(description)}" />`,
      )
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(
        '<div id="root"></div>',
        `<div id="root" data-prerendered="true">${appHtml}</div>`,
      )
      .replace('</head>', `${metadata}  </head>`)
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
  name: 'TextTools',
  url: homepageUrl,
  description: homepageDescription,
}
await writeFile(
  homepagePath,
  createPageHtml({
    title: 'TextTools | Simple tools for working with text.',
    description: homepageDescription,
    canonicalUrl: homepageUrl,
    structuredData: homepageStructuredData,
    routePath: new URL(homepageUrl).pathname,
    alternates: [
      { language: 'en', url: homepageUrl },
      { language: 'zh-CN', url: `${siteBase}zh-cn/` },
    ],
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
    title: `${chinese.site.homeHeading} | TextTools`,
    description: chineseHomepageDescription,
    canonicalUrl: chineseHomepageUrl,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TextTools',
      url: chineseHomepageUrl,
      description: chineseHomepageDescription,
      inLanguage: 'zh-CN',
    },
    routePath: new URL(chineseHomepageUrl).pathname,
    locale: 'zh-CN',
    alternates: [
      { language: 'en', url: homepageUrl },
      { language: 'zh-CN', url: chineseHomepageUrl },
    ],
  }),
  'utf8',
)

for (const tool of toolPages) {
  const canonicalUrl = `${siteBase}tools/${tool.id}/`
  const chineseGuide = chinese.tools[tool.id]
  const chineseCanonicalUrl = `${siteBase}zh-cn/tools/${tool.id}/`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: tool.title,
    description: tool.description,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'TextTools',
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
      alternates: [
        { language: 'en', url: canonicalUrl },
        { language: 'zh-CN', url: chineseCanonicalUrl },
      ],
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
      name: 'TextTools',
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
      alternates: [
        { language: 'en', url: canonicalUrl },
        { language: 'zh-CN', url: chineseCanonicalUrl },
      ],
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
      name: 'TextTools',
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
      alternates: [
        { language: 'en', url: canonicalUrl },
        { language: 'zh-CN', url: chineseCanonicalUrl },
      ],
    }),
    'utf8',
  )

  const chineseTitle =
    chinese.site[page.slug === 'report-bug' ? 'reportBug' : page.slug]
  const chineseDescription = `${chineseTitle} | TextTools 提供的免费在线文本工具和相关信息。`
  const chineseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: chineseTitle,
    description: chineseDescription,
    url: chineseCanonicalUrl,
    inLanguage: 'zh-CN',
    isPartOf: {
      '@type': 'WebSite',
      name: 'TextTools',
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
      alternates: [
        { language: 'en', url: canonicalUrl },
        { language: 'zh-CN', url: chineseCanonicalUrl },
      ],
    }),
    'utf8',
  )
}

const blogIndexUrls = {
  en: `${siteBase}blog/`,
  zh: `${siteBase}zh-cn/blog/`,
}
for (const locale of ['en', 'zh-CN']) {
  const canonicalUrl = locale === 'en' ? blogIndexUrls.en : blogIndexUrls.zh
  const title = locale === 'en' ? 'TextTools Blog' : chinese.blog.title
  const description =
    locale === 'en'
      ? 'Practical, clear guides to counting, cleaning, and working with text.'
      : chinese.blog.description
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
    ...(locale === 'en' ? ['blog'] : ['zh-cn', 'blog']),
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
      alternates: [
        { language: 'en', url: blogIndexUrls.en },
        { language: 'zh-CN', url: blogIndexUrls.zh },
      ],
    }),
    'utf8',
  )
}

for (const post of blogPosts) {
  const englishCanonicalUrl = `${siteBase}blog/${post.slug}/`
  const chineseCanonicalUrl = `${siteBase}zh-cn/blog/${post.slug}/`
  for (const locale of ['en', 'zh-CN']) {
    const localizedPost = locale === 'en' ? post : chinese.blog.posts[post.slug]
    const canonicalUrl = locale === 'en' ? englishCanonicalUrl : chineseCanonicalUrl
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: localizedPost.title,
      description: localizedPost.description,
      datePublished: post.published,
      dateModified: post.published,
      inLanguage: locale,
      mainEntityOfPage: canonicalUrl,
      publisher: { '@type': 'Organization', name: 'TextTools' },
    }
    const destination = path.join(
      outputRoot,
      ...(locale === 'en'
        ? ['blog', post.slug]
        : ['zh-cn', 'blog', post.slug]),
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
        routePath: new URL(canonicalUrl).pathname,
        locale,
        alternates: [
          { language: 'en', url: englishCanonicalUrl },
          { language: 'zh-CN', url: chineseCanonicalUrl },
        ],
      }),
      'utf8',
    )
  }
}

const urls = [
  homepageUrl,
  `${siteBase}zh-cn/`,
  ...toolPages.map((tool) => `${siteBase}tools/${tool.id}/`),
  ...toolPages.map((tool) => `${siteBase}zh-cn/tools/${tool.id}/`),
  ...informationPages.map((page) => `${siteBase}${page.slug}/`),
  ...informationPages.map((page) => `${siteBase}zh-cn/${page.slug}/`),
  blogIndexUrls.en,
  blogIndexUrls.zh,
  ...blogPosts.flatMap((post) => [
    `${siteBase}blog/${post.slug}/`,
    `${siteBase}zh-cn/blog/${post.slug}/`,
  ]),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
await writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap, 'utf8')
await writeFile(
  path.join(outputRoot, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteBase}sitemap.xml\n`,
  'utf8',
)

await vite.close()

console.log(
  `Pre-rendered English and Chinese home, tool, information, and blog pages (${urls.length} routes).`,
)
