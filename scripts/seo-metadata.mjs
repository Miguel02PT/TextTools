export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function createSeoMetadata({
  title,
  description,
  canonicalUrl,
  structuredData,
  alternates,
  image,
  imageAlt,
}) {
  const alternateLinks = alternates
    .map(
      ({ language, url }) =>
        `    <link rel="alternate" hreflang="${language}" href="${escapeHtml(url)}" />\n`,
    )
    .join('')
  const socialImageMetadata = image
    ? `    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(imageAlt ?? '')}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt ?? '')}" />
`
    : ''

  return `    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TextToools" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
${socialImageMetadata}    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
${alternateLinks}    <link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates[0].url)}" />
    <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>
`
}
