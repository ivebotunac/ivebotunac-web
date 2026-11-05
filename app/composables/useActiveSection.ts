// Id of the section in view; the page's observer writes it, the game reads it.
export function useActiveSection() {
  return useState<string>('active-section', () => 'about')
}

// Scrolls without the router, keeps the hash in the address bar, and hands focus to the section.
export function useScrollToSection() {
  const active = useActiveSection()
  return (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(history.state, '', `#${id}`)
    el.focus({ preventScroll: true })
    active.value = id
  }
}
