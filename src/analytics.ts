export type ToolAnalyticsEvent = 'tool_start' | 'copy_result' | 'download_result'

type GoogleAnalyticsCommand = (...args: unknown[]) => void

export function sendToolAnalyticsEvent<ToolId extends string>(
  consent: 'accepted' | 'rejected' | null,
  gtag: GoogleAnalyticsCommand | undefined,
  eventName: ToolAnalyticsEvent,
  toolId: ToolId,
) {
  if (consent !== 'accepted' || !gtag) return false

  gtag('event', eventName, { tool_id: toolId })
  return true
}
