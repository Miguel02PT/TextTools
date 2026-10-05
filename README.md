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

The production build pre-renders English and Chinese pages for the home page, each tool,
the FAQ, About, Privacy, Terms, Contact, Report a bug, and the blog. Blog articles are
also pre-rendered in both languages. It generates `sitemap.xml` and `robots.txt`.

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

The Contact and Report a bug forms do not send or store user input by default. To enable
them later, set `VITE_CONTACT_FORM_ENDPOINT` to a trusted endpoint that accepts a
cross-origin JSON `POST` with `category`, `page`, `name`, `email`, `subject`, and `message`
fields, and returns a successful HTTP status when delivery succeeds. Review and update the
Privacy page to disclose the selected provider and its data handling before enabling it.
