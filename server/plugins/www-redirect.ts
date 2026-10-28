// www gets a 301 to the apex here, because the App Hosting console redirect sends a 302 and Google then kept www as canonical.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // the trailing-slash plugin may have answered first; www then follows its relative redirect back here
    if (event.handled) return
    const host = getRequestHost(event, { xForwardedHost: true }).toLowerCase()
    if (!host.startsWith('www.')) return
    return sendRedirect(event, `https://${host.slice(4)}${event.path}`, 301)
  })
})
