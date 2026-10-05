import assert from 'node:assert/strict'
import test from 'node:test'
import { createGoogleAnalyticsCommand } from '../src/google-analytics'

test('Google Analytics commands use the Arguments objects expected by gtag', () => {
  const dataLayer: unknown[] = []
  const gtag = createGoogleAnalyticsCommand(dataLayer)
  const timestamp = new Date('2026-10-05T11:00:00.000Z')

  gtag('js', timestamp)
  gtag('config', 'G-CDBK2W6TB0')

  assert.equal(Object.prototype.toString.call(dataLayer[0]), '[object Arguments]')
  assert.deepEqual(Array.from(dataLayer[0] as IArguments), ['js', timestamp])
  assert.equal(Object.prototype.toString.call(dataLayer[1]), '[object Arguments]')
  assert.deepEqual(Array.from(dataLayer[1] as IArguments), ['config', 'G-CDBK2W6TB0'])
})
