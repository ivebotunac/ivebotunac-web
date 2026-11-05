// Redirects www to the apex with a 301; the App Hosting console redirect is a 302, which keeps www canonical.
const WWW_HOST = 'www.ivebotunac.com'
// The target is fixed, so a client-sent X-Forwarded-Host can never choose where the redirect goes.
const APEX_ORIGIN = 'https://ivebotunac.com'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // if the trailing-slash plugin answered first, its relative redirect stays on www and comes back here
    if (event.handled) return
    const host = getRequestHost(event, { xForwardedHost: true }).toLowerCase()
    if (host !== WWW_HOST) return
    return sendRedirect(event, `${APEX_ORIGIN}${event.path}`, 301)
  })
})
