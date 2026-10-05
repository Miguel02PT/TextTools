export type GoogleAnalyticsCommand = (...args: unknown[]) => void

export function createGoogleAnalyticsCommand(dataLayer: unknown[]): GoogleAnalyticsCommand {
  return function () {
    dataLayer.push(arguments)
  }
}
