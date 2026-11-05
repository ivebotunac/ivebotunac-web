// 301s /path/ to /path so each page has one URL; a plugin, because static files answer before any route.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const [path, query] = event.path.split('?') as [string, string?]
    if (path.length < 2 || !path.endsWith('/')) return
    const target = '/' + path.replace(/^\/+|\/+$/g, '')
    // Plain path characters only: a backslash or control character could make the target another host.
    if (!/^\/[\w.~%/-]*$/.test(target)) return
    return sendRedirect(event, target + (query ? `?${query}` : ''), 301)
  })
})
