import { CV_SECTIONS } from '~/components/layout/nav'

// Id of the section in view; the page's observer writes it, the game reads it.
export function useActiveSection() {
  return useState<string>('active-section', () => CV_SECTIONS[0].id)
}

// A scroll event at least this often means a smooth scroll is still moving.
const SCROLL_IDLE_MS = 150
let spyHold: (() => void) | null = null

// True while a link's scroll runs, so the spy neither lights up nor marks the sections it passes.
export const spyHeld = () => spyHold !== null

// Ends on scrollend, or once scroll events go quiet where scrollend is missing or nothing moved.
function holdSpy() {
  spyHold?.()
  const ac = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const release = () => {
    clearTimeout(timer)
    ac.abort()
    spyHold = null
  }
  const idle = () => {
    clearTimeout(timer)
    timer = setTimeout(release, SCROLL_IDLE_MS)
  }
  window.addEventListener('scrollend', release, { signal: ac.signal })
  window.addEventListener('scroll', idle, { passive: true, signal: ac.signal })
  spyHold = release
  idle()
}

// Scrolls without the router, keeps the hash in the address bar, and hands focus to the section.
export function useScrollToSection() {
  const active = useActiveSection()
  return (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    holdSpy()
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(history.state, '', `#${id}`)
    el.focus({ preventScroll: true })
    active.value = id
  }
}
