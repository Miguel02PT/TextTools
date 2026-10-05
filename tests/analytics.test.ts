import assert from 'node:assert/strict'
import test from 'node:test'
import { sendToolAnalyticsEvent } from '../src/analytics'

test('tool analytics events require consent and contain only the tool id', () => {
  const calls: unknown[][] = []
  const gtag = (...args: unknown[]) => calls.push(args)
  const events = ['tool_start', 'copy_result', 'download_result'] as const

  assert.equal(sendToolAnalyticsEvent(null, gtag, 'tool_start', 'word-counter'), false)
  assert.equal(sendToolAnalyticsEvent('rejected', gtag, 'copy_result', 'word-counter'), false)
  assert.equal(sendToolAnalyticsEvent('accepted', undefined, 'download_result', 'word-counter'), false)

  for (const eventName of events) {
    assert.equal(sendToolAnalyticsEvent('accepted', gtag, eventName, 'find-replace'), true)
  }

  assert.deepEqual(
    calls,
    events.map((eventName) => ['event', eventName, { tool_id: 'find-replace' }]),
  )
})
