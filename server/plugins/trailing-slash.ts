// One URL per page; a plugin, since the static handler answers before any route.
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
