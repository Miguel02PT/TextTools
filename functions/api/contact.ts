type ContactCategory = 'contact' | 'bug'

type ContactEnvironment = {
  ALLOWED_ORIGIN: string
  CONTACT_FROM: string
  CONTACT_RECIPIENT: string
  RESEND_API_KEY: string
  TURNSTILE_SECRET_KEY: string
}

type PagesFunctionContext = {
  request: Request
  env: ContactEnvironment
}

type ContactPayload = {
  category: ContactCategory
  email: string
  message: string
  name: string
  page: string
  subject: string
  turnstileToken: string
  website: string
}

function jsonResponse(body: { error?: string; sent?: boolean }, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
}

function normalizePayload(value: unknown): ContactPayload | null {
  if (!isRecord(value)) return null

  const { category, email, message, name, page, subject, turnstileToken, website } = value
  if (category !== 'contact' && category !== 'bug') return null
  if (typeof email !== 'string' || email.length > 254 || hasControlCharacters(email)) return null
  const normalizedEmail = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return null
  if (typeof message !== 'string' || message.trim().length < 1 || message.length > 6000) return null
  if (typeof name !== 'string' || name.length > 120 || hasControlCharacters(name)) return null
  if (typeof subject !== 'string' || subject.trim().length < 1 || subject.length > 200) return null
  if (hasControlCharacters(subject)) return null
  if (typeof page !== 'string' || !page.startsWith('/') || page.length > 300 || /[?#\r\n]/.test(page)) return null
  if (typeof turnstileToken !== 'string' || turnstileToken.length < 1 || turnstileToken.length > 2048) return null
  if (typeof website !== 'string' || website.length > 200) return null

  return {
    category,
    email: normalizedEmail,
    message: message.trim(),
    name: name.trim(),
    page,
    subject: subject.trim().replace(/[\r\n]/g, ' '),
    turnstileToken,
    website,
  }
}

async function verifyTurnstile(
  token: string,
  category: ContactCategory,
  request: Request,
  env: ContactEnvironment,
): Promise<'valid' | 'invalid' | 'unavailable'> {
  const form = new FormData()
  form.set('secret', env.TURNSTILE_SECRET_KEY)
  form.set('response', token)
  const remoteAddress = request.headers.get('CF-Connecting-IP')
  if (remoteAddress) form.set('remoteip', remoteAddress)

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    if (!response.ok) {
      console.error('Turnstile verification service returned an error.', response.status)
      return 'unavailable'
    }

    const result: unknown = await response.json()
    const expectedHostname = new URL(env.ALLOWED_ORIGIN).hostname
    if (!isRecord(result)) return 'unavailable'
    return result.success === true &&
      result.hostname === expectedHostname &&
      result.action === category
      ? 'valid'
      : 'invalid'
  } catch (error) {
    console.error('Unable to verify the contact form challenge.', error)
    return 'unavailable'
  }
}

export async function onRequestPost({ request, env }: PagesFunctionContext): Promise<Response> {
  if (
    !env.ALLOWED_ORIGIN ||
    !env.CONTACT_FROM ||
    !env.CONTACT_RECIPIENT ||
    !env.RESEND_API_KEY ||
    !env.TURNSTILE_SECRET_KEY
  ) {
    console.error('Contact form endpoint is missing required configuration.')
    return jsonResponse({ error: 'Form delivery is not configured.' }, 503)
  }

  let configuredOrigin: string
  try {
    configuredOrigin = new URL(env.ALLOWED_ORIGIN).origin
  } catch {
    console.error('Contact form endpoint has an invalid allowed origin.')
    return jsonResponse({ error: 'Form delivery is not configured.' }, 503)
  }

  if (request.headers.get('Origin') !== configuredOrigin) {
    return jsonResponse({ error: 'Invalid request origin.' }, 403)
  }
  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return jsonResponse({ error: 'Expected a JSON request.' }, 415)
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0)
  if (contentLength > 32_000) return jsonResponse({ error: 'Request is too large.' }, 413)

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }
  if (new TextEncoder().encode(rawBody).byteLength > 32_000) {
    return jsonResponse({ error: 'Request is too large.' }, 413)
  }

  let input: unknown
  try {
    input = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON.' }, 400)
  }

  const payload = normalizePayload(input)
  if (!payload) return jsonResponse({ error: 'Please check the form fields.' }, 400)
  if (payload.website.trim()) return jsonResponse({ error: 'Invalid form submission.' }, 400)

  const challengeResult = await verifyTurnstile(
    payload.turnstileToken,
    payload.category,
    request,
    env,
  )
  if (challengeResult === 'invalid') {
    return jsonResponse({ error: 'Please complete the anti-spam check and try again.' }, 403)
  }
  if (challengeResult === 'unavailable') {
    return jsonResponse({ error: 'The anti-spam service is temporarily unavailable.' }, 502)
  }

  const emailText = [
    `Category: ${payload.category}`,
    `Page: ${payload.page}`,
    `Name: ${payload.name || '(not provided)'}`,
    `Reply email: ${payload.email}`,
    `Subject: ${payload.subject}`,
    '',
    payload.message,
  ].join('\n')

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_RECIPIENT],
        reply_to: payload.email,
        subject: `[TextTools ${payload.category}] ${payload.subject}`,
        text: emailText,
      }),
    })
    if (!response.ok) {
      console.error('Resend failed to deliver a contact form message.', response.status)
      return jsonResponse({ error: 'Message delivery failed.' }, 502)
    }
  } catch (error) {
    console.error('Unable to reach the email delivery service.', error)
    return jsonResponse({ error: 'Message delivery failed.' }, 502)
  }

  return jsonResponse({ sent: true }, 200)
}
