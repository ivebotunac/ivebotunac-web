// A GA4 event through gtag when it has loaded; analytics must never break the page.
// Returns whether gtag took the event, so a once-per-view event can retry until it has.
export function track(name: string, params?: Record<string, string | number | boolean>): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
    window.gtag('event', name, params ?? {})
    return true
  } catch {
    return false
  }
}
