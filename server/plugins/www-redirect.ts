// www 301s to the apex here: the App Hosting console redirect is a 302, which keeps www canonical.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // trailing-slash may have answered first; www then follows its relative redirect back here
    if (event.handled) return
    const host = getRequestHost(event, { xForwardedHost: true }).toLowerCase()
    if (!host.startsWith('www.')) return
    return sendRedirect(event, `https://${host.slice(4)}${event.path}`, 301)
  })
})
