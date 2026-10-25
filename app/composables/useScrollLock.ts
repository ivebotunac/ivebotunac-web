import { computed, ref } from 'vue'

// Page-wide: every dialog and the mobile menu share this counter, so only the last release unlocks.
const depth = ref(0)
let saved = { overflow: '', paddingRight: '' }

export function useScrollLock() {
  const held = ref(false)

  function lock() {
    if (held.value) return
    held.value = true
    if (depth.value++ > 0) return
    const html = document.documentElement
    // Only the first holder measures: under overflow hidden a later one would read a 0 gutter.
    const gutter = window.innerWidth - html.clientWidth
    saved = { overflow: html.style.overflow, paddingRight: html.style.paddingRight }
    // Fixed chrome (header bar, toaster) adds --pn-scroll-gutter so it does not shift sideways.
    html.style.setProperty('--pn-scroll-gutter', `${gutter}px`)
    if (gutter > 0) html.style.paddingRight = `${gutter}px`
    html.style.overflow = 'hidden'
  }

  function unlock() {
    if (!held.value) return
    held.value = false
    if (--depth.value > 0) return
    const html = document.documentElement
    html.style.overflow = saved.overflow
    html.style.paddingRight = saved.paddingRight
    html.style.removeProperty('--pn-scroll-gutter')
  }

  // True while another holder, such as an open dialog, has the page locked.
  const lockedElsewhere = computed(() => depth.value > (held.value ? 1 : 0))

  return { lock, unlock, lockedElsewhere }
}
