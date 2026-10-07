# TextToools

Simple tools for working with text. Count, clean, format, and analyze text directly in your browser.

## Getting started

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Vite prints the local URL when the development server starts.

## Available scripts

- `npm run dev` — start the local development server
- `npm run build` — run TypeScript checks and create a production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint
- `npm test` — run the test suite

## Privacy

Text processing runs in the browser. Text entered into the tools is not sent to a server.
Contact and bug-report forms are present but their send action is disabled until a form
delivery service is chosen and configured.

## Search pages

The production build pre-renders English, Simplified Chinese, and Spanish pages for the
home page, each tool, the FAQ, About, Privacy, Terms, Contact, Report a bug, and the blog.
Blog articles are also pre-rendered in all three languages. Localized pages use `/zh-cn/`
and `/es/` path prefixes, emit reciprocal `hreflang` links, and appear in `sitemap.xml`.
The English home page remains the default; supported browser languages may receive a
dismissible suggestion to switch languages, but the site never redirects automatically.

The default canonical URL, sitemap, robots.txt, and production asset base target the live
custom domain, `https://texttoools.com/`. When deploying to another host or path, set
`SITE_URL` to the public site root before building. Its URL path also configures Vite's
production asset base:

```powershell
$env:SITE_URL = "https://texttoools.com/"
npm run build
```

For Cloudflare Pages, use `npm run build` as the build command and `dist` as the build
output directory. The build also includes Cloudflare Pages response headers and a custom
404 page. The project requires Node.js 20.19+ or 22.12+. After the site is publicly
accessible, submit its `sitemap.xml` URL to Google Search Console.

## Contact form configuration

The Contact and Report a bug forms stay disabled until the client and server are configured.
The Cloudflare Pages Function at `functions/api/contact.ts` checks the request origin,
validates and limits the submitted fields, verifies a Cloudflare Turnstile token, and sends
the message through Resend. It does not store messages in a TextTools database.

Set these build-time variables in Cloudflare Pages before building:

- `VITE_CONTACT_FORM_ENDPOINT=/api/contact`
- `VITE_TURNSTILE_SITE_KEY` to the public site key for the production Turnstile widget

Set these variables for the Pages Function runtime. Store the two keys as secrets, not in
the repository or in `VITE_*` variables:

- `ALLOWED_ORIGIN` to the canonical site origin, such as `https://texttoools.com`
- `CONTACT_FROM` to an address on the verified sending domain
- `CONTACT_RECIPIENT` to the mailbox that should receive submissions
- `TURNSTILE_SECRET_KEY` (secret)
- `RESEND_API_KEY` (secret)

Configure all runtime values before setting the build-time variables; the form UI is enabled
by the latter, while the endpoint returns an error if any server setting is missing. Resend
requires verifying a domain through DNS. Its free plan currently allows 3,000 emails per
month, capped at 100 per day; Cloudflare Pages Functions share a free allowance of 100,000
requests per day, and Turnstile is free. Provider limits and terms can change, so confirm
them before setup. Do not upgrade or add billing details without explicit approval.

Before enabling production delivery, ensure the Privacy page accurately describes the
providers and data sent by the forms. That factual update is separate from the broader
Privacy/Terms review.
