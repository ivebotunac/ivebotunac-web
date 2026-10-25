// One URL per page: the static handler answers before any route, and a legal page's relative asset paths break under a slash.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const [path, query] = event.path.split('?') as [string, string?]
    if (path.length < 2 || !path.endsWith('/')) return
    const target = '/' + path.replace(/^\/+|\/+$/g, '')
    // Only plain path characters; a backslash or control character would let a browser read the target as another host.
    if (!/^\/[\w.~%/-]*$/.test(target)) return
    return sendRedirect(event, target + (query ? `?${query}` : ''), 301)
  })
})
