import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { onRequestPost } from '../functions/api/contact.ts'

const originalFetch = globalThis.fetch
const env = {
  ALLOWED_ORIGIN: 'https://texttoools.com',
  CONTACT_FROM: 'TextTools <messages@texttoools.com>',
  CONTACT_RECIPIENT: 'TextToools@hotmail.com',
  RESEND_API_KEY: 'test-secret',
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request('https://texttoools.com/api/contact', {
    method: 'POST',
    headers: {
      Origin: 'https://texttoools.com',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    category: 'contact',
    email: 'visitor@example.com',
    message: 'Please add another text tool.',
    name: 'Visitor',
    page: '/contact/',
    subject: 'Suggestion',
    turnstileToken: 'valid-token',
    website: '',
    ...overrides,
  }
}

test('sends validated contact details through Turnstile and Resend', async () => {
  const requests: { url: string; init?: RequestInit }[] = []
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init })
    if (String(input).includes('siteverify')) {
      return Response.json({ success: true, hostname: 'texttoools.com', action: 'contact' })
    }
    return Response.json({ id: 'email-id' }, { status: 200 })
  }

  const response = await onRequestPost({ request: makeRequest(makePayload()), env })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sent: true })
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
  assert.equal(requests[1].url, 'https://api.resend.com/emails')
  assert.equal(requests[1].init?.headers && new Headers(requests[1].init.headers).get('Authorization'), 'Bearer test-secret')
  const email = JSON.parse(String(requests[1].init?.body)) as { to: string[]; reply_to: string }
  assert.deepEqual(email.to, ['TextToools@hotmail.com'])
  assert.equal(email.reply_to, 'visitor@example.com')
})

test('rejects a cross-origin request before calling external services', async () => {
  let externalCalls = 0
  globalThis.fetch = async () => {
    externalCalls += 1
    return Response.json({})
  }

  const response = await onRequestPost({
    request: makeRequest(makePayload(), { Origin: 'https://attacker.example' }),
    env,
  })
  assert.equal(response.status, 403)
  assert.equal(externalCalls, 0)
})

test('rejects invalid challenge responses without sending email', async () => {
  let externalCalls = 0
  globalThis.fetch = async () => {
    externalCalls += 1
    return Response.json({ success: false })
  }

  const response = await onRequestPost({ request: makeRequest(makePayload()), env })
  assert.equal(response.status, 403)
  assert.equal(externalCalls, 1)
})

test('rejects invalid fields and honeypot submissions', async () => {
  let externalCalls = 0
  globalThis.fetch = async () => {
    externalCalls += 1
    return Response.json({})
  }

  const badEmail = await onRequestPost({
    request: makeRequest(makePayload({ email: 'not-an-email' })),
    env,
  })
  const bot = await onRequestPost({
    request: makeRequest(makePayload({ website: 'https://spam.example' })),
    env,
  })
  assert.equal(badEmail.status, 400)
  assert.equal(bot.status, 400)
  assert.equal(externalCalls, 0)
})

test('does not report success when Resend rejects delivery', async () => {
  globalThis.fetch = async (input) => {
    if (String(input).includes('siteverify')) {
      return Response.json({ success: true, hostname: 'texttoools.com', action: 'contact' })
    }
    return new Response('provider unavailable', { status: 429 })
  }

  const response = await onRequestPost({ request: makeRequest(makePayload()), env })
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: 'Message delivery failed.' })
})

test('rejects control characters in email and subject fields', async () => {
  let externalCalls = 0
  globalThis.fetch = async () => {
    externalCalls += 1
    return Response.json({})
  }

  const badEmail = await onRequestPost({
    request: makeRequest(makePayload({ email: 'person@example.com\r\nBcc:other@example.com' })),
    env,
  })
  const badSubject = await onRequestPost({
    request: makeRequest(makePayload({ subject: 'Hello\r\nBcc:other@example.com' })),
    env,
  })
  assert.equal(badEmail.status, 400)
  assert.equal(badSubject.status, 400)
  assert.equal(externalCalls, 0)
})
