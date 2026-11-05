declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// GA4 measurement ID; public by design, it ships in the gtag script URL and config call.
const GA_ID = 'G-SVD3MBDG0R'

let googleAnalyticsLoaded = false

// Loads gtag and nothing else.
export const useGoogleAnalytics = () => {
  // gtag (186 KiB) waits for `load`, then idle (1.5s cap), so it never delays the largest paint.
  const whenIdle = (fn: () => void) => {
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
    }).requestIdleCallback
    if (idle) idle(fn, { timeout: 1500 })
    else setTimeout(fn, 200)
  }

  const loadGoogleAnalytics = () => {
    if (googleAnalyticsLoaded || !import.meta.client) return
    googleAnalyticsLoaded = true

    if (document.readyState === 'complete') whenIdle(injectGoogleAnalytics)
    else window.addEventListener('load', () => whenIdle(injectGoogleAnalytics), { once: true })
  }

  const injectGoogleAnalytics = () => {
    const gtagScript = document.createElement('script')
    gtagScript.async = true
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(gtagScript)

    const configScript = document.createElement('script')
    configScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${GA_ID}', {
        cookie_flags: 'max-age=7200;secure;samesite=strict'
      });
    `
    document.head.appendChild(configScript)
  }

  return { loadGoogleAnalytics }
}
