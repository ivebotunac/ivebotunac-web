// A GA4 event through gtag when it has loaded; analytics must never break the page.
export function track(name: string, params?: Record<string, string | number | boolean>): void {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
    window.gtag('event', name, params ?? {})
  } catch {
    // ignore
  }
}
